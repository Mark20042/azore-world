export type TerrainType = 
  | 'grass' 
  | 'path' 
  | 'water' 
  | 'cliff' 
  | 'dirt' 
  | 'sand' 
  | 'rock'
  | 'tree';
export interface GridTile {
  x: number;
  y: number;
  z: number; 
  terrain: TerrainType;
  walkable: boolean;
  hasTree?: boolean;
  hasRock?: boolean;
  pathId?: string; 
  isGoal?: boolean;  
  isTrap?: boolean;  
}
export interface Point2D {
  x: number;
  y: number;
}
export interface Point3D {
  x: number;
  y: number;
  z: number;
}
export interface CharacterState {
  x: number;
  y: number;
  z: number;
  facing: 'SE' | 'SW' | 'NE' | 'NW';
  isMoving: boolean;
  speechText: string | null;
  speechEmoji: string | null;
  speechId: number;
}
export type LightingMode = 'day' | 'cyber';
export interface MapPreset {
  id: string;
  name: string;
  description: string;
  gridWidth: number;
  gridHeight: number;
  tiles: GridTile[];
  startPos: Point3D;
  goalPos: Point3D; 
}
