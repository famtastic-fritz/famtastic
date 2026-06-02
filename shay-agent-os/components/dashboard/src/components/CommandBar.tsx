import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Command, Send } from 'lucide-react'
import { useDashboardStore } from '@/hooks/useDashboardStore'

export function CommandBar() {
  const commandInput = useDashboardStore((s) => s.commandInput)
  const setCommandInput = useDashboardStore((s) => s.setCommandInput)
  const executeCommand = useDashboardStore((s) => s.executeCommand)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSubmit = () => {
    executeCommand(commandInput)
    setCommandInput('')
  }

  const suggestions = [
    { cmd: '/goal', desc: 'Create a new goal' },
    { cmd: '/subgoal', desc: 'Create a sub-goal' },
    { cmd: '/trust', desc: 'Set trust mode' },
    { cmd: '/status', desc: 'Show system status' },
  ]

  const showSuggestions = commandInput.startsWith('/') && commandInput.length > 0 && commandInput.length < 8

  return (
    <div className="relative border-t border-slate-800 bg-slate-900/80 backdrop-blur">
      {showSuggestions && (
        <div className="absolute bottom-full left-0 right-0 mb-1 px-4">
          <div className="rounded-lg border border-slate-700 bg-slate-800 shadow-lg overflow-hidden">
            {suggestions
              .filter((s) => s.cmd.startsWith(commandInput.split(' ')[0]))
              .map((s) => (
                <div
                  key={s.cmd}
                  className="flex items-center gap-3 px-3 py-2 text-xs hover:bg-slate-700/50 cursor-pointer"
                  onClick={() => {
                    setCommandInput(s.cmd + ' ')
                    inputRef.current?.focus()
                  }}
                >
                  <span className="font-mono text-blue-400">{s.cmd}</span>
                  <span className="text-slate-400">{s.desc}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 px-4 py-2.5">
        <div className="flex items-center justify-center h-7 w-7 rounded-md bg-slate-800 border border-slate-700">
          <Command className="h-3.5 w-3.5 text-slate-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit()
          }}
          placeholder="Type /goal, /subgoal, /trust, or /status..."
          className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-slate-500 focus:outline-none"
        />
        <button
          onClick={handleSubmit}
          disabled={!commandInput.trim()}
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            commandInput.trim()
              ? 'bg-blue-600 text-white hover:bg-blue-500'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          )}
        >
          <Send className="h-3 w-3" />
          Run
        </button>
        <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-600">
          <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 font-mono">Ctrl</kbd>
          <span>+</span>
          <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 font-mono">K</kbd>
        </div>
      </div>
    </div>
  )
}
