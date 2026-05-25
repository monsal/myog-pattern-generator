# GearPattern

A web app for designing, planning, and generating printable sewing patterns for
outdoor gear — backpacks, stuff sacks, hip packs, frame bags, and other MYOG
(Make Your Own Gear) projects in rigid technical fabrics (Dyneema DCF, X-Pac,
Cordura).

## What it does

- **Real-world coordinates** — every pattern piece is stored and edited in
  millimeters. Zoom and pan are display-only.
- **2D editor** — drag, resize, dimension, and annotate pieces; see seam
  allowance as a dashed inner offset, grain lines and notches as overlays.
- **Tiled PDF print** — exports a multi-page 1:1 PDF tiled across A4 or A3 with
  crop marks, alignment crosshairs, and a 50mm calibration square so you can
  verify your printer isn't scaling.
- **Seam connections** — click edge to edge to connect pieces; lengths are
  validated live (green / amber / red) and surfaced in the right sidebar.
- **3D preview** — rigid panel assembly preview alongside the 2D canvas (Phase
  2 will swap in a full Three.js scene).
- **AI photo analysis** — upload 1–4 photos of an existing bag; the app calls
  Claude vision (`claude-opus-4-5`) to identify the visible structural panels
  and pre-populates the canvas with placeholder pieces that you correct with
  real dimensions.
- **Instructions builder** — ordered step list referencing the pieces involved.
- **Materials library** — pre-seeded with common MYOG fabrics (X-Pac VX07/21,
  DCF 0.51oz/1.0oz, Cordura 500D/1000D, HEX70, ripstop nylon 70D).
- **Auto-save** — projects persist to browser storage as you work.

## Stack

Vite + React 19 + TypeScript, Tailwind v4, Zustand (persisted to
`localStorage`), `pdf-lib` for client-side PDF generation, and a Vercel
serverless function (`api/analyze-photos.ts`) that proxies the Claude vision
call.

## Getting started

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY for photo analysis
npm run dev
```

Open http://localhost:5173.

## Project structure

```
src/
  pages/            Dashboard, Editor, Instructions, Print
  components/       Canvas, sidebars, toolstrip, photo sheet, 3D preview
  lib/              units, geometry, pdf, ai client, seam validation
  store/            Zustand store (projects, pieces, seams)
  types.ts          domain model (mm-based)
api/analyze-photos  Vercel function — Claude vision endpoint
```

All dimensions everywhere are in millimeters. Pixel conversions live only in
`src/lib/units.ts`.
