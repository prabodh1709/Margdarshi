import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { AppState } from '../types'
import { createInitialState, LEGACY_DEFAULT_TEMPLATES } from './defaults'

const STORAGE_KEY = 'margdarshi-state-v1'
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null

export const loadLocalState = (): AppState => {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (!value) return createInitialState()
    const parsed = JSON.parse(value) as Partial<AppState> & { version?: number }
    const fresh = createInitialState()
    const legacyIds = new Set(LEGACY_DEFAULT_TEMPLATES.map((task) => task.id))
    const isLegacyProfile = (parsed.version ?? 1) < 2
    const templates = isLegacyProfile ? (parsed.templates ?? []).filter((task) => !legacyIds.has(task.id)) : (parsed.templates ?? [])
    const taskOverrides = Object.fromEntries(Object.entries(parsed.taskOverrides ?? {}).map(([key, task]) => {
      if (isLegacyProfile && (task.sourceTemplateId && legacyIds.has(task.sourceTemplateId))) return [key, { ...task, sourceTemplateId: undefined }]
      return [key, task]
    }))
    return { ...fresh, ...parsed, version: 2, settings: { ...fresh.settings, ...parsed.settings }, templates,
      taskOverrides, codingEntries: parsed.codingEntries ?? [], gateEntries: parsed.gateEntries ?? [], dailyNotes: parsed.dailyNotes ?? {}, subjects: parsed.subjects?.length ? parsed.subjects : fresh.subjects, shownMotivationDates: parsed.shownMotivationDates ?? [] }
  } catch { return createInitialState() }
}

export const saveLocalState = (state: AppState) => localStorage.setItem(STORAGE_KEY, JSON.stringify(state))

export const getCloudUser = async (): Promise<User | null> => {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user
}

export const sendMagicLink = async (email: string) => {
  if (!supabase) throw new Error('Cloud sync has not been configured.')
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
  if (error) throw error
}

export const readCloudState = async (userId: string): Promise<AppState | null> => {
  if (!supabase) return null
  const { data, error } = await supabase.from('app_state').select('state').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data?.state as AppState | null
}

export const writeCloudState = async (userId: string, state: AppState) => {
  if (!supabase) return
  const { error } = await supabase.from('app_state').upsert({ user_id: userId, state, updated_at: new Date().toISOString() })
  if (error) throw error
}

export const signOutCloud = async () => { if (supabase) await supabase.auth.signOut() }
