import { useState, useCallback } from 'react'
import { useTheme } from './ThemeProvider'
import { useAppStore } from '../store'
import { Project } from '../types'
import { PromptDialog } from './PromptDialog'
import { applyScanResult } from '../utils/scanner'

export const Header = () => {
  const theme = useTheme()
  const { currentTheme, setTheme, project, clearProject, isDirty, markClean } = useAppStore()
  const [promptOpen, setPromptOpen] = useState(false)
  const [pendingProjectPath, setPendingProjectPath] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [scanStatus, setScanStatus] = useState<string | null>(null)

  const showSaveStatus = useCallback((msg: string) => {
    setSaveStatus(msg)
    setTimeout(() => setSaveStatus(null), 2000)
  }, [])

  const confirmUnsaved = useCallback(() => {
    if (!isDirty) return true
    return window.confirm('You have unsaved changes. Are you sure you want to continue?')
  }, [isDirty])

  const handleNewProject = async () => {
    if (!confirmUnsaved()) return
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
    if (!confirmUnsaved()) return
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
    markClean()
    showSaveStatus('Saved!')
  }

  const handleClose = async () => {
    if (!confirmUnsaved()) return
    clearProject()
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
        .then(() => showSaveStatus('Exported!'))
    }
    reader.readAsArrayBuffer(blob)
  }

  const handleAutoScan = async () => {
    const { project: proj } = useAppStore.getState()
    if (!proj) return
    setScanStatus('Scanning...')
    try {
      const result = await window.electronAPI.scanProject(proj.path)
      if (result.error) {
        setScanStatus(`Scan failed: ${result.error}`)
        setTimeout(() => setScanStatus(null), 4000)
        return
      }
      if (result.data) {
        applyScanResult(result.data)
        setScanStatus(`Scan complete: ${result.data.components?.length || 0} components found`)
        setTimeout(() => setScanStatus(null), 4000)
      }
    } catch (e: any) {
      setScanStatus(`Scan error: ${e.message}`)
      setTimeout(() => setScanStatus(null), 4000)
    }
  }

  return (
    <div className="header" style={{ background: theme.theme.card, borderBottomColor: theme.theme.cardBorder }}>
      <div className="header-title" style={{ color: theme.theme.textPrimary }}>
        {project ? project.name : 'Drawpyo'}
      </div>

      {!project ? (
        <>
          <button className="btn btn-primary" onClick={handleNewProject} style={{ background: theme.theme.primary, borderColor: theme.theme.primary, color: '#fff' }}>New Project</button>
          <button className="btn" onClick={handleOpenProject} style={{ background: theme.theme.card, borderColor: theme.theme.cardBorder, color: theme.theme.textPrimary }}>Open Project</button>
        </>
      ) : (
        <>
          <button className="btn" onClick={handleNewProject} style={{ background: theme.theme.card, borderColor: theme.theme.cardBorder, color: theme.theme.textPrimary }}>New</button>
          <button className="btn" onClick={handleOpenProject} style={{ background: theme.theme.card, borderColor: theme.theme.cardBorder, color: theme.theme.textPrimary }}>Open</button>
          <button className="btn btn-primary" onClick={handleSave} style={{ background: theme.theme.primary, borderColor: theme.theme.primary, color: '#fff' }}>Save</button>
          <button className="btn" onClick={handleExportImage} style={{ background: theme.theme.card, borderColor: theme.theme.cardBorder, color: theme.theme.textPrimary }}>Export</button>
          <button className="btn" onClick={handleAutoScan} style={{ background: theme.theme.success, borderColor: theme.theme.success, color: '#fff' }}>Auto-Scan</button>
          <button className="btn btn-danger" onClick={handleClose} style={{ background: theme.theme.danger, borderColor: theme.theme.danger, color: '#fff' }}>Close</button>
        </>
      )}

      {saveStatus && (
        <span style={{ color: theme.theme.success, fontSize: 12, marginLeft: 8 }}>{saveStatus}</span>
      )}

      {scanStatus && (
        <span style={{ color: theme.theme.warning, fontSize: 12, marginLeft: 8 }}>{scanStatus}</span>
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
        <option value="notepad">Notepad</option>
      </select>

      {project && (
        <>
          <div style={{ width: 1, height: 24, background: theme.theme.cardBorder, margin: '0 8px' }} />
          <div className="zoom-controls">
            <button className="btn" onClick={() => useAppStore.getState().setZoom(useAppStore.getState().zoom - 0.1)} style={{ background: theme.theme.card, borderColor: theme.theme.cardBorder, color: theme.theme.textPrimary }}>-</button>
            <span className="zoom-label" style={{ color: theme.theme.textSecondary }}>
              {Math.round(useAppStore.getState().zoom * 100)}%
            </span>
            <button className="btn" onClick={() => useAppStore.getState().setZoom(useAppStore.getState().zoom + 0.1)} style={{ background: theme.theme.card, borderColor: theme.theme.cardBorder, color: theme.theme.textPrimary }}>+</button>
            <button className="btn" onClick={() => useAppStore.getState().setZoom(1)} style={{ background: theme.theme.card, borderColor: theme.theme.cardBorder, color: theme.theme.textPrimary }}>Reset</button>
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
