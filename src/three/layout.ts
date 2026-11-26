import { SECTORS, SECTOR_W, WORKERS_PER_SECTOR } from '../sim/constants';

export type V3 = [number, number, number];

// Insufladores: montados entre a UTA externa e a parede longa, eixo horizontal
export const supplyFanPos = (sector: number, idx: number): V3 => {
  const d = SECTORS[sector];
  return [d.cx + (idx === 0 ? -7 : 7), 3.6, d.wallSide * 51.2];
};
// Exaustores: na cobertura, afastados da insuflação
export const exhaustFanPos = (sector: number, idx: number): V3 => {
  const d = SECTORS[sector];
  return [d.cx + (idx === 0 ? -16 : 16), 6.9, d.cz - d.wallSide * 14];
};
export const ahuPos = (sector: number): V3 => {
  const d = SECTORS[sector];
  return [d.cx, 1.9, d.wallSide * 55];
};
export const chillerPos = (i: number): V3 => [-118, 0, -27 + i * 14];
export const pumpPos = (i: number): V3 => [-108, 0, 34 + i * 4];
export const panelPos: V3 = [-96, 0, 44];
export const rioPos = (sector: number): V3 => {
  const d = SECTORS[sector];
  return [d.cx + 12, 0, d.wallSide * 48.6];
};

/** Posições das máquinas por setor. */
export const machinePositions = (sector: number): V3[] => {
  const d = SECTORS[sector];
  const n = d.machines;
  const out: V3[] = [];
  const cols = n === 4 ? 2 : 3;
  for (let k = 0; k < n; k++) {
    const c = k % cols;
    const r = Math.floor(k / cols);
    const spanX = SECTOR_W - 24;
    const x = d.cx - spanX / 2 + (c * spanX) / (cols - 1);
    const z = d.cz + (n === 4 ? (r === 0 ? -9 : 9) : 7 * -d.wallSide);
    out.push([x, 0, z]);
  }
  return out;
};

// Pseudo-aleatório determinístico (apenas posicionamento visual)
export const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const workerPositions = (sector: number): V3[] => {
  const ms = machinePositions(sector);
  const out: V3[] = [];
  for (let k = 0; k < WORKERS_PER_SECTOR[sector]; k++) {
    const m = ms[k % ms.length];
    const a = hash(sector * 31 + k) * Math.PI * 2;
    const r = 3.4 + hash(sector * 17 + k * 3) * 2;
    out.push([m[0] + Math.cos(a) * r, 0, m[2] + Math.sin(a) * r]);
  }
  return out;
};

export const evacPoint = (sector: number): V3 => {
  const d = SECTORS[sector];
  return [d.cx + 24, 0, d.wallSide * 62];
};

export const sensorPos = (sector: number): V3 => {
  const d = SECTORS[sector];
  return [Math.round(d.cx / 20) * 20, 2.6, d.cz + 0.35];
};
