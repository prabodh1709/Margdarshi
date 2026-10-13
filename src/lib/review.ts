import type { AppState, Category, DayMetrics, Task } from '../types'
import { daysBetween, durationMinutes, indiaMinutes } from './date'
import { categoryMinutes, metricForDate } from './metrics'

const categoryNames: Record<Category, string> = { GATE: 'GATE preparation', Coding: 'coding practice', Meditation: 'meditation', Sleep: 'sleep', Food: 'meals', Break: 'breaks', Personal: 'personal work' }

export interface DailyAnalysis {
  isClosingWindow: boolean
  isDayClosed: boolean
  completed: Task[]
  missed: Task[]
  score: number
  bestCategory: string
  weakestCategory: string
  nextPlan: string[]
  targetSummary?: string
}

export const analyzeDay = (state: AppState, date: string, nowMinutes = indiaMinutes()): DailyAnalysis => {
  const day: DayMetrics = metricForDate(state, date)
  const completed = day.tasks.filter((task) => task.completed)
  const missed = day.tasks.filter((task) => !task.completed)
  const planned = day.tasks.reduce<Record<Category, number>>((totals, task) => ({ ...totals, [task.category]: totals[task.category] + durationMinutes(task.startTime, task.endTime) }), { GATE: 0, Coding: 0, Meditation: 0, Sleep: 0, Food: 0, Break: 0, Personal: 0 })
  const actual = categoryMinutes(state, date)
  const meaningful = (Object.keys(planned) as Category[]).filter((category) => ['GATE', 'Coding', 'Meditation', 'Personal'].includes(category) && planned[category] > 0)
  const best = meaningful.slice().sort((a, b) => actual[b] - actual[a])[0] || 'Personal'
  const weakest = meaningful.slice().sort((a, b) => (actual[a] / planned[a]) - (actual[b] / planned[b]))[0] || 'Personal'
  const carryForward = missed.filter((task) => task.priority === 'high' || task.mandatory).slice(0, 3)
  const nextPlan = carryForward.map((task) => `Carry forward: ${task.title} (${task.category})`)
  if (!nextPlan.length && day.percent < 70) nextPlan.push('Protect the first high-priority GATE block before adding anything new.')
  if (!nextPlan.length) nextPlan.push('Keep the same opening routine and increase the quality of the hardest study block.')
  let targetSummary: string | undefined
  if (state.settings.targetDate) {
    const daysLeft = Math.max(0, daysBetween(date, state.settings.targetDate))
    const gateHoursDone = state.gateEntries.reduce((sum, entry) => sum + entry.minutes, 0) / 60 + Object.keys(state.taskOverrides).map((key) => key.slice(0, 10)).filter((key, index, keys) => keys.indexOf(key) === index).reduce((sum, trackedDate) => sum + metricForDate(state, trackedDate).tasks.filter((task) => task.completed && task.category === 'GATE').reduce((inner, task) => inner + durationMinutes(task.startTime, task.endTime), 0), 0) / 60
    const remaining = Math.max(0, state.settings.targetGateHours - gateHoursDone)
    const dailyNeed = daysLeft ? Math.ceil((remaining / daysLeft) * 10) / 10 : remaining
    targetSummary = daysLeft > 0 ? `${daysLeft} days left for ${state.settings.targetName}. At your ${state.settings.targetGateHours}h target, protect about ${dailyNeed} focused GATE hours per day from here.` : `${state.settings.targetName} is due today. Finish the highest-yield pending work first.`
    if (dailyNeed > 0 && !nextPlan.some((line) => line.includes('GATE'))) nextPlan.push(`Reserve ${dailyNeed} focused GATE hours tomorrow to stay on target.`)
  }
  return { isClosingWindow: nowMinutes >= 21 * 60 + 30, isDayClosed: nowMinutes >= 23 * 60 + 55, completed, missed, score: day.percent, bestCategory: categoryNames[best], weakestCategory: categoryNames[weakest], nextPlan, targetSummary }
}
