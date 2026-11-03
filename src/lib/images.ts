export function imageSrcSet(src: string | null | undefined): string | undefined {
  if (!src) return undefined;
  if (!src.startsWith('/img/') || !src.endsWith('.jpg')) return undefined;
  const base = src.slice(0, -4);
  return `${base}-700.jpg 700w, ${src} 1400w`;
}

export function imageSizes(layout: string): string {
  return layout;
}
