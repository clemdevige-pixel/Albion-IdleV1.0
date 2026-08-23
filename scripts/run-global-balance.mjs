import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const isWindows = process.platform === "win32";
const pnpm = isWindows ? "pnpm.cmd" : "pnpm";
const logDir = join(process.cwd(), "tmp");
const logPath = join(logDir, "global-balance.log");
mkdirSync(logDir, { recursive: true });
writeFileSync(logPath, "", "utf8");

const steps = [
  ["typecheck", ["typecheck"]],
  ["validate:data", ["validate:data"]],
  ["weapon roles", ["benchmark:weapon-roles"]],
  ["boss only", ["benchmark:boss-only"]],
  ["blue contract", ["benchmark:blue-contract"]],
  ["global enchantment walls", ["benchmark:global-enchantment-walls"]],
  ["enchantment walls", ["benchmark:enchantment-walls"]],
  ["final gates", ["benchmark:final-gates"]],
  ["tier transitions", ["benchmark:tier-transitions"]],
  ["enchantment shards", ["benchmark:enchantment-shards"]],
  [
    "client balance suites",
    [
      "--filter",
      "@game/client",
      "test",
      "--",
      "src/data/globalWeaponZoneClearBenchmark.test.ts",
      "src/data/itemPowerCrossSpecialization.test.ts",
      "src/data/factionArtifactWeaponBenchmark.test.ts",
      "src/data/factionArtifactDungeonBonusABBenchmark.test.ts",
      "src/data/factionArtifactDungeonFavorableClearBenchmark.test.ts",
      "src/data/factionArtifactDungeonT5ToT8FavorableClearBenchmark.test.ts",
      "src/data/factionArtifactDungeonT5ToT8LeakBenchmark.test.ts",
      "src/data/dungeonT4BaseWeaponProgressionBenchmark.test.ts",
      "src/data/artifactWeaponCraftRecipes.test.ts",
      "src/data/artifactWeaponEnchantmentContract.test.ts",
      "src/data/awakenedDefensiveTraitCalibrationAudit.test.ts",
      "src/data/globalEconomySequentialSetChain.test.ts",
    ],
  ],
];

function keepCompactLine(line) {
  const trimmed = line.trimStart();
  return (
    /^\[[A-Z0-9_ -]+\]/.test(trimmed) ||
    /^[┌├└│┬┼┴─]/u.test(trimmed) ||
    /^FAIL\b/.test(trimmed) ||
    /^AssertionError\b/.test(trimmed) ||
    /^Error:\s/.test(trimmed) ||
    /^Test Files\b/.test(trimmed) ||
    /^Tests\b/.test(trimmed)
  );
}

function printCompact(output) {
  const lines = output.split(/\r?\n/);
  let previousWasTable = false;
  for (const line of lines) {
    const keep = keepCompactLine(line);
    if (!keep) continue;

    const isTable = /^[┌├└│┬┼┴─]/u.test(line.trimStart());
    if (!isTable && previousWasTable) process.stdout.write("\n");
    process.stdout.write(`${line}\n`);
    previousWasTable = isTable;
  }
}

function quoteWindowsArg(value) {
  if (!/[\s"&|<>^()]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

function runPnpm(args) {
  const commonOptions = {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    maxBuffer: 1024 * 1024 * 100,
  };

  if (!isWindows) {
    return spawnSync(pnpm, args, { ...commonOptions, shell: false });
  }

  const command = [pnpm, ...args].map(quoteWindowsArg).join(" ");
  return spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", command], {
    ...commonOptions,
    shell: false,
  });
}

let failed = false;

for (const [label, args] of steps) {
  process.stdout.write(`\n[GLOBAL_BALANCE] ${label}\n`);
  const result = runPnpm(args);

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const spawnError = result.error ? `\nSPAWN ERROR: ${result.error.stack ?? result.error.message}` : "";
  const full = `\n===== ${label} =====\n${stdout}${stderr}${spawnError}`;
  appendFileSync(logPath, full, "utf8");
  printCompact(`${stdout}\n${stderr}${spawnError}`);

  if (result.status !== 0) {
    failed = true;
    const exitLabel = result.status === null ? "spawn-error" : String(result.status);
    process.stdout.write(`[GLOBAL_BALANCE_FAIL] ${label} (exit ${exitLabel})\n`);
  }
}

process.stdout.write(`\n[GLOBAL_BALANCE_LOG] ${logPath}\n`);
process.stdout.write(`[GLOBAL_BALANCE_RESULT] ${failed ? "FAIL" : "PASS"}\n`);
process.exitCode = failed ? 1 : 0;
