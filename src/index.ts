import { exec } from "node:child_process";
import { WechatyBuilder, type Message, type PuppetModuleName, ScanStatus, log } from "wechaty";
import qrcodeTerminal from "qrcode-terminal";
import { config } from "./config.js";
import { chat, resetConversation } from "./llm.js";

const bot = WechatyBuilder.build({
  name: "wechat-clawbot",
  puppet: config.puppet as PuppetModuleName,
});

/** 用系统默认浏览器打开链接（跨平台），方便直接扫描二维码。 */
function openInBrowser(url: string): void {
  const platform = process.platform;
  const command =
    platform === "win32" ? `start "" "${url}"` : platform === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;
  exec(command, { windowsHide: true }, () => {
    /* 打开失败也无所谓，终端里仍打印了链接 */
  });
}

let lastQrcode = "";

bot.on("scan", (qrcode, status) => {
  if (status === ScanStatus.Waiting || status === ScanStatus.Timeout) {
    qrcodeTerminal.generate(qrcode, { small: true });
    const url = `https://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`;
    log.info("Bot", "请用微信扫描二维码登录。已自动在浏览器打开，若没弹出可手动访问：%s", url);
    // 每出现一个新二维码就自动在浏览器打开，无需手动复制链接
    if (qrcode !== lastQrcode) {
      lastQrcode = qrcode;
      openInBrowser(url);
    }
  } else {
    log.info("Bot", "扫码状态：%s", ScanStatus[status]);
  }
});

bot.on("login", (user) => {
  log.info("Bot", "✅ 登录成功：%s", user.name());
});

bot.on("logout", (user) => {
  log.info("Bot", "已登出：%s", user.name());
});

bot.on("error", (e) => {
  log.error("Bot", "运行出错：%s", (e as Error).message);
});

bot.on("message", async (message: Message) => {
  try {
    await handleMessage(message);
  } catch (err) {
    log.error("Bot", "处理消息失败：%s", (err as Error).message);
  }
});

const BOT_PREFIX = "🤖 ";

async function handleMessage(message: Message): Promise<void> {
  // 只处理文本消息
  if (message.type() !== bot.Message.Type.Text) return;

  const text = message.text().trim();
  if (!text) return;

  // 自己发的消息：仅当发给「文件传输助手」时作为测试会话回复，其余忽略
  if (message.self()) {
    const listener = message.listener();
    if (!listener || listener.id !== "filehelper") return;
    // 忽略机器人自己发出的回复（带 🤖 前缀），避免自我循环
    if (text.startsWith(BOT_PREFIX.trim())) return;

    const conversationId = "self:filehelper";
    if (await handleCommand(conversationId, text, (reply) => listener.say(BOT_PREFIX + reply))) return;

    log.info("Bot", "文件传输助手(测试) : %s", text);
    const reply = await chat(conversationId, text);
    await listener.say(BOT_PREFIX + reply);
    return;
  }

  const room = message.room();
  const talker = message.talker();

  // 群聊：默认只在被 @ 时回复
  if (room) {
    if (config.groupReplyOnMentionOnly) {
      const mentioned = await message.mentionSelf();
      if (!mentioned) return;
    }
    const cleanText = await stripMention(message, text);
    if (!cleanText) return;

    const conversationId = `room:${room.id}:${talker.id}`;
    if (await handleCommand(conversationId, cleanText, (reply) => message.say(reply))) return;

    log.info("Bot", "群聊[%s] %s: %s", await room.topic(), talker.name(), cleanText);
    const reply = await chat(conversationId, cleanText);
    // 在群里回复时 @ 提问者
    await message.say(reply);
    return;
  }

  // 私聊
  if (!config.replyPrivate) return;

  const conversationId = `contact:${talker.id}`;
  if (await handleCommand(conversationId, text, (reply) => message.say(reply))) return;

  log.info("Bot", "私聊 %s: %s", talker.name(), text);
  const reply = await chat(conversationId, text);
  await message.say(reply);
}

/** 去掉群聊消息里 @机器人 的部分，得到真正的提问内容。 */
async function stripMention(message: Message, text: string): Promise<string> {
  const self = message.wechaty.currentUser;
  const name = self.name();
  // 微信 @ 文本形如 "@机器人 你好"，@ 名后通常带一个特殊空格
  return text
    .replace(new RegExp(`@${name}[\\u2005\\s]?`, "g"), "")
    .trim();
}

/** 处理「/reset」「清空记忆」等指令，返回 true 表示已处理、无需再走对话。 */
async function handleCommand(
  conversationId: string,
  text: string,
  say: (reply: string) => Promise<unknown>,
): Promise<boolean> {
  const normalized = text.toLowerCase();
  if (normalized === "/reset" || text === "清空记忆" || text === "重置对话") {
    resetConversation(conversationId);
    await say("已清空本会话的对话记忆，我们重新开始吧～");
    return true;
  }
  return false;
}

async function main(): Promise<void> {
  const model = config.provider === "claude" ? config.claudeModel : config.deepseekModel;
  log.info("Bot", "启动中… 提供商：%s，模型：%s，puppet：%s", config.provider, model, config.puppet);
  await bot.start();
  log.info("Bot", "已启动，等待扫码登录。");
}

main().catch((err) => {
  log.error("Bot", "启动失败：%s", (err as Error).message);
  process.exit(1);
});
