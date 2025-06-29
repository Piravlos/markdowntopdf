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

  // Wrap heading + first following sibling in .keep-together
  const headings = printable.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach(h => {
    // Skip if already wrapped (in case of nested processing)
    if (h.parentElement && h.parentElement.classList.contains('keep-together')) return;

    const firstContentEl = h.nextElementSibling; // capture before moving
    const wrapper = document.createElement('div');
    wrapper.className = 'keep-together';

    // Insert wrapper before heading in DOM tree
    h.parentNode.insertBefore(wrapper, h);

    // Move heading and first content element into wrapper
    wrapper.appendChild(h);
    if (firstContentEl) {
      wrapper.appendChild(firstContentEl);
    }
  });

  // Use html2pdf to convert printable element to PDF
  const opt = {
    margin:       10,                      // uniform margin in mm
    filename:     'document.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a3', orientation: 'landscape' },
    pagebreak:    { mode: ['avoid-all', 'css'] }
  };

  window.html2pdf().set(opt).from(printable).save();
}); 