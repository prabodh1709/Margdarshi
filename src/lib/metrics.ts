import type { AppState, Category, DayMetrics, Task, TaskTemplate } from '../types'
import { addDays, daysBetween, durationMinutes, indiaDateKey } from './date'

const keyFor = (date: string, id: string) => `${date}:${id}`

export const tasksForDate = (state: AppState, date: string): Task[] => {
  const recurring = state.templates.filter((task) => task.recurring).map((template) => {
    const override = state.taskOverrides[keyFor(date, template.id)]
    // A completion is a dated fact; a one-day timeline edit is also preserved.
    return override?.scheduleOverride
      ? { ...template, ...override, date, sourceTemplateId: template.id }
      : { ...template, date, sourceTemplateId: template.id, completed: override?.completed ?? false, completedAt: override?.completedAt, deleted: override?.deleted }
  })
  const added = Object.values(state.taskOverrides).filter((task) => task.date === date && !task.sourceTemplateId && !task.deleted)
  return [...recurring, ...added].filter((task) => !task.deleted).sort((a, b) => a.startTime.localeCompare(b.startTime))
}

export const metricForDate = (state: AppState, date: string): DayMetrics => {
  const tasks = tasksForDate(state, date)
  const totalMinutes = tasks.reduce((sum, task) => sum + durationMinutes(task.startTime, task.endTime), 0)
  const completedMinutes = tasks.filter((task) => task.completed).reduce((sum, task) => sum + durationMinutes(task.startTime, task.endTime), 0)
  const taskGate = tasks.filter((task) => task.category === 'GATE' && task.completed).reduce((sum, task) => sum + durationMinutes(task.startTime, task.endTime), 0)
  const taskCoding = tasks.filter((task) => task.category === 'Coding' && task.completed).reduce((sum, task) => sum + durationMinutes(task.startTime, task.endTime), 0)
  const manualGate = state.gateEntries.filter((entry) => entry.date === date).reduce((sum, entry) => sum + entry.minutes, 0)
  const manualCoding = state.codingEntries.filter((entry) => entry.date === date).reduce((sum, entry) => sum + entry.minutes, 0)
  return {
    date, tasks, totalMinutes, completedMinutes,
    totalTasks: tasks.length, completedTasks: tasks.filter((task) => task.completed).length,
    gateMinutes: taskGate + manualGate, codingMinutes: taskCoding + manualCoding,
    meditationCompleted: tasks.filter((task) => task.category === 'Meditation' && task.completed).length,
    percent: totalMinutes ? Math.round((completedMinutes / totalMinutes) * 100) : 0,
  }
}

export const categoryMinutes = (state: AppState, date: string) => {
  const result: Record<Category, number> = { GATE: 0, Coding: 0, Meditation: 0, Sleep: 0, Food: 0, Break: 0, Personal: 0 }
  tasksForDate(state, date).filter((task) => task.completed).forEach((task) => { result[task.category] += durationMinutes(task.startTime, task.endTime) })
  state.gateEntries.filter((entry) => entry.date === date).forEach((entry) => { result.GATE += entry.minutes })
  state.codingEntries.filter((entry) => entry.date === date).forEach((entry) => { result.Coding += entry.minutes })
  return result
}

export const streakFor = (state: AppState, predicate: (metrics: DayMetrics) => boolean, referenceDate = indiaDateKey()) => {
  let current = 0
  let cursor = referenceDate
  while (predicate(metricForDate(state, cursor))) { current += 1; cursor = addDays(cursor, -1) }
  const earliest = Object.keys(state.taskOverrides).map((key) => key.slice(0, 10)).sort()[0] || referenceDate
  let longest = 0, run = 0, total = 0
  for (let date = earliest; daysBetween(date, referenceDate) >= 0; date = addDays(date, 1)) {
    if (predicate(metricForDate(state, date))) { run += 1; total += 1; longest = Math.max(longest, run) } else run = 0
  }
  return { current, longest, total }
}

export const lastNDays = (end: string, count: number) => Array.from({ length: count }, (_, index) => addDays(end, index - count + 1))
