import type { ParsedMessage } from '../types/miaw'

interface Props {
  message: ParsedMessage
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function DeliveryIcon({ isSent, isDelivered, isRead }: { isSent: boolean; isDelivered: boolean; isRead: boolean }) {
  if (isRead) {
    return (
      <span title="Read" className="text-elektra-accent">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
        </svg>
      </span>
    )
  }
  if (isDelivered) return <span title="Delivered" className="text-white/50 text-[10px]">✓✓</span>
  if (isSent) return <span title="Sent" className="text-white/30 text-[10px]">✓</span>
  return <span className="text-white/20 text-[10px]">○</span>
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.senderRole === 'EndUser'

  if (isUser) {
    return (
      <div className="flex justify-end mb-3 fade-in">
        <div className="max-w-[78%]">
          <div className="bg-elektra-accent text-elektra-bg rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed shadow-lg font-medium">
            {message.text}
          </div>
          <div className="flex items-center justify-end gap-1 mt-1 px-1">
            <span className="text-white/30 text-[10px]">{formatTime(message.timestamp)}</span>
            <DeliveryIcon isSent={message.isSent} isDelivered={message.isDelivered} isRead={message.isRead} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-end gap-2 mb-3 fade-in">
      <div className="w-7 h-7 rounded-full bg-elektra-accent/20 flex items-center justify-center flex-shrink-0 border border-elektra-accent/30">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-elektra-accent" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
        </svg>
      </div>
      <div className="max-w-[78%]">
        <div className="text-[10px] text-white/35 mb-1 px-1">{message.senderName}</div>
        <div className="glass-dark rounded-2xl rounded-bl-sm px-4 py-3 text-white/90 text-sm leading-relaxed whitespace-pre-wrap">
          {message.text}
        </div>
        <div className="text-white/25 text-[10px] mt-1 px-1">{formatTime(message.timestamp)}</div>
      </div>
    </div>
  )
}
