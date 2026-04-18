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
 * Minimal shape of the global Data Cloud SDK that the site's /js/sitemap.js
 * initializes. We only touch the anonymous-id accessor — the rest of the
 * surface is irrelevant to the chat SPA.
 */
interface SalesforceInteractionsLike {
  getAnonymousId?: () => string | undefined
}

declare global {
  interface Window {
    SalesforceInteractions?: SalesforceInteractionsLike
  }
}

/**
 * Get the Data Cloud anonymous device ID.
 *
 * Preferred path: call `SalesforceInteractions.getAnonymousId()`. This is
 * the SAME id that the SDK stamps on every event it sends (`deviceId`
 * field) and the value DC uses for real-time identity resolution.
 *
 * Fallback path: parse the `_sfdc_*` cookie manually. This only works when
 * the cookie is not HttpOnly — on our stack it typically is, so the
 * fallback is mostly for local dev / other bundle configs. Safe to keep.
 *
 * Returns empty string if neither path produces a value (SDK not loaded
 * yet, or consent withheld).
 */
export function getDeviceId(): string {
  if (typeof window !== 'undefined') {
    try {
      const id = window.SalesforceInteractions?.getAnonymousId?.()
      if (id) return id
    } catch {
      // SDK threw — fall through to cookie fallback
    }
  }

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
 * Mirror of nav.js VDP_CONTEXT: slug → { model, sku }. We duplicate it here
 * because the React SPA can't reach the classic-script constant, and
 * because we want to resolve context both from URL query params AND from
 * document.referrer (e.g. user hit "Chat" from the configurator page with
 * no query string).
 */
const VDP_CONTEXT: Record<string, { model: string; sku: string }> = {
  'electra-beam':      { model: 'Electra Beam Plus',             sku: 'ELK-HATCH-PLUS' },
  'electra-harmonic':  { model: 'Electra Harmonic SE',           sku: 'ELK-SEDAN-AWD'  },
  'electra-ignite':    { model: 'Electra Ignite Platinum',       sku: 'ELK-TRUCK-PLAT' },
  'electra-megavolt':  { model: 'Electra Megavolt GT',           sku: 'ELK-COUPE-GT'   },
  'electra-reaktive':  { model: 'Electra Reaktive Touring',      sku: 'ELK-SUV-7'      },
  'electra-regulator': { model: 'Electra Regulator Performance', sku: 'ELK-EV-PERF'    },
}

/**
 * Try to resolve VDP context from a URL path like `/models/electra-beam/`.
 * Returns null if the path does not match a known model slug.
 */
function resolveVdpFromPath(pathname: string): { model: string; sku: string } | null {
  const m = pathname.match(/^\/models\/(electra-[a-z]+)\/?/)
  if (!m) return null
  return VDP_CONTEXT[m[1]] ?? null
}

/**
 * Extracts page context in priority order:
 *   1) explicit query params on /chat (vehicleModel, vehicleSku, currentPage)
 *   2) referrer path matches a VDP → infer model+sku from VDP_CONTEXT
 *   3) referrer path matches /configure/ → currentPage only, no model
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
  const qsModel = params.get('vehicleModel') ?? ''
  const qsSku = params.get('vehicleSku') ?? ''
  const qsPage = params.get('currentPage') ?? ''

  // Referrer can be an absolute URL; normalize to pathname when same-origin
  let referrerPath = ''
  try {
    const ref = document.referrer
    if (ref) {
      const u = new URL(ref)
      if (u.origin === window.location.origin) referrerPath = u.pathname
    }
  } catch {
    // ignore malformed referrer
  }

  const inferred = referrerPath ? resolveVdpFromPath(referrerPath) : null

  return {
    vehicleModel: qsModel || inferred?.model || '',
    vehicleSku: qsSku || inferred?.sku || '',
    currentPage: qsPage || referrerPath || document.referrer || '',
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

/**
 * Wait up to `timeoutMs` for the DC SDK to expose an anonymousId, polling
 * every 100ms. Resolves with the id (or empty string if we give up).
 *
 * We call this once before starting the MIAW conversation so that the
 * routingAttributes.deviceId matches the deviceId the SDK will stamp on
 * every event for this session — otherwise the Agentforce bot sees a
 * deviceId on turn one that's different from any Lead created later.
 */
export function waitForDeviceId(timeoutMs = 2000): Promise<string> {
  return new Promise(resolve => {
    const existing = getDeviceId()
    if (existing) return resolve(existing)

    const start = Date.now()
    const interval = setInterval(() => {
      const id = getDeviceId()
      if (id) {
        clearInterval(interval)
        resolve(id)
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval)
        resolve('')
      }
    }, 100)
  })
}
