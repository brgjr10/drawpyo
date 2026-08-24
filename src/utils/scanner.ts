import { Block, Connection } from '../types'
import { useAppStore } from '../store'

const COLORS: Record<string, string> = {
  api: '#58a6ff',
  database: '#3fb950',
  cloud: '#d29922',
  queue: '#a371f7',
  service: '#f778ba',
  module: '#8b949e',
}

const TECH_LABELS: Record<string, string> = {
  fastapi: 'FastAPI',
  flask: 'Flask',
  express: 'Express',
  spring: 'Spring',
  go: 'Go',
  graphql: 'GraphQL',
  grpc: 'gRPC',
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  mongodb: 'MongoDB',
  sqlalchemy: 'SQLAlchemy',
  redis: 'Redis',
  celery: 'Celery',
  aws: 'AWS',
  docker: 'Docker',
}

export interface ScanComponent {
  id: string
  type: string
  name: string
  technology: string
  file: string
  line: number
  description: string
  metadata: Record<string, any>
}

export interface ScanConnection {
  source: string
  target: string
  type: string
  confidence: number
}

export interface ScanResult {
  project: string
  path: string
  components: ScanComponent[]
  connections: ScanConnection[]
}

export function applyScanResult(result: ScanResult) {
  const { setBlocks, setConnections, setViewport } = useAppStore.getState()
  if (!result.components.length) return

  const padding = 80
  const blockW = 160
  const blockH = 64
  const gapX = 320
  const gapY = 150

  const uniqueComponents = new Map<string, ScanComponent>()
  result.components.forEach((c) => {
    const key = `${c.name.trim().toLowerCase()}|||${c.file.trim().toLowerCase()}`
    if (!uniqueComponents.has(key)) {
      uniqueComponents.set(key, c)
    }
  })

  const components = Array.from(uniqueComponents.values())
  if (!components.length) return

  const typeOrder = ['api', 'database', 'queue', 'cloud', 'service', 'module', 'style', 'template', 'test', 'config', 'build', 'docs', 'data']
  const grouped: Record<string, ScanComponent[]> = {}
  for (const c of components) {
    const t = c.type || 'module'
    grouped[t] = grouped[t] || []
    grouped[t].push(c)
  }

  const blocks: Block[] = []
  const connections: Connection[] = []
  const idMap: Record<string, string> = {}

  let col = 0
  for (const type of typeOrder) {
    const items = grouped[type] || []
    if (!items.length) continue
    items.forEach((item, row) => {
      const techLabel = TECH_LABELS[item.technology] || item.technology
      const title = item.name.length > 24 ? item.name.slice(0, 22) + '...' : item.name
      const desc = [techLabel, item.file].filter(Boolean).join('\n')
      const id = crypto.randomUUID()
      idMap[item.name + '\x00' + item.file] = id
      const x = padding + col * gapX
      const y = padding + row * gapY
      blocks.push({ id, title, description: desc, image: null, x, y, width: blockW, height: blockH, color: COLORS[item.type] || COLORS.module })
    })
    col++
  }

  for (const conn of result.connections) {
    const sourceComp = components.find((c) => c.id === conn.source)
    const targetComp = components.find((c) => c.id === conn.target)
    if (!sourceComp || !targetComp) continue
    const fromId = idMap[sourceComp.name + '\x00' + sourceComp.file]
    const toId = idMap[targetComp.name + '\x00' + targetComp.file]
    if (fromId && toId) {
      connections.push({
        id: crypto.randomUUID(),
        fromBlockId: fromId,
        toBlockId: toId,
        fromPort: 'right',
        toPort: 'left',
        routing: 'squared',
        waypoints: [],
      })
    }
  }

  setBlocks(blocks)
  setConnections(connections)

  if (blocks.length > 0) {
    const minX = Math.min(...blocks.map((b) => b.x))
    const minY = Math.min(...blocks.map((b) => b.y))
    const maxX = Math.max(...blocks.map((b) => b.x + b.width))
    const maxY = Math.max(...blocks.map((b) => b.y + b.height))
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    useAppStore.getState().setViewport({ x: -cx, y: -cy, scale: 1 })
  }
}

export function regroupAll() {
  const { project, setBlocks, setConnections } = useAppStore.getState()
  if (!project || project.blocks.length === 0) return

  const connMap: Record<string, string[]> = {}
  const parentCount: Record<string, number> = {}
  project.connections.forEach((conn) => {
    connMap[conn.fromBlockId] = connMap[conn.fromBlockId] || []
    connMap[conn.fromBlockId].push(conn.toBlockId)
    parentCount[conn.toBlockId] = (parentCount[conn.toBlockId] || 0) + 1
  })

  const roots = project.blocks.filter((b) => !parentCount[b.id])
  const visited = new Set<string>()
  const levels: Record<number, Block[]> = {}
  const blockMap = new Map(project.blocks.map((b) => [b.id, { ...b }]))

  const placeNode = (blockId: string, level: number, index: number, siblingCount: number) => {
    if (visited.has(blockId)) return
    visited.add(blockId)
    levels[level] = levels[level] || []
    levels[level].push(blockMap.get(blockId)!)
    const childs = connMap[blockId] || []
    childs.forEach((childId, idx) => placeNode(childId, level + 1, idx, childs.length))
  }

  roots.forEach((root, idx) => placeNode(root.id, 0, idx, roots.length))

  project.blocks.forEach((b) => {
    if (!visited.has(b.id)) {
      const level = Object.keys(levels).length
      levels[level] = levels[level] || []
      levels[level].push(blockMap.get(b.id)!)
    }
  })

  const newBlocks: Block[] = []
  const idMap: Record<string, number> = {}
  Object.entries(levels).forEach(([level, blocksAtLevel]) => {
    blocksAtLevel.forEach((b, idx) => {
      idMap[b.id] = newBlocks.length
      newBlocks.push({
        ...b,
        x: padding + Number(level) * gapX,
        y: padding + idx * gapY,
      })
    })
  })

  const newConnections = project.connections
    .map((conn) => ({
      ...conn,
      fromBlockId: newBlocks[idMap[conn.fromBlockId]]?.id ?? conn.fromBlockId,
      toBlockId: newBlocks[idMap[conn.toBlockId]]?.id ?? conn.toBlockId,
      waypoints: [],
    }))
    .filter((conn) => newBlocks[idMap[conn.fromBlockId]] && newBlocks[idMap[conn.toBlockId]])

  setBlocks(newBlocks)
  setConnections(newConnections)

  if (newBlocks.length > 0) {
    const minX = Math.min(...newBlocks.map((b) => b.x))
    const minY = Math.min(...newBlocks.map((b) => b.y))
    const maxX = Math.max(...newBlocks.map((b) => b.x + b.width))
    const maxY = Math.max(...newBlocks.map((b) => b.y + b.height))
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    setViewport({ x: -cx, y: -cy, scale: 1 })
  }
}

const padding = 80
const gapX = 260
const gapY = 110
