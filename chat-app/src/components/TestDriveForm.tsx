import { useState } from 'react'

/**
 * Inline test-drive booking form rendered inside the chat stream.
 *
 * Unlike a typical ESW prechat form, this form does NOT gatekeep the
 * conversation — the user can chat freely and only fill this out when
 * they're ready to book. On submit we:
 *
 *   1. POST the structured payload to /api/test-drive so a Lead is
 *      created deterministically (bypasses the LLM's ability to drop
 *      or misparse fields).
 *   2. Send a short confirmation message via `onSendChat` so the
 *      conversation reflects the booking and the agent can respond
 *      with contextual next steps.
 */

export interface TestDrivePayload {
  firstName: string
  lastName: string
  email: string
  vehicleModel: string
  vehicleSku?: string
  preferredDate: string
}

interface Props {
  defaultVehicle?: string
  onSubmit: (payload: TestDrivePayload) => Promise<void> | void
  onCancel: () => void
}

const VEHICLE_OPTIONS: Array<{ model: string; sku: string }> = [
  { model: 'Reaktive', sku: 'ELK-SUV-7' },
  { model: 'Megavolt', sku: 'ELK-COUPE-GT' },
  { model: 'Regulator', sku: 'ELK-EV-PERF' },
  { model: 'Harmonic', sku: 'ELK-SEDAN-AWD' },
  { model: 'Beam', sku: 'ELK-HATCH-PLUS' },
  { model: 'Ignite', sku: 'ELK-TRUCK-PLAT' },
]

export default function TestDriveForm({ defaultVehicle, onSubmit, onCancel }: Props) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [vehicleModel, setVehicleModel] = useState(defaultVehicle ?? '')
  const [preferredDate, setPreferredDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.includes('@') &&
    vehicleModel &&
    preferredDate

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        vehicleModel,
        vehicleSku: VEHICLE_OPTIONS.find(v => v.model === vehicleModel)?.sku,
        preferredDate,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full glass rounded-lg px-3.5 py-2.5 text-white text-sm leading-5 placeholder-white/25 outline-none focus:border-elektra-accent/50 transition-colors'

  return (
    <div className="fade-in mb-3 mx-1 glass-dark rounded-2xl px-5 py-4 border border-elektra-accent/30">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-elektra-accent/20 flex items-center justify-center">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-elektra-accent">
            <path d="M10 2a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V3a1 1 0 011-1z" />
          </svg>
        </div>
        <h3 className="text-white font-semibold text-sm">Book a Test Drive</h3>
        <button
          type="button"
          onClick={onCancel}
          className="ml-auto text-white/30 hover:text-white/60 text-xs"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-white/60 text-xs mb-1.5 tracking-wide">
              First Name <span className="text-elektra-accent">*</span>
            </label>
            <input
              type="text"
              required
              autoComplete="given-name"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="Jane"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-white/60 text-xs mb-1.5 tracking-wide">
              Last Name <span className="text-elektra-accent">*</span>
            </label>
            <input
              type="text"
              required
              autoComplete="family-name"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Doe"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-white/60 text-xs mb-1.5 tracking-wide">
            Email <span className="text-elektra-accent">*</span>
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-white/60 text-xs mb-1.5 tracking-wide">
            Vehicle <span className="text-elektra-accent">*</span>
          </label>
          <select
            required
            value={vehicleModel}
            onChange={e => setVehicleModel(e.target.value)}
            className={`${inputClass} appearance-none`}
          >
            <option value="" className="bg-elektra-bg">Select a model</option>
            {VEHICLE_OPTIONS.map(v => (
              <option key={v.model} value={v.model} className="bg-elektra-bg">
                {v.model}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-white/60 text-xs mb-1.5 tracking-wide">
            Preferred Date <span className="text-elektra-accent">*</span>
          </label>
          <input
            type="date"
            required
            value={preferredDate}
            onChange={e => setPreferredDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className={inputClass}
          />
        </div>

        {error && <p className="text-elektra-red text-xs">{error}</p>}

        <button
          type="submit"
          disabled={!valid || submitting}
          className="w-full bg-elektra-accent text-elektra-bg rounded-lg py-2.5 text-sm font-semibold hover:bg-elektra-accent-bright disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Booking…' : 'Request Test Drive'}
        </button>
      </form>
    </div>
  )
}
