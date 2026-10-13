import { describe, expect, it } from 'vitest'
import { createInitialState, LEGACY_DEFAULT_TEMPLATES } from './defaults'
import { addDays } from './date'
import { metricForDate, streakFor, tasksForDate } from './metrics'
import type { AppState } from '../types'

const completedDay = (state: AppState, date: string) => {
  const overrides = Object.fromEntries(tasksForDate(state, date).map((task) => [`${date}:${task.id}`, { ...task, completed: true, completedAt: `${date}T12:00:00.000Z` }]))
  return { ...state, taskOverrides: { ...state.taskOverrides, ...overrides } }
}
const routineState = (): AppState => ({ ...createInitialState(), templates: LEGACY_DEFAULT_TEMPLATES })

describe('routine metrics', () => {
  it('calculates completion from a user-created recurring timetable', () => {
    const state = routineState()
    const date = '2026-10-12'
    expect(tasksForDate(state, date)).toHaveLength(14)
    expect(metricForDate(state, date).percent).toBe(0)

    const gate = tasksForDate(state, date).find((task) => task.id === 'gate-main')!
    state.taskOverrides[`${date}:gate-main`] = { ...gate, completed: true, completedAt: '2026-10-12T06:30:00.000Z' }
    const metric = metricForDate(state, date)
    expect(metric.completedTasks).toBe(1)
    expect(metric.gateMinutes).toBe(150)
    expect(metric.percent).toBeGreaterThan(0)
  })

  it('keeps custom manual entries and scheduled completion in category metrics', () => {
    const state = routineState()
    const date = '2026-10-12'
    state.codingEntries.push({ id: 'problem-1', date, title: 'Two pointers', platform: 'Any', topic: 'Arrays', difficulty: 'Medium', minutes: 45, solved: true })
    state.gateEntries.push({ id: 'gate-entry', date, subject: 'Core subject', minutes: 35, pyqs: 2, mocks: 0, revisions: 1 })
    const metric = metricForDate(state, date)
    expect(metric.codingMinutes).toBe(45)
    expect(metric.gateMinutes).toBe(35)
  })

  it('honours a one-day timeline override without changing the recurring template', () => {
    const state = routineState()
    const date = '2026-10-12'
    const original = tasksForDate(state, date).find((task) => task.id === 'gate-main')!
    state.taskOverrides[`${date}:gate-main`] = { ...original, startTime: '07:15', endTime: '09:00', scheduleOverride: true, completed: false }
    expect(tasksForDate(state, date).find((task) => task.id === 'gate-main')?.startTime).toBe('07:15')
    expect(tasksForDate(state, '2026-10-13').find((task) => task.id === 'gate-main')?.startTime).toBe('06:00')
  })

  it('does not invent historical streaks and counts only successfully stored days', () => {
    const reference = '2026-10-12'
    let state = routineState()
    state = completedDay(state, addDays(reference, -2))
    state = completedDay(state, addDays(reference, -1))
    state = completedDay(state, reference)
    const streak = streakFor(state, (day) => day.percent >= 70, reference)
    expect(streak.current).toBe(3)
    expect(streak.longest).toBe(3)
    expect(streak.total).toBe(3)
  })
})
