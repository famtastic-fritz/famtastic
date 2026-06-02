import { create } from 'zustand'

export type AgentStatus = 'idle' | 'busy' | 'error' | 'offline'
export type TrustMode = 'supervised' | 'autonomous' | 'locked'
export type EventSeverity = 'info' | 'warn' | 'error' | 'success'

export interface Agent {
  id: string
  name: string
  model: string
  role: 'orchestrator' | 'worker'
  status: AgentStatus
  lastHeartbeat: string
  tasksCompleted: number
  tasksFailed: number
  currentTask?: string
}

export interface ActivityEvent {
  id: string
  timestamp: string
  type: 'heartbeat' | 'task_start' | 'task_complete' | 'task_fail' | 'log' | 'error' | 'command' | 'system'
  agentId?: string
  message: string
  severity: EventSeverity
}

export interface Task {
  id: string
  title: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  agentId?: string
  createdAt: string
  completedAt?: string
  result?: string
}

export interface SystemMetrics {
  cpuPercent: number
  memoryPercent: number
  activeAgents: number
  queuedTasks: number
  eventsPerMinute: number
}

const API_BASE = 'http://localhost:8643/api'

interface DashboardState {
  agents: Agent[]
  events: ActivityEvent[]
  tasks: Task[]
  trustMode: TrustMode
  trustModeSyncing: boolean
  trustModeError: string | null
  metrics: SystemMetrics
  selectedAgentId: string | null
  commandInput: string
  goalInput: string
  apiConnected: boolean

  setTrustMode: (mode: TrustMode) => void
  syncTrustMode: () => Promise<void>
  setTrustModeRemote: (mode: TrustMode) => Promise<void>
  setSelectedAgentId: (id: string | null) => void
  setCommandInput: (input: string) => void
  setGoalInput: (input: string) => void
  addEvent: (event: ActivityEvent) => void
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  updateAgent: (id: string, updates: Partial<Agent>) => void
  executeCommand: (command: string) => void
  fetchAgents: () => Promise<void>
  fetchTasks: () => Promise<void>
  checkApiHealth: () => Promise<void>
}

const initialAgents: Agent[] = [
  {
    id: 'orch-1',
    name: 'Orchestrator Alpha',
    model: 'swarm-orchestrator',
    role: 'orchestrator',
    status: 'busy',
    lastHeartbeat: new Date().toISOString(),
    tasksCompleted: 0,
    tasksFailed: 0,
    currentTask: 'Coordinating swarm',
  },
]

const initialEvents: ActivityEvent[] = [
  {
    id: 'evt-1',
    timestamp: new Date().toISOString(),
    type: 'system',
    message: 'Dashboard initialized',
    severity: 'success',
  },
]

export const useDashboardStore = create<DashboardState>((set, get) => ({
  agents: initialAgents,
  events: initialEvents,
  tasks: [],
  trustMode: 'supervised',
  trustModeSyncing: false,
  trustModeError: null,
  metrics: {
    cpuPercent: 0,
    memoryPercent: 0,
    activeAgents: 0,
    queuedTasks: 0,
    eventsPerMinute: 0,
  },
  selectedAgentId: null,
  commandInput: '',
  goalInput: '',
  apiConnected: false,

  setTrustMode: (mode) => set({ trustMode: mode }),

  syncTrustMode: async () => {
    set({ trustModeSyncing: true, trustModeError: null })
    try {
      const resp = await fetch(`${API_BASE}/trust`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      const level = data.level as TrustMode
      if (level && ['supervised', 'autonomous', 'locked'].includes(level)) {
        set({ trustMode: level })
      }
    } catch (err) {
      set({ trustModeError: (err as Error).message })
    } finally {
      set({ trustModeSyncing: false })
    }
  },

  setTrustModeRemote: async (mode) => {
    set({ trustModeSyncing: true, trustModeError: null })
    try {
      const resp = await fetch(`${API_BASE}/trust`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: mode }),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      if (data.success) {
        set({ trustMode: mode })
      } else {
        throw new Error(data.error || 'Failed to set trust mode')
      }
    } catch (err) {
      set({ trustModeError: (err as Error).message })
    } finally {
      set({ trustModeSyncing: false })
    }
  },

  setSelectedAgentId: (id) => set({ selectedAgentId: id }),
  setCommandInput: (input) => set({ commandInput: input }),
  setGoalInput: (input) => set({ goalInput: input }),

  addEvent: (event) =>
    set((state) => ({
      events: [event, ...state.events].slice(0, 500),
    })),

  addTask: (task) =>
    set((state) => ({
      tasks: [task, ...state.tasks],
    })),

  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  updateAgent: (id, updates) =>
    set((state) => ({
      agents: state.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),

  executeCommand: (command) => {
    const trimmed = command.trim()
    if (!trimmed) return

    const event: ActivityEvent = {
      id: `evt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'command',
      message: `Command executed: ${trimmed}`,
      severity: 'info',
    }

    get().addEvent(event)

    if (trimmed.startsWith('/goal ')) {
      const title = trimmed.slice(6)
      get().addTask({
        id: `task-${Date.now()}`,
        title,
        status: 'pending',
        createdAt: new Date().toISOString(),
      })
    } else if (trimmed.startsWith('/subgoal ')) {
      const title = trimmed.slice(9)
      get().addTask({
        id: `task-${Date.now()}`,
        title,
        status: 'pending',
        createdAt: new Date().toISOString(),
      })
    } else if (trimmed.startsWith('/trust ')) {
      const mode = trimmed.slice(7) as TrustMode
      if (['supervised', 'autonomous', 'locked'].includes(mode)) {
        get().setTrustModeRemote(mode)
      }
    } else if (trimmed === '/status') {
      const { agents, tasks } = get()
      const busy = agents.filter((a) => a.status === 'busy').length
      const pending = tasks.filter((t) => t.status === 'pending').length
      get().addEvent({
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'system',
        message: `Status: ${busy}/${agents.length} agents busy, ${pending} tasks pending`,
        severity: 'info',
      })
    }
  },

  fetchAgents: async () => {
    try {
      const resp = await fetch(`${API_BASE}/agents`)
      if (!resp.ok) return
      const data = await resp.json()
      if (data.agents) {
        set({ agents: data.agents, apiConnected: true })
      }
    } catch {
      set({ apiConnected: false })
    }
  },

  fetchTasks: async () => {
    try {
      const resp = await fetch(`${API_BASE}/tasks`)
      if (!resp.ok) return
      const data = await resp.json()
      set({
        metrics: {
          ...get().metrics,
          queuedTasks: data.pending || 0,
        },
      })
    } catch {
      // ignore
    }
  },

  checkApiHealth: async () => {
    try {
      const resp = await fetch(`${API_BASE}/health`)
      set({ apiConnected: resp.ok })
    } catch {
      set({ apiConnected: false })
    }
  },
}))
