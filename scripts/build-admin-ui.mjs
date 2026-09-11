import {readFileSync, writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const srcPath = path.join(root, "src/admin-ui.html");
const outPath = path.join(root, "src/adminUi.js");

const html = readFileSync(srcPath, "utf8");
const out = `export const ADMIN_UI_HTML = ${JSON.stringify(html)};\n`;

writeFileSync(outPath, out, "utf8");
console.log(`[build:admin-ui] src/admin-ui.html (${html.length} chars) -> src/adminUi.js`);
