# wechat-clawbot

接入**个人微信**的 AI 聊天机器人：用 [Wechaty](https://wechaty.js.org/) 登录微信号，收到消息后调用大模型生成智能回复，支持多轮上下文。

支持两种大模型，通过配置一键切换：

- **DeepSeek**（默认，国内）— 手机号注册、支付宝充值、有免费额度
- **Claude**（Anthropic）— 需要境外信用卡

## 功能

- 扫码登录个人微信号（网页协议）
- 私聊自动回复，群聊默认仅在被 `@` 时回复
- 每个会话独立维护多轮对话上下文
- 内置指令：发送 `/reset`、`清空记忆` 或 `重置对话` 可清空该会话上下文
- 一个配置项 `PROVIDER` 即可在 DeepSeek / Claude 之间切换

## 技术栈

| 部分 | 选型 |
| --- | --- |
| 运行时 | Node.js ≥ 20 + TypeScript |
| 微信接入 | Wechaty + `wechaty-puppet-wechat`（网页协议，免费） |
| 大模型 | DeepSeek（默认）或 Claude，可切换 |

## 快速开始

1. 安装依赖：

   ```bash
   npm install
   ```

2. 配置环境变量：

   ```bash
   cp .env.example .env
   # Windows 用 copy .env.example .env
   ```

   编辑 `.env`：默认用 DeepSeek，只需填 `DEEPSEEK_API_KEY`
   （在 https://platform.deepseek.com 注册后于「API Keys」创建）。

3. 启动：

   ```bash
   npm run dev      # 开发模式（文件改动自动重启）
   # 或
   npm start
   ```

4. 用要作为机器人的微信扫描终端里打印的二维码登录。登录成功后，给这个号发消息即可收到 AI 回复。

## 配置项（.env）

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `PROVIDER` | 使用哪个大模型：`deepseek` 或 `claude` | `deepseek` |
| `DEEPSEEK_API_KEY` | DeepSeek 密钥（`PROVIDER=deepseek` 时必填） | — |
| `DEEPSEEK_MODEL` | DeepSeek 模型 | `deepseek-chat` |
| `ANTHROPIC_API_KEY` | Claude 密钥（`PROVIDER=claude` 时必填） | — |
| `CLAUDE_MODEL` | Claude 模型 | `claude-opus-4-8` |
| `MAX_TOKENS` | 单条回复最大 token | `1024` |
| `SYSTEM_PROMPT` | 机器人人设/系统提示词 | 见 `.env.example` |
| `REPLY_PRIVATE` | 是否回复私聊 | `true` |
| `GROUP_REPLY_ON_MENTION_ONLY` | 群聊是否仅在被 @ 时回复 | `true` |
| `MAX_HISTORY` | 每个会话保留的历史消息条数 | `20` |

### 切换到 Claude

把 `.env` 里的 `PROVIDER` 改成 `claude` 并填好 `ANTHROPIC_API_KEY` 即可，代码无需改动。

## 重要提示

- **个人微信接入为非官方协议，存在被微信限制或封号的风险**，建议使用小号、控制消息频率，切勿用于营销/骚扰等违规用途。
- 网页版微信协议（`wechaty-puppet-wechat`）近年稳定性较差，部分账号可能无法登录。若遇到登录问题，可考虑接入 [Wechaty 的付费 puppet](https://wechaty.js.org/docs/puppet-providers/)（如 PadLocal），只需安装对应 puppet 并修改 `.env` 里的 `WECHATY_PUPPET`，业务代码无需改动。
- `.env` 与 `.wechaty/` 登录缓存包含敏感信息，已在 `.gitignore` 中忽略，请勿提交到仓库。

## 项目结构

```
src/
  config.ts   读取 .env 配置、选择提供商
  llm.ts      大模型调用（DeepSeek / Claude）+ 多轮上下文管理
  index.ts    Wechaty 入口：登录、收发消息、调度
```
