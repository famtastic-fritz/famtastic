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

  useEffect(() => {
    // Initial sync
    checkApiHealth()
    fetchAgents()
    fetchTasks()

    // Poll every 5 seconds
    const interval = setInterval(() => {
      checkApiHealth()
      fetchAgents()
      fetchTasks()
    }, 5000)

    return () => clearInterval(interval)
  }, [checkApiHealth, fetchAgents, fetchTasks])

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
