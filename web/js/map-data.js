// Simplified outlines for the dialect map, as [longitude, latitude]. Accurate enough to find
// your way (Texas, northern and central Mexico, the Gulf), not for surveying.

export const VIEW = { lonMin: -107, lonMax: -86, latMin: 17.5, latMax: 36.8, scale: 20 };
const KX = VIEW.scale * Math.cos((27 * Math.PI) / 180);

export const WIDTH = Math.round((VIEW.lonMax - VIEW.lonMin) * KX);
export const HEIGHT = Math.round((VIEW.latMax - VIEW.latMin) * VIEW.scale);

/** Longitude / latitude → SVG x / y on the main map. */
export function project([lon, lat]) {
  return [+((lon - VIEW.lonMin) * KX).toFixed(1), +((VIEW.latMax - lat) * VIEW.scale).toFixed(1)];
}

export function pathOf(points, projector = project) {
  return `M${points.map((p) => projector(p).join(" ")).join("L")}Z`;
}

const TX_GULF = [
  [-93.84, 29.69], [-94.4, 29.55], [-94.75, 29.33], [-95.1, 29.1], [-95.3, 28.9], [-95.9, 28.65],
  [-96.4, 28.4], [-96.85, 28.1], [-97.2, 27.85], [-97.4, 27.55], [-97.35, 27.0], [-97.4, 26.5],
  [-97.2, 26.05], [-97.15, 25.96],
];

const RIO_GRANDE = [
  [-97.15, 25.96], [-97.5, 25.88], [-97.9, 26.05], [-98.3, 26.15], [-98.8, 26.35], [-99.15, 26.55],
  [-99.45, 27.0], [-99.5, 27.5], [-99.9, 27.8], [-100.3, 28.3], [-100.6, 28.9], [-101.0, 29.35],
  [-101.4, 29.75], [-101.8, 29.8], [-102.4, 29.85], [-102.7, 29.7], [-103.0, 29.1], [-103.3, 29.0],
  [-103.7, 29.2], [-104.2, 29.45], [-104.55, 29.75], [-104.8, 30.3], [-105.3, 30.75], [-105.8, 31.2],
  [-106.2, 31.5], [-106.5, 31.78],
];

export const TEXAS = [
  [-106.62, 32.0], [-103.06, 32.0], [-103.04, 36.5], [-100.0, 36.5], [-100.0, 34.56], [-99.4, 34.38],
  [-98.6, 34.13], [-97.95, 33.88], [-97.2, 33.75], [-96.6, 33.85], [-95.8, 33.86], [-95.2, 33.95],
  [-94.48, 33.64], [-94.04, 33.55], [-94.04, 33.02], [-94.04, 31.99], [-93.82, 31.6], [-93.55, 31.18],
  [-93.72, 30.7], [-93.7, 30.3], ...TX_GULF, ...RIO_GRANDE,
];

/** The rest of the U.S. in view: from Arizona across to the Florida panhandle. */
export const USA = [
  [-112, 38], [-84, 38], [-84, 30.05], [-85.0, 29.65], [-85.4, 29.7], [-86.5, 30.4], [-87.5, 30.3],
  [-88.0, 30.4], [-88.6, 30.35], [-89.4, 30.2], [-89.6, 29.9], [-89.15, 29.2], [-89.4, 29.0],
  [-89.9, 29.3], [-90.6, 29.1], [-91.3, 29.25], [-92.3, 29.55], [-93.3, 29.77], ...TX_GULF,
  ...RIO_GRANDE, [-108.21, 31.78], [-108.21, 31.33], [-111.07, 31.33], [-112, 31.5],
];

export const MEXICO = [
  [-106.5, 31.78], [-108.21, 31.78], [-108.21, 31.33], [-111.07, 31.33], [-113, 31.3], [-112.2, 29.3],
  [-110.9, 27.9], [-109.4, 26.2], [-108.0, 25.0], [-107.0, 24.0], [-106.4, 23.2], [-105.6, 22.3],
  [-105.3, 21.5], [-105.25, 20.6], [-104.3, 19.1], [-103.4, 18.3], [-102.2, 17.95], [-101.0, 17.3],
  [-99.9, 16.85], [-98.5, 16.3], [-97.0, 15.85], [-96.0, 15.7], [-95.2, 16.2], [-94.4, 16.2],
  [-93.2, 15.5], [-92.2, 14.55], [-92.0, 15.25], [-91.73, 16.07], [-90.45, 16.07], [-90.45, 17.25],
  [-89.15, 17.82], [-88.9, 17.9], [-88.3, 18.5], [-87.85, 18.7], [-87.5, 19.6], [-87.45, 20.4],
  [-86.85, 21.2], [-87.2, 21.55], [-88.3, 21.55], [-89.65, 21.3], [-90.35, 21.0], [-90.5, 20.2],
  [-90.6, 19.7], [-91.4, 18.85], [-91.85, 18.6], [-92.6, 18.6], [-93.6, 18.4], [-94.45, 18.15],
  [-95.0, 18.6], [-95.8, 18.75], [-96.15, 19.2], [-96.4, 19.75], [-96.9, 20.5], [-97.4, 21.2],
  [-97.75, 22.0], [-97.85, 22.6], [-97.7, 23.5], [-97.6, 24.4], [-97.4, 25.2],
  // Up the Rio Grande from the mouth back to El Paso, where the outline started.
  ...RIO_GRANDE,
];

export const RIVER = RIO_GRANDE;

/** Miami & Cuba sit in a small inset box drawn in the empty Gulf. */
export const INSET = {
  box: { lonMin: -92.3, lonMax: -86.6, latMax: 27.6, latMin: 23.3 },
  view: { lonMin: -85.3, lonMax: -73.8, latMin: 19.5, latMax: 27.3 },
};

export const FLORIDA = [
  [-82.75, 27.9], [-82.65, 27.4], [-82.2, 26.7], [-81.8, 26.1], [-81.3, 25.6], [-80.9, 25.15],
  [-80.4, 25.2], [-80.2, 25.6], [-80.1, 26.3], [-80.05, 26.9], [-80.2, 27.9],
];

export const CUBA = [
  [-84.95, 21.86], [-84.4, 22.4], [-83.4, 22.85], [-82.6, 23.05], [-82.35, 23.14], [-81.6, 23.1],
  [-80.9, 23.15], [-80.0, 22.95], [-79.2, 22.5], [-78.3, 22.3], [-77.6, 21.9], [-76.9, 21.3],
  [-75.7, 21.1], [-74.9, 20.65], [-74.15, 20.25], [-74.6, 20.05], [-75.8, 19.95], [-76.8, 19.9],
  [-77.7, 19.85], [-77.1, 20.4], [-77.7, 20.75], [-78.5, 21.5], [-79.5, 21.7], [-80.45, 22.15],
  [-81.2, 22.1], [-81.6, 22.25], [-82.0, 22.55], [-82.8, 22.65], [-83.6, 22.25], [-84.4, 21.9],
];

export const CITIES_INSET = [
  { name: "Miami", at: [-80.2, 25.77] },
  { name: "La Habana", at: [-82.36, 23.13] },
];

/** Inset box in main-map coordinates, and a projector for points inside it. */
export function insetFrame() {
  const [x0, y0] = project([INSET.box.lonMin, INSET.box.latMax]);
  const [x1, y1] = project([INSET.box.lonMax, INSET.box.latMin]);
  const w = x1 - x0;
  const h = y1 - y0;
  const v = INSET.view;
  const kx = w / (v.lonMax - v.lonMin);
  const ky = h / (v.latMax - v.latMin);
  const k = Math.min(kx, ky);
  const ox = x0 + (w - (v.lonMax - v.lonMin) * k) / 2;
  const oy = y0 + (h - (v.latMax - v.latMin) * k) / 2;
  const projectInset = ([lon, lat]) => [+(ox + (lon - v.lonMin) * k).toFixed(1), +(oy + (v.latMax - lat) * k).toFixed(1)];
  return { x: x0, y: y0, w, h, project: projectInset };
}
