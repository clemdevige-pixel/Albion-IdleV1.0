import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Permanent Blue runtime determinism guard.
 *
 * Runs the canonical Blue progression benchmark three times from a clean process
 * boundary and requires the generated CSV to be byte-for-byte identical.
 * This protects balance work from tuning against simulation noise.
 */

const ROOT = process.cwd();
const CLIENT_DIR = path.resolve(ROOT, "apps", "client");
const OUTPUT_PATH = path.resolve(
  CLIENT_DIR,
  "node_modules",
  ".cache",
  "albion-idle",
  "runtime-blue-persistent-progression-farm.csv",
);
const RUN_COUNT = 3;

function runPnpm(args: readonly string[], cwd = ROOT, silent = false): void {
  const env = {
    ...process.env,
    TZ: "UTC",
    LANG: process.env.LANG ?? "C",
    LC_ALL: process.env.LC_ALL ?? "C",
  };

  if (process.platform === "win32") {
    execFileSync("cmd.exe", ["/d", "/s", "/c", "pnpm.cmd", ...args], {
      cwd,
      stdio: silent ? "pipe" : "inherit",
      env,
    });
    return;
  }

  execFileSync("pnpm", [...args], {
    cwd,
    stdio: silent ? "pipe" : "inherit",
    env,
  });
}

function prepareWorkspace(): void {
  console.log("Preparing workspace packages required by the Blue runtime...");
  runPnpm(["--filter", "@game/shared", "build"]);
  runPnpm(["--filter", "@game/core", "build"]);
  runPnpm(["--filter", "@game/data", "build"]);
  runPnpm(["--filter", "@game/persistence", "build"]);
  runPnpm(["--filter", "@game/gameplay", "build"]);
}

function runBenchmark(): Buffer {
  runPnpm(
    ["exec", "tsx", path.resolve(ROOT, "scripts", "runtime-blue-progression-farm-run.ts")],
    CLIENT_DIR,
    true,
  );

  if (!fs.existsSync(OUTPUT_PATH)) {
    throw new Error(`Blue runtime benchmark did not generate ${OUTPUT_PATH}`);
  }

  return fs.readFileSync(OUTPUT_PATH);
}

function sha256(value: Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function validateCsv(value: Buffer): void {
  const csv = value.toString("utf8").trim();
  const lines = csv.split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error("Blue runtime CSV contains no progression rows");
  }

  const header = lines[0] ?? "";
  const requiredColumns = [
    "mode",
    "specialization",
    "zone",
    "segment",
    "ip",
    "gearStarted",
    "gearCleared",
    "masteryStarted",
    "masteryCleared",
    "fameEarned",
    "farmFame",
    "farmRuns",
    "deaths",
    "upgrades",
    "potions",
    "elapsedSeconds",
    "result",
  ];

  const columns = header.split(",");
  for (const column of requiredColumns) {
    if (!columns.includes(column)) {
      throw new Error(`Blue runtime CSV is missing required column: ${column}`);
    }
  }

  if (!csv.includes("AFK") || !csv.includes("ACTIVE")) {
    throw new Error("Blue runtime CSV must contain both AFK and ACTIVE runs");
  }

  for (const invalid of ["NaN", "undefined", "Infinity"]) {
    if (csv.includes(invalid)) {
      throw new Error(`Blue runtime CSV contains invalid value: ${invalid}`);
    }
  }
}

console.log("=== BLUE RUNTIME DETERMINISM CHECK ===");
prepareWorkspace();

const outputs: Buffer[] = [];
for (let index = 0; index < RUN_COUNT; index += 1) {
  console.log(`Run ${index + 1}/${RUN_COUNT}`);
  const output = runBenchmark();
  validateCsv(output);
  outputs.push(output);
  console.log(`  SHA-256: ${sha256(output)}`);
}

const baseline = outputs[0];
if (baseline === undefined) {
  throw new Error("Blue runtime determinism check produced no output");
}

for (let index = 1; index < outputs.length; index += 1) {
  if (!baseline.equals(outputs[index]!)) {
    throw new Error(
      `Blue runtime is NOT deterministic: run 1 differs from run ${index + 1}`,
    );
  }
}

const rowCount = baseline.toString("utf8").trim().split(/\r?\n/).length - 1;
console.log(`Rows compared per run: ${rowCount}`);
console.log(`PASS: ${RUN_COUNT} Blue runtime outputs are byte-for-byte identical.`);