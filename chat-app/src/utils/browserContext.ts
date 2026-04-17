/**
 * Reads browser-side context that we want to attach to every chat session as
 * MIAW `routingAttributes`. Salesforce maps these onto the Bot's External
 * conversation variables, so the agent + downstream Apex actions can see
 * them without asking the user.
 *
 * Everything here is best-effort: missing context just means the chat
 * still works, it simply loses the contextual hint.
 */

/**
 * Read the Data Cloud Web SDK anonymousId from the `_sfdc_*` cookie.
 *
 * The SDK writes a cookie named `_sfdc_dc_<bundleId>` whose value is a
 * URL-encoded JSON blob. `anonymousId` inside that blob is what Data Cloud
 * uses as the device identifier for real-time identity resolution.
 *
 * Returns empty string if the cookie is missing (SDK not loaded yet, or
 * consent not granted).
 */
export function getDeviceId(): string {
  if (typeof document === 'undefined') return ''
  const cookies = document.cookie.split(';')
  for (const raw of cookies) {
    const c = raw.trim()
    if (!c.startsWith('_sfdc_')) continue
    try {
      const value = decodeURIComponent(c.split('=').slice(1).join('='))
      const parsed = JSON.parse(value) as { anonymousId?: string }
      if (parsed.anonymousId) return parsed.anonymousId
    } catch {
      // not JSON or malformed — skip and try the next cookie
    }
  }
  return ''
}

/**
 * Extracts page context from URL query params the host page can pass when
 * linking to /chat (e.g. /chat?vehicleModel=Reaktive&vehicleSku=REA-BASE).
 * Falls back to document.referrer for the page the user came from.
 */
export interface PageContext {
  vehicleModel: string
  vehicleSku: string
  currentPage: string
}

export function getPageContext(): PageContext {
  if (typeof window === 'undefined') {
    return { vehicleModel: '', vehicleSku: '', currentPage: '' }
  }
  const params = new URLSearchParams(window.location.search)
  return {
    vehicleModel: params.get('vehicleModel') ?? '',
    vehicleSku: params.get('vehicleSku') ?? '',
    currentPage: params.get('currentPage') ?? document.referrer ?? '',
  }
}

/**
 * Build the full `routingAttributes` object sent on MIAW
 * `POST /conversation`. These names MUST match the External conversation
 * variables configured on the Agentforce Bot.
 */
export function buildRoutingAttributes(): Record<string, string> {
  const deviceId = getDeviceId()
  const { vehicleModel, vehicleSku, currentPage } = getPageContext()

  const attrs: Record<string, string> = {}
  if (deviceId) attrs.deviceId = deviceId
  if (vehicleModel) attrs.vehicleModel = vehicleModel
  if (vehicleSku) attrs.vehicleSku = vehicleSku
  if (currentPage) attrs.currentPage = currentPage

  return attrs
}
