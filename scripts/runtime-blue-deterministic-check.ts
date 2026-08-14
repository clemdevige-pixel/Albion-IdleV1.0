import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * TEMPORARY BLUE RUNTIME DIAGNOSTIC.
 *
 * Runs the real Blue progression benchmark twice from the active development
 * branch and requires the generated CSV to be byte-for-byte identical.
 * Delete this file once Blue runtime determinism has been validated.
 */

const OUTPUT_PATH = path.resolve(
  "node_modules",
  ".cache",
  "albion-idle",
  "runtime-blue-persistent-progression-farm.csv",
);

function runPnpm(args: readonly string[]): void {
  if (process.platform === "win32") {
    execFileSync("cmd.exe", ["/d", "/s", "/c", "pnpm.cmd", ...args], {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
    });
    return;
  }

  execFileSync("pnpm", [...args], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
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
  const tsxCli = path.resolve("node_modules", "tsx", "dist", "cli.mjs");
  execFileSync(
    process.execPath,
    [tsxCli, "scripts/runtime-blue-progression-farm-run.ts"],
    {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
    },
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

  for (const column of requiredColumns) {
    if (!header.split(",").includes(column)) {
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

console.log("=== TEMP BLUE RUNTIME DETERMINISM CHECK ===");
prepareWorkspace();
console.log("Run 1/2");
const first = runBenchmark();
validateCsv(first);
const firstHash = sha256(first);

console.log("\nRun 2/2");
const second = runBenchmark();
validateCsv(second);
const secondHash = sha256(second);

console.log(`\nRun 1 SHA-256: ${firstHash}`);
console.log(`Run 2 SHA-256: ${secondHash}`);

if (!first.equals(second)) {
  throw new Error(
    "Blue runtime is NOT deterministic: the two progression CSV outputs differ",
  );
}

const rowCount = first.toString("utf8").trim().split(/\r?\n/).length - 1;
console.log(`Rows compared: ${rowCount}`);
console.log("PASS: Blue runtime progression output is byte-for-byte deterministic.");
