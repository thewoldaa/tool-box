const { spawn } = require("child_process");
const { FREE_FALLBACK_CHAIN } = require("./constants");

const RETRYABLE_PATTERNS = [
  /rate.?limit/i,
  /429/,
  /overloaded/i,
  /overload/i,
  /capacity/i,
  /quota/i,
  /503/,
  /502/,
  /timeout/i,
  /stall/i,
  /ECONNRESET/,
  /ETIMEDOUT/,
];

function isRetryable(stderr) {
  return RETRYABLE_PATTERNS.some((re) => re.test(stderr));
}

function findOpencodeBin() {
  // prefer global opencode, fallback to npx
  return "opencode";
}

function runWithFallback({ prompt, modelChain, extraArgs = [], cwd = process.cwd(), timeoutMs = 120000 }) {
  const chain = modelChain && modelChain.length ? modelChain : FREE_FALLBACK_CHAIN;
  let idx = 0;

  return new Promise((resolve, reject) => {
    const tryNext = () => {
      if (idx >= chain.length) {
        return reject(new Error(`All models in fallback chain failed (${chain.join(" -> ")})`));
      }
      const model = chain[idx++];
      const args = ["run", "-m", model, ...extraArgs];
      if (prompt) args.push(prompt);

      const opencode = findOpencodeBin();
      const child = spawn(opencode, args, { cwd, stdio: ["inherit", "pipe", "pipe"], shell: process.platform === "win32" });

      let stdout = "";
      let stderr = "";
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill();
      }, timeoutMs);

      child.stdout.on("data", (d) => {
        const s = d.toString();
        stdout += s;
        process.stdout.write(s);
      });
      child.stderr.on("data", (d) => {
        const s = d.toString();
        stderr += s;
        process.stderr.write(s);
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        if (timedOut) {
          console.error(`\n[tool-box] timeout on ${model}, trying fallback...`);
          return tryNext();
        }
        if (code === 0) {
          return resolve({ model, code, stdout, stderr });
        }
        if (isRetryable(stderr) && idx < chain.length) {
          console.error(`\n[tool-box] ${model} failed (code ${code}) — retryable, trying ${chain[idx]}...`);
          return tryNext();
        }
        if (isRetryable(stderr)) {
          return reject(new Error(`Retryable failure on ${model}: ${stderr.slice(0, 400)}`));
        }
        // non-retryable but still try fallback if we have models left and user wants fast fallback
        if (idx < chain.length) {
          console.error(`\n[tool-box] ${model} failed, falling back to ${chain[idx]}...`);
          return tryNext();
        }
        reject(new Error(`Model ${model} failed: ${stderr.slice(0, 600)}`));
      });

      child.on("error", (err) => {
        clearTimeout(timer);
        if (idx < chain.length) {
          console.error(`[tool-box] spawn error ${model}: ${err.message}, trying fallback`);
          return tryNext();
        }
        reject(err);
      });
    };
    tryNext();
  });
}

module.exports = { runWithFallback, isRetryable, FREE_FALLBACK_CHAIN };
