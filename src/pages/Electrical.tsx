import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { DoorOpen, DoorClosed } from 'lucide-react';
import { sim, useSim, simActions } from '../state/store';
import { Panel, fmt } from '../components/ui';

type Comp = { id: string; t: string; d: string };
const COMPS: Record<string, Comp> = {
  REDE: { id: 'REDE', t: 'Alimentação trifásica 380 Vca / 60 Hz', d: 'Três fases (L1, L2, L3) + condutor de proteção PE. Sistema sem neutro: nenhuma carga do projeto é ligada entre fase e neutro. Fonte 24 Vcc e motores utilizam somente tensão de linha.' },
  Q0: { id: 'Q0', t: 'Q0 — Seccionadora geral sob carga', d: 'Seccionamento tripolar com punho bloqueável na posição aberta (NR-10 / NR-12: bloqueio e etiquetagem para manutenção). Contato auxiliar informa o CLP (Q0.ST).' },
  DPS: { id: 'DPS', t: 'DPS — Dispositivo de proteção contra surtos', d: 'Proteção contra sobretensões transitórias no barramento de 380 Vca, conectado ao PE.' },
  QF: { id: 'QF', t: 'QF — Disjuntores-motor / disjuntores de alimentador', d: 'Proteção contra curto-circuito de cada alimentador de inversor. 24 disjuntores para os ventiladores, 3 para as bombas, 4 alimentadores dos chillers e 1 para a fonte 24 Vcc.' },
  IF: { id: 'IF', t: 'IF — Inversores de frequência (24 + 3)', d: 'Conversores 380 Vca 3F, 15 kW (ventiladores) e 37 kW (bombas). Recebem comando liga (DO, via relé de interface) e referência 4–20 mA (AO) do CLP; devolvem funcionamento e falha (DI). Função STO ligada ao relé de segurança.' },
  M: { id: 'M', t: 'M — Motores de indução trifásicos', d: '24 motores de 15 kW (ventilação) + 3 motores de 37 kW (bombas), carcaças aterradas no PE. Rotação controlada pela frequência (lei dos ventiladores).' },
  CH: { id: 'CH', t: 'Chillers — alimentação própria', d: '4 chillers com painel e partida próprios (compressores). O CLP apenas habilita (DO) e lê estado/falha (DI).' },
  FT: { id: 'FT', t: 'FT-24V — Fonte industrial 24 Vcc', d: 'Entrada trifásica 3 × 380–480 Vca (compatível com a rede, sem neutro), saída 24 Vcc / 40 A. Alimenta todo o circuito de comando.' },
  UPS: { id: 'UPS', t: 'Módulo buffer / bateria 24 Vcc', d: 'Mantém CLP, estações remotas e sensores alimentados durante a falta de 380 Vca, permitindo registrar alarmes e realizar o religamento escalonado.' },
  CLP: { id: 'CLP', t: 'CLP modular central', d: 'CPU com PROFINET, módulos de E/S locais (central de água gelada e energia) e 3 estações remotas (RIO-01 a RIO-03) próximas aos setores.' },
  KS: { id: 'KS', t: 'KS-01 — Relé de segurança + botões de emergência', d: 'Cadeia de emergência em dois canais (categoria 3 / PL d, a validar por análise de risco NR-12). Atua o STO dos inversores dos processos e desliga permissivos. A ventilação de emergência NÃO é desligada em detecção de gás.' },
  K: { id: 'K', t: 'K — Relés de interface 24 Vcc', d: 'Isolam as saídas do CLP dos circuitos de campo: comando de inversores, habilitação dos chillers, sirenes, válvulas de gás e permissivos de máquinas.' },
  SNS: { id: 'SNS', t: 'Sensores 4–20 mA e contatos 24 Vcc', d: 'Transmissores de temperatura/umidade, CO₂, multigás, temperatura de ar insuflado, pressão diferencial e fluxostatos. Alimentação a 2 ou 3 fios pelo barramento 24 Vcc.' },
  PE: { id: 'PE', t: 'PE — Aterramento de proteção', d: 'Equipotencialização de carcaças de motores, painéis, eletrocalhas, inversores (blindagem dos cabos) e estruturas metálicas (NR-10).' },
};

function Diagram({ sel, setSel }: { sel: string; setSel: (s: string) => void }) {
  useSim();
  const on = sim.mains;
  const cmd = sim.cmd24;
  const P = on ? '#ff8a3d' : '#4a5865';
  const C = cmd ? '#36c5df' : '#4a5865';
  const anim = (ok: boolean) => (ok ? { strokeDasharray: '6 6', animation: 'dash 1.2s linear infinite' } : {});
  const box = (id: string, x: number, y: number, w: number, h: number, label: string, sub?: string, color = '#9eb2c4') => (
    <g onClick={() => setSel(id)} style={{ cursor: 'pointer' }}>
      <rect x={x} y={y} width={w} height={h} fill={sel === id ? 'rgba(0,136,204,.25)' : '#0c1d2f'} stroke={sel === id ? '#36c5df' : color} strokeWidth={sel === id ? 2 : 1.2} />
      <text x={x + w / 2} y={y + h / 2 + (sub ? -2 : 4)} textAnchor="middle" style={{ fill: '#f4f7fa', fontSize: 12 }}>{label}</text>
      {sub && <text x={x + w / 2} y={y + h / 2 + 13} textAnchor="middle" style={{ fontSize: 10 }}>{sub}</text>}
    </g>
  );
  const feeders = [
    { x: 300, n: 'INS ×12', k: 'Insufladores' },
    { x: 450, n: 'EXA ×12', k: 'Exaustores' },
    { x: 600, n: 'BAG ×3', k: 'Bombas' },
  ];
  return (
    <svg viewBox="0 0 1180 600" style={{ width: '100%', height: 'auto', background: '#091827' }}>
      <style>{`@keyframes dash{to{stroke-dashoffset:-24}} text{font-family:'IBM Plex Mono';font-size:11px;fill:#9eb2c4}`}</style>
      {/* faixa de força */}
      <rect x={8} y={8} width={1164} height={330} fill="none" stroke="#ff8a3d" strokeOpacity={0.35} strokeDasharray="3 5" />
      <text x={18} y={26} style={{ fill: '#ff8a3d', fontSize: 12, letterSpacing: '.12em' }}>CIRCUITO DE FORÇA · 380 Vca · 3F · 60 Hz · SEM NEUTRO</text>
      <rect x={8} y={350} width={1164} height={242} fill="none" stroke="#36c5df" strokeOpacity={0.35} strokeDasharray="3 5" />
      <text x={18} y={368} style={{ fill: '#36c5df', fontSize: 12, letterSpacing: '.12em' }}>CIRCUITO DE COMANDO · 24 Vcc</text>

      {/* rede */}
      <g onClick={() => setSel('REDE')} style={{ cursor: 'pointer' }}>
        {['L1', 'L2', 'L3'].map((l, i) => (
          <g key={l}>
            <text x={24} y={58 + i * 16}>{l}</text>
            <line x1={46} y1={54 + i * 16} x2={160} y2={54 + i * 16} stroke={P} strokeWidth={2} style={anim(on)} />
          </g>
        ))}
        <text x={24} y={106} style={{ fill: '#2ecc71' }}>PE</text>
        <line x1={46} y1={102} x2={1150} y2={102} stroke="#2ecc71" strokeWidth={1.5} strokeDasharray="10 3 2 3" onClick={(e) => { e.stopPropagation(); setSel('PE'); }} />
      </g>
      {/* Q0 */}
      {box('Q0', 160, 40, 60, 46, 'Q0', 'seccion.', P)}
      {box('DPS', 160, 120, 60, 34, 'DPS', undefined, P)}
      <line x1={190} y1={86} x2={190} y2={120} stroke={P} strokeWidth={1.5} />
      {/* barramento */}
      {[0, 1, 2].map((i) => (
        <line key={i} x1={220} y1={54 + i * 16} x2={1000} y2={54 + i * 16} stroke={P} strokeWidth={3} style={anim(on)} />
      ))}
      {feeders.map((f) => (
        <g key={f.x}>
          <line x1={f.x + 30} y1={86} x2={f.x + 30} y2={130} stroke={P} strokeWidth={2} />
          {box('QF', f.x, 130, 60, 36, 'QF', 'disj.-motor', P)}
          <line x1={f.x + 30} y1={166} x2={f.x + 30} y2={190} stroke={P} strokeWidth={2} />
          {box('IF', f.x - 5, 190, 70, 46, 'IF', 'inversor', P)}
          <line x1={f.x + 30} y1={236} x2={f.x + 30} y2={262} stroke={P} strokeWidth={2} />
          <g onClick={() => setSel('M')} style={{ cursor: 'pointer' }}>
            <circle cx={f.x + 30} cy={288} r={24} fill={sel === 'M' ? 'rgba(0,136,204,.25)' : '#0c1d2f'} stroke={sel === 'M' ? '#36c5df' : P} strokeWidth={1.5} />
            <text x={f.x + 30} y={286} textAnchor="middle" style={{ fill: '#f4f7fa', fontSize: 12 }}>M</text>
            <text x={f.x + 30} y={299} textAnchor="middle" style={{ fontSize: 9 }}>3~</text>
          </g>
          <line x1={f.x + 54} y1={288} x2={f.x + 70} y2={288} stroke="#2ecc71" strokeWidth={1.2} />
          <line x1={f.x + 70} y1={288} x2={f.x + 70} y2={102} stroke="#2ecc71" strokeWidth={1} strokeDasharray="10 3 2 3" />
          <text x={f.x + 30} y={328} textAnchor="middle" style={{ fill: '#f4f7fa' }}>{f.n}</text>
        </g>
      ))}
      {/* chillers */}
      <line x1={790} y1={86} x2={790} y2={130} stroke={P} strokeWidth={2} />
      {box('QF', 760, 130, 60, 36, 'QF', 'alimentador', P)}
      <line x1={790} y1={166} x2={790} y2={200} stroke={P} strokeWidth={2} />
      {box('CH', 745, 200, 90, 60, 'CH ×4', 'painel próprio', P)}
      {/* fonte 24 Vcc */}
      <line x1={930} y1={86} x2={930} y2={130} stroke={P} strokeWidth={2} />
      <text x={936} y={118} style={{ fontSize: 9.5 }}>3 × 380 Vca</text>
      {box('QF', 900, 130, 60, 36, 'QF', 'fonte', P)}
      <line x1={930} y1={166} x2={930} y2={200} stroke={P} strokeWidth={2} />
      {box('FT', 880, 200, 100, 60, 'FT-24V', '380–480 Vca → 24 Vcc', cmd ? '#36c5df' : '#ff4d4f')}
      <line x1={930} y1={260} x2={930} y2={392} stroke={C} strokeWidth={2} style={anim(cmd)} />
      {box('UPS', 1010, 200, 110, 60, 'BUFFER', on ? 'carregado' : `bateria ${fmt(sim.ups, 0)} %`, on ? '#36c5df' : '#f2b632')}
      <line x1={980} y1={230} x2={1010} y2={230} stroke={C} strokeWidth={1.5} />

      {/* barramentos 24 Vcc */}
      <line x1={40} y1={392} x2={1150} y2={392} stroke={C} strokeWidth={2.5} style={anim(cmd)} />
      <text x={44} y={386} style={{ fill: '#36c5df' }}>+24 Vcc</text>
      <line x1={40} y1={580} x2={1150} y2={580} stroke="#5b7da0" strokeWidth={2} />
      <text x={44} y={574}>0 V (M)</text>

      {/* KS + emergência */}
      <line x1={110} y1={392} x2={110} y2={420} stroke={C} strokeWidth={1.5} />
      <g onClick={() => setSel('KS')} style={{ cursor: 'pointer' }}>
        <circle cx={110} cy={436} r={14} fill="#b01e22" stroke="#f2b632" strokeWidth={3} />
        <text x={130} y={440}>ES-1…7</text>
      </g>
      <line x1={110} y1={450} x2={110} y2={470} stroke={C} strokeWidth={1.5} />
      {box('KS', 70, 470, 80, 46, 'KS-01', 'relé seg.', C)}
      <line x1={110} y1={516} x2={110} y2={580} stroke="#5b7da0" strokeWidth={1.5} />
      <path d="M150,493 H380 V236" stroke="#f2b632" strokeWidth={1.2} fill="none" strokeDasharray="4 3" />
      <text x={200} y={488} style={{ fill: '#f2b632', fontSize: 10 }}>STO → inversores / permissivos</text>

      {/* CLP */}
      <line x1={520} y1={392} x2={520} y2={430} stroke={C} strokeWidth={1.5} />
      {box('CLP', 440, 430, 200, 80, `CLP ${sim.plcRun ? 'RUN' : 'STOP'}`, 'CPU + E/S + PROFINET', sim.plcRun ? '#36c5df' : '#ff4d4f')}
      <line x1={540} y1={510} x2={540} y2={580} stroke="#5b7da0" strokeWidth={1.5} />
      {/* sinais CLP → IF */}
      <path d="M470,430 V345 H380 V213 H365" stroke={C} strokeWidth={1.2} fill="none" strokeDasharray="2 3" />
      <text x={386} y={340} style={{ fontSize: 10 }}>AO 4–20 mA · DO · DI</text>
      {/* relés */}
      <line x1={760} y1={392} x2={760} y2={440} stroke={C} strokeWidth={1.5} />
      {box('K', 710, 440, 100, 50, 'K1…K49', 'relés interface', C)}
      <line x1={640} y1={465} x2={710} y2={465} stroke={C} strokeWidth={1.2} strokeDasharray="2 3" />
      <line x1={760} y1={490} x2={760} y2={580} stroke="#5b7da0" strokeWidth={1.5} />
      {/* sensores */}
      <line x1={950} y1={392} x2={950} y2={440} stroke={C} strokeWidth={1.5} />
      {box('SNS', 890, 440, 130, 50, 'SENSORES', '69 instrumentos', C)}
      <line x1={890} y1={475} x2={640} y2={475} stroke={C} strokeWidth={1.2} strokeDasharray="2 3" />
      <line x1={950} y1={490} x2={950} y2={580} stroke="#5b7da0" strokeWidth={1.5} />
      <text x={660} y={540} style={{ fontSize: 10 }}>4–20 mA / contatos secos</text>
    </svg>
  );
}

// ---------- Painel elétrico 3D ----------
function Cabinet({ open }: { open: boolean }) {
  const door = useRef<THREE.Group>(null);
  const leds = useRef<THREE.MeshStandardMaterial[]>([]);
  useFrame((_, dt) => {
    if (door.current) {
      const target = open ? -1.9 : 0;
      door.current.rotation.y += (target - door.current.rotation.y) * Math.min(1, dt * 4);
    }
    leds.current.forEach((m, i) => {
      if (!m) return;
      const f = sim.fans[i % 24];
      const c = !sim.mains ? '#3a4652' : f?.fault ? '#ff4d4f' : '#2ecc71';
      m.color.set(c);
      m.emissive.set(c);
    });
  });
  const grey = '#c9d1d8';
  return (
    <group>
      {/* gabinete */}
      <mesh position={[0, 1.1, -0.3]}>
        <boxGeometry args={[1.6, 2.2, 0.04]} />
        <meshStandardMaterial color="#d7dde2" metalness={0.3} roughness={0.5} />
      </mesh>
      {[-0.8, 0.8].map((x) => (
        <mesh key={x} position={[x, 1.1, -0.05]}>
          <boxGeometry args={[0.04, 2.2, 0.55]} />
          <meshStandardMaterial color={grey} metalness={0.3} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 2.2, -0.05]}>
        <boxGeometry args={[1.64, 0.04, 0.55]} />
        <meshStandardMaterial color={grey} />
      </mesh>
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[1.64, 0.1, 0.55]} />
        <meshStandardMaterial color="#2b3a48" />
      </mesh>
      {/* placa de montagem */}
      <mesh position={[0, 1.1, -0.26]}>
        <boxGeometry args={[1.45, 2.0, 0.02]} />
        <meshStandardMaterial color="#e9a23b" metalness={0.2} roughness={0.6} />
      </mesh>
      {/* canaletas */}
      {[1.95, 1.48, 1.02, 0.56, 0.18].map((y) => (
        <mesh key={y} position={[0, y, -0.2]}>
          <boxGeometry args={[1.4, 0.07, 0.08]} />
          <meshStandardMaterial color="#9aa5ad" />
        </mesh>
      ))}
      {/* seccionadora + disjuntores */}
      <mesh position={[-0.55, 1.75, -0.18]}>
        <boxGeometry args={[0.18, 0.3, 0.12]} />
        <meshStandardMaterial color="#3a3f44" />
      </mesh>
      <mesh position={[-0.55, 1.75, -0.1]}>
        <boxGeometry args={[0.05, 0.14, 0.05]} />
        <meshStandardMaterial color="#e8b923" />
      </mesh>
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} position={[-0.36 + i * 0.07, 1.73, -0.19]}>
          <boxGeometry args={[0.055, 0.22, 0.1]} />
          <meshStandardMaterial color="#eef1f3" />
        </mesh>
      ))}
      {/* inversores */}
      {Array.from({ length: 8 }, (_, i) => (
        <group key={i} position={[-0.59 + i * 0.17, 1.25, -0.17]}>
          <mesh>
            <boxGeometry args={[0.14, 0.36, 0.14]} />
            <meshStandardMaterial color="#1f2a35" />
          </mesh>
          <mesh position={[0, 0.08, 0.071]}>
            <planeGeometry args={[0.08, 0.05]} />
            <meshStandardMaterial ref={(m) => m && (leds.current[i] = m)} color="#2ecc71" emissive="#2ecc71" emissiveIntensity={0.8} />
          </mesh>
        </group>
      ))}
      {/* fonte, CLP e módulos */}
      <mesh position={[-0.52, 0.8, -0.19]}>
        <boxGeometry args={[0.26, 0.26, 0.11]} />
        <meshStandardMaterial color="#8a949c" metalness={0.5} />
      </mesh>
      <mesh position={[-0.2, 0.8, -0.19]}>
        <boxGeometry args={[0.16, 0.26, 0.12]} />
        <meshStandardMaterial color="#243442" />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[-0.07 + i * 0.075, 0.8, -0.19]}>
          <boxGeometry args={[0.065, 0.24, 0.11]} />
          <meshStandardMaterial color={i < 4 ? '#2d4a63' : '#34556f'} />
        </mesh>
      ))}
      {/* relés e bornes */}
      {Array.from({ length: 16 }, (_, i) => (
        <mesh key={i} position={[-0.6 + i * 0.075, 0.37, -0.2]}>
          <boxGeometry args={[0.05, 0.16, 0.09]} />
          <meshStandardMaterial color={i % 2 ? '#3a6ea5' : '#4a7fb5'} />
        </mesh>
      ))}
      {Array.from({ length: 40 }, (_, i) => (
        <mesh key={i} position={[-0.65 + i * 0.033, 0.1, -0.2]}>
          <boxGeometry args={[0.025, 0.07, 0.06]} />
          <meshStandardMaterial color={i % 5 === 4 ? '#2ecc71' : i % 2 ? '#7aa7d6' : '#9fa9b2'} />
        </mesh>
      ))}
      {/* porta */}
      <group ref={door} position={[0.8, 1.1, 0.23]}>
        <mesh position={[-0.8, 0, 0]}>
          <boxGeometry args={[1.6, 2.2, 0.03]} />
          <meshStandardMaterial color="#d7dde2" metalness={0.3} roughness={0.45} />
        </mesh>
        <mesh position={[-1.5, 0, 0.03]}>
          <boxGeometry args={[0.04, 0.25, 0.04]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        <mesh position={[-0.8, 0.75, 0.02]}>
          <planeGeometry args={[0.5, 0.12]} />
          <meshBasicMaterial color="#f2b632" />
        </mesh>
        <mesh position={[-0.8, 0.2, 0.025]}>
          <circleGeometry args={[0.09, 24]} />
          <meshStandardMaterial color="#c0392b" />
        </mesh>
      </group>
    </group>
  );
}

export default function Electrical() {
  const s = useSim();
  const [sel, setSel] = useState('REDE');
  const [open, setOpen] = useState(true);
  const c = COMPS[sel];
  return (
    <div className="page pad">
      <h1 className="h1">Sistema elétrico</h1>
      <p className="sub">
        Força em 380 Vca trifásico 60 Hz (L1, L2, L3 + PE, sem neutro) e comando em 24 Vcc. Diagrama demonstrativo, não é desenho
        executivo de instalação. Clique nos componentes para ver a função de cada um.
      </p>
      <div className="kpi-row" style={{ marginBottom: 12 }}>
        <div className="kpi"><div className="l">Força 380 Vca</div><div className={'v ' + (s.mains ? 'ok' : 'crit')}>{s.mains ? 'NORMAL' : 'FALTA'}</div></div>
        <div className="kpi"><div className="l">Comando 24 Vcc</div><div className={'v ' + (s.cmd24 ? (s.mains ? 'ok' : 'warn') : 'crit')}>{s.cmd24 ? (s.mains ? 'NORMAL' : 'BATERIA') : 'FALTA'}</div></div>
        <div className="kpi"><div className="l">Buffer 24 Vcc</div><div className="v">{fmt(s.ups, 0)}<small>%</small></div></div>
        <div className="kpi"><div className="l">Demanda elétrica</div><div className="v">{fmt(s.elecKW, 0)}<small>kW</small></div></div>
        <div className="kpi"><div className="l">Inversores em operação</div><div className="v">{s.fans.filter((f) => f.run).length + s.pumps.filter((p) => p.run).length}<small>/ 27</small></div></div>
        <div className="kpi" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className={'btn ' + (s.mains ? 'danger' : 'primary')} onClick={() => simActions.update((x) => {
            if (x.mains) { x.mains = false; x.restoreAt = null; } else { x.mains = true; x.restoreAt = x.t; }
          })}>
            {s.mains ? 'Simular falta de 380 Vca' : 'Restabelecer 380 Vca'}
          </button>
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2.2fr) minmax(280px, 1fr)' }}>
        <Panel title="Diagrama unifilar/funcional — força e comando" bodyClass="">
          <Diagram sel={sel} setSel={setSel} />
        </Panel>
        <div className="grid" style={{ alignContent: 'start' }}>
          <Panel title={c.t}>
            <p style={{ margin: 0, lineHeight: 1.55 }}>{c.d}</p>
          </Panel>
          <Panel
            title="Painel elétrico 3D (CCM + CLP)"
            bodyClass=""
            right={
              <button className="btn" onClick={() => setOpen(!open)}>
                {open ? <DoorClosed size={14} /> : <DoorOpen size={14} />} {open ? 'Fechar porta' : 'Abrir porta'}
              </button>
            }
          >
            <div style={{ height: 340 }}>
              <Canvas camera={{ position: [1.6, 1.5, 2.6], fov: 40 }} dpr={[1, 1.75]}>
                <color attach="background" args={['#0c1d2f']} />
                <hemisphereLight args={['#dfefff', '#223', 1.1]} />
                <directionalLight position={[2, 3, 3]} intensity={1.6} />
                <Cabinet open={open} />
                <OrbitControls target={[0, 1.1, 0]} enablePan={false} minDistance={1.5} maxDistance={6} />
              </Canvas>
            </div>
            <div className="dim" style={{ padding: '6px 12px 10px', fontSize: 11.5 }}>
              Seccionadora, disjuntores, inversores (LED = estado real), fonte 24 Vcc, CLP modular, relés de interface e bornes.
            </div>
          </Panel>
        </div>
      </div>

      <div className="sec-title">Tipo de partida — inversores de frequência</div>
      <div className="split">
        <Panel title="Vantagens do inversor de frequência">
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
            <li><b>Controle de velocidade</b>: 20 a 60 Hz, referência 4–20 mA do CLP.</li>
            <li><b>Ajuste de vazão</b>: vazão proporcional à rotação (Q ∝ n).</li>
            <li><b>Partida gradual</b>: rampa de aceleração, sem pico de corrente (≈ 1,0–1,5 × In).</li>
            <li><b>Controle individual</b>: cada um dos 24 motores tem seu inversor, permitindo compensar falhas.</li>
            <li><b>Monitoramento</b>: corrente, frequência, falhas e horas de operação.</li>
            <li><b>Economia de energia</b>: potência ∝ n³; a 50 % da rotação o ventilador consome ≈ 12,5 % da potência nominal.</li>
          </ul>
        </Panel>
        <Panel title="Comparação entre métodos de partida" bodyClass="">
          <table className="t">
            <thead>
              <tr><th>Método</th><th>Corrente de partida</th><th>Velocidade variável</th><th>Aplicação ao projeto</th></tr>
            </thead>
            <tbody>
              <tr><td>Partida direta</td><td>6–8 × In</td><td>Não</td><td>Inadequada: picos em 24 motores, sem ajuste de vazão.</td></tr>
              <tr><td>Partida reversora</td><td>6–8 × In</td><td>Não</td><td>Só inverte o sentido; ventiladores não exigem reversão.</td></tr>
              <tr><td>Estrela-triângulo</td><td>≈ 2–2,7 × In</td><td>Não</td><td>Reduz o pico, mas há transiente na comutação e vazão fixa.</td></tr>
              <tr><td>Soft-starter</td><td>2–4 × In</td><td>Não</td><td>Partida suave, porém sem controle de vazão em regime.</td></tr>
              <tr className="sel"><td><b>Inversor de frequência</b></td><td>≈ 1–1,5 × In</td><td>Sim</td><td><b>Escolhido</b>: modulação contínua, economia e diagnóstico.</td></tr>
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}
