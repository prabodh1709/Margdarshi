const DAY_MS = 86_400_000
export const INDIA_TIME_ZONE = 'Asia/Kolkata'

export interface IndiaClockParts { date: string; hour: number; minute: number; second: number }

export const indiaClockParts = (date = new Date()): IndiaClockParts => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: INDIA_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value || 0)
  return { date: `${String(value('year')).padStart(4, '0')}-${String(value('month')).padStart(2, '0')}-${String(value('day')).padStart(2, '0')}`, hour: value('hour'), minute: value('minute'), second: value('second') }
}

export const indiaDateKey = (date = new Date()) => indiaClockParts(date).date
export const indiaMinutes = (date = new Date()) => {
  const parts = indiaClockParts(date)
  return parts.hour * 60 + parts.minute
}

export const toDateKey = (date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export const fromDateKey = (key: string) => new Date(`${key}T12:00:00`)
export const addDays = (key: string, days: number) => toDateKey(new Date(fromDateKey(key).getTime() + days * DAY_MS))
export const addMonths = (key: string, months: number) => {
  const date = fromDateKey(key)
  date.setMonth(date.getMonth() + months)
  return toDateKey(date)
}
export const startOfWeek = (key: string, monday = true) => {
  const date = fromDateKey(key)
  const day = date.getDay()
  const offset = monday ? (day + 6) % 7 : day
  return addDays(key, -offset)
}
export const daysBetween = (earlier: string, later: string) => Math.round((fromDateKey(later).getTime() - fromDateKey(earlier).getTime()) / DAY_MS)
export const isToday = (key: string) => key === toDateKey()
export const formatDate = (key: string, options: Intl.DateTimeFormatOptions = {}) =>
  new Intl.DateTimeFormat('en-IN', { weekday: 'short', month: 'short', day: 'numeric', ...options }).format(fromDateKey(key))
export const formatMonth = (key: string) => new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(fromDateKey(key))
export const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}
export const durationMinutes = (start: string, end: string) => {
  const delta = timeToMinutes(end) - timeToMinutes(start)
  return delta <= 0 ? delta + 1440 : delta
}
export const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`
}
export const formatTime = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(2000, 0, 1, h, m))
}
