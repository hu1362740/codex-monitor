import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = resolve(rootDir, ".env");
const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Usage: node scripts/run-with-env.mjs <command> [...args]");
  process.exit(1);
}

if (!existsSync(envFile)) {
  console.error(`Missing environment file: ${envFile}`);
  console.error("Create it first by copying .env.example to .env.");
  process.exit(1);
}

process.loadEnvFile(envFile);

const isWindows = process.platform === "win32";
const executable = isWindows ? (process.env.ComSpec ?? "cmd.exe") : command;
const quoteWindowsArg = (value) =>
  /[\s"&|<>^]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
const commandLine = [command, ...args].map(quoteWindowsArg).join(" ");
const executableArgs = isWindows ? ["/d", "/s", "/c", commandLine] : args;
const child = spawn(executable, executableArgs, {
  cwd: rootDir,
  env: process.env,
  stdio: "inherit",
  shell: false
});

child.on("error", (error) => {
  console.error(`Failed to start ${command}:`, error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
