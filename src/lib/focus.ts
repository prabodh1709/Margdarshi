import type { Task } from '../types'
import { durationMinutes, indiaClockParts, timeToMinutes } from './date'

export interface FocusStatus {
  task?: Task
  nextTask?: Task
  phase: 'active' | 'between' | 'tomorrow'
  remainingSeconds: number
  startsInMinutes?: number
  label: string
}

const isOvernight = (task: Task) => timeToMinutes(task.endTime) <= timeToMinutes(task.startTime)

/** Finds the active India-time session, including sleep that began on the previous day. */
export const getFocusStatus = (todayTasks: Task[], previousTasks: Task[], now = new Date()): FocusStatus => {
  const { hour, minute, second } = indiaClockParts(now)
  const nowSeconds = (hour * 60 + minute) * 60 + second
  const previousOvernight = previousTasks.find((task) => isOvernight(task) && nowSeconds < timeToMinutes(task.endTime) * 60)
  if (previousOvernight) return { task: previousOvernight, phase: 'active', remainingSeconds: timeToMinutes(previousOvernight.endTime) * 60 - nowSeconds, label: previousOvernight.completed ? 'Session recorded' : 'In progress' }

  const active = todayTasks.find((task) => {
    const start = timeToMinutes(task.startTime) * 60
    const end = timeToMinutes(task.endTime) * 60
    return isOvernight(task) ? nowSeconds >= start : nowSeconds >= start && nowSeconds < end
  })
  if (active) {
    const end = timeToMinutes(active.endTime) * 60
    const remainingSeconds = isOvernight(active) ? 86_400 - nowSeconds + end : end - nowSeconds
    return { task: active, phase: 'active', remainingSeconds, label: active.completed ? 'Session recorded' : 'In progress' }
  }

  const nextTask = todayTasks.find((task) => timeToMinutes(task.startTime) * 60 > nowSeconds)
  if (nextTask) return { nextTask, phase: 'between', remainingSeconds: timeToMinutes(nextTask.startTime) * 60 - nowSeconds, startsInMinutes: Math.ceil((timeToMinutes(nextTask.startTime) * 60 - nowSeconds) / 60), label: 'Next session' }
  const tomorrow = todayTasks[0]
  return { nextTask: tomorrow, phase: 'tomorrow', remainingSeconds: tomorrow ? 86_400 - nowSeconds + timeToMinutes(tomorrow.startTime) * 60 : 0, startsInMinutes: tomorrow ? Math.ceil((86_400 - nowSeconds + timeToMinutes(tomorrow.startTime) * 60) / 60) : undefined, label: 'Tomorrow' }
}

export const formatCountdown = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const remaining = safe % 60
  return [hours, minutes, remaining].map((part) => String(part).padStart(2, '0')).join(':')
}

export const taskTimelineWidth = (task: Task) => (durationMinutes(task.startTime, task.endTime) / 1440) * 100
