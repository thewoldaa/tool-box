const fs = require("fs");
const path = require("path");
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
if (!pkg.name.includes("thewoldaa")) {
  console.error("Package name must be @thewoldaa/tool-box (alias craftkal tetap support via bin)");
  process.exit(1);
}
console.log(`[tool-box] prepublish check ok for ${pkg.name}@${pkg.version}`);
