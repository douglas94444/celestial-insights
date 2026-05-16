import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "supabase/functions");

function collectFiles(entryRel) {
  const files = new Map();
  const queue = [path.join(root, entryRel)];

  while (queue.length) {
    const abs = queue.pop();
    if (!fs.existsSync(abs)) continue;
    const rel = path.relative(root, abs).replace(/\\/g, "/");
    if (files.has(rel)) continue;
    files.set(rel, fs.readFileSync(abs, "utf8"));
    const content = files.get(rel);
    for (const m of content.matchAll(/from ["'](\.\.?\/[^"']+)["']/g)) {
      let imp = m[1];
      if (!imp.endsWith(".ts")) imp += ".ts";
      queue.push(path.normalize(path.join(path.dirname(abs), imp)));
    }
  }

  return [...files.entries()].map(([name, content]) => ({ name, content }));
}

const fn = process.argv[2];
if (!fn) {
  console.error("Usage: node scripts/bundle-edge-function.mjs <function-name>");
  process.exit(1);
}

const files = collectFiles(`${fn}/index.ts`);
process.stdout.write(JSON.stringify(files));
