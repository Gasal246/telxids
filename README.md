# TelX Model Numbers

**Current Version:** Alpha `1.2.26`  
**Production:** `https://telxids.searchngo.app`  
**More from the developer:** `https://muhammedgasal.com`

TelX Model Numbers is a lightweight web app for managing TelX device model metadata and generating **serial numbers + MAC IDs** in tracked batches, backed by MongoDB.

## Features

- **Categories & chipsets**
  - Manage product categories and allowed types
  - Manage chipset reference data used by models
- **Models**
  - Create/update/delete models (category, type, chipset, model number, prefix, TelX model number, description, MACs-per-serial)
  - Per-model dashboard with generated + allocated counts
- **Identifier generation**
  - Generate batches (“groups”) of serial numbers and MAC IDs per model
  - Global MAC counter + per-model serial continuity
  - Region-aware serial prefixing
- **Allocation workflow**
  - Select unallocated groups and mark them allocated in bulk
  - Allocation status badges and counts
- **Search**
  - Search across model number, TelX model number, serial number, and MAC ID
  - Result grouping for model matches and serial/MAC matches
- **Export to Excel**
  - Export a single group (“modal export”)
  - Export the full model history (all groups combined)
  - Export cart: collect multiple groups and export as a multi-sheet workbook
- **Quality-of-life UI**
  - Copy serial number / MAC ID to clipboard
  - “View all serials” modal for large groups

## Tech stack

- Frontend: Vite + React + TypeScript + Tailwind (shadcn/ui)
- Backend: Node.js + Express + MongoDB

## Install / Run locally

### Prerequisites

- Node.js `>= 18`
- A MongoDB instance (local or hosted)

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create a `.env` in the project root (or set these in your shell):

```bash
# Backend (Express + MongoDB)
MONGODB_URI="mongodb://127.0.0.1:27017"
# Optional (defaults to "texlids" if unset)
MONGODB_DB="texlids"

# Frontend (optional)
# If unset, the frontend uses relative /api requests (works with the dev proxy).
VITE_API_BASE_URL=""
```

Notes:
- The Vite dev server proxies `/api` to `http://127.0.0.1:3001` (see `vite.config.ts`).
- In production with a separate API host, set `VITE_API_BASE_URL` to that API origin before building.

### 3) Start the API server (port 3001)

```bash
npm run dev:server
```

Health check:

```bash
curl http://localhost:3001/api/health
```

### 4) Start the web app (port 8080)

```bash
npm run dev
```

Open:
- `http://localhost:8080`

## Build

```bash
npm run build
```

### Run from `dist/` (no Vite dev server)

You still need to run the API server (and MongoDB). For the frontend, you have two options:

**Option A: Serve `dist/` from the API server (single process)**

```bash
npm run build
SERVE_CLIENT=true npm run start:server
```

Then open:
- `http://localhost:3001`

**Option B: Serve `dist/` separately (static hosting)**

Build with the API base URL set to your API origin:

```bash
VITE_API_BASE_URL="http://localhost:3001" npm run build
```

Serve `dist/` with any static server (or `npm run preview`) and make sure it can reach the API.

Preview the production build locally:

```bash
npm run preview
```

## API (high level)

- `GET /api/categories` (CRUD categories + types)
- `GET /api/chipsets` (CRUD chipsets)
- `GET /api/models` (CRUD models)
- `POST /api/generate` (generate serial/MAC groups)
- `POST /api/allocate` (mark groups allocated)
- `GET /api/search` (search models + generated groups)
