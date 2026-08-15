export function mapViewZoom(baseZoom: number, isMobile: boolean): number {
  if (!isMobile) return baseZoom;
  return Math.min(baseZoom + 2, 12);
}
