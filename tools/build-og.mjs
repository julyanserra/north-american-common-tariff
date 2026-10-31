// Renders the link-preview images (1200×630) from tools/og.html with Playwright.
//   node tools/build-og.mjs
// Writes assets/img/og-home.jpg and assets/img/og-foundations.jpg (JPEG keeps them well under
// the ~300 KB that WhatsApp accepts for link previews).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// Playwright is loaded with require so a globally installed copy also works.
const { chromium } = createRequire(import.meta.url)("playwright");

const root = fileURLToPath(new URL("..", import.meta.url));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" };

// A tiny static server, so the template can fetch the site's own pages for the logos.
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  try {
    const body = await readFile(join(root, path));
    res.writeHead(200, { "content-type": TYPES[extname(path)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404); res.end();
  }
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const name of ["home", "foundations"]) {
  await page.goto(`http://localhost:${port}/tools/og.html?page=${name}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.body.dataset.fonts && document.body.dataset.marks);
  const out = `assets/img/og-${name}.jpg`;
  await page.screenshot({ path: join(root, out), type: "jpeg", quality: 90 });
  console.log(out);
}
await browser.close();
server.close();
