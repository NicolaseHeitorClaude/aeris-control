import { useEffect, useState, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Box, Fan, Zap, Cpu, BellRing, ListChecks, Minimize2, Play, Pause, RotateCcw, Presentation, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { sim, useSim, useUI, simActions } from './state/store';
import { fmtTime } from './sim/model';
import { SCENARIOS } from './sim/scenarios';
import { enterPresentation, exitPresentation, bindFullscreenSync } from './presentation';

const Overview = lazy(() => import('./pages/Overview'));
const PlantPage = lazy(() => import('./pages/PlantPage'));
const HVAC = lazy(() => import('./pages/HVAC'));
const Electrical = lazy(() => import('./pages/Electrical'));
const PLC = lazy(() => import('./pages/PLC'));
const Alarms = lazy(() => import('./pages/Alarms'));
const BOM = lazy(() => import('./pages/BOM'));

export const PAGES = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard, C: Overview },
  { id: 'plant', label: 'Planta industrial 3D', icon: Box, C: PlantPage },
  { id: 'hvac', label: 'Ventilação e refrigeração', icon: Fan, C: HVAC },
  { id: 'electrical', label: 'Sistema elétrico', icon: Zap, C: Electrical },
  { id: 'plc', label: 'CLP e sensores', icon: Cpu, C: PLC },
  { id: 'alarms', label: 'Alarmes', icon: BellRing, C: Alarms },
  { id: 'bom', label: 'Lista de materiais', icon: ListChecks, C: BOM },
];

function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2300);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <motion.div className="splash" exit={{ opacity: 0 }} transition={{ duration: 0.5 }} onClick={onDone}>
      <div className="inner">
        <motion.img
          src="./brand/aeris-symbol.png"
          alt="AERIS"
          style={{ height: 86 }}
          initial={{ opacity: 0, y: 14, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
        />
        <motion.img
          src="./brand/aeris-horizontal.png"
          alt="AERIS Automação Industrial"
          style={{ height: 54 }}
          initial={{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }}
          animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0)' }}
          transition={{ delay: 0.45, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        />
        <motion.div className="ver" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
          AERIS CONTROL · SUPERVISÓRIO DE VENTILAÇÃO E REFRIGERAÇÃO INDUSTRIAL
        </motion.div>
        <div className="line">
          <motion.i initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ delay: 0.3, duration: 1.8, ease: 'easeInOut' }} />
        </div>
      </div>
    </motion.div>
  );
}

function Sidebar() {
  useSim();
  const page = useUI((s) => s.page);
  const setPage = useUI((s) => s.setPage);
  const nAl = Object.values(sim.alarms).filter((a) => !a.ack && a.sev !== 'info').length;
  return (
    <nav className="side">
      <img className="sym" src="./brand/aeris-symbol.png" alt="AERIS" />
      {PAGES.map((p) => (
        <button key={p.id} className={'nav-btn' + (page === p.id ? ' active' : '')} onClick={() => setPage(p.id)} aria-label={p.label}>
          <p.icon size={19} strokeWidth={1.7} />
          {p.id === 'alarms' && nAl > 0 && <span className="badge">{nAl}</span>}
          <span className="tip">{p.label}</span>
        </button>
      ))}
      <div className="spacer" />
    </nav>
  );
}

function Header() {
  useSim();
  const page = useUI((s) => s.page);
  const pres = useUI((s) => s.presentation);
  const scenario = useUI((s) => s.scenario);
  const p = PAGES.find((x) => x.id === page);
  const crit = Object.values(sim.alarms).filter((a) => a.sev === 'crit').length;
  const warn = Object.values(sim.alarms).filter((a) => a.sev === 'warn').length;
  return (
    <header className="head">
      <div className="brand">
        <img src="./brand/aeris-horizontal.png" alt="AERIS Automação Industrial" />
        <div className="prod">
          AERIS <span>CONTROL</span>
        </div>
        <div className="page-t">/ {p?.label}</div>
      </div>
      <div className="grow" />
      <div className="chips">
        <div className="chip hide-s" title="Tempo simulado">
          {fmtTime(sim.t)}
        </div>
        <div className="chip hide-s" title="Circuito de força">
          <span className={'dot' + (sim.mains ? '' : ' off')} /> 380 Vca
        </div>
        <div className="chip hide-s" title="Circuito de comando">
          <span className={'dot' + (sim.cmd24 ? (sim.mains ? '' : ' warn') : ' off')} /> 24 Vcc
        </div>
        <div className="chip hide-s" title="Estado do CLP">
          <span className={'dot' + (sim.plcRun ? '' : ' off')} /> CLP {sim.plcRun ? 'RUN' : 'STOP'}
        </div>
        <div className="chip" title="Alarmes ativos">
          <span className={'dot' + (crit ? ' off' : warn ? ' warn' : '')} /> {crit} crít · {warn} adv
        </div>
        <div className="seg" title="Modo de operação">
          <button className={sim.mode === 'auto' ? 'on' : ''} onClick={() => simActions.setMode('auto')}>AUTO</button>
          <button className={sim.mode === 'manual' ? 'on' : ''} onClick={() => simActions.setMode('manual')}>MAN</button>
        </div>
        <button className="icon-btn" onClick={() => simActions.setRunning(!sim.running)} title={sim.running ? 'Pausar' : 'Retomar'}>
          {sim.running ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <div className="seg" title="Aceleração do tempo simulado">
          {[1, 10, 60, 240].map((x) => (
            <button key={x} className={sim.speed === x ? 'on' : ''} onClick={() => simActions.setSpeed(x)}>
              {x}×
            </button>
          ))}
        </div>
        <button className="icon-btn" onClick={() => scenario('reset')} title="Reset da demonstração (condições iniciais) — não equivale a rearme industrial">
          <RotateCcw size={14} />
        </button>
        <button
          className={'icon-btn' + (pres ? ' on' : '')}
          onClick={() => (pres ? exitPresentation() : enterPresentation())}
          title="Modo apresentação (tela cheia)"
          aria-label="Modo apresentação"
        >
          <Presentation size={14} />
        </button>
      </div>
    </header>
  );
}

const PRES_STEPS = ['overview', 'plant', 'hvac', 'electrical', 'plc', 'alarms', 'bom'];
const PRES_SHORT: Record<string, string> = {
  overview: 'Visão geral',
  plant: 'Planta 3D',
  hvac: 'Ventilação',
  electrical: 'Elétrico',
  plc: 'CLP',
  alarms: 'Alarmes',
  bom: 'Materiais',
};

/** Teclado no modo apresentação: setas navegam, ESC sai, 1–9/0 disparam cenários. */
function usePresentationKeys(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const ui = useUI.getState();
      const idx = Math.max(0, PRES_STEPS.indexOf(ui.page));
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        ui.setPage(PRES_STEPS[Math.min(PRES_STEPS.length - 1, idx + 1)]);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        ui.setPage(PRES_STEPS[Math.max(0, idx - 1)]);
      } else if (e.key === 'Escape') {
        exitPresentation();
      } else if (/^[0-9]$/.test(e.key)) {
        const n = +e.key;
        ui.scenario(n === 0 ? 'power' : SCENARIOS[n - 1].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);
}

function PresentationBar() {
  useSim();
  const page = useUI((s) => s.page);
  const setPage = useUI((s) => s.setPage);
  const scenario = useUI((s) => s.scenario);
  const last = useUI((s) => s.lastScenario);
  const fs = useUI((s) => s.presentationFs);
  const idx = Math.max(0, PRES_STEPS.indexOf(page));
  const crit = Object.values(sim.alarms).filter((a) => a.sev === 'crit').length;
  const warn = Object.values(sim.alarms).filter((a) => a.sev === 'warn').length;
  return (
    <motion.div
      className="pres-bar no-print"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <img src="./brand/aeris-symbol.png" alt="AERIS" className="pres-sym" />
      <button className="icon-btn" onClick={() => setPage(PRES_STEPS[Math.max(0, idx - 1)])} aria-label="Tela anterior" title="Tela anterior (←)">
        <ChevronLeft size={15} />
      </button>
      {PRES_STEPS.map((id, i) => (
        <button key={id} className={'step' + (page === id ? ' on' : '')} onClick={() => setPage(id)}>
          {i + 1}. {PRES_SHORT[id]}
        </button>
      ))}
      <button className="icon-btn" onClick={() => setPage(PRES_STEPS[Math.min(PRES_STEPS.length - 1, idx + 1)])} aria-label="Próxima tela" title="Próxima tela (→)">
        <ChevronRight size={15} />
      </button>
      <span className="sep" />
      {SCENARIOS.map((s) => (
        <button key={s.id} className={'step sc' + (last === s.id ? ' on' : '')} onClick={() => scenario(s.id)} title={`Cenário ${s.n}: ${s.title}`}>
          {s.n}
        </button>
      ))}
      <span className="sep" />
      <div className="chip" title="Tempo simulado">{fmtTime(sim.t)}</div>
      <div className="chip" title="Alarmes ativos">
        <span className={'dot' + (crit ? ' off' : warn ? ' warn' : '')} /> {crit}/{warn}
      </div>
      <div className="seg" title="Modo de operação">
        <button className={sim.mode === 'auto' ? 'on' : ''} onClick={() => simActions.setMode('auto')}>AUTO</button>
        <button className={sim.mode === 'manual' ? 'on' : ''} onClick={() => simActions.setMode('manual')}>MAN</button>
      </div>
      <button className="icon-btn" onClick={() => simActions.setRunning(!sim.running)} title={sim.running ? 'Pausar' : 'Retomar'} aria-label={sim.running ? 'Pausar' : 'Retomar'}>
        {sim.running ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <div className="seg" title="Aceleração do tempo simulado">
        {[1, 10, 60, 240].map((x) => (
          <button key={x} className={sim.speed === x ? 'on' : ''} onClick={() => simActions.setSpeed(x)}>
            {x}×
          </button>
        ))}
      </div>
      <span className="sep" />
      <button className="icon-btn pres-exit" onClick={exitPresentation} aria-label="Sair da apresentação" title={fs ? 'Sair da apresentação (ESC)' : 'Sair da apresentação (ESC) — tela cheia indisponível, modo janela'}>
        <Minimize2 size={14} />
      </button>
    </motion.div>
  );
}

export default function App() {
  const [splash, setSplash] = useState(true);
  const page = useUI((s) => s.page);
  const pres = useUI((s) => s.presentation);
  const setPage = useUI((s) => s.setPage);
  const known = PAGES.some((p) => p.id === page);
  const P = (PAGES.find((p) => p.id === page) ?? PAGES[0]).C;
  useEffect(() => bindFullscreenSync(), []);
  usePresentationKeys(pres);
  // Rotas removidas ou desconhecidas (ex.: #/memorial) voltam para a visão geral
  useEffect(() => {
    if (!known) setPage('overview');
  }, [known, setPage]);
  return (
    <>
      <div className={'app' + (pres ? ' present' : '')}>
        <Sidebar />
        <Header />
        <main className="main">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              className="page-wrap"
              style={{ position: 'absolute', inset: 0 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <Suspense fallback={<div className="page pad muted">Carregando…</div>}>
                <P />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
        {pres && <PresentationBar />}
      </div>
      <AnimatePresence>{splash && <Splash onDone={() => setSplash(false)} />}</AnimatePresence>
    </>
  );
}
