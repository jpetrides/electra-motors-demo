/**
 * Elektra Chat — embeddable widget entry point.
 *
 * This file is the entry for the "widget" build target (vite lib mode).
 * It is what ships as /js/elektra-chat.js and gets loaded by every
 * page on demand (when the user clicks the floating chat button).
 *
 * It exposes a tiny imperative API on `window.ElektraChat`:
 *
 *   ElektraChat.mount(rootEl, { onClose })
 *     → mounts the React chat UI into rootEl
 *     → returns a handle with unmount()
 *
 *   ElektraChat.unmount(rootEl)
 *     → unmounts any React root previously mounted into rootEl
 *
 * The page-level loader (chat-widget-loader.js) is responsible for
 * creating the drawer DOM, showing/hiding it, and calling mount/unmount.
 * Keeping the React code totally agnostic of "drawer" semantics makes
 * the widget trivially re-usable in other layouts later (modal,
 * full-page, inline embed, etc.)
 */

import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import ChatApp from './ChatApp'
import './index.css'

export interface ChatWidgetOptions {
  /** Called when the user clicks the "end" / close button inside the chat header. */
  onClose?: () => void
}

export interface ChatWidgetHandle {
  unmount: () => void
}

// Track every active root so unmount() can find + destroy it without the
// caller having to keep a handle. The WeakMap key is the DOM element the
// widget was mounted into.
const activeRoots = new WeakMap<Element, Root>()

function mount(rootEl: Element, opts: ChatWidgetOptions = {}): ChatWidgetHandle {
  // If something was already mounted into this element, tear it down first
  // so repeated calls are idempotent (common when the loader opens/closes
  // the drawer quickly).
  const prior = activeRoots.get(rootEl)
  if (prior) prior.unmount()

  const root = createRoot(rootEl)
  activeRoots.set(rootEl, root)

  root.render(
    <StrictMode>
      <ChatApp embedded onClose={opts.onClose} />
    </StrictMode>,
  )

  return {
    unmount() {
      const r = activeRoots.get(rootEl)
      if (r) {
        r.unmount()
        activeRoots.delete(rootEl)
      }
    },
  }
}

function unmount(rootEl: Element): void {
  const r = activeRoots.get(rootEl)
  if (r) {
    r.unmount()
    activeRoots.delete(rootEl)
  }
}

// The public widget API.
//
// Vite's IIFE/lib build wraps this module in `var ElektraChat = (IIFE)()`,
// so the default export is auto-published to window.ElektraChat at
// script-load time. Do NOT redefine window.ElektraChat manually from
// here: an earlier version used Object.defineProperty with
// writable:false, which fought Vite's own assignment at the end of
// the IIFE and left window.ElektraChat permanently undefined.
declare global {
  interface Window {
    ElektraChat?: {
      mount: typeof mount
      unmount: typeof unmount
      version: string
    }
  }
}

const api = {
  mount,
  unmount,
  version: '1.0.0',
} as const

export default api
