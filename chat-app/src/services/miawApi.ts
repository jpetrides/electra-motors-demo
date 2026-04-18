import type { AccessTokenResponse, ConversationEntry } from '../types/miaw'
import { API_VERSION, CAPABILITIES_VERSION, PLATFORM } from '../utils/constants'

function baseUrl(messagingUrl: string) {
  return `${messagingUrl}/iamessage/api/${API_VERSION}`
}

async function apiFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, options)
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw Object.assign(new Error(`HTTP ${res.status}: ${text}`), { status: res.status })
  }
  const text = await res.text()
  if (!text) return null
  return JSON.parse(text)
}

export async function getUnauthenticatedAccessToken(
  messagingUrl: string,
  orgId: string,
  esDeveloperName: string
): Promise<AccessTokenResponse> {
  return apiFetch(`${baseUrl(messagingUrl)}/authorization/unauthenticated/access-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orgId,
      esDeveloperName,
      capabilitiesVersion: CAPABILITIES_VERSION,
      platform: PLATFORM,
    }),
  })
}

export async function createConversation(
  messagingUrl: string,
  accessToken: string,
  conversationId: string,
  esDeveloperName: string,
  routingAttributes?: Record<string, string>
): Promise<void> {
  await apiFetch(`${baseUrl(messagingUrl)}/conversation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      esDeveloperName,
      conversationId,
      ...(routingAttributes ? { routingAttributes } : {}),
    }),
  })
}

export async function sendTextMessage(
  messagingUrl: string,
  accessToken: string,
  conversationId: string,
  esDeveloperName: string,
  text: string,
  messageId: string,
  isNewMessagingSession = false
): Promise<void> {
  await apiFetch(`${baseUrl(messagingUrl)}/conversation/${conversationId}/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      message: {
        id: messageId,
        messageType: 'StaticContentMessage',
        staticContent: { formatType: 'Text', text },
      },
      esDeveloperName,
      isNewMessagingSession,
    }),
  })
}

export async function sendTypingIndicator(
  messagingUrl: string,
  accessToken: string,
  conversationId: string,
  type: 'TypingStartedIndicator' | 'TypingStoppedIndicator'
): Promise<void> {
  await apiFetch(`${baseUrl(messagingUrl)}/conversation/${conversationId}/entry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ entryType: type, id: crypto.randomUUID() }),
  })
}

export async function closeConversation(
  messagingUrl: string,
  accessToken: string,
  conversationId: string,
  esDeveloperName: string
): Promise<void> {
  await apiFetch(
    `${baseUrl(messagingUrl)}/conversation/${conversationId}?esDeveloperName=${encodeURIComponent(esDeveloperName)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )
}

export async function listConversationEntries(
  messagingUrl: string,
  accessToken: string,
  conversationId: string
): Promise<ConversationEntry[]> {
  const data = await apiFetch(
    `${baseUrl(messagingUrl)}/conversation/${conversationId}/entries?limit=100&entryTypeFilter=Message,ParticipantChanged,RoutingResult,SessionStatusChanged`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )
  return data?.conversationEntries ?? []
}
