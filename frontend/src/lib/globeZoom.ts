export const MIN_GLOBE_ZOOM = 0.8;
export const MAX_GLOBE_ZOOM = 8;
export const clampGlobeZoom = (zoom: number) =>
  Math.max(MIN_GLOBE_ZOOM, Math.min(MAX_GLOBE_ZOOM, zoom));
