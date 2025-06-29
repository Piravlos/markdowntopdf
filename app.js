'use strict';

// Initialize markdown-it with plugins & syntax highlighting
const md = window.markdownit({
  html: true,          // Enable HTML tags in source
  linkify: true,       // Autoconvert URL-like text to links
  typographer: true,   // Enable smart quotes and other typographic replacements
  highlight: function (str, lang) {
    if (lang && window.hljs.getLanguage(lang)) {
      try {
        return '<pre class="hljs"><code>' + window.hljs.highlight(str, { language: lang, ignoreIllegals: true }).value + '</code></pre>';
      } catch (__) {}
    }
    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
  }
})
  .use(window.markdownitFootnote)
  .use(window.markdownitTaskLists, { label: true });

const $input = document.getElementById('markdown-input');
const $preview = document.getElementById('preview');
const $downloadBtn = document.getElementById('download-btn');

// Live preview rendering
function renderPreview() {
  const markdownText = $input.value || '';
  $preview.innerHTML = md.render(markdownText);
}

$input.addEventListener('input', renderPreview);

// Initial render with placeholder text
$input.value = `# Welcome to Markdown ➜ PDF Converter

Type **Markdown** on the left and click "Download PDF" to export.

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

"> Blockquote example"


~~~js
// JavaScript code block
function greet(name) {
  console.log("Hello, " + name + "!");
}
~~~
`;
renderPreview();

// PDF download handler
$downloadBtn.addEventListener('click', () => {
  // Clone preview to manipulate structure for better page breaks
  const printable = $preview.cloneNode(true);

  // Remove all horizontal rules from the printable version
  printable.querySelectorAll('hr').forEach(hr => hr.remove());

  // Wrap heading + first following sibling in .keep-together
  const headings = printable.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach(h => {
    // Skip if already wrapped
    if (h.parentElement && h.parentElement.classList.contains('keep-together')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'keep-together';
    h.parentNode.insertBefore(wrapper, h);

    // Move heading into wrapper
    wrapper.appendChild(h);

    // Check for a following element
    const firstEl = wrapper.nextElementSibling;
    if (firstEl) {
      // If it's an HR, grab it AND the next element
      if (firstEl.tagName === 'HR') {
        wrapper.appendChild(firstEl);
        const secondEl = wrapper.nextElementSibling;
        if (secondEl) {
          wrapper.appendChild(secondEl);
        }
      } else {
        // Otherwise, just grab the first element
        wrapper.appendChild(firstEl);
      }
    }
  });

  // Decide on page size: wide A3 for tables, A4 portrait otherwise
  const hasTable = printable.querySelector('table') !== null;

  // Optional visual tweak: constrain width for text-only documents
  if (!hasTable) {
    printable.style.maxWidth = '180mm';
    printable.style.margin = '0 auto';
  }

  // Use html2pdf to convert printable element to PDF
  const opt = {
    margin:       10,
    filename:     'document.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  {
      scale: 2,
      useCORS: true,
      // Add a small buffer to prevent horizontal text cutoff
      windowWidth: printable.scrollWidth + 20
    },
    jsPDF:        hasTable
      ? { unit: 'mm', format: 'a3', orientation: 'landscape' }
      : { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak:    { mode: ['avoid-all', 'css'] }
  };

  window.html2pdf().set(opt).from(printable).save();
}); 