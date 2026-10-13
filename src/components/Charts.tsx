import { useMemo } from 'react'
import type { AppState } from '../types'
import { formatDuration, fromDateKey, indiaDateKey } from '../lib/date'
import { lastNDays, metricForDate } from '../lib/metrics'

export function ProgressRing({ value, label, detail, size = 132 }: { value: number; label: string; detail?: string; size?: number }) {
  const stroke = 10, radius = (size - stroke) / 2, circumference = Math.PI * radius * 2
  return <div className="progress-ring" style={{ width: size }} aria-label={`${label}: ${value}%`}>
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle className="ring-track" cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} />
      <circle className="ring-value" cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={circumference * (1 - Math.min(value, 100) / 100)} />
    </svg>
    <div className="ring-copy"><strong>{value}%</strong><span>{detail || label}</span></div>
  </div>
}

export function HoursChart({ state, type, days = 7, endDate = indiaDateKey() }: { state: AppState; type: 'GATE' | 'Coding'; days?: number; endDate?: string }) {
  const data = useMemo(() => lastNDays(endDate, days).map((date) => {
    const metric = metricForDate(state, date)
    return { date, hours: (type === 'GATE' ? metric.gateMinutes : metric.codingMinutes) / 60 }
  }), [state, type, days, endDate])
  const max = Math.max(2, ...data.map((item) => item.hours))
  return <div className="bar-chart" aria-label={`${type} hours over ${days} days`}>
    {data.map((item) => <div className="bar-entry" key={item.date} title={`${item.date}: ${item.hours.toFixed(1)} hours`}>
      <div className="bar-shell"><div className="bar" style={{ height: `${Math.max(item.hours ? 7 : 2, (item.hours / max) * 100)}%` }} /></div>
      <span>{fromDateKey(item.date).toLocaleDateString('en-IN', { weekday: 'narrow' })}</span>
    </div>)}
  </div>
}

export function Heatmap({ state }: { state: AppState }) {
  const dates = useMemo(() => lastNDays(indiaDateKey(), 35), [])
  return <div className="heatmap" aria-label="Last 35 days completion heatmap">
    {dates.map((date) => {
      const value = metricForDate(state, date).percent
      return <span key={date} title={`${date}: ${value}%`} className={`heat heat-${value === 0 ? 0 : Math.ceil(value / 25)}`} />
    })}
    <div className="heat-legend"><span>Less</span><i className="heat heat-0"/><i className="heat heat-1"/><i className="heat heat-2"/><i className="heat heat-3"/><i className="heat heat-4"/><span>More</span></div>
  </div>
}

export function Breakdown({ values }: { values: { label: string; minutes: number; className: string }[] }) {
  const total = values.reduce((sum, value) => sum + value.minutes, 0)
  return <div className="breakdown">
    <div className="breakdown-bar">
      {values.filter((item) => item.minutes > 0).map((item) => <span key={item.label} className={item.className} style={{ width: `${(item.minutes / Math.max(total, 1)) * 100}%` }} />)}
    </div>
    <div className="breakdown-legend">{values.map((item) => <span key={item.label}><i className={item.className} />{item.label} <b>{formatDuration(item.minutes)}</b></span>)}</div>
  </div>
}
