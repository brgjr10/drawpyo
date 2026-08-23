import React, { useState, useEffect } from 'react'
import { useTheme } from './ThemeProvider'

export const PromptDialog = ({
  open,
  title,
  label,
  defaultValue,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  label: string
  defaultValue?: string
  onConfirm: (value: string) => void
  onCancel: () => void
}) => {
  const theme = useTheme()
  const [value, setValue] = useState(defaultValue || '')

  useEffect(() => {
    if (open) {
      setValue(defaultValue || '')
    }
  }, [open, defaultValue])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        style={{
          background: theme.theme.card,
          border: `1px solid ${theme.theme.cardBorder}`,
          borderRadius: 12,
          padding: 24,
          width: 360,
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ color: theme.theme.textPrimary, fontWeight: 600, marginBottom: 8 }}>{title}</div>
        <div style={{ color: theme.theme.textSecondary, fontSize: 13, marginBottom: 12 }}>{label}</div>
        <input
          autoFocus
          className="input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onConfirm(value)
            if (e.key === 'Escape') onCancel()
          }}
          style={{
            width: '100%',
            background: theme.theme.background,
            color: theme.theme.textPrimary,
            borderColor: theme.theme.cardBorder,
            marginBottom: 16,
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn" onClick={onCancel} style={{ color: theme.theme.textSecondary }}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onConfirm(value)}
            style={{ background: theme.theme.primary, borderColor: theme.theme.primary, color: '#fff' }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
