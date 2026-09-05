# @craftkal/tool-box

Instant agentic AI CLI — wraps **opencode** with free model fallback + curated Hermes skills. No API key required. Startup instan, fallback otomatis.

> `craftkal-tool` — panggil langsung dari terminal, seperti `opencode` tapi dengan fallback chain + skills.

## Install

```bash
npm i -g @craftkal/tool-box
# atau via opencode plugin
opencode plugin add @craftkal/tool-box
```

Requires `opencode` (auto-checked on postinstall):

```bash
npm i -g opencode-ai@latest
```

## Usage

```bash
craftkal-tool "buat landing page modern dengan tailwind"
craftkal-tool run "refactor src/auth.ts" -- --agent toolbox

craftkal-tool serve          # TUI instant
craftkal-tool web            # web UI
craftkal-tool models         # list fallback chain
craftkal-tool doctor         # diagnose opencode + 9router + skills
craftkal-tool skills list
craftkal-tool skills sync --force
craftkal-tool config show
```

**Fallback chain (free, no key):**

1. `opencode/muse-spark-1.3-contributor-free` (primary)
2. `opencode/muse-spark-1.2-contributor-free`
3. `opencode/nemotron-3.5-lightning-free`
4. `opencode/nemotron-3-ultra-free`
5. `opencode/big-pickle`
6. `opencode/ling-3.0-flash-fin-free`
7. `opencode/mimo-v2.5-free`

Jika `9Router` alive di `127.0.0.1:20128`, otomatis reuse provider `9router` (seperti packet 9router `app/custom-server.js` + `318.js` pattern) untuk model `kr/*` tambahan.

Override primary:

```bash
TOOLBOX_MODEL=opencode/big-pickle craftkal-tool "hello"
```

## Skills (25-30 curated)

Disync dari Hermes (`C:\Users\craftkal\AppData\Local\hermes\skills`) + `.agents/skills` ke `~/.config/tool-box/skills`:

`code-review-and-quality`, `security-and-hardening`, `performance-optimization`, `frontend-ui-engineering`, `systematic-debugging`, `test-driven-development`, `plan`, `codebase-inspection`, `github-pr-workflow`, `docx`, `pdf`, `xlsx`, `notion`, `agent-browser`, `ponytail`, `design-taste-frontend`, `stitch-design-taste`, `desktop-app-design` …

```bash
craftkal-tool skills sync
craftkal-tool skills list
```

## Config

`~/.config/tool-box/opencode.json` (derivative of `~/.config/opencode/opencode.json`):

```json
{
  "model": "opencode/muse-spark-1.3-contributor-free",
  "agent": {
    "toolbox": {
      "fallback_models": [{ "model": "..." }]
    }
  }
}
```

Reset:

```bash
craftkal-tool config reset
craftkal-tool config path
```

## How it wraps opencode (packet)

Mirip 9Router: thin launcher `bin/craftkal-tool.js` → probe `127.0.0.1:20128` → generate config → `spawn("opencode", ["run", "-m", model, prompt])` → pada `429/overloaded/503` retry next model di `src/fallback.js` (stall timeout 120s, retryable regex). Tidak perlu Next server — cukup fallback chain di CLI.

- `src/config.js` — build `opencode.json` dengan fallback_models ala `oh-my-openagent.json`
- `src/fallback.js` — spawn + retry (ala `318.js` provider engine)
- `src/skills/sync.js` — curated sync ala `hermes-agent/tools/skills_sync.py` + `skills_tool.py` Tier1/Tier2

## License

MIT — derivative of `opencode-ai` (MIT). See `LICENSE`. Upstream: `sst/opencode`, `9Router`, Hermes.

## Publish

```bash
npm login
npm publish --access public
gh repo create craftkal/tool-box --public --source=. --remote=origin --push
```
