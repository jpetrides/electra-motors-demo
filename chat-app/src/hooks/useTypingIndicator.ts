import { useRef, useCallback } from 'react'
import { sendTypingIndicator } from '../services/miawApi'

const TYPING_DEBOUNCE_MS = 3000

export function useTypingIndicator(
  messagingUrl: string | null,
  accessToken: string | null,
  conversationId: string | null
) {
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTyping = useRef(false)

  const onType = useCallback(() => {
    if (!messagingUrl || !accessToken || !conversationId) return

    if (!isTyping.current) {
      isTyping.current = true
      sendTypingIndicator(messagingUrl, accessToken, conversationId, 'TypingStartedIndicator').catch(() => {})
    }

    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      isTyping.current = false
      sendTypingIndicator(messagingUrl, accessToken, conversationId, 'TypingStoppedIndicator').catch(() => {})
    }, TYPING_DEBOUNCE_MS)
  }, [messagingUrl, accessToken, conversationId])

  const onStop = useCallback(() => {
    if (!messagingUrl || !accessToken || !conversationId) return
    if (typingTimer.current) clearTimeout(typingTimer.current)
    if (isTyping.current) {
      isTyping.current = false
      sendTypingIndicator(messagingUrl, accessToken, conversationId, 'TypingStoppedIndicator').catch(() => {})
    }
  }, [messagingUrl, accessToken, conversationId])

  return { onType, onStop }
}
