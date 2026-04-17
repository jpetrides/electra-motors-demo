import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { getUnauthenticatedAccessToken, createConversation, sendTextMessage, closeConversation, listConversationEntries } from '../services/miawApi'
import { subscribeToSSE } from '../services/sseService'
import type { MIAWConfig, ParsedMessage, ConversationEntry, DeploymentConfig, PreChatField, SessionStatusChange } from '../types/miaw'
import { mergeParsedMessages, parseConversationMessage, resolveAgentDisplayName } from '../utils/conversationUtils'

export type ConversationStatus = 'idle' | 'connecting' | 'prechat' | 'active' | 'ended' | 'error'

function extractOrgIdFromJwt(accessToken: string, fallback: string): string {
  try {
    const payload = accessToken.split('.')[1]
    const decoded = JSON.parse(atob(payload))
    return decoded.orgId ?? fallback
  } catch {
    return fallback
  }
}

interface ConversationState {
  status: ConversationStatus
  messages: ParsedMessage[]
  isAgentTyping: boolean
  error: string | null
  deploymentConfig: DeploymentConfig | null
  prechatFields: PreChatField[]
  accessToken: string | null
  conversationId: string | null
}

export function useConversation(config: MIAWConfig | null) {
  const [state, setState] = useState<ConversationState>({
    status: 'idle',
    messages: [],
    isAgentTyping: false,
    error: null,
    deploymentConfig: null,
    prechatFields: [],
    accessToken: null,
    conversationId: null,
  })

  const accessTokenRef = useRef<string | null>(null)
  const conversationIdRef = useRef<string | null>(null)
  const sseRef = useRef<{ close: () => void } | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const historySyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstMessageRef = useRef(true)

  const addMessage = useCallback((msg: ParsedMessage) => {
    setState(s => ({
      ...s,
      messages: mergeParsedMessages(s.messages, [msg]),
    }))
  }, [])

  const mergeConversationEntries = useCallback((entries: ConversationEntry[]) => {
    const parsedMessages = entries
      .map(parseConversationMessage)
      .filter((message): message is ParsedMessage => message !== null)

    if (parsedMessages.length === 0) return

    setState(s => ({
      ...s,
      messages: mergeParsedMessages(s.messages, parsedMessages),
    }))
  }, [])

  const parseMessageEntry = useCallback((entry: ConversationEntry): ParsedMessage | null => {
    const parsed = parseConversationMessage(entry)
    if (!parsed) {
      console.warn('[MSG] parseMessageEntry returned null | raw entryPayload:', entry.conversationEntry?.entryPayload?.slice(0, 300))
      return null
    }

    console.log('[MSG] parseMessageEntry: extracted text:', parsed.text.slice(0, 100), '| role:', parsed.senderRole)
    return parsed
  }, [])

  const syncConversationEntries = useCallback(async (reason: string) => {
    if (!config || !accessTokenRef.current || !conversationIdRef.current) return

    try {
      console.log('[SYNC] Fetching conversation entries | reason:', reason)
      const entries = await listConversationEntries(
        config.messagingUrl,
        accessTokenRef.current,
        conversationIdRef.current
      )
      console.log('[SYNC] Received conversation entries:', entries.length)
      mergeConversationEntries(entries)
    } catch (err) {
      console.error('[SYNC] Failed to fetch conversation entries | reason:', reason, err)
    }
  }, [config, mergeConversationEntries])

  const scheduleHistorySync = useCallback((delayMs: number, reason: string) => {
    if (historySyncTimerRef.current) clearTimeout(historySyncTimerRef.current)
    historySyncTimerRef.current = setTimeout(() => {
      void syncConversationEntries(reason)
    }, delayMs)
  }, [syncConversationEntries])

  const updateStatusFromSessionEvent = useCallback((entry: ConversationEntry) => {
    try {
      const payload = JSON.parse(entry.conversationEntry.entryPayload) as SessionStatusChange
      const rawStatus = payload.sessionStatus ?? payload.status ?? payload.messagingSessionStatus
      const normalized = rawStatus?.toLowerCase()

      console.log('[SESSION] status event:', rawStatus)

      if (normalized === 'ended' || normalized === 'inactive') {
        setState(s => ({ ...s, status: 'ended' }))
      } else if (normalized === 'active' || normalized === 'waiting' || normalized === 'new') {
        setState(s => ({ ...s, status: 'active' }))
      }
    } catch (err) {
      console.warn('[SESSION] Unable to parse session status payload', err)
    }
  }, [])

  const startConversation = useCallback(async (routingAttributes?: Record<string, string>) => {
    if (!config) return
    setState(s => ({ ...s, status: 'connecting', error: null, messages: [] }))

    try {
      const tokenRes = await getUnauthenticatedAccessToken(
        config.messagingUrl,
        config.orgId,
        config.esDeveloperName
      )

      const deploymentConfig = tokenRes.context?.configuration?.embeddedServiceConfig ?? null
      const allPrechatFields = deploymentConfig?.prechatFields ?? []
      const visibleFields = allPrechatFields.filter(field => !field.isHidden)

      const hiddenDefaults: Record<string, string> = {}
      allPrechatFields
        .filter(field => field.isHidden && field.value)
        .forEach(field => {
          hiddenDefaults[field.name] = field.value!
        })

      if (visibleFields.length > 0 && !routingAttributes) {
        setState(s => ({ ...s, status: 'prechat', deploymentConfig, prechatFields: visibleFields }))
        return
      }

      accessTokenRef.current = tokenRes.accessToken

      const mergedAttributes = { ...hiddenDefaults, ...routingAttributes }
      const finalAttributes = Object.keys(mergedAttributes).length > 0 ? mergedAttributes : undefined

      const conversationId = crypto.randomUUID()
      conversationIdRef.current = conversationId

      const sseOrgId = extractOrgIdFromJwt(tokenRes.accessToken, config.orgId)

      sseRef.current = subscribeToSSE(
        config.messagingUrl,
        tokenRes.accessToken,
        sseOrgId,
        conversationId,
        conversationId,
        tokenRes.lastEventId,
        {
          onMessage: (entry) => {
            console.log('[MSG] onMessage fired | entryType:', entry.conversationEntry?.entryType, '| sender:', entry.conversationEntry?.sender?.role)
            const msg = parseMessageEntry(entry)
            if (msg) {
              console.log('[MSG] adding message to state:', msg.text.slice(0, 80))
              addMessage(msg)
            }
          },
          onTypingStarted: () => {
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
            setState(s => ({ ...s, isAgentTyping: true }))
            typingTimerRef.current = setTimeout(() => {
              setState(s => ({ ...s, isAgentTyping: false }))
            }, 5000)
          },
          onTypingStopped: () => {
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
            setState(s => ({ ...s, isAgentTyping: false }))
          },
          onDelivery: (entry) => {
            const msgId = entry.conversationEntry?.identifier
            setState(s => ({
              ...s,
              messages: s.messages.map(message =>
                message.id === msgId ? { ...message, isDelivered: true } : message
              ),
            }))
          },
          onRead: (entry) => {
            const msgId = entry.conversationEntry?.identifier
            setState(s => ({
              ...s,
              messages: s.messages.map(message =>
                message.id === msgId ? { ...message, isRead: true } : message
              ),
            }))
          },
          onParticipantChanged: () => {
            void syncConversationEntries('participant-changed')
          },
          onRoutingResult: () => {
            void syncConversationEntries('routing-result')
          },
          onSessionStatusChanged: (entry) => {
            updateStatusFromSessionEvent(entry)
            void syncConversationEntries('session-status-changed')
          },
          onConversationClosed: () => {
            setState(s => ({ ...s, status: 'ended' }))
          },
          onError: (err) => {
            setState(s => ({ ...s, error: err.message }))
          },
        }
      )

      await createConversation(
        config.messagingUrl,
        tokenRes.accessToken,
        conversationId,
        config.esDeveloperName,
        finalAttributes
      )

      setState(s => ({
        ...s,
        status: 'active',
        deploymentConfig,
        prechatFields: visibleFields,
        accessToken: tokenRes.accessToken,
        conversationId,
      }))
      await syncConversationEntries('conversation-created')
      scheduleHistorySync(1500, 'post-create-backfill')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed'
      setState(s => ({ ...s, status: 'error', error: msg }))
    }
  }, [config, addMessage, parseMessageEntry, scheduleHistorySync, syncConversationEntries, updateStatusFromSessionEvent])

  const submitPrechat = useCallback((routingAttributes: Record<string, string>) => {
    startConversation(routingAttributes)
  }, [startConversation])

  const sendMessage = useCallback(async (text: string) => {
    if (!config || !accessTokenRef.current || !conversationIdRef.current) return
    const messageId = crypto.randomUUID()

    addMessage({
      id: messageId,
      conversationId: conversationIdRef.current,
      text,
      senderRole: 'EndUser',
      senderName: 'You',
      timestamp: Date.now(),
      isSent: false,
      isDelivered: false,
      isRead: false,
    })

    try {
      await sendTextMessage(
        config.messagingUrl,
        accessTokenRef.current,
        conversationIdRef.current,
        config.esDeveloperName,
        text,
        messageId,
        isFirstMessageRef.current
      )
      isFirstMessageRef.current = false
      setState(s => ({
        ...s,
        messages: s.messages.map(message =>
          message.id === messageId ? { ...message, isSent: true } : message
        ),
      }))
      await syncConversationEntries('after-send-message')
    } catch (err) {
      console.error('Send failed', err)
    }
  }, [config, addMessage, syncConversationEntries])

  const endConversation = useCallback(async () => {
    sseRef.current?.close()
    if (config && accessTokenRef.current && conversationIdRef.current) {
      await closeConversation(
        config.messagingUrl,
        accessTokenRef.current,
        conversationIdRef.current,
        config.esDeveloperName
      ).catch(() => {})
    }
    setState(s => ({ ...s, status: 'ended' }))
  }, [config])

  const resetConversation = useCallback(() => {
    sseRef.current?.close()
    if (historySyncTimerRef.current) clearTimeout(historySyncTimerRef.current)
    accessTokenRef.current = null
    conversationIdRef.current = null
    isFirstMessageRef.current = true
    setState({
      status: 'idle',
      messages: [],
      isAgentTyping: false,
      error: null,
      deploymentConfig: null,
      prechatFields: [],
      accessToken: null,
      conversationId: null,
    })
  }, [])

  useEffect(() => {
    return () => {
      sseRef.current?.close()
      if (historySyncTimerRef.current) clearTimeout(historySyncTimerRef.current)
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    }
  }, [])

  const agentDisplayName = useMemo(
    () => resolveAgentDisplayName(state.messages),
    [state.messages]
  )

  return {
    ...state,
    agentDisplayName,
    startConversation,
    submitPrechat,
    sendMessage,
    endConversation,
    resetConversation,
  }
}
