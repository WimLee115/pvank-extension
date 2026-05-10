#!/usr/bin/env node
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf-8"));
const version = pkg.version;

const releases = resolve(root, "releases");
if (!existsSync(releases)) mkdirSync(releases, { recursive: true });

for (const target of ["chrome", "firefox"]) {
  const dist = resolve(root, `dist-${target}`);
  if (!existsSync(dist)) {
    console.error(`Missing ${dist} — run 'npm run build' first.`);
    process.exit(1);
  }
  const out = resolve(releases, `pvank-extension-${target}-${version}.zip`);
  execSync(`cd "${dist}" && zip -rq "${out}" .`);
  console.log(`✔ ${target}: ${out}`);
}
