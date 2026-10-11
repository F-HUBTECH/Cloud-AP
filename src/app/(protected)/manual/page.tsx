import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { renderManual } from "@/lib/manual-content.mjs";
import styles from "./manual.module.css";

export const metadata = { title: "Manual | KSAP" };

export default async function ManualPage() {
  const markdown = await readFile(join(process.cwd(), "USER_GUIDE.md"), "utf8");
  const { html, sections } = renderManual(markdown);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Manual / คู่มือการใช้งาน</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          คู่มือ KSAP Accounts Payable — ขั้นตอนใช้งาน เมนู และแนวทางแก้ปัญหา
        </p>
      </header>
      <div className="grid items-start gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <nav aria-label="สารบัญคู่มือ" className="card p-4 xl:sticky xl:top-4">
          <h2 className="mb-3 font-semibold">สารบัญ</h2>
          <ul className="space-y-2 text-sm">
            {sections.map((section) => (
              <li key={section.id}>
                <a className="block rounded px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" href={`#${section.id}`}>
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        {/* Only trusted, repository-authored Markdown is rendered here. */}
        <article className={`card min-w-0 p-4 sm:p-8 ${styles.content}`} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
