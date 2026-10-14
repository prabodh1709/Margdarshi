import Auth from './Auth'
import { useEffect, useMemo, useState, type FormEvent } from 'react'

import type { AppState, Category, CodingEntry, GateEntry, Priority, Task, TaskTemplate, View } from './types'

import { addDays, addMonths, durationMinutes, formatDate, formatDuration, formatMonth, fromDateKey, indiaClockParts, indiaDateKey, indiaMinutes, startOfWeek } from './lib/date'

import { categoryMinutes, lastNDays, metricForDate, streakFor, tasksForDate } from './lib/metrics'

import { getCloudUser, loadLocalState, readCloudState, saveLocalState, sendMagicLink, signOutCloud, supabase, writeCloudState } from './lib/storage'

import { motivationFor } from './lib/motivation'

import { analyzeDay } from './lib/review'

import { Breakdown, Heatmap, HoursChart, ProgressRing } from './components/Charts'

import { TaskRow } from './components/TaskRow'

import { FocusTimer } from './components/FocusTimer'

type CalendarMode = 'month' | 'week' | 'day'

type TaskForm = Omit<TaskTemplate, 'id'> & { id?: string }

const categories: Category[] = ['GATE', 'Coding', 'Meditation', 'Sleep', 'Food', 'Break', 'Personal']

const blankForm = (): TaskForm => ({ title: '', startTime: '09:00', endTime: '10:00', category: 'Personal', priority: 'medium', recurring: false, notes: '' })

const uid = () => crypto.randomUUID?.() ?? `task-${Date.now()}-${Math.random().toString(16).slice(2)}`

export default function App() {

  const [state, setState] = useState<AppState>(loadLocalState)
  const [authSession, setAuthSession] = useState<boolean | null>(null)

  const [view, setView] = useState<View>('dashboard')

  const [selectedDate, setSelectedDate] = useState<string>(indiaDateKey)

  const [calendarMode, setCalendarMode] = useState<CalendarMode>('month')

  const [clock, setClock] = useState(new Date())

  const [toast, setToast] = useState('')

  const [editing, setEditing] = useState<Task | null>(null)

  const [showTaskForm, setShowTaskForm] = useState(false)

  const [applyScheduleChange, setApplyScheduleChange] = useState(true)

  const [taskForm, setTaskForm] = useState<TaskForm>(blankForm)

  const [codingDays, setCodingDays] = useState<7 | 30>(7)

  const [progressTab, setProgressTab] = useState<'overview' | 'gate' | 'coding'>('overview')

  const [codingForm, setCodingForm] = useState({ title: '', platform: '', topic: '', difficulty: 'Medium' as CodingEntry['difficulty'], minutes: 45, solved: true })

  const [gateForm, setGateForm] = useState({ subject: 'Core subject', minutes: 60, pyqs: 0, mocks: 0, revisions: 0, note: '' })

  const [showCoding, setShowCoding] = useState(false)

  const [showGate, setShowGate] = useState(false)

  const [email, setEmail] = useState('')

  const [userEmail, setUserEmail] = useState<string | null>(null)

  const [cloudUserId, setCloudUserId] = useState<string | null>(null)

  const [cloudReady, setCloudReady] = useState(false)

  const [syncBusy, setSyncBusy] = useState(false)

  const [showTargetSettings, setShowTargetSettings] = useState(false)

  const today = indiaDateKey(clock)

  const todayMetrics = useMemo(() => metricForDate(state, today), [state, today])

  const selectedMetrics = useMemo(() => metricForDate(state, selectedDate), [state, selectedDate])

  const overallStreak = useMemo(() => streakFor(state, (day) => day.percent >= 70), [state])

  const gateStreak = useMemo(() => streakFor(state, (day) => day.gateMinutes >= 120), [state])

  const codingStreak = useMemo(() => streakFor(state, (day) => day.codingMinutes >= 30), [state])

  const meditationStreak = useMemo(() => streakFor(state, (day) => day.meditationCompleted === 2), [state])

  const motivation = useMemo(() => motivationFor(todayMetrics, state.settings.displayName), [todayMetrics, state.settings.displayName])

  const todayAnalysis = useMemo(() => analyzeDay(state, today, indiaMinutes(clock)), [state, today, clock])

  const todayTasks = useMemo(() => tasksForDate(state, today), [state, today])

  const previousDayTasks = useMemo(() => tasksForDate(state, addDays(today, -1)), [state, today])

  const indiaTime = indiaClockParts(clock)

  useEffect(() => { const timer = window.setInterval(() => setClock(new Date()), 60_000); return () => clearInterval(timer) }, [])

  useEffect(() => { document.documentElement.dataset.theme = state.settings.theme; saveLocalState(state) }, [state])

  useEffect(() => {
    let live = true

    const initializeSession = async () => {
      const user = await getCloudUser()
      if (!live) return

      setAuthSession(Boolean(user))
      if (!user) {
        setCloudReady(true)
        return
      }

      setUserEmail(user.email ?? 'Connected account')
      setCloudUserId(user.id)
      try {
        const remote = await readCloudState(user.id)
        if (remote && live) setState(remote)
      } catch {
        if (live) setToast('Cloud sync is connected, but the database is not ready yet.')
      }
      if (live) setCloudReady(true)
    }

    void initializeSession().catch(() => {
      if (live) {
        setAuthSession(false)
        setCloudReady(true)
      }
    })

    const { data } = supabase?.auth.onAuthStateChange((_event, session) => {
      setAuthSession(Boolean(session))
      setUserEmail(session?.user.email ?? null)

      if (!session?.user) {
        setCloudUserId(null)
        setCloudReady(false)
        return
      }

      const userId = session.user.id
      setCloudReady(false)
      setCloudUserId(userId)
      void readCloudState(userId).then((remote) => {
        if (!live) return
        if (remote) setState(remote)
        setCloudReady(true)
      }).catch(() => {
        if (!live) return
        setToast('Cloud sync is connected, but the database is not ready yet.')
        setCloudReady(true)
      })
    }) ?? { data: { subscription: { unsubscribe: () => undefined } } }

    return () => {
      live = false
      data.subscription.unsubscribe()
    }
  }, [])
  useEffect(() => {

    if (!cloudReady || !cloudUserId) return

    const timer = window.setTimeout(() => { writeCloudState(cloudUserId, state).catch(() => setToast('Saved locally. Cloud sync will retry on the next update.')) }, 750)

    return () => window.clearTimeout(timer)

  }, [cloudReady, cloudUserId, state])

  useEffect(() => {

    if (!state.settings.notifications || Notification.permission !== 'granted') return

    const notify = () => {

      const now = new Date(); const minutes = indiaMinutes(now)

      tasksForDate(state, indiaDateKey(now)).filter((task) => !task.completed).forEach((task) => {

        const [hour, minute] = task.startTime.split(':').map(Number)

        if (hour * 60 + minute - minutes === 5)

          {

          const key = `margdarshi-notified-${indiaDateKey(now)}-${task.id}`

          if (!sessionStorage.getItem(key)) { new Notification('MARGDARSHI', { body: `${task.title} starts in 5 minutes.` }); sessionStorage.setItem(key, '1') }

        }

      })

    }

    notify(); const timer = window.setInterval(notify, 60_000); return () => clearInterval(timer)

  },

  [state])

  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 2600); return () => clearTimeout(timer) }, [toast])

  const modify = (fn: (previous: AppState) => AppState) => setState((previous) => fn(previous))

  const keyFor = (date: string, id: string) => `${date}:${id}`

  const toggleTask = (task: Task) => {

    modify((previous) => {

      const key = keyFor(task.date, task.sourceTemplateId ?? task.id)

      const updated: Task = { ...task, completed: !task.completed, completedAt: task.completed ? undefined : new Date().toISOString() }

      return { ...previous, taskOverrides: { ...previous.taskOverrides, [key]: updated } }

    })

    setToast(task.completed ? 'Task reopened — your progress has been updated.' : 'Session completed. Stay steady.')

  }

  const openTaskForm = (task?: Task) => {

    if (task) { setEditing(task); setApplyScheduleChange(true); const { date: _date, completed: _completed, completedAt: _at, sourceTemplateId: _source, deleted: _deleted, scheduleOverride: _override, ...fields } = task; setTaskForm(fields) }

    else { setEditing(null); setApplyScheduleChange(true); setTaskForm(blankForm()) }

    setShowTaskForm(true)

  }

  const saveTask = (event: FormEvent) => {

    event.preventDefault()

    if (!taskForm.title.trim()) return

    modify((previous) => {

      const fields: TaskTemplate = { id: taskForm.id || uid(), title: taskForm.title.trim(), startTime: taskForm.startTime, endTime: taskForm.endTime, category: taskForm.category, priority: taskForm.priority, recurring: taskForm.recurring, mandatory: editing?.mandatory, subject: taskForm.subject, notes: taskForm.notes }

      if (editing?.sourceTemplateId && applyScheduleChange) {

        return { ...previous, templates: previous.templates.map((template) => template.id === editing.sourceTemplateId ? { ...fields, id: template.id, mandatory: template.mandatory } : template) }

      }

      if (editing?.sourceTemplateId) {

        const key = keyFor(editing.date, editing.sourceTemplateId)

        const existing = previous.taskOverrides[key]

        return { ...previous, taskOverrides: { ...previous.taskOverrides, [key]: { ...fields, id: editing.sourceTemplateId, date: editing.date, sourceTemplateId: editing.sourceTemplateId, scheduleOverride: true, completed: existing?.completed ?? editing.completed, completedAt: existing?.completedAt ?? editing.completedAt } } }

      }

      if (editing) {

        const key = keyFor(editing.date, editing.id)

        return { ...previous, taskOverrides: { ...previous.taskOverrides, [key]: { ...fields, date: editing.date, completed: editing.completed, completedAt: editing.completedAt } } }

      }

      if (fields.recurring) return { ...previous, templates: [...previous.templates, fields] }

      const task: Task = { ...fields, date: selectedDate, completed: false }

      return { ...previous, taskOverrides: { ...previous.taskOverrides, [keyFor(selectedDate, task.id)]: task } }

    })

    setShowTaskForm(false); setToast(editing ? 'Schedule updated.' : 'Task added to your routine.')

  }

  const deleteTask = (task: Task) => {

    if (task.mandatory) return

    modify((previous) => {

      if (task.sourceTemplateId) return { ...previous, templates: previous.templates.filter((template) => template.id !== task.sourceTemplateId) }

      const key = keyFor(task.date, task.id); const copy = { ...previous.taskOverrides }; delete copy[key]

      return { ...previous, taskOverrides: copy }

    })

    setToast('Task removed from the schedule.')

  }

  const addCoding = (event: FormEvent) => {

    event.preventDefault(); if (!codingForm.title.trim()) return

    const entry: CodingEntry = { id: uid(), date: selectedDate, ...codingForm, minutes: Number(codingForm.minutes) }

    modify((previous) => ({ ...previous, codingEntries: [...previous.codingEntries, entry] }))

    setCodingForm({ title: '', platform: '', topic: '', difficulty: 'Medium', minutes: 45, solved: true }); setShowCoding(false); setToast('Coding work recorded.')

  }

  const addGate = (event: FormEvent) => {

    event.preventDefault()

    const entry: GateEntry = { id: uid(), date: selectedDate, ...gateForm, minutes: Number(gateForm.minutes), pyqs: Number(gateForm.pyqs), mocks: Number(gateForm.mocks), revisions: Number(gateForm.revisions) }

    modify((previous) => ({ ...previous, gateEntries: [...previous.gateEntries, entry] }))

    setGateForm({ subject: state.subjects[0] || 'Core subject', minutes: 60, pyqs: 0, mocks: 0, revisions: 0, note: '' }); setShowGate(false); setToast('GATE study entry recorded.')

  }

  const enableNotifications = async () => {

    if (!('Notification' in window)) { setToast('This browser does not support notifications.'); return }

    const permission = await Notification.requestPermission()

    modify((previous) => ({ ...previous, settings: { ...previous.settings, notifications: permission === 'granted' } }))

    setToast(permission === 'granted' ? 'Focus reminders enabled.' : 'Notification permission was not granted.')

  }

  const sync = async () => {

    if (!supabase) { setToast('Add Supabase variables to enable cross-device sync.'); return }

    setSyncBusy(true)

    try {

      const user = await getCloudUser()

      if (user) { await writeCloudState(user.id, state); setCloudUserId(user.id); setCloudReady(true); setToast('Your command center is synced.') }

      else if (email) { await sendMagicLink(email); setToast('Magic link sent. Open it on this device to connect sync.') }

      else setToast('Enter your email for a secure magic link.')

    } catch (error) { setToast(error instanceof Error ? error.message : 'Could not sync right now.') } finally { setSyncBusy(false) }

  }

  const navigateDate = (amount: number) => setSelectedDate((date) => calendarMode === 'month' ? addMonths(date, amount) : addDays(date, amount * (calendarMode === 'week' ? 7 : 1)))

  const updateNote = (field: 'reflection' | 'tomorrowPriority', value: string) => modify((previous) => ({ ...previous, dailyNotes: { ...previous.dailyNotes, [selectedDate]: { date: selectedDate, reflection: previous.dailyNotes[selectedDate]?.reflection || '', tomorrowPriority: previous.dailyNotes[selectedDate]?.tomorrowPriority || '', [field]: value } } }))

  const changeSubject = (value: string) => modify((previous) => ({ ...previous, subjects: previous.subjects.includes(value) || !value.trim() ? previous.subjects : [...previous.subjects, value.trim()] }))

  const addSubject = () => { const name = window.prompt('Add a GATE subject'); if (name) { changeSubject(name); setToast('Subject added.') } }

  const Navigation = () => <nav className="navigation" aria-label="Main navigation">

    <div className="brand">

      <span className="brand-mark">M</span>

      <div><b>MARGDARSHI</b>

      <small>Discipline, measured.</small>

      </div>

    </div>

    <div className="nav-links">{

    ([     ['dashboard', '⌂', 'Dashboard'], ['calendar', '□', 'Calendar'], ['tasks', '✓', 'Tasks'], ['progress', '◔', 'Progress'], ['motivation', '✦', 'Motivation'],] as [View, string, string][])

    .map(([id, icon, label]) =>

       <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}><i>{icon}</i>

     <span>{label}</span>

     </button>)}

     </div>

    <div className="sidebar-bottom">

      <button className="theme-toggle"

       onClick={() => modify((p) => ({ ...p, settings: { ...p.settings, theme: p.settings.theme === 'light' ? 'dark' : 'light' } }))}>

        {state.settings.theme === 'light' ? '◐' : '☀'}

        {state.settings.theme === 'light' ? 'Dark mode' : 'Light mode'}

        </button>

        <small>{userEmail ? `Synced as ${userEmail}` : 'Offline-first private storage'}

        </small>

        </div>

  </nav>

  const Header = ({ title, action }:

    { title: string; action?: import('react').ReactNode }) => <header className="page-header">

      <div><p className="eyebrow">

        { formatDate(today, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' } )} </p><h1>{title}</h1>

    </div>

        <div className="header-actions">

          <span className="live-time">{String(indiaTime.hour).padStart(2, '0')}:{String(indiaTime.minute).padStart(2, '0')} IST

          </span>{action}

        </div>

     </header>

  const AnalyzerCard =

  ({ date, analysis = analyzeDay(state, date, date === today ? indiaMinutes(clock) : 24 * 60) }:

   { date: string; analysis?: ReturnType<typeof analyzeDay> })=> <article className={`card analyzer-card ${analysis.isClosingWindow ? 'active' : ''}`}>

    <div className="analyzer-head"><div>

      <div className="card-label">

        <span className="spark">✦

        </span> End-of-day analyzer · India time

      </div>

          <h2>{analysis.isDayClosed ? 'Day closed — tomorrow is prepared.' : analysis.isClosingWindow ? 'Closing window: your next plan is ready.' : 'Your day will be analyzed automatically at 9:30 PM IST.'}</h2></div>

            <div className="score-chip">

              <b>{analysis.score}%</b>

              <span>today</span>

            </div>

    </div>

    <div className="analysis-grid">

      <div>

        <span>Completed</span>

        <b>{analysis.completed.length} sessions</b>

        <small>Strongest: {analysis.bestCategory} </small>

      </div>

        <div>

          <span>Remaining</span>

          <b>{analysis.missed.length} sessions</b>

          <small>Needs attention: {analysis.weakestCategory}</small>

        </div>

          <div>

            <span>Next working plan</span>

            {analysis.nextPlan.slice(0, 2).map((item) => <small className="plan-line" key={item}>{item}</small>)}

          </div>

    </div>

    {analysis.targetSummary && <p className="target-summary">{analysis.targetSummary}</p>}

    <div className="analyzer-actions">

      <button className="button quiet" onClick={() => setShowTargetSettings(true)}>Set target & deadline</button>

        <button className="text-button" onClick={() =>

           { setView('calendar'); setSelectedDate(date); setCalendarMode('day') }}> Open full review →

        </button>

    </div>

  </article>

  const Dashboard = () =>

    {

      const category = categoryMinutes(state, today)

      const nextTask = todayMetrics.tasks.find((task) => !task.completed)

       return <section className="page dashboard-page">

        <Header title={`Good ${indiaTime.hour < 12 ? 'morning' : indiaTime.hour < 17 ? 'afternoon' : 'evening'},

         ${state.settings.displayName}.`}

         action={

         <button className="button quiet" onClick={enableNotifications}>

          {state.settings.notifications ? 'Reminders on' : 'Enable reminders'}

         </button>} />

      <div className="hero-grid">

  <article className="card focus-card">

          <div className="card-label">Today’s progress</div>

          <ProgressRing value={todayMetrics.percent} label="routine complete" detail="routine complete" />

        <div className="focus-copy"><strong>{todayMetrics.completedTasks} of {todayMetrics.totalTasks} tasks done</strong>

          <p>{nextTask ? <>Next: <b>{nextTask.title}</b> at {nextTask.startTime}</> : 'Every planned task is complete. Finish deliberately.'}</p>

        </div>

  </article>

        <article className="card ai-card">

<div className="card-label">

  <span className="spark">✦</span> MARGDARSHI AI

</div>

<h2>{motivation.hindi}</h2>

<p className="dashboard-motivation-translation">

  {motivation.message}

</p>

<div className="dashboard-motivation-shloka">

  <p>{motivation.shloka}</p>

  <small>{motivation.attribution}</small>

  <p className="dashboard-motivation-meaning">

    <strong>अर्थ:</strong> {motivation.meaning}

  </p>

</div>

<p className="dashboard-motivation-application">

  <strong>आज का अभ्यास:</strong> {motivation.apply}

</p>

<button

  className="text-button"

  onClick={() => setView('motivation')}

>

  Open daily guidance →

</button>

        </article>

      </div>

      <div className="stat-grid">

        <Stat label="GATE study" value={`${(todayMetrics.gateMinutes / 60).toFixed(1)}h`} sub="of 10h planned" tone="green" />

        <Stat label="Coding" value={`${(todayMetrics.codingMinutes / 60).toFixed(1)}h`} sub="of 2h planned" tone="blue" />

        <Stat label="Meditation" value={`${todayMetrics.meditationCompleted} / 2`} sub="mandatory sessions" tone="amber" />

        <Stat label="Routine streak" value={`${overallStreak.current} days`} sub={`best: ${overallStreak.longest} days`} tone="rose" />

      </div>

      <FocusTimer

  todayTasks={todayTasks}

  previousTasks={previousDayTasks}

  onComplete={toggleTask}

/>

      <div className="content-grid dashboard-grid">

<article className="card schedule-card">

  <div className="card-title">

    <div>

      <div className="card-label">Today’s rhythm</div>

        <h2>Schedule</h2>

          </div>

           <button className="text-button" onClick={() => {

            setView('tasks');

            setSelectedDate(today) }}>

            Manage schedule →

          </button>

  </div>

              <div className="schedule-list">

                {todayMetrics.tasks.map((task) =>

                <TaskRow task={task} onToggle={toggleTask} key={task.id} compact />)}

              </div>

</article>

  <div className="side-stack">

    <article className="card">

      <div className="card-title">

        <div>

        <div className="card-label">Seven-day view</div>

         <h2>GATE hours</h2>

        </div>

        <b>{(lastNDays(today, 7).reduce((sum, date) =>

          sum + metricForDate(state, date).gateMinutes, 0) / 60).toFixed(1)}</b>

      </div><HoursChart state={state} type="GATE" />

    </article>

<article className="card">

  <div className="card-title">

    <div>

      <div className="card-label">Completed time</div>

        <h2>Today’s focus mix</h2>

        </div>

  </div><Breakdown values={[{ label: 'GATE', minutes: category.GATE, className: 'green' },

                { label: 'Coding', minutes: category.Coding, className: 'blue' },

                { label: 'Meditation', minutes: category.Meditation, className: 'amber' },

                { label: 'Other', minutes: category.Sleep + category.Food + category.Break + category.Personal, className: 'slate' }]} />

</article>

  </div>

  </div><AnalyzerCard date={today} analysis={todayAnalysis} /></section>

  }

  const Calendar = () => {

    const monthStart = `${selectedDate.slice(0, 7)}-01`

    const weekdayOffset = (fromDateKey(monthStart).getDay() + (state.settings.weekStartsMonday ? 6 : 0)) % 7

    const daysInMonth = new Date(fromDateKey(monthStart).getFullYear(), fromDateKey(monthStart).getMonth() + 1, 0).getDate()

    const monthCells = Array.from({ length: Math.ceil((weekdayOffset + daysInMonth) / 7) * 7 }, (_, index) => addDays(monthStart, index - weekdayOffset))

    const weekDays = Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(selectedDate, state.settings.weekStartsMonday), index))

    const calendarDays = calendarMode === 'month' ? monthCells : calendarMode === 'week' ? weekDays : [selectedDate]

    const note = state.dailyNotes[selectedDate]

    return <section className="page calendar-page"><Header title="Calendar" action={<button className="button" onClick={() => { setSelectedDate(today); setCalendarMode('day') }}>Today</button>} />

      <div className="calendar-controls"><div className="segmented">{(['month', 'week', 'day'] as CalendarMode[]).map((item) => <button key={item} className={calendarMode === item ? 'active' : ''} onClick={() => setCalendarMode(item)}>{item}</button>)}</div><div className="date-pager"><button onClick={() => navigateDate(-1)} aria-label="Previous">←</button><strong>{calendarMode === 'month' ? formatMonth(selectedDate) : calendarMode === 'week' ? `${formatDate(weekDays[0])} – ${formatDate(weekDays[6])}` : formatDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</strong><button onClick={() => navigateDate(1)} aria-label="Next">→</button></div></div>

      {calendarMode === 'month' ? <div className="calendar-month card"><div className="calendar-weekdays">{(state.settings.weekStartsMonday ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{calendarDays.map((date) => { const metric = metricForDate(state, date); const outside = date.slice(0, 7) !== monthStart.slice(0, 7); return <button key={date} onClick={() => { setSelectedDate(date); setCalendarMode('day') }} className={`calendar-cell ${date === today ? 'today' : ''} ${date === selectedDate ? 'selected' : ''} ${outside ? 'outside' : ''}`}><span>{fromDateKey(date).getDate()}</span><i className={`completion-dot level-${Math.ceil(metric.percent / 25)}`} /><small>{metric.completedTasks ? `${metric.percent}%` : ''}</small></button> })}</div></div> : <div className={`calendar-agenda ${calendarMode}`} >{calendarDays.map((date) => <article className="card agenda-day" key={date}><div className="agenda-head"><div><div className="card-label">{date === today ? 'Today' : formatDate(date, { weekday: 'long' })}</div><h2>{formatDate(date, { month: 'long', day: 'numeric' })}</h2></div><b>{metricForDate(state, date).percent}% complete</b></div>{tasksForDate(state, date).map((task) => <TaskRow key={task.id} task={task} onToggle={toggleTask} compact />)}</article>)}</div>}

      <div className="detail-grid"><article className="card day-summary"><div className="card-title"><div><div className="card-label">Selected day</div><h2>{formatDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' })}</h2></div><ProgressRing value={selectedMetrics.percent} label="completion" size={92} /></div><div className="summary-pills"><span>{selectedMetrics.completedTasks}/{selectedMetrics.totalTasks} tasks</span><span>{formatDuration(selectedMetrics.gateMinutes)} GATE</span><span>{formatDuration(selectedMetrics.codingMinutes)} coding</span><span>{selectedMetrics.meditationCompleted}/2 meditation</span></div><div className="schedule-list small">{selectedMetrics.tasks.map((task) => <TaskRow key={task.id} task={task} onToggle={toggleTask} onEdit={openTaskForm} onDelete={deleteTask} />)}</div></article>

        <article className="card reflection-card"><div className="card-label">Daily reflection</div><h2>Close the loop</h2><label>What did you learn?<textarea value={note?.reflection ?? ''} onChange={(e) => updateNote('reflection', e.target.value)} placeholder="Capture a useful insight from today…" /></label><label>Tomorrow’s priority<textarea value={note?.tomorrowPriority ?? ''} onChange={(e) => updateNote('tomorrowPriority', e.target.value)} placeholder="One outcome worth protecting tomorrow…" /></label></article></div>

      <AnalyzerCard date={selectedDate} />

    </section>

  }

  const Tasks = () => <section className="page tasks-page"><Header title="Task scheduler" action={<button className="button" onClick={() => openTaskForm()}>+ Add task</button>} /><div className="task-toolbar"><div><p className="eyebrow">{formatDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' })}</p><p>Set each task’s start/end time, duration, category and recurrence. Choose whether an edit changes this day only or the default timetable.</p></div><div className="date-pager compact"><button onClick={() => setSelectedDate((date) => addDays(date, -1))}>←</button><button onClick={() => setSelectedDate(today)}>Today</button><button onClick={() => setSelectedDate((date) => addDays(date, 1))}>→</button></div></div><div className="task-layout"><article className="card task-table"><div className="card-title"><div><div className="card-label">{selectedMetrics.completedTasks} completed</div><h2>{selectedMetrics.totalTasks} planned sessions</h2></div><ProgressRing value={selectedMetrics.percent} label="progress" size={78} /></div><div className="timeline-ruler"><span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>12 AM</span></div><div className="schedule-list">{selectedMetrics.tasks.map((task) => <TaskRow key={task.id} task={task} onToggle={toggleTask} onEdit={openTaskForm} onDelete={deleteTask} />)}</div></article><aside className="side-stack"><article className="card"><div className="card-label">Your timetable</div><h2>Every block is editable.</h2><p>Use Edit beside any session to choose exact start and end times. Recurring edits can apply to every day or only this selected date.</p></article><article className="card"><div className="card-label">Quick record</div><h2>Study outside the plan?</h2><div className="quick-actions"><button onClick={() => setShowGate(true)}>+ GATE entry</button><button onClick={() => setShowCoding(true)}>+ Coding entry</button></div></article></aside></div></section>

  const Progress = () => {

    const sevenGate = lastNDays(today, 7).reduce((sum, date) => sum + metricForDate(state, date).gateMinutes, 0)

    const thirtyGate = lastNDays(today, 30).reduce((sum, date) => sum + metricForDate(state, date).gateMinutes, 0)

    const totalPYQs = state.gateEntries.reduce((sum, entry) => sum + entry.pyqs, 0)

    const totalMocks = state.gateEntries.reduce((sum, entry) => sum + entry.mocks, 0)

    const totalRevisions = state.gateEntries.reduce((sum, entry) => sum + entry.revisions, 0)

    const totalProblems = state.codingEntries.filter((entry) => entry.solved).length

    const technology = Array.from(new Set(state.codingEntries.map((entry) => entry.topic).filter(Boolean)))

    const subjectTotals = state.subjects.map((subject) => ({ subject, minutes: state.gateEntries.filter((entry) => entry.subject === subject).reduce((sum, entry) => sum + entry.minutes, 0) + lastNDays(today, 30).reduce((sum, date) => sum + tasksForDate(state, date).filter((task) => task.completed && task.category === 'GATE' && task.subject === subject).reduce((inner, task) => inner + durationMinutes(task.startTime, task.endTime), 0), 0) }))

    return <section className="page progress-page"><Header title="Progress intelligence" action={<div className="segmented progress-tabs">{(['overview', 'gate', 'coding'] as const).map((tab) => <button key={tab} className={progressTab === tab ? 'active' : ''} onClick={() => setProgressTab(tab)}>{tab}</button>)}</div>} />

      {progressTab === 'overview' && <><div className="stat-grid"><Stat label="Overall streak" value={`${overallStreak.current}d`} sub={`best ${overallStreak.longest}d`} tone="green" /><Stat label="GATE streak" value={`${gateStreak.current}d`} sub="2+ hours counts" tone="blue" /><Stat label="Coding streak" value={`${codingStreak.current}d`} sub="30+ minutes counts" tone="rose" /><Stat label="Meditation streak" value={`${meditationStreak.current}d`} sub="both sessions count" tone="amber" /></div><div className="content-grid"><article className="card"><div className="card-title"><div><div className="card-label">Last 35 days</div><h2>Routine consistency</h2></div><span className="metric-note">Success = 70% completed</span></div><Heatmap state={state} /></article><article className="card"><div className="card-label">Habit streaks</div><h2>Reliable beats intense.</h2><div className="streak-list">{[{ label: 'Routine', value: overallStreak }, { label: 'GATE', value: gateStreak }, { label: 'Coding', value: codingStreak }, { label: 'Meditation', value: meditationStreak }].map((item) => <div key={item.label}><span>{item.label}</span><b>{item.value.current} current</b><small>{item.value.longest} best · {item.value.total} successful days</small></div>)}</div></article></div></>}

      {progressTab === 'gate' && <><div className="stat-grid"><Stat label="Today" value={formatDuration(todayMetrics.gateMinutes)} sub="GATE study" tone="green" /><Stat label="This week" value={formatDuration(sevenGate)} sub="tracked study" tone="blue" /><Stat label="This month" value={formatDuration(thirtyGate)} sub="tracked study" tone="rose" /><Stat label="GATE streak" value={`${gateStreak.current}d`} sub="2+ hours/day" tone="amber" /></div><div className="content-grid"><article className="card"><div className="card-title"><div><div className="card-label">Weekly focus</div><h2>Study hours</h2></div><button className="button quiet" onClick={() => setShowGate(true)}>+ Record study</button></div><HoursChart state={state} type="GATE" /><div className="metric-row"><span>{totalPYQs} PYQs</span><span>{totalMocks} mock tests</span><span>{totalRevisions} revision sessions</span></div></article><article className="card"><div className="card-title"><div><div className="card-label">Subject allocation</div><h2>Time by subject</h2></div><button className="text-button" onClick={addSubject}>+ Subject</button></div><div className="subject-list">{subjectTotals.map((entry) => <div key={entry.subject}><span>{entry.subject}</span><div><i style={{ width: `${Math.min(100, (entry.minutes / Math.max(1, ...subjectTotals.map((item) => item.minutes))) * 100)}%` }} /></div><b>{formatDuration(entry.minutes)}</b></div>)}</div></article></div></>}

      {progressTab === 'coding' && <><div className="stat-grid"><Stat label="Today" value={formatDuration(todayMetrics.codingMinutes)} sub="coding time" tone="blue" /><Stat label="Problems" value={`${totalProblems}`} sub="recorded solved" tone="green" /><Stat label="Coding streak" value={`${codingStreak.current}d`} sub="30+ minutes/day" tone="rose" /><Stat label="Topics" value={`${technology.length}`} sub="technologies studied" tone="amber" /></div><div className="content-grid"><article className="card"><div className="card-title"><div><div className="card-label">Practice cadence</div><h2>Coding hours</h2></div><div className="segmented"><button className={codingDays === 7 ? 'active' : ''} onClick={() => setCodingDays(7)}>7d</button><button className={codingDays === 30 ? 'active' : ''} onClick={() => setCodingDays(30)}>30d</button></div></div><HoursChart state={state} type="Coding" days={codingDays} /></article><article className="card"><div className="card-title"><div><div className="card-label">Log deliberately</div><h2>Recent problems</h2></div><button className="button quiet" onClick={() => setShowCoding(true)}>+ Add problem</button></div><div className="entry-list">{state.codingEntries.filter((entry) => entry.date <= today).slice().reverse().slice(0, 5).map((entry) => <div key={entry.id}><span><b>{entry.title}</b><small>{entry.platform || 'Personal'} · {entry.topic || 'General'} · {entry.difficulty}</small></span><em>{formatDuration(entry.minutes)}</em></div>)}{!state.codingEntries.length && <p className="empty">No manual coding entries yet. Your completed scheduled block is still counted.</p>}</div></article></div></>}

    </section>

  }

  const Motivation = () => <section className="page motivation-page"><Header title="Daily motivation" /><div className="motivation-layout"><article className="card motivation-hero"><div className="card-label"><span className="spark">✦</span> Today’s message</div><h2>{motivation.hindi}</h2><p className="translation">{motivation.message}</p><div className="shloka"><p>{motivation.shloka}</p><small>{motivation.attribution}</small></div><h3>अर्थ</h3><p>{motivation.meaning}</p><h3>Practical interpretation</h3><p>{motivation.explanation}</p><div className="apply-today"><span>Apply this today</span><strong>{motivation.apply}</strong></div></article><aside className="side-stack"><article className="card ai-panel"><div className="card-label"><span className="spark">✦</span> MARGDARSHI AI</div><h2>{motivation.aiMessage}</h2><p>This privacy-conscious fallback uses your on-device progress. Connect a server-side AI endpoint later if you want generative responses without exposing a key in the app.</p></article><article className="card"><div className="card-label">Evening reflection</div><h2>What deserves a repeat?</h2><p>{todayMetrics.percent >= 70 ? 'Your routine is building evidence that you can trust your plan.' : 'There is no penalty for a missed block. The next committed block is the recovery.'}</p><button className="button quiet" onClick={() => { setView('calendar'); setSelectedDate(today); setCalendarMode('day') }}>Open today’s review</button></article>{SyncCard()}</aside></div></section>

  const SyncCard = () => <article className="card sync-card"><div className="card-label">Cross-device sync</div><h2>{userEmail ? 'Cloud sync connected' : 'Keep every device aligned'}</h2>{!supabase ? <p>Add the optional Supabase environment variables to enable passwordless, secure account sync. Local data is already persisted on this device.</p> : userEmail ? <><p>Signed in as {userEmail}. Your updates stay local first, then can be synced.</p><div className="quick-actions"><button onClick={sync} disabled={syncBusy}>{syncBusy ? 'Syncing…' : 'Sync now'}</button><button onClick={async () => { await signOutCloud(); setToast('Signed out of cloud sync.') }}>Sign out</button></div></> : <><p>Enter your email to receive a passwordless sign-in link.</p><div className="email-sync"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /><button className="button" onClick={sync} disabled={syncBusy}>{syncBusy ? 'Sending…' : 'Send link'}</button></div></>}</article>

return (
    authSession === null ? (
      <div className="auth-loading">Loading Margadarshi…</div>
    ) : !authSession ? (
      <Auth />
    ) : (
      <main className="app-shell">
        {Navigation()}
        <div className="main-area">
          {view === 'dashboard' && Dashboard()}
          {view === 'calendar' && Calendar()}
          {view === 'tasks' && Tasks()}
          {view === 'progress' && Progress()}
          {view === 'motivation' && Motivation()}
        </div>
        {toast && <div className="toast" role="status">{toast}</div>}
        {showTaskForm && TaskModal()}
        {showCoding && CodingModal()}
        {showGate && GateModal()}
        {showTargetSettings && TargetModal()}
      </main>
    )
  )

  function TaskModal() { return <div className="modal-backdrop" role="presentation"><form className="modal" onSubmit={saveTask}><div className="modal-head"><div><div className="card-label">{editing ? 'Edit schedule item' : 'New schedule item'}</div><h2>{editing?.title || 'Plan a focused block'}</h2></div><button type="button" className="close" onClick={() => setShowTaskForm(false)}>×</button></div><label>Task name<input required value={taskForm.title} onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))} /></label><div className="form-grid"><label>Start time<input type="time" value={taskForm.startTime} onChange={(e) => setTaskForm((f) => ({ ...f, startTime: e.target.value }))} /></label><label>End time<input type="time" value={taskForm.endTime} onChange={(e) => setTaskForm((f) => ({ ...f, endTime: e.target.value }))} /></label><label>Category<select value={taskForm.category} onChange={(e) => setTaskForm((f) => ({ ...f, category: e.target.value as Category }))}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label>Priority<select value={taskForm.priority} onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value as Priority }))}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label></div><p className="duration-preview">Timeline: {taskForm.startTime} – {taskForm.endTime} · {formatDuration(durationMinutes(taskForm.startTime, taskForm.endTime))}</p>{taskForm.category === 'GATE' && <label>GATE subject<select value={taskForm.subject || ''} onChange={(e) => setTaskForm((f) => ({ ...f, subject: e.target.value }))}><option value="">Choose subject</option>{state.subjects.map((subject) => <option key={subject}>{subject}</option>)}</select></label>}<label>Notes<textarea value={taskForm.notes || ''} onChange={(e) => setTaskForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional context or target…" /></label>{editing?.sourceTemplateId && <label className="checkbox apply-scope"><input type="checkbox" checked={applyScheduleChange} onChange={(e) => setApplyScheduleChange(e.target.checked)} /> Apply this time and timeline change to every recurring day</label>}{!editing && <label className="checkbox"><input type="checkbox" checked={taskForm.recurring} onChange={(e) => setTaskForm((f) => ({ ...f, recurring: e.target.checked }))} /> Repeat every day</label>}{editing?.mandatory && <p className="notice">This is a mandatory meditation session. Its schedule can be edited but it cannot be removed.</p>}<div className="modal-actions"><button type="button" className="button quiet" onClick={() => setShowTaskForm(false)}>Cancel</button><button className="button" type="submit">{editing ? 'Save changes' : 'Add task'}</button></div></form></div> }

  function CodingModal() { return <div className="modal-backdrop"><form className="modal" onSubmit={addCoding}><div className="modal-head"><div><div className="card-label">Coding tracker</div><h2>Log focused practice</h2></div><button type="button" className="close" onClick={() => setShowCoding(false)}>×</button></div><label>Problem / session<input required value={codingForm.title} onChange={(e) => setCodingForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Binary search practice" /></label><div className="form-grid"><label>Platform<input value={codingForm.platform} onChange={(e) => setCodingForm((f) => ({ ...f, platform: e.target.value }))} placeholder="Optional" /></label><label>Topic<input value={codingForm.topic} onChange={(e) => setCodingForm((f) => ({ ...f, topic: e.target.value }))} placeholder="e.g. Arrays" /></label><label>Difficulty<select value={codingForm.difficulty} onChange={(e) => setCodingForm((f) => ({ ...f, difficulty: e.target.value as CodingEntry['difficulty'] }))}><option>Easy</option><option>Medium</option><option>Hard</option></select></label><label>Minutes<input type="number" min="1" value={codingForm.minutes} onChange={(e) => setCodingForm((f) => ({ ...f, minutes: Number(e.target.value) }))} /></label></div><label className="checkbox"><input type="checkbox" checked={codingForm.solved} onChange={(e) => setCodingForm((f) => ({ ...f, solved: e.target.checked }))} /> Problem solved</label><div className="modal-actions"><button type="button" className="button quiet" onClick={() => setShowCoding(false)}>Cancel</button><button className="button">Save entry</button></div></form></div> }

  function GateModal() { return <div className="modal-backdrop"><form className="modal" onSubmit={addGate}><div className="modal-head"><div><div className="card-label">GATE tracker</div><h2>Record study output</h2></div><button type="button" className="close" onClick={() => setShowGate(false)}>×</button></div><div className="form-grid"><label>Subject<select value={gateForm.subject} onChange={(e) => setGateForm((f) => ({ ...f, subject: e.target.value }))}>{state.subjects.map((subject) => <option key={subject}>{subject}</option>)}</select></label><label>Focused minutes<input type="number" min="1" value={gateForm.minutes} onChange={(e) => setGateForm((f) => ({ ...f, minutes: Number(e.target.value) }))} /></label><label>PYQs completed<input type="number" min="0" value={gateForm.pyqs} onChange={(e) => setGateForm((f) => ({ ...f, pyqs: Number(e.target.value) }))} /></label><label>Mock tests<input type="number" min="0" value={gateForm.mocks} onChange={(e) => setGateForm((f) => ({ ...f, mocks: Number(e.target.value) }))} /></label><label>Revision sessions<input type="number" min="0" value={gateForm.revisions} onChange={(e) => setGateForm((f) => ({ ...f, revisions: Number(e.target.value) }))} /></label></div><label>Note<textarea value={gateForm.note} onChange={(e) => setGateForm((f) => ({ ...f, note: e.target.value }))} placeholder="Optional learning note…" /></label><div className="modal-actions"><button type="button" className="button quiet" onClick={() => setShowGate(false)}>Cancel</button><button className="button">Save entry</button></div></form></div> }

  function TargetModal() { return <div className="modal-backdrop"><form className="modal" onSubmit={(event) => { event.preventDefault(); setShowTargetSettings(false); setToast('Target plan saved. The evening analyzer will recalculate automatically.') }}><div className="modal-head"><div><div className="card-label">Achievement plan</div><h2>Set your real target</h2></div><button type="button" className="close" onClick={() => setShowTargetSettings(false)}>×</button></div><p className="form-copy">The end-of-day analyzer uses this deadline and workload to turn today’s progress into a practical next-day plan.</p><label>Target name<input value={state.settings.targetName} onChange={(e) => modify((previous) => ({ ...previous, settings: { ...previous.settings, targetName: e.target.value } }))} placeholder="e.g. GATE 2027" /></label><label>Target date<input type="date" value={state.settings.targetDate} onChange={(e) => modify((previous) => ({ ...previous, settings: { ...previous.settings, targetDate: e.target.value } }))} /></label><div className="form-grid"><label>Planned GATE hours<input type="number" min="1" value={state.settings.targetGateHours} onChange={(e) => modify((previous) => ({ ...previous, settings: { ...previous.settings, targetGateHours: Number(e.target.value) || 0 } }))} /></label><label>Target coding problems<input type="number" min="0" value={state.settings.targetCodingProblems} onChange={(e) => modify((previous) => ({ ...previous, settings: { ...previous.settings, targetCodingProblems: Number(e.target.value) || 0 } }))} /></label></div><div className="modal-actions"><button type="button" className="button quiet" onClick={() => setShowTargetSettings(false)}>Cancel</button><button className="button">Save target</button></div></form></div> }

}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: string }) { return <article className={`stat-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>{sub}</small></article> }
