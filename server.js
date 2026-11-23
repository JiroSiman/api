const express = require('express');
const multer = require('multer');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const TMP_DIR = path.join(ROOT, 'tmp');
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const STORE_FILE = path.join(ROOT, 'store.json');
fs.mkdirSync(TMP_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

let store = {};
if (fs.existsSync(STORE_FILE)) {
  try { store = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')); } catch {}
}
function saveStore() { fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2)); }

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
app.use(express.static(path.join(ROOT, 'public')));

const upload = multer({ dest: TMP_DIR });

app.post('/upload', upload.array('files'), (req, res) => {
  (async () => {
    try {
      const files = req.files || [];
      if (!files.length) return res.status(400).json({ ok: false, error: 'No files provided' });
      const code = (req.body.code || '').trim() || crypto.randomBytes(4).toString('hex');
      if (store[code]) return res.status(409).json({ ok: false, error: 'Code already taken' });

      const staging = path.join(UPLOAD_DIR, code + '_stage');
      fs.mkdirSync(staging, { recursive: true });
      for (const f of files) {
        const safeName = f.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        fs.renameSync(f.path, path.join(staging, safeName));
      }

      const zipPath = path.join(UPLOAD_DIR, code + '.zip');
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 6 } });
      return new Promise((resolve, reject) => {
        output.on('close', () => resolve());
        archive.on('error', reject);
        archive.pipe(output);
        archive.directory(staging, false);
        archive.finalize();
      }).then(() => {
        fs.rmSync(staging, { recursive: true, force: true });
        let totalSize = 0;
        const fileList = [];
        for (const f of files) {
          const safeName = f.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
          const p = path.join(staging, safeName);
          fileList.push({ name: f.originalname, safeName });
        }
        const stat = fs.statSync(zipPath);
        store[code] = {
          zip: zipPath,
          files: fileList,
          size: stat.size,
          createdAt: Date.now(),
          ttl: 604800000
        };
        saveStore();
        const base = req.protocol + '://' + req.get('host');
        res.json({ ok: true, code, downloadUrl: base + '/download/' + code });
      }).catch(err => {
        fs.rmSync(staging, { recursive: true, force: true });
        throw err;
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message || 'Upload failed' });
    }
  })();
});

app.get('/download/:code', (req, res) => {
  const code = req.params.code;
  const item = store[code];
  if (!item || !fs.existsSync(item.zip)) return res.status(404).send('File not found or expired');
  res.download(item.zip, code + '.zip');
});

app.get('/api/codes', (req, res) => {
  const list = Object.entries(store).map(([code, v]) => ({ code, size: v.size, createdAt: v.createdAt }));
  res.json(list);
});

app.listen(PORT, () => console.log('FileShare listening on http://localhost:' + PORT));
