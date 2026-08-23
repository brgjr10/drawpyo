import { useRef, useEffect, useState, useCallback } from 'react'
import { Stage, Layer, Rect, Text, Line, Group, Image as KonvaImage } from 'react-konva'
import Konva from 'konva'
import { useTheme } from './ThemeProvider'
import { useAppStore } from '../store'
import { Block, Point } from '../types'

export const Canvas = () => {
  const theme = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })

  const project = useAppStore((s) => s.project)
  const zoom = useAppStore((s) => s.zoom)
  const setZoom = useAppStore((s) => s.setZoom)
  const selectedBlockIds = useAppStore((s) => s.selectedBlockIds)
  const setSelectedBlockIds = useAppStore((s) => s.setSelectedBlockIds)
  const selectedConnectionId = useAppStore((s) => s.selectedConnectionId)
  const setSelectedConnectionId = useAppStore((s) => s.setSelectedConnectionId)
  const activeTool = useAppStore((s) => s.activeTool)
  const addBlock = useAppStore((s) => s.addBlock)
  const updateBlock = useAppStore((s) => s.updateBlock)
  const addConnection = useAppStore((s) => s.addConnection)

  const [isPanning, setIsPanning] = useState(false)
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 })

  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map())

  useEffect(() => {
    if (!project) return
    const toLoad = project.blocks.filter((b) => b.image && !imageCache.current.has(b.image))
    toLoad.forEach((b) => {
      if (!b.image) return
      const img = new window.Image()
      img.onload = () => {
        imageCache.current.set(b.image, img)
      }
      img.src = b.image
    })
  }, [project?.blocks.map((b) => b.image).join(',')])

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  useEffect(() => {
    if (!project) return
    useAppStore.setState({ zoom: project.viewport?.scale ?? 1 })
  }, [project])

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const delta = e.evt.deltaY > 0 ? -0.1 : 0.1
    setZoom(useAppStore.getState().zoom + delta)
  }

  const getRelativePointerPosition = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return { x: 0, y: 0 }
    const pos = stage.getPointerPosition()
    if (!pos) return { x: 0, y: 0 }
    const scale = stage.scaleX()
    return {
      x: (pos.x - stage.x()) / scale,
      y: (pos.y - stage.y()) / scale,
    }
  }, [])

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (activeTool === 'pan' || e.evt.button === 1) {
      setIsPanning(true)
      return
    }

    if (activeTool === 'select') {
      const clickedOnEmpty = e.target === e.target.getStage() || e.target.getParent()?.className === 'Stage'
      if (clickedOnEmpty) {
        setSelectedBlockIds([])
        setSelectedConnectionId(null)
        const pos = getRelativePointerPosition()
        setSelectionRect({ x: pos.x, y: pos.y, width: 0, height: 0 })
      }
    }
  }

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = getRelativePointerPosition()
    setMousePos(pos)

    if (isPanning) {
      const stage = stageRef.current
      if (!stage) return
      const dx = e.evt.movementX / stage.scaleX()
      const dy = e.evt.movementY / stage.scaleY()
      stage.x(stage.x() + dx)
      stage.y(stage.y() + dy)
      return
    }

    if (selectionRect) {
      setSelectionRect((prev) => {
        if (!prev) return null
        return {
          x: Math.min(prev.x, pos.x),
          y: Math.min(prev.y, pos.y),
          width: Math.abs(pos.x - prev.x),
          height: Math.abs(pos.y - prev.y),
        }
      })
    }
  }

  const handleStageMouseUp = () => {
    setIsPanning(false)

    if (selectionRect && project) {
      const { x, y, width, height } = selectionRect
      const selected = project.blocks.filter((b) => {
        return (
          b.x + b.width > x &&
          b.x < x + width &&
          b.y + b.height > y &&
          b.y < y + height
        )
      })
      setSelectedBlockIds(selected.map((b) => b.id))
      setSelectionRect(null)
    }
  }

  const handleBlockDragEnd = (block: Block, e: Konva.KonvaEventObject<DragEvent>) => {
    updateBlock(block.id, {
      x: e.target.x(),
      y: e.target.y(),
    })
  }

  const handleBlockClick = (blockId: string) => {
    if (activeTool === 'connect') {
      if (!connectingFrom) {
        setConnectingFrom(blockId)
      } else {
        if (connectingFrom !== blockId) {
          addConnection({
            id: crypto.randomUUID(),
            fromBlockId: connectingFrom,
            toBlockId: blockId,
            fromPort: 'right',
            toPort: 'left',
            routing: 'squared',
            waypoints: [],
          })
        }
        setConnectingFrom(null)
      }
      return
    }
    setSelectedBlockIds([blockId])
    setSelectedConnectionId(null)
  }

  const handleConnectionClick = (connectionId: string) => {
    setSelectedConnectionId(connectionId)
    setSelectedBlockIds([])
  }

  const handleCanvasDoubleClick = () => {
    if (activeTool === 'select' && project) {
      const pos = getRelativePointerPosition()
      const block: Block = {
        id: crypto.randomUUID(),
        title: 'New Block',
        description: '',
        image: null,
        x: pos.x - 60,
        y: pos.y - 30,
        width: 120,
        height: 60,
        color: theme.theme.primary,
      }
      addBlock(block)
      setSelectedBlockIds([block.id])
    }
  }

  const scale = zoom

  if (!project) return null

  return (
    <div className="canvas-area" ref={containerRef} style={{ background: theme.theme.canvas }}>
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        scaleX={scale}
        scaleY={scale}
        x={0}
        y={0}
        draggable={activeTool === 'pan'}
        ref={stageRef}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onDblClick={handleCanvasDoubleClick}
      >
        <Layer>
          {project.groups.map((group) => (
            <Rect
              key={group.id}
              x={group.x}
              y={group.y}
              width={group.width}
              height={group.height}
              fill={group.color}
              opacity={0.1}
              stroke={group.color}
              strokeWidth={2}
              listening={false}
            />
          ))}

          {project.connections.map((conn) => {
            const fromBlock = project.blocks.find((b) => b.id === conn.fromBlockId)
            const toBlock = project.blocks.find((b) => b.id === conn.toBlockId)
            if (!fromBlock || !toBlock) return null

            const fromX = fromBlock.x + fromBlock.width
            const fromY = fromBlock.y + fromBlock.height / 2
            const toX = toBlock.x
            const toY = toBlock.y + toBlock.height / 2

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
              points = [fromX, fromY, ...conn.waypoints.flatMap((wp) => [wp.x, wp.y]), toX, toY]
            } else {
              points = [fromX, fromY, toX, toY]
            }

            const isSelected = selectedConnectionId === conn.id

            return (
              <Line
                key={conn.id}
                points={points}
                stroke={isSelected ? theme.theme.primary : theme.theme.textSecondary}
                strokeWidth={isSelected ? 3 : 2}
                fill={theme.theme.background}
                lineCap="round"
                lineJoin="round"
                onClick={() => handleConnectionClick(conn.id)}
                onTap={() => handleConnectionClick(conn.id)}
              />
            )
          })}

          {connectingFrom && (() => {
            const fromBlock = project.blocks.find((b) => b.id === connectingFrom)
            if (!fromBlock) return null
            const fromX = fromBlock.x + fromBlock.width
            const fromY = fromBlock.y + fromBlock.height / 2
            return (
              <Line
                points={[fromX, fromY, mousePos.x, mousePos.y]}
                stroke={theme.theme.primary}
                strokeWidth={2}
                dash={[6, 4]}
                lineCap="round"
              />
            )
          })()}

          {project.blocks.map((block) => {
            const isSelected = selectedBlockIds.includes(block.id)
            return (
              <Group
                key={block.id}
                x={block.x}
                y={block.y}
                draggable={activeTool === 'select'}
                onClick={() => handleBlockClick(block.id)}
                onTap={() => handleBlockClick(block.id)}
                onDragEnd={(e) => handleBlockDragEnd(block, e)}
              >
                <Rect
                  width={block.width}
                  height={block.height}
                  fill={theme.theme.card}
                  stroke={isSelected ? theme.theme.primary : theme.theme.cardBorder}
                  strokeWidth={isSelected ? 3 : 1}
                  cornerRadius={8}
                  shadowColor="rgba(0,0,0,0.3)"
                  shadowBlur={8}
                  shadowOffset={{ x: 0, y: 2 }}
                />
                {block.image && imageCache.current.get(block.image) && (
                  <KonvaImage
                    x={8}
                    y={8}
                    width={block.width - 16}
                    height={80}
                    image={imageCache.current.get(block.image)!}
                    cornerRadius={4}
                  />
                )}
                <Text
                  x={12}
                  y={block.image ? 94 : 12}
                  width={block.width - 24}
                  height={block.image ? 24 : 24}
                  text={block.title}
                  fontFamily={theme.theme.fontFamily}
                  fontSize={13}
                  fontStyle="600"
                  fill={theme.theme.textPrimary}
                  wrap="none"
                  ellipsis
                />
                {block.description && (
                  <Text
                    x={12}
                    y={block.image ? 118 : 36}
                    width={block.width - 24}
                    height={block.height - (block.image ? 126 : 40)}
                    text={block.description}
                    fontFamily={theme.theme.fontFamily}
                    fontSize={11}
                    fill={theme.theme.textSecondary}
                    wrap="word"
                  />
                )}
              </Group>
            )
          })}

          {selectionRect && (
            <Rect
              x={selectionRect.x}
              y={selectionRect.y}
              width={selectionRect.width}
              height={selectionRect.height}
              fill={theme.theme.primary}
              opacity={0.1}
              stroke={theme.theme.primary}
              strokeWidth={1}
            />
          )}
        </Layer>
      </Stage>

      <div style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        display: 'flex',
        gap: 8,
        pointerEvents: 'none',
      }}>
        <button
          onClick={() => {
            const stage = stageRef.current
            if (!stage || !project) return
            const centerX = -stage.x() / zoom + stageSize.width / (2 * zoom)
            const centerY = -stage.y() / zoom + stageSize.height / (2 * zoom)
            const block: Block = {
              id: crypto.randomUUID(),
              title: 'New Block',
              description: '',
              image: null,
              x: centerX - 60,
              y: centerY - 30,
              width: 120,
              height: 60,
              color: theme.theme.primary,
            }
            addBlock(block)
            setSelectedBlockIds([block.id])
          }}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: `1px solid ${theme.theme.cardBorder}`,
            background: theme.theme.card,
            color: theme.theme.textPrimary,
            fontSize: 12,
            cursor: 'pointer',
            pointerEvents: 'auto',
            fontFamily: theme.theme.fontFamily,
            fontWeight: 600,
          }}
        >
          + Add Block
        </button>
        <ToolButton tool="select" activeTool={activeTool} setActiveTool={useAppStore.getState().setActiveTool} theme={theme.theme} label="Select" />
        <ToolButton tool="pan" activeTool={activeTool} setActiveTool={useAppStore.getState().setActiveTool} theme={theme.theme} label="Pan" />
        <ToolButton tool="connect" activeTool={activeTool} setActiveTool={useAppStore.getState().setActiveTool} theme={theme.theme} label="Connect" />
      </div>
    </div>
  )
}

const ToolButton = ({
  tool,
  activeTool,
  setActiveTool,
  theme,
  label,
}: {
  tool: string
  activeTool: string
  setActiveTool: (t: any) => void
  theme: ReturnType<typeof useTheme>['theme']
  label: string
}) => {
  const isActive = activeTool === tool
  return (
    <button
      onClick={() => setActiveTool(tool as any)}
      style={{
        padding: '6px 12px',
        borderRadius: 6,
        border: `1px solid ${isActive ? theme.primary : theme.cardBorder}`,
        background: isActive ? theme.primary : theme.card,
        color: isActive ? '#fff' : theme.textPrimary,
        fontSize: 12,
        cursor: 'pointer',
        pointerEvents: 'auto',
        fontFamily: theme.fontFamily,
      }}
    >
      {label}
    </button>
  )
}

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
