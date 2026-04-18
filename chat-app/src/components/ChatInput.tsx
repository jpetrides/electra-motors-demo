import { useState, useRef } from 'react'
import { useTypingIndicator } from '../hooks/useTypingIndicator'

interface Props {
  onSend: (text: string) => void
  onOpenForm?: () => void
  disabled?: boolean
  messagingUrl: string | null
  accessToken: string | null
  conversationId: string | null
}

export default function ChatInput({ onSend, onOpenForm, disabled, messagingUrl, accessToken, conversationId }: Props) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { onType, onStop } = useTypingIndicator(messagingUrl, accessToken, conversationId)

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onStop()
    onSend(trimmed)
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    onType()
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
    }
  }

  return (
    <div className="border-t border-white/5 p-3 bg-elektra-bg-2">
      {onOpenForm && (
        <div className="mb-2 flex justify-center">
          <button
            onClick={onOpenForm}
            className="text-xs text-elektra-accent hover:text-elektra-accent-bright transition-colors flex items-center gap-1.5"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
            </svg>
            Book a test drive
          </button>
        </div>
      )}
      <div className="flex items-end gap-2 glass rounded-xl px-3 py-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={disabled ? 'Connecting…' : 'Ask about a vehicle, pricing, or book a test drive…'}
          className="flex-1 bg-transparent text-white text-sm placeholder-white/25 resize-none outline-none leading-relaxed min-h-[36px] max-h-[120px] disabled:opacity-40"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="w-8 h-8 rounded-lg bg-elektra-accent text-elektra-bg flex items-center justify-center flex-shrink-0 hover:bg-elektra-accent-bright disabled:opacity-30 transition-colors mb-0.5"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
          </svg>
        </button>
      </div>
      <p className="text-white/20 text-[10px] text-center mt-2 tracking-wide">
        Powered by Agentforce · Elektra Motors
      </p>
    </div>
  )
}
