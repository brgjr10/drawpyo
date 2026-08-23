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
  const [showRecentModal, setShowRecentModal] = useState(false)

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

  const handleOpenRecent = async (path: string) => {
    const data = await window.electronAPI.readFile(`${path}/project.json`)
    if (!data) return
    const project = JSON.parse(data)
    loadProject(project)
    const updated = [{ id: project.id, name: project.name, path: project.path, updatedAt: project.updatedAt }, ...recent.filter((r) => r.path !== project.path)].slice(0, 10)
    setRecent(updated)
    localStorage.setItem('drawpyo_recent', JSON.stringify(updated))
    setShowRecentModal(false)
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
        <button className="btn btn-primary" onClick={handleCreate} style={{ background: theme.theme.primary, borderColor: theme.theme.primary, color: '#fff' }}>Create Project</button>
        <button className="btn" onClick={handleOpen} style={{ background: theme.theme.card, borderColor: theme.theme.cardBorder, color: theme.theme.textPrimary }}>Open Project</button>
      </div>

      {recent.length > 0 && (
        <div className="recent-list">
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.theme.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Recent Projects
          </div>
          {recent.slice(0, 5).map((r) => (
            <div key={r.id} className="recent-item" style={{ background: theme.theme.card, borderColor: theme.theme.cardBorder }}>
              <div>
                <div className="recent-item-name" style={{ color: theme.theme.textPrimary }}>{r.name}</div>
                <div className="recent-item-meta" style={{ color: theme.theme.textSecondary }}>{r.path}</div>
              </div>
              <button
                className="btn"
                style={{ padding: '4px 10px', fontSize: 12, background: theme.theme.primary, borderColor: theme.theme.primary, color: '#fff' }}
                onClick={() => handleOpenRecent(r.path)}
              >
                Open
              </button>
            </div>
          ))}
          <button className="btn" onClick={() => setShowRecentModal(true)} style={{ width: '100%', marginTop: 8, padding: '8px 12px', fontSize: 13, background: theme.theme.card, borderColor: theme.theme.cardBorder, color: theme.theme.textPrimary }}>
            View All Projects
          </button>
        </div>
      )}

      {showRecentModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }} onClick={() => setShowRecentModal(false)}>
          <div style={{
            background: theme.theme.card,
            border: `1px solid ${theme.theme.cardBorder}`,
            borderRadius: 12,
            padding: 24,
            width: 500,
            maxHeight: '80vh',
            overflow: 'auto',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 600, color: theme.theme.textPrimary, marginBottom: 16 }}>Recent Projects</div>
            {recent.length === 0 ? (
              <div style={{ color: theme.theme.textSecondary, fontSize: 13 }}>No recent projects.</div>
            ) : (
              recent.map((r) => (
                <div key={r.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: theme.theme.background,
                  marginBottom: 8,
                  cursor: 'pointer',
                }} onClick={() => handleOpenRecent(r.path)}>
                  <div>
                    <div style={{ fontWeight: 500, color: theme.theme.textPrimary, fontSize: 14 }}>{r.name}</div>
                    <div style={{ color: theme.theme.textSecondary, fontSize: 12 }}>{r.path}</div>
                  </div>
                  <button className="btn" style={{ padding: '4px 12px', fontSize: 12, background: theme.theme.primary, borderColor: theme.theme.primary, color: '#fff' }}>Open</button>
                </div>
              ))
            )}
            <button className="btn" onClick={() => setShowRecentModal(false)} style={{ marginTop: 12, width: '100%', background: theme.theme.card, borderColor: theme.theme.cardBorder, color: theme.theme.textPrimary }}>Close</button>
          </div>
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
