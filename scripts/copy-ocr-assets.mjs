#!/usr/bin/env node
// Copy tesseract.js worker + core wasm from node_modules into public/ocr so
// OCR loads from our own origin instead of the jsDelivr CDN (which strict
// CSPs block). Runs on postinstall; public/ocr is gitignored.
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const OUT = "public/ocr";
const FILES = [
  ["node_modules/tesseract.js/dist/worker.min.js", "worker.min.js"],
  ["node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm", "tesseract-core-simd-lstm.wasm"],
  ["node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js", "tesseract-core-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-lstm.wasm", "tesseract-core-lstm.wasm"],
];

mkdirSync(OUT, { recursive: true });
let copied = 0;
for (const [src, name] of FILES) {
  if (!existsSync(src)) {
    console.warn(`[ocr-assets] 找不到 ${src}，OCR 將退回 CDN 載入`);
    continue;
  }
  copyFileSync(src, join(OUT, name));
  copied++;
}
console.log(`[ocr-assets] 已複製 ${copied}/${FILES.length} 個檔案到 ${OUT}`);
