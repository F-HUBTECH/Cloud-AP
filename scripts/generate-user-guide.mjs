import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { renderManual } from "../src/lib/manual-content.mjs";

const source = new URL("../USER_GUIDE.md", import.meta.url);
const output = new URL("../user-guide.html", import.meta.url);
const { html, sections } = renderManual(await readFile(source, "utf8"));
const escape = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const document = `<!doctype html>
<!-- Generated from USER_GUIDE.md. Run npm run manual:generate; do not edit directly. -->
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>คู่มือการใช้งาน KSAP Accounts Payable</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #eef3f8; color: #172033; font: 16px/1.8 system-ui, sans-serif; }
    .wrap { max-width: 1240px; margin: auto; padding: 28px 20px 64px; }
    header { padding: 32px; color: white; border-radius: 16px; background: linear-gradient(120deg, #12366b, #2563eb); }
    h1 { font-size: 1.8rem; margin: 0; }
    .layout { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 22px; margin-top: 22px; align-items: start; }
    nav, main { background: white; border: 1px solid #dbe3ed; border-radius: 14px; }
    nav { padding: 16px; position: sticky; top: 18px; max-height: calc(100vh - 36px); overflow-y: auto; }
    nav ul { list-style: none; padding: 0; margin: 0; }
    nav a { display: block; padding: 6px; font-size: .9rem; text-decoration: none; }
    nav a:hover { background: #eef3f8; }
    main { padding: 30px; overflow-wrap: anywhere; min-width: 0; }
    h2 { margin: 2rem 0 1rem; padding-bottom: 8px; border-bottom: 1px solid #dbe3ed; color: #12366b; font-size: 1.3rem; scroll-margin-top: 18px; }
    h3 { font-size: 1.1rem; }
    a { color: #1d4ed8; }
    li { margin: 6px 0; }
    code { background: #eef3f8; padding: 2px 5px; border-radius: 4px; font-size: .9em; }
    main img { display: block; max-width: 100%; height: auto; margin: 1rem 0; border: 1px solid #dbe3ed; border-radius: 8px; }
    .manual-table { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: .9rem; }
    th, td { border: 1px solid #dbe3ed; padding: 10px; text-align: left; vertical-align: top; min-width: 130px; }
    th { background: #eef3f8; }
    @media(max-width: 900px) { .layout { grid-template-columns: 1fr; } nav { position: static; max-height: none; } main, header { padding: 20px; } }
    @media print { body { background: white; } .wrap { padding: 0; } .layout { display: block; } nav { display: none; } main, header { border: 0; background: white; color: black; padding: 0; } }
  </style>
</head>
<body>
  <div class="wrap">
    <header><h1>คู่มือการใช้งาน KSAP Accounts Payable</h1><p>คู่มือสำหรับพนักงานบัญชี ผู้อนุมัติ และผู้ดูแลระบบ</p></header>
    <div class="layout">
      <nav aria-label="สารบัญคู่มือ"><h2>สารบัญ</h2><ul>${sections.map(({ id, label }) => `<li><a href="#${id}">${escape(label)}</a></li>`).join("\n")}</ul></nav>
      <main><p>ลิงก์ไปหน้าทำรายการใช้ได้เมื่อเปิดคู่มือบนเว็บไซต์ระบบ หากอ่านไฟล์ออฟไลน์ ให้เข้าสู่ระบบแล้วเปิดเมนูตามหัวข้อ</p>${html}</main>
    </div>
  </div>
</body>
</html>
`;

if (process.argv.includes("--check")) {
  const existing = await readFile(output, "utf8");
  if (existing !== document) {
    throw new Error("user-guide.html is outdated. Run npm run manual:generate.");
  }
  console.log(`Manual is up to date (${sections.length} sections).`);
} else {
  await writeFile(output, document);
  console.log(`Generated ${fileURLToPath(output)} (${sections.length} sections).`);
}
