import { PDFDocument, PDFPage, rgb } from "pdf-lib";
import type { PatternPiece, Project } from "../types";
import { PAPER_MM, mmToPt } from "./units";
import { offsetPolygon, pieceBounds, polygonBounds } from "./geometry";

const BLACK = rgb(0, 0, 0);
const GRAY = rgb(0.55, 0.5, 0.45);
const ACCENT = rgb(61 / 255, 107 / 255, 143 / 255);

type TileLayout = {
  cols: number;
  rows: number;
  tileWmm: number;
  tileHmm: number;
};

function tileLayout(
  piece: PatternPiece,
  paperWmm: number,
  paperHmm: number,
  overlapMm: number,
  marginMm: number
): TileLayout {
  // outline + seam allowance bounds (mm)
  const sa = piece.seamAllowance;
  const outer = offsetPolygon(piece.points, sa);
  const all = [...piece.points, ...outer];
  const b = polygonBounds(all);
  const usableW = paperWmm - 2 * marginMm;
  const usableH = paperHmm - 2 * marginMm;
  const advanceW = usableW - overlapMm;
  const advanceH = usableH - overlapMm;
  const cols = Math.max(1, Math.ceil((b.w - overlapMm) / advanceW));
  const rows = Math.max(1, Math.ceil((b.h - overlapMm) / advanceH));
  return { cols, rows, tileWmm: usableW, tileHmm: usableH };
}

function drawCropMarks(page: PDFPage, pageWpt: number, pageHpt: number) {
  const len = mmToPt(5);
  const off = mmToPt(5);
  const opts = { thickness: 0.6, color: BLACK };
  // top-left
  page.drawLine({ start: { x: off, y: pageHpt - off }, end: { x: off + len, y: pageHpt - off }, ...opts });
  page.drawLine({ start: { x: off, y: pageHpt - off }, end: { x: off, y: pageHpt - off - len }, ...opts });
  // top-right
  page.drawLine({ start: { x: pageWpt - off, y: pageHpt - off }, end: { x: pageWpt - off - len, y: pageHpt - off }, ...opts });
  page.drawLine({ start: { x: pageWpt - off, y: pageHpt - off }, end: { x: pageWpt - off, y: pageHpt - off - len }, ...opts });
  // bottom-left
  page.drawLine({ start: { x: off, y: off }, end: { x: off + len, y: off }, ...opts });
  page.drawLine({ start: { x: off, y: off }, end: { x: off, y: off + len }, ...opts });
  // bottom-right
  page.drawLine({ start: { x: pageWpt - off, y: off }, end: { x: pageWpt - off - len, y: off }, ...opts });
  page.drawLine({ start: { x: pageWpt - off, y: off }, end: { x: pageWpt - off, y: off + len }, ...opts });
}

function drawCalibrationSquare(page: PDFPage, xPt: number, yPt: number) {
  const s = mmToPt(50);
  page.drawRectangle({
    x: xPt,
    y: yPt,
    width: s,
    height: s,
    borderColor: BLACK,
    borderWidth: 0.8,
  });
  page.drawText("50 mm calibration — verify with ruler", {
    x: xPt,
    y: yPt - 10,
    size: 7,
    color: GRAY,
  });
}

function polylinePath(page: PDFPage, points: { x: number; y: number }[], dashed = false) {
  if (points.length < 2) return;
  const opts: any = { thickness: 1, color: BLACK };
  if (dashed) {
    opts.dashArray = [3, 2];
    opts.color = GRAY;
  }
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    page.drawLine({ start: a, end: b, ...opts });
  }
}

export async function exportProjectPdf(project: Project): Promise<Uint8Array> {
  const paper = PAPER_MM[project.print.paper];
  const portrait = project.print.orientation === "portrait";
  const paperWmm = portrait ? paper.w : paper.h;
  const paperHmm = portrait ? paper.h : paper.w;
  const overlap = project.print.overlapMm;
  const margin = 8; // mm page edge margin

  const doc = await PDFDocument.create();
  doc.setTitle(project.name);
  doc.setCreator("GearPattern");

  for (const piece of project.pieces) {
    const sa = piece.seamAllowance;
    const cutLine = piece.points;
    const outerLine = offsetPolygon(cutLine, sa);
    const allPts = [...cutLine, ...outerLine];
    const b = polygonBounds(allPts);
    const layout = tileLayout(piece, paperWmm, paperHmm, overlap, margin);
    const totalPages = layout.cols * layout.rows;

    let pageNum = 0;
    for (let row = 0; row < layout.rows; row++) {
      for (let col = 0; col < layout.cols; col++) {
        pageNum++;
        const page = doc.addPage([mmToPt(paperWmm), mmToPt(paperHmm)]);
        const pageWpt = page.getWidth();
        const pageHpt = page.getHeight();

        drawCropMarks(page, pageWpt, pageHpt);

        // tile origin in piece bounds coords
        const tileOriginXmm = b.minX + col * (layout.tileWmm - overlap);
        const tileOriginYmm = b.minY + row * (layout.tileHmm - overlap);

        // function to convert piece-mm point to page-pt
        // page origin is bottom-left in PDF; piece y grows downward — flip
        const toPage = (p: { x: number; y: number }) => ({
          x: mmToPt(p.x - tileOriginXmm + margin),
          y: mmToPt(paperHmm - margin - (p.y - tileOriginYmm)),
        });

        // outer dashed seam allowance line first (so cut line draws over it)
        polylinePath(page, outerLine.map(toPage), true);
        // cut line in solid black
        polylinePath(page, cutLine.map(toPage), false);

        // alignment crosshairs in overlap zones
        const cross = (xMm: number, yMm: number) => {
          const p = toPage({ x: xMm + tileOriginXmm, y: yMm + tileOriginYmm });
          const s = mmToPt(4);
          page.drawLine({ start: { x: p.x - s, y: p.y }, end: { x: p.x + s, y: p.y }, thickness: 0.4, color: ACCENT });
          page.drawLine({ start: { x: p.x, y: p.y - s }, end: { x: p.x, y: p.y + s }, thickness: 0.4, color: ACCENT });
        };
        if (col < layout.cols - 1) {
          cross(layout.tileWmm - overlap / 2, layout.tileHmm / 2);
        }
        if (row < layout.rows - 1) {
          cross(layout.tileWmm / 2, layout.tileHmm - overlap / 2);
        }

        // label box (top edge)
        const labelY = mmToPt(paperHmm - margin - 3);
        page.drawText(
          `${piece.name} — page ${pageNum} of ${totalPages}   cut ${piece.cutQuantity}×   SA ${sa}mm`,
          { x: mmToPt(margin), y: labelY, size: 9, color: BLACK }
        );
        page.drawText(project.name, {
          x: pageWpt - mmToPt(margin) - 80,
          y: labelY,
          size: 8,
          color: GRAY,
        });

        // first page of this piece: calibration square in bottom-left
        if (pageNum === 1) {
          drawCalibrationSquare(page, mmToPt(margin + 5), mmToPt(margin + 5));
        }

        // grain line arrows
        for (const m of piece.markings) {
          if (m.kind === "grain") {
            const p = toPage(m.position);
            const len = mmToPt(40);
            const a = (m.angle * Math.PI) / 180;
            const dx = Math.cos(a) * len * 0.5;
            const dy = Math.sin(a) * len * 0.5;
            page.drawLine({
              start: { x: p.x - dx, y: p.y + dy },
              end: { x: p.x + dx, y: p.y - dy },
              thickness: 0.8,
              color: BLACK,
            });
            // arrow heads
            const head = mmToPt(3);
            page.drawText("↑ grain", { x: p.x + 4, y: p.y + 4, size: 7, color: GRAY });
            void head;
          } else if (m.kind === "notch") {
            const p = toPage(m.position);
            const s = mmToPt(2);
            page.drawLine({ start: { x: p.x - s, y: p.y }, end: { x: p.x + s, y: p.y }, thickness: 0.8, color: BLACK });
            page.drawLine({ start: { x: p.x, y: p.y - s }, end: { x: p.x, y: p.y + s }, thickness: 0.8, color: BLACK });
          }
        }
      }
    }
    void pieceBounds; // keep import used
  }

  return await doc.save();
}

export async function downloadProjectPdf(project: Project) {
  const bytes = await exportProjectPdf(project);
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([ab], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.name.replace(/\s+/g, "_")}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
