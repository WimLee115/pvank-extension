#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const target = process.argv[2];

if (!["chrome", "firefox"].includes(target)) {
  console.error("Usage: finalize.mjs <chrome|firefox>");
  process.exit(1);
}

const distDir = resolve(root, `dist-${target}`);
if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });

const manifest = JSON.parse(readFileSync(resolve(root, "src/manifest.base.json"), "utf-8"));

manifest.background = target === "firefox"
  ? { scripts: ["background.js"], type: "module" }
  : { service_worker: "background.js", type: "module" };

if (target === "firefox") {
  manifest.browser_specific_settings = {
    gecko: {
      id: "pvank@wimlee.nl",
      strict_min_version: "121.0",
    },
  };
}

writeFileSync(resolve(distDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

const copies = [
  ["public/icons", "icons"],
  ["public/_locales", "_locales"],
  ["public/verify.html", "verify.html"],
  ["public/decrypt.html", "decrypt.html"],
];
for (const [src, dst] of copies) {
  const from = resolve(root, src);
  const to = resolve(distDir, dst);
  if (existsSync(from)) cpSync(from, to, { recursive: true });
}

console.log(`✔ ${target} build finalized → ${distDir}`);
