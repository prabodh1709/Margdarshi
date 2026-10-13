import { describe, expect, it } from 'vitest'
import { tasksOverlap } from './overlap'

describe('task overlap detection', () => {
  it('detects ordinary and overnight time conflicts but allows adjacent tasks', () => {
    expect(tasksOverlap({ startTime: '09:00', endTime: '10:00' }, { startTime: '09:30', endTime: '10:30' })).toBe(true)
    expect(tasksOverlap({ startTime: '09:00', endTime: '10:00' }, { startTime: '10:00', endTime: '11:00' })).toBe(false)
    expect(tasksOverlap({ startTime: '22:00', endTime: '04:00' }, { startTime: '03:00', endTime: '05:00' })).toBe(true)
  })
})
