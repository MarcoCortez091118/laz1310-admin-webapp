import { existsSync, mkdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

const OUTPUT = resolve("src/api/generated/schema.d.ts");
const DEFAULT_API_BASE_URL =
  "https://laz1310-fastapi-enaeaghwfhbhgsa9.canadacentral-01.azurewebsites.net";
const force = process.argv.includes("--force");

function hasGeneratedContract() {
  return existsSync(OUTPUT) && statSync(OUTPUT).size > 0;
}

function resolveOpenApiUrl() {
  const explicit = process.env.OPENAPI_URL?.trim();
  if (explicit) return explicit;

  const runtimeBase = process.env.VITE_API_BASE_URL?.trim().replace(/\/$/, "");
  if (runtimeBase) return `${runtimeBase}/openapi.json`;

  return `${DEFAULT_API_BASE_URL}/openapi.json`;
}

if (!force && hasGeneratedContract()) {
  console.log("FastAPI contract already generated.");
  process.exit(0);
}

mkdirSync(resolve("src/api/generated"), { recursive: true });

const executable = resolve(
  "node_modules",
  ".bin",
  process.platform === "win32" ? "openapi-typescript.cmd" : "openapi-typescript",
);
const openApiUrl = resolveOpenApiUrl();

console.log(`Generating FastAPI contract from ${openApiUrl}`);

const result = spawnSync(
  executable,
  [openApiUrl, "-o", OUTPUT],
  {
    env: process.env,
    stdio: "inherit",
  },
);

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

if (!hasGeneratedContract()) {
  throw new Error("OpenAPI generation completed without producing schema.d.ts");
}
