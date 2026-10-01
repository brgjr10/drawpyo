import http from 'http'
import { URL } from 'url'
import { useAppStore } from '../src/store'
import path from 'path'
import fs from 'fs'

const PORT = 9749

type RequestHandler = (req: http.IncomingMessage, res: http.ServerResponse, body: any, params: Record<string, string>) => void

const routes: { method: string; path: string; handler: RequestHandler }[] = []

function addRoute(method: string, path: string, handler: RequestHandler) {
  routes.push({ method, path, handler })
}

function matchRoute(method: string, reqPath: string): { handler: RequestHandler; params: Record<string, string> } | null {
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

function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString()
      try {
        resolve(JSON.parse(raw))
      } catch {
        resolve(null)
      }
    })
  })
}

function json(res: http.ServerResponse, status: number, data: any) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function notFound(res: http.ServerResponse) {
  json(res, 404, { error: 'Not found' })
}

function methodNotAllowed(res: http.ServerResponse) {
  json(res, 405, { error: 'Method not allowed' })
}

const APP_ORIGIN = 'http://localhost:5173'

function setCorsHeaders(res: http.ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', APP_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function resolveProjectRoot(reqPath: string): string | null {
  const { project } = useAppStore.getState()
  if (!project) return null
  const projectRoot = path.resolve(project.path)
  const requestedPath = path.resolve(projectRoot, reqPath)
  if (!requestedPath.startsWith(projectRoot + path.sep) && requestedPath !== projectRoot) {
    return null
  }
  return requestedPath
}

addRoute('GET', '/health', (_req, res, _body, _params) => {
  json(res, 200, { status: 'ok' })
})

addRoute('GET', '/projects', (_req, res, _body, _params) => {
  const { project } = useAppStore.getState()
  if (!project) {
    json(res, 200, [])
    return
  }
  json(res, 200, [
    {
      id: project.id,
      name: project.name,
      path: project.path,
      updatedAt: project.updatedAt,
    },
  ])
})

addRoute('GET', '/projects/:id', (req, res, _body, params) => {
  const { project } = useAppStore.getState()
  if (!project || project.id !== params.id) {
    json(res, 404, { error: 'Project not found' })
    return
  }
  json(res, 200, project)
})

addRoute('POST', '/projects', (_req, res, body, _params) => {
  const { name, path: projectPath } = body || {}
  if (!name || !projectPath) {
    json(res, 400, { error: 'name and path are required' })
    return
  }
  try {
    fs.mkdirSync(projectPath, { recursive: true })
    const proj = {
      id: crypto.randomUUID(),
      name,
      path: projectPath,
      blocks: [],
      connections: [],
      groups: [],
      viewport: { x: 0, y: 0, scale: 1 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const projectFile = path.join(projectPath, 'project.json')
    fs.writeFileSync(projectFile, JSON.stringify(proj, null, 2), 'utf-8')
    useAppStore.getState().loadProject(proj)
    json(res, 200, { success: true, project: proj })
  } catch (e: any) {
    json(res, 500, { error: e.message || 'Failed to create project' })
  }
})

addRoute('POST', '/projects/:id/blocks', (req, res, body, params) => {
  const { project, addBlock } = useAppStore.getState()
  if (!project || project.id !== params.id) {
    json(res, 404, { error: 'Project not found' })
    return
  }
  const block = {
    id: crypto.randomUUID(),
    title: body.title || 'New Block',
    description: body.description || '',
    image: body.image || null,
    x: body.x || 0,
    y: body.y || 0,
    width: body.width || 120,
    height: body.height || 60,
    color: body.color || '#58a6ff',
  }
  addBlock(block)
  json(res, 200, { success: true, block })
})

addRoute('POST', '/projects/:id/connections', (req, res, body, params) => {
  const { project, addConnection } = useAppStore.getState()
  if (!project || project.id !== params.id) {
    json(res, 404, { error: 'Project not found' })
    return
  }
  const connection = {
    id: crypto.randomUUID(),
    fromBlockId: body.fromBlockId,
    toBlockId: body.toBlockId,
    fromPort: body.fromPort || 'right',
    toPort: body.toPort || 'left',
    routing: body.routing || 'squared',
    waypoints: body.waypoints || [],
  }
  addConnection(connection)
  json(res, 200, { success: true, connection })
})

addRoute('PUT', '/projects/:id/blocks/:blockId', (req, res, body, params) => {
  const { project, updateBlock } = useAppStore.getState()
  if (!project || project.id !== params.id) {
    json(res, 404, { error: 'Project not found' })
    return
  }
  updateBlock(params.blockId, body)
  json(res, 200, { success: true })
})

addRoute('DELETE', '/projects/:id/blocks/:blockId', (req, res, _body, params) => {
  const { project, deleteBlock } = useAppStore.getState()
  if (!project || project.id !== params.id) {
    json(res, 404, { error: 'Project not found' })
    return
  }
  deleteBlock(params.blockId)
  json(res, 200, { success: true })
})

addRoute('DELETE', '/projects/:id/connections/:connectionId', (req, res, _body, params) => {
  const { project, deleteConnection } = useAppStore.getState()
  if (!project || project.id !== params.id) {
    json(res, 404, { error: 'Project not found' })
    return
  }
  deleteConnection(params.connectionId)
  json(res, 200, { success: true })
})

addRoute('PUT', '/projects/:id/connections/:connectionId', (req, res, body, params) => {
  const { project, updateConnection } = useAppStore.getState()
  if (!project || project.id !== params.id) {
    json(res, 404, { error: 'Project not found' })
    return
  }
  updateConnection(params.connectionId, body)
  json(res, 200, { success: true })
})

addRoute('POST', '/projects/:id/export', (req, res, body, params) => {
  const { project } = useAppStore.getState()
  if (!project || project.id !== params.id) {
    json(res, 404, { error: 'Project not found' })
    return
  }
  const { exportCanvas } = require('../src/utils/export')
  exportCanvas(body?.transparent || false).then((blob) => {
    if (!blob) {
      json(res, 500, { error: 'Export failed' })
      return
    }
    res.writeHead(200, { 'Content-Type': 'image/png' })
    blob.arrayBuffer().then((buf) => res.end(Buffer.from(buf)))
  }).catch(() => json(res, 500, { error: 'Export failed' }))
})

addRoute('POST', '/projects/:id/theme', (req, res, body, params) => {
  const { project, setTheme } = useAppStore.getState()
  if (!project || project.id !== params.id) {
    json(res, 404, { error: 'Project not found' })
    return
  }
  if (body?.theme) {
    setTheme(body.theme)
  }
  json(res, 200, { success: true, theme: useAppStore.getState().currentTheme })
})

addRoute('POST', '/projects/:id/viewport', (req, res, body, params) => {
  const { project, setViewport } = useAppStore.getState()
  if (!project || project.id !== params.id) {
    json(res, 404, { error: 'Project not found' })
    return
  }
  if (body?.x !== undefined && body?.y !== undefined && body?.scale !== undefined) {
    setViewport({ x: body.x, y: body.y, scale: body.scale })
  }
  json(res, 200, { success: true, viewport: project.viewport })
})

addRoute('DELETE', '/projects/:id', (req, res, _body, params) => {
  const { project, clearProject } = useAppStore.getState()
  if (!project || project.id !== params.id) {
    json(res, 404, { error: 'Project not found' })
    return
  }
  clearProject()
  json(res, 200, { success: true })
})

export function startServer() {
  const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host}`)
    const path = parsedUrl.pathname
    const method = req.method || 'GET'

    setCorsHeaders(res)

    if (method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const match = matchRoute(method, path)
    if (!match) {
      notFound(res)
      return
    }

    const body = await parseBody(req)
    match.handler(req, res, body, match.params)
  })

  server.listen(PORT, () => {
    console.log(`Drawpyo API server running on http://localhost:${PORT}`)
  })

  return server
}

export function stopServer(server: http.Server) {
  server.close()
}