import { describe, expect, it } from 'vitest'
import { createInitialState, LEGACY_DEFAULT_TEMPLATES } from './defaults'
import { getFocusStatus } from './focus'
import { tasksForDate } from './metrics'

describe('focus timer', () => {
  it('counts down the active India-time task', () => {
    const state = { ...createInitialState(), templates: LEGACY_DEFAULT_TEMPLATES }
    const date = '2026-10-12'
    const status = getFocusStatus(tasksForDate(state, date), tasksForDate(state, '2026-10-11'), new Date('2026-10-12T01:15:00.000Z'))
    expect(status.task?.id).toBe('gate-main')
    expect(status.remainingSeconds).toBeGreaterThan(0)
  })

  it('finds sleep that began before India midnight', () => {
    const state = { ...createInitialState(), templates: LEGACY_DEFAULT_TEMPLATES }
    const status = getFocusStatus(tasksForDate(state, '2026-10-12'), tasksForDate(state, '2026-10-11'), new Date('2026-10-11T20:30:00.000Z'))
    expect(status.task?.id).toBe('sleep-night')
    expect(status.label).toBe('In progress')
  })
})
