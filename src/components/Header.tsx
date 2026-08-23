import { useState } from 'react'
import { useTheme } from './ThemeProvider'
import { useAppStore } from '../store'
import { Project } from '../types'
import { PromptDialog } from './PromptDialog'

export const Header = () => {
  const theme = useTheme()
  const { currentTheme, setTheme, project, clearProject } = useAppStore()
  const [promptOpen, setPromptOpen] = useState(false)
  const [pendingProjectPath, setPendingProjectPath] = useState<string | null>(null)

  const handleNewProject = async () => {
    const path = await window.electronAPI.openDirectory()
    if (!path) return
    setPendingProjectPath(path)
    setPromptOpen(true)
  }

  const handlePromptConfirm = async (name: string) => {
    if (!pendingProjectPath) return
    const trimmed = name.trim() || 'Untitled'
    await window.electronAPI.mkdir(pendingProjectPath)
    const proj = {
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
    await window.electronAPI.writeFile(`${pendingProjectPath}/project.json`, JSON.stringify(proj, null, 2))
    useAppStore.getState().loadProject(proj)
    setPromptOpen(false)
    setPendingProjectPath(null)
  }

  const handlePromptCancel = () => {
    setPromptOpen(false)
    setPendingProjectPath(null)
  }

  const handleOpenProject = async () => {
    const path = await window.electronAPI.selectProject()
    if (!path) return
    const data = await window.electronAPI.readFile(`${path}/project.json`)
    if (!data) {
      alert('Invalid project folder')
      return
    }
    const proj = JSON.parse(data) as Project
    useAppStore.getState().loadProject(proj)
  }

  const handleSave = async () => {
    const { project: proj } = useAppStore.getState()
    if (!proj) return
    await window.electronAPI.writeFile(`${proj.path}/project.json`, JSON.stringify(proj, null, 2))
  }

  const handleExportImage = async () => {
    const { project: proj } = useAppStore.getState()
    if (!proj) return
    const { exportCanvas } = await import('../utils/export')
    const blob = await exportCanvas()
    if (!blob) return
    const reader = new FileReader()
    reader.onload = () => {
      const buffer = Buffer.from(reader.result as ArrayBuffer)
      window.electronAPI.writeFile(`${proj.path}/export.png`, buffer.toString('base64'))
        .then(() => alert('Exported to project folder'))
    }
    reader.readAsArrayBuffer(blob)
  }

  return (
    <div className="header" style={{ background: theme.theme.card, borderBottomColor: theme.theme.cardBorder }}>
      <div className="header-title" style={{ color: theme.theme.textPrimary }}>
        {project ? project.name : 'Drawpyo'}
      </div>

      {!project ? (
        <>
          <button className="btn btn-primary" onClick={handleNewProject}>New Project</button>
          <button className="btn" onClick={handleOpenProject}>Open Project</button>
        </>
      ) : (
        <>
          <button className="btn" onClick={handleNewProject}>New</button>
          <button className="btn" onClick={handleOpenProject}>Open</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
          <button className="btn" onClick={handleExportImage}>Export</button>
          <button className="btn btn-danger" onClick={clearProject}>Close</button>
        </>
      )}

      <div style={{ width: 1, height: 24, background: theme.theme.cardBorder, margin: '0 8px' }} />

      <select
        className="select"
        value={currentTheme}
        onChange={(e) => setTheme(e.target.value as any)}
        style={{ background: theme.theme.background, color: theme.theme.textPrimary, borderColor: theme.theme.cardBorder }}
      >
        <option value="dark">Dark</option>
        <option value="monochrome">Monochrome</option>
        <option value="colorful">Colorful</option>
        <option value="bubble">Bubble</option>
      </select>

      {project && (
        <>
          <div style={{ width: 1, height: 24, background: theme.theme.cardBorder, margin: '0 8px' }} />
          <div className="zoom-controls">
            <button className="btn" onClick={() => useAppStore.getState().setZoom(useAppStore.getState().zoom - 0.1)}>-</button>
            <span className="zoom-label" style={{ color: theme.theme.textSecondary }}>
              {Math.round(useAppStore.getState().zoom * 100)}%
            </span>
            <button className="btn" onClick={() => useAppStore.getState().setZoom(useAppStore.getState().zoom + 0.1)}>+</button>
            <button className="btn" onClick={() => useAppStore.getState().setZoom(1)}>Reset</button>
          </div>
        </>
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
