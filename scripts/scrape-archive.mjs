// Crawl the BIT Mesra question-paper archive across ALL departments.
// Downloads MID + END semester PDFs and writes a manifest. Resumable.
//   node scripts/scrape-archive.mjs
import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import { ROOT, sleep, writeJson, readJson } from "./lib.mjs";

const LIST_BASE = "https://archive.bitmesra.ac.in";
const FILE_BASE = "https://www.bitmesra.ac.in"; // PDFs 301 → bitmesra.ac.in
const DEPTS = {
  Architecture: 376, BioEngg: 375, Chemical: 378, Chemistry: 379, Civil: 445,
  CSE: 446, CQEDS: 447, EEE: 448, ECE: 449, HMCT: 450, Management: 439,
  Mathematics: 451, Mechanical: 452, Pharmacy: 438, Physics: 453,
  Production: 380, RemoteSensing: 454, SER: 455,
};

const OUT_DIR = path.join(ROOT, "project_reference", "pyq_pdfs");
const MANIFEST = "project_reference/pyq_manifest.json";
const manifest = readJson(MANIFEST, {}) ?? {};

const get = (url) =>
  fetch(url, { headers: { "User-Agent": "crambit-datasync" } }).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.text();
  });

for (const [dept, pid] of Object.entries(DEPTS)) {
  console.log(`\n== ${dept}`);
  let html;
  try {
    html = await get(`${LIST_BASE}/Visit_Other_Department_9910?cid=1&deptid=258&pid=${pid}`);
  } catch (e) {
    console.error(" dept page failed:", e.message);
    continue;
  }
  const $ = cheerio.load(html);
  const links = new Set();
  $("a[href]").each((_, a) => {
    const href = $(a).attr("href") ?? "";
    // Only real exam-paper documents.
    if (/\/UploadedDocuments\/adminexam\/files\/.+\.pdf$/i.test(href)) {
      links.add(href.startsWith("http") ? href : FILE_BASE + href);
    }
  });
  console.log(` ${links.size} question-paper PDFs`);

  let ok = 0;
  for (const link of links) {
    const name = decodeURIComponent(link.split("/").pop());
    const examType = /\(MID|_MID|MSE/i.test(name)
      ? "MID"
      : /\(END|_END|ESE/i.test(name)
        ? "END"
        : "OTHER";
    const code = (name.match(/\b([A-Z]{2}\d{3,6})\b/) ?? [])[1] ?? "UNKNOWN";
    const key = `${dept}/${name}`;
    if (manifest[key]?.downloaded) {
      ok++;
      continue;
    }

    const dir = path.join(OUT_DIR, dept);
    fs.mkdirSync(dir, { recursive: true });
    try {
      const res = await fetch(link, { redirect: "follow" });
      if (!res.ok) throw new Error(String(res.status));
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(path.join(dir, name), buf);
      manifest[key] = { dept, name, code, examType, url: link, downloaded: true, bytes: buf.length };
      ok++;
    } catch (e) {
      manifest[key] = { dept, name, code, examType, url: link, downloaded: false, error: e.message };
    }
    await sleep(250);
  }
  writeJson(MANIFEST, manifest);
  console.log(` ${ok}/${links.size} downloaded`);
}

const total = Object.values(manifest).filter((m) => m.downloaded).length;
const mid = Object.values(manifest).filter((m) => m.downloaded && m.examType === "MID").length;
console.log(`\ndone — ${total} PDFs (${mid} MID)`);
