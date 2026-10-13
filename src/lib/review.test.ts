import { describe, expect, it } from 'vitest'
import { createInitialState, LEGACY_DEFAULT_TEMPLATES } from './defaults'
import { analyzeDay } from './review'
import { tasksForDate } from './metrics'

describe('end-of-day analyzer', () => {
  it('identifies outstanding work and activates at the India closing window', () => {
    const state = { ...createInitialState(), templates: LEGACY_DEFAULT_TEMPLATES }
    const date = '2026-10-12'
    const first = tasksForDate(state, date)[0]
    state.taskOverrides[`${date}:${first.id}`] = { ...first, completed: true, completedAt: `${date}T05:00:00.000Z` }
    const analysis = analyzeDay(state, date, 21 * 60 + 30)
    expect(analysis.isClosingWindow).toBe(true)
    expect(analysis.completed).toHaveLength(1)
    expect(analysis.missed.length).toBeGreaterThan(0)
    expect(analysis.nextPlan.length).toBeGreaterThan(0)
  })

  it('translates a configured deadline into a daily GATE workload', () => {
    const state = { ...createInitialState(), templates: LEGACY_DEFAULT_TEMPLATES }
    state.settings.targetName = 'GATE 2027'
    state.settings.targetDate = '2026-11-11'
    state.settings.targetGateHours = 60
    const analysis = analyzeDay(state, '2026-10-12', 22 * 60)
    expect(analysis.targetSummary).toContain('30 days left')
    expect(analysis.nextPlan.some((item) => item.includes('GATE'))).toBe(true)
  })
})
