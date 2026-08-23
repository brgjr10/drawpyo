# Drawpyo — Product Instructions

## Overview

Drawpyo is an Electron desktop application for visually planning and diagramming project ideas. The core metaphor is a freeform canvas of linked blocks, styled like a professional diagramming tool with configurable themes.

The name combines **"draw"** (a draw.io alternative) and **"py"** (Python scripting control), enabling both manual visual editing and AI/script-driven automation.

---

## Core Concept

Users create **environments** (projects) containing a canvas of draggable blocks connected by directional arrows. Each environment is saved locally and can be reopened after the app closes.

The app supports two interaction modes:
- **Visual** — manual drag-and-drop diagramming via the UI.
- **Programmatic** — Python scripts can create, modify, and control diagrams, enabling AI-assisted workflow automation.

---

## UI / UX Requirements

### Theme System
- Multiple built-in themes: monochrome, colorful, dark, bubble, and others.
- Theme selection should affect the entire UI surface (canvas, sidebar, header).
- All themes must maintain readability and visual hierarchy.

### Typography
- Clean, slightly bold, slightly rounded font family.
- Predominantly straight letterforms — avoid overly decorative type.
- Consistent sizing across header, sidebar, and canvas labels.

### Header
- Contains primary app controls (new project, open, save, export, theme selector, zoom controls).
- Always visible and persistent.

### Sidebar (Editor Panel)
- Context-aware input panel for the currently selected object(s).
- Allows editing of block title, description, image, and connection properties.
- Collapsible to maximize canvas space.

### Homepage
- Landing screen shown when no project is open.
- Actions:
  - **Create Project** — prompts user for save location, then creates a project subfolder.
  - **Open Project** — opens a file picker to select an existing project folder.
  - **Recent Projects** — list of recently opened projects with thumbnails or names.
  - **View All Projects** — button at the end of the recent list to browse all saved projects.

---

## Canvas Features

### Blocks (Nodes)
- Rounded rectangles containing:
  - Title (required)
  - Description (optional)
  - Image (optional)
- Freely draggable anywhere on the canvas.
- Selectable individually or in bulk.

### Bulk Selection
- Click and drag on the background to draw a selection rectangle.
- Any block intersecting the rectangle becomes highlighted/selected.
- Supports shift-click for additive selection.

### Grouping
- Users can group multiple blocks into a visually distinct section.
- Groups are user-defined areas with their own boundary styling.
- Groups should not restrict movement of contained blocks.

### Connections (Arrows)
- Blocks connect via directional arrows.
- Three routing modes:
  1. **Squared** — orthogonal right-angle paths.
  2. **Curved** — smooth bezier curves.
  3. **User-Guided** — user clicks and drags the arrow path to define custom waypoints.
- Arrowheads indicate direction.

### Export
- Export entire scene as an image.
- Two capture modes:
  - **Normal** — includes background/theme.
  - **Transparent** — exports with no background (PNG with alpha).

---

## Python Scripting / AI Control

- The app exposes a Python API (local server, stdio, or embedded interpreter) allowing external scripts and AI agents to:
  - Create and configure projects.
  - Add, update, and delete blocks and connections.
  - Modify themes and canvas settings.
  - Trigger exports programmatically.
- Scripting should be able to replicate any action available through the UI.
- Consider a simple REST or WebSocket interface on a local port, or a `drawpyo` Python package that communicates with the running Electron app.

---

## Data / Storage

### Project Structure
- Each project is a folder chosen by the user at creation time (not locked to the app directory).
- The app creates a dedicated subfolder inside the chosen directory for its save files.
- Supports opening any previously created project folder.

### Persistence
- All environments persist locally between sessions.
- Autosave or explicit save mechanism to prevent data loss.
- Recent projects list should be stored locally (e.g., in app config or a metadata file).

---

## Technical Notes

- Built with Electron.
- Canvas rendering should prioritize performance with many objects.
- Arrow routing logic must support real-time updates during drag operations.
- Export rendering must match on-screen appearance as closely as possible.
- Python integration layer should be sandboxed and not block the main UI thread.
