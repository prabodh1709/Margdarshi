
import { useEffect, useRef, useState } from 'react'
import type { Task } from '../types'
import { formatTime } from '../lib/date'
import { formatCountdown, getFocusStatus, type FocusStatus } from '../lib/focus'

type PiPWindow = Window & {
  documentPictureInPicture?: {
    requestWindow(options: { width: number; height: number }): Promise<Window>
  }
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>'"]/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[c]!)

export function FocusTimer({
  todayTasks,
  previousTasks,
  onComplete,
}: {
  todayTasks: Task[]
  previousTasks: Task[]
  onComplete?: (task: Task) => void
}) {
  const tasks = useRef({ todayTasks, previousTasks })
  const completeRef = useRef(onComplete)
  const [now, setNow] = useState(() => new Date())
  const [error, setError] = useState('')

  tasks.current = { todayTasks, previousTasks }
  completeRef.current = onComplete

  const status = getFocusStatus(todayTasks, previousTasks, now)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const openFloatingClock = async () => {
    setError('')

    const api = (window as PiPWindow).documentPictureInPicture

    if (!window.isSecureContext || !api) {
      setError('Floating mode unavailable here. Open Margadarshi at http://localhost:5173 in a supported desktop browser.')
      return
    }

    try {
      const pip = await api.requestWindow({ width: 360, height: 230 })
      let paused = false
      let frozenStatus: FocusStatus | null = null

      pip.document.head.innerHTML = `
        <title>Margadarshi Focus</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0; background: #173f34; color: #f3fff8;
            font-family: Arial, sans-serif;
          }
          main { padding: 17px 16px; min-height: 230px; }
          .top { display:flex; justify-content:space-between; align-items:center; }
          .brand { font-size:14px; font-weight:700; letter-spacing:.4px; }
          .label { margin-top:17px; font-size:12px; color:#c1dcd0; }
          h1 { font-size:20px; margin:7px 0 10px; line-height:1.2; }
          .time { font-size:39px; font-weight:700; letter-spacing:-1.5px; font-variant-numeric:tabular-nums; }
          .caption { color:#c1dcd0; font-size:12px; margin-top:3px; }
          .actions { display:flex; justify-content:space-between; gap:8px; margin-top:22px; }
          button {
            color:#f3fff8; background:transparent; border:0;
            padding:7px 0; font-size:14px; cursor:pointer;
          }
          button:hover { color:#a9e7c6; }
          .status { color:#a9e7c6; font-size:10px; }
        </style>`

      pip.document.body.innerHTML = `
        <main>
          <div class="top">
            <div class="brand">◷ MARGDARSHI FOCUS</div>
            <div class="status" id="state">LIVE</div>
          </div>
          <div class="label" id="label">CURRENT TASK</div>
          <h1 id="task">Loading…</h1>
          <div class="time" id="time">00:00:00</div>
          <div class="caption" id="caption">REMAINING TIME</div>
          <div class="actions">
            <button id="pause">Pause</button>
            <button id="complete">Complete</button>
            <button id="hide">Hide</button>
          </div>
        </main>`

      const render = () => {
        if (pip.closed) return

        const live = getFocusStatus(
          tasks.current.todayTasks,
          tasks.current.previousTasks,
          new Date(),
        )
        const shown = paused && frozenStatus ? frozenStatus : live
        const task = shown.task || shown.nextTask

        const setText = (id: string, value: string) => {
          const element = pip.document.getElementById(id)
          if (element) element.textContent = value
        }

        setText('state', paused ? 'PAUSED' : 'LIVE')
        setText('label', shown.task ? 'CURRENT TASK' : 'UP NEXT')
        setText('task', task?.title || 'No task scheduled')
        setText('time', formatCountdown(shown.remainingSeconds))
        setText(
          'caption',
          shown.task
            ? `${formatTime(shown.task.startTime)} – ${formatTime(shown.task.endTime)}`
            : task
              ? `STARTS AT ${formatTime(task.startTime)}`
              : 'Add a task to your schedule',
        )

        const pauseButton = pip.document.getElementById('pause')
        if (pauseButton) pauseButton.textContent = paused ? 'Resume' : 'Pause'

        const completeButton = pip.document.getElementById('complete') as HTMLButtonElement | null
        if (completeButton) completeButton.disabled = !shown.task || !completeRef.current
      }

      pip.document.body.addEventListener('click', (event) => {
        const target = event.target as HTMLElement
        if (target.closest('#pause')) {
          if (!paused) {
            frozenStatus = getFocusStatus(
              tasks.current.todayTasks,
              tasks.current.previousTasks,
              new Date(),
            )
            paused = true
          } else {
            paused = false
            frozenStatus = null
          }
          render()
        }

        if (target.closest('#complete')) {
          const live = getFocusStatus(
            tasks.current.todayTasks,
            tasks.current.previousTasks,
            new Date(),
          )
          if (live.task) completeRef.current?.(live.task)
          paused = false
          frozenStatus = null
          render()
        }

        if (target.closest('#hide')) pip.close()
      })

      render()
      const interval = pip.setInterval(render, 1000)
      pip.addEventListener('pagehide', () => pip.clearInterval(interval), { once: true })
    } catch {
      setError('Could not open floating mode. Try Chrome on this computer using localhost.')
    }
  }

  return (
    <article className="focus-timer card">
      <div>
        <div className="card-label">
          <span className="timer-dot" /> {status.label} · India time
        </div>
        <h2>{status.task?.title || status.nextTask?.title || 'No task scheduled'}</h2>
        <p>
          {status.task
            ? `${formatTime(status.task.startTime)} – ${formatTime(status.task.endTime)}`
            : status.nextTask
              ? `Starts at ${formatTime(status.nextTask.startTime)}`
              : 'Create a task to begin.'}
        </p>
      </div>

      <div className="countdown">
        <strong>{formatCountdown(status.remainingSeconds)}</strong>
        <span>
          {status.task?.completed
            ? 'recorded'
            : status.task
              ? 'remaining'
              : 'until start'}
        </span>
      </div>

      <div className="focus-actions">
        <button className="button quiet" onClick={openFloatingClock}>
          Open floating clock
        </button>
      </div>

      {error && <p role="status">{error}</p>}
    </article>
  )
}
