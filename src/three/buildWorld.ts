import * as THREE from 'three';
import type { GridTile, LightingMode, MapPreset } from '../types/game';
import { LIGHTING_PALETTES } from '../utils/isometric';
export const TILE_SIZE = 1;
export const LEVEL_HEIGHT = 0.42;
const WATER_DROP = 0.06;
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
export function tileToWorld(
  x: number,
  y: number,
  z: number,
  gridWidth: number,
  gridHeight: number
): THREE.Vector3 {
  return new THREE.Vector3(
    (x - (gridWidth - 1) / 2) * TILE_SIZE,
    z * LEVEL_HEIGHT,
    (y - (gridHeight - 1) / 2) * TILE_SIZE
  );
}
function parseCssColor(css: string): { color: THREE.Color; opacity: number } {
  const rgba = css.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)/);
  if (rgba) {
    return {
      color: new THREE.Color(
        Number(rgba[1]) / 255,
        Number(rgba[2]) / 255,
        Number(rgba[3]) / 255
      ),
      opacity: rgba[4] !== undefined ? Number(rgba[4]) : 1
    };
  }
  return { color: new THREE.Color(css), opacity: 1 };
}
function lambert(css: string, opacity?: number): THREE.MeshLambertMaterial {
  const { color, opacity: parsed } = parseCssColor(css);
  const alpha = opacity ?? parsed;
  return new THREE.MeshLambertMaterial({
    color,
    transparent: alpha < 1,
    opacity: alpha
  });
}
function shadeCss(css: string, amt: number): string {
  const { color } = parseCssColor(css);
  const r = Math.round(THREE.MathUtils.clamp(color.r * 255 + amt, 0, 255));
  const g = Math.round(THREE.MathUtils.clamp(color.g * 255 + amt, 0, 255));
  const b = Math.round(THREE.MathUtils.clamp(color.b * 255 + amt, 0, 255));
  return `rgb(${r},${g},${b})`;
}
function makeBladeGeometry(darkCss: string, lightCss: string): THREE.BufferGeometry {
  const dark = parseCssColor(darkCss).color;
  const light = parseCssColor(lightCss).color;
  const mid = dark.clone().lerp(light, 0.5);
  const w = 0.02;
  const h = 0.22;
  const bend = 0.055;
  const positions = new Float32Array([
    -w, 0, 0,
    w, 0, 0,
    -w * 0.5, h * 0.55, bend * 0.45,
    w * 0.5, h * 0.55, bend * 0.45,
    0, h, bend
  ]);
  const colArr: number[] = [];
  const pushCol = (c: THREE.Color) => { colArr.push(c.r, c.g, c.b); };
  pushCol(dark); pushCol(dark); pushCol(mid); pushCol(mid); pushCol(light);
  const colors = new Float32Array(colArr);
  const indices = [0, 1, 2, 1, 3, 2, 2, 3, 4];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
export interface BuiltWorld {
  group: THREE.Group;
  tileMeshes: THREE.Mesh[];
  flag: THREE.Group | null;
  waterMeshes: THREE.Mesh[];
  backgroundTrees: THREE.Group[];
  grassBlades: THREE.Mesh[];
}
interface TileMatSet {
  normal: THREE.Material[];
  hover: THREE.Material[];
}
function boxMats(top: string, sideLeft: string, sideRight: string): THREE.Material[] {
  const sl = lambert(sideLeft);
  const sr = lambert(sideRight);
  const t = lambert(top);
  const bottom = new THREE.MeshLambertMaterial({ color: 0x1c120b });
  return [sr, sl, t, bottom, sl, sr];
}
function kindOf(tile: GridTile): string {
  if (tile.isGoal) return 'goal';
  if (tile.terrain === 'water') return 'water';
  if (tile.terrain === 'path') return 'path';
  return 'grass';
}
export function buildWorld(preset: MapPreset, lighting: LightingMode): BuiltWorld {
  const palette = LIGHTING_PALETTES[lighting];
  const group = new THREE.Group();
  const tileMeshes: THREE.Mesh[] = [];
  const waterMeshes: THREE.Mesh[] = [];
  const grassBlades: THREE.Mesh[] = [];
  const rand = mulberry32(preset.id.length * 7919 + preset.gridWidth * 31 + preset.gridHeight);
  const matSets: Record<string, TileMatSet> = {
    grass: {
      normal: boxMats(palette.grassTop, palette.grassSideLeft, palette.grassSideRight),
      hover: boxMats('#fde047', palette.grassSideLeft, palette.grassSideRight)
    },
    path: {
      normal: boxMats(palette.pathTop, palette.pathSideLeft, palette.pathSideRight),
      hover: boxMats('#fde047', palette.pathSideLeft, palette.pathSideRight)
    },
    water: {
      normal: [
        new THREE.MeshBasicMaterial({ visible: false }), 
        new THREE.MeshBasicMaterial({ visible: false }), 
        lambert(palette.waterTop),                       
        new THREE.MeshBasicMaterial({ visible: false }), 
        new THREE.MeshBasicMaterial({ visible: false }), 
        new THREE.MeshBasicMaterial({ visible: false })  
      ],
      hover: [
        new THREE.MeshBasicMaterial({ visible: false }),
        new THREE.MeshBasicMaterial({ visible: false }),
        lambert(palette.waterTop),
        new THREE.MeshBasicMaterial({ visible: false }),
        new THREE.MeshBasicMaterial({ visible: false }),
        new THREE.MeshBasicMaterial({ visible: false })
      ]
    },
    goal: {
      normal: boxMats('#fcd34d', palette.dirtSideLeft, palette.dirtSideRight),
      hover: boxMats('#fde047', palette.dirtSideLeft, palette.dirtSideRight)
    }
  };
  preset.tiles.forEach((tile) => {
    const kind = kindOf(tile);
    const mats = matSets[kind];
    const world = tileToWorld(tile.x, tile.y, tile.z, preset.gridWidth, preset.gridHeight);
    let geometry: THREE.BoxGeometry;
    let yCenter: number;
    if (tile.terrain === 'water') {
      geometry = new THREE.BoxGeometry(TILE_SIZE, 0.3, TILE_SIZE);
      yCenter = -WATER_DROP - 0.15;
    } else {
      const height = tile.z * LEVEL_HEIGHT + 0.5;
      geometry = new THREE.BoxGeometry(TILE_SIZE, height, TILE_SIZE);
      yCenter = world.y - height / 2;
    }
    const tileMesh = new THREE.Mesh(geometry, mats.normal);
    tileMesh.position.set(world.x, yCenter, world.z);
    tileMesh.receiveShadow = true;
    tileMesh.userData.tile = tile;
    tileMesh.userData.kind = kind;
    tileMesh.userData.mats = mats.normal;
    tileMesh.userData.hoverMats = mats.hover;
    group.add(tileMesh);
    tileMeshes.push(tileMesh);
    if (tile.terrain === 'water') waterMeshes.push(tileMesh);
  });
  preset.tiles.forEach((tile) => {
    const world = tileToWorld(tile.x, tile.y, tile.z, preset.gridWidth, preset.gridHeight);
    if (tile.hasTree) {
      const tree = new THREE.Group();
      const h = 0.85 + rand() * 0.5;          
      const s = 0.85 + rand() * 0.45;         
      const shade = rand();
      const trunkShade = shadeCss(palette.treeTrunk, rand() < 0.5 ? -18 : -34);
      const rootFlare = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085 * s, 0.115 * s, 0.09 * h, 12),
        lambert(trunkShade)
      );
      rootFlare.position.y = 0.045 * h;
      rootFlare.castShadow = true;
      tree.add(rootFlare);
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04 * s, 0.075 * s, 0.34 * h, 12),
        lambert(trunkShade)
      );
      trunk.position.y = 0.21 * h;
      trunk.rotation.z = (rand() - 0.5) * 0.06;
      trunk.castShadow = true;
      tree.add(trunk);
      const tiers = [
        { y: 0.46 * h, r: 0.30 * s, hh: 0.34 * h },
        { y: 0.63 * h, r: 0.25 * s, hh: 0.30 * h },
        { y: 0.78 * h, r: 0.19 * s, hh: 0.26 * h },
        { y: 0.90 * h, r: 0.12 * s, hh: 0.22 * h }
      ];
      tiers.forEach((t, i) => {
        const useLight = (shade < 0.5) ? i % 2 === 0 : i % 2 === 1;
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(t.r, t.hh, 14),
          lambert(useLight ? palette.treeFoliageLight : palette.treeFoliageDark)
        );
        cone.position.y = t.y;
        cone.rotation.y = rand() * Math.PI * 2;
        cone.rotation.z = (rand() - 0.5) * 0.08;
        cone.castShadow = true;
        tree.add(cone);
        if (i <= 1 && rand() < 0.5) {
          const puff = new THREE.Mesh(
            new THREE.ConeGeometry(t.r * 0.6, t.hh * 0.7, 10),
            lambert(useLight ? palette.treeFoliageDark : palette.treeFoliageLight)
          );
          const ang = rand() * Math.PI * 2;
          puff.position.set(
            Math.cos(ang) * t.r * 0.35,
            t.y - t.hh * 0.1,
            Math.sin(ang) * t.r * 0.35
          );
          puff.rotation.z = (rand() - 0.5) * 0.25;
          puff.castShadow = true;
          tree.add(puff);
        }
      });
      tree.rotation.y = rand() * Math.PI * 2;
      tree.position.set(
        world.x + (rand() - 0.5) * 0.18,
        world.y,
        world.z + (rand() - 0.5) * 0.18
      );
      tree.userData.tile = tile;
      group.add(tree);
    }
    if (tile.hasRock) {
      const rock = new THREE.Group();
      const baseR = 0.13 + rand() * 0.12;
      const main = new THREE.Mesh(
        new THREE.DodecahedronGeometry(baseR, 0),
        lambert(shadeCss(palette.rockColor, rand() < 0.5 ? -22 : -40))
      );
      main.scale.set(0.9 + rand() * 0.4, 0.62 + rand() * 0.28, 0.8 + rand() * 0.4);
      main.rotation.set(rand() * 0.8, rand() * Math.PI * 2, rand() * 0.5);
      main.position.y = baseR * 0.45;
      main.castShadow = true;
      main.receiveShadow = true;
      rock.add(main);
      if (rand() < 0.7) {
        const sub = new THREE.Mesh(
          new THREE.DodecahedronGeometry(baseR * (0.45 + rand() * 0.3), 0),
          lambert(shadeCss(palette.rockColor, -10))
        );
        sub.scale.set(0.85, 0.6, 0.85);
        sub.rotation.set(rand(), rand() * Math.PI * 2, rand());
        sub.position.set(
          (rand() - 0.5) * 0.22,
          baseR * 0.22,
          (rand() - 0.5) * 0.22
        );
        sub.castShadow = true;
        rock.add(sub);
      }
      if (rand() < 0.4) {
        const moss = new THREE.Mesh(
          new THREE.SphereGeometry(baseR * 0.42, 10, 8),
          lambert(palette.treeFoliageDark)
        );
        moss.scale.set(1, 0.32, 1);
        moss.position.y = baseR * 0.7;
        moss.castShadow = true;
        rock.add(moss);
      }
      rock.position.set(
        world.x + (rand() - 0.5) * 0.2,
        world.y,
        world.z + (rand() - 0.5) * 0.2
      );
      rock.userData.tile = tile;
      group.add(rock);
    }
  });
  const flowerColors = ['#f472b6', '#fbbf24', '#c4b5fd', '#fb7185', '#ffffff'];
  const grassGreen = lighting === 'cyber' ? '#0e7490' : palette.treeFoliageDark;
  const bladeGeo = makeBladeGeometry(palette.treeFoliageDark, palette.treeFoliageLight);
  const bladeMats = [
    new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, color: 'rgb(219,235,209)' }),
    new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, color: 'rgb(184,210,189)' })
  ];
  preset.tiles.forEach((tile) => {
    if (tile.terrain !== 'grass' || tile.isGoal || tile.isTrap || tile.hasTree || tile.hasRock) return;
    const world = tileToWorld(tile.x, tile.y, tile.z, preset.gridWidth, preset.gridHeight);
    const roll = rand();
    if (roll < 0.42) {
      const tuft = new THREE.Group();
      const blades = 7 + Math.floor(rand() * 5);
      for (let i = 0; i < blades; i++) {
        const blade = new THREE.Mesh(bladeGeo, bladeMats[Math.floor(rand() * bladeMats.length)]);
        const ang = (i / blades) * Math.PI * 2 + rand() * 0.7;
        const radius = rand() * 0.15;
        const hScale = 0.7 + rand() * 0.65;
        blade.position.set(Math.cos(ang) * radius, 0, Math.sin(ang) * radius);
        blade.rotation.y = ang + (rand() - 0.5) * 0.5;
        const baseZ = (rand() - 0.5) * 0.18 + Math.cos(ang) * 0.14;
        blade.rotation.z = baseZ;
        blade.rotation.x = Math.sin(ang) * 0.12;
        blade.scale.set(1, hScale, 1);
        blade.userData.phase = rand() * Math.PI * 2;
        blade.userData.baseZ = baseZ;
        tuft.add(blade);
        grassBlades.push(blade);
      }
      tuft.position.set(
        world.x + (rand() - 0.5) * 0.3,
        world.y,
        world.z + (rand() - 0.5) * 0.3
      );
      tuft.userData.tile = tile;
      group.add(tuft);
    } else if (roll < 0.5) {
      const flower = new THREE.Group();
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.014, 0.16, 5),
        lambert(grassGreen)
      );
      stem.position.y = 0.08;
      flower.add(stem);
      const petalColor = flowerColors[Math.floor(rand() * flowerColors.length)];
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 10, 8),
        lambert(petalColor)
      );
      head.scale.set(1, 0.7, 1);
      head.position.y = 0.18;
      flower.add(head);
      const center = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 8, 6),
        lambert('#fbbf24')
      );
      center.position.y = 0.19;
      flower.add(center);
      flower.position.set(
        world.x + (rand() - 0.5) * 0.28,
        world.y,
        world.z + (rand() - 0.5) * 0.28
      );
      flower.userData.tile = tile;
      group.add(flower);
    } else if (roll < 0.6) {
      const pebble = new THREE.Mesh(
        new THREE.SphereGeometry(0.045 + rand() * 0.03, 8, 6),
        lambert(shadeCss(palette.rockColor, rand() < 0.5 ? -10 : -25))
      );
      pebble.scale.y = 0.55;
      pebble.position.set(
        world.x + (rand() - 0.5) * 0.45,
        world.y + 0.02,
        world.z + (rand() - 0.5) * 0.45
      );
      group.add(pebble);
    }
  });
  let flag: THREE.Group | null = null;
  const goalTile = preset.tiles.find((t) => t.isGoal);
  if (goalTile) {
    const goalWorld = tileToWorld(goalTile.x, goalTile.y, goalTile.z, preset.gridWidth, preset.gridHeight);
    flag = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 1.05, 10),
      new THREE.MeshLambertMaterial({ color: 0xe2e8f0 })
    );
    pole.position.y = 0.525;
    pole.castShadow = true;
    flag.add(pole);
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 12, 12),
      new THREE.MeshLambertMaterial({ color: 0xfbbf24 })
    );
    ball.position.y = 1.08;
    flag.add(ball);
    const flagCloth = new THREE.Group();
    const square = 0.11;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const dark = (row + col) % 2 === 0;
        const cell = new THREE.Mesh(
          new THREE.PlaneGeometry(square, square),
          new THREE.MeshLambertMaterial({
            color: dark ? 0x0f172a : 0xf8fafc,
            side: THREE.DoubleSide
          })
        );
        cell.position.set(0.055 + col * square, -0.055 - row * square, 0);
        flagCloth.add(cell);
      }
    }
    flagCloth.position.set(0.03, 1.0, 0);
    flagCloth.name = 'flagCloth';
    flag.add(flagCloth);
    flag.position.set(goalWorld.x, goalWorld.y, goalWorld.z);
    group.add(flag);
  }
  return { group, tileMeshes, flag, waterMeshes, backgroundTrees: [], grassBlades };
}
export function disposeWorld(world: BuiltWorld): void {
  world.group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => m.dispose());
    }
  });
}
