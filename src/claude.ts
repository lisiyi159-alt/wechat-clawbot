import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";

const client = new Anthropic({ apiKey: config.anthropicApiKey });

/**
 * 按会话维护多轮对话历史。
 * key 通常是联系人 id 或群聊 id，使每个会话拥有独立上下文。
 */
const histories = new Map<string, Anthropic.MessageParam[]>();

function getHistory(conversationId: string): Anthropic.MessageParam[] {
  let history = histories.get(conversationId);
  if (!history) {
    history = [];
    histories.set(conversationId, history);
  }
  return history;
}

/** 截断历史，只保留最近 maxHistory 条，避免上下文无限增长。 */
function trim(history: Anthropic.MessageParam[]): void {
  const max = config.maxHistory;
  if (history.length > max) {
    history.splice(0, history.length - max);
  }
}

/** 清空某个会话的上下文（用于「重置/清空」类指令）。 */
export function resetConversation(conversationId: string): void {
  histories.delete(conversationId);
}

/**
 * 把用户消息送给 Claude，返回回复文本，并更新该会话的历史。
 */
export async function chat(conversationId: string, userText: string): Promise<string> {
  const history = getHistory(conversationId);
  history.push({ role: "user", content: userText });
  trim(history);

  const response = await client.messages.create({
    model: config.model,
    max_tokens: config.maxTokens,
    system: config.systemPrompt,
    messages: history,
  });

  const reply = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  const finalReply = reply || "（我暂时没有想到怎么回复～）";
  history.push({ role: "assistant", content: finalReply });
  trim(history);

  return finalReply;
}
