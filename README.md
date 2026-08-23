# Drawpyo

Visual project planning and diagramming tool built with Electron, React, and Konva.

Drawpyo is a desktop application for creating linked block diagrams — a freeform canvas of draggable nodes connected by directional arrows. It supports visual editing, theme customization, canvas export, and programmatic control via a local REST API for Python/AI automation.

## Features

### Canvas
- **Draggable blocks** with title, description, and optional images
- **Connections** with three routing modes: squared (orthogonal), curved (bezier), and user-guided (custom waypoints)
- **Bulk selection** via drag rectangle and shift-click
- **Grouping** for visually distinct sections
- **Export** as PNG with normal or transparent background

### UI
- **Theme system**: monochrome, colorful, dark, bubble, and more
- **Persistent header** with project, theme, and zoom controls
- **Collapsible sidebar** for context-aware editing
- **Homepage** with recent projects and file browser

### Python / AI Control
- Local HTTP server (port 9749) exposes a REST API for programmatic diagram manipulation
- Create, update, delete blocks and connections remotely
- Trigger exports and modify themes programmatically

## Tech Stack

- **Electron** — desktop shell
- **React + TypeScript** — UI framework
- **Konva** — canvas rendering
- **Zustand** — state management
- **Vite** — build tool
- **Electron Builder** — packaging

## Development

```bash
npm install

# Renderer dev server + Electron
npm run electron:dev

# Build for production
npm run build

# Lint
npm run lint

# Typecheck
npm run typecheck
```

## API

When the app is running, the local API server is available at `http://localhost:9749`.

| Method   | Endpoint                          | Description                     |
| -------- | --------------------------------- | ------------------------------- |
| GET      | `/projects`                       | List current project            |
| GET      | `/projects/:id`                   | Get project by ID               |
| POST     | `/projects`                       | Set current project             |
| POST     | `/projects/:id/blocks`            | Create a block                  |
| PUT      | `/projects/:id/blocks/:blockId`   | Update a block                  |
| DELETE   | `/projects/:id/blocks/:blockId`   | Delete a block                  |
| POST     | `/projects/:id/connections`       | Create a connection             |
| DELETE   | `/projects/:id/connections/:connectionId` | Delete a connection     |

## License

MIT
