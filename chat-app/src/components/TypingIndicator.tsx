export default function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="w-7 h-7 rounded-full bg-elektra-accent/25 flex items-center justify-center flex-shrink-0 border border-elektra-accent/30">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-elektra-accent" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
        </svg>
      </div>
      <div className="glass-dark rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '160ms' }} />
        <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '320ms' }} />
      </div>
    </div>
  )
}
