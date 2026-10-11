import { marked } from "marked";

/** Render the committed user guide for both the app and standalone export.
 * @param {string} markdown
 */
export function renderManual(markdown) {
  const sections = marked.lexer(markdown)
    .filter((token) => token.type === "heading" && token.depth === 2)
    .map((token, index) => ({ id: `manual-section-${index + 1}`, label: token.text }));
  let index = 0;
  const html = marked.parse(markdown, { async: false, gfm: true })
    .replace(/^<h1>.*?<\/h1>\n/, "")
    .replace(/<h2>/g, () => `<h2 id="${sections[index++].id}">`)
    .replace(/<table>/g, '<div class="manual-table"><table>')
    .replace(/<\/table>/g, "</table></div>");
  return { html, sections };
}
