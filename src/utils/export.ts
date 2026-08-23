import Konva from 'konva'
import { useAppStore } from '../store'
import { Theme, Point } from '../types'

function getBezierPoints(
  x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, segments: number
): number[] {
  const points: number[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const t2 = t * t
    const t3 = t2 * t
    const mt = 1 - t
    const mt2 = mt * mt
    const mt3 = mt2 * mt
    const x = mt3 * x0 + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t3 * x3
    const y = mt3 * y0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3 * y3
    points.push(x, y)
  }
  return points
}

export const exportCanvas = async (transparent = false): Promise<Blob | null> => {
  const { project } = useAppStore.getState()
  if (!project) return null

  const theme = useAppStore.getState().theme as Theme
  const stage = new Konva.Stage({
    width: 1920,
    height: 1080,
  })

  const layer = new Konva.Layer()
  stage.add(layer)

  if (!transparent) {
    const bg = new Konva.Rect({
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      fill: theme.canvas,
    })
    layer.add(bg)
  }

  const ox = 960
  const oy = 540

  project.blocks.forEach((block) => {
    const rect = new Konva.Rect({
      x: block.x + ox,
      y: block.y + oy,
      width: block.width,
      height: block.height,
      fill: theme.card,
      stroke: theme.cardBorder,
      strokeWidth: 1,
      cornerRadius: 8,
      shadowColor: 'rgba(0,0,0,0.3)',
      shadowBlur: 8,
      shadowOffset: { x: 0, y: 2 },
    })
    layer.add(rect)

    if (block.image) {
      const img = new window.Image()
      img.src = block.image
      if (img.complete) {
        const konvaImage = new Konva.Image({
          x: block.x + ox + 8,
          y: block.y + oy + 8,
          width: block.width - 16,
          height: 80,
          image: img,
          cornerRadius: 4,
        })
        layer.add(konvaImage)
      }
    }

    const titleY = block.image ? block.y + oy + 94 : block.y + oy + 12
    const title = new Konva.Text({
      x: block.x + ox + 12,
      y: titleY,
      text: block.title,
      fontSize: 13,
      fontStyle: '600',
      fill: theme.textPrimary,
      width: block.width - 24,
      wrap: 'none',
      ellipsis: true,
    })
    layer.add(title)

    if (block.description) {
      const descY = block.image ? block.y + oy + 118 : block.y + oy + 36
      const desc = new Konva.Text({
        x: block.x + ox + 12,
        y: descY,
        text: block.description,
        fontSize: 11,
        fill: theme.textSecondary,
        width: block.width - 24,
        wrap: 'word',
      })
      layer.add(desc)
    }
  })

  project.connections.forEach((conn) => {
    const fromBlock = project.blocks.find((b) => b.id === conn.fromBlockId)
    const toBlock = project.blocks.find((b) => b.id === conn.toBlockId)
    if (!fromBlock || !toBlock) return

    const fromX = fromBlock.x + fromBlock.width + ox
    const fromY = fromBlock.y + fromBlock.height / 2 + oy
    const toX = toBlock.x + ox
    const toY = toBlock.y + toBlock.height / 2 + oy

    let points: number[] = []
    if (conn.routing === 'squared') {
      const midX = (fromX + toX) / 2
      points = [fromX, fromY, midX, fromY, midX, toY, toX, toY]
    } else if (conn.routing === 'curved') {
      const cp1x = fromX + (toX - fromX) * 0.4
      const cp1y = fromY
      const cp2x = fromX + (toX - fromX) * 0.6
      const cp2y = toY
      points = getBezierPoints(fromX, fromY, cp1x, cp1y, cp2x, cp2y, toX, toY, 40)
    } else if (conn.routing === 'user-guided' && conn.waypoints.length > 0) {
      points = [fromX, fromY, ...conn.waypoints.flatMap((wp) => [wp.x + ox, wp.y + oy]), toX, toY]
    } else {
      points = [fromX, fromY, toX, toY]
    }

    const line = new Konva.Line({
      points,
      stroke: theme.textSecondary,
      strokeWidth: 2,
      lineCap: 'round',
      lineJoin: 'round',
    })
    layer.add(line)

    const lastIdx = points.length - 2
    const arrowAngle = Math.atan2(points[lastIdx + 1] - points[lastIdx - 1], points[lastIdx] - points[lastIdx - 2])
    const arrowSize = 10
    const ax1 = points[lastIdx] - arrowSize * Math.cos(arrowAngle - Math.PI / 6)
    const ay1 = points[lastIdx + 1] - arrowSize * Math.sin(arrowAngle - Math.PI / 6)
    const ax2 = points[lastIdx] - arrowSize * Math.cos(arrowAngle + Math.PI / 6)
    const ay2 = points[lastIdx + 1] - arrowSize * Math.sin(arrowAngle + Math.PI / 6)

    const arrow = new Konva.Line({
      points: [points[lastIdx], points[lastIdx + 1], ax1, ay1, ax2, ay2],
      closed: true,
      fill: theme.textSecondary,
      stroke: theme.textSecondary,
      strokeWidth: 1,
    })
    layer.add(arrow)
  })

  layer.draw()
  stage.draw()

  const dataUrl = stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' })
  const res = await fetch(dataUrl)
  return res.blob()
}
