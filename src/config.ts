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

export const config = {
  anthropicApiKey: required("ANTHROPIC_API_KEY"),
  model: process.env.CLAUDE_MODEL ?? "claude-opus-4-8",
  maxTokens: int("CLAUDE_MAX_TOKENS", 1024),
  systemPrompt:
    process.env.SYSTEM_PROMPT ??
    "你是一个友好、简洁的微信聊天助手。回答尽量口语化、贴近微信聊天风格，不要长篇大论。",
  puppet: process.env.WECHATY_PUPPET ?? "wechaty-puppet-wechat",
  replyPrivate: bool("REPLY_PRIVATE", true),
  groupReplyOnMentionOnly: bool("GROUP_REPLY_ON_MENTION_ONLY", true),
  maxHistory: int("MAX_HISTORY", 20),
};

export type Config = typeof config;
