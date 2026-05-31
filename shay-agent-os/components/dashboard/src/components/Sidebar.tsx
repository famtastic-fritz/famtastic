import { cn } from '@/lib/utils'
import { Activity, AlertTriangle, Bot, CheckCircle2, Clock, Cpu, HardDrive, Layers, Shield, Zap } from 'lucide-react'
import { useDashboardStore, type Agent, type AgentStatus } from '@/hooks/useDashboardStore'

function StatusDot({ status }: { status: AgentStatus }) {
  const colors: Record<AgentStatus, string> = {
    idle: 'bg-emerald-400',
    busy: 'bg-blue-400 animate-pulse',
    error: 'bg-red-400',
    offline: 'bg-slate-500',
  }
  return (
    <span className={cn('inline-block h-2 w-2 rounded-full', colors[status])} />
  )
}

function StatusBadge({ status }: { status: AgentStatus }) {
  const labels: Record<AgentStatus, string> = {
    idle: 'Idle',
    busy: 'Busy',
    error: 'Error',
    offline: 'Offline',
  }
  const classes: Record<AgentStatus, string> = {
    idle: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    busy: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
    offline: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  }
  return (
    <span className={cn('text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border', classes[status])}>
      {labels[status]}
    </span>
  )
}

function AgentCard({ agent }: { agent: Agent }) {
  const selectedAgentId = useDashboardStore((s) => s.selectedAgentId)
  const setSelectedAgentId = useDashboardStore((s) => s.setSelectedAgentId)
  const isSelected = selectedAgentId === agent.id

  const timeSince = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    return `${hrs}h ago`
  }

  return (
    <button
      onClick={() => setSelectedAgentId(isSelected ? null : agent.id)}
      className={cn(
        'w-full text-left rounded-lg border p-3 transition-all duration-150',
        isSelected
          ? 'border-blue-500/40 bg-blue-500/5'
          : 'border-slate-700/50 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60'
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <StatusDot status={agent.status} />
          <span className="text-sm font-medium text-zinc-100">{agent.name}</span>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
        {agent.role === 'orchestrator' ? <Zap className="h-3 w-3 text-amber-400" /> : <Bot className="h-3 w-3 text-cyan-400" />}
        <span className="capitalize">{agent.role}</span>
        <span className="text-slate-600">|</span>
        <span>{agent.model}</span>
      </div>

      {agent.currentTask && (
        <div className="text-xs text-slate-300 mb-1.5 truncate">
          {agent.currentTask}
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{timeSince(agent.lastHeartbeat)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-0.5 text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            {agent.tasksCompleted}
          </span>
          {agent.tasksFailed > 0 && (
            <span className="flex items-center gap-0.5 text-red-400">
              <AlertTriangle className="h-3 w-3" />
              {agent.tasksFailed}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

export function Sidebar() {
  const agents = useDashboardStore((s) => s.agents)
  const trustMode = useDashboardStore((s) => s.trustMode)
  const setTrustModeRemote = useDashboardStore((s) => s.setTrustModeRemote)
  const trustModeSyncing = useDashboardStore((s) => s.trustModeSyncing)
  const apiConnected = useDashboardStore((s) => s.apiConnected)

  const orchestrators = agents.filter((a) => a.role === 'orchestrator')
  const workers = agents.filter((a) => a.role === 'worker')

  const trustOptions: { value: typeof trustMode; label: string; icon: React.ReactNode; desc: string }[] = [
    { value: 'supervised', label: 'Supervised', icon: <Shield className="h-3.5 w-3.5" />, desc: 'Human approval required' },
    { value: 'autonomous', label: 'Autonomous', icon: <Zap className="h-3.5 w-3.5" />, desc: 'Agents act independently' },
    { value: 'locked', label: 'Locked', icon: <Layers className="h-3.5 w-3.5" />, desc: 'All actions paused' },
  ]

  return (
    <aside className="flex flex-col h-full w-72 border-r border-slate-800 bg-slate-950">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
        <Activity className="h-5 w-5 text-blue-400" />
        <h1 className="text-sm font-semibold tracking-wide text-zinc-100">SHAY AGENT OS</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div>
          <h2 className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2 px-1">
            Orchestrators
          </h2>
          <div className="space-y-2">
            {orchestrators.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2 px-1">
            Workers
          </h2>
          <div className="space-y-2">
            {workers.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800 p-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
            Trust Mode
          </h2>
          <div className="flex items-center gap-1.5">
            <span className={cn(
              'inline-block h-1.5 w-1.5 rounded-full',
              apiConnected ? 'bg-emerald-400' : 'bg-red-400'
            )} />
            <span className="text-[10px] text-slate-500">
              {apiConnected ? 'API' : 'Offline'}
            </span>
            {trustModeSyncing && (
              <span className="text-[10px] text-blue-400 animate-pulse">Syncing...</span>
            )}
          </div>
        </div>
        <div className="space-y-1">
          {trustOptions.map((opt) => (
            <button
              key={opt.value}
              disabled={trustModeSyncing}
              onClick={() => setTrustModeRemote(opt.value)}
              className={cn(
                'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                trustMode === opt.value
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200',
                trustModeSyncing && 'opacity-50 cursor-not-allowed'
              )}
            >
              {opt.icon}
              <div className="text-left">
                <div className="font-medium">{opt.label}</div>
                <div className="text-[10px] text-slate-500">{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-800 p-3">
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-1">
            <Cpu className="h-3 w-3" />
            <span>v0.1.0</span>
          </div>
          <div className="flex items-center gap-1">
            <HardDrive className="h-3 w-3" />
            <span>{agents.filter((a) => a.status !== 'offline').length}/{agents.length} online</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
