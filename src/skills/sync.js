const fs = require("fs");
const path = require("path");
const os = require("os");
const { CURATED_SKILLS } = require("../constants");

const HERMES_HOME = path.join(os.homedir(), "AppData", "Local", "hermes", "skills");
const HERMES_HOME_FALLBACK = path.join(os.homedir(), ".hermes", "skills"); // not used but checked
const AGENTS_SKILLS = path.join(os.homedir(), ".agents", "skills");
const OPENCODE_SKILLS = path.join(os.homedir(), ".config", "opencode", "skills");

function getToolboxSkillsDir() {
  const dir = path.join(os.homedir(), ".config", "tool-box", "skills");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function findSkillSource(skillName) {
  const candidates = [
    path.join(HERMES_HOME, skillName),
    path.join(HERMES_HOME, "software-development", skillName),
    path.join(HERMES_HOME, "productivity", skillName),
    path.join(HERMES_HOME, "frontend", skillName),
    path.join(HERMES_HOME, "creative", skillName),
    path.join(HERMES_HOME, "research", skillName),
    path.join(HERMES_HOME, "github", skillName),
    path.join(HERMES_HOME, "autonomous-ai-agents", skillName),
    path.join(AGENTS_SKILLS, skillName),
    path.join(OPENCODE_SKILLS, skillName),
  ];
  // also scan hermes categories brute force
  if (fs.existsSync(HERMES_HOME)) {
    try {
      const cats = fs.readdirSync(HERMES_HOME, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
      for (const cat of cats) {
        candidates.push(path.join(HERMES_HOME, cat, skillName));
      }
    } catch {}
  }
  for (const c of candidates) {
    const skillMd = path.join(c, "SKILL.md");
    if (fs.existsSync(skillMd)) return { dir: c, skillMd };
  }
  return null;
}

function syncCurated({ curated = CURATED_SKILLS, force = false } = {}) {
  const destRoot = getToolboxSkillsDir();
  let synced = 0;
  let missing = [];
  let errors = [];

  for (const name of curated) {
    const src = findSkillSource(name);
    if (!src) {
      missing.push(name);
      continue;
    }
    const dest = path.join(destRoot, name);
    try {
      if (fs.existsSync(dest) && !force) {
        // skip if same mtime already
        continue;
      }
      fs.mkdirSync(dest, { recursive: true });
      // copy SKILL.md + references if exists
      const destMd = path.join(dest, "SKILL.md");
      fs.copyFileSync(src.skillMd, destMd);
      const refSrc = path.join(src.dir, "references");
      const refDest = path.join(dest, "references");
      if (fs.existsSync(refSrc) && fs.statSync(refSrc).isDirectory()) {
        fs.mkdirSync(refDest, { recursive: true });
        for (const f of fs.readdirSync(refSrc)) {
          const s = path.join(refSrc, f);
          const d = path.join(refDest, f);
          if (fs.statSync(s).isFile()) fs.copyFileSync(s, d);
        }
      }
      // copy scripts folder if exists (docx etc)
      const scriptsSrc = path.join(src.dir, "scripts");
      if (fs.existsSync(scriptsSrc)) {
        const scriptsDest = path.join(dest, "scripts");
        fs.mkdirSync(scriptsDest, { recursive: true });
        for (const f of fs.readdirSync(scriptsSrc)) {
          const s = path.join(scriptsSrc, f);
          const d = path.join(scriptsDest, f);
          if (fs.statSync(s).isFile()) fs.copyFileSync(s, d);
        }
      }
      synced++;
    } catch (e) {
      errors.push(`${name}: ${e.message}`);
    }
  }
  return { destRoot, synced, missing, errors, total: curated.length };
}

function listSynced() {
  const dir = getToolboxSkillsDir();
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  return entries.map((name) => {
    const md = path.join(dir, name, "SKILL.md");
    let desc = "";
    try {
      const content = fs.readFileSync(md, "utf8");
      const m = content.match(/description:\s*(.+)/);
      if (m) desc = m[1].slice(0, 120).trim();
      else {
        // first line after frontmatter
        const lines = content.split("\n").slice(0, 20).join(" ");
        desc = lines.slice(0, 120);
      }
    } catch {}
    return { name, desc, path: md };
  });
}

module.exports = { syncCurated, listSynced, findSkillSource, getToolboxSkillsDir };
