import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import type { GridTile, Point3D, CharacterState, LightingMode, MapPreset } from '../types/game';
import { findPath } from '../utils/pathfinding';
import {
  playStepSound,
  playClickSound,
  playFallSound,
  playWinSound,
  playWinstreakSound
} from '../utils/audio';
import { createChibiBoy, type ChibiCharacter } from '../three/ChibiCharacter';
import { buildWorld, disposeWorld, tileToWorld, type BuiltWorld } from '../three/buildWorld';
import { SpeechBubble } from './SpeechBubble';
import { ZoomIn, ZoomOut, Maximize2, Trophy, Skull, Lightbulb } from 'lucide-react';
interface ThreeWorldProps {
  mapPreset: MapPreset;
  lighting: LightingMode;
  characterState: CharacterState;
  setCharacterState: React.Dispatch<React.SetStateAction<CharacterState>>;
  onGameOver?: (isWin: boolean) => void;
  wins: number;
  winstreak: number;
  isMuted: boolean;
  isAdminMode?: boolean;
  hintsRemaining: number;
  setHintsRemaining: React.Dispatch<React.SetStateAction<number>>;
}
type PlayMode = 'idle' | 'walking' | 'falling' | 'won' | 'ended';
interface WalkPath {
  points: THREE.Vector3[];
  tiles: GridTile[];
  index: number;
  segT: number;
}
const FRUSTUM_SIZE = 10.5;
const DRAG_THRESHOLD_PX = 8;
const FIXED_SPEED = 3;
export const ThreeWorld: React.FC<ThreeWorldProps> = ({
  mapPreset,
  lighting,
  characterState,
  setCharacterState,
  onGameOver,
  wins,
  winstreak,
  isMuted,
  isAdminMode = false,
  hintsRemaining,
  setHintsRemaining
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const worldRef = useRef<BuiltWorld | null>(null);
  const charRef = useRef<ChibiCharacter | null>(null);
  const lightsRef = useRef<{ hemi: THREE.HemisphereLight; dir: THREE.DirectionalLight } | null>(null);
  const winsRef = useRef(wins);
  const modeRef = useRef<PlayMode>('idle');
  const pathRef = useRef<WalkPath | null>(null);
  const charTileRef = useRef<Point3D>({ ...mapPreset.startPos });
  const fallRef = useRef({ t: 0, fromY: 0, trapMesh: null as THREE.Mesh | null });
  const collapsingRef = useRef<{ mesh: THREE.Mesh; t: number; startY: number }[]>([]);
  const hintedTileRef = useRef<{ mesh: THREE.Mesh; t: number; startY: number } | null>(null);
  const wonRef = useRef({ t: 0 });
  const camTargetRef = useRef(new THREE.Vector3(0, 0.4, 0));
  const presetRef = useRef<MapPreset>(mapPreset);
  const speedRef = useRef(FIXED_SPEED);
  const mutedRef = useRef(false);
  const zoomRef = useRef(1.0);
  const onGameOverRef = useRef<((isWin: boolean) => void) | undefined>(onGameOver);
  const activePointerIdRef = useRef<number | null>(null);
  const hasDraggedRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hoveredMeshRef = useRef<THREE.Mesh | null>(null);
  const shadowRef = useRef<THREE.Mesh | null>(null);
  const [overlay, setOverlay] = useState<'win' | 'gameover' | null>(null);
  const overlayRef = useRef(overlay);
  const getInitialZoom = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isMobile = Math.min(w, h) < 768;
    if (isMobile) {
      return 0.55; // Zoomed out for mobile
    }
    return 1.2;
  };
  const [zoom, setZoom] = useState(getInitialZoom);
  const [bubblePos, setBubblePos] = useState({ x: -999, y: -999 });
  const isPortraitRef = useRef(window.innerWidth < window.innerHeight);

  useEffect(() => {
    hintedTileRef.current = null;
  }, [mapPreset.id]);

  const handleSafeStepHint = () => {
    if (hintsRemaining <= 0 || modeRef.current !== 'idle') return;
    
    playClickSound(mutedRef.current);
    const world = worldRef.current;
    if (!world) return;

    const preset = presetRef.current;
    const goalTile = preset.tiles.find(t => t.isGoal);
    if (!goalTile) return;

    const path = findPath(charTileRef.current, goalTile, preset.tiles, preset.gridWidth, preset.gridHeight);
    if (path.length > 1) {
      const nextStep = path[1];
      const mesh = world.tileMeshes.find(m => {
        const t = m.userData.tile as GridTile;
        return t.x === nextStep.x && t.y === nextStep.y && t.z === nextStep.z;
      });
      if (mesh) {
        hintedTileRef.current = { mesh, t: 0, startY: mesh.position.y };
        setHintsRemaining(prev => prev - 1);
        setCharacterState(prev => ({
          ...prev,
          speechText: "That way!",
          speechEmoji: "💡",
          speechId: Date.now()
        }));
      }
    }
  };

  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    
    // First, remove existing markers
    const toRemove = world.group.children.filter(c => c.name === 'adminTrapMarker');
    toRemove.forEach(c => {
      if (c instanceof THREE.Mesh) {
        c.geometry.dispose();
        (c.material as THREE.Material).dispose();
      }
      world.group.remove(c);
    });

    if (isAdminMode) {
      const geo = new THREE.PlaneGeometry(0.8, 0.8);
      const mat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.6 });
      world.tileMeshes.forEach(m => {
        const tile = m.userData.tile as GridTile;
        if (tile.isTrap) {
          const marker = new THREE.Mesh(geo, mat);
          marker.rotation.x = -Math.PI / 2;
          marker.position.copy(m.position);
          marker.position.y += 0.51; // Just above the tile surface
          marker.name = 'adminTrapMarker';
          world.group.add(marker);
        }
      });
    }
  }, [isAdminMode, mapPreset.id]);

  useEffect(() => {
    const handleResize = () => {
      const isCurrentlyPortrait = window.innerWidth < window.innerHeight;
      if (isPortraitRef.current !== isCurrentlyPortrait) {
        isPortraitRef.current = isCurrentlyPortrait;
        setZoom(getInitialZoom());
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  useEffect(() => { presetRef.current = mapPreset; }, [mapPreset]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { overlayRef.current = overlay; }, [overlay]);
  useEffect(() => { onGameOverRef.current = onGameOver; }, [onGameOver]);
  useEffect(() => { mutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { winsRef.current = wins; }, [wins]);
  const updateCamera = () => {
    const camera = cameraRef.current;
    if (!camera) return;
    const t = camTargetRef.current;
    let shakeOffsetX = 0;
    let shakeOffsetZ = 0;
    if (modeRef.current === 'idle' || modeRef.current === 'walking') {
      const preset = presetRef.current;
      const ct = charTileRef.current;
      let minDist = Infinity;
      preset.tiles.forEach(tile => {
        if (tile.isTrap && !tile.isGoal) {
          const d = Math.abs(tile.x - ct.x) + Math.abs(tile.y - ct.y);
          if (d < minDist) minDist = d;
        }
      });
      const w = winsRef.current;
      const warningRadius = w === 0 ? 3 : (w === 1 ? 2 : 1);
      if (minDist <= warningRadius) {
        const intensity = 0.006 + (warningRadius - minDist + 1) * 0.015; 
        const time = Date.now();
        shakeOffsetX = Math.sin(time * 0.05) * intensity;
        shakeOffsetZ = Math.cos(time * 0.06) * intensity;
      }
    }
    camera.position.set(t.x + 8.6 + shakeOffsetX, t.y + 9.2, t.z + 8.6 + shakeOffsetZ);
    camera.lookAt(t.x + shakeOffsetX, t.y, t.z + shakeOffsetZ);
    camera.zoom = zoomRef.current;
    camera.updateProjectionMatrix();
  };
  const placeCharacter = (tilePos: Point3D) => {
    const char = charRef.current;
    if (!char) return;
    const preset = presetRef.current;
    const world = tileToWorld(tilePos.x, tilePos.y, tilePos.z, preset.gridWidth, preset.gridHeight);
    char.group.position.copy(world);
    char.group.rotation.set(0, Math.PI * 0.25, 0);
    charTileRef.current = { ...tilePos };
  };
  const resetRound = (speak: boolean = true) => {
    const preset = presetRef.current;
    pathRef.current = null;
    modeRef.current = 'idle';
    const oldTrap = fallRef.current.trapMesh;
    if (oldTrap) {
      oldTrap.scale.set(1, 1, 1);
      oldTrap.visible = true;
    }
    fallRef.current = { t: 0, fromY: 0, trapMesh: null };
    collapsingRef.current.forEach(c => {
      c.mesh.position.y = c.startY;
      c.mesh.scale.set(1, 1, 1);
      c.mesh.visible = true;
      if (c.mesh.userData.tile) {
        (c.mesh.userData.tile as any).isCollapsed = false;
      }
    });
    collapsingRef.current = [];
    wonRef.current = { t: 0 };
    camTargetRef.current.set(0, 0.4, 0);
    charRef.current?.setCelebrating(false);
    placeCharacter(preset.startPos);
    setOverlay(null);
    if (speak) {
      setCharacterState(prev => ({
        ...prev,
        ...preset.startPos,
        isMoving: false,
        speechText: null,
        speechEmoji: null
      }));
    } else {
      setCharacterState(prev => ({ 
        ...prev, 
        ...preset.startPos, 
        isMoving: false,
        speechText: null,
        speechEmoji: null
      }));
    }
  };
  const startWin = () => {
    modeRef.current = 'won';
    wonRef.current = { t: 0 };
    pathRef.current = null;
    charRef.current?.setCelebrating(true);
    
    if (winstreak >= 2) {
      playWinstreakSound(mutedRef.current);
    } else {
      playWinSound(mutedRef.current);
    }

    setCharacterState(prev => ({
      ...prev,
      isMoving: false,
      speechText: 'You Win!',
      speechEmoji: '🎉',
      speechId: Date.now()
    }));
    confetti({ particleCount: 160, spread: 75, origin: { y: 0.6 } });
    window.setTimeout(() => {
      confetti({ particleCount: 90, spread: 100, origin: { y: 0.4 } });
    }, 450);
  };
  const startFall = (reason: 'trap' | 'stuck' = 'trap') => {
    const char = charRef.current;
    if (!char) return;
    const current = charTileRef.current;
    const world = worldRef.current;
    const trapMesh = world
      ? world.tileMeshes.find(m => {
          const t = m.userData.tile as GridTile;
          return t.x === current.x && t.y === current.y;
        }) ?? null
      : null;
    modeRef.current = 'falling';
    fallRef.current = { t: 0, fromY: char.group.position.y, trapMesh };
    pathRef.current = null;
    playFallSound(mutedRef.current);
    setCharacterState(prev => ({
      ...prev,
      isMoving: false,
      speechText: reason === 'stuck' ? "I'm stuck!" : 'Ahhh!',
      speechEmoji: reason === 'stuck' ? '😱' : '😭',
      speechId: Date.now()
    }));
  };
  const startMoveTo = (tile: GridTile) => {
    if (modeRef.current !== 'idle') {
      return;
    }
    if (!tile.walkable && !tile.isGoal) {
      return;
    }
    const start = charTileRef.current;
    const distance = Math.abs(tile.x - start.x) + Math.abs(tile.y - start.y);
    if (distance !== 1) {
      return;
    }
    playClickSound(mutedRef.current);
    const preset = presetRef.current;
    const path = findPath(start, { x: tile.x, y: tile.y, z: tile.z }, presetRef.current.tiles, presetRef.current.gridWidth, presetRef.current.gridHeight);
    if (path.length <= 1) return;
    const tileByKey = new Map(preset.tiles.map(t => [`${t.x},${t.y}`, t]));
    pathRef.current = {
      points: path.map(p => tileToWorld(p.x, p.y, p.z, preset.gridWidth, preset.gridHeight)),
      tiles: path.map(p => tileByKey.get(`${p.x},${p.y}`)!),
      index: 0,
      segT: 0
    };
    modeRef.current = 'walking';
    setCharacterState(prev => ({ ...prev, isMoving: true, speechText: null }));
  };
  const updateWalk = (dt: number) => {
    const char = charRef.current;
    const path = pathRef.current;
    if (!char || !path) return;
    const segDur = Math.max(0.15, 0.45 - speedRef.current * 0.03);
    path.segT += dt / segDur;
    const t = Math.min(path.segT, 1);
    const e = t * t * (3 - 2 * t); 
    const a = path.points[path.index];
    const b = path.points[path.index + 1];
    char.group.position.x = THREE.MathUtils.lerp(a.x, b.x, e);
    char.group.position.z = THREE.MathUtils.lerp(a.z, b.z, e);
    char.group.position.y = THREE.MathUtils.lerp(a.y, b.y, e) + Math.sin(t * Math.PI) * 0.09;
    const targetYaw = Math.atan2(b.x - a.x, b.z - a.z);
    let delta = targetYaw - char.group.rotation.y;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    char.group.rotation.y += delta * Math.min(1, dt * 12);
    if (t < 1) return;
    const prevTile = path.tiles[path.index];
    path.index += 1;
    path.segT = 0;
    char.group.position.copy(b);
    const world = worldRef.current;
    if (world) {
      const prevMesh = world.tileMeshes.find(m => m.userData.tile === prevTile);
      if (prevMesh && !collapsingRef.current.some(c => c.mesh === prevMesh)) {
        collapsingRef.current.push({ mesh: prevMesh, t: 0, startY: prevMesh.position.y });
        (prevTile as any).isCollapsed = true;
      }
    }
    const arrived = path.tiles[path.index];
    charTileRef.current = { x: arrived.x, y: arrived.y, z: arrived.z };
    if (path.index % 2 === 0) playStepSound(mutedRef.current);
    if (arrived.isTrap) { startFall('trap'); return; }
    if (arrived.isGoal) { startWin(); return; }
    if (path.index >= path.points.length - 1) {
      pathRef.current = null;
      
      const hasMoves = [
        { x: arrived.x + 1, y: arrived.y },
        { x: arrived.x - 1, y: arrived.y },
        { x: arrived.x, y: arrived.y + 1 },
        { x: arrived.x, y: arrived.y - 1 }
      ].some(pos => {
        const t = presetRef.current.tiles.find(tile => tile.x === pos.x && tile.y === pos.y);
        return t && t.terrain !== 'water' && !t.hasTree && !t.hasRock && !(t as any).isCollapsed;
      });

      if (!hasMoves) {
        startFall('stuck');
        return;
      }

      modeRef.current = 'idle';
      setCharacterState(prev => ({
        ...prev,
        isMoving: false
      }));
    }
  };
  const updateFall = (dt: number) => {
    const char = charRef.current;
    if (!char) return;
    fallRef.current.t += dt;
    const trap = fallRef.current.trapMesh;
    if (trap) {
      const shrinkT = Math.min(fallRef.current.t / 0.3, 1);
      const s = 1 - shrinkT * shrinkT;
      trap.scale.set(Math.max(s, 0.001), Math.max(s, 0.001), Math.max(s, 0.001));
      if (shrinkT >= 1) trap.visible = false;
    }
    const fallStart = 0.25;
    const fallT = Math.max(0, fallRef.current.t - fallStart);
    const k = Math.min(fallT / 0.7, 1);
    char.group.position.y = fallRef.current.fromY - k * k * 2.4;
    char.group.rotation.z = k * 1.2;
    if (k >= 1 && modeRef.current === 'falling') {
      modeRef.current = 'ended';
      setOverlay('gameover');
      setTimeout(() => {
        onGameOverRef.current?.(false); 
      }, 1500); 
    }
  };
  const updateWon = (dt: number, elapsed: number) => {
    const char = charRef.current;
    if (!char) return;
    wonRef.current.t += dt;
    char.group.rotation.y += dt * 7;
    const preset = presetRef.current;
    const base = tileToWorld(charTileRef.current.x, charTileRef.current.y, charTileRef.current.z, preset.gridWidth, preset.gridHeight);
    char.group.position.y = base.y + Math.abs(Math.sin(elapsed * 8)) * 0.22;
    if (wonRef.current.t >= 2.4 && modeRef.current === 'won') {
      modeRef.current = 'ended';
      setOverlay('win');
      setTimeout(() => {
        onGameOverRef.current?.(true); 
      }, 1500); 
    }
  };
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0); 
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -60, 120);
    cameraRef.current = camera;
    const hemi = new THREE.HemisphereLight(0xbfe8ff, 0x8a6f4d, 0.95);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(6, 10, 4);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.left = -9;
    dir.shadow.camera.right = 9;
    dir.shadow.camera.top = 9;
    dir.shadow.camera.bottom = -9;
    dir.shadow.bias = -0.0004;
    scene.add(dir);
    lightsRef.current = { hemi, dir };
    const char = createChibiBoy();
    charRef.current = char;
    scene.add(char.group);
    placeCharacter(charTileRef.current);
    const blobShadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.2, 24),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 })
    );
    blobShadow.rotation.x = -Math.PI / 2;
    blobShadow.renderOrder = 1;
    scene.add(blobShadow);
    shadowRef.current = blobShadow;
    const clock = new THREE.Clock();
    let rafId = 0;
    const tmpVec = new THREE.Vector3();
    const loop = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;
      if (modeRef.current === 'walking') updateWalk(dt);
      else if (modeRef.current === 'falling') updateFall(dt);
      else if (modeRef.current === 'won') updateWon(dt, elapsed);
      char.update(elapsed, modeRef.current === 'walking');
      const world = worldRef.current;
      if (world) {
        const cloth = world.flag?.getObjectByName('flagCloth');
        if (cloth) cloth.rotation.y = Math.sin(elapsed * 2.4) * 0.35;
        world.waterMeshes.forEach((water, i) => {
          water.position.y = -0.21 + Math.sin(elapsed * 1.6 + i * 0.7) * 0.02;
        });
        for (const tr of world.backgroundTrees) {
          const ph = (tr.userData.phase as number) || 0;
          tr.rotation.z = Math.sin(elapsed * 0.8 + ph) * 0.025;
          tr.rotation.x = Math.cos(elapsed * 0.6 + ph) * 0.015;
        }
        for (const b of world.grassBlades) {
          const ph = (b.userData.phase as number) || 0;
          const baseZ = (b.userData.baseZ as number) || 0;
          b.rotation.z = baseZ + Math.sin(elapsed * 1.8 + ph) * 0.07;
        }
      }
      for (let i = collapsingRef.current.length - 1; i >= 0; i--) {
        const c = collapsingRef.current[i];
        c.t += dt;
        const shrinkT = Math.min(c.t / 0.5, 1);
        const s = 1 - shrinkT * shrinkT;
        c.mesh.scale.set(Math.max(s, 0.001), Math.max(s, 0.001), Math.max(s, 0.001));
        c.mesh.position.y = c.startY - (shrinkT * shrinkT * 2.0); 
        if (shrinkT >= 1) {
          c.mesh.visible = false;
        }
      }
      
      if (hintedTileRef.current) {
        const hc = hintedTileRef.current;
        hc.t += dt;
        // Bounce animation: 2 full bounces over 1.2 seconds
        if (hc.t < 1.2) {
          hc.mesh.position.y = hc.startY + Math.abs(Math.sin(hc.t * Math.PI * 3.33)) * 0.15;
        } else {
          hc.mesh.position.y = hc.startY;
          hintedTileRef.current = null;
        }
      }

      const shadow = shadowRef.current;
      if (shadow) {
        const preset = presetRef.current;
        const tilePos = charTileRef.current;
        const surface = tileToWorld(tilePos.x, tilePos.y, tilePos.z, preset.gridWidth, preset.gridHeight);
        shadow.position.set(char.group.position.x, surface.y + 0.006, char.group.position.z);
        const heightAbove = Math.max(0, char.group.position.y - surface.y);
        const shadowScale = Math.max(0.4, 1 - heightAbove * 0.6);
        shadow.scale.setScalar(shadowScale);
        (shadow.material as THREE.MeshBasicMaterial).opacity = modeRef.current === 'falling'
          ? Math.max(0, 0.25 - heightAbove * 0.2)
          : 0.25 * shadowScale;
      }
      updateCamera();
      renderer.render(scene, camera);
      tmpVec.copy(char.group.position);
      tmpVec.y += 1.05;
      tmpVec.project(camera);
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      const sx = (tmpVec.x * 0.5 + 0.5) * w;
      const sy = (-tmpVec.y * 0.5 + 0.5) * h;
      setBubblePos(prev => (Math.abs(prev.x - sx) > 0.75 || Math.abs(prev.y - sy) > 0.75 ? { x: sx, y: sy } : prev));
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    const applySize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      const aspect = w / h;
      camera.left = (-FRUSTUM_SIZE * aspect) / 2;
      camera.right = (FRUSTUM_SIZE * aspect) / 2;
      camera.top = FRUSTUM_SIZE / 2;
      camera.bottom = -FRUSTUM_SIZE / 2;
      camera.updateProjectionMatrix();
    };
    applySize();
    const resizeObserver = new ResizeObserver(applySize);
    resizeObserver.observe(mount);
    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      if (worldRef.current) {
        disposeWorld(worldRef.current);
        worldRef.current = null;
      }
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      rendererRef.current = null;
    };
  }, []);
  const prevPresetRef = useRef(mapPreset);
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (worldRef.current) {
      scene.remove(worldRef.current.group);
      disposeWorld(worldRef.current);
    }
    const world = buildWorld(mapPreset, lighting);
    scene.add(world.group);
    worldRef.current = world;
    hoveredMeshRef.current = null;
    const lights = lightsRef.current;
    if (lights) {
      const rigs: Record<LightingMode, { hemiSky: number; hemiGround: number; hemiInt: number; dirColor: number; dirInt: number; dirPos: [number, number, number] }> = {
        day: { hemiSky: 0xcdeeff, hemiGround: 0x9a7f56, hemiInt: 1.05, dirColor: 0xfff6e0, dirInt: 1.55, dirPos: [6, 10, 4] },
        cyber: { hemiSky: 0x7c3aed, hemiGround: 0x03001e, hemiInt: 0.8, dirColor: 0xf0abfc, dirInt: 1.0, dirPos: [5, 9, -4] }
      };
      const rig = rigs[lighting];
      lights.hemi.color.setHex(rig.hemiSky);
      lights.hemi.groundColor.setHex(rig.hemiGround);
      lights.hemi.intensity = rig.hemiInt;
      lights.dir.color.setHex(rig.dirColor);
      lights.dir.intensity = rig.dirInt;
      lights.dir.position.set(...rig.dirPos);
    }
    if (prevPresetRef.current !== mapPreset) {
      prevPresetRef.current = mapPreset;
      resetRound(false); 
    } else {
      placeCharacter(charTileRef.current);
      const newCollapsing: typeof collapsingRef.current = [];
      for (const tile of mapPreset.tiles) {
        if ((tile as any).isCollapsed) {
          const mesh = world.tileMeshes.find(m => m.userData.tile === tile);
          if (mesh) {
            newCollapsing.push({ mesh, t: 0.5, startY: mesh.position.y });
            mesh.scale.set(0.001, 0.001, 0.001);
            mesh.visible = false;
          }
        }
      }
      collapsingRef.current = newCollapsing;
      if (modeRef.current === 'falling') {
        const current = charTileRef.current;
        const trapMesh = world.tileMeshes.find(m => {
          const t = m.userData.tile as import('../types/game').GridTile;
          return t.x === current.x && t.y === current.y;
        });
        if (trapMesh) {
          fallRef.current.trapMesh = trapMesh;
          trapMesh.scale.set(0.001, 0.001, 0.001);
          trapMesh.visible = false;
        }
      }
    }
  }, [mapPreset, lighting]);
  const pickTile = (clientX: number, clientY: number): GridTile | null => {
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const world = worldRef.current;
    if (!renderer || !camera || !world) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(world.tileMeshes, false);
    return hits.length > 0 ? (hits[0].object.userData.tile as GridTile) : null;
  };
  const setHoverMesh = (mesh: THREE.Mesh | null) => {
    if (hoveredMeshRef.current === mesh) return;
    if (hoveredMeshRef.current) {
      hoveredMeshRef.current.material = hoveredMeshRef.current.userData.mats;
    }
    if (mesh) {
      mesh.material = mesh.userData.hoverMats;
    }
    hoveredMeshRef.current = mesh;
  };
  const clearHover = () => {
    setHoverMesh(null);
  };
  const isCanvasEvent = (e: React.PointerEvent<HTMLDivElement> | React.WheelEvent<HTMLDivElement>) =>
    e.target === rendererRef.current?.domElement;
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isCanvasEvent(e)) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    activePointerIdRef.current = e.pointerId;
    hasDraggedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
    }
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current === e.pointerId) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (!hasDraggedRef.current && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
        hasDraggedRef.current = true;
        clearHover();
      }
      if (hasDraggedRef.current) {
        const camera = cameraRef.current;
        const mount = mountRef.current;
        if (!camera || !mount) return;
        const mpp = FRUSTUM_SIZE / ((mount.clientHeight || 1) * zoomRef.current); 
        const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
        right.y = 0;
        right.normalize();
        const fwd = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
        fwd.y = 0;
        fwd.normalize();
        camTargetRef.current.addScaledVector(right, -dx * mpp).addScaledVector(fwd, dy * mpp);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        const preset = presetRef.current;
        const maxR = Math.max(preset.gridWidth, preset.gridHeight) * 0.75;
        camTargetRef.current.x = THREE.MathUtils.clamp(camTargetRef.current.x, -maxR, maxR);
        camTargetRef.current.z = THREE.MathUtils.clamp(camTargetRef.current.z, -maxR, maxR);
      }
      return;
    }
    if (!isCanvasEvent(e)) return;
    const tile = pickTile(e.clientX, e.clientY);
    let mesh: THREE.Mesh | null = null;
    if (tile) {
      const start = charTileRef.current;
      const distance = Math.abs(tile.x - start.x) + Math.abs(tile.y - start.y);
      if (
        distance === 1 && 
        tile.terrain !== 'water' && 
        !tile.hasTree && 
        !tile.hasRock && 
        !(tile as any).isCollapsed
      ) {
        const world = worldRef.current;
        mesh = world ? world.tileMeshes.find(m => m.userData.tile === tile) ?? null : null;
      }
    }
    setHoverMesh(mesh);
  };
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    const wasDrag = hasDraggedRef.current;
    activePointerIdRef.current = null;
    hasDraggedRef.current = false;
    if (!wasDrag) {
      const tile = pickTile(e.clientX, e.clientY);
      if (tile) {
        startMoveTo(tile);
      }
    }
  };
  const handlePointerCancel = () => {
    activePointerIdRef.current = null;
    hasDraggedRef.current = false;
  };
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!isCanvasEvent(e)) return;
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom(prev => THREE.MathUtils.clamp(prev * factor, 0.25, 2.4));
  };
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __isoDebug?: unknown };
    w.__isoDebug = {
      charTile: () => ({ ...charTileRef.current }),
      mode: () => modeRef.current,
      overlay: () => overlayRef.current,
      traps: () => presetRef.current.tiles.filter(t => t.isTrap).map(t => ({ x: t.x, y: t.y, z: t.z })),
      tileScreen: (x: number, y: number, z: number) => {
        const camera = cameraRef.current;
        const mount = mountRef.current;
        if (!camera || !mount) return null;
        const preset = presetRef.current;
        const v = tileToWorld(x, y, z, preset.gridWidth, preset.gridHeight);
        v.project(camera);
        return {
          x: (v.x * 0.5 + 0.5) * mount.clientWidth,
          y: (-v.y * 0.5 + 0.5) * mount.clientHeight
        };
      }
    };
    return () => { delete w.__isoDebug; };
  }, []);
  return (
    <div
      ref={mountRef}
      className="relative w-full h-full overflow-hidden select-none"
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
      onWheel={handleWheel}
    >
      {/* Zoom Controls & Hints */}
      <div className="canvas-zoom-controls">
        <button
          onClick={handleSafeStepHint}
          className={`zoom-btn hint-btn ${hintsRemaining <= 0 ? 'disabled' : ''}`}
          title="Safe Step Hint"
          disabled={hintsRemaining <= 0}
          style={{ opacity: hintsRemaining <= 0 ? 0.5 : 1, cursor: hintsRemaining <= 0 ? 'not-allowed' : 'pointer' }}
        >
          <Lightbulb className="zoom-icon" style={{ color: hintsRemaining > 0 ? '#fde047' : '#94a3b8' }} />
          <span style={{ fontSize: '13px', fontWeight: '800', marginLeft: '6px' }}>{hintsRemaining}</span>
        </button>
        <button
          onClick={() => setZoom(prev => THREE.MathUtils.clamp(prev + 0.25, 0.25, 2.4))}
          className="zoom-btn"
          title="Zoom In"
        >
          <ZoomIn className="zoom-icon" />
        </button>
        <button
          onClick={() => setZoom(prev => THREE.MathUtils.clamp(prev - 0.25, 0.25, 2.4))}
          className="zoom-btn"
          title="Zoom Out"
        >
          <ZoomOut className="zoom-icon" />
        </button>
        <button
          onClick={() => {
            setZoom(getInitialZoom());
            camTargetRef.current.set(0, 0.4, 0);
          }}
          className="zoom-btn"
          title="Reset Camera View"
        >
          <Maximize2 className="zoom-icon" />
        </button>
      </div>
      {}
      {characterState.speechText && (
        <SpeechBubble
          text={characterState.speechText}
          emoji={characterState.speechEmoji}
          screenX={bubblePos.x}
          screenY={bubblePos.y}
          speechId={characterState.speechId}
        />
      )}
      {}
      {overlay === 'win' && (
        <div className="game-toast win">
          <Trophy className="game-toast-icon" />
          <div className="game-toast-body">
            <span className="game-toast-title">You Win! 🎉</span>
            <span className="game-toast-sub">Reached the finish-line flag!</span>
          </div>
          <div className="game-toast-sub mt-2" style={{ color: '#f59e0b' }}>
            {winstreak > 1 ? `🔥 Win Streak: ${winstreak}!` : 'Restarting...'}
          </div>
        </div>
      )}
      {}
      {overlay === 'gameover' && (
        <div className="game-toast lose">
          <Skull className="game-toast-icon" />
          <div className="game-toast-body">
            <span className="game-toast-title">Game Over 😭</span>
            <span className="game-toast-sub">You fell into a trap... so sad! 💔</span>
          </div>
          <div className="game-toast-sub mt-2" style={{ color: '#f43f5e' }}>
            {winstreak > 0 ? 'Oh no, you lost your streak! 😢' : 'Restarting...'}
          </div>
        </div>
      )}
    </div>
  );
};
