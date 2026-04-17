import type { ConversationEntry, ParsedMessage } from '../types/miaw'

export function parseConversationMessage(entry: ConversationEntry): ParsedMessage | null {
  try {
    const conversationEntry = entry.conversationEntry
    const payload = JSON.parse(conversationEntry.entryPayload)
    const text =
      payload?.abstractMessage?.staticContent?.text ??
      payload?.abstractMessage?.text ??
      payload?.staticContent?.text ??
      payload?.text ??
      ''

    if (!text || typeof text !== 'string') {
      return null
    }

    return {
      id: conversationEntry.identifier,
      conversationId: entry.conversationId,
      text,
      senderRole: conversationEntry.sender.role,
      senderName: conversationEntry.senderDisplayName || conversationEntry.sender.role,
      timestamp: conversationEntry.transcriptedTimestamp,
      isSent: conversationEntry.sender.role === 'EndUser',
      isDelivered: false,
      isRead: false,
    }
  } catch {
    return null
  }
}

/** Most recent Agent or Chatbot message wins (e.g. after transfer). */
export function resolveAgentDisplayName(messages: ParsedMessage[]): string | null {
  let best: ParsedMessage | null = null
  for (const m of messages) {
    if (m.senderRole === 'Agent' || m.senderRole === 'Chatbot') {
      if (!best || m.timestamp >= best.timestamp) {
        best = m
      }
    }
  }
  return best?.senderName ?? null
}

export function mergeParsedMessages(
  existingMessages: ParsedMessage[],
  incomingMessages: ParsedMessage[]
): ParsedMessage[] {
  const messageMap = new Map(existingMessages.map(message => [message.id, message]))

  for (const message of incomingMessages) {
    const existing = messageMap.get(message.id)
    messageMap.set(message.id, existing ? { ...existing, ...message } : message)
  }

  return Array.from(messageMap.values()).sort((a, b) => a.timestamp - b.timestamp)
}
