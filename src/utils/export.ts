import Konva from 'konva'
import { useAppStore } from '../store'

export const exportCanvas = async (transparent = false): Promise<Blob | null> => {
  const { project } = useAppStore.getState()
  if (!project) return null

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
      fill: '#0d1117',
    })
    layer.add(bg)
  }

  project.blocks.forEach((block) => {
    const rect = new Konva.Rect({
      x: block.x + 960,
      y: block.y + 540,
      width: block.width,
      height: block.height,
      fill: '#161b22',
      stroke: '#30363d',
      strokeWidth: 1,
      cornerRadius: 8,
    })
    layer.add(rect)

    const text = new Konva.Text({
      x: block.x + 972,
      y: block.y + 552,
      text: block.title,
      fontSize: 13,
      fontStyle: '600',
      fill: '#c9d1d9',
      width: block.width - 24,
    })
    layer.add(text)
  })

  project.connections.forEach((conn) => {
    const fromBlock = project.blocks.find((b) => b.id === conn.fromBlockId)
    const toBlock = project.blocks.find((b) => b.id === conn.toBlockId)
    if (!fromBlock || !toBlock) return

    const fromX = fromBlock.x + fromBlock.width + 960
    const fromY = fromBlock.y + fromBlock.height / 2 + 540
    const toX = toBlock.x + 960
    const toY = toBlock.y + toBlock.height / 2 + 540

    const line = new Konva.Line({
      points: [fromX, fromY, toX, toY],
      stroke: '#8b949e',
      strokeWidth: 2,
      lineCap: 'round',
    })
    layer.add(line)
  })

  layer.draw()
  stage.draw()

  const dataUrl = stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' })
  const res = await fetch(dataUrl)
  return res.blob()
}
