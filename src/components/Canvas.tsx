import { useRef, useEffect, useState, useCallback } from 'react'
import { Stage, Layer, Rect, Text, Line, Group, Image as KonvaImage } from 'react-konva'
import Konva from 'konva'
import { useTheme } from './ThemeProvider'
import { useAppStore } from '../store'
import { Block, Point } from '../types'

interface ImageDim {
  img: HTMLImageElement
  width: number
  height: number
  resized: boolean
}

export const Canvas = () => {
  const theme = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })

  const project = useAppStore((s) => s.project)
  const zoom = useAppStore((s) => s.zoom)
  const setZoom = useAppStore((s) => s.setZoom)
  const selectedBlockIds = useAppStore((s) => s.selectedBlockIds)
  const setSelectedBlockIds = useAppStore((s) => s.setSelectedBlockIds)
  const selectedConnectionId = useAppStore((s) => s.selectedConnectionId)
  const setSelectedConnectionId = useAppStore((s) => s.setSelectedConnectionId)
  const activeTool = useAppStore((s) => s.activeTool)
  const setViewport = useAppStore((s) => s.setViewport)
  const addBlock = useAppStore((s) => s.addBlock)
  const updateBlock = useAppStore((s) => s.updateBlock)
  const addConnection = useAppStore((s) => s.addConnection)

  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState<Point & { shiftKey?: boolean }>({ x: 0, y: 0 })
  const [dragStartPositions, setDragStartPositions] = useState<{ id: string; x: number; y: number }[]>([])
  const [dragOrigin, setDragOrigin] = useState<{ x: number; y: number } | null>(null)
  const [imageTick, setImageTick] = useState(0)

  const isPanningRef = useRef(false)
  const panStartRef = useRef<{ x: number; y: number } | null>(null)

  const imageCache = useRef<Map<string, ImageDim>>(new Map())

  useEffect(() => {
    if (!project) return
    const toLoad = project.blocks.filter((b) => b.image && !imageCache.current.has(b.image))
    toLoad.forEach((b) => {
      if (!b.image) return
      const img = new window.Image()
      img.onload = () => {
        const width = img.naturalWidth
        const height = img.naturalHeight
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return
        const dim: ImageDim = { img, width, height, resized: false }
        imageCache.current.set(b.image, dim)
        const current = useAppStore.getState().project?.blocks.find((blk) => blk.id === b.id)
        const curW = current?.width ?? b.width
        const curH = current?.height ?? b.height
        const isDefaultSize = curW === 120 && curH === 60
        if (isDefaultSize) {
          updateBlock(b.id, { width: Math.max(curW, dim.width + 16), height: Math.max(curH, dim.height + 100) })
        }
        dim.resized = true
        setImageTick((t) => t + 1)
      }
      img.onerror = () => console.error('Failed to load image:', b.image?.slice(0, 50))
      img.src = b.image
      if (img.complete && img.naturalWidth > 0) {
        img.onload(new Event('load') as any)
      }
    })
  }, [project?.blocks.map((b) => b.image).join(',')])

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    const observer = new ResizeObserver(updateSize)
    if (containerRef.current) observer.observe(containerRef.current)
    return () => {
      window.removeEventListener('resize', updateSize)
      observer.disconnect()
    }
  }, [])

  const hasCenteredRef = useRef(false)
  useEffect(() => {
    if (!project || hasCenteredRef.current) return
    hasCenteredRef.current = true
    const vp = project.viewport
    if (vp && (vp.x !== 0 || vp.y !== 0 || vp.scale !== 1)) {
      setStagePos({ x: vp.x, y: vp.y })
      setZoom(vp.scale)
    } else if (project.blocks.length > 0) {
      centerView()
    }
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
    return { x: (pos.x - stage.x()) / scale, y: (pos.y - stage.y()) / scale }
  }, [])

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 2) {
      e.evt.preventDefault()
      const pos = getRelativePointerPosition()
      setSelectionRect({ x: pos.x, y: pos.y, width: 0, height: 0 })
      return
    }
    if (e.target === e.target.getStage()) {
      setSelectedBlockIds([])
      setSelectedConnectionId(null)
      isPanningRef.current = true
      panStartRef.current = { x: e.evt.clientX, y: e.evt.clientY, stageX: stagePos.x, stageY: stagePos.y }
    }
  }

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanningRef.current && panStartRef.current) {
      const dx = e.evt.clientX - panStartRef.current.x
      const dy = e.evt.clientY - panStartRef.current.y
      const stage = stageRef.current
      if (stage) {
        stage.x(panStartRef.current.stageX + dx)
        stage.y(panStartRef.current.stageY + dy)
      }
      return
    }

    const pos = getRelativePointerPosition()
    setMousePos({ x: pos.x, y: pos.y, shiftKey: e.evt.shiftKey })

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

  const handleStageMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanningRef.current) {
      isPanningRef.current = false
      const stage = stageRef.current
      if (stage) {
        setStagePos({ x: stage.x(), y: stage.y() })
      }
      panStartRef.current = null
    }

    if (selectionRect && project) {
      const { x, y, width, height } = selectionRect
      const newSelected = project.blocks.filter((b) => b.x + b.width > x && b.x < x + width && b.y + b.height > y && b.y < y + height)
      setSelectedBlockIds((prev) => {
        const combined = new Set(prev)
        newSelected.forEach((b) => combined.add(b.id))
        return Array.from(combined)
      })
      setSelectionRect(null)
    }
    setDragStartPositions([])
    setDragOrigin(null)
  }

  const handleContextMenu = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault()
  }

  const handleBlockDragStart = (block: Block, e: Konva.KonvaEventObject<DragEvent>) => {
    if (selectedBlockIds.length > 1 && selectedBlockIds.includes(block.id)) {
      const positions = selectedBlockIds.map((id) => {
        const b = project?.blocks.find((blk) => blk.id === id)
        return { id, x: b?.x ?? 0, y: b?.y ?? 0 }
      })
      setDragStartPositions(positions)
      setDragOrigin({ x: e.target.x(), y: e.target.y() })
    }
  }

  const handleBlockDragMove = (block: Block, e: Konva.KonvaEventObject<DragEvent>) => {
    if (selectedBlockIds.length > 1 && selectedBlockIds.includes(block.id) && dragOrigin) {
      const dx = e.target.x() - dragOrigin.x
      const dy = e.target.y() - dragOrigin.y
      dragStartPositions.forEach((pos) => {
        updateBlock(pos.id, { x: pos.x + dx, y: pos.y + dy })
      })
    } else {
      updateBlock(block.id, { x: e.target.x(), y: e.target.y() })
    }
  }

  const handleBlockDragEnd = (block: Block, e: Konva.KonvaEventObject<DragEvent>) => {
    setDragStartPositions([])
    setDragOrigin(null)
    updateBlock(block.id, { x: e.target.x(), y: e.target.y() })
  }

  const handleResize = (block: Block, e: Konva.KonvaEventObject<DragEvent>) => {
    const rawW = e.target.x() + 8
    const rawH = e.target.y() + 8
    if (!Number.isFinite(rawW) || !Number.isFinite(rawH)) return
    updateBlock(block.id, { width: Math.max(80, rawW), height: Math.max(40, rawH) })
  }

  const centerView = useCallback(() => {
    if (!project || project.blocks.length === 0) return
    const padding = 60
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    project.blocks.forEach((block) => {
      minX = Math.min(minX, block.x)
      minY = Math.min(minY, block.y)
      maxX = Math.max(maxX, block.x + block.width)
      maxY = Math.max(maxY, block.y + block.height)
    })
    if (!isFinite(minX) || !isFinite(minY)) return
    const contentW = maxX - minX
    const contentH = maxY - minY
    const scaleX = (stageSize.width - padding * 2) / Math.max(contentW, 1)
    const scaleY = (stageSize.height - padding * 2) / Math.max(contentH, 1)
    const newScale = Math.max(Math.min(scaleX, scaleY, 1), 0.1)
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const newX = stageSize.width / 2 - centerX * newScale
    const newY = stageSize.height / 2 - centerY * newScale
    setStagePos({ x: newX, y: newY })
    setZoom(newScale)
    setViewport({ x: newX, y: newY, scale: newScale })
  }, [project, stageSize, setZoom])

  const handleCanvasDoubleClick = () => {
    if (project) {
      const pos = getRelativePointerPosition()
      addBlock({
        id: crypto.randomUUID(),
        title: 'New Block',
        description: '',
        image: null,
        x: pos.x - 60,
        y: pos.y - 30,
        width: 120,
        height: 60,
        color: theme.theme.primary,
      })
    }
  }

  const handleBlockClick = (blockId: string, e: Konva.KonvaEventObject<MouseEvent>) => {
    if (activeTool === 'connect') {
      if (!connectingFrom) {
        setConnectingFrom(blockId)
      } else if (connectingFrom !== blockId) {
        addConnection({ id: crypto.randomUUID(), fromBlockId: connectingFrom, toBlockId: blockId, fromPort: 'right', toPort: 'left', routing: 'squared', waypoints: [] })
        setConnectingFrom(null)
      }
      return
    }
    if (e.evt.shiftKey) {
      setSelectedBlockIds((prev) => prev.includes(blockId) ? prev.filter((id) => id !== blockId) : [...prev, blockId])
    } else {
      setSelectedBlockIds([blockId])
    }
    setSelectedConnectionId(null)
  }

  const handleConnectionClick = (connectionId: string, e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.shiftKey) {
      setSelectedConnectionId((prev) => prev === connectionId ? null : connectionId)
    } else {
      setSelectedConnectionId(connectionId)
      setSelectedBlockIds([])
    }
  }

  const handleWaypointDragMove = (connectionId: string, index: number, e: Konva.KonvaEventObject<DragEvent>) => {
    const conn = project?.connections.find((c) => c.id === connectionId)
    if (!conn || conn.routing !== 'user-guided') return
    const newWaypoints = [...conn.waypoints]
    newWaypoints[index] = { x: e.target.x(), y: e.target.y() }
    updateConnection(connectionId, { waypoints: newWaypoints })
  }

  const handleWaypointDragEnd = (connectionId: string, index: number, e: Konva.KonvaEventObject<DragEvent>) => {
    handleWaypointDragMove(connectionId, index, e)
  }

  if (!project) return null

  return (
    <div className="canvas-area" ref={containerRef} style={{ background: theme.theme.canvas }}>
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={stagePos.x}
        y={stagePos.y}
        draggable={false}
        ref={stageRef}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onDblClick={handleCanvasDoubleClick}
        onContextMenu={handleContextMenu}
      >
        <Layer>
          {project.groups.map((group) => (
            <Rect key={group.id} x={group.x} y={group.y} width={group.width} height={group.height} fill={group.color} opacity={0.1} stroke={group.color} strokeWidth={2} listening={false} />
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
              points = getBezierPoints(fromX, fromY, fromX + (toX - fromX) * 0.4, fromY, fromX + (toX - fromX) * 0.6, toY, toX, toY, 40)
            } else if (conn.routing === 'user-guided' && conn.waypoints.length > 0) {
              points = [fromX, fromY, ...conn.waypoints.flatMap((wp) => [wp.x, wp.y]), toX, toY]
            } else {
              points = [fromX, fromY, toX, toY]
            }
            const isSelected = selectedConnectionId === conn.id
            const lastIdx = points.length - 2
            const arrowAngle = Math.atan2(points[lastIdx + 1] - points[lastIdx - 1], points[lastIdx] - points[lastIdx - 2])
            const arrowSize = 10
            const ax1 = points[lastIdx] - arrowSize * Math.cos(arrowAngle + Math.PI / 6)
            const ay1 = points[lastIdx + 1] - arrowSize * Math.sin(arrowAngle + Math.PI / 6)
            const ax2 = points[lastIdx] - arrowSize * Math.cos(arrowAngle - Math.PI / 6)
            const ay2 = points[lastIdx + 1] - arrowSize * Math.sin(arrowAngle - Math.PI / 6)
            return (
              <Group key={conn.id}>
                <Line points={points} stroke={isSelected ? theme.theme.primary : theme.theme.textSecondary} strokeWidth={isSelected ? 3 : 2} hitStrokeWidth={12} onClick={(e) => handleConnectionClick(conn.id, e)} onTap={(e) => handleConnectionClick(conn.id, e)} />
                <Line points={[points[lastIdx], points[lastIdx + 1], ax1, ay1, ax2, ay2]} closed fill={isSelected ? theme.theme.primary : theme.theme.textSecondary} stroke={isSelected ? theme.theme.primary : theme.theme.textSecondary} strokeWidth={1} listening={false} />
                {isSelected && conn.routing === 'user-guided' && conn.waypoints.map((wp, idx) => (
                  <Rect key={idx} x={wp.x - 5} y={wp.y - 5} width={10} height={10} fill={theme.theme.card} stroke={theme.theme.primary} strokeWidth={2} draggable onDragMove={(e) => handleWaypointDragMove(conn.id, idx, e)} onDragEnd={(e) => handleWaypointDragEnd(conn.id, idx, e)} />
                ))}
              </Group>
            )
          })}

          {connectingFrom && (() => {
            const fromBlock = project.blocks.find((b) => b.id === connectingFrom)
            if (!fromBlock) return null
            return <Line points={[fromBlock.x + fromBlock.width, fromBlock.y + fromBlock.height / 2, mousePos.x, mousePos.y]} stroke={theme.theme.primary} strokeWidth={2} dash={[6, 4]} lineCap="round" />
          })()}

          {project.blocks.map((block) => {
            const isSelected = selectedBlockIds.includes(block.id)
            const imageDim = block.image ? imageCache.current.get(block.image) : null
            const hasImage = block.image && imageDim
            const imgWidth = Math.max(block.width - 16, 1)
            const imgHeight = hasImage && Number.isFinite(imageDim!.width) && Number.isFinite(imageDim!.height) && imageDim!.width > 0 && imageDim!.height > 0
              ? Math.max(Math.min(imgWidth * (imageDim!.height / imageDim!.width), block.height - 80), 1) : 0
            const imgOffsetY = hasImage ? imgHeight + 16 : 0
            return (
              <Group key={block.id} x={block.x} y={block.y} draggable
                onClick={(e) => handleBlockClick(block.id, e)} onTap={(e) => handleBlockClick(block.id, e)}
                onDragStart={(e) => handleBlockDragStart(block, e)} onDragMove={(e) => handleBlockDragMove(block, e)} onDragEnd={(e) => handleBlockDragEnd(block, e)}
              >
                <Rect width={block.width} height={block.height} fill={block.color || theme.theme.card} stroke={isSelected ? theme.theme.primary : (block.color ? `${block.color}40` : theme.theme.cardBorder)} strokeWidth={isSelected ? 3 : 1} cornerRadius={8} shadowColor="rgba(0,0,0,0.3)" shadowBlur={8} shadowOffset={{ x: 0, y: 2 }} />
                {hasImage && <KonvaImage x={8} y={8} width={imgWidth} height={imgHeight} image={imageDim!.img} cornerRadius={Math.min(4, imgWidth / 2, imgHeight / 2)} />}
                <Text x={12} y={hasImage ? imgOffsetY + 6 : 12} width={block.width - 24} height={24} text={block.title} fontFamily={theme.theme.fontFamily} fontSize={13} fontStyle="600" fill={theme.theme.textPrimary} wrap="none" ellipsis />
                {block.description && <Text x={12} y={hasImage ? imgOffsetY + 30 : 36} width={block.width - 24} height={Math.max(block.height - (hasImage ? imgOffsetY + 38 : 40), 0)} text={block.description} fontFamily={theme.theme.fontFamily} fontSize={11} fill={theme.theme.textPrimary} fillOpacity={0.7} wrap="word" />}
                {isSelected && (
                  <Rect x={block.width - 8} y={block.height - 8} width={16} height={16} fill={theme.theme.primary} stroke={theme.theme.card} strokeWidth={2} cornerRadius={4} draggable
                    onDragStart={(e) => { e.cancelBubble = true }} onDragMove={(e) => { e.cancelBubble = true; handleResize(block, e) }} onDragEnd={(e) => { e.cancelBubble = true }}
                  />
                )}
              </Group>
            )
          })}

          {selectionRect && (
            <Rect x={selectionRect.x} y={selectionRect.y} width={selectionRect.width} height={selectionRect.height} fill={theme.theme.primary} opacity={0.1} stroke={theme.theme.primary} strokeWidth={1} />
          )}
        </Layer>
      </Stage>

      <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', gap: 8, pointerEvents: 'none' }}>
        <button onClick={() => {
          const stage = stageRef.current
          if (!stage || !project) return
          const centerX = -stage.x() / zoom + stageSize.width / (2 * zoom)
          const centerY = -stage.y() / zoom + stageSize.height / (2 * zoom)
          addBlock({ id: crypto.randomUUID(), title: 'New Block', description: '', image: null, x: centerX - 60, y: centerY - 30, width: 120, height: 60, color: theme.theme.primary })
        }} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${theme.theme.cardBorder}`, background: theme.theme.card, color: theme.theme.textPrimary, fontSize: 12, cursor: 'pointer', pointerEvents: 'auto', fontFamily: theme.theme.fontFamily, fontWeight: 600 }}>+ Add Block</button>
        <button onClick={() => useAppStore.getState().setActiveTool('connect')} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${activeTool === 'connect' ? theme.theme.primary : theme.theme.cardBorder}`, background: activeTool === 'connect' ? theme.theme.primary : theme.theme.card, color: activeTool === 'connect' ? '#fff' : theme.theme.textPrimary, fontSize: 12, cursor: 'pointer', pointerEvents: 'auto', fontFamily: theme.theme.fontFamily, fontWeight: 600 }}>Connect</button>
        <button onClick={centerView} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${theme.theme.cardBorder}`, background: theme.theme.card, color: theme.theme.textPrimary, fontSize: 12, cursor: 'pointer', pointerEvents: 'auto', fontFamily: theme.theme.fontFamily, fontWeight: 600 }}>Center View</button>
      </div>
    </div>
  )
}

function getBezierPoints(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, segments: number): number[] {
  const points: number[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const mt = 1 - t
    points.push(
      mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3,
      mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3
    )
  }
  return points
}
