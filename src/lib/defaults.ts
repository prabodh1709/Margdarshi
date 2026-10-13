import type { AppState, TaskTemplate } from '../types'

// Retained only to migrate earlier installations without losing their historical records.
// New profiles deliberately start with an empty, user-defined timetable.
export const LEGACY_DEFAULT_TEMPLATES: TaskTemplate[] = [
  { id: 'meditation-morning', title: 'Meditation — Shri Mataji Nirmala Devi Ji', startTime: '04:00', endTime: '04:30', category: 'Meditation', priority: 'high', recurring: true, mandatory: true },
  { id: 'sleep-early', title: 'Sleep', startTime: '04:30', endTime: '06:00', category: 'Sleep', priority: 'medium', recurring: true },
  { id: 'gate-main', title: 'GATE — Main Subject', startTime: '06:00', endTime: '08:30', category: 'GATE', priority: 'high', recurring: true, subject: 'Core subject' },
  { id: 'breakfast', title: 'Breakfast', startTime: '08:30', endTime: '09:00', category: 'Food', priority: 'low', recurring: true },
  { id: 'gate-concepts', title: 'GATE — Concepts + Notes', startTime: '09:00', endTime: '12:00', category: 'GATE', priority: 'high', recurring: true, subject: 'Core subject' },
  { id: 'lunch', title: 'Lunch', startTime: '12:00', endTime: '12:30', category: 'Food', priority: 'low', recurring: true },
  { id: 'gate-pyq', title: 'GATE — PYQs + Practice', startTime: '12:30', endTime: '15:00', category: 'GATE', priority: 'high', recurring: true, subject: 'Core subject' },
  { id: 'break', title: 'Break', startTime: '15:00', endTime: '15:30', category: 'Break', priority: 'low', recurring: true },
  { id: 'gate-revision', title: 'GATE — Revision + Questions / Test', startTime: '15:30', endTime: '18:00', category: 'GATE', priority: 'high', recurring: true, subject: 'Core subject' },
  { id: 'dinner-rest', title: 'Rest + Dinner', startTime: '18:00', endTime: '19:00', category: 'Food', priority: 'low', recurring: true },
  { id: 'meditation-evening', title: 'Meditation — Shri Mataji Nirmala Devi Ji', startTime: '19:00', endTime: '19:30', category: 'Meditation', priority: 'high', recurring: true, mandatory: true },
  { id: 'coding', title: 'Coding / Placement Preparation', startTime: '19:30', endTime: '21:30', category: 'Coding', priority: 'high', recurring: true },
  { id: 'dinner-break', title: 'Dinner / Break', startTime: '21:30', endTime: '22:00', category: 'Food', priority: 'low', recurring: true },
  { id: 'sleep-night', title: 'Sleep', startTime: '22:00', endTime: '04:00', category: 'Sleep', priority: 'medium', recurring: true },
]

export const createInitialState = (): AppState => ({
  version: 2,
  templates: [],
  taskOverrides: {},
  codingEntries: [],
  gateEntries: [],
  dailyNotes: {},
  subjects: ['Core subject', 'Engineering Mathematics', 'General Aptitude'],
  shownMotivationDates: [],
  settings: { displayName: 'Prabodh', theme: 'light', notifications: false, weekStartsMonday: true, targetName: 'GATE preparation', targetDate: '', targetGateHours: 600, targetCodingProblems: 250 },
})
