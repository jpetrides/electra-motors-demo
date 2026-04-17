import type { ConversationStatus } from '../hooks/useConversation'

interface Props {
  status: ConversationStatus
  onEnd?: () => void
  title?: string
  subtitle?: string
}

const statusLabel: Record<ConversationStatus, string> = {
  idle: 'Ready',
  connecting: 'Connecting…',
  prechat: 'Almost ready',
  active: 'Active',
  ended: 'Conversation ended',
  error: 'Error',
}

const statusColor: Record<ConversationStatus, string> = {
  idle: 'bg-white/30',
  connecting: 'bg-yellow-400 animate-pulse',
  prechat: 'bg-yellow-400',
  active: 'bg-elektra-green',
  ended: 'bg-white/20',
  error: 'bg-elektra-red',
}

export default function ChatHeader({
  status,
  onEnd,
  title = 'Elektra Advisor',
  subtitle = 'Elektra Motors',
}: Props) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 bg-elektra-bg-2">
      <div className="w-10 h-10 rounded-full bg-elektra-accent/15 flex items-center justify-center flex-shrink-0 border border-elektra-accent/40 glow-accent">
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-elektra-accent" fill="currentColor">
          <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm truncate">{title}</span>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusColor[status]}`} />
        </div>
        <div className="text-white/40 text-[11px] truncate">
          {subtitle} · {statusLabel[status]}
        </div>
      </div>
      {status === 'active' && onEnd && (
        <button
          onClick={onEnd}
          title="End conversation"
          className="px-3 py-1.5 rounded-lg text-white/40 hover:text-elektra-red hover:bg-elektra-red/10 transition-colors text-xs font-medium"
        >
          End
        </button>
      )}
    </div>
  )
}
