# Drawpyo

<img width="1365" height="768" alt="image" src="https://github.com/user-attachments/assets/d3d772a0-01f9-4074-8d54-fc2afae1023d" />

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

### Auto-Scan Architecture
- **Python scanner** analyzes project directories and auto-populates the canvas with real components
- Detects APIs, databases, queues, cloud services, Docker containers, and external dependencies
- Traces **actual usage** — imports, HTML references, connection strings, Docker Compose wiring
- Works with any codebase: Python, JavaScript/TypeScript, Go, Java, Rust, Ruby, PHP, C#, C/C++, Swift
- Connections are evidence-based with confidence scores, not guessed

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
- **Python** — project scanner and automation client

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

## Auto-Scan

When a project is open, click **Auto-Scan** in the header to analyze the project directory and populate the canvas with detected components and their real connections.

The scanner (`python/drawpyo/scanner.py`) classifies files by role (source, config, build, test, data, docs), extracts components, and traces relationships from:
- Import/require/include statements
- HTML `<script>` and `<link>` references
- Connection strings (`postgresql://`, `redis://`, `mongodb://`, etc.)
- Docker Compose images, ports, and build contexts
- External URLs in source code
- Environment variable usage

Results are rendered as color-coded blocks connected by evidence-based edges.

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
| POST     | `/projects/:id/scan`              | Scan project and auto-populate  |

## License

MIT
