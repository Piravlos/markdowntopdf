'use strict';

// Initialize markdown-it with plugins & syntax highlighting
const md = window.markdownit({
  html: false,         // Disable raw HTML to prevent XSS
  linkify: true,       // Autoconvert URL-like text to links
  typographer: true,   // Enable smart quotes and other typographic replacements
  highlight: function (str, lang) {
    if (lang && window.hljs.getLanguage(lang)) {
      try {
        return '<pre class="hljs"><code>' + window.hljs.highlight(str, { language: lang, ignoreIllegals: true }).value + '</code></pre>';
      } catch (err) {
        console.warn('Highlight.js failed for language "' + lang + '":', err);
      }
    }
    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
  }
})
  .use(window.markdownitFootnote)
  .use(window.markdownitTaskLists, { label: true });

const $input = document.getElementById('markdown-input');
const $preview = document.getElementById('preview');
const $downloadBtn = document.getElementById('download-btn');
const $fileInput = document.getElementById('file-input');
const $importBtn = document.getElementById('import-btn');
const $clearBtn = document.getElementById('clear-btn');
const $filenameInput = document.getElementById('filename-input');
const $documentStats = document.getElementById('document-stats');
const $autosaveIndicator = document.getElementById('autosave-indicator');

const STORAGE_KEYS = {
  content: 'md2pdf-content',
  filename: 'md2pdf-filename'
};
const AUTOSAVE_DELAY = 500;
const DEFAULT_MARKDOWN = `# Welcome to Markdown ➜ PDF Converter

Type **Markdown** on the left and click "Download PDF" to export.

## Quick Tips
- Use **Import Markdown** to open an existing .md file.
- Your work saves automatically in this browser.
- Rename the PDF before downloading for tidy archives.

## Features Supported
- Headings (h1–h6)
- Lists (ordered & unordered)
- Task lists
- Tables
- Blockquotes
- Code blocks with syntax highlighting
- Footnotes^[Like this.]
- Images & links
- Emphasis: *italics*, **bold**, ~~strikethrough~~

| Markdown | Rendered |
|----------|----------|
| *italics* | italics |
| **bold** | bold |

> Blockquote example

~~~js
// JavaScript code block
function greet(name) {
  console.log("Hello, " + name + "!");
}
~~~
`;

let storageAvailable = true;
try {
  const probeKey = '__md-pdf-converter__';
  window.localStorage.setItem(probeKey, probeKey);
  window.localStorage.removeItem(probeKey);
} catch (err) {
  storageAvailable = false;
}

let autosaveTimer = null;
let renderTimer = null;
const RENDER_DELAY = 120;

function setAutosaveMessage(message) {
  if ($autosaveIndicator) {
    $autosaveIndicator.textContent = message;
  }
}

function safeGet(key) {
  if (!storageAvailable) return null;
  try {
    return window.localStorage.getItem(key);
  } catch (err) {
    console.warn('Unable to read from localStorage.', err);
    storageAvailable = false;
    setAutosaveMessage('Autosave unavailable');
    return null;
  }
}

function safeSet(key, value) {
  if (!storageAvailable) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn('Unable to write to localStorage.', err);
    storageAvailable = false;
    setAutosaveMessage('Autosave unavailable');
    return false;
  }
}

function safeRemove(key) {
  if (!storageAvailable) return;
  try {
    window.localStorage.removeItem(key);
  } catch (err) {
    console.warn('Unable to modify localStorage.', err);
    storageAvailable = false;
    setAutosaveMessage('Autosave unavailable');
  }
}

function renderPreview() {
  const markdownText = $input.value || '';
  const rawHtml = md.render(markdownText);
  $preview.innerHTML = window.DOMPurify
    ? window.DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } })
    : rawHtml;
}

function updateStats() {
  const text = $input.value;
  const words = (text.trim().match(/\S+/g) || []).length;
  const characters = text.length;
  const wordLabel = words === 1 ? 'word' : 'words';
  const charLabel = characters === 1 ? 'character' : 'characters';
  if ($documentStats) {
    $documentStats.textContent = `${words} ${wordLabel} · ${characters} ${charLabel}`;
  }
}

function refreshOutput() {
  renderPreview();
  updateStats();
}

function persistContentImmediately() {
  if (!storageAvailable) return;
  window.clearTimeout(autosaveTimer);
  const saved = safeSet(STORAGE_KEYS.content, $input.value);
  if (saved) {
    setAutosaveMessage('Saved locally');
  }
}

function scheduleAutosave() {
  if (!storageAvailable) return;
  window.clearTimeout(autosaveTimer);
  setAutosaveMessage('Saving…');
  autosaveTimer = window.setTimeout(() => {
    const saved = safeSet(STORAGE_KEYS.content, $input.value);
    if (saved) {
      setAutosaveMessage('Saved locally');
    }
  }, AUTOSAVE_DELAY);
}

function persistFilename(value) {
  if (!storageAvailable) return;
  safeSet(STORAGE_KEYS.filename, value);
}

function extractHeading(markdown) {
  const match = markdown.match(/^#{1,6}\s+(.+)$/m);
  if (!match) return null;
  const heading = match[1]
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.*?)\]\([^)]*\)/g, '$1')
    .replace(/[*_~#]/g, '')
    .trim();
  return heading || null;
}

function sanitizeFilename(name) {
  return name
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/\.$/, '')
    .trim()
    .slice(0, 80);
}

function buildFilename() {
  const manual = $filenameInput.value.trim();
  const fallback = extractHeading($input.value) || 'document';
  const base = manual || fallback;
  let sanitized = sanitizeFilename(base);
  if (!sanitized) {
    sanitized = `document-${Date.now()}`;
  }
  if (!sanitized.toLowerCase().endsWith('.pdf')) {
    sanitized += '.pdf';
  }
  return sanitized;
}

function handleDownload() {
  const printable = $preview.cloneNode(true);

  const headings = printable.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach(h => {
    if (h.parentElement && h.parentElement.classList.contains('keep-together')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'keep-together';
    h.parentNode.insertBefore(wrapper, h);
    wrapper.appendChild(h);

    // Pull the next sibling into the wrapper so the heading isn't orphaned on a page break
    const nextEl = wrapper.nextElementSibling;
    if (nextEl) {
      wrapper.appendChild(nextEl);
    }
  });

  const hasTable = printable.querySelector('table') !== null;
  const pdfFormat = hasTable ? 'a3' : 'a4';
  const pdfOrientation = hasTable ? 'landscape' : 'portrait';

  const opt = {
    margin:       10,
    filename:     buildFilename(),
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  {
      scale: 2,
      useCORS: true
    },
    jsPDF:        { unit: 'mm', format: pdfFormat, orientation: pdfOrientation },
    pagebreak:    { mode: ['css', 'legacy'], avoid: ['.keep-together', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'blockquote', 'tr', 'pre'] }
  };

  $downloadBtn.disabled = true;
  $downloadBtn.textContent = 'Generating…';

  window.html2pdf().set(opt).from(printable).save()
    .then(() => {
      $downloadBtn.disabled = false;
      $downloadBtn.textContent = 'Download PDF';
    })
    .catch((err) => {
      console.error('PDF generation failed:', err);
      $downloadBtn.disabled = false;
      $downloadBtn.textContent = 'Download PDF';
      setAutosaveMessage('PDF export failed');
    });
}

function handleImport(event) {
  const [file] = event.target.files;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    const result = loadEvent.target && typeof loadEvent.target.result === 'string'
      ? loadEvent.target.result
      : '';
    $input.value = result;
    refreshOutput();
    persistContentImmediately();

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const sanitizedBase = sanitizeFilename(baseName);
    if (sanitizedBase) {
      const suggested = sanitizedBase.toLowerCase().endsWith('.pdf')
        ? sanitizedBase
        : `${sanitizedBase}.pdf`;
      $filenameInput.value = suggested;
      persistFilename(suggested);
    }
  };
  reader.onerror = () => {
    console.error('Unable to read the selected file.', reader.error);
    setAutosaveMessage('Import failed');
  };

  reader.readAsText(file);
  event.target.value = '';
}

function clearEditor() {
  if (!$input.value.trim()) return;
  const shouldClear = window.confirm('Clear the editor and remove the autosaved Markdown?');
  if (!shouldClear) return;

  $input.value = '';
  window.clearTimeout(autosaveTimer);
  refreshOutput();
  safeRemove(STORAGE_KEYS.content);
  setAutosaveMessage(storageAvailable ? 'Autosave on' : 'Autosave unavailable');
}

const savedContent = safeGet(STORAGE_KEYS.content);
const savedFilename = safeGet(STORAGE_KEYS.filename);

if (savedContent) {
  $input.value = savedContent;
} else {
  $input.value = DEFAULT_MARKDOWN;
}

if (savedFilename) {
  $filenameInput.value = savedFilename;
}

refreshOutput();
setAutosaveMessage(storageAvailable ? 'Autosave on' : 'Autosave unavailable');

$input.addEventListener('input', () => {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(() => {
    refreshOutput();
  }, RENDER_DELAY);
  scheduleAutosave();
});

$downloadBtn.addEventListener('click', handleDownload);
$importBtn.addEventListener('click', () => $fileInput.click());
$fileInput.addEventListener('change', handleImport);
$clearBtn.addEventListener('click', clearEditor);

$filenameInput.addEventListener('input', () => {
  persistFilename($filenameInput.value);
});
