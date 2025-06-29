# Markdown ➜ PDF Converter

A lightweight, **client-side** tool that converts Markdown to a styled PDF directly in your browser. Ideal for hosting on **GitHub Pages** – no server, no build-steps, just static files.

## Features

* Live preview while typing
* Supports (almost) _everything_ you can style with standard Markdown:  
  headings, lists, tables, task lists, images, footnotes, code blocks with syntax highlighting, blockquotes, inline formatting, etc.
* Code highlighting powered by [highlight.js](https://highlightjs.org/)
* PDF export powered by [html2pdf.js](https://github.com/eKoopmans/html2pdf.js)
* Plugins for footnotes & GitHub-style task-lists
* Responsive layout – usable on mobile & desktop
* No dependencies to install – everything fetched via CDN

## Quick Start

1. Clone (or fork) this repository and open `index.html` in any modern browser.
2. Type or paste Markdown on the left; see a live preview on the right.
3. Click **Download PDF** to export the preview as a PDF file.

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository (e.g. `username/markdown-pdf`).
2. In the repository **Settings → Pages**, select the `main` branch (or whichever) and the `/root` folder.
3. Press **Save**. Within a minute, GitHub Pages will give you a URL (e.g. `https://username.github.io/markdown-pdf/`).
4. Done! Your converter is now publicly accessible.

> Tip: Add a blank file named `.nojekyll` (already included) to tell GitHub Pages not to run its Jekyll pipeline and to keep files like `app.js` untouched.

## Customisation

* **Styling** – edit `style.css` to tweak colours, fonts, margins, or print-specific styles.
* **Default Markdown** – change the placeholder text in `app.js`.
* **Plugins** – explore the rich [markdown-it](https://github.com/markdown-it/markdown-it) plugin ecosystem to extend functionality (e.g. diagrams, math, emojis).

## License

[MIT](LICENSE) 