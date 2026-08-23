import http from 'http'
import { URL } from 'url'
import { useAppStore } from '../src/store'

const PORT = 9749

type RequestHandler = (req: http.IncomingMessage, res: http.ServerResponse, body: any) => void

const routes: { method: string; path: string; handler: RequestHandler }[] = []

function addRoute(method: string, path: string, handler: RequestHandler) {
  routes.push({ method, path, handler })
}

function matchRoute(method: string, reqPath: string): RequestHandler | null {
  for (const route of routes) {
    if (route.method !== method) continue
    const routeParts = route.path.split('/')
    const reqParts = reqPath.split('/')
    if (routeParts.length !== reqParts.length) continue
    return route.handler
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

addRoute('GET', '/projects', (_req, res) => {
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

addRoute('GET', '/projects/:id', (req, res, _body) => {
  const { id } = (req as any).params as { id: string }
  const { project } = useAppStore.getState()
  if (!project || project.id !== id) {
    json(res, 404, { error: 'Project not found' })
    return
  }
  json(res, 200, project)
})

addRoute('POST', '/projects', (_req, res, body) => {
  const { project } = useAppStore.getState()
  json(res, 200, { success: true, project })
})

addRoute('POST', '/projects/:id/blocks', (req, res, body) => {
  const { id } = (req as any).params as { id: string }
  const { project, addBlock } = useAppStore.getState()
  if (!project || project.id !== id) {
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

addRoute('POST', '/projects/:id/connections', (req, res, body) => {
  const { id } = (req as any).params as { id: string }
  const { project, addConnection } = useAppStore.getState()
  if (!project || project.id !== id) {
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

addRoute('PUT', '/projects/:id/blocks/:blockId', (req, res, body) => {
  const { id, blockId } = (req as any).params as { id: string; blockId: string }
  const { project, updateBlock } = useAppStore.getState()
  if (!project || project.id !== id) {
    json(res, 404, { error: 'Project not found' })
    return
  }
  updateBlock(blockId, body)
  json(res, 200, { success: true })
})

addRoute('DELETE', '/projects/:id/blocks/:blockId', (req, res) => {
  const { id, blockId } = (req as any).params as { id: string; blockId: string }
  const { project, deleteBlock } = useAppStore.getState()
  if (!project || project.id !== id) {
    json(res, 404, { error: 'Project not found' })
    return
  }
  deleteBlock(blockId)
  json(res, 200, { success: true })
})

addRoute('DELETE', '/projects/:id/connections/:connectionId', (req, res) => {
  const { id, connectionId } = (req as any).params as { id: string; connectionId: string }
  const { project, deleteConnection } = useAppStore.getState()
  if (!project || project.id !== id) {
    json(res, 404, { error: 'Project not found' })
    return
  }
  deleteConnection(connectionId)
  json(res, 200, { success: true })
})

export function startServer() {
  const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host}`)
    const path = parsedUrl.pathname
    const method = req.method || 'GET'

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const handler = matchRoute(method, path)
    if (!handler) {
      notFound(res)
      return
    }

    const body = await parseBody(req)
    handler(req, res, body)
  })

  server.listen(PORT, () => {
    console.log(`Drawpyo API server running on http://localhost:${PORT}`)
  })

  return server
}

export function stopServer(server: http.Server) {
  server.close()
}
