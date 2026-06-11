import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { config } from "./config.js";

/** 提供商无关的对话消息格式（Claude 和 DeepSeek/OpenAI 通用）。 */
type Message = { role: "user" | "assistant"; content: string };

/**
 * 按会话维护多轮对话历史。
 * key 通常是联系人 id 或群聊 id，使每个会话拥有独立上下文。
 */
const histories = new Map<string, Message[]>();

function getHistory(conversationId: string): Message[] {
  let history = histories.get(conversationId);
  if (!history) {
    history = [];
    histories.set(conversationId, history);
  }
  return history;
}

/** 截断历史，只保留最近 maxHistory 条，避免上下文无限增长。 */
function trim(history: Message[]): void {
  const max = config.maxHistory;
  if (history.length > max) {
    history.splice(0, history.length - max);
  }
}

/** 清空某个会话的上下文（用于「重置/清空」类指令）。 */
export function resetConversation(conversationId: string): void {
  histories.delete(conversationId);
}

// 按需初始化对应提供商的客户端，避免要求填两边的密钥。
let deepseekClient: OpenAI | null = null;
let claudeClient: Anthropic | null = null;

function getDeepseek(): OpenAI {
  if (!deepseekClient) {
    deepseekClient = new OpenAI({
      apiKey: config.deepseekApiKey,
      baseURL: config.deepseekBaseUrl,
    });
  }
  return deepseekClient;
}

function getClaude(): Anthropic {
  if (!claudeClient) {
    claudeClient = new Anthropic({ apiKey: config.anthropicApiKey });
  }
  return claudeClient;
}

async function callDeepseek(history: Message[]): Promise<string> {
  const response = await getDeepseek().chat.completions.create({
    model: config.deepseekModel,
    max_tokens: config.maxTokens,
    messages: [{ role: "system", content: config.systemPrompt }, ...history],
  });
  return response.choices[0]?.message?.content?.trim() ?? "";
}

async function callClaude(history: Message[]): Promise<string> {
  const response = await getClaude().messages.create({
    model: config.claudeModel,
    max_tokens: config.maxTokens,
    system: config.systemPrompt,
    messages: history,
  });
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

/**
 * 把用户消息送给所选大模型，返回回复文本，并更新该会话的历史。
 */
export async function chat(conversationId: string, userText: string): Promise<string> {
  const history = getHistory(conversationId);
  history.push({ role: "user", content: userText });
  trim(history);

  const reply = config.provider === "claude" ? await callClaude(history) : await callDeepseek(history);

  const finalReply = reply || "（我暂时没有想到怎么回复～）";
  history.push({ role: "assistant", content: finalReply });
  trim(history);

  return finalReply;
}
