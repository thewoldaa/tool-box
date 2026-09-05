#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

function checkOpencode() {
  try {
    execSync("opencode --version", { stdio: "pipe", timeout: 5000 });
    console.log("[tool-box] opencode found");
    return true;
  } catch {
    console.warn("[tool-box] opencode not found — install with: npm i -g opencode-ai@latest");
    return false;
  }
}

function ensureConfig() {
  try {
    const cfg = require("../src/config");
    const net = require("net");
    // quick TCP probe for 9Router
    const probe = () =>
      new Promise((resolve) => {
        const s = net.createConnection({ host: "127.0.0.1", port: 20128, timeout: 600 }, () => {
          s.destroy();
          resolve(true);
        });
        s.on("error", () => {
          s.destroy();
          resolve(false);
        });
        s.on("timeout", () => {
          s.destroy();
          resolve(false);
        });
      });
    probe().then((alive) => {
      let apiKey = null;
      try {
        const userCfg = path.join(os.homedir(), ".config", "opencode", "opencode.json");
        if (fs.existsSync(userCfg)) {
          const j = JSON.parse(fs.readFileSync(userCfg, "utf8"));
          if (j.provider && j.provider["9router"] && j.provider["9router"].options) apiKey = j.provider["9router"].options.apiKey;
        }
      } catch {}
      cfg.writeOpencodeConfig({ nineRouterAlive: alive, nineRouterApiKey: apiKey });
      console.log(`[tool-box] config written to ${cfg.getOpencodeConfigPath()} (9router: ${alive ? "alive" : "offline"})`);
    });
  } catch (e) {
    console.warn("[tool-box] config ensure failed:", e.message);
  }
}

checkOpencode();
ensureConfig();

// sync skills best-effort
try {
  const { syncCurated } = require("../src/skills/sync");
  const r = syncCurated();
  console.log(`[tool-box] skills synced ${r.synced}/${r.total} (missing: ${r.missing.length ? r.missing.join(", ") : "none"})`);
} catch (e) {
  console.warn("[tool-box] skills sync skipped:", e.message);
}
