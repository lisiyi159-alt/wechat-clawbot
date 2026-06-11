import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`缺少必需的环境变量 ${name}，请参考 .env.example 配置 .env 文件`);
  }
  return value;
}

function bool(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
}

function int(name: string, fallback: number): number {
  const value = process.env[name];
  if (value === undefined) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

// 选择大模型提供商：deepseek（国内，默认）或 claude（Anthropic）
const provider = (process.env.PROVIDER ?? "deepseek").toLowerCase();
if (provider !== "deepseek" && provider !== "claude") {
  throw new Error(`PROVIDER 只能是 deepseek 或 claude，当前为「${provider}」`);
}

export const config = {
  provider: provider as "deepseek" | "claude",

  // DeepSeek（仅当 PROVIDER=deepseek 时需要密钥）
  deepseekApiKey: provider === "deepseek" ? required("DEEPSEEK_API_KEY") : process.env.DEEPSEEK_API_KEY ?? "",
  deepseekModel: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
  deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",

  // Claude（仅当 PROVIDER=claude 时需要密钥）
  anthropicApiKey: provider === "claude" ? required("ANTHROPIC_API_KEY") : process.env.ANTHROPIC_API_KEY ?? "",
  claudeModel: process.env.CLAUDE_MODEL ?? "claude-opus-4-8",

  // 通用
  maxTokens: int("MAX_TOKENS", 1024),
  systemPrompt:
    process.env.SYSTEM_PROMPT ??
    "你是一个友好、简洁的微信聊天助手。回答尽量口语化、贴近微信聊天风格，不要长篇大论。",

  // Wechaty / 微信
  puppet: process.env.WECHATY_PUPPET ?? "wechaty-puppet-wechat",

  // 机器人行为
  replyPrivate: bool("REPLY_PRIVATE", true),
  groupReplyOnMentionOnly: bool("GROUP_REPLY_ON_MENTION_ONLY", true),
  maxHistory: int("MAX_HISTORY", 20),
};

export type Config = typeof config;
