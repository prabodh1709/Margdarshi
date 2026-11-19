import { registerPlugin } from '@capacitor/core'

export interface InstalledApp {
  packageName: string
  label: string
}

export interface FocusLockPermissions {
  overlayGranted: boolean
  accessibilityEnabled: boolean
}

export interface FocusLockPlugin {
  getPermissionStatus(): Promise<FocusLockPermissions>
  getInstalledApps(): Promise<{ apps: InstalledApp[] }>
  openAccessibilitySettings(): Promise<void>
  openOverlaySettings(): Promise<void>
  startFocusLock(options: { packages: string[]; taskTitle: string }): Promise<{ active: boolean }>
  stopFocusLock(): Promise<void>
}

export const FocusLock = registerPlugin<FocusLockPlugin>('FocusLock')
