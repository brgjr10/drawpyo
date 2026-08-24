import { create } from 'zustand'
import { Block, Connection, Group, Project, Theme, ThemeName, Tool } from './types'

interface AppState {
  project: Project | null
  projects: { id: string; name: string; path: string; updatedAt: string }[]
  recentProjects: string[]
  currentTheme: ThemeName
  theme: Theme
  selectedBlockIds: string[]
  selectedConnectionId: string | null
  activeTool: Tool
  sidebarCollapsed: boolean
  zoom: number
  isDirty: boolean
  originalProject: Project | null
  setTheme: (theme: ThemeName) => void
  setActiveTool: (tool: Tool) => void
  toggleSidebar: () => void
  setZoom: (zoom: number) => void
  loadProject: (project: Project) => void
  clearProject: () => void
  setBlocks: (blocks: Block[]) => void
  setConnections: (connections: Connection[]) => void
  setGroups: (groups: Group[]) => void
  addBlock: (block: Block) => void
  updateBlock: (id: string, patch: Partial<Block>) => void
  deleteBlock: (id: string) => void
  addConnection: (connection: Connection) => void
  updateConnection: (id: string, patch: Partial<Connection>) => void
  deleteConnection: (id: string) => void
  addGroup: (group: Group) => void
  updateGroup: (id: string, patch: Partial<Group>) => void
  deleteGroup: (id: string) => void
  setSelectedBlockIds: (ids: string[]) => void
  setSelectedConnectionId: (id: string | null) => void
  setViewport: (viewport: Project['viewport']) => void
  updateProjectMeta: (name: string, path: string) => void
  markDirty: () => void
  markClean: () => void
  hasUnsavedChanges: () => boolean
  setConnectionRouting: (routing: Connection['routing']) => void
  removeLooseBlocks: () => void
}

const themes: Record<ThemeName, Theme> = {
  dark: {
    name: 'dark',
    background: '#0d1117',
    canvas: '#0a0a0a',
    card: '#161b22',
    cardBorder: '#30363d',
    textPrimary: '#c9d1d9',
    textSecondary: '#8b949e',
    primary: '#58a6ff',
    success: '#3fb950',
    warning: '#d29922',
    danger: '#f85149',
    fontFamily: 'Inter, Segoe UI, sans-serif',
  },
  monochrome: {
    name: 'monochrome',
    background: '#0d1117',
    canvas: '#0d1117',
    card: '#161b22',
    cardBorder: '#30363d',
    textPrimary: '#c9d1d9',
    textSecondary: '#8b949e',
    primary: '#58a6ff',
    success: '#3fb950',
    warning: '#d29922',
    danger: '#f85149',
    fontFamily: 'Inter, Segoe UI, sans-serif',
  },
  colorful: {
    name: 'colorful',
    background: '#0f172a',
    canvas: '#1e293b',
    card: '#334155',
    cardBorder: '#475569',
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    primary: '#38bdf8',
    success: '#4ade80',
    warning: '#facc15',
    danger: '#f87171',
    fontFamily: 'Inter, Segoe UI, sans-serif',
  },
  notepad: {
    name: 'notepad',
    background: '#fdf6e3',
    canvas: '#fef9ef',
    card: '#ffffff',
    cardBorder: '#e5dcc5',
    textPrimary: '#433422',
    textSecondary: '#8c7b6b',
    primary: '#d97706',
    success: '#059669',
    warning: '#b45309',
    danger: '#dc2626',
    fontFamily: 'Inter, Segoe UI, sans-serif',
  },
}

export const useAppStore = create<AppState>((set, get) => ({
  project: null,
  projects: [],
  recentProjects: [],
  currentTheme: 'dark',
  theme: themes.dark,
  selectedBlockIds: [],
  selectedConnectionId: null,
  activeTool: 'select',
  sidebarCollapsed: false,
  zoom: 1,
  isDirty: false,
  originalProject: null,
  setTheme: (theme) => set({ currentTheme: theme, theme: themes[theme] }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(3, zoom)) }),
  loadProject: (project) =>
    set({
      project,
      theme: themes[get().currentTheme],
      selectedBlockIds: [],
      selectedConnectionId: null,
      isDirty: false,
      originalProject: project,
    }),
  clearProject: () =>
    set({
      project: null,
      selectedBlockIds: [],
      selectedConnectionId: null,
      isDirty: false,
      originalProject: null,
    }),
  setBlocks: (blocks) =>
    set((s) => ({
      project: s.project ? { ...s.project, blocks, updatedAt: new Date().toISOString() } : null,
      isDirty: true,
    })),
  setConnections: (connections) =>
    set((s) => ({
      project: s.project ? { ...s.project, connections, updatedAt: new Date().toISOString() } : null,
      isDirty: true,
    })),
  setGroups: (groups) =>
    set((s) => ({
      project: s.project ? { ...s.project, groups, updatedAt: new Date().toISOString() } : null,
      isDirty: true,
    })),
  addBlock: (block) =>
    set((s) => {
      if (!s.project) return s
      return {
        project: {
          ...s.project,
          blocks: [...s.project.blocks, block],
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      }
    }),
  updateBlock: (id, patch) =>
    set((s) => {
      if (!s.project) return s
      return {
        project: {
          ...s.project,
          blocks: s.project.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      }
    }),
  deleteBlock: (id) =>
    set((s) => {
      if (!s.project) return s
      return {
        project: {
          ...s.project,
          blocks: s.project.blocks.filter((b) => b.id !== id),
          connections: s.project.connections.filter(
            (c) => c.fromBlockId !== id && c.toBlockId !== id
          ),
          updatedAt: new Date().toISOString(),
        },
        selectedBlockIds: s.selectedBlockIds.filter((bid) => bid !== id),
        isDirty: true,
      }
    }),
  addConnection: (connection) =>
    set((s) => {
      if (!s.project) return s
      return {
        project: {
          ...s.project,
          connections: [...s.project.connections, connection],
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      }
    }),
  updateConnection: (id, patch) =>
    set((s) => {
      if (!s.project) return s
      return {
        project: {
          ...s.project,
          connections: s.project.connections.map((c) =>
            c.id === id ? { ...c, ...patch } : c
          ),
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      }
    }),
  deleteConnection: (id) =>
    set((s) => {
      if (!s.project) return s
      return {
        project: {
          ...s.project,
          connections: s.project.connections.filter((c) => c.id !== id),
          updatedAt: new Date().toISOString(),
        },
        selectedConnectionId: s.selectedConnectionId === id ? null : s.selectedConnectionId,
        isDirty: true,
      }
    }),
  addGroup: (group) =>
    set((s) => {
      if (!s.project) return s
      return {
        project: {
          ...s.project,
          groups: [...s.project.groups, group],
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      }
    }),
  updateGroup: (id, patch) =>
    set((s) => {
      if (!s.project) return s
      return {
        project: {
          ...s.project,
          groups: s.project.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      }
    }),
  deleteGroup: (id) =>
    set((s) => {
      if (!s.project) return s
      return {
        project: {
          ...s.project,
          groups: s.project.groups.filter((g) => g.id !== id),
          updatedAt: new Date().toISOString(),
        },
      }
    }),
  setSelectedBlockIds: (ids) => set((state) => ({ selectedBlockIds: typeof ids === 'function' ? ids(state.selectedBlockIds) : ids })),
  setSelectedConnectionId: (id) => set({ selectedConnectionId: id }),
  setConnectionRouting: (routing) =>
    set((s) => {
      if (!s.project) return s
      return {
        project: {
          ...s.project,
          connections: s.project.connections.map((c) => ({ ...c, routing, waypoints: routing === 'user-guided' ? c.waypoints : [] })),
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      }
    }),
  removeLooseBlocks: () =>
    set((s) => {
      if (!s.project) return s
      const connectedIds = new Set<string>()
      s.project.connections.forEach((c) => {
        connectedIds.add(c.fromBlockId)
        connectedIds.add(c.toBlockId)
      })
      const newBlocks = s.project.blocks.filter((b) => connectedIds.has(b.id))
      const newConnections = s.project.connections.filter((c) => connectedIds.has(c.fromBlockId) && connectedIds.has(c.toBlockId))
      const newSelected = s.selectedBlockIds.filter((id) => connectedIds.has(id))
      return {
        project: {
          ...s.project,
          blocks: newBlocks,
          connections: newConnections,
          updatedAt: new Date().toISOString(),
        },
        selectedBlockIds: newSelected,
        isDirty: true,
      }
    }),
  setViewport: (viewport) =>
    set((s) => {
      if (!s.project) return s
      return {
        project: { ...s.project, viewport, updatedAt: new Date().toISOString() },
        isDirty: true,
      }
    }),
  updateProjectMeta: (name, path) =>
    set((s) => {
      if (!s.project) return s
      return {
        project: { ...s.project, name, path, updatedAt: new Date().toISOString() },
        isDirty: true,
      }
    }),
  markDirty: () => set({ isDirty: true }),
  markClean: () => set({ isDirty: false }),
  hasUnsavedChanges: () => get().isDirty,
}))
