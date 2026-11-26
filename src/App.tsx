import { useEffect, useState, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Box, Fan, Zap, Cpu, BellRing, FileText, ListChecks, Play, Pause, RotateCcw, Presentation, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { sim, useSim, useUI, simActions } from './state/store';
import { fmtTime } from './sim/model';
import { SCENARIOS } from './sim/scenarios';

const Overview = lazy(() => import('./pages/Overview'));
const PlantPage = lazy(() => import('./pages/PlantPage'));
const HVAC = lazy(() => import('./pages/HVAC'));
const Electrical = lazy(() => import('./pages/Electrical'));
const PLC = lazy(() => import('./pages/PLC'));
const Alarms = lazy(() => import('./pages/Alarms'));
const Memorial = lazy(() => import('./pages/Memorial'));
const BOM = lazy(() => import('./pages/BOM'));

export const PAGES = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard, C: Overview },
  { id: 'plant', label: 'Planta industrial 3D', icon: Box, C: PlantPage },
  { id: 'hvac', label: 'Ventilação e refrigeração', icon: Fan, C: HVAC },
  { id: 'electrical', label: 'Sistema elétrico', icon: Zap, C: Electrical },
  { id: 'plc', label: 'CLP e sensores', icon: Cpu, C: PLC },
  { id: 'alarms', label: 'Alarmes', icon: BellRing, C: Alarms },
  { id: 'memorial', label: 'Memorial técnico', icon: FileText, C: Memorial },
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
  const setPres = useUI((s) => s.setPresentation);
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
        <button className="icon-btn" onClick={() => scenario('reset')} title="Resetar (condições iniciais)">
          <RotateCcw size={14} />
        </button>
        <button
          className={'icon-btn' + (pres ? ' on' : '')}
          onClick={() => {
            setPres(!pres);
            if (!pres) document.documentElement.requestFullscreen?.().catch(() => {});
            else if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
          }}
          title="Modo apresentação (tela cheia)"
        >
          <Presentation size={14} />
        </button>
      </div>
    </header>
  );
}

const PRES_STEPS = ['overview', 'plant', 'hvac', 'electrical', 'plc', 'alarms', 'memorial', 'bom'];

function PresentationBar() {
  const page = useUI((s) => s.page);
  const setPage = useUI((s) => s.setPage);
  const setPres = useUI((s) => s.setPresentation);
  const scenario = useUI((s) => s.scenario);
  const last = useUI((s) => s.lastScenario);
  const idx = Math.max(0, PRES_STEPS.indexOf(page));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setPage(PRES_STEPS[Math.min(PRES_STEPS.length - 1, idx + 1)]);
      if (e.key === 'ArrowLeft') setPage(PRES_STEPS[Math.max(0, idx - 1)]);
      if (e.key === 'Escape') setPres(false);
      const n = parseInt(e.key, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= 9) scenario(SCENARIOS[n - 1].id);
      if (e.key === '0') scenario('power');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, setPage, setPres, scenario]);
  return (
    <div className="pres-bar no-print">
      <button className="icon-btn" onClick={() => setPage(PRES_STEPS[Math.max(0, idx - 1)])} aria-label="Anterior">
        <ChevronLeft size={15} />
      </button>
      {PRES_STEPS.map((id, i) => (
        <button key={id} className={'step' + (page === id ? ' on' : '')} onClick={() => setPage(id)}>
          {i + 1}. {PAGES.find((p) => p.id === id)?.label}
        </button>
      ))}
      <button className="icon-btn" onClick={() => setPage(PRES_STEPS[Math.min(PRES_STEPS.length - 1, idx + 1)])} aria-label="Próximo">
        <ChevronRight size={15} />
      </button>
      <span className="sep" />
      {SCENARIOS.map((s) => (
        <button key={s.id} className={'step' + (last === s.id ? ' on' : '')} onClick={() => scenario(s.id)} title={s.title}>
          {s.n}
        </button>
      ))}
      <span className="sep" />
      <button
        className="icon-btn"
        onClick={() => {
          setPres(false);
          if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
        }}
        aria-label="Sair da apresentação"
      >
        <X size={15} />
      </button>
    </div>
  );
}

export default function App() {
  const [splash, setSplash] = useState(true);
  const page = useUI((s) => s.page);
  const pres = useUI((s) => s.presentation);
  const setPres = useUI((s) => s.setPresentation);
  const P = (PAGES.find((p) => p.id === page) ?? PAGES[0]).C;
  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement && useUI.getState().presentation) setPres(false);
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, [setPres]);
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
          {pres && <PresentationBar />}
        </main>
      </div>
      <AnimatePresence>{splash && <Splash onDone={() => setSplash(false)} />}</AnimatePresence>
    </>
  );
}
