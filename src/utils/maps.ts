import type { MapPreset, GridTile } from '../types/game';
import { findPath } from './pathfinding';
export function createMountainPassMap(seed = 1337, difficulty = 0): MapPreset {
  const width = 10;
  const height = 10;
  const tiles: GridTile[] = [];
  const rand = mulberry32(seed);
  const elevations: number[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => (x === 0 || y === 0 || x === width - 1 || y === height - 1 ? 0 : 1))
  );
  const hillCount = 6 + Math.floor(rand() * 5);
  for (let i = 0; i < hillCount; i++) {
    const hx = 2 + Math.floor(rand() * (width - 4));
    const hy = 2 + Math.floor(rand() * (height - 4));
    if (elevations[hy][hx] > 0) elevations[hy][hx] = 2;
    if (rand() < 0.6) {
      const nx = Math.min(width - 2, Math.max(1, hx + (rand() < 0.5 ? 1 : -1)));
      if (elevations[hy][nx] > 0) elevations[hy][nx] = Math.max(elevations[hy][nx], 1);
    }
  }
  const px = 3 + Math.floor(rand() * (width - 6));
  const py = 3 + Math.floor(rand() * (height - 6));
  if (elevations[py][px] > 0) elevations[py][px] = 3;
  const landSpots: Array<{ x: number; y: number }> = [];
  for (let x = 1; x < width - 1; x++) {
    for (let y = 1; y < height - 1; y++) {
      landSpots.push({ x, y });
    }
  }
  const startSpot = landSpots[Math.floor(rand() * landSpots.length)];
  let goalSpot = landSpots[Math.floor(rand() * landSpots.length)];
  let guard = 0;
  while (
    (Math.abs(goalSpot.x - startSpot.x) + Math.abs(goalSpot.y - startSpot.y) < 7 || (goalSpot.x === startSpot.x && goalSpot.y === startSpot.y)) &&
    guard++ < 50
  ) {
    goalSpot = landSpots[Math.floor(rand() * landSpots.length)];
  }
  const startPos = { x: startSpot.x, y: startSpot.y, z: elevations[startSpot.y][startSpot.x] };
  const goalPos = { x: goalSpot.x, y: goalSpot.y, z: elevations[goalSpot.y][goalSpot.x] };
  const pathCoords = new Set<string>();
  let cx = startPos.x;
  let cy = startPos.y;
  pathCoords.add(`${cx},${cy}`);
  let steps = 0;
  while ((cx !== goalPos.x || cy !== goalPos.y) && steps++ < 200) {
    const dx = Math.sign(goalPos.x - cx);
    const dy = Math.sign(goalPos.y - cy);
    if (rand() < 0.18) {
      const side = rand() < 0.5 ? 1 : -1;
      if (dx !== 0 && rand() < 0.5) cy = Math.min(height - 2, Math.max(1, cy + side));
      else cx = Math.min(width - 2, Math.max(1, cx + side));
    } else if (dx !== 0 && (dy === 0 || rand() < 0.5)) {
      cx += dx;
    } else if (dy !== 0) {
      cy += dy;
    }
    pathCoords.add(`${cx},${cy}`);
  }
  const isSpawn = (x: number, y: number) => Math.abs(x - startPos.x) + Math.abs(y - startPos.y) <= 1;
  const land: Array<{ x: number; y: number }> = [];
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const z = elevations[y][x];
      const onPath = pathCoords.has(`${x},${y}`);
      if (z > 0 && !onPath && !isSpawn(x, y) && !(x === goalPos.x && y === goalPos.y)) {
        land.push({ x, y });
      }
    }
  }
  const trapPlan = planHiddenTraps(2 + difficulty * 1, land, () => true, rand);
  trapPlan.coords.add(`${Math.max(1, startPos.x - 2)},${Math.min(height - 2, startPos.y + 2)}`);
  land.forEach(spot => {
    const dist = Math.abs(spot.x - goalPos.x) + Math.abs(spot.y - goalPos.y);
    if (dist > 0) {
      const baseChance = Math.min(difficulty * 0.02, 0.20); 
      let chance = baseChance;
      if (dist === 1) chance = Math.min(0.20 + difficulty * 0.08, 0.90);
      else if (dist === 2) chance = Math.min(0.10 + difficulty * 0.05, 0.70);
      else if (dist === 3) chance = Math.min(0.05 + difficulty * 0.04, 0.50);
      if (rand() < chance) {
        trapPlan.coords.add(`${spot.x},${spot.y}`);
      }
    }
  });
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const coordKey = `${x},${y}`;
      const z = elevations[y][x];
      let terrain: GridTile['terrain'] = 'grass';
      let walkable = true;
      if (z === 0) {
        terrain = 'water';
        walkable = false;
      } else if (pathCoords.has(coordKey)) {
        terrain = 'grass';
      }
      const isGoal = x === goalPos.x && y === goalPos.y;
      const isTrap = trapPlan.coords.has(coordKey);
      const nearGoal = Math.abs(x - goalPos.x) + Math.abs(y - goalPos.y) <= 1;
      const canHaveNature = terrain === 'grass' && !isTrap && !isGoal && !isSpawn(x, y) && !nearGoal;
      let hasTree = false;
      let hasRock = false;
      if (canHaveNature) {
        const roll = rand();
        if (roll < 0.13) hasTree = true;
        else if (roll < 0.22) hasRock = true;
      }
      if (hasTree || hasRock) {
        walkable = false;
      }
      tiles.push({
        x,
        y,
        z,
        terrain,
        walkable,
        hasTree,
        hasRock,
        isTrap,
        isGoal
      });
    }
  }
  return {
    id: 'mountain-pass',
    name: 'Winding Mountain Pass',
    description: 'Elevated grassy hills with pine trees, rocks, and a winding reddish trail.',
    gridWidth: width,
    gridHeight: height,
    tiles,
    startPos,
    goalPos
  };
}
function createArchipelagoMap(seed = 4242): MapPreset {
  const width = 11;
  const height = 11;
  const tiles: GridTile[] = [];
  const goalPos = { x: 5, y: 9, z: 1 };
  const startPos = { x: 5, y: 5, z: 2 };
  const rand = mulberry32(seed);
  const isSpawn = (x: number, y: number) => Math.abs(x - startPos.x) + Math.abs(y - startPos.y) <= 1;
  const land: Array<{ x: number; y: number }> = [];
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const distFromCenter = Math.sqrt(Math.pow(x - 5, 2) + Math.pow(y - 5, 2));
      const onPath = (x === 5 || y === 5);
      if (distFromCenter < 4.5 && !onPath && !isSpawn(x, y) && !(x === goalPos.x && y === goalPos.y)) {
        land.push({ x, y });
      }
    }
  }
  const trapPlan = planHiddenTraps(7, land, () => true, rand);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const distFromCenter = Math.sqrt(Math.pow(x - 5, 2) + Math.pow(y - 5, 2));
      let z = 0;
      let terrain: GridTile['terrain'] = 'water';
      let walkable = false;
      if (distFromCenter < 4.5) {
        z = Math.floor(4 - distFromCenter * 0.7);
        if (z < 1) z = 1;
        terrain = 'grass';
        walkable = true;
      }
      if ((x === 5 || y === 5) && z > 0) {
        terrain = 'path';
      }
      const isGoal = x === goalPos.x && y === goalPos.y;
      const isTrap = trapPlan.coords.has(`${x},${y}`) && terrain === 'grass';
      const nearGoal = Math.abs(x - goalPos.x) + Math.abs(y - goalPos.y) <= 1;
      const canHaveNature = terrain === 'grass' && z > 1 && !isTrap && !isGoal && !isSpawn(x, y) && !nearGoal;
      let hasTree = false;
      let hasRock = false;
      if (canHaveNature) {
        const roll = rand();
        if (roll < 0.14) hasTree = true;
        else if (roll < 0.24) hasRock = true;
      }
      if (hasTree || hasRock) walkable = false;
      tiles.push({
        x,
        y,
        z,
        terrain,
        walkable,
        hasTree,
        hasRock,
        isTrap,
        isGoal
      });
    }
  }
  return {
    id: 'sky-archipelago',
    name: 'Sky Archipelago',
    description: 'A tiered island surrounded by deep blue waters with crossroad paths.',
    gridWidth: width,
    gridHeight: height,
    tiles,
    startPos,
    goalPos
  };
}
function createForestRiverMap(seed = 9001): MapPreset {
  const width = 12;
  const height = 10;
  const tiles: GridTile[] = [];
  const goalPos = { x: 10, y: 4, z: 1 };
  const startPos = { x: 1, y: 4, z: 1 };
  const rand = mulberry32(seed);
  const isSpawn = (x: number, y: number) => Math.abs(x - startPos.x) + Math.abs(y - startPos.y) <= 1;
  const isRiver = (x: number, y: number) => Math.abs(x - y) <= 1 && !(x === 6 || y === 4);
  const isPath = (x: number, y: number) => (x === 6 || y === 4);
  const land: Array<{ x: number; y: number }> = [];
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (!isRiver(x, y) && !isPath(x, y) && !isSpawn(x, y) && !(x === goalPos.x && y === goalPos.y)) {
        land.push({ x, y });
      }
    }
  }
  const trapPlan = planHiddenTraps(7, land, () => true, rand);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let terrain: GridTile['terrain'] = 'grass';
      let z = 1;
      let walkable = true;
      if (Math.abs(x - y) <= 1) {
        terrain = 'water';
        z = 0;
        walkable = false;
      } else if (x === 6 || y === 4) {
        terrain = 'path';
        z = 1;
      }
      if (Math.abs(x - y) <= 1 && (x === 6 || y === 4)) {
        terrain = 'path';
        z = 1;
        walkable = true;
      }
      const isGoal = x === goalPos.x && y === goalPos.y;
      const isTrap = trapPlan.coords.has(`${x},${y}`) && terrain === 'grass';
      const nearGoal = Math.abs(x - goalPos.x) + Math.abs(y - goalPos.y) <= 1;
      const canHaveNature = terrain === 'grass' && !isTrap && !isGoal && !isSpawn(x, y) && !nearGoal;
      let hasTree = false;
      let hasRock = false;
      if (canHaveNature) {
        const roll = rand();
        if (roll < 0.2) hasTree = true;
        else if (roll < 0.28) hasRock = true;
      }
      if (hasTree || hasRock) walkable = false;
      tiles.push({
        x,
        y,
        z,
        terrain,
        walkable,
        hasTree,
        hasRock,
        isTrap,
        isGoal
      });
    }
  }
  return {
    id: 'forest-river',
    name: 'Pine Forest River',
    description: 'Dense pine woodland separated by a winding river with a wooden path crossing.',
    gridWidth: width,
    gridHeight: height,
    tiles,
    startPos,
    goalPos
  };
}
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
interface TrapPlan {
  coords: Set<string>;
  safe: Set<string>;
}
function planHiddenTraps(
  desired: number,
  land: Array<{ x: number; y: number }>,
  isSafe: (x: number, y: number) => boolean,
  rand: () => number
): TrapPlan {
  const candidates = land.filter(({ x, y }) => isSafe(x, y));
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const coords = new Set(candidates.slice(0, desired).map(({ x, y }) => `${x},${y}`));
  const safe = new Set(candidates.slice(desired).map(({ x, y }) => `${x},${y}`));
  return { coords, safe };
}
const GENERATORS: Record<string, (seed: number, difficulty?: number) => MapPreset> = {
  'mountain-pass': createMountainPassMap,
  'sky-archipelago': createArchipelagoMap,
  'forest-river': createForestRiverMap
};
let roundCounter = 0;
export function generateRandomMap(preferredId?: string, difficulty = 0): MapPreset {
  const id = preferredId && GENERATORS[preferredId] ? preferredId : 'mountain-pass';
  
  // Try up to 50 times to generate a map with a safe path
  for (let attempt = 0; attempt < 50; attempt++) {
    roundCounter += 1;
    const seed = (Date.now() ^ (roundCounter * 0x9e3779b1)) >>> 0;
    const map = GENERATORS[id](seed, difficulty);
    
    // Validate path
    const goalTile = map.tiles.find(t => t.isGoal);
    if (goalTile) {
      // Treat traps as unwalkable to ensure a 100% safe path exists
      const safeTiles = map.tiles.map(t => ({
        ...t,
        walkable: t.walkable && !t.isTrap
      }));
      
      const path = findPath(map.startPos, goalTile, safeTiles, map.gridWidth, map.gridHeight);
      if (path.length > 0) {
        return map;
      }
    } else {
      return map;
    }
  }
  
  // Fallback if somehow impossible
  roundCounter += 1;
  return GENERATORS[id](Date.now() ^ roundCounter, difficulty);
}
export const MAP_PRESETS: MapPreset[] = [createMountainPassMap(1337, 0)];
