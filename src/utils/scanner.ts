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
  const gapX = 220
  const gapY = 90

  const typeOrder = ['api', 'database', 'queue', 'cloud', 'service', 'module']
  const grouped: Record<string, ScanComponent[]> = {}
  for (const c of result.components) {
    grouped[c.type] = grouped[c.type] || []
    grouped[c.type].push(c)
  }

  const blocks: Block[] = []
  const connections: Connection[] = []
  const idMap: Record<string, string> = {}

  let col = 0
  let row = 0

  for (const type of typeOrder) {
    const items = grouped[type] || []
    if (!items.length) continue

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const id = crypto.randomUUID()
      idMap[item.id] = id

      const techLabel = TECH_LABELS[item.technology] || item.technology
      const title = item.name.length > 24 ? item.name.slice(0, 22) + '...' : item.name
      const desc = [techLabel, item.file].filter(Boolean).join('\n')

      blocks.push({
        id,
        title,
        description: desc,
        image: null,
        x: padding + col * gapX,
        y: padding + row * gapY,
        width: blockW,
        height: blockH,
        color: COLORS[item.type] || COLORS.module,
      })

      row++
      if (row >= 6) {
        row = 0
        col++
      }
    }
  }

  for (const conn of result.connections) {
    const fromId = idMap[conn.source]
    const toId = idMap[conn.target]
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
    const minX = Math.min(...blocks.map(b => b.x))
    const minY = Math.min(...blocks.map(b => b.y))
    const maxX = Math.max(...blocks.map(b => b.x + b.width))
    const maxY = Math.max(...blocks.map(b => b.y + b.height))
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    useAppStore.getState().setViewport({ x: -cx, y: -cy, scale: 1 })
  }
}
