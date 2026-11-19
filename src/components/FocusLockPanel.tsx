import { useEffect, useMemo, useState } from 'react'
import { FocusLock, type FocusLockPermissions, type InstalledApp } from '../lib/focusLock'

export function FocusLockPanel({
  selectedPackages,
  onSelectedPackagesChange,
}: {
  selectedPackages: string[]
  onSelectedPackagesChange: (packages: string[]) => void
}) {
  const [apps, setApps] = useState<InstalledApp[]>([])
  const [permissions, setPermissions] = useState<FocusLockPermissions | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const selectedSet = useMemo(() => new Set(selectedPackages), [selectedPackages])

  const refreshPermissions = async () => {
    try {
      setPermissions(await FocusLock.getPermissionStatus())
      setMessage('')
    } catch {
      setMessage('App locking is available after installing the Margdarshi Android APK.')
    }
  }

  const loadApps = async () => {
    setBusy(true)
    try {
      const result = await FocusLock.getInstalledApps()
      setApps(result.apps)
      setMessage(result.apps.length ? '' : 'No launchable apps were returned by Android.')
    } catch {
      setMessage('App list is available in the Android APK, not in a normal browser tab.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void refreshPermissions()
  }, [])

  const toggleApp = (packageName: string) => {
    const next = new Set(selectedSet)
    if (next.has(packageName)) next.delete(packageName)
    else next.add(packageName)
    onSelectedPackagesChange(Array.from(next))
  }

  return (
    <article className="card focus-lock-card">
      <div className="card-title">
        <div>
          <div className="card-label">ANDROID FOCUS LOCK</div>
          <h2>Protect your study block</h2>
        </div>
        <span className={`permission-pill ${permissions?.accessibilityEnabled && permissions.overlayGranted ? 'ready' : ''}`}>
          {permissions?.accessibilityEnabled && permissions.overlayGranted ? 'Ready' : 'Setup needed'}
        </span>
      </div>
      <p className="profile-muted">
        Choose distracting apps here. When Focus mode starts, Android will show Margdarshi over those apps until the active task is completed.
      </p>
      <div className="focus-lock-steps">
        <span className={permissions?.accessibilityEnabled ? 'done' : ''}>1. Accessibility access</span>
        <span className={permissions?.overlayGranted ? 'done' : ''}>2. Display over other apps</span>
        <span className={selectedPackages.length ? 'done' : ''}>3. Select apps</span>
      </div>
      <div className="profile-button-row focus-lock-actions">
        <button className="button quiet" onClick={() => void FocusLock.openAccessibilitySettings()}>Open Accessibility settings</button>
        <button className="button quiet" onClick={() => void FocusLock.openOverlaySettings()}>Allow overlay</button>
        <button className="button quiet" onClick={() => { void refreshPermissions(); void loadApps() }} disabled={busy}>{busy ? 'Loading…' : 'Load installed apps'}</button>
      </div>
      {apps.length > 0 && (
        <div className="focus-app-list" aria-label="Apps protected by Focus Lock">
          {apps.map((app) => (
            <label className="focus-app-option" key={app.packageName}>
              <input type="checkbox" checked={selectedSet.has(app.packageName)} onChange={() => toggleApp(app.packageName)} />
              <span>{app.label}</span>
              <small>{app.packageName}</small>
            </label>
          ))}
        </div>
      )}
      {message && <p className="focus-lock-message" role="status">{message}</p>}
      <small className="focus-lock-note">Android shows both permissions in its own Settings screens. You can always stop Focus Lock from Margdarshi or revoke access in Settings.</small>
    </article>
  )
}
