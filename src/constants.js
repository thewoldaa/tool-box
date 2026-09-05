const FREE_FALLBACK_CHAIN = [
  "opencode/muse-spark-1.3-contributor-free",
  "opencode/muse-spark-1.2-contributor-free",
  "opencode/nemotron-3.5-lightning-free",
  "opencode/nemotron-3-ultra-free",
  "opencode/big-pickle",
  "opencode/ling-3.0-flash-fin-free",
  "opencode/mimo-v2.5-free",
];

const OPTIONAL_CHAIN = [
  // appended only if provider available
  "kenari/deepseek-v4-flash:free",
  "kenari/glm-4-7-flash:free",
];

// 9Router loopback detection
const NINE_ROUTER_URL = "http://127.0.0.1:20128/v1";
const NINE_ROUTER_HEALTH = "http://127.0.0.1:20128/api/health";

const CURATED_SKILLS = [
  // software-development (priority)
  "code-review-and-quality",
  "security-and-hardening",
  "performance-optimization",
  "frontend-ui-engineering",
  "systematic-debugging",
  "test-driven-development",
  "plan",
  "codebase-inspection",
  "github-pr-workflow",
  "github-issue-to-pr",
  // research & writing
  "research-paper-writing",
  "grounded-citations",
  "long-form-report-generation",
  // productivity
  "docx",
  "pdf",
  "xlsx",
  "notion",
  "tui-widgets",
  // frontend
  "frontend-site-rehab",
  // creative
  "architecture-diagram",
  "humanizer",
  // hermes core
  "hermes-agent",
  "opencode",
  // from .agents/skills (8)
  "agent-browser",
  "ponytail",
  "design-taste-frontend",
  "frontend-design",
  "desktop-app-design",
  "stitch-design-taste",
  "minecraft-fabric-modding",
  "find-skills",
];

module.exports = { FREE_FALLBACK_CHAIN, OPTIONAL_CHAIN, NINE_ROUTER_URL, NINE_ROUTER_HEALTH, CURATED_SKILLS };
