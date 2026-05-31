import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  Play,
  Send,
  Target,
  XCircle,
} from 'lucide-react'
import { useDashboardStore, type Task } from '@/hooks/useDashboardStore'

function TaskItem({ task }: { task: Task }) {
  const statusIcons = {
    pending: <Circle className="h-4 w-4 text-slate-500" />,
    running: <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />,
    completed: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
    failed: <XCircle className="h-4 w-4 text-red-400" />,
  }

  const statusLabels = {
    pending: 'Pending',
    running: 'Running',
    completed: 'Done',
    failed: 'Failed',
  }

  const statusClasses = {
    pending: 'text-slate-400',
    running: 'text-blue-400',
    completed: 'text-emerald-400',
    failed: 'text-red-400',
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
      <div className="mt-0.5">{statusIcons[task.status]}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-zinc-100 truncate">{task.title}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn('text-[10px] uppercase tracking-wider font-medium', statusClasses[task.status])}>
            {statusLabels[task.status]}
          </span>
          {task.agentId && (
            <span className="text-[10px] text-slate-500">
              {task.agentId}
            </span>
          )}
          {task.result && (
            <span className="text-[10px] text-slate-400 truncate">{task.result}</span>
          )}
        </div>
      </div>
      <div className="text-[10px] text-slate-600 flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  )
}

export function Workspace() {
  const goalInput = useDashboardStore((s) => s.goalInput)
  const setGoalInput = useDashboardStore((s) => s.setGoalInput)
  const addTask = useDashboardStore((s) => s.addTask)
  const addEvent = useDashboardStore((s) => s.addEvent)
  const tasks = useDashboardStore((s) => s.tasks)
  const selectedAgentId = useDashboardStore((s) => s.selectedAgentId)
  const agents = useDashboardStore((s) => s.agents)

  const [activeTab, setActiveTab] = useState<'tasks' | 'results'>('tasks')

  const handleSubmitGoal = () => {
    if (!goalInput.trim()) return
    const task: Task = {
      id: `task-${Date.now()}`,
      title: goalInput.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    addTask(task)
    addEvent({
      id: `evt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'task_start',
      message: `Goal created: ${goalInput.trim()}`,
      severity: 'info',
    })
    setGoalInput('')
  }

  const selectedAgent = agents.find((a) => a.id === selectedAgentId)
  const pendingTasks = tasks.filter((t) => t.status === 'pending')
  const runningTasks = tasks.filter((t) => t.status === 'running')
  const completedTasks = tasks.filter((t) => t.status === 'completed')
  const failedTasks = tasks.filter((t) => t.status === 'failed')

  return (
    <main className="flex flex-col h-full bg-slate-950">
      <div className="border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-2 mb-1">
          <Target className="h-4 w-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-zinc-100">Goal Input</h2>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitGoal()}
            placeholder="Enter a goal or task..."
            className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-colors"
          />
          <button
            onClick={handleSubmitGoal}
            disabled={!goalInput.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            Submit
          </button>
        </div>
        {selectedAgent && (
          <div className="mt-2 text-xs text-slate-400">
            Selected agent: <span className="text-blue-400 font-medium">{selectedAgent.name}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 px-6 py-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('tasks')}
          className={cn(
            'text-xs font-medium pb-1 border-b-2 transition-colors',
            activeTab === 'tasks'
              ? 'text-blue-400 border-blue-400'
              : 'text-slate-500 border-transparent hover:text-slate-300'
          )}
        >
          Active Tasks
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={cn(
            'text-xs font-medium pb-1 border-b-2 transition-colors',
            activeTab === 'results'
              ? 'text-blue-400 border-blue-400'
              : 'text-slate-500 border-transparent hover:text-slate-300'
          )}
        >
          Results
        </button>
        <div className="ml-auto flex items-center gap-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <Play className="h-3 w-3 text-blue-400" />
            {runningTasks.length} running
          </span>
          <span className="flex items-center gap-1">
            <Circle className="h-3 w-3 text-slate-400" />
            {pendingTasks.length} pending
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            {completedTasks.length} done
          </span>
          {failedTasks.length > 0 && (
            <span className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-400" />
              {failedTasks.length} failed
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'tasks' ? (
          <div className="space-y-2">
            {runningTasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
            {pendingTasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
            {completedTasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
            {failedTasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
            {tasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <Target className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No tasks yet. Enter a goal above.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {completedTasks
              .filter((t) => t.result)
              .map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4"
                >
                  <div className="text-sm font-medium text-zinc-100 mb-1">{task.title}</div>
                  <div className="text-xs text-emerald-400 mb-2">Completed</div>
                  <div className="text-sm text-slate-300 bg-slate-900/50 rounded p-2 font-mono">
                    {task.result}
                  </div>
                </div>
              ))}
            {completedTasks.filter((t) => t.result).length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <CheckCircle2 className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No completed results yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
