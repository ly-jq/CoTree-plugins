import { object, string, type ChannelConfig } from "./config.js";
import type { Message } from "./types.js";

export function authorized(message: Message, config: ChannelConfig): boolean {
  return message.accountId === config.appId && config.allowUsers.includes(message.userId)
    && (!config.allowChats.length || config.allowChats.includes(message.chatId));
}
export function feishuMessage(value: unknown, config: ChannelConfig): Message | undefined {
  try {
    const root = object(value), event = object(root.event ?? root);
    const sender = object(event.sender), message = object(event.message);
    if (sender.sender_type !== "user" || message.message_type !== "text" || !["p2p", "group"].includes(String(message.chat_type))) return;
    const userId = string(object(sender.sender_id).open_id, "sender");
    const mentions = Array.isArray(message.mentions) ? message.mentions : [];
    const botMentions = mentions.map(object).filter(mention => config.botOpenId && object(mention.id).open_id === config.botOpenId);
    if (message.chat_type === "group" && config.requireMention && !botMentions.length) return;
    let text = string(object(JSON.parse(string(message.content, "content", 65536))).text, "text", 32000);
    for (const mention of botMentions) if (typeof mention.key === "string") text = text.split(mention.key).join("");
    if (!text.trim()) return;
    const threadId = message.thread_id ?? message.root_id;
    const normalized: Message = { platform: "feishu", accountId: config.appId,
      messageId: string(message.message_id, "messageId"), chatId: string(message.chat_id, "chatId"), userId,
      text: text.trim(), kind: message.chat_type === "group" ? "group" : "direct",
      ...(typeof threadId === "string" && threadId ? { threadId } : {}) };
    return authorized(normalized, config) ? normalized : undefined;
  } catch { return; }
}
export function dingtalkMessage(value: unknown, config: ChannelConfig): Message | undefined {
  try {
    const raw = object(value);
    if (raw.msgtype !== "text" || (raw.conversationType !== "1" && raw.conversationType !== "2")) return;
    if (raw.senderCorpId !== raw.chatbotCorpId || typeof raw.senderCorpId !== "string") return;
    if (raw.conversationType === "2" && config.requireMention && raw.isInAtList !== true) return;
    if (raw.robotCode !== (config.robotCode ?? config.appId)) return;
    const normalized: Message = { platform: "dingtalk", accountId: config.appId,
      messageId: string(raw.msgId, "msgId"), chatId: string(raw.conversationId, "conversationId"), userId: string(raw.senderStaffId, "senderStaffId"),
      kind: raw.conversationType === "1" ? "direct" : "group", text: string(object(raw.text).content, "text", 32000).trim() };
    return authorized(normalized, config) ? normalized : undefined;
  } catch { return; }
}
