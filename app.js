const $ = (id) => document.getElementById(id);
const dropzone = $('dropzone');
const fileInput = $('fileInput');
const btnUpload = $('btnUpload');
const customCode = $('customCode');
const err = $('err');
const result = $('result');
const codeEl = $('code');
const linkField = $('linkField');

let selectedFiles = [];

dropzone.addEventListener('click', () => fileInput.click());
['dragenter','dragover'].forEach(ev => dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('drag'); }));
['dragleave','drop'].forEach(ev => dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('drag'); }));
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  const files = Array.from(e.dataTransfer.files || []).filter(f => f instanceof File);
  handleItems(files);
});
fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files || []).filter(f => f instanceof File);
  handleItems(files);
});

function handleItems(files) {
  selectedFiles = files;
  if (files.length) {
    dropzone.querySelector('.dz-title').textContent = files.length + ' file' + (files.length > 1 ? 's' : '') + ' selected';
    dropzone.querySelector('.dz-hint').textContent = files.map(f => f.name).join(', ').slice(0, 120);
  }
  result.classList.add('hidden');
  err.textContent = '';
}

btnUpload.addEventListener('click', async () => {
  if (!selectedFiles.length) { err.textContent = 'Select at least one file or folder first.'; return; }
  btnUpload.disabled = true; btnUpload.textContent = 'Zipping & uploading...';
  err.textContent = ''; result.classList.add('hidden');
  try {
    const fd = new FormData();
    selectedFiles.forEach(f => fd.append('files', f));
    const cc = customCode.value.trim();
    if (cc) fd.append('code', cc);
    const res = await fetch('/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    codeEl.textContent = data.code;
    linkField.value = data.downloadUrl;
    result.classList.remove('hidden');
    customCode.value = ''; selectedFiles = [];
    dropzone.querySelector('.dz-title').textContent = 'Drag & drop files or folders here';
    dropzone.querySelector('.dz-hint').textContent = 'or click to browse &bull; supports multiple files & folders';
  } catch (e) { err.textContent = e.message; }
  finally { btnUpload.disabled = false; btnUpload.textContent = 'Create share'; }
});

$('btnCopy').addEventListener('click', () => copy(codeEl.textContent));
$('btnCopyLink').addEventListener('click', () => copy(linkField.value));

async function copy(text) {
  try { await navigator.clipboard.writeText(text); } catch {}
  const btn = event.target; const old = btn.textContent; btn.textContent = 'Copied!';
  setTimeout(() => btn.textContent = old, 1200);
}
