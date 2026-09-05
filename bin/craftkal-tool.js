#!/usr/bin/env node
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const net = require("net");

const pkg = require("../package.json");
const { FREE_FALLBACK_CHAIN } = require("../src/constants");
const { getOpencodeConfigPath, writeOpencodeConfig, readOpencodeConfig, getConfigDir } = require("../src/config");
const { runWithFallback } = require("../src/fallback");
const { syncCurated, listSynced } = require("../src/skills/sync");

const VERSION = pkg.version;

function printHelp() {
  console.log(`
 ${pkg.name} v${VERSION} — instant agentic AI (wraps opencode)

 Usage:
   thewoldaa-tool [prompt...]         run instant (fallback free models) [alias: craftkal-tool]
   thewoldaa-tool run [prompt...]      same as above
   thewoldaa-tool serve                start opencode TUI (instant)
   thewoldaa-tool web                  start opencode web UI
   thewoldaa-tool models               list free + fallback models
   thewoldaa-tool doctor               diagnose opencode + 9router + skills
   thewoldaa-tool skills list          list synced curated skills (31)
   thewoldaa-tool skills sync [--force] sync Hermes + .agents skills
   thewoldaa-tool config path|show|reset  manage ~/.config/tool-box
   thewoldaa-tool --help | -h
   thewoldaa-tool --version | -v

 Env:
   TOOLBOX_MODEL=<model>  override primary model
   OPENCODE_MODEL=<model> also respected

 Examples:
   thewoldaa-tool "buat landing page modern"
   thewoldaa-tool run "refactor this file" -- --agent toolbox
   thewoldaa-tool serve
   thewoldaa-tool doctor
   craftkal-tool "hello"               # alias legacy tetap jalan
`);
}

function printVersion() {
  console.log(VERSION);
}

function isHelp(a) { return a === "--help" || a === "-h" || a === "help"; }
function isVersion(a) { return a === "--version" || a === "-v" || a === "version"; }

function getOpencodeBin() {
  if (process.platform === "win32") {
    const direct = path.join(os.homedir(), "AppData", "Roaming", "npm", "node_modules", "opencode-ai", "bin", "opencode.exe");
    if (fs.existsSync(direct)) return direct;
  }
  return process.platform === "win32" ? "opencode.cmd" : "opencode";
}
function checkOpencode() {
  const bin = getOpencodeBin();
  const useShell = bin.endsWith(".cmd");
  const r = spawnSync(bin, ["--version"], { shell: useShell, timeout: 4000, encoding: "utf8" });
  if (r.error || r.status !== 0) {
    const r2 = spawnSync("opencode", ["--version"], { shell: true, timeout: 4000, encoding: "utf8" });
    if (r2.error || r2.status !== 0) return null;
    return (r2.stdout || r2.stderr || "").trim();
  }
  return (r.stdout || r.stderr || "").trim();
}

function probeNineRouter() {
  return new Promise((resolve) => {
    const s = net.createConnection({ host: "127.0.0.1", port: 20128, timeout: 800 }, () => {
      s.destroy();
      resolve(true);
    });
    s.on("error", () => { s.destroy(); resolve(false); });
    s.on("timeout", () => { s.destroy(); resolve(false); });
  });
}

function opencodeSpawn(args, opts = {}) {
  const env = { ...process.env };
  const tbCfg = getOpencodeConfigPath();
  if (fs.existsSync(tbCfg)) env.TOOLBOX_CONFIG = tbCfg;
  const bin = getOpencodeBin();
  const useShell = bin.endsWith(".cmd");
  const child = spawn(bin, args, { stdio: "inherit", shell: useShell, env, cwd: opts.cwd || process.cwd() });
  return child;
}

async function cmdDoctor() {
  console.log(`\n[tool-box] doctor v${VERSION}\n`);
  const opV = checkOpencode();
  console.log(` opencode: ${opV ? "✓ " + opV : "✗ not found (npm i -g opencode-ai@latest)"}`);
  const alive = await probeNineRouter();
  console.log(` 9router : ${alive ? "✓ alive at 127.0.0.1:20128 (will reuse)" : "○ offline (using opencode free directly)"}`);
  const cfgPath = getOpencodeConfigPath();
  const exists = fs.existsSync(cfgPath);
  console.log(` config  : ${exists ? "✓ " + cfgPath : "✗ missing — run: thewoldaa-tool config reset"}`);
  if (exists) {
    try {
      const j = readOpencodeConfig();
      console.log(`  primary: ${j.model}`);
      console.log(`  fallback: ${(j.agent?.toolbox?.fallback_models || []).map((m) => m.model).join(" -> ") || "none"}`);
    } catch (e) { console.log(`  config read error: ${e.message}`); }
  }
  const skills = listSynced();
  console.log(` skills  : ${skills.length ? "✓ " + skills.length + " synced in ~/.config/tool-box/skills" : "○ none — run: thewoldaa-tool skills sync"}`);
  if (skills.length) skills.slice(0, 8).forEach((s) => console.log(`          - ${s.name}`));
  if (skills.length > 8) console.log(`          ... +${skills.length - 8} more`);

  // suggestions
  if (!opV) console.log("\n ! install opencode: npm i -g opencode-ai@latest");
  if (!exists) console.log(" ! generate config: thewoldaa-tool config reset");
  if (!skills.length) console.log(" ! sync skills: thewoldaa-tool skills sync");
  console.log("");
}

async function cmdSkills(args) {
  const sub = args[0] || "list";
  if (sub === "list" || sub === "ls") {
    const list = listSynced();
    if (!list.length) {
      console.log("[tool-box] no skills synced yet. Run: thewoldaa-tool skills sync");
      return;
    }
    console.log(`\n[tool-box] ${list.length} skills in ~/.config/tool-box/skills:\n`);
    for (const s of list) {
      console.log(` - ${s.name.padEnd(28)} ${s.desc}`);
    }
    console.log("");
  } else if (sub === "sync") {
    const force = args.includes("--force") || args.includes("-f");
    const r = syncCurated({ force });
    console.log(`[tool-box] synced ${r.synced}/${r.total} to ${r.destRoot}`);
    if (r.missing.length) console.log(` missing (${r.missing.length}): ${r.missing.join(", ")}`);
    if (r.errors.length) console.log(` errors: ${r.errors.join("; ")}`);
    if (!r.synced && !r.missing.length) console.log(" (already up to date, use --force to overwrite)");
  } else {
    console.log(`Unknown skills subcommand: ${sub}. Use: list | sync [--force]`);
  }
}

async function cmdConfig(args) {
  const sub = args[0] || "show";
  if (sub === "path") {
    console.log(getOpencodeConfigPath());
  } else if (sub === "show") {
    const p = getOpencodeConfigPath();
    if (!fs.existsSync(p)) { console.log(`No config at ${p}. Run: thewoldaa-tool config reset`); return; }
    console.log(fs.readFileSync(p, "utf8"));
  } else if (sub === "reset") {
    const alive = await probeNineRouter();
    let apiKey = null;
    try {
      const userCfg = path.join(os.homedir(), ".config", "opencode", "opencode.json");
      if (fs.existsSync(userCfg)) {
        const j = JSON.parse(fs.readFileSync(userCfg, "utf8"));
        if (j.provider?.["9router"]?.options?.apiKey) apiKey = j.provider["9router"].options.apiKey;
      }
    } catch {}
    const { path: p, config } = writeOpencodeConfig({ nineRouterAlive: alive, nineRouterApiKey: apiKey });
    console.log(`[tool-box] config reset at ${p}`);
    console.log(` primary: ${config.model}`);
    console.log(` 9router: ${alive ? "enabled" : "disabled (offline)"}`);
  } else {
    console.log(`Unknown config subcommand: ${sub}. Use: path | show | reset`);
  }
}

async function cmdModels() {
  console.log(`\n[tool-box] fallback chain (free, no API key):\n`);
  FREE_FALLBACK_CHAIN.forEach((m, i) => console.log(` ${i === 0 ? "►" : " "} ${String(i + 1).padStart(2)}. ${m}${i === 0 ? "  (primary)" : ""}`));
  console.log(`\n detection: 9router at 127.0.0.1:20128 will be probed at runtime`);
  console.log(` override: TOOLBOX_MODEL or OPENCODE_MODEL env\n`);
  const binM = getOpencodeBin();
  const r = spawnSync(binM, ["models"], { shell: binM.endsWith(".cmd"), timeout: 6000, encoding: "utf8" });
  if (r.status === 0 && r.stdout) {
    console.log("[opencode models]\n" + r.stdout.slice(0, 2000));
  } else {
    const r2 = spawnSync("opencode", ["models"], { shell: true, timeout: 6000, encoding: "utf8" });
    if (r2.status === 0 && r2.stdout) console.log("[opencode models]\n" + r2.stdout.slice(0, 2000));
  }
}

async function cmdRun(promptArgs) {
  // promptArgs may contain -- separator
  const sepIdx = promptArgs.indexOf("--");
  let promptParts = promptArgs;
  let extra = [];
  if (sepIdx !== -1) {
    promptParts = promptArgs.slice(0, sepIdx);
    extra = promptArgs.slice(sepIdx + 1);
  }
  const prompt = promptParts.join(" ").trim();
  if (!prompt) {
    console.error("No prompt. Usage: thewoldaa-tool \"your prompt\"  or  thewoldaa-tool run \"prompt\" -- --agent toolbox (alias craftkal-tool тоже)");
    process.exit(1);
  }
  const opV = checkOpencode();
  if (!opV) {
    console.error("[tool-box] opencode not found. Install: npm i -g opencode-ai@latest");
    process.exit(1);
  }
  // ensure config exists
  if (!fs.existsSync(getOpencodeConfigPath())) {
    const alive = await probeNineRouter();
    let apiKey = null;
    try {
      const userCfg = path.join(os.homedir(), ".config", "opencode", "opencode.json");
      if (fs.existsSync(userCfg)) {
        const j = JSON.parse(fs.readFileSync(userCfg, "utf8"));
        if (j.provider?.["9router"]?.options?.apiKey) apiKey = j.provider["9router"].options.apiKey;
      }
    } catch {}
    writeOpencodeConfig({ nineRouterAlive: alive, nineRouterApiKey: apiKey });
  }
  const primary = process.env.TOOLBOX_MODEL || process.env.OPENCODE_MODEL || FREE_FALLBACK_CHAIN[0];
  // build chain with primary first, then fallback without duplicate
  const chain = [primary, ...FREE_FALLBACK_CHAIN.filter((m) => m !== primary)];

  console.error(`[tool-box] primary: ${primary}  (fallback ${chain.length - 1} models)`);
  try {
    await runWithFallback({ prompt, modelChain: chain, extraArgs: extra });
  } catch (e) {
    console.error(`\n[tool-box] all fallbacks failed: ${e.message}`);
    process.exit(1);
  }
}

async function main() {
  const raw = process.argv.slice(2);
  if (!raw.length) { printHelp(); return; }
  const cmd = raw[0];

  if (isHelp(cmd)) { printHelp(); return; }
  if (isVersion(cmd)) { printVersion(); return; }

  // subcommands
  if (cmd === "doctor") return cmdDoctor();
  if (cmd === "skills") return cmdSkills(raw.slice(1));
  if (cmd === "config") return cmdConfig(raw.slice(1));
  if (cmd === "models") return cmdModels();
  if (cmd === "run") return cmdRun(raw.slice(1));
  if (cmd === "serve" || cmd === "tui") {
    const child = opencodeSpawn([], {});
    child.on("close", (c) => process.exit(c ?? 0));
    return;
  }
  if (cmd === "web") {
    const child = opencodeSpawn(["web"], {});
    child.on("close", (c) => process.exit(c ?? 0));
    return;
  }
  if (cmd === "upgrade") {
    console.log("[tool-box] upgrading opencode...");
    const npmBin = process.platform === "win32" ? "npm.cmd" : "npm";
    const r = spawnSync(npmBin, ["i", "-g", "opencode-ai@latest"], { stdio: "inherit", shell: npmBin.endsWith(".cmd") });
    if (r.error) {
      const r2 = spawnSync("npm", ["i", "-g", "opencode-ai@latest"], { stdio: "inherit", shell: true });
      process.exit(r2.status ?? 0);
    }
    process.exit(r.status ?? 0);
  }

  // default: treat all args as prompt (instant run)
  // support `craftkal-tool --continue` etc passed through
  if (cmd.startsWith("-")) {
    // pass through to opencode verbatim
    const child = opencodeSpawn(raw, {});
    child.on("close", (c) => process.exit(c ?? 0));
    return;
  }
  return cmdRun(raw);
}

main().catch((e) => {
  console.error("[tool-box] fatal:", e.message);
  process.exit(1);
});
