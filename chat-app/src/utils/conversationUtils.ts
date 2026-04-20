import type { ConversationEntry, ParsedMessage } from '../types/miaw'

// Agent-emitted side-channel marker. The Test_Drive_Redirect topic's final
// instruction tells the LLM to append this verbatim when the customer asks
// about test drives; we detect it here, strip it from rendered text, and
// surface a flag ChatApp watches to pop the TestDriveForm.
const OPEN_TEST_DRIVE_FORM_MARKER = /\[open:testDriveForm\]/gi

export function parseConversationMessage(entry: ConversationEntry): ParsedMessage | null {
  try {
    const conversationEntry = entry.conversationEntry
    const payload = JSON.parse(conversationEntry.entryPayload)
    const rawText =
      payload?.abstractMessage?.staticContent?.text ??
      payload?.abstractMessage?.text ??
      payload?.staticContent?.text ??
      payload?.text ??
      ''

    if (!rawText || typeof rawText !== 'string') {
      return null
    }

    const openTestDriveForm = OPEN_TEST_DRIVE_FORM_MARKER.test(rawText)
    const text = openTestDriveForm
      ? rawText.replace(OPEN_TEST_DRIVE_FORM_MARKER, '').replace(/\s+$/, '').trim()
      : rawText

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
      openTestDriveForm: openTestDriveForm || undefined,
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
