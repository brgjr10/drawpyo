export interface Point {
  x: number
  y: number
}

export interface Block {
  id: string
  title: string
  description: string
  image: string | null
  x: number
  y: number
  width: number
  height: number
  color: string
}

export interface Connection {
  id: string
  fromBlockId: string
  toBlockId: string
  fromPort: string
  toPort: string
  routing: 'squared' | 'curved' | 'user-guided'
  waypoints: Point[]
}

export interface Group {
  id: string
  title: string
  x: number
  y: number
  width: number
  height: number
  color: string
  blockIds: string[]
}

export interface Project {
  id: string
  name: string
  path: string
  blocks: Block[]
  connections: Connection[]
  groups: Group[]
  viewport: { x: number; y: number; scale: number }
  createdAt: string
  updatedAt: string
}

export type ThemeName = 'monochrome' | 'colorful' | 'dark' | 'bubble'

export interface Theme {
  name: ThemeName
  background: string
  canvas: string
  card: string
  cardBorder: string
  textPrimary: string
  textSecondary: string
  primary: string
  success: string
  warning: string
  danger: string
  fontFamily: string
}

export type RoutingMode = Connection['routing']
export type Tool = 'select' | 'pan' | 'connect' | 'group'
