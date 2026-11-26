/*
 * AERIS CONTROL — Motor de simulação (modelo térmico simplificado, documentado).
 *
 * Passo de integração: dt = 1 s de tempo simulado (Euler explícito).
 * Cada setor (20.000 m³) é um volume de controle com mistura perfeita:
 *
 *   C · dT/dt = Q_int + UA·(T_ext − T) + Q_sol − ṁ_ins·cp·(T − T_ins) + ṁ_inf·cp·(T_ext − T)
 *
 *   C      capacitância térmica efetiva (ar + estrutura + equipamentos)
 *   Q_int  máquinas (10 kW cada × fator de carga) + pessoas + iluminação
 *   UA     envoltória termoacústica (cobertura + paredes)
 *   T_ins  temperatura do ar insuflado após a serpentina da UTA (água gelada)
 *
 * Umidade: balanço de razão de umidade (kg/kg) com psicrometria de Magnus-Tetens.
 * CO₂ e gás: diluição por vazão de renovação (ppm e %LIE).
 * Toda lógica de controle é determinística (sem números aleatórios).
 */
import { BUILDING, COOLING, SECTORS, SECTOR_VOLUME, VENT, WORKERS_PER_SECTOR } from './constants';

export type Severity = 'crit' | 'warn' | 'info';
export type Mode = 'auto' | 'manual';

export interface Fan {
  id: string;
  kind: 'SUP' | 'EXH';
  sector: number;
  idx: number;
  cmdHz: number; // referência do CLP ao inversor
  hz: number; // frequência real
  fault: boolean;
  run: boolean; // retorno de funcionamento (inversor)
  flowOk: boolean; // fluxostato de ar
  kw: number;
}

export interface Sector {
  T: number;
  w: number; // razão de umidade kg/kg
  rh: number;
  co2: number;
  gas: number; // %LIE
  tSupply: number;
  supplyFlow: number; // m³/h
  exhaustFlow: number;
  dp: number; // Pa (positivo = pressurizado)
  qCoil: number; // kW entregues
  qReq: number; // kW solicitados
  qInt: number; // kW internos
  valve: number; // % abertura
  iFan: number;
  iValve: number;
  processOn: boolean;
  gasIsolated: boolean;
  sensorFault: boolean;
  tMeas: number | null; // leitura do sensor (null = falha)
  loadFactor: number;
  manualHz: number;
  manualValve: number;
}

export interface Chiller {
  id: string;
  on: boolean;
  starting: number; // s restantes de partida
  fault: boolean;
  load: number; // 0..1
  kwTh: number;
  kwEl: number;
  manualOn: boolean;
}

export interface Pump {
  id: string;
  role: 'duty' | 'standby';
  run: boolean;
  fault: boolean;
  manualOn: boolean;
}

export interface AlarmDef {
  id: string;
  sev: Severity;
  tag: string;
  msg: string;
  cause: string;
  consequence: string;
  action: string;
}

export interface ActiveAlarm extends AlarmDef {
  since: number;
  ack: boolean;
}

export interface LogEntry {
  t: number;
  id: string;
  sev: Severity;
  tag: string;
  msg: string;
  event: 'ATIVO' | 'NORMALIZADO' | 'RECONHECIDO' | 'EVENTO';
}

export interface HistPoint {
  t: number;
  tExt: number;
  tAvg: number;
  rhAvg: number;
  supply: number;
  exhaust: number;
  qCool: number;
  capCool: number;
  hzAvg: number;
  co2Max: number;
  gasMax: number;
  [k: string]: number;
}

export interface SimState {
  t: number;
  running: boolean;
  speed: number;
  mode: Mode;
  tExt: number;
  tExtTarget: number;
  rhExt: number;
  mains: boolean;
  restoreAt: number | null;
  cmd24: boolean; // barramento 24 Vcc
  ups: number; // % carga do módulo buffer
  plcRun: boolean;
  sectors: Sector[];
  fans: Fan[];
  chillers: Chiller[];
  pumps: Pump[];
  chwSupply: number;
  chwReturn: number;
  chwFlowFrac: number;
  capAvail: number;
  qCoolTotal: number;
  elecKW: number;
  fanKW: number;
  alarms: Record<string, ActiveAlarm>;
  log: LogEntry[];
  hist: HistPoint[];
  lastHist: number;
  scenario: string;
  stagesNeeded: number;
  standbyTimer: number;
}

// ---------- Psicrometria (Magnus-Tetens, P = 101,325 kPa) ----------
const P_ATM = 101325;
export const pws = (T: number) => 610.94 * Math.exp((17.625 * T) / (T + 243.04));
export const wFrom = (T: number, rh: number) => {
  const pw = (rh / 100) * pws(T);
  return (0.622 * pw) / (P_ATM - pw);
};
export const rhFrom = (T: number, w: number) => {
  const pw = (w * P_ATM) / (0.622 + w);
  return Math.min(100, (100 * pw) / pws(T));
};

// ---------- Parâmetros do modelo ----------
export const MODEL = {
  cp: 1.006, // kJ/kg·K
  rho: 1.2, // kg/m³
  hfg: 2450, // kJ/kg
  capFactor: 6, // massa térmica efetiva = 6 × massa de ar do setor
  UA: 2.5, // kW/K por setor (painéis termoacústicos U ≈ 0,45 W/m²K)
  solar: 45, // kW por setor (radiação + temperatura sol-ar na cobertura)
  personKW: 0.12, // sensível por pessoa
  lightingKW: 20, // ~6 W/m²
  coilMaxKW: 1150, // capacidade máxima de cada serpentina de UTA
  coilMinTsa: 11, // limite de temperatura de saída (água a 7 °C)
  ramp: 3, // Hz/s rampa de aceleração dos inversores
  coast: 2.5, // Hz/s desaceleração livre em falha
  co2Out: 420,
  co2ProcM3h: [6, 4, 10, 3, 12, 2], // emissão de CO₂ por processo (m³/h)
  moistKgS: [0.004, 0.003, 0.004, 0.003, 0.012, 0.003], // geração de vapor por setor
  gasLeak: 0.035, // %LIE/s durante vazamento
};

export const SECTOR_CAP = MODEL.rho * SECTOR_VOLUME * MODEL.cp * MODEL.capFactor; // kJ/K

export const fanFlow = (f: Fan) => (f.run ? (VENT.fanFlow * f.hz) / 60 : 0);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function createInitialState(): SimState {
  const tExt = BUILDING.tExtInitial;
  const rhExt = 45;
  const sectors: Sector[] = SECTORS.map((d) => ({
    T: 23.8,
    w: wFrom(23.8, 56),
    rh: 56,
    co2: 520,
    gas: 0,
    tSupply: 14.6,
    supplyFlow: 40000,
    exhaustFlow: 40000,
    dp: 0,
    qCoil: 350,
    qReq: 350,
    qInt: 0,
    valve: 75,
    iFan: -15,
    iValve: 34,
    processOn: true,
    gasIsolated: false,
    sensorFault: false,
    tMeas: 24.6,
    loadFactor: 1,
    manualHz: 45,
    manualValve: 60,
  }));
  const fans: Fan[] = [];
  SECTORS.forEach((d) => {
    (['SUP', 'EXH'] as const).forEach((kind) => {
      [0, 1].forEach((idx) => {
        fans.push({
          id: `${kind === 'SUP' ? 'INS' : 'EXA'}-${d.id + 1}${idx === 0 ? 'A' : 'B'}`,
          kind,
          sector: d.id,
          idx,
          cmdHz: 20,
          hz: 20,
          fault: false,
          run: true,
          flowOk: true,
          kw: 0,
        });
      });
    });
  });
  const chillers: Chiller[] = [0, 1, 2, 3].map((i) => ({
    id: `CH-0${i + 1}`,
    on: i < 2,
    starting: 0,
    fault: false,
    load: 0.68,
    kwTh: 0,
    kwEl: 0,
    manualOn: i < 2,
  }));
  const pumps: Pump[] = [
    { id: 'BAG-01', role: 'duty', run: true, fault: false, manualOn: true },
    { id: 'BAG-02', role: 'duty', run: true, fault: false, manualOn: true },
    { id: 'BAG-03', role: 'standby', run: false, fault: false, manualOn: false },
  ];
  return {
    t: 8 * 3600, // 08:00
    running: true,
    speed: 10,
    mode: 'auto',
    tExt,
    tExtTarget: tExt,
    rhExt,
    mains: true,
    restoreAt: null,
    cmd24: true,
    ups: 100,
    plcRun: true,
    sectors,
    fans,
    chillers,
    pumps,
    chwSupply: 7,
    chwReturn: 12,
    chwFlowFrac: 1,
    capAvail: 3100,
    qCoolTotal: 2100,
    elecKW: 0,
    fanKW: 0,
    alarms: {},
    log: [],
    hist: [],
    lastHist: 0,
    scenario: 'normal',
    stagesNeeded: 2,
    standbyTimer: 0,
  };
}

// ---------- Utilitários de leitura ----------
export const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
export const sectorFans = (s: SimState, sector: number, kind?: 'SUP' | 'EXH') =>
  s.fans.filter((f) => f.sector === sector && (!kind || f.kind === kind));

/** Temperatura usada pelo CLP: leitura do sensor ou valor substituto (média dos demais). */
export function plcTemp(s: SimState, i: number) {
  const sec = s.sectors[i];
  if (sec.tMeas !== null) return sec.tMeas;
  const others = s.sectors.filter((x, j) => j !== i && x.tMeas !== null).map((x) => x.tMeas as number);
  return others.length ? avg(others) : BUILDING.tSetpoint;
}

export function plcRh(s: SimState, i: number) {
  if (!s.sectors[i].sensorFault) return s.sectors[i].rh;
  const others = s.sectors.filter((x) => !x.sensorFault).map((x) => x.rh);
  return others.length ? avg(others) : BUILDING.rhSetpoint;
}

// ---------- Gás: sinalização e rearme ----------
export const GAS_L1 = 10;
export const GAS_L2 = 20;
export const GAS_REARM_MAX = 5;

/** Sinalizador SV do setor: alerta a partir do nível 1 e retido durante a evacuação (intertravamento nível 2). */
export const sirenOn = (s: SimState, i: number) => s.plcRun && (s.sectors[i].gas >= GAS_L1 || s.sectors[i].gasIsolated);

/** Fonte de vazamento do cenário 7 ainda ativa (antes da intervenção de manutenção). */
export const gasSourceActive = (s: SimState, i: number) => s.scenario === 'gas' && i === 4;

/** Condições para o rearme industrial do intertravamento de gás. */
export function gasRearmCheck(s: SimState, i: number) {
  const x = s.sectors[i];
  const reasons: string[] = [];
  if (!x.gasIsolated) reasons.push('Intertravamento não está atuado.');
  if (gasSourceActive(s, i)) reasons.push('Fonte de vazamento ainda ativa (eliminar a causa: cenário 1 representa a intervenção de manutenção).');
  if (x.gas >= GAS_REARM_MAX) reasons.push(`Gás em ${x.gas.toFixed(1)} %LIE (exigido < ${GAS_REARM_MAX} %LIE).`);
  if (!s.plcRun) reasons.push('CLP fora de RUN.');
  if (!s.mains) reasons.push('Sem alimentação 380 Vca.');
  return { ok: reasons.length === 0, reasons };
}

/** Rearme manual do intertravamento de gás: só é aceito se todas as condições forem atendidas. */
export function gasRearm(s: SimState, i: number) {
  const chk = gasRearmCheck(s, i);
  const x = s.sectors[i];
  if (chk.ok) {
    x.gasIsolated = false;
    x.processOn = true;
    pushLog(s, { t: s.t, id: `RRM-${i}`, sev: 'info', tag: `XV-${i + 1}`, msg: `S${i + 1}: rearme do intertravamento de gás aceito (${x.gas.toFixed(1)} %LIE)`, event: 'EVENTO' });
  } else {
    pushLog(s, { t: s.t, id: `RRM-${i}`, sev: 'warn', tag: `XV-${i + 1}`, msg: `S${i + 1}: rearme recusado — ${chk.reasons.join(' ')}`, event: 'EVENTO' });
  }
  return chk;
}

/** Solve coil leaving temperature for a delivered total load Q (kW). */
function coilLeaving(mDot: number, tIn: number, wIn: number, Q: number) {
  if (mDot < 0.1 || Q <= 0) return { tsa: tIn, wsa: wIn, qs: 0, ql: 0 };
  const total = (tsa: number) => {
    const wsa = Math.min(wIn, 0.95 * wFrom(tsa, 100));
    return { tsa, wsa, qs: mDot * MODEL.cp * (tIn - tsa), ql: mDot * MODEL.hfg * Math.max(0, wIn - wsa) };
  };
  let lo = MODEL.coilMinTsa,
    hi = tIn;
  const qMax = total(lo);
  if (qMax.qs + qMax.ql <= Q) return qMax;
  for (let k = 0; k < 18; k++) {
    const mid = (lo + hi) / 2;
    const r = total(mid);
    if (r.qs + r.ql > Q) lo = mid;
    else hi = mid;
  }
  return total((lo + hi) / 2);
}

/** Máxima carga que a serpentina consegue retirar com a vazão de ar atual. */
function coilCapacity(mDot: number, tIn: number, wIn: number) {
  const r = coilLeaving(mDot, tIn, wIn, 1e9);
  return Math.min(MODEL.coilMaxKW, r.qs + r.ql);
}

// ---------- Passo de simulação (1 s) ----------
export function step(s: SimState, dt = 1) {
  s.t += dt;
  const SP = BUILDING.tSetpoint;

  // 1. Ambiente externo: variação progressiva até o alvo (0,02 °C/s)
  const dTe = s.tExtTarget - s.tExt;
  s.tExt += clamp(dTe, -0.02 * dt, 0.02 * dt);
  const wExt = wFrom(s.tExt, s.rhExt);

  // 2. Alimentação: 380 Vca e 24 Vcc (fonte com módulo buffer/bateria)
  if (!s.mains) {
    s.ups = Math.max(0, s.ups - (100 / 3600) * dt); // autonomia ~60 min (hipótese acadêmica, sem dimensionamento em Ah)
    s.cmd24 = s.ups > 0;
  } else {
    s.ups = Math.min(100, s.ups + (100 / 1800) * dt);
    s.cmd24 = true;
  }
  s.plcRun = s.cmd24;
  const since = s.restoreAt === null ? 1e9 : s.t - s.restoreAt;
  // Religamento escalonado após retorno da energia
  const fanPermit = (f: Fan) => s.mains && since >= 10 + (f.sector * 4 + (f.kind === 'EXH' ? 2 : 0) + f.idx);
  const pumpPermit = s.mains && since >= 40;
  const chillerPermit = (i: number) => s.mains && since >= 70 + i * 20;
  if (s.restoreAt !== null && since > 200) s.restoreAt = null;

  // 3. Instrumentação (leitura dos sensores)
  s.sectors.forEach((sec) => {
    sec.tMeas = sec.sensorFault ? null : sec.T;
  });

  // 4. Lógica do CLP
  const plc = s.plcRun;
  s.sectors.forEach((sec, i) => {
    const tPlc = plcTemp(s, i);
    const err = tPlc - SP;
    const gasL1 = sec.gas >= GAS_L1;
    const gasL2 = sec.gas >= GAS_L2;
    // Intertravamento NR: gás nível 2 → parada do processo, fechamento da válvula de isolamento
    if (gasL2 && plc) {
      sec.processOn = false;
      sec.gasIsolated = true;
    }
    let hz: number;
    if (s.mode === 'auto') {
      // Malha 1 (PI): frequência dos ventiladores controla a temperatura do setor
      if (s.mains) sec.iFan = clamp(sec.iFan + 0.04 * err * dt, -15, 35);
      hz = 30 + 8 * err + sec.iFan + Math.max(0, (sec.co2 - 800) / 25);
      // Malha 2 (PI): válvula de água gelada controla a umidade (desumidificação)
      // e reforça a temperatura quando a ventilação satura
      const eRh = (plcRh(s, i) - BUILDING.rhSetpoint) / 5;
      const e2 = Math.min(Math.max(eRh, err - 0.5), err + 0.4); // prioridade à temperatura se houver sobre-resfriamento
      if (s.mains) sec.iValve = clamp(sec.iValve + 0.04 * e2 * dt, -20, 100);
      sec.valve = clamp(40 + 15 * e2 + sec.iValve, 0, 100);
    } else {
      hz = sec.manualHz;
      sec.valve = sec.manualValve;
    }
    hz = clamp(hz, VENT.fMin, VENT.fNom);
    // Intertravamento de segurança (ativo em AUTO e MANUAL): gás → purga máxima
    if (gasL1 || gasL2) hz = 60;
    // Compensação por falha (AUTO): ventilador parceiro em 60 Hz
    (['SUP', 'EXH'] as const).forEach((kind) => {
      const pair = sectorFans(s, i, kind);
      const anyFault = pair.some((f) => f.fault);
      pair.forEach((f) => {
        f.cmdHz = s.mode === 'auto' && anyFault ? 60 : hz;
      });
    });
    if (!plc) sec.valve = 0;
  });

  // Bombas de água gelada: 2 em operação + 1 reserva com comutação automática
  const anyChillerWanted = s.chillers.some((c) => c.on || c.starting > 0);
  if (s.mode === 'auto') {
    const dutyOk = s.pumps.filter((p) => p.role === 'duty' && !p.fault).length;
    if (dutyOk < 2) s.standbyTimer += dt;
    else s.standbyTimer = 0;
    s.pumps.forEach((p) => {
      const want = p.role === 'duty' ? true : s.standbyTimer >= 5;
      p.run = want && !p.fault && pumpPermit && plc;
    });
  } else {
    s.pumps.forEach((p) => (p.run = p.manualOn && !p.fault && pumpPermit && plc));
  }
  const nPumps = s.pumps.filter((p) => p.run).length;
  s.chwFlowFrac = nPumps >= 2 ? 1 : nPumps === 1 ? 0.6 : 0;
  void anyChillerWanted;

  // 5. Ventiladores (rampa dos inversores)
  let fanKW = 0;
  s.fans.forEach((f) => {
    const permit = fanPermit(f) && plc && !f.fault;
    const target = permit ? f.cmdHz : 0;
    const rate = f.fault || !s.mains ? MODEL.coast : MODEL.ramp;
    f.hz += clamp(target - f.hz, -rate * dt, rate * dt);
    if (f.hz < 0.05) f.hz = 0;
    f.run = f.hz > 0.5;
    f.flowOk = f.hz > 18;
    f.kw = f.run ? (VENT.motorKW * Math.pow(f.hz / 60, 3)) / 0.92 : 0;
    fanKW += f.kw;
  });
  s.fanKW = fanKW;

  // 6. Demanda das serpentinas e capacidade da central de água gelada
  const reqs = s.sectors.map((sec, i) => {
    const sup = sectorFans(s, i, 'SUP').reduce((a, f) => a + fanFlow(f), 0);
    const mDot = (sup / 3600) * MODEL.rho;
    const cap = coilCapacity(mDot, s.tExt, wExt);
    sec.qReq = (sec.valve / 100) * cap;
    return { sup, mDot };
  });
  const totalReq = s.sectors.reduce((a, x) => a + x.qReq, 0);

  // Escalonamento dos chillers (com histerese)
  if (s.mode === 'auto') {
    const perStage = COOLING.chillerKW * 0.9;
    const running = s.chillers.filter((c) => c.on && !c.fault).length;
    let need = Math.max(1, Math.ceil(totalReq / perStage));
    if (need < running && totalReq > (running - 1) * perStage * 0.85) need = running;
    s.stagesNeeded = Math.min(4, need);
    let assigned = 0;
    s.chillers.forEach((c) => {
      const wantOn = !c.fault && assigned < s.stagesNeeded;
      if (wantOn) assigned++;
      c.manualOn = wantOn;
    });
  }
  s.chillers.forEach((c, i) => {
    const want = c.manualOn && !c.fault && chillerPermit(i) && plc && s.chwFlowFrac > 0;
    if (want && !c.on && c.starting <= 0) c.starting = 30;
    if (!want) {
      c.on = false;
      c.starting = 0;
    }
    if (c.starting > 0) {
      c.starting -= dt;
      if (c.starting <= 0) {
        c.starting = 0;
        c.on = want;
      }
    }
  });
  const chOn = s.chillers.filter((c) => c.on);
  const capPlant = chOn.length * COOLING.chillerKW * s.chwFlowFrac;
  s.capAvail = capPlant;
  const ratio = totalReq > 0 ? Math.min(1, capPlant / totalReq) : 0;
  let qTotal = 0;

  // 7. Balanço térmico, umidade, CO₂ e gás por setor
  s.sectors.forEach((sec, i) => {
    const def = SECTORS[i];
    const { sup, mDot } = reqs[i];
    const exh = sectorFans(s, i, 'EXH').reduce((a, f) => a + fanFlow(f), 0);
    sec.supplyFlow = sup;
    sec.exhaustFlow = exh;
    const q = sec.qReq * ratio;
    const coil = coilLeaving(mDot, s.tExt, wExt, q);
    sec.qCoil = coil.qs + coil.ql;
    sec.tSupply = mDot > 0.1 ? coil.tsa : sec.T;
    qTotal += sec.qCoil;

    const machinesOn = sec.processOn && s.mains;
    const qMach = machinesOn ? def.machines * BUILDING.machinePowerKW * sec.loadFactor : 0;
    const qPeople = WORKERS_PER_SECTOR[i] * MODEL.personKW;
    const qLight = s.mains ? MODEL.lightingKW : 2;
    sec.qInt = qMach + qPeople + qLight;
    const mInf = (Math.max(0, exh - sup) / 3600) * MODEL.rho;
    const qVent = mDot * MODEL.cp * (sec.T - sec.tSupply);
    const qInf = mInf * MODEL.cp * (s.tExt - sec.T);
    const dT = (sec.qInt + MODEL.UA * (s.tExt - sec.T) + MODEL.solar + qInf - qVent) / SECTOR_CAP;
    sec.T += dT * dt;

    const mAir = MODEL.rho * SECTOR_VOLUME;
    const gen = (machinesOn ? MODEL.moistKgS[i] * sec.loadFactor : 0) + WORKERS_PER_SECTOR[i] * 0.00006;
    const dw = (mDot * (coil.wsa - sec.w) + mInf * (wExt - sec.w) + gen) / mAir;
    sec.w += dw * dt;
    sec.rh = rhFrom(sec.T, sec.w);

    const qAir = Math.max(sup, exh) / 3600; // m³/s de renovação efetiva
    const gCo2 = ((machinesOn ? MODEL.co2ProcM3h[i] : 0) + WORKERS_PER_SECTOR[i] * 0.02) / 3600;
    sec.co2 += ((qAir * (MODEL.co2Out - sec.co2)) / SECTOR_VOLUME + (gCo2 / SECTOR_VOLUME) * 1e6) * dt;

    const leak = gasSourceActive(s, i) && !sec.gasIsolated ? MODEL.gasLeak : 0;
    sec.gas = Math.max(0, sec.gas + (leak - (qAir / SECTOR_VOLUME) * sec.gas) * dt);
    if (sec.gas < 0.01) sec.gas = 0;

    sec.dp = ((sup - exh) / 120000) * 40; // Pa
  });
  s.qCoolTotal = qTotal;

  // Chillers: distribuição da carga
  const share = chOn.length ? qTotal / chOn.length : 0;
  let chEl = 0;
  s.chillers.forEach((c) => {
    if (c.on) {
      c.kwTh = share;
      c.load = share / COOLING.chillerKW;
      c.kwEl = share / COOLING.chillerCOP;
    } else {
      c.kwTh = 0;
      c.load = 0;
      c.kwEl = 0;
    }
    chEl += c.kwEl;
  });

  // Temperaturas da água gelada
  const overload = capPlant > 0 ? Math.max(0, totalReq - capPlant) / capPlant : 1;
  const targetSupply = chOn.length && s.chwFlowFrac > 0 ? 7 + Math.min(6, overload * 6) : s.chwReturn;
  s.chwSupply += clamp(targetSupply - s.chwSupply, -0.05 * dt, 0.05 * dt);
  const mW = 296 * s.chwFlowFrac;
  const targetReturn = mW > 0 ? s.chwSupply + qTotal / (mW * 4.186) : Math.max(s.chwSupply, 14);
  s.chwReturn += clamp(targetReturn - s.chwReturn, -0.05 * dt, 0.05 * dt);

  const pumpKW = nPumps * 37 * 0.85;
  const machKW = s.sectors.reduce((a, x, i) => a + (x.processOn && s.mains ? SECTORS[i].machines * 10 * x.loadFactor : 0), 0);
  s.elecKW = s.mains ? fanKW + chEl + pumpKW + machKW + 6 * MODEL.lightingKW : 0;

  evaluateAlarms(s);

  if (s.t - s.lastHist >= 15) {
    s.lastHist = s.t;
    const p: HistPoint = {
      t: s.t,
      tExt: s.tExt,
      tAvg: avg(s.sectors.map((x) => x.T)),
      rhAvg: avg(s.sectors.map((x) => x.rh)),
      supply: s.sectors.reduce((a, x) => a + x.supplyFlow, 0),
      exhaust: s.sectors.reduce((a, x) => a + x.exhaustFlow, 0),
      qCool: s.qCoolTotal,
      capCool: s.capAvail,
      hzAvg: avg(s.fans.map((f) => f.hz)),
      co2Max: Math.max(...s.sectors.map((x) => x.co2)),
      gasMax: Math.max(...s.sectors.map((x) => x.gas)),
    };
    s.sectors.forEach((x, i) => (p[`T${i + 1}`] = x.T));
    s.hist.push(p);
    if (s.hist.length > 240) s.hist.shift();
  }
}

// ---------- Alarmes ----------
function evaluateAlarms(s: SimState) {
  const want: AlarmDef[] = [];
  const add = (a: AlarmDef) => want.push(a);

  if (!s.mains)
    add({
      id: 'MAINS',
      sev: 'crit',
      tag: 'QGBT-380V',
      msg: 'Falta de alimentação 380 Vca (relé de monitoramento de fases)',
      cause: 'Perda da alimentação trifásica da concessionária/subestação.',
      consequence: 'Motores, inversores, chillers e bombas desligados. Temperatura e CO₂ sobem.',
      action: 'CLP mantido pelo módulo buffer 24 Vcc. Registrar evento, verificar subestação e religar de forma escalonada.',
    });
  if (s.mains && s.restoreAt !== null)
    add({
      id: 'RESTART',
      sev: 'info',
      tag: 'CLP',
      msg: 'Religamento escalonado em andamento',
      cause: 'Retorno da alimentação 380 Vca.',
      consequence: 'Partidas sequenciais evitam picos de corrente.',
      action: 'Aguardar a sequência: ventilação → bombas → chillers.',
    });
  if (!s.cmd24)
    add({
      id: 'CMD24',
      sev: 'crit',
      tag: 'FT-24V',
      msg: 'Perda do comando 24 Vcc — CLP parado',
      cause: 'Autonomia do módulo buffer esgotada.',
      consequence: 'Sem supervisão nem lógica de controle.',
      action: 'Restabelecer alimentação.',
    });
  else if (!s.mains)
    add({
      id: 'UPS',
      sev: 'warn',
      tag: 'FT-24V',
      msg: `Comando 24 Vcc em bateria — autonomia ${s.ups.toFixed(0)} %`,
      cause: 'Fonte 24 Vcc sem entrada 380 Vca.',
      consequence: 'CLP e sensores operando pelo módulo buffer.',
      action: 'Restabelecer a alimentação principal.',
    });

  s.fans.forEach((f) => {
    if (f.fault)
      add({
        id: `FAN-${f.id}`,
        sev: 'crit',
        tag: f.id,
        msg: `Falha ${f.kind === 'SUP' ? 'do insuflador' : 'do exaustor'} ${f.id} — inversor em falha / fluxostato sem vazão`,
        cause: 'Defeito do inversor IF-' + f.id + ' ou do motor (sobrecorrente / sobretemperatura).',
        consequence:
          f.kind === 'SUP'
            ? `Perda de um insuflador em S${f.sector + 1}. O parceiro a 60 Hz (60.000 m³/h) supera a exaustão em frequência mínima: setor levemente pressurizado e com mais ar resfriado.`
            : `Perda de um exaustor em S${f.sector + 1}. O parceiro a 60 Hz (60.000 m³/h) supera a insuflação em frequência mínima: setor em leve depressão, com infiltração de ar externo.`,
        action: 'CLP elevou o ventilador parceiro para 60 Hz. Bloquear e etiquetar (LOTO) antes da manutenção.',
      });
  });

  s.sectors.forEach((x, i) => {
    const c = `S${i + 1}`;
    if (x.sensorFault)
      add({
        id: `SNS-${i}`,
        sev: 'warn',
        tag: `TH-${i + 1}`,
        msg: `Falha do sensor de temperatura/umidade TH-${i + 1} (sinal < 3,8 mA)`,
        cause: 'Cabo rompido ou transmissor danificado.',
        consequence: 'Leitura inválida (BAD). Controle do setor usa valor substituto.',
        action: 'CLP adotou a média dos demais setores. Substituir o transmissor.',
      });
    if (x.T >= 30)
      add({ id: `TH-${i}`, sev: 'crit', tag: `TH-${i + 1}`, msg: `${c}: temperatura muito alta (${x.T.toFixed(1)} °C)`, cause: 'Carga térmica acima da capacidade disponível.', consequence: 'Desconforto térmico e risco à saúde (NR-15/NR-17).', action: 'Verificar chillers, UTA e ventilação. Avaliar pausa de processo.' });
    else if (x.T >= 27)
      add({ id: `TW-${i}`, sev: 'warn', tag: `TH-${i + 1}`, msg: `${c}: temperatura acima do limite (${x.T.toFixed(1)} °C)`, cause: 'Aumento da carga térmica ou perda de capacidade.', consequence: 'Afastamento do setpoint de 24 °C.', action: 'Modo automático aumenta vazão e abertura da válvula.' });
    if (x.rh >= 70)
      add({ id: `RH-${i}`, sev: 'warn', tag: `TH-${i + 1}`, msg: `${c}: umidade relativa alta (${x.rh.toFixed(0)} %)`, cause: 'Desumidificação insuficiente.', consequence: 'Condensação e desconforto.', action: 'Verificar água gelada e serpentina.' });
    if (x.co2 >= 1000)
      add({ id: `CO2-${i}`, sev: 'warn', tag: `AQ-${i + 1}`, msg: `${c}: CO₂ elevado (${x.co2.toFixed(0)} ppm)`, cause: 'Renovação de ar insuficiente.', consequence: 'Qualidade do ar interior reduzida.', action: 'Aumentar renovação de ar.' });
    if (x.gas >= 20)
      add({ id: `GAS2-${i}`, sev: 'crit', tag: `GD-${i + 1}`, msg: `${c}: GÁS PERIGOSO — nível 2 (${x.gas.toFixed(1)} %LIE) — EVACUAR`, cause: 'Vazamento de gás/vapor inflamável no processo.', consequence: 'Risco de explosão e intoxicação.', action: 'Processo parado (PM), válvula de gás fechada (XV), sirene de evacuação (SV), ventilação em purga máxima (não desligar ventilação). Evacuar e só reentrar com liberação formal.' });
    else if (x.gas >= 10)
      add({ id: `GAS1-${i}`, sev: 'warn', tag: `GD-${i + 1}`, msg: `${c}: gás detectado — nível 1 (${x.gas.toFixed(1)} %LIE)`, cause: 'Presença de gás/vapor inflamável.', consequence: 'Atmosfera em alerta.', action: 'Ventilação do setor em 60 Hz (purga) e sinalizador SV em alerta. Inspecionar a fonte.' });
    if (x.gasIsolated)
      add({ id: `ISO-${i}`, sev: 'info', tag: `XV-${i + 1}`, msg: `${c}: válvula de isolamento fechada e processo bloqueado — aguardando rearme`, cause: 'Intertravamento de gás nível 2 (retido).', consequence: 'Máquinas do setor sem permissivo; sinalização SV mantida.', action: 'Rearme manual na tela Alarmes. Exige fonte eliminada, gás < 5 %LIE, CLP em RUN e 380 Vca. O reset da demonstração (cenário 11) não equivale a rearme industrial.' });
    if (Math.abs(x.dp) > 12 && s.mains)
      add({ id: `DP-${i}`, sev: 'warn', tag: `PDT-${i + 1}`, msg: `${c}: desbalanço de pressão (${x.dp > 0 ? '+' : ''}${x.dp.toFixed(0)} Pa)`, cause: 'Diferença entre vazões de insuflação e exaustão.', consequence: x.dp > 0 ? 'Setor pressurizado: contaminantes migram para setores vizinhos.' : 'Setor em depressão: infiltração de ar externo quente.', action: 'Verificar ventiladores do setor.' });
  });

  s.chillers.forEach((c) => {
    if (c.fault)
      add({ id: `CH-${c.id}`, sev: 'crit', tag: c.id, msg: `Falha do chiller ${c.id} (alta pressão do compressor)`, cause: 'Proteção interna do chiller atuou.', consequence: 'Perda de 1.550 kW de capacidade.', action: 'CLP partiu o próximo chiller disponível. Acionar manutenção.' });
  });
  const reqTot = s.sectors.reduce((a, x) => a + x.qReq, 0);
  if (s.mains && reqTot > s.capAvail * 1.02 && reqTot > 200)
    add({ id: 'CAP', sev: 'warn', tag: 'CAG', msg: `Capacidade de refrigeração insuficiente (${(reqTot / 1000).toFixed(2)} MW solicitados / ${(s.capAvail / 1000).toFixed(2)} MW disponíveis)`, cause: 'Demanda maior que a capacidade em operação.', consequence: 'Temperatura da água gelada e dos setores sobe.', action: 'Verificar chillers e bombas disponíveis.' });
  s.pumps.forEach((p) => {
    if (p.fault)
      add({ id: `PMP-${p.id}`, sev: 'warn', tag: p.id, msg: `Falha da bomba ${p.id} (relé térmico)`, cause: 'Sobrecarga do motor da bomba.', consequence: 'Vazão de água gelada comprometida.', action: 'Bomba reserva BAG-03 comutada automaticamente.' });
  });
  if (s.pumps[2].run && s.pumps.some((p) => p.fault))
    add({ id: 'PMP-SB', sev: 'info', tag: 'BAG-03', msg: 'Bomba reserva BAG-03 em operação', cause: 'Comutação automática por falha.', consequence: 'Vazão restabelecida.', action: 'Programar reparo da bomba em falha.' });
  if (s.mode === 'manual')
    add({ id: 'MAN', sev: 'info', tag: 'CLP', msg: 'Sistema em modo MANUAL', cause: 'Seleção do operador.', consequence: 'Malhas de controle sem ação automática; intertravamentos de segurança permanecem ativos.', action: 'Retornar ao modo automático após a intervenção.' });

  const now = new Set(want.map((a) => a.id));
  want.forEach((a) => {
    const ex = s.alarms[a.id];
    if (!ex) {
      s.alarms[a.id] = { ...a, since: s.t, ack: false };
      pushLog(s, { t: s.t, id: a.id, sev: a.sev, tag: a.tag, msg: a.msg, event: 'ATIVO' });
    } else {
      ex.msg = a.msg;
    }
  });
  Object.keys(s.alarms).forEach((id) => {
    if (!now.has(id)) {
      const a = s.alarms[id];
      pushLog(s, { t: s.t, id, sev: a.sev, tag: a.tag, msg: a.msg, event: 'NORMALIZADO' });
      delete s.alarms[id];
    }
  });
}

export function pushLog(s: SimState, e: LogEntry) {
  s.log.unshift(e);
  if (s.log.length > 300) s.log.pop();
}

export const fmtTime = (t: number) => {
  const d = Math.floor(t / 86400);
  const h = Math.floor((t % 86400) / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = Math.floor(t % 60);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d > 0 ? `D+${d} ` : ''}${p(h)}:${p(m)}:${p(sec)}`;
};
