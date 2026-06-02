import { cn } from '@/lib/utils'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  HardDrive,
  Heart,
  Info,
  Layers,
  MessageSquare,
  Terminal,
  Zap,
} from 'lucide-react'
import { useDashboardStore, type ActivityEvent, type EventSeverity } from '@/hooks/useDashboardStore'

function SeverityIcon({ severity }: { severity: EventSeverity }) {
  switch (severity) {
    case 'success':
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
    case 'warn':
      return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
    case 'error':
      return <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
    case 'info':
    default:
      return <Info className="h-3.5 w-3.5 text-blue-400" />
  }
}

function TypeIcon({ type }: { type: ActivityEvent['type'] }) {
  switch (type) {
    case 'heartbeat':
      return <Heart className="h-3 w-3 text-rose-400" />
    case 'task_start':
      return <Zap className="h-3 w-3 text-blue-400" />
    case 'task_complete':
      return <CheckCircle2 className="h-3 w-3 text-emerald-400" />
    case 'task_fail':
      return <AlertTriangle className="h-3 w-3 text-red-400" />
    case 'error':
      return <AlertTriangle className="h-3 w-3 text-red-400" />
    case 'command':
      return <Terminal className="h-3 w-3 text-violet-400" />
    case 'system':
      return <Layers className="h-3 w-3 text-cyan-400" />
    case 'log':
    default:
      return <MessageSquare className="h-3 w-3 text-slate-400" />
  }
}

function EventRow({ event }: { event: ActivityEvent }) {
  const time = new Date(event.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <div className="flex items-start gap-2 py-1.5 px-2 rounded hover:bg-slate-800/40 transition-colors">
      <div className="mt-0.5 shrink-0">
        <SeverityIcon severity={event.severity} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <TypeIcon type={event.type} />
          <span className="text-[10px] text-slate-500 font-mono">{time}</span>
          {event.agentId && (
            <span className="text-[10px] text-slate-600">{event.agentId}</span>
          )}
        </div>
        <div className={cn(
          'text-xs leading-relaxed',
          event.severity === 'error' ? 'text-red-300' :
          event.severity === 'warn' ? 'text-amber-300' :
          event.severity === 'success' ? 'text-emerald-300' :
          'text-slate-300'
        )}>
          {event.message}
        </div>
      </div>
    </div>
  )
}

function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-mono">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  )
}

export function ActivityPanel() {
  const events = useDashboardStore((s) => s.events)
  const metrics = useDashboardStore((s) => s.metrics)

  return (
    <aside className="flex flex-col h-full w-80 border-l border-slate-800 bg-slate-950">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
        <Activity className="h-4 w-4 text-emerald-400" />
        <h2 className="text-sm font-semibold text-zinc-100">Activity Feed</h2>
        <span className="ml-auto text-[10px] text-slate-500 font-mono">
          {events.length} events
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-slate-800/50">
          {events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </div>
      </div>

      <div className="border-t border-slate-800 p-4 space-y-3">
        <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
          System Metrics
        </h3>
        <MetricBar label="CPU" value={metrics.cpuPercent} color="bg-blue-500" />
        <MetricBar label="Memory" value={metrics.memoryPercent} color="bg-violet-500" />
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="rounded-md border border-slate-700/50 bg-slate-800/30 p-2 text-center">
            <div className="text-lg font-semibold text-zinc-100">{metrics.activeAgents}</div>
            <div className="text-[10px] text-slate-500">Agents</div>
          </div>
          <div className="rounded-md border border-slate-700/50 bg-slate-800/30 p-2 text-center">
            <div className="text-lg font-semibold text-zinc-100">{metrics.queuedTasks}</div>
            <div className="text-[10px] text-slate-500">Queued</div>
          </div>
          <div className="rounded-md border border-slate-700/50 bg-slate-800/30 p-2 text-center">
            <div className="text-lg font-semibold text-zinc-100">{metrics.eventsPerMinute}</div>
            <div className="text-[10px] text-slate-500">Evt/min</div>
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
          <div className="flex items-center gap-1">
            <Cpu className="h-3 w-3" />
            <span>System healthy</span>
          </div>
          <div className="flex items-center gap-1">
            <HardDrive className="h-3 w-3" />
            <span>Redis: connected</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
