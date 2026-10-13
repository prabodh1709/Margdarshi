import { useEffect, useRef, useState } from 'react'
import type { Task } from '../types'
import { formatTime } from '../lib/date'
import { formatCountdown, getFocusStatus, type FocusStatus } from '../lib/focus'

type PictureInPictureApi = { requestWindow(options: { width: number; height: number }): Promise<Window> }
type PIPWindow = Window & { documentPictureInPicture?: PictureInPictureApi }
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character] || character))

export function FocusTimer({ todayTasks, previousTasks }: { todayTasks: Task[]; previousTasks: Task[] }) {
  const [showOverlay, setShowOverlay] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const tasks = useRef({ todayTasks, previousTasks })
  const [pipSupported] = useState(() => Boolean((window as PIPWindow).documentPictureInPicture))
  tasks.current = { todayTasks, previousTasks }
  const status = getFocusStatus(todayTasks, previousTasks, now)
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1_000); return () => window.clearInterval(timer) }, [])

  const openFloatingClock = async () => {
    const api = (window as PIPWindow).documentPictureInPicture
    if (!api) { setShowOverlay(true); return }
    try {
      const pip = await api.requestWindow({ width: 360, height: 230 })
      let interval = 0
      const render = () => {
        const live = getFocusStatus(tasks.current.todayTasks, tasks.current.previousTasks, new Date())
        const task = live.task || live.nextTask
        pip.document.title = 'MARGDARSHI Focus Clock'
        pip.document.body.innerHTML = `<main><p class="eyebrow">${live.label} · INDIA TIME</p><h1>${escapeHtml(task?.title || 'No task scheduled')}</h1><p class="time">${formatCountdown(live.remainingSeconds)}</p><p class="sub">${live.task ? `${formatTime(live.task.startTime)} – ${formatTime(live.task.endTime)}` : task ? `Starts at ${formatTime(task.startTime)}` : 'Customize your timetable'}</p><p class="hint">Keep this window above other work. It updates every second.</p></main>`
      }
      pip.document.head.innerHTML = '<style>body{margin:0;background:#14201d;color:#ecf5ef;font-family:Arial,sans-serif}main{min-height:100vh;box-sizing:border-box;padding:25px;background:radial-gradient(circle at 100% 0,#35694f 0,transparent 45%)}.eyebrow{font-size:10px;letter-spacing:1.4px;color:#aecbb8;font-weight:700;margin:0 0 14px}h1{font-size:19px;line-height:1.3;margin:0;max-width:290px}.time{font-family:ui-monospace,monospace;font-size:42px;letter-spacing:-2px;margin:24px 0 3px}.sub{font-size:12px;color:#c9ddd0;margin:0}.hint{position:absolute;bottom:17px;color:#9cb6a5;font-size:10px;margin:0}</style>'
      render(); interval = pip.setInterval(render, 1000)
      pip.addEventListener('pagehide', () => pip.clearInterval(interval), { once: true })
    } catch { setShowOverlay(true) }
  }

  return <>
    <article className="focus-timer card">
      <div><div className="card-label"><span className="timer-dot" /> {status.label} · India time</div><h2>{status.task?.title || status.nextTask?.title || 'No task scheduled'}</h2><p>{status.task ? `${formatTime(status.task.startTime)} – ${formatTime(status.task.endTime)}` : status.nextTask ? `Starts at ${formatTime(status.nextTask.startTime)}` : 'Create a task to begin.'}</p></div>
      <div className="countdown"><strong>{formatCountdown(status.remainingSeconds)}</strong><span>{status.task?.completed ? 'recorded' : status.task ? 'remaining' : 'until start'}</span></div>
      <div className="focus-actions"><button className="button quiet" onClick={openFloatingClock}>{pipSupported ? 'Open floating clock' : 'Open focus view'}</button><button className="text-button" onClick={() => setShowOverlay(true)}>Expand</button></div>
    </article>
    {showOverlay && <div className="focus-overlay" role="dialog" aria-modal="true" aria-label="Focus timer"><button className="close overlay-close" onClick={() => setShowOverlay(false)} aria-label="Close focus timer">×</button><div className="focus-overlay-copy"><p>{status.label} · INDIA TIME</p><h2>{status.task?.title || status.nextTask?.title || 'No task scheduled'}</h2><strong>{formatCountdown(status.remainingSeconds)}</strong><span>{status.task ? `${formatTime(status.task.startTime)} – ${formatTime(status.task.endTime)}` : status.nextTask ? `Starts at ${formatTime(status.nextTask.startTime)}` : ''}</span><small>This in-app focus view is the fallback when floating Picture-in-Picture is unavailable.</small></div></div>}
  </>
}
