import type { Task } from '../types'
import { formatDuration, formatTime, durationMinutes } from '../lib/date'

export function TaskRow({ task, onToggle, onEdit, onDelete, compact = false }: { task: Task; onToggle: (task: Task) => void; onEdit?: (task: Task) => void; onDelete?: (task: Task) => void; compact?: boolean }) {
  return <article className={`task-row ${task.completed ? 'complete' : ''}`}>
    <button className="check" onClick={() => onToggle(task)} aria-label={`${task.completed ? 'Reopen' : 'Complete'} ${task.title}`}><span>{task.completed ? '✓' : ''}</span></button>
    <div className="task-time"><b>{formatTime(task.startTime)}</b><small>{formatDuration(durationMinutes(task.startTime, task.endTime))}</small></div>
    <div className="task-info"><strong>{task.title}</strong><span className={`tag tag-${task.category.toLowerCase()}`}>{task.category}</span>{task.subject && <em>{task.subject}</em>}</div>
    {!compact && <div className="task-actions">
      {onEdit && <button className="text-button" onClick={() => onEdit(task)}>Edit</button>}
      {onDelete && !task.mandatory && <button className="text-button danger" onClick={() => onDelete(task)}>Delete</button>}
    </div>}
  </article>
}
