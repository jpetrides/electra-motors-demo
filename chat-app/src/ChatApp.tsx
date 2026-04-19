import { useEffect, useRef, useState } from 'react'
import ChatHeader from './components/ChatHeader'
import ChatInput from './components/ChatInput'
import MessageList from './components/MessageList'
import TestDriveForm, { type TestDrivePayload } from './components/TestDriveForm'
import { miawConfig } from './config'
import { useConversation } from './hooks/useConversation'
import { buildRoutingAttributes, getPageContext, waitForDeviceId } from './utils/browserContext'
import { emitTestDriveEvents, logDcEventDiagnostics } from './utils/dcEvents'

interface ChatAppProps {
  /**
   * When true, render at 100% of the parent container (for drawer/modal hosts).
   * When false (default), render full-screen via h-screen (legacy /chat route).
   */
  embedded?: boolean
  /**
   * Called when the user dismisses the chat via the header close button.
   * Only invoked when rendered in embedded mode.
   */
  onClose?: () => void
}

export default function ChatApp({ embedded = false, onClose }: ChatAppProps = {}) {
  const conv = useConversation(miawConfig)
  const [showForm, setShowForm] = useState(false)
  const [bookingResult, setBookingResult] = useState<string | null>(null)
  const didStart = useRef(false)
  const pageContext = useRef(getPageContext())

  // Auto-start the conversation once on mount. routingAttributes carry
  // deviceId + vehicle context into the Bot's External conversation variables,
  // so the Agentforce agent has the context before the user says anything.
  useEffect(() => {
    if (didStart.current) return
    if (conv.status !== 'idle') return
    didStart.current = true

    // Wait a tick so scripts injected into index.html have time to attach
    // window.EM / window.SalesforceInteractions before we diagnose.
    setTimeout(logDcEventDiagnostics, 1500)

    // Wait for the DC SDK to be ready so routingAttributes.deviceId matches
    // the deviceId stamped on every subsequent EM.track/identify event.
    // If the SDK never loads (consent withheld, etc) we still start the
    // conversation — just without a deviceId attribute.
    void (async () => {
      await waitForDeviceId(2000)
      const attrs = buildRoutingAttributes()
      console.log('[ChatApp] starting conversation | routingAttributes:', attrs)
      void conv.startConversation(Object.keys(attrs).length ? attrs : undefined)
    })()
    // intentionally only run this once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleBook = async (payload: TestDrivePayload) => {
    // Primary path: fire the same two Data Cloud Web SDK events that the
    // manual /get-a-quote and /test-drive HTML forms fire. The existing
    // Real_Time_Lead_Capture Flow (triggered on DataGraphDataChange of
    // the RealTimeLeads data graph) picks these up via IDR and calls
    // RealTimeLeadCaptureAction Apex to create/enrich the Lead. The
    // DeviceId is stamped automatically by the SDK from the _sfdc_*
    // cookie — the same deviceId we already pass to the bot via
    // routingAttributes, so the Lead and conversation correlate.
    const emitted = emitTestDriveEvents({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      vehicleModel: payload.vehicleModel,
      vehicleSku: payload.vehicleSku || pageContext.current.vehicleSku,
      preferredDate: payload.preferredDate,
    })

    // Best-effort server log (mirrors what the manual /test-drive form does;
    // this endpoint does not itself create the Lead — DC + Flow does).
    try {
      await fetch('/api/test-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: payload.email,
          vehicleModel: payload.vehicleModel,
          vehicleSKU: payload.vehicleSku || pageContext.current.vehicleSku,
          preferredDate: payload.preferredDate,
          source: 'chat',
          sdkEmitted: emitted,
        }),
      })
    } catch (err) {
      console.warn('[ChatApp] /api/test-drive log failed (non-fatal):', err)
    }

    setShowForm(false)
    setBookingResult(
      emitted
        ? `Booked ${payload.vehicleModel} for ${payload.preferredDate}`
        : `Request received for ${payload.vehicleModel} on ${payload.preferredDate} (tracking offline)`,
    )
    // Let the agent know, so the conversation can continue naturally.
    const msg = `I just submitted a test drive request for the ${payload.vehicleModel} on ${payload.preferredDate} under ${payload.firstName} ${payload.lastName} (email ${payload.email}). Please confirm and let me know next steps.`
    void conv.sendMessage(msg)
  }

  return (
    <div className={`${embedded ? 'h-full' : 'h-screen'} flex flex-col bg-elektra-bg`}>
      <ChatHeader
        status={conv.status}
        onEnd={conv.status === 'active' ? conv.endConversation : undefined}
        onClose={embedded ? onClose : undefined}
        title={conv.agentDisplayName ?? 'Elektra Advisor'}
        subtitle="Elektra Motors"
      />

      {(conv.status === 'connecting' || conv.status === 'idle') && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-elektra-accent/30 border-t-elektra-accent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-white/50 text-sm">Connecting to Elektra Advisor…</p>
          </div>
        </div>
      )}

      {conv.status === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-elektra-red/15 flex items-center justify-center mb-3">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-elektra-red">
              <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 1.998-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-elektra-red text-sm mb-1">Connection failed</p>
          <p className="text-white/40 text-xs mb-4 max-w-md">{conv.error}</p>
          <button
            onClick={() => {
              conv.resetConversation()
              didStart.current = false
              setTimeout(() => {
                const attrs = buildRoutingAttributes()
                void conv.startConversation(Object.keys(attrs).length ? attrs : undefined)
                didStart.current = true
              }, 0)
            }}
            className="text-elektra-accent hover:text-elektra-accent-bright text-sm"
          >
            Try again
          </button>
        </div>
      )}

      {(conv.status === 'active' || conv.status === 'ended') && (
        <>
          <MessageList messages={conv.messages} isAgentTyping={conv.isAgentTyping}>
            {showForm && (
              <TestDriveForm
                defaultVehicle={pageContext.current.vehicleModel}
                onSubmit={handleBook}
                onCancel={() => setShowForm(false)}
              />
            )}
            {bookingResult && !showForm && (
              <div className="fade-in mb-3 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-elektra-green/15 border border-elektra-green/30 text-elektra-green text-xs">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                  {bookingResult}
                </div>
              </div>
            )}
          </MessageList>

          {conv.status === 'ended' && (
            <div className="px-4 py-3 text-center border-t border-white/5">
              <p className="text-white/40 text-xs">Conversation ended. Refresh to start a new one.</p>
            </div>
          )}

          {conv.status === 'active' && (
            <ChatInput
              onSend={conv.sendMessage}
              onOpenForm={!showForm ? () => setShowForm(true) : undefined}
              messagingUrl={miawConfig.messagingUrl}
              accessToken={conv.accessToken}
              conversationId={conv.conversationId}
            />
          )}
        </>
      )}
    </div>
  )
}
