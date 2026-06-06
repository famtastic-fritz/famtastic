import { useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Workspace } from '@/components/Workspace'
import { ActivityPanel } from '@/components/ActivityPanel'
import { CommandBar } from '@/components/CommandBar'
import { useDashboardStore } from '@/hooks/useDashboardStore'

function ApiPoller() {
  const checkApiHealth = useDashboardStore((s) => s.checkApiHealth)
  const fetchAgents = useDashboardStore((s) => s.fetchAgents)
  const fetchTasks = useDashboardStore((s) => s.fetchTasks)
  const fetchBoard = useDashboardStore((s) => s.fetchBoard)
  const fetchEvents = useDashboardStore((s) => s.fetchEvents)
  const connectEventStream = useDashboardStore((s) => s.connectEventStream)

  useEffect(() => {
    // Initial sync — agents/tasks/board poll, events load backlog then stream live.
    checkApiHealth()
    fetchAgents()
    fetchTasks()
    fetchBoard()
    fetchEvents()
    const disconnect = connectEventStream()

    // Poll agents/tasks/board every 5s (the event feed is push, not polled).
    const interval = setInterval(() => {
      checkApiHealth()
      fetchAgents()
      fetchTasks()
      fetchBoard()
    }, 5000)

    return () => {
      clearInterval(interval)
      disconnect()
    }
  }, [checkApiHealth, fetchAgents, fetchTasks, fetchBoard, fetchEvents, connectEventStream])

  return null
}

export default function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-zinc-100">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Workspace />
        <CommandBar />
      </div>
      <ActivityPanel />
      <ApiPoller />
    </div>
  )
}
