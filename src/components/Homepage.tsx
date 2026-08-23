import { useState, useEffect } from 'react'
import { useTheme } from './ThemeProvider'
import { useAppStore } from '../store'
import { PromptDialog } from './PromptDialog'

export const Homepage = () => {
  const theme = useTheme()
  const { loadProject } = useAppStore()
  const [recent, setRecent] = useState<{ id: string; name: string; path: string; updatedAt: string }[]>([])
  const [promptOpen, setPromptOpen] = useState(false)
  const [pendingProjectPath, setPendingProjectPath] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('drawpyo_recent')
    if (stored) {
      setRecent(JSON.parse(stored))
    }
  }, [])

  const handleOpen = async () => {
    const path = await window.electronAPI.selectProject()
    if (!path) return
    const data = await window.electronAPI.readFile(`${path}/project.json`)
    if (!data) {
      alert('Invalid project folder')
      return
    }
    const project = JSON.parse(data)
    loadProject(project)
    const updated = [{ id: project.id, name: project.name, path: project.path, updatedAt: project.updatedAt }, ...recent.filter((r) => r.path !== project.path)].slice(0, 10)
    setRecent(updated)
    localStorage.setItem('drawpyo_recent', JSON.stringify(updated))
  }

  const handleCreate = async () => {
    const path = await window.electronAPI.openDirectory()
    if (!path) return
    setPendingProjectPath(path)
    setPromptOpen(true)
  }

  const handlePromptConfirm = async (name: string) => {
    if (!pendingProjectPath) return
    const trimmed = name.trim() || 'Untitled'
    await window.electronAPI.mkdir(pendingProjectPath)
    const project = {
      id: crypto.randomUUID(),
      name: trimmed,
      path: pendingProjectPath,
      blocks: [],
      connections: [],
      groups: [],
      viewport: { x: 0, y: 0, scale: 1 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await window.electronAPI.writeFile(`${pendingProjectPath}/project.json`, JSON.stringify(project, null, 2))
    loadProject(project)
    const updated = [{ id: project.id, name: project.name, path: project.path, updatedAt: project.updatedAt }, ...recent.filter((r) => r.path !== project.path)].slice(0, 10)
    setRecent(updated)
    localStorage.setItem('drawpyo_recent', JSON.stringify(updated))
    setPromptOpen(false)
    setPendingProjectPath(null)
  }

  const handlePromptCancel = () => {
    setPromptOpen(false)
    setPendingProjectPath(null)
  }

  return (
    <div className="homepage" style={{ background: theme.theme.background, color: theme.theme.textPrimary }}>
      <div className="homepage-title">Drawpyo</div>
      <div className="homepage-subtitle">
        Visual project planning and diagramming. Create linked block diagrams on a freeform canvas, with Python scripting control.
      </div>

      <div className="homepage-actions">
        <button className="btn btn-primary" onClick={handleCreate}>Create Project</button>
        <button className="btn" onClick={handleOpen}>Open Project</button>
      </div>

      {recent.length > 0 && (
        <div className="recent-list">
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.theme.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Recent Projects
          </div>
          {recent.map((r) => (
            <div key={r.id} className="recent-item" style={{ background: theme.theme.card, borderColor: theme.theme.cardBorder }}>
              <div>
                <div className="recent-item-name" style={{ color: theme.theme.textPrimary }}>{r.name}</div>
                <div className="recent-item-meta" style={{ color: theme.theme.textSecondary }}>{r.path}</div>
              </div>
              <button
                className="btn"
                style={{ padding: '4px 10px', fontSize: 12 }}
                onClick={async () => {
                  const data = await window.electronAPI.readFile(`${r.path}/project.json`)
                  if (!data) return
                  const project = JSON.parse(data)
                  loadProject(project)
                }}
              >
                Open
              </button>
            </div>
          ))}
          <button className="btn" onClick={handleOpen} style={{ width: '100%', marginTop: 8, padding: '8px 12px', fontSize: 13 }}>
            View All Projects
          </button>
        </div>
      )}

      <PromptDialog
        open={promptOpen}
        title="New Project"
        label="Project name"
        defaultValue="Untitled"
        onConfirm={handlePromptConfirm}
        onCancel={handlePromptCancel}
      />
    </div>
  )
}
