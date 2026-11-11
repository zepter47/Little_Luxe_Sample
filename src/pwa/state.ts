import { useSyncExternalStore } from 'react'
import { flushDrafts } from '../services/drafts/draftAutosaver'
import { requiresUpdate } from './version'

type InstallEvent = Event & {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
type State = {
  install: InstallEvent | null; standalone: boolean; ready: boolean
  required: boolean; busy: boolean; error: string; message: string
}
let state: State = {
  install: null, standalone: matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
  ready: false, required: false, busy: false, error: '', message: '',
}
const listeners = new Set<() => void>()
function set(patch: Partial<State>) { state = { ...state, ...patch }; listeners.forEach(fn => fn()) }
function subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } }
export function usePwa() { return useSyncExternalStore(subscribe, () => state) }
let registration: ServiceWorkerRegistration | undefined
let started = false
let reloading = false
let checking = false
const base = import.meta.env.BASE_URL

export async function checkForUpdate() {
  if (checking) return
  checking = true
  set({ error: '', message: 'Checking for updates…' })
  try {
    const response = await fetch(`${base}pwa-version.json`, { cache: 'no-store', signal: AbortSignal.timeout(10000) })
    if (!response.ok) throw new Error('Version check failed')
    const policy = await response.json()
    if (!Number.isSafeInteger(policy?.minimumSupportedVersion) || policy.minimumSupportedVersion < 1) throw new Error('Invalid version policy')
    set({ required: requiresUpdate(policy) })
    await registration?.update()
    set({ message: registration?.waiting ? 'An update is ready.' : 'Update check complete.' })
  } catch {
    set({ error: 'Could not check for updates. Check your connection and retry.', message: '' })
  } finally { checking = false }
}

export async function installApp() {
  const event = state.install
  if (!event) return
  set({ install: null, error: '' })
  try { await event.prompt(); await event.userChoice }
  catch { set({ error: 'Installation could not start. Use your browser’s install menu.' }) }
}

export async function applyUpdate() {
  if (!registration?.waiting) { await checkForUpdate(); return }
  set({ busy: true, error: '' })
  try {
    await flushDrafts()
    registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
    window.setTimeout(() => {
      if (!reloading) set({ busy: false, error: 'The update has not finished. Please retry.' })
    }, 15000)
  } catch { set({ busy: false, error: 'Your draft could not be saved. Resolve the draft error before updating.' }) }
}

export function startPwa() {
  if (started || !import.meta.env.PROD) return
  started = true
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); set({ install: event as InstallEvent })
  })
  window.addEventListener('appinstalled', () => set({ install: null, standalone: true }))
  matchMedia('(display-mode: standalone)').addEventListener('change', event => set({ standalone: event.matches }))
  if ('serviceWorker' in navigator) {
    let hadController = Boolean(navigator.serviceWorker.controller)
    // Every tab saves its drafts before reloading when the new worker takes control.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) { hadController = true; return }
      if (reloading) return
      reloading = true
      set({ busy: true })
      void flushDrafts().then(() => location.reload()).catch(() => {
        reloading = false
        set({ busy: false, error: 'An update was activated, but your draft could not be saved. Save your work before reloading.' })
      })
    })
    void navigator.serviceWorker.register(`${base}sw.js`, { scope: base, updateViaCache: 'none' }).then(reg => {
      registration = reg
      const waiting = () => { if (reg.waiting && hadController) set({ ready: true, message: '' }) }
      waiting()
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed') waiting()
          if (worker.state === 'redundant') set({ error: 'The update could not be downloaded. Please retry.' })
        })
      })
      void checkForUpdate()
    }).catch(() => set({ error: 'Offline support could not be enabled. Check your connection and retry.' }))
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForUpdate()
  })
  window.addEventListener('online', () => { void checkForUpdate() })
}
