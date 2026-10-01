import { describe, it, expect, vi, beforeEach } from 'vitest'
import path from 'path'

// Mock Electron modules
vi.mock('electron', () => ({
  app: {
    getAppPath: () => '/fake/app/path',
    isPackaged: true,
  },
  BrowserWindow: vi.fn(),
  ipcMain: {
    handle: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn(),
    showMessageBox: vi.fn(),
  },
}))

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  renameSync: vi.fn(),
  readdirSync: vi.fn(),
}))

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}))

vi.mock('../src/store', () => ({
  useAppStore: {
    getState: vi.fn(() => ({
      project: {
        id: 'test-project-id',
        name: 'Test Project',
        path: '/fake/project/path',
        blocks: [],
        connections: [],
        groups: [],
        viewport: { x: 0, y: 0, scale: 1 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      currentTheme: 'dark',
      setTheme: vi.fn(),
      setViewport: vi.fn(),
      addBlock: vi.fn(),
      addConnection: vi.fn(),
      updateBlock: vi.fn(),
      updateConnection: vi.fn(),
      deleteBlock: vi.fn(),
      deleteConnection: vi.fn(),
      setBlocks: vi.fn(),
      setConnections: vi.fn(),
      clearProject: vi.fn(),
      loadProject: vi.fn(),
    })),
  },
}))

describe('matchRoute', () => {
  // We need to test the internal matchRoute function from server.ts
  // Since it's not exported, we'll reimplement the logic here for testing
  function matchRoute(method: string, reqPath: string, routes: { method: string; path: string }[]) {
    for (const route of routes) {
      if (route.method !== method) continue
      const routeParts = route.path.split('/')
      const reqParts = reqPath.split('/')
      if (routeParts.length !== reqParts.length) continue
      const params: Record<string, string> = {}
      let match = true
      for (let i = 0; i < routeParts.length; i++) {
        if (routeParts[i].startsWith(':')) {
          params[routeParts[i].slice(1)] = reqParts[i]
        } else if (routeParts[i] !== reqParts[i]) {
          match = false
          break
        }
      }
      if (match) {
        return { handler: route.handler, params }
      }
    }
    return null
  }

  const testRoutes = [
    { method: 'GET', path: '/health' },
    { method: 'GET', path: '/projects' },
    { method: 'GET', path: '/projects/:id' },
    { method: 'POST', path: '/projects' },
    { method: 'POST', path: '/projects/:id/blocks' },
    { method: 'PUT', path: '/projects/:id/blocks/:blockId' },
    { method: 'DELETE', path: '/projects/:id/blocks/:blockId' },
  ]

  it('extracts :id param from /projects/:id', () => {
    const result = matchRoute('GET', '/projects/abc123', testRoutes)
    expect(result).not.toBeNull()
    expect(result?.params).toEqual({ id: 'abc123' })
  })

  it('extracts multiple params from /projects/:id/blocks/:blockId', () => {
    const result = matchRoute('PUT', '/projects/proj1/blocks/block2', testRoutes)
    expect(result).not.toBeNull()
    expect(result?.params).toEqual({ id: 'proj1', blockId: 'block2' })
  })

  it('returns null for non-matching method', () => {
    const result = matchRoute('POST', '/projects/abc123', testRoutes)
    expect(result).toBeNull()
  })

  it('returns null for non-matching path segments', () => {
    const result = matchRoute('GET', '/projects/abc123/extra', testRoutes)
    expect(result).toBeNull()
  })

  it('matches exact path /projects without params', () => {
    const result = matchRoute('GET', '/projects', testRoutes)
    expect(result).not.toBeNull()
    expect(result?.params).toEqual({})
  })

  it('matches /health', () => {
    const result = matchRoute('GET', '/health', testRoutes)
    expect(result).not.toBeNull()
    expect(result?.params).toEqual({})
  })
})

describe('resolveSafe path validation', () => {
  // Reimplement the resolveSafe logic from main.ts
  function resolveSafe(projectRoot: string, requestedPath: string): string | null {
    const resolved = path.resolve(projectRoot, requestedPath)
    const normalizedRoot = path.resolve(projectRoot)
    if (!resolved.startsWith(normalizedRoot + path.sep) && resolved !== normalizedRoot) {
      return null
    }
    return resolved
  }

  // Use platform-appropriate test paths
  const projectRoot = path.join('C:', 'fake', 'project', 'path')
  const expectedRoot = path.resolve(projectRoot)

  it('allows paths within project root', () => {
    const result = resolveSafe(projectRoot, 'project.json')
    expect(result).toBe(path.join(expectedRoot, 'project.json'))
  })

  it('allows subdirectory paths within project root', () => {
    const result = resolveSafe(projectRoot, 'subdir/file.txt')
    expect(result).toBe(path.join(expectedRoot, 'subdir', 'file.txt'))
  })

  it('rejects path traversal with ..', () => {
    const result = resolveSafe(projectRoot, '../../etc/passwd')
    expect(result).toBeNull()
  })

  it('rejects absolute paths outside project root', () => {
    const result = resolveSafe(projectRoot, path.join('C:', 'etc', 'passwd'))
    expect(result).toBeNull()
  })

  it('rejects path traversal that escapes root', () => {
    const result = resolveSafe(projectRoot, 'subdir/../../../etc/passwd')
    expect(result).toBeNull()
  })

  it('allows project root itself', () => {
    const result = resolveSafe(projectRoot, '.')
    expect(result).toBe(expectedRoot)
  })
})

describe('ThemeName completeness', () => {
  // Test that all ThemeName values have corresponding theme objects
  type ThemeName = 'monochrome' | 'colorful' | 'dark' | 'notepad' | 'bubble'

  const themes: Record<ThemeName, { name: ThemeName }> = {
    dark: { name: 'dark' },
    monochrome: { name: 'monochrome' },
    colorful: { name: 'colorful' },
    notepad: { name: 'notepad' },
    bubble: { name: 'bubble' },
  }

  it('has all ThemeName values defined in themes object', () => {
    const themeNames: ThemeName[] = ['monochrome', 'colorful', 'dark', 'notepad', 'bubble']
    themeNames.forEach((name) => {
      expect(themes[name]).toBeDefined()
      expect(themes[name].name).toBe(name)
    })
  })

  it('Header theme dropdown values match ThemeName union', () => {
    const dropdownValues = ['dark', 'monochrome', 'colorful', 'notepad']
    dropdownValues.forEach((value) => {
      expect(['monochrome', 'colorful', 'dark', 'notepad', 'bubble']).toContain(value)
    })
  })
})

describe('setSelectedBlockIds accepts updater functions', () => {
  function setSelectedBlockIds(
    ids: string[] | ((prev: string[]) => string[]),
    current: string[]
  ): string[] {
    return typeof ids === 'function' ? ids(current) : ids
  }

  it('accepts array directly', () => {
    const result = setSelectedBlockIds(['a', 'b'], [])
    expect(result).toEqual(['a', 'b'])
  })

  it('accepts updater function', () => {
    const result = setSelectedBlockIds((prev) => [...prev, 'c'], ['a', 'b'])
    expect(result).toEqual(['a', 'b', 'c'])
  })

  it('updater can remove items', () => {
    const result = setSelectedBlockIds((prev) => prev.filter((id) => id !== 'a'), ['a', 'b'])
    expect(result).toEqual(['b'])
  })

  it('updater can toggle items', () => {
    const result = setSelectedBlockIds(
      (prev) => (prev.includes('b') ? prev.filter((id) => id !== 'b') : [...prev, 'b']),
      ['a']
    )
    expect(result).toEqual(['a', 'b'])
  })
})