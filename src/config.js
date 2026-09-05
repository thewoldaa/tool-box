const fs = require("fs");
const path = require("path");
const os = require("os");
const { FREE_FALLBACK_CHAIN } = require("./constants");

function getConfigDir() {
  if (process.platform === "win32") {
    return path.join(os.homedir(), ".config", "tool-box");
  }
  return path.join(os.homedir(), ".config", "tool-box");
}

function getOpencodeConfigPath() {
  return path.join(getConfigDir(), "opencode.json");
}

function ensureConfigDir() {
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function isNineRouterAliveSync() {
  // sync probe via spawnSync curl not available; use TCP check inline later
  return false;
}

// Build opencode.json for tool-box (derivative of user's opencode.json)
function buildOpencodeConfig({ nineRouterAlive = false, nineRouterApiKey = null } = {}) {
  const fallbackModels = FREE_FALLBACK_CHAIN.slice(1).map((m) => ({ model: m }));
  // primary
  const primary = FREE_FALLBACK_CHAIN[0];

  const provider = {
    opencode: {
      // opencode provider is built-in, no apiKey needed (free)
    },
  };

  if (nineRouterAlive) {
    provider["9router"] = {
      npm: "@ai-sdk/openai-compatible",
      options: {
        baseURL: "http://127.0.0.1:20128/v1",
        apiKey: nineRouterApiKey || "sk-toolbox-local",
      },
      models: {
        "kr/deepseek-3.2": {
          name: "kr/deepseek-3.2",
          modalities: { input: ["text", "image"], output: ["text"] },
        },
      },
    };
  }

  // also keep kenari if user has it (read from existing opencode.json)
  let kenari = null;
  try {
    const userOpencode = path.join(os.homedir(), ".config", "opencode", "opencode.json");
    if (fs.existsSync(userOpencode)) {
      const raw = JSON.parse(fs.readFileSync(userOpencode, "utf8"));
      if (raw.provider && raw.provider.kenari) kenari = raw.provider.kenari;
    }
  } catch {}

  if (kenari) provider.kenari = kenari;

  const config = {
    $schema: "https://opencode.ai/config.json",
    model: primary,
    provider,
    agent: {
      toolbox: {
        description: "craftkal/tool-box main agent — fast, instant, fallback chain",
        mode: "primary",
        model: primary,
        fallback_models: fallbackModels,
      },
      explorer: {
        description: "Fast explorer subagent",
        mode: "subagent",
        model: FREE_FALLBACK_CHAIN[2] || primary,
      },
    },
    plugin: ["oh-my-openagent@latest"],
  };

  return config;
}

function writeOpencodeConfig(opts) {
  ensureConfigDir();
  const p = getOpencodeConfigPath();
  const cfg = buildOpencodeConfig(opts);
  fs.writeFileSync(p, JSON.stringify(cfg, null, 2));
  return { path: p, config: cfg };
}

function readOpencodeConfig() {
  const p = getOpencodeConfigPath();
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

module.exports = { getConfigDir, getOpencodeConfigPath, ensureConfigDir, buildOpencodeConfig, writeOpencodeConfig, readOpencodeConfig };
