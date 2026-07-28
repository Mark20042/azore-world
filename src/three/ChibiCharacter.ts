import * as THREE from 'three';
export interface ChibiCharacter {
  group: THREE.Group;
  update: (elapsed: number, moving: boolean) => void;
  setCelebrating: (celebrating: boolean) => void;
}
const SKIN = 0xffd9b3;
const HAIR = 0x111111;      
const SUIT = 0x10b981;      
const SUIT_DARK = 0x059669; 
const SHIRT = 0xffffff;
const TIE = 0xdc2626;       
const PANTS = 0x059669;     
const SHOES = 0x111111;     
function lambert(color: number): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color });
}
function mesh(
  geometry: THREE.BufferGeometry,
  color: number,
  x = 0,
  y = 0,
  z = 0
): THREE.Mesh {
  const m = new THREE.Mesh(geometry, lambert(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}
export function createChibiBoy(): ChibiCharacter {
  const group = new THREE.Group();
  const head = mesh(new THREE.SphereGeometry(0.24, 24, 20), SKIN, 0, 0.54, 0);
  group.add(head);
  const hair = mesh(new THREE.SphereGeometry(0.265, 24, 20), HAIR, 0, 0.63, -0.04);
  hair.scale.set(1, 0.85, 1);
  group.add(hair);
  const fringe = mesh(new THREE.SphereGeometry(0.13, 16, 12), HAIR, 0, 0.66, 0.15);
  fringe.scale.set(1.35, 0.55, 0.8);
  group.add(fringe);
  const eyeGeo = new THREE.SphereGeometry(0.033, 10, 10);
  group.add(mesh(eyeGeo, 0x1e293b, -0.088, 0.55, 0.205));
  group.add(mesh(eyeGeo, 0x1e293b, 0.088, 0.55, 0.205));
  const blushGeo = new THREE.SphereGeometry(0.032, 8, 8);
  const blushL = mesh(blushGeo, 0xffa8a8, -0.155, 0.50, 0.175);
  blushL.scale.set(1, 0.6, 0.5);
  const blushR = blushL.clone();
  blushR.position.x = 0.155;
  group.add(blushL, blushR);
  const smile = mesh(new THREE.TorusGeometry(0.05, 0.013, 8, 16, Math.PI), 0x9f1239, 0, 0.475, 0.215);
  smile.rotation.x = Math.PI; 
  group.add(smile);
  const body = mesh(new THREE.BoxGeometry(0.34, 0.27, 0.24), SUIT, 0, 0.315, 0);
  group.add(body);
  const shirt = mesh(new THREE.BoxGeometry(0.14, 0.20, 0.02), SHIRT, 0, 0.33, 0.125);
  group.add(shirt);
  const tie = mesh(new THREE.BoxGeometry(0.055, 0.15, 0.022), TIE, 0, 0.315, 0.135);
  group.add(tie);
  const lapelGeo = new THREE.BoxGeometry(0.05, 0.09, 0.02);
  const lapelL = mesh(lapelGeo, SUIT_DARK, -0.055, 0.41, 0.125);
  lapelL.rotation.z = 0.5;
  const lapelR = mesh(lapelGeo, SUIT_DARK, 0.055, 0.41, 0.125);
  lapelR.rotation.z = -0.5;
  group.add(lapelL, lapelR);
  const makeArm = (side: 1 | -1) => {
    const arm = new THREE.Group();
    arm.position.set(0.205 * side, 0.43, 0);
    const sleeve = mesh(new THREE.CapsuleGeometry(0.05, 0.16, 6, 12), SUIT, 0, -0.11, 0);
    const hand = mesh(new THREE.SphereGeometry(0.05, 10, 10), SKIN, 0, -0.235, 0);
    arm.add(sleeve, hand);
    return arm;
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);
  group.add(armL, armR);
  const makeLeg = (side: 1 | -1) => {
    const leg = new THREE.Group();
    leg.position.set(0.085 * side, 0.19, 0);
    const pants = mesh(new THREE.CapsuleGeometry(0.055, 0.11, 6, 12), PANTS, 0, -0.085, 0);
    const shoe = mesh(new THREE.BoxGeometry(0.105, 0.06, 0.17), SHOES, 0, -0.16, 0.035);
    leg.add(pants, shoe);
    return leg;
  };
  const legL = makeLeg(-1);
  const legR = makeLeg(1);
  group.add(legL, legR);
  let celebrating = false;
  const update = (elapsed: number, moving: boolean) => {
    if (celebrating) {
      armL.rotation.z = THREE.MathUtils.lerp(armL.rotation.z, 2.6, 0.2);
      armR.rotation.z = THREE.MathUtils.lerp(armR.rotation.z, -2.6, 0.2);
      armL.rotation.x = 0;
      armR.rotation.x = 0;
      legL.rotation.x = 0;
      legR.rotation.x = 0;
      return;
    }
    armL.rotation.z = 0.12;
    armR.rotation.z = -0.12;
    if (moving) {
      const swing = Math.sin(elapsed * 11) * 0.75;
      legL.rotation.x = swing;
      legR.rotation.x = -swing;
      armL.rotation.x = -swing * 0.8;
      armR.rotation.x = swing * 0.8;
    } else {
      const breathe = Math.sin(elapsed * 2.2) * 0.05;
      legL.rotation.x = 0;
      legR.rotation.x = 0;
      armL.rotation.x = breathe;
      armR.rotation.x = -breathe;
    }
  };
  const setCelebrating = (value: boolean) => {
    celebrating = value;
    if (!value) {
      armL.rotation.set(0, 0, 0.12);
      armR.rotation.set(0, 0, -0.12);
    }
  };
  return { group, update, setCelebrating };
}
