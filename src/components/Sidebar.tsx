import { useState, useCallback } from 'react'
import { useTheme } from './ThemeProvider'
import { useAppStore } from '../store'
import { Block } from '../types'

export const Sidebar = () => {
  const theme = useTheme()
  const { project, sidebarCollapsed, toggleSidebar, selectedBlockIds, selectedConnectionId, updateBlock, deleteBlock, updateConnection, deleteConnection } = useAppStore()

  if (sidebarCollapsed) {
    return (
      <div className="sidebar collapsed" style={{ borderLeftColor: theme.theme.cardBorder, display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.theme.card }}>
        <button className="btn" aria-label="Show sidebar" onClick={toggleSidebar} style={{ padding: 4, width: 24, height: 24, fontSize: 16, lineHeight: 1, background: theme.theme.card, borderColor: theme.theme.cardBorder, color: theme.theme.textPrimary }}>&gt;</button>
      </div>
    )
  }

  const selectedBlock = selectedBlockIds.length === 1
    ? project?.blocks.find((b) => b.id === selectedBlockIds[0])
    : null

  const selectedConnection = selectedConnectionId
    ? project?.connections.find((c) => c.id === selectedConnectionId)
    : null

  return (
    <aside className="sidebar" aria-label="Editor panel" style={{ background: theme.theme.card, borderLeftColor: theme.theme.cardBorder }}>
      <div className="sidebar-header" style={{ color: theme.theme.textPrimary, opacity: 0.8, borderBottomColor: theme.theme.cardBorder }}>
        Editor
        <button className="btn" aria-label="Hide sidebar" onClick={toggleSidebar} style={{ marginLeft: 'auto', padding: 2, width: 24, height: 24, fontSize: 12, background: theme.theme.card, borderColor: theme.theme.cardBorder, color: theme.theme.textPrimary }}>&gt;</button>
      </div>
      <div className="sidebar-body">
        {selectedBlock ? (
          <BlockEditor
            block={selectedBlock}
            theme={theme.theme}
            onUpdate={(patch) => updateBlock(selectedBlock.id, patch)}
            onDelete={() => deleteBlock(selectedBlock.id)}
          />
        ) : selectedConnection ? (
          <ConnectionEditor
            connection={selectedConnection}
            theme={theme.theme}
            onUpdate={(patch) => updateConnection(selectedConnection.id, patch)}
            onDelete={() => deleteConnection(selectedConnection.id)}
          />
        ) : (
          <div className="empty-state" style={{ color: theme.theme.textPrimary, opacity: 0.6 }}>
            Select a block or connection to edit its properties.
          </div>
        )}
      </div>
    </aside>
  )
}

const BlockEditor = ({
  block,
  theme,
  onUpdate,
  onDelete,
}: {
  block: Block
  theme: ReturnType<typeof useTheme>['theme']
  onUpdate: (patch: Partial<Block>) => void
  onDelete: () => void
}) => {
  const [dragOver, setDragOver] = useState(false)

  const handleFileSelect = async () => {
    const path = await window.electronAPI.selectImageFile()
    if (!path) return
    const dataUrl = await window.electronAPI.readImageFile(path)
    if (dataUrl) {
      onUpdate({ image: dataUrl })
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file || !file.type.startsWith('image/')) return
    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(file)
    })
    if (dataUrl) {
      onUpdate({ image: dataUrl })
    }
  }

  return (
    <div className="sidebar-section">
      <div className="sidebar-label">Block</div>
      <div className="sidebar-row">
        <label htmlFor="block-title" style={{ fontSize: 12, color: theme.textPrimary, opacity: 0.7 }}>Title</label>
        <input
          id="block-title"
          className="input"
          value={block.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          style={{ background: theme.background, color: theme.textPrimary, borderColor: theme.cardBorder }}
        />
      </div>
      <div className="sidebar-row" style={{ marginTop: 12 }}>
        <label htmlFor="block-description" style={{ fontSize: 12, color: theme.textPrimary, opacity: 0.7 }}>Description</label>
        <textarea
          id="block-description"
          className="textarea"
          value={block.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          style={{ background: theme.background, color: theme.textPrimary, borderColor: theme.cardBorder }}
        />
      </div>
      <div className="sidebar-row" style={{ marginTop: 12 }}>
        <span style={{ fontSize: 12, color: theme.textPrimary, opacity: 0.7 }}>Size</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} role="group" aria-label="Block size">
          <button className="btn" aria-label="Decrease block width" onClick={() => onUpdate({ width: Math.max(80, block.width - 20) })} style={{ padding: '2px 8px', fontSize: 12, background: theme.card, borderColor: theme.cardBorder, color: theme.textPrimary }}>W-</button>
          <button className="btn" aria-label="Increase block width" onClick={() => onUpdate({ width: block.width + 20 })} style={{ padding: '2px 8px', fontSize: 12, background: theme.card, borderColor: theme.cardBorder, color: theme.textPrimary }}>W+</button>
          <button className="btn" aria-label="Decrease block height" onClick={() => onUpdate({ height: Math.max(40, block.height - 20) })} style={{ padding: '2px 8px', fontSize: 12, background: theme.card, borderColor: theme.cardBorder, color: theme.textPrimary }}>H-</button>
          <button className="btn" aria-label="Increase block height" onClick={() => onUpdate({ height: block.height + 20 })} style={{ padding: '2px 8px', fontSize: 12, background: theme.card, borderColor: theme.cardBorder, color: theme.textPrimary }}>H+</button>
        </div>
      </div>
      <div className="sidebar-row" style={{ marginTop: 12 }}>
        <span style={{ fontSize: 12, color: theme.textPrimary, opacity: 0.7 }}>Image</span>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !block.image && handleFileSelect()}
          onKeyDown={(e) => {
            if (block.image) return
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleFileSelect()
            }
          }}
          role={block.image ? 'group' : 'button'}
          tabIndex={block.image ? undefined : 0}
          aria-label={block.image ? undefined : 'Drop an image here or choose a file'}
          style={{
            border: `2px dashed ${dragOver ? theme.primary : theme.cardBorder}`,
            borderRadius: 8,
            padding: block.image ? 0 : 20,
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? `${theme.primary}10` : theme.background,
            position: 'relative',
            overflow: 'hidden',
            minHeight: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {block.image ? (
            <>
              <img
                src={block.image}
                alt={block.title ? `${block.title} image` : 'Block image'}
                style={{ width: '100%', height: 'auto', maxHeight: 160, objectFit: 'contain', borderRadius: 6, display: 'block' }}
              />
              <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
                <button
                  className="btn"
                  style={{ padding: '2px 8px', fontSize: 11, background: theme.card, borderColor: theme.cardBorder, color: theme.textPrimary }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); handleFileSelect() }}
                >
                  Change
                </button>
                <button
                  className="btn btn-danger"
                  style={{ padding: '2px 8px', fontSize: 11, background: theme.danger, borderColor: theme.danger, color: '#fff' }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); onUpdate({ image: null }) }}
                >
                  Remove
                </button>
              </div>
            </>
          ) : (
            <div style={{ color: theme.textPrimary, opacity: 0.6, fontSize: 12 }}>
              Drop an image here or click to browse
              <div style={{ marginTop: 8 }}>
                <button className="btn" style={{ fontSize: 11, background: theme.card, borderColor: theme.cardBorder, color: theme.textPrimary }} onClick={(e) => { e.stopPropagation(); handleFileSelect() }}>Choose File</button>
              </div>
            </div>
          )}
        </div>
        <div className="sidebar-row" style={{ marginTop: 8 }}>
          <label htmlFor="block-image-url" style={{ fontSize: 12, color: theme.textPrimary, opacity: 0.7 }}>Or enter Image URL</label>
          <input
            id="block-image-url"
            className="input"
            value={block.image && !block.image.startsWith('data:') ? block.image : ''}
            onChange={(e) => onUpdate({ image: e.target.value || null })}
            placeholder="https://..."
            style={{ background: theme.background, color: theme.textPrimary, borderColor: theme.cardBorder }}
          />
        </div>
      </div>
      <div className="sidebar-row" style={{ marginTop: 12 }}>
        <span style={{ fontSize: 12, color: theme.textPrimary, opacity: 0.7 }}>Color</span>
        <div style={{ display: 'flex', gap: 8 }} role="group" aria-label="Block color">
          {['#58a6ff', '#3fb950', '#d29922', '#f85149', '#a371f7', '#f778ba'].map((c) => (
            <button
              key={c}
              type="button"
              className={`color-swatch ${block.color === c ? 'active' : ''}`}
              style={{ background: c }}
              aria-label={`Set block color ${c}`}
              aria-pressed={block.color === c}
              onClick={() => onUpdate({ color: c })}
            />
          ))}
          <button
            type="button"
            className={`color-swatch ${!block.color ? 'active' : ''}`}
            style={{ background: 'transparent', border: '2px dashed ' + theme.cardBorder }}
            aria-label="Set no block color"
            aria-pressed={!block.color}
            onClick={() => onUpdate({ color: '' })}
          />
        </div>
      </div>
      <div style={{ marginTop: 20 }}>
        <button className="btn btn-danger" onClick={onDelete} style={{ width: '100%', background: theme.danger, borderColor: theme.danger, color: '#fff' }}>Delete Block</button>
      </div>
    </div>
  )
}

const ConnectionEditor = ({
  connection,
  theme,
  onUpdate,
  onDelete,
}: {
  connection: any
  theme: ReturnType<typeof useTheme>['theme']
  onUpdate: (patch: any) => void
  onDelete: () => void
}) => (
  <div className="sidebar-section">
    <div className="sidebar-label">Connection</div>
    <div className="sidebar-row">
      <label style={{ fontSize: 12, color: theme.textPrimary, opacity: 0.7 }}>Routing</label>
      <select
        className="select"
        value={connection.routing}
        onChange={(e) => onUpdate({ routing: e.target.value })}
        style={{ background: theme.background, color: theme.textPrimary, borderColor: theme.cardBorder }}
      >
        <option value="squared">Squared</option>
        <option value="curved">Curved</option>
        <option value="user-guided">User-Guided</option>
      </select>
    </div>
    <div style={{ marginTop: 20 }}>
      <button className="btn btn-danger" onClick={onDelete} style={{ width: '100%', background: theme.danger, borderColor: theme.danger, color: '#fff' }}>Delete Connection</button>
    </div>
  </div>
)
