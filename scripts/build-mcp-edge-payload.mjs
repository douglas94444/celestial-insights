/**
 * Gera payloads para deploy_edge_function (MCP Supabase).
 * Uso: node scripts/build-mcp-edge-payload.mjs <function-name>
 * Saída: scripts/.deploy-bundles/<name>.mcp.json
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const PROJECT_ID = "fxcoxnqqjgvqfukasfjb";
const fn = process.argv[2];
if (!fn) {
  console.error("Usage: node scripts/build-mcp-edge-payload.mjs <function-name>");
  process.exit(1);
}

const raw = execSync(`node scripts/bundle-edge-function.mjs ${fn}`, { encoding: "utf8" });
const files = JSON.parse(raw);

/** Webhooks: entrypoint na raiz; transit: paths supabase/functions/… */
const isWebhook = fn === "syncpay-webhook" || fn === "mercadopago-webhook";

const mcpFiles = isWebhook
  ? files.map((f) => ({ name: "index.ts", content: f.content }))
  : files.map((f) => ({
      name: `supabase/functions/${f.name}`,
      content: f.content,
    }));

const payload = {
  project_id: PROJECT_ID,
  name: fn,
  entrypoint_path: isWebhook ? "index.ts" : `supabase/functions/${fn}/index.ts`,
  verify_jwt: false,
  files: mcpFiles,
};

const outDir = path.join("scripts", ".deploy-bundles");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `${fn}.mcp.json`);
fs.writeFileSync(outPath, JSON.stringify(payload), "utf8");
console.log(`Wrote ${outPath} (${mcpFiles.length} files, ${JSON.stringify(payload).length} bytes)`);
