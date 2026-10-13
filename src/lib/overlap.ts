import type { Task, TaskTemplate } from '../types'
import { timeToMinutes } from './date'

type Timed = Pick<TaskTemplate, 'startTime' | 'endTime'>

const intervals = (task: Timed): [number, number][] => {
  const start = timeToMinutes(task.startTime)
  const end = timeToMinutes(task.endTime)
  if (start === end) return [[0, 1440]]
  return end > start ? [[start, end]] : [[start, 1440], [0, end]]
}

export const tasksOverlap = (first: Timed, second: Timed) => intervals(first).some(([startA, endA]) => intervals(second).some(([startB, endB]) => startA < endB && startB < endA))

export const findOverlaps = (drafts: TaskTemplate[], existing: Task[]) => {
  const existingConflicts = existing.filter((task) => drafts.some((draft) => tasksOverlap(draft, task)))
  const draftsConflict = drafts.some((draft, index) => drafts.slice(index + 1).some((other) => tasksOverlap(draft, other)))
  return { existingConflicts, draftsConflict }
}
