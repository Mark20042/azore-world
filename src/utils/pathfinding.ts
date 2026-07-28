import type { GridTile, Point3D } from '../types/game';
interface Node {
  tile: GridTile;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}
export function findPath(
  startPos: Point3D,
  targetPos: Point3D,
  tiles: GridTile[],
  gridWidth: number,
  gridHeight: number
): Point3D[] {
  const tileMap = new Map<string, GridTile>();
  tiles.forEach(t => tileMap.set(`${t.x},${t.y}`, t));
  const startTile = tileMap.get(`${startPos.x},${startPos.y}`);
  const targetTile = tileMap.get(`${targetPos.x},${targetPos.y}`);
  if (!startTile || !targetTile) {
    return [];
  }
  const openList: Node[] = [];
  const closedSet = new Set<string>();
  const heuristic = (t1: GridTile, t2: GridTile) => {
    return Math.abs(t1.x - t2.x) + Math.abs(t1.y - t2.y) + Math.abs(t1.z - t2.z);
  };
  const startNode: Node = {
    tile: startTile,
    g: 0,
    h: heuristic(startTile, targetTile),
    f: heuristic(startTile, targetTile),
    parent: null
  };
  openList.push(startNode);
  while (openList.length > 0) {
    openList.sort((a, b) => a.f - b.f);
    const currentNode = openList.shift()!;
    if (currentNode.tile.x === targetTile.x && currentNode.tile.y === targetTile.y) {
      const path: Point3D[] = [];
      let curr: Node | null = currentNode;
      while (curr) {
        path.unshift({
          x: curr.tile.x,
          y: curr.tile.y,
          z: curr.tile.z
        });
        curr = curr.parent;
      }
      return path;
    }
    const currentKey = `${currentNode.tile.x},${currentNode.tile.y}`;
    closedSet.add(currentKey);
    const neighborCoords = [
      { x: currentNode.tile.x + 1, y: currentNode.tile.y },
      { x: currentNode.tile.x - 1, y: currentNode.tile.y },
      { x: currentNode.tile.x, y: currentNode.tile.y + 1 },
      { x: currentNode.tile.x, y: currentNode.tile.y - 1 }
    ];
    for (const nc of neighborCoords) {
      if (nc.x < 0 || nc.x >= gridWidth || nc.y < 0 || nc.y >= gridHeight) continue;
      const neighborTile = tileMap.get(`${nc.x},${nc.y}`);
      if (!neighborTile) continue;
      if (!neighborTile.walkable || neighborTile.terrain === 'water' || (neighborTile as any).isCollapsed || neighborTile.hasTree || neighborTile.hasRock) continue;
      const neighborKey = `${nc.x},${nc.y}`;
      if (closedSet.has(neighborKey)) continue;
      let stepCost = neighborTile.terrain === 'path' ? 0.8 : 1.0;
      const isTrapTarget = neighborTile.x === targetTile.x && neighborTile.y === targetTile.y;
      if (neighborTile.isTrap && !isTrapTarget) {
        stepCost += 8;
      }
      const gScore = currentNode.g + stepCost;
      let neighborNode = openList.find(n => n.tile.x === neighborTile.x && n.tile.y === neighborTile.y);
      if (!neighborNode) {
        neighborNode = {
          tile: neighborTile,
          g: gScore,
          h: heuristic(neighborTile, targetTile),
          f: gScore + heuristic(neighborTile, targetTile),
          parent: currentNode
        };
        openList.push(neighborNode);
      } else if (gScore < neighborNode.g) {
        neighborNode.g = gScore;
        neighborNode.f = gScore + neighborNode.h;
        neighborNode.parent = currentNode;
      }
    }
  }
  return []; 
}
