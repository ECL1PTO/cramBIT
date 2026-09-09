// Crawl archive.bitmesra.ac.in question-paper archive across ALL departments.
// Downloads MID + END semester PDFs and writes a manifest. Resumable.
//
//   node scripts/scrape-archive.mjs
import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import { ROOT, sleep, writeJson, readJson } from "./lib.mjs";

const BASE = "https://archive.bitmesra.ac.in";
const DEPTS = {
  Architecture: 376, BioEngg: 375, Chemical: 378, Chemistry: 379, Civil: 445,
  CSE: 446, CQEDS: 447, EEE: 448, ECE: 449, HMCT: 450, Management: 439,
  Mathematics: 451, Mechanical: 452, Pharmacy: 438, Physics: 453,
  Production: 380, RemoteSensing: 454, SER: 455,
};

const OUT_DIR = path.join(ROOT, "project_reference", "pyq_pdfs");
const MANIFEST = "project_reference/pyq_manifest.json";
const manifest = readJson(MANIFEST, {}) ?? {};

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": "crambit-datasync" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

for (const [dept, pid] of Object.entries(DEPTS)) {
  const url = `${BASE}/Visit_Other_Department_9910?cid=1&deptid=258&pid=${pid}`;
  console.log("\n==", dept);
  let html;
  try {
    html = await get(url);
  } catch (e) {
    console.error(" dept failed:", e.message);
    continue;
  }
  const $ = cheerio.load(html);
  const links = new Set();
  $("a[href$='.pdf']").each((_, a) => {
    const href = $(a).attr("href");
    if (href) links.add(href.startsWith("http") ? href : BASE + href);
  });

  console.log(` ${links.size} PDF links`);
  for (const link of links) {
    const name = decodeURIComponent(link.split("/").pop());
    const isMid = /MID|MSE/i.test(name);
    const examType = isMid ? "MID" : /END|ESE/i.test(name) ? "END" : "OTHER";
    const codeMatch = name.match(/\b([A-Z]{2}\d{3,6})\b/);
    const code = codeMatch ? codeMatch[1] : "UNKNOWN";

    const key = `${dept}/${name}`;
    if (manifest[key]?.downloaded) continue;

    const destDir = path.join(OUT_DIR, dept);
    fs.mkdirSync(destDir, { recursive: true });
    const dest = path.join(destDir, name);
    try {
      const res = await fetch(link);
      if (!res.ok) throw new Error(String(res.status));
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(dest, buf);
      manifest[key] = { dept, name, code, examType, url: link, downloaded: true, bytes: buf.length };
    } catch (e) {
      manifest[key] = { dept, name, code, examType, url: link, downloaded: false, error: e.message };
    }
    await sleep(300);
  }
  writeJson(MANIFEST, manifest);
}

const total = Object.values(manifest).filter((m) => m.downloaded).length;
console.log(`\ndone — ${total} PDFs downloaded`);
