// Single source of truth for unit conversion. Internal model = mm.
export const SCREEN_DPI = 96; // canvas DPI baseline
export const MM_PER_INCH = 25.4;
export const PT_PER_INCH = 72;
export const PT_PER_MM = PT_PER_INCH / MM_PER_INCH; // ≈ 2.8346

export const mmToPx = (mm: number, zoom = 1) =>
  mm * (SCREEN_DPI / MM_PER_INCH) * zoom;

export const pxToMm = (px: number, zoom = 1) =>
  (px * MM_PER_INCH) / (SCREEN_DPI * zoom);

export const mmToPt = (mm: number) => mm * PT_PER_MM;

export const PAPER_MM = {
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
} as const;
