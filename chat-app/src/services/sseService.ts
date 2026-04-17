import { EventSourcePolyfill } from 'event-source-polyfill'
import type { ConversationEntry, SSEEventHandlers } from '../types/miaw'
import { SSE_EVENTS, SSE_HEARTBEAT_TIMEOUT_MS, SSE_MAX_RECONNECT_ATTEMPTS, SSE_INITIAL_RECONNECT_DELAY_MS, SSE_MAX_RECONNECT_DELAY_MS, SSE_RECONNECT_BACKOFF_MULTIPLIER } from '../utils/constants'

interface SSEConnection {
  close: () => void
}

export function subscribeToSSE(
  messagingUrl: string,
  accessToken: string,
  orgId: string,
  _conversationId: string,
  _channelPlatformKey: string,
  lastEventId: string,
  handlers: SSEEventHandlers
): SSEConnection {
  let es: EventSourcePolyfill | null = null
  let reconnectAttempts = 0
  let reconnectDelay = SSE_INITIAL_RECONNECT_DELAY_MS
  let currentLastEventId = lastEventId
  let closed = false
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  function connect() {
    if (closed) return

    const url = `${messagingUrl}/eventrouter/v1/sse?_ts=${Date.now()}`

    es = new EventSourcePolyfill(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Org-ID': orgId,
        'Last-Event-ID': currentLastEventId,
      },
      heartbeatTimeout: SSE_HEARTBEAT_TIMEOUT_MS,
    })

    es.onopen = () => {
      reconnectAttempts = 0
      reconnectDelay = SSE_INITIAL_RECONNECT_DELAY_MS
      console.log('[SSE] Connection opened')
    }

    const handleEvent = (msgEvent: MessageEvent) => {
      try {
        currentLastEventId = msgEvent.lastEventId || currentLastEventId
        const entry: ConversationEntry = JSON.parse(msgEvent.data)
        const entryType = entry.conversationEntry?.entryType
        const payload = parseEntryPayload(entry.conversationEntry?.entryPayload)
        const payloadEntryType = (payload?.entryType ?? payload?.type) as string | undefined
        const eventName = msgEvent.type

        console.log(
          '[SSE] event received | eventName:',
          eventName,
          '| entryType:',
          entryType,
          '| payloadEntryType:',
          payloadEntryType,
          '| data:',
          msgEvent.data.slice(0, 300)
        )

        if (
          eventName === 'message' &&
          entryType === undefined &&
          payloadEntryType === undefined
        ) {
          console.log('[SSE] heartbeat/keepalive message ignored')
          return
        }

        if (
          eventName === SSE_EVENTS.CONVERSATION_MESSAGE ||
          entryType === 'Message' ||
          payloadEntryType === 'Message'
        ) {
          console.log('[SSE] -> onMessage')
          handlers.onMessage(entry)
        } else if (
          eventName === SSE_EVENTS.CONVERSATION_TYPING_STARTED_INDICATOR ||
          entryType === 'TypingStartedIndicator' ||
          payloadEntryType === 'TypingStartedIndicator' ||
          payloadEntryType === SSE_EVENTS.CONVERSATION_TYPING_STARTED_INDICATOR
        ) {
          console.log('[SSE] -> onTypingStarted')
          handlers.onTypingStarted(entry)
        } else if (
          eventName === SSE_EVENTS.CONVERSATION_TYPING_STOPPED_INDICATOR ||
          entryType === 'TypingStoppedIndicator' ||
          payloadEntryType === 'TypingStoppedIndicator' ||
          payloadEntryType === SSE_EVENTS.CONVERSATION_TYPING_STOPPED_INDICATOR
        ) {
          console.log('[SSE] -> onTypingStopped')
          handlers.onTypingStopped(entry)
        } else if (
          eventName === SSE_EVENTS.CONVERSATION_DELIVERY_ACKNOWLEDGEMENT ||
          entryType === 'DeliveryAcknowledgement' ||
          payloadEntryType === 'DeliveryAcknowledgement' ||
          payloadEntryType === SSE_EVENTS.CONVERSATION_DELIVERY_ACKNOWLEDGEMENT
        ) {
          console.log('[SSE] -> onDelivery')
          handlers.onDelivery(entry)
        } else if (
          eventName === SSE_EVENTS.CONVERSATION_READ_ACKNOWLEDGEMENT ||
          entryType === 'ReadAcknowledgement' ||
          payloadEntryType === 'ReadAcknowledgement' ||
          payloadEntryType === SSE_EVENTS.CONVERSATION_READ_ACKNOWLEDGEMENT
        ) {
          console.log('[SSE] -> onRead')
          handlers.onRead(entry)
        } else if (
          eventName === SSE_EVENTS.CONVERSATION_PARTICIPANT_CHANGED ||
          entryType === 'ParticipantChanged' ||
          payloadEntryType === 'ParticipantChanged' ||
          payloadEntryType === SSE_EVENTS.CONVERSATION_PARTICIPANT_CHANGED
        ) {
          console.log('[SSE] -> onParticipantChanged')
          handlers.onParticipantChanged(entry)
        } else if (
          eventName === SSE_EVENTS.CONVERSATION_ROUTING_RESULT ||
          entryType === 'RoutingResult' ||
          payloadEntryType === 'RoutingResult' ||
          payloadEntryType === SSE_EVENTS.CONVERSATION_ROUTING_RESULT
        ) {
          console.log('[SSE] -> onRoutingResult')
          handlers.onRoutingResult(entry)
        } else if (
          eventName === SSE_EVENTS.CONVERSATION_SESSION_STATUS_CHANGED ||
          entryType === 'SessionStatusChanged' ||
          payloadEntryType === 'SessionStatusChanged' ||
          payloadEntryType === SSE_EVENTS.CONVERSATION_SESSION_STATUS_CHANGED
        ) {
          console.log('[SSE] -> onSessionStatusChanged')
          handlers.onSessionStatusChanged(entry)
        } else if (
          eventName === SSE_EVENTS.CONVERSATION_CLOSE_CONVERSATION ||
          entryType === 'CloseConversation' ||
          payloadEntryType === 'CloseConversation' ||
          payloadEntryType === SSE_EVENTS.CONVERSATION_CLOSE_CONVERSATION
        ) {
          console.log('[SSE] -> onConversationClosed')
          handlers.onConversationClosed(entry)
        } else {
          console.warn('[SSE] unhandled event | entryType:', entryType, '| payloadEntryType:', payloadEntryType, '| full data:', msgEvent.data)
        }
      } catch (e) {
        console.error('[SSE] parse error', e, 'raw data:', msgEvent.data?.slice(0, 300))
      }
    }

    const listenToEvent = (eventName: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      es?.addEventListener(eventName, (event: any) => {
        handleEvent(event as MessageEvent)
      })
    }

    listenToEvent('message')
    Object.values(SSE_EVENTS).forEach(listenToEvent)

    es.onerror = () => {
      console.error('[SSE] connection error | attempt:', reconnectAttempts + 1, '/', SSE_MAX_RECONNECT_ATTEMPTS)
      es?.close()
      es = null
      if (closed) return
      if (reconnectAttempts >= SSE_MAX_RECONNECT_ATTEMPTS) {
        handlers.onError?.(new Error('SSE max reconnect attempts exceeded'))
        return
      }
      reconnectAttempts++
      reconnectTimer = setTimeout(() => {
        reconnectDelay = Math.min(reconnectDelay * SSE_RECONNECT_BACKOFF_MULTIPLIER, SSE_MAX_RECONNECT_DELAY_MS)
        console.log('[SSE] reconnecting in', reconnectDelay, 'ms...')
        connect()
      }, reconnectDelay)
    }
  }

  connect()

  return {
    close() {
      closed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      es?.close()
      es = null
    },
  }
}

function parseEntryPayload(payload: string | undefined): Record<string, unknown> | null {
  if (!payload) return null
  try {
    return JSON.parse(payload)
  } catch {
    return null
  }
}
