import { readFileSync } from "node:fs";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";

const path =
  "C:/Cursor/Med_dashboard/docs/samples/geopdf/ops_arch_e_land_20260824_1905_HighLava_WAGPF000684_0825day.pdf";

const data = new Uint8Array(readFileSync(path));
const pdf = await getDocument({ data, disableWorker: true }).promise;
const page = await pdf.getPage(1);

const annots = await page.getAnnotations();
console.log("annotations", annots.length);
console.log(annots.slice(0, 8).map((a) => ({ type: a.subtype, title: a.title, contents: a.contents })));

const ops = await page.getOperatorList();
const opName = Object.fromEntries(Object.entries(OPS).map(([k, v]) => [v, k]));
const names = {};
for (const fn of ops.fnArray) {
  const n = opName[fn] ?? `fn${fn}`;
  names[n] = (names[n] ?? 0) + 1;
}
console.log("op counts", names);
console.log("fnArray unique", Object.keys(names).length, "total", ops.fnArray.length);

const objs = await page.getOperatorList();
// Show some string args
let strs = 0;
for (const args of objs.argsArray) {
  if (!args) continue;
  for (const a of args) {
    if (typeof a === "string" && a.trim() && a.length < 40) {
      if (strs < 40) console.log("str arg", JSON.stringify(a));
      strs++;
    }
    if (Array.isArray(a)) {
      for (const b of a) {
        if (typeof b === "string" && /[A-Za-z]/.test(b) && b.length < 30) {
          if (strs < 40) console.log("arr str", JSON.stringify(b));
          strs++;
        }
      }
    }
  }
}
console.log("string-like args", strs);
