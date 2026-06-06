import { cn } from '@/lib/utils'
import { LayoutGrid } from 'lucide-react'
import { useDashboardStore, BOARD_LANES, type BoardTask } from '@/hooks/useDashboardStore'

// Per-lane accent — mirrors the kanban flow (triage → … → done, + blocked/archived).
const LANE_STYLE: Record<string, { label: string; dot: string }> = {
  triage: { label: 'Triage', dot: 'bg-slate-400' },
  todo: { label: 'To Do', dot: 'bg-slate-300' },
  scheduled: { label: 'Scheduled', dot: 'bg-violet-400' },
  ready: { label: 'Ready', dot: 'bg-cyan-400' },
  running: { label: 'Running', dot: 'bg-blue-400' },
  review: { label: 'Review', dot: 'bg-amber-400' },
  done: { label: 'Done', dot: 'bg-emerald-400' },
  blocked: { label: 'Blocked', dot: 'bg-red-400' },
  archived: { label: 'Archived', dot: 'bg-slate-600' },
}

function ago(ts?: number | null): string {
  if (!ts) return ''
  const d = Date.now() / 1000 - ts
  if (d < 60) return 'now'
  if (d < 3600) return `${Math.floor(d / 60)}m`
  if (d < 86400) return `${Math.floor(d / 3600)}h`
  return `${Math.floor(d / 86400)}d`
}

function Card({ task }: { task: BoardTask }) {
  return (
    <div className="rounded-md border border-slate-700/50 bg-slate-800/40 p-2.5">
      <div className="text-sm text-zinc-100 leading-snug">{task.title}</div>
      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-500">
        {task.created_by && <span className="text-slate-400">{task.created_by}</span>}
        {task.priority ? <span>P{task.priority}</span> : null}
        <span className="ml-auto">{ago(task.created_at)}</span>
      </div>
      {task.result && (
        <div className="mt-1.5 rounded bg-slate-900/60 p-1.5 text-[11px] text-slate-300 line-clamp-2">
          {task.result}
        </div>
      )}
    </div>
  )
}

export function Board() {
  const board = useDashboardStore((s) => s.board)

  // Only show lanes that exist (plus the core flow even if empty), skip empty terminal lanes.
  const lanes = BOARD_LANES.filter((lane) => {
    const count = board.counts[lane] ?? 0
    if (count > 0) return true
    return !['archived', 'blocked', 'scheduled'].includes(lane) // keep the main flow visible
  })

  if (!board.available && board.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <LayoutGrid className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">No board yet.</p>
        <p className="text-xs mt-1 text-slate-600">
          kanban.db has no tasks (or isn't reachable). Dispatch a job to populate it.
        </p>
      </div>
    )
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 h-full">
      {lanes.map((lane) => {
        const items = board.lanes[lane] ?? []
        const style = LANE_STYLE[lane] ?? { label: lane, dot: 'bg-slate-400' }
        return (
          <div key={lane} className="flex w-64 flex-none flex-col rounded-lg bg-slate-900/40 border border-slate-800">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800">
              <span className={cn('h-2 w-2 rounded-full', style.dot)} />
              <span className="text-xs font-semibold text-zinc-200">{style.label}</span>
              <span className="ml-auto text-[10px] text-slate-500">{items.length}</span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-2">
              {items.map((t) => (
                <Card key={t.id} task={t} />
              ))}
              {items.length === 0 && (
                <div className="py-6 text-center text-[11px] text-slate-600">—</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
