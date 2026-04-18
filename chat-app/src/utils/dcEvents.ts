/**
 * Thin wrapper around the Data Cloud Web SDK that's injected into
 * /chat's index.html (see server.js).
 *
 * This fires the SAME two events that the manual /get-a-quote and
 * /test-drive HTML forms fire, so the existing Real_Time_Lead_Capture
 * Flow → RealTimeLeadCaptureAction Apex → Lead-create pipeline lights
 * up with zero new server-side code.
 *
 * The SDK stamps every event with the browser's anonymousId (from the
 * _sfdc_* cookie), which Data Cloud uses for real-time identity
 * resolution. That's the same deviceId we also pass to the MIAW bot
 * via routingAttributes, so the Lead and the chat conversation end up
 * correlated to the same Unified Individual.
 */

interface EMIdentifyUser {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  zipCode?: string
}

interface EMNamespace {
  identify: (user: EMIdentifyUser, eventName?: string, attributes?: Record<string, unknown>) => void
  track: (eventName: string, attributes?: Record<string, unknown>) => void
}

declare global {
  interface Window {
    EM?: EMNamespace
  }
}

function getEM(): EMNamespace | null {
  if (typeof window === 'undefined') return null
  return window.EM ?? null
}

/**
 * Runs a one-time diagnostic on mount so we can tell at a glance whether
 * the DC Web SDK wiring is healthy inside /chat. Logs three things:
 *   - is window.EM attached (our helper)?
 *   - is window.SalesforceInteractions attached (the real SDK)?
 *   - is the _sfdc_* cookie present (→ deviceId available)?
 * If any of these are false when the form is submitted, events won't
 * fire and we know where the floor is.
 */
export function logDcEventDiagnostics(): void {
  if (typeof window === 'undefined') return
  const hasEM = typeof window.EM === 'object' && !!window.EM
  const SI = (window as unknown as { SalesforceInteractions?: unknown }).SalesforceInteractions
  const hasSI = typeof SI === 'object' && !!SI
  const hasCookie = document.cookie.split(';').some(c => c.trim().startsWith('_sfdc_'))
  console.log('[ChatApp] DC event diagnostics:', {
    'window.EM': hasEM,
    'window.SalesforceInteractions': hasSI,
    '_sfdc_ cookie present': hasCookie,
  })
}

export interface TestDriveEvent {
  email: string
  firstName?: string
  lastName?: string
  vehicleModel: string
  vehicleSku?: string
  preferredDate: string
  preferredDealer?: string
}

/**
 * Emit the two events that the manual /test-drive form emits, in the
 * same order with the same attribute shape. This is what triggers the
 * existing Flow on the Salesforce side.
 *
 * Returns `true` if the SDK was loaded and the events were fired,
 * `false` if the SDK isn't available (in which case the caller should
 * treat the booking as best-effort — e.g. still log on the server).
 */
export function emitTestDriveEvents(payload: TestDriveEvent): boolean {
  const EM = getEM()
  if (!EM) {
    const SI = (window as unknown as { SalesforceInteractions?: unknown }).SalesforceInteractions
    console.warn('[ChatApp] window.EM not loaded — skipping DC events.', {
      'window.SalesforceInteractions present': !!SI,
      hint: 'Check that /js/sdk.js loaded and that it attached window.EM.',
    })
    return false
  }

  console.log('[ChatApp] firing DC events:', { identify: 'formSubmit', track: 'testDriveRequest', payload })

  EM.identify(
    {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
    },
    'formSubmit',
    {
      vehicleModel: payload.vehicleModel,
      vehicleSKU: payload.vehicleSku ?? '',
      preferredDate: payload.preferredDate,
      preferredDealer: payload.preferredDealer ?? '',
      pageUrl: window.location.href,
    },
  )

  EM.track('testDriveRequest', {
    attributeVehicleModel: payload.vehicleModel,
    attributeSkuCode: payload.vehicleSku ?? '',
    attributePreferredDate: payload.preferredDate,
    attributePreferredDealer: payload.preferredDealer ?? '',
    attributePageUrl: window.location.href,
  })

  return true
}
