// Premissas acadêmicas do projeto AERIS CONTROL.
// Todos os valores são didáticos e sujeitos a validação por projeto executivo.

export const BUILDING = {
  length: 200, // m (eixo X)
  width: 100, // m (eixo Z)
  height: 6, // m
  area: 200 * 100, // m²
  volume: 200 * 100 * 6, // m³
  workers: 30,
  machines: 20,
  machinePowerKW: 10,
  machinesTotalKW: 200,
  sectors: 6,
  tExtInitial: 32,
  tSetpoint: 24,
  rhSetpoint: 55,
  ach: 6, // renovações por hora (hipótese acadêmica)
};

export const VENT = {
  nominalFlowTotal: BUILDING.volume * BUILDING.ach, // 720.000 m³/h
  fanFlow: 60000, // m³/h por ventilador (hipótese acadêmica)
  supplyFans: 12,
  exhaustFans: 12,
  motors: 24,
  vfds: 24,
  motorKW: 15, // potência nominal estimada por motor
  fNom: 60, // Hz
  fMin: 20, // Hz — mínimo de ventilação essencial (≈ 2 renovações/h)
};

export const COOLING = {
  chillers: 4,
  chillerKW: 1550, // kW térmicos (TR ≈ 441)
  installedKW: 6200,
  ahus: 6,
  pumps: 3,
  pumpsDuty: 2,
  valves: 6,
  chwSupply: 7,
  chwReturn: 12,
  chillerCOP: 5.2, // para estimar consumo elétrico (não confundir com capacidade)
};

export const ELECTRIC = {
  power: '380 Vca — 3F — 60 Hz (L1, L2, L3 + PE, sem neutro)',
  control: '24 Vcc',
};

export interface SectorDef {
  id: number;
  code: string;
  name: string;
  machines: number;
  machineType: 'cnc' | 'press' | 'robot' | 'assembly' | 'booth' | 'packer';
  // centro do setor (m), sistema da maquete: X -100..100, Z -50..50
  cx: number;
  cz: number;
  wallSide: -1 | 1; // parede longa onde fica a UTA (z = ±50)
}

const SW = 200 / 3;
export const SECTORS: SectorDef[] = [
  { id: 0, code: 'S1', name: 'Usinagem CNC', machines: 4, machineType: 'cnc', cx: -SW, cz: -25, wallSide: -1 },
  { id: 1, code: 'S2', name: 'Estamparia', machines: 4, machineType: 'press', cx: 0, cz: -25, wallSide: -1 },
  { id: 2, code: 'S3', name: 'Soldagem Robotizada', machines: 3, machineType: 'robot', cx: SW, cz: -25, wallSide: -1 },
  { id: 3, code: 'S4', name: 'Montagem', machines: 3, machineType: 'assembly', cx: -SW, cz: 25, wallSide: 1 },
  { id: 4, code: 'S5', name: 'Tratamento Superficial', machines: 3, machineType: 'booth', cx: 0, cz: 25, wallSide: 1 },
  { id: 5, code: 'S6', name: 'Embalagem e Expedição', machines: 3, machineType: 'packer', cx: SW, cz: 25, wallSide: 1 },
];

export const SECTOR_W = SW;
export const SECTOR_D = 50;
export const SECTOR_VOLUME = BUILDING.volume / 6; // 20.000 m³

// Trabalhadores por setor (total 30)
export const WORKERS_PER_SECTOR = [6, 5, 4, 6, 4, 5];
