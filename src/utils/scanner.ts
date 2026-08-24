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

  const existingBlocks = useAppStore.getState().project?.blocks ?? []
  const existingKeys = new Set(existingBlocks.map((b) => b.title.trim().toLowerCase()))

  const padding = 80
  const blockW = 160
  const blockH = 64
  const gapX = 300
  const gapY = 140

  const uniqueComponents = new Map<string, ScanComponent>()
  result.components.forEach((c) => {
    const key = c.name.trim().toLowerCase()
    if (!uniqueComponents.has(key) && !existingKeys.has(key)) {
      uniqueComponents.set(key, c)
    }
  })

  const components = Array.from(uniqueComponents.values())
  if (!components.length) return

  const children: Record<string, ScanComponent[]> = {}
  const parentCount: Record<string, number> = {}

  for (const conn of result.connections) {
    const sourceComp = components.find((c) => c.id === conn.source)
    const targetComp = components.find((c) => c.id === conn.target)
    if (!sourceComp || !targetComp) continue
    children[sourceComp.name] = children[sourceComp.name] || []
    if (!children[sourceComp.name].find((c) => c.name === targetComp.name)) {
      children[sourceComp.name].push(targetComp)
    }
    parentCount[targetComp.name] = (parentCount[targetComp.name] || 0) + 1
  }

  const roots = components.filter((c) => !parentCount[c.name])
  const placed = new Set<string>()
  const idMap: Record<string, string> = {}
  const levelNodes: Record<number, ScanComponent[]> = {}

  const assignLevels = (item: ScanComponent, level: number) => {
    if (placed.has(item.name)) return
    placed.add(item.name)
    levelNodes[level] = levelNodes[level] || []
    levelNodes[level].push(item)
    const childs = children[item.name] || []
    childs.forEach((child) => assignLevels(child, level + 1))
  }

  roots.forEach((root) => assignLevels(root, 0))

  components.forEach((c) => {
    if (!placed.has(c.name)) {
      const level = Object.keys(levelNodes).length
      levelNodes[level] = levelNodes[level] || []
      levelNodes[level].push(c)
    }
  })

  const blocks: Block[] = []
  const connections: Connection[] = []

  Object.entries(levelNodes).forEach(([level, nodes]) => {
    const lvl = Number(level)
    const totalHeight = nodes.length * gapY
    const startY = padding
    nodes.forEach((node, idx) => {
      const techLabel = TECH_LABELS[node.technology] || node.technology
      const title = node.name.length > 24 ? node.name.slice(0, 22) + '...' : node.name
      const desc = [techLabel, node.file].filter(Boolean).join('\n')
      const id = crypto.randomUUID()
      idMap[node.name] = id
      const x = padding + lvl * gapX
      const y = startY + idx * gapY
      blocks.push({ id, title, description: desc, image: null, x, y, width: blockW, height: blockH, color: COLORS[node.type] || COLORS.module })
    })
  })

  for (const conn of result.connections) {
    const sourceComp = components.find((c) => c.id === conn.source)
    const targetComp = components.find((c) => c.id === conn.target)
    if (!sourceComp || !targetComp) continue
    const fromId = idMap[sourceComp.name]
    const toId = idMap[targetComp.name]
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
