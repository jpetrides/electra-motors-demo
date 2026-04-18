import type { MIAWConfig } from './types/miaw'

/**
 * Salesforce MIAW (Messaging for In-App and Web) connection config.
 *
 * These values come from the Custom Client Embedded Service Deployment's
 * Code Snippet. They are NOT secrets — the same values appear in every
 * ESW widget <script> tag in the wild. Security is enforced by:
 *   1. The deployment being published
 *   2. CORS / Trusted URLs allowlisting this origin
 *   3. Short-lived JWTs scoped per conversation
 *
 * Env vars are read at BUILD time (Vite inlines them into the bundle).
 * - On Heroku: set via `heroku config:set VITE_SF_ORG_ID=... VITE_SF_ES_DEVELOPER_NAME=... VITE_SF_MESSAGING_URL=...`
 * - Locally:   set via chat-app/.env.local (gitignored)
 *
 * Fallback defaults target the Elektra demo org so `npm run build` works
 * with zero config. Override when deploying elsewhere.
 */

const DEFAULT_ORG_ID = '00DHo00000d5PwC'
const DEFAULT_ES_DEVELOPER_NAME = 'Elektra_Custom_Chat2'
const DEFAULT_MESSAGING_URL = 'https://storm-ca6e20bd4496e0.my.salesforce-scrt.com'

export const miawConfig: MIAWConfig = {
  orgId: import.meta.env.VITE_SF_ORG_ID || DEFAULT_ORG_ID,
  esDeveloperName: import.meta.env.VITE_SF_ES_DEVELOPER_NAME || DEFAULT_ES_DEVELOPER_NAME,
  messagingUrl: import.meta.env.VITE_SF_MESSAGING_URL || DEFAULT_MESSAGING_URL,
}
