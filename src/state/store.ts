import { create } from 'zustand';
import { createInitialState, step, pushLog, type SimState, type Mode } from '../sim/model';
import { applyScenario } from '../sim/scenarios';

/** Estado de simulação mutável (fonte única compartilhada por todas as telas e pela cena 3D). */
export const sim: SimState = createInitialState();
// Pré-aquecimento: 20 min simulados para preencher o histórico das tendências
for (let i = 0; i < 1200; i++) step(sim, 1);
sim.log.length = 0;

export type Selection = { kind: 'fan' | 'chiller' | 'pump' | 'sector' | 'machine' | 'panel' | 'ahu' | 'sensor'; id: string } | null;

interface UIState {
  v: number; // versão (re-render)
  page: string;
  selected: Selection;
  roofVisible: boolean;
  wallsVisible: boolean;
  airflow: boolean;
  labels: boolean;
  camView: { name: string; n: number };
  presentation: boolean;
  lastScenario: string | null;
  setPage: (p: string) => void;
  select: (s: Selection) => void;
  toggle: (k: 'roofVisible' | 'airflow' | 'labels' | 'wallsVisible') => void;
  setView: (name: string) => void;
  setPresentation: (b: boolean) => void;
  scenario: (id: string) => void;
  bump: () => void;
}

const pageFromHash = () => (location.hash.replace(/^#\/?/, '') || 'overview').split('?')[0];

export const useUI = create<UIState>((set, get) => ({
  v: 0,
  page: pageFromHash(),
  selected: null,
  roofVisible: false,
  wallsVisible: true,
  airflow: true,
  labels: true,
  camView: { name: 'iso', n: 0 },
  presentation: false,
  lastScenario: null,
  setPage: (p) => {
    if (location.hash !== '#/' + p) location.hash = '/' + p;
    set({ page: p });
  },
  select: (s) => set({ selected: s }),
  toggle: (k) => set({ [k]: !get()[k] } as Partial<UIState>),
  setView: (name) => set({ camView: { name, n: get().camView.n + 1 } }),
  setPresentation: (b) => set({ presentation: b }),
  scenario: (id) => {
    applyScenario(sim, id);
    set({ lastScenario: id, v: get().v + 1 });
  },
  bump: () => set({ v: get().v + 1 }),
}));

window.addEventListener('hashchange', () => useUI.setState({ page: pageFromHash() }));

/** Hook: re-renderiza o componente a cada atualização da simulação. */
export const useSim = () => {
  useUI((s) => s.v);
  return sim;
};

export const simActions = {
  setRunning(b: boolean) {
    sim.running = b;
    pushLog(sim, { t: sim.t, id: 'RUN', sev: 'info', tag: 'SIM', msg: b ? 'Simulação retomada' : 'Simulação pausada', event: 'EVENTO' });
    useUI.getState().bump();
  },
  setSpeed(x: number) {
    sim.speed = x;
    useUI.getState().bump();
  },
  setMode(m: Mode) {
    if (m === 'manual') {
      sim.sectors.forEach((x, i) => {
        x.manualHz = Math.round(sim.fans.filter((f) => f.sector === i && f.kind === 'SUP').reduce((a, f) => Math.max(a, f.cmdHz), 20));
        x.manualValve = Math.round(x.valve);
      });
      sim.pumps.forEach((p) => (p.manualOn = p.run));
    }
    sim.mode = m;
    pushLog(sim, { t: sim.t, id: 'MODE', sev: 'info', tag: 'CLP', msg: `Modo ${m === 'auto' ? 'AUTOMÁTICO' : 'MANUAL'} selecionado`, event: 'EVENTO' });
    useUI.getState().bump();
  },
  ackAll() {
    Object.values(sim.alarms).forEach((a) => {
      if (!a.ack) {
        a.ack = true;
        pushLog(sim, { t: sim.t, id: a.id, sev: a.sev, tag: a.tag, msg: a.msg, event: 'RECONHECIDO' });
      }
    });
    useUI.getState().bump();
  },
  ack(id: string) {
    const a = sim.alarms[id];
    if (a && !a.ack) {
      a.ack = true;
      pushLog(sim, { t: sim.t, id: a.id, sev: a.sev, tag: a.tag, msg: a.msg, event: 'RECONHECIDO' });
    }
    useUI.getState().bump();
  },
  update(fn: (s: SimState) => void) {
    fn(sim);
    useUI.getState().bump();
  },
};

// Laço de simulação: 1 passo = 1 s simulado; velocidade multiplica os passos.
let acc = 0;
let last = performance.now();
let uiAcc = 0;
setInterval(() => {
  const now = performance.now();
  const dtReal = Math.min(0.5, (now - last) / 1000);
  last = now;
  if (sim.running) {
    acc += dtReal * sim.speed;
    let n = 0;
    while (acc >= 1 && n < 400) {
      step(sim, 1);
      acc -= 1;
      n++;
    }
    if (n >= 400) acc = 0;
  }
  uiAcc += dtReal;
  if (uiAcc >= 0.25) {
    uiAcc = 0;
    useUI.getState().bump();
  }
}, 50);
