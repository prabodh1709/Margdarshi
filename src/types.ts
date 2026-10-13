export type Category = 'GATE' | 'Coding' | 'Meditation' | 'Sleep' | 'Food' | 'Break' | 'Personal'
export type Priority = 'high' | 'medium' | 'low'
export type View = 'dashboard' | 'calendar' | 'tasks' | 'progress' | 'motivation'

export interface TaskTemplate {
  id: string
  title: string
  startTime: string
  endTime: string
  category: Category
  priority: Priority
  recurring: boolean
  mandatory?: boolean
  subject?: string
  notes?: string
}

export interface Task extends TaskTemplate {
  date: string
  sourceTemplateId?: string
  scheduleOverride?: boolean
  completed: boolean
  completedAt?: string
  deleted?: boolean
}

export interface CodingEntry {
  id: string
  date: string
  title: string
  platform: string
  topic: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  minutes: number
  solved: boolean
}

export interface GateEntry {
  id: string
  date: string
  subject: string
  minutes: number
  pyqs: number
  mocks: number
  revisions: number
  note?: string
}

export interface DailyNote {
  date: string
  reflection: string
  tomorrowPriority: string
}

export interface AppSettings {
  displayName: string
  theme: 'light' | 'dark'
  notifications: boolean
  weekStartsMonday: boolean
  targetName: string
  targetDate: string
  targetGateHours: number
  targetCodingProblems: number
}

export interface AppState {
  version: 2
  templates: TaskTemplate[]
  taskOverrides: Record<string, Task>
  codingEntries: CodingEntry[]
  gateEntries: GateEntry[]
  dailyNotes: Record<string, DailyNote>
  subjects: string[]
  shownMotivationDates: string[]
  settings: AppSettings
}

export interface DayMetrics {
  date: string
  tasks: Task[]
  totalMinutes: number
  completedMinutes: number
  totalTasks: number
  completedTasks: number
  gateMinutes: number
  codingMinutes: number
  meditationCompleted: number
  percent: number
}
