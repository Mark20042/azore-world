import type { Point2D, LightingMode } from '../types/game';
export const TILE_WIDTH = 64;   
export const TILE_HEIGHT = 32;  
export const ELEVATION_HEIGHT = 20; 
export function gridToIso(x: number, y: number, z: number = 0): Point2D {
  const screenX = (x - y) * (TILE_WIDTH / 2);
  const screenY = (x + y) * (TILE_HEIGHT / 2) - (z * ELEVATION_HEIGHT);
  return { x: screenX, y: screenY };
}
export const LIGHTING_PALETTES: Record<LightingMode, {
  skyBg: string;
  grassTop: string;
  grassSideLeft: string;
  grassSideRight: string;
  dirtTop: string;
  dirtSideLeft: string;
  dirtSideRight: string;
  pathTop: string;
  pathSideLeft: string;
  pathSideRight: string;
  waterTop: string;
  waterSide: string;
  rockColor: string;
  treeTrunk: string;
  treeFoliageLight: string;
  treeFoliageDark: string;
  shadowColor: string;
  gridLine: string;
}> = {
  day: {
    skyBg: 'linear-gradient(160deg, #6ec6ff 0%, #bfeaff 55%, #eaf9ff 100%)',
    grassTop: '#84cc16',
    grassSideLeft: '#4d7c0f',
    grassSideRight: '#65a30d',
    dirtTop: '#d4a373',
    dirtSideLeft: '#b88656',
    dirtSideRight: '#96673b',
    pathTop: '#e8a25e',
    pathSideLeft: '#a16207',
    pathSideRight: '#b45309',
    waterTop: 'rgba(56, 189, 248, 0.9)',
    waterSide: 'rgba(14, 116, 144, 0.9)',
    rockColor: '#a8a29e',
    treeTrunk: '#78350f',
    treeFoliageLight: '#22c55e',
    treeFoliageDark: '#15803d',
    shadowColor: 'rgba(0, 0, 0, 0.18)',
    gridLine: 'rgba(255, 255, 255, 0.25)',
  },
  cyber: {
    skyBg: 'radial-gradient(circle at 50% 25%, #3b0764 0%, #150533 55%, #050014 100%)',
    grassTop: '#134e4a',
    grassSideLeft: '#042f2e',
    grassSideRight: '#0f766e',
    dirtTop: '#8b5cf6',
    dirtSideLeft: '#7c3aed',
    dirtSideRight: '#6d28d9',
    pathTop: '#f0abfc',
    pathSideLeft: '#a21caf',
    pathSideRight: '#c026d3',
    waterTop: 'rgba(14, 116, 144, 0.85)',
    waterSide: 'rgba(8, 51, 68, 0.9)',
    rockColor: '#701a75',
    treeTrunk: '#3b0764',
    treeFoliageLight: '#22d3ee',
    treeFoliageDark: '#0e7490',
    shadowColor: 'rgba(15, 23, 42, 0.6)',
    gridLine: 'rgba(56, 189, 248, 0.3)',
  }
};
export function drawIsoBlock(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  z: number,
  terrain: string,
  lighting: LightingMode,
  options?: {
    isHovered?: boolean;
    isPath?: boolean;
    isPathHover?: boolean;
    waterOffset?: number;
  }
) {
  const palette = LIGHTING_PALETTES[lighting];
  const halfW = TILE_WIDTH / 2;
  const halfH = TILE_HEIGHT / 2;
  let topColor = palette.grassTop;
  if (terrain === 'path') {
    topColor = palette.pathTop;
  } else if (terrain === 'dirt' || terrain === 'cliff') {
    topColor = palette.dirtTop;
  } else if (terrain === 'water') {
    topColor = palette.waterTop;
  }
  if (options?.isHovered) {
    topColor = '#fde047'; 
  } else if (options?.isPath) {
    topColor = '#fb923c'; 
  }
  const totalHeight = z * ELEVATION_HEIGHT;
  if (totalHeight > 0 && terrain !== 'water') {
    ctx.beginPath();
    ctx.moveTo(screenX - halfW, screenY);
    ctx.lineTo(screenX, screenY + halfH);
    ctx.lineTo(screenX, screenY + halfH + totalHeight);
    ctx.lineTo(screenX - halfW, screenY + totalHeight);
    ctx.closePath();
    ctx.fillStyle = palette.dirtSideLeft;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(screenX, screenY + halfH);
    ctx.lineTo(screenX + halfW, screenY);
    ctx.lineTo(screenX + halfW, screenY + totalHeight);
    ctx.lineTo(screenX, screenY + halfH + totalHeight);
    ctx.closePath();
    ctx.fillStyle = palette.dirtSideRight;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(screenX, screenY - halfH);
  ctx.lineTo(screenX + halfW, screenY);
  ctx.lineTo(screenX, screenY + halfH);
  ctx.lineTo(screenX - halfW, screenY);
  ctx.closePath();
  ctx.fillStyle = topColor;
  ctx.fill();
  ctx.strokeStyle = options?.isHovered ? '#ffffff' : palette.gridLine;
  ctx.lineWidth = options?.isHovered ? 2.5 : 1;
  ctx.stroke();
  if (terrain === 'grass' && z > 0) {
    ctx.beginPath();
    ctx.moveTo(screenX - halfW, screenY);
    ctx.lineTo(screenX, screenY + halfH);
    ctx.lineTo(screenX + halfW, screenY);
    ctx.lineTo(screenX + halfW, screenY + 4);
    ctx.lineTo(screenX, screenY + halfH + 4);
    ctx.lineTo(screenX - halfW, screenY + 4);
    ctx.closePath();
    ctx.fillStyle = palette.dirtSideLeft;
    ctx.fill();
  }
}
export function drawPineTree(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  lighting: LightingMode
) {
  const palette = LIGHTING_PALETTES[lighting];
  ctx.beginPath();
  ctx.ellipse(screenX, screenY + 4, 12, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = palette.shadowColor;
  ctx.fill();
  ctx.fillStyle = palette.treeTrunk;
  ctx.fillRect(screenX - 3, screenY - 14, 6, 16);
  const tiers = [
    { yOffset: -12, width: 22, height: 18 },
    { yOffset: -24, width: 18, height: 16 },
    { yOffset: -36, width: 12, height: 14 }
  ];
  tiers.forEach((tier) => {
    ctx.beginPath();
    ctx.moveTo(screenX, screenY + tier.yOffset - tier.height);
    ctx.lineTo(screenX + tier.width / 2, screenY + tier.yOffset);
    ctx.lineTo(screenX - tier.width / 2, screenY + tier.yOffset);
    ctx.closePath();
    ctx.fillStyle = palette.treeFoliageLight;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(screenX, screenY + tier.yOffset - tier.height);
    ctx.lineTo(screenX + tier.width / 2, screenY + tier.yOffset);
    ctx.lineTo(screenX, screenY + tier.yOffset);
    ctx.closePath();
    ctx.fillStyle = palette.treeFoliageDark;
    ctx.fill();
  });
}
export function drawRock(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  lighting: LightingMode
) {
  const palette = LIGHTING_PALETTES[lighting];
  ctx.beginPath();
  ctx.ellipse(screenX, screenY + 3, 10, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = palette.shadowColor;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(screenX - 8, screenY);
  ctx.lineTo(screenX - 3, screenY - 10);
  ctx.lineTo(screenX + 6, screenY - 8);
  ctx.lineTo(screenX + 9, screenY + 2);
  ctx.lineTo(screenX + 2, screenY + 5);
  ctx.closePath();
  ctx.fillStyle = palette.rockColor;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
}
