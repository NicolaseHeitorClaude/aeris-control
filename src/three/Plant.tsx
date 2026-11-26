import { useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SECTORS, SECTOR_W } from '../sim/constants';
import { sim, useUI, useSim, type Selection } from '../state/store';
import {
  AxialFan, CNC, Press, RobotCell, AssemblyLine, Booth, Packer, Worker, StatusLight, MAT, type StatusKey,
} from './Equipment';
import {
  supplyFanPos, exhaustFanPos, ahuPos, chillerPos, pumpPos, panelPos, rioPos, machinePositions, workerPositions,
  evacPoint, sensorPos, hash, type V3,
} from './layout';

// ---------- Estrutura do galpão ----------
function Structure() {
  const roofVisible = useUI((s) => s.roofVisible);
  const wallsVisible = useUI((s) => s.wallsVisible);
  const cols = useMemo(() => {
    const a: V3[] = [];
    for (let x = -100; x <= 100; x += 20) for (const z of [-50, -25, 0, 25, 50]) a.push([x, 0, z]);
    return a;
  }, []);
  const colRef = useRef<THREE.InstancedMesh>(null);
  const flRef = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = new THREE.Matrix4();
    cols.forEach((c, i) => {
      m.makeTranslation(c[0], 3, c[2]);
      colRef.current?.setMatrixAt(i, m);
      flRef.current?.setMatrixAt(i * 2, new THREE.Matrix4().makeTranslation(c[0], 3, c[2] - 0.16));
      flRef.current?.setMatrixAt(i * 2 + 1, new THREE.Matrix4().makeTranslation(c[0], 3, c[2] + 0.16));
    });
    if (colRef.current) colRef.current.instanceMatrix.needsUpdate = true;
    if (flRef.current) flRef.current.instanceMatrix.needsUpdate = true;
  }, [cols]);
  const wallMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#9fb0bf', metalness: 0.5, roughness: 0.5, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
    [],
  );
  const roofMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#b9c4cc', metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide }),
    [],
  );
  return (
    <group>
      {/* piso de concreto */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 100]} />
        <meshStandardMaterial color="#6b737a" roughness={0.92} metalness={0.05} />
      </mesh>
      {/* terreno externo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[420, 280]} />
        <meshStandardMaterial color="#13202c" roughness={1} />
      </mesh>
      <gridHelper args={[420, 84, '#1b2e40', '#162636']} position={[0, -0.03, 0]} />
      {/* colunas metálicas (perfil H) */}
      <instancedMesh ref={colRef} args={[undefined, undefined, cols.length]} castShadow material={MAT.paintBlue}>
        <boxGeometry args={[0.08, 6, 0.3]} />
      </instancedMesh>
      <instancedMesh ref={flRef} args={[undefined, undefined, cols.length * 2]} castShadow material={MAT.paintBlue}>
        <boxGeometry args={[0.35, 6, 0.04]} />
      </instancedMesh>
      {/* vigas de cobertura (treliças simplificadas) */}
      {Array.from({ length: 11 }, (_, i) => -100 + i * 20).map((x) => (
        <group key={x}>
          <mesh position={[x, 5.85, 0]} material={MAT.darkSteel} castShadow>
            <boxGeometry args={[0.3, 0.3, 100]} />
          </mesh>
          <mesh position={[x, 5.35, 0]} material={MAT.darkSteel}>
            <boxGeometry args={[0.15, 0.15, 100]} />
          </mesh>
        </group>
      ))}
      {[-50, -25, 0, 25, 50].map((z) => (
        <mesh key={z} position={[0, 5.85, z]} material={MAT.darkSteel}>
          <boxGeometry args={[200, 0.22, 0.22]} />
        </mesh>
      ))}
      {/* paredes: base de concreto + painéis termoacústicos */}
      {[
        [0, -50, 200, 0],
        [0, 50, 200, 0],
        [-100, 0, 100, Math.PI / 2],
        [100, 0, 100, Math.PI / 2],
      ].map(([x, z, w, r], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, r, 0]}>
          <mesh position={[0, 0.6, 0]} receiveShadow castShadow>
            <boxGeometry args={[w, 1.2, 0.25]} />
            <meshStandardMaterial color="#8d959c" roughness={0.9} />
          </mesh>
          {wallsVisible && (
            <mesh position={[0, 3.6, 0]} material={wallMat}>
              <boxGeometry args={[w, 4.8, 0.12]} />
            </mesh>
          )}
        </group>
      ))}
      {/* cobertura removível */}
      {roofVisible && (
        <group>
          <mesh position={[0, 6.12, 0]} material={roofMat} castShadow receiveShadow>
            <boxGeometry args={[201, 0.18, 101]} />
          </mesh>
          {Array.from({ length: 10 }, (_, i) => -90 + i * 20).map((x) => (
            <mesh key={x} position={[x, 6.23, 0]} material={MAT.glass}>
              <boxGeometry args={[3, 0.04, 96]} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

// ---------- Demarcações de segurança ----------
function FloorMarkings() {
  const yellow = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e8b923' }), []);
  const white = useMemo(() => new THREE.MeshBasicMaterial({ color: '#d8dee3', transparent: true, opacity: 0.7 }), []);
  const lines: { p: V3; s: [number, number]; m: THREE.Material }[] = [];
  // corredores principais
  for (const z of [-2, 2]) lines.push({ p: [0, 0.02, z], s: [196, 0.15], m: yellow });
  for (const x of [-SECTOR_W / 2 - 2, -SECTOR_W / 2 + 2, SECTOR_W / 2 - 2, SECTOR_W / 2 + 2]) {
    lines.push({ p: [x, 0.02, -26], s: [0.15, 46], m: yellow });
    lines.push({ p: [x, 0.02, 26], s: [0.15, 46], m: yellow });
  }
  // zonas de máquinas
  SECTORS.forEach((d) =>
    machinePositions(d.id).forEach((m) => {
      const w = 9,
        h = 7;
      lines.push({ p: [m[0], 0.021, m[2] - h / 2], s: [w, 0.12], m: white });
      lines.push({ p: [m[0], 0.021, m[2] + h / 2], s: [w, 0.12], m: white });
      lines.push({ p: [m[0] - w / 2, 0.021, m[2]], s: [0.12, h], m: white });
      lines.push({ p: [m[0] + w / 2, 0.021, m[2]], s: [0.12, h], m: white });
    }),
  );
  return (
    <group>
      {lines.map((l, i) => (
        <mesh key={i} position={l.p} rotation={[-Math.PI / 2, 0, 0]} material={l.m}>
          <planeGeometry args={l.s} />
        </mesh>
      ))}
    </group>
  );
}

// ---------- Mapa térmico dos setores ----------
const tempColor = (T: number, c: THREE.Color) => {
  const stops: [number, string][] = [
    [21, '#2a7fd4'],
    [23.5, '#2ecc71'],
    [26.5, '#f2b632'],
    [29.5, '#ff4d4f'],
  ];
  if (T <= stops[0][0]) return c.set(stops[0][1]);
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (T <= t1) return c.set(c0).lerp(new THREE.Color(c1), (T - t0) / (t1 - t0));
  }
  return c.set(stops[stops.length - 1][1]);
};

function SectorZone({ i }: { i: number }) {
  const d = SECTORS[i];
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const select = useUI((s) => s.select);
  const selected = useUI((s) => s.selected);
  const isSel = selected?.kind === 'sector' && selected.id === String(i);
  useFrame(({ clock }) => {
    if (!mat.current) return;
    tempColor(sim.sectors[i].T, mat.current.color);
    mat.current.opacity = (isSel ? 0.32 : 0.16) + (isSel ? Math.sin(clock.elapsedTime * 3) * 0.05 : 0);
  });
  return (
    <mesh
      position={[d.cx, 0.012, d.cz]}
      rotation={[-Math.PI / 2, 0, 0]}
      onDoubleClick={(e) => {
        e.stopPropagation();
        select({ kind: 'sector', id: String(i) });
      }}
    >
      <planeGeometry args={[SECTOR_W - 1, 49]} />
      <meshBasicMaterial ref={mat} transparent opacity={0.16} depthWrite={false} />
    </mesh>
  );
}

// ---------- Objeto selecionável ----------
function Pickable({ sel, children, position, rotation }: { sel: NonNullable<Selection>; children: React.ReactNode; position?: V3; rotation?: V3 }) {
  const select = useUI((s) => s.select);
  const selected = useUI((s) => s.selected);
  const [hover, setHover] = useState(false);
  const isSel = selected?.kind === sel.kind && selected.id === sel.id;
  useEffect(() => {
    document.body.style.cursor = hover ? 'pointer' : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hover]);
  return (
    <group
      position={position}
      rotation={rotation}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        select(sel);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
      }}
      onPointerOut={() => setHover(false)}
    >
      {children}
      {(isSel || hover) && <SelRing big={isSel} />}
    </group>
  );
}

function SelRing({ big }: { big: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 4) * 0.06;
      ref.current.scale.set(s, s, s);
    }
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
      <ringGeometry args={[big ? 3.2 : 2.6, big ? 3.5 : 2.75, 48]} />
      <meshBasicMaterial color={big ? '#36c5df' : '#0088cc'} transparent opacity={0.9} depthTest={false} />
    </mesh>
  );
}

const fanStatus = (id: string): StatusKey => {
  const f = sim.fans.find((x) => x.id === id);
  if (!f) return 'off';
  if (f.fault) return 'crit';
  return f.run ? 'ok' : 'off';
};

// ---------- Ventilação ----------
function Ventilation() {
  const labels = useUI((s) => s.labels);
  return (
    <group>
      {SECTORS.map((d) => (
        <group key={d.id}>
          {/* UTA externa */}
          <Pickable sel={{ kind: 'ahu', id: String(d.id) }} position={ahuPos(d.id)}>
            <mesh material={MAT.paintGrey} castShadow receiveShadow>
              <boxGeometry args={[22, 3.8, 5]} />
            </mesh>
            <mesh material={MAT.paintBlue} position={[0, 2.0, 0]}>
              <boxGeometry args={[22.2, 0.2, 5.2]} />
            </mesh>
            {[-8, -2, 4].map((x) => (
              <mesh key={x} material={MAT.darkSteel} position={[x, 0, d.wallSide * 2.52]}>
                <boxGeometry args={[0.08, 3.4, 0.05]} />
              </mesh>
            ))}
            {/* tomada de ar externo com veneziana */}
            <mesh material={MAT.black} position={[9.5, 0.2, d.wallSide * 2.52]}>
              <boxGeometry args={[2.4, 2.6, 0.05]} />
            </mesh>
            <StatusLight
              position={[-10.5, 1.4, d.wallSide * 2.6]}
              get={() => (sim.sectors[d.id].valve > 2 && sim.capAvail > 0 ? 'ok' : sim.mains ? 'warn' : 'off')}
            />
          </Pickable>
          {/* insufladores */}
          {[0, 1].map((k) => {
            const id = `INS-${d.id + 1}${k === 0 ? 'A' : 'B'}`;
            const p = supplyFanPos(d.id, k);
            return (
              <Pickable key={id} sel={{ kind: 'fan', id }} position={p}>
                <group rotation={[-d.wallSide * Math.PI / 2, 0, 0]}>
                  <AxialFan fanId={id} r={0.75} len={1.6} />
                </group>
                <StatusLight position={[0, 1.3, 0]} get={() => fanStatus(id)} size={0.22} />
                {labels && <FanLabel id={id} />}
              </Pickable>
            );
          })}
          {/* dutos de insuflação com difusores */}
          {[0, 1].map((k) => {
            const p = supplyFanPos(d.id, k);
            const len = 38;
            const zc = d.wallSide * (50 - len / 2);
            return (
              <group key={k}>
                <mesh material={MAT.galv} position={[p[0], 4.9, zc]} castShadow>
                  <boxGeometry args={[1.6, 1.2, len]} />
                </mesh>
                <mesh material={MAT.galv} position={[p[0], 4.2, d.wallSide * 50.4]}>
                  <boxGeometry args={[1.5, 1.6, 1.2]} />
                </mesh>
                {Array.from({ length: 6 }, (_, j) => (
                  <mesh key={j} material={MAT.darkSteel} position={[p[0], 4.27, d.wallSide * (46 - j * 6.5)]}>
                    <boxGeometry args={[1.0, 0.06, 1.0]} />
                  </mesh>
                ))}
                {/* filtro */}
                <mesh material={MAT.white} position={[p[0], 3.6, d.wallSide * 52.6]}>
                  <boxGeometry args={[1.8, 1.8, 0.3]} />
                </mesh>
              </group>
            );
          })}
          {/* exaustores de cobertura */}
          {[0, 1].map((k) => {
            const id = `EXA-${d.id + 1}${k === 0 ? 'A' : 'B'}`;
            const p = exhaustFanPos(d.id, k);
            return (
              <Pickable key={id} sel={{ kind: 'fan', id }} position={p}>
                <mesh material={MAT.paintDark} position={[0, -0.75, 0]} castShadow>
                  <boxGeometry args={[2.4, 0.5, 2.4]} />
                </mesh>
                <AxialFan fanId={id} r={0.75} len={1.1} />
                <StatusLight position={[1.2, 0, 1.2]} get={() => fanStatus(id)} size={0.22} />
                {labels && <FanLabel id={id} />}
              </Pickable>
            );
          })}
          {/* sensores do setor (TH, CO₂, multigás) */}
          <Pickable sel={{ kind: 'sensor', id: String(d.id) }} position={sensorPos(d.id)}>
            <mesh material={MAT.white} position={[-0.3, 0, 0]}>
              <boxGeometry args={[0.35, 0.45, 0.15]} />
            </mesh>
            <mesh material={MAT.paintGrey} position={[0.15, 0, 0]}>
              <boxGeometry args={[0.3, 0.4, 0.15]} />
            </mesh>
            <mesh material={MAT.yellow} position={[0.55, 0, 0]}>
              <boxGeometry args={[0.35, 0.5, 0.18]} />
            </mesh>
            <StatusLight
              position={[0, 0.45, 0.1]}
              size={0.13}
              get={() => {
                const s = sim.sectors[d.id];
                if (s.sensorFault) return 'warn';
                if (s.gas >= 10) return 'crit';
                return 'ok';
              }}
            />
          </Pickable>
        </group>
      ))}
    </group>
  );
}

function FanLabel({ id }: { id: string }) {
  useSim();
  const selected = useUI((s) => s.selected);
  const f = sim.fans.find((x) => x.id === id)!;
  if (!f.fault && !(selected?.kind === 'fan' && selected.id === id)) return null;
  return (
    <Html position={[0, 2.1, 0]} zIndexRange={[10, 0]} distanceFactor={80}>
      <div className={'label3d' + (f.fault ? ' alarm' : '')}>
        <b>{id}</b>
        {f.fault ? 'FALHA' : `${f.hz.toFixed(0)} Hz`}
      </div>
    </Html>
  );
}

// ---------- Fluxo de ar (partículas) ----------
function Airflow({ i }: { i: number }) {
  const N = 160;
  const d = SECTORS[i];
  const ref = useRef<THREE.Points>(null);
  const data = useMemo(() => {
    const pos = new Float32Array(N * 3);
    const seeds = Array.from({ length: N }, (_, k) => {
      const fanK = k % 2;
      const sp = supplyFanPos(i, fanK);
      const z0 = d.wallSide * (46 - hash(i * 97 + k) * 34);
      const ex = exhaustFanPos(i, hash(i * 13 + k * 7) > 0.5 ? 1 : 0);
      return {
        p: hash(k * 3.3 + i),
        a: new THREE.Vector3(sp[0] + (hash(k) - 0.5) * 1.2, 4.2, z0),
        b: new THREE.Vector3(sp[0] + (hash(k * 5) - 0.5) * 20, 1.0 + hash(k * 9) * 1.2, (z0 + ex[2]) / 2 + (hash(k * 11) - 0.5) * 10),
        c: new THREE.Vector3(ex[0] + (hash(k * 2) - 0.5) * 1.2, 7.5, ex[2] + (hash(k * 4) - 0.5) * 1.2),
      };
    });
    return { pos, seeds };
  }, [i, d.wallSide]);
  const mat = useRef<THREE.PointsMaterial>(null);
  const v = new THREE.Vector3();
  useFrame((_, dt) => {
    const sec = sim.sectors[i];
    const flow = sec.supplyFlow / 120000;
    const flowE = sec.exhaustFlow / 120000;
    const k = Math.max(flow, flowE);
    const speed = sim.running ? k * 0.12 * dt * Math.min(sim.speed, 6) ** 0.5 : 0;
    data.seeds.forEach((s, j) => {
      s.p = (s.p + speed) % 1;
      const t = s.p;
      const u = 1 - t;
      v.set(0, 0, 0)
        .addScaledVector(s.a, u * u)
        .addScaledVector(s.b, 2 * u * t)
        .addScaledVector(s.c, t * t);
      data.pos[j * 3] = v.x;
      data.pos[j * 3 + 1] = v.y;
      data.pos[j * 3 + 2] = v.z;
    });
    if (ref.current) (ref.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    if (mat.current) {
      mat.current.opacity = Math.min(0.85, k * 2.2);
      tempColor(sec.tSupply + 5, mat.current.color);
      if (sec.gas > 5) mat.current.color.lerp(new THREE.Color('#ff4d4f'), Math.min(1, sec.gas / 20));
    }
  });
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.pos, 3]} />
      </bufferGeometry>
      <pointsMaterial ref={mat} size={0.55} sizeAttenuation transparent depthWrite={false} blending={THREE.AdditiveBlending} color="#36c5df" />
    </points>
  );
}

function AirflowAll() {
  const on = useUI((s) => s.airflow);
  if (!on) return null;
  return (
    <group>
      {SECTORS.map((d) => (
        <Airflow key={d.id} i={d.id} />
      ))}
    </group>
  );
}

// ---------- Nuvem de gás ----------
function GasCloud({ i }: { i: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const d = SECTORS[i];
  useFrame(({ clock }) => {
    const g = sim.sectors[i].gas;
    if (!ref.current) return;
    ref.current.visible = g > 1;
    const s = 4 + g * 0.7 + Math.sin(clock.elapsedTime * 2) * 0.3;
    ref.current.scale.set(s, s * 0.35, s);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = Math.min(0.45, g / 40);
  });
  const m = machinePositions(i)[1];
  return (
    <mesh ref={ref} position={[m[0], 1.5, m[2]]} visible={false}>
      <sphereGeometry args={[1, 24, 16]} />
      <meshBasicMaterial color={d.id === 4 ? '#b5ff3d' : '#ff4d4f'} transparent opacity={0.3} depthWrite={false} />
    </mesh>
  );
}

// ---------- Máquinas e trabalhadores ----------
const MACHINE: Record<string, () => JSX.Element> = { cnc: CNC, press: Press, robot: RobotCell, assembly: AssemblyLine, booth: Booth, packer: Packer };

function Machines() {
  return (
    <group>
      {SECTORS.map((d) => {
        const M = MACHINE[d.machineType];
        return machinePositions(d.id).map((p, k) => (
          <Pickable key={`${d.id}-${k}`} sel={{ kind: 'machine', id: `${d.id}-${k}` }} position={p} rotation={[0, d.wallSide < 0 ? 0 : Math.PI, 0]}>
            <M />
            <StatusLight
              position={[0, 4.9, 0]}
              size={0.2}
              get={() => {
                const s = sim.sectors[d.id];
                if (!sim.mains) return 'off';
                if (!s.processOn) return 'crit';
                return s.loadFactor > 1.2 ? 'warn' : 'ok';
              }}
            />
          </Pickable>
        ));
      })}
    </group>
  );
}

function MovingWorker({ sector, k, home }: { sector: number; k: number; home: V3 }) {
  const ref = useRef<THREE.Group>(null);
  const evac = evacPoint(sector);
  const target = new THREE.Vector3();
  useFrame((_, dt) => {
    if (!ref.current) return;
    const s = sim.sectors[sector];
    const evacuate = s.gasIsolated || s.gas >= 20;
    if (evacuate) target.set(evac[0] + (k % 3) * 1.2, 0, evac[2] + Math.floor(k / 3) * 1.2 * (SECTORS[sector].wallSide));
    else target.set(home[0], 0, home[2]);
    ref.current.position.lerp(target, Math.min(1, dt * (evacuate ? 0.25 : 0.4)));
  });
  return (
    <group ref={ref} position={home}>
      <Worker seed={sector * 10 + k} />
    </group>
  );
}

function Workers() {
  return (
    <group>
      {SECTORS.map((d) => workerPositions(d.id).map((p, k) => <MovingWorker key={`${d.id}-${k}`} sector={d.id} k={k} home={p} />))}
    </group>
  );
}

// ---------- Central de água gelada ----------
function Chiller({ i }: { i: number }) {
  const fans = useRef<THREE.Group[]>([]);
  useFrame((_, dt) => {
    const c = sim.chillers[i];
    fans.current.forEach((f) => f && (f.rotation.y += c.on ? 12 * dt * (sim.running ? 1 : 0) : 0));
  });
  const id = sim.chillers[i].id;
  return (
    <Pickable sel={{ kind: 'chiller', id }} position={chillerPos(i)}>
      <mesh material={MAT.darkSteel} position={[0, 0.15, 0]} receiveShadow>
        <boxGeometry args={[13, 0.3, 4.4]} />
      </mesh>
      <mesh material={MAT.paintGrey} position={[0, 1.6, 0]} castShadow>
        <boxGeometry args={[12, 2.6, 3.6]} />
      </mesh>
      {/* serpentinas de condensação em V */}
      {[-1, 1].map((s) => (
        <mesh key={s} material={MAT.galv} position={[0, 3.3, s * 1.3]} rotation={[s * 0.35, 0, 0]} castShadow>
          <boxGeometry args={[12, 1.6, 0.12]} />
        </mesh>
      ))}
      {[-4.5, -1.5, 1.5, 4.5].map((x, k) => (
        <group key={x} position={[x, 4.15, 0]}>
          <mesh material={MAT.black}>
            <cylinderGeometry args={[1.1, 1.1, 0.3, 24, 1, true]} />
          </mesh>
          <group ref={(g) => g && (fans.current[k] = g)}>
            {[0, 1, 2, 3, 4].map((b) => (
              <mesh key={b} material={MAT.steel} rotation={[0.3, (b * Math.PI * 2) / 5, 0]} position={[0, 0, 0]}>
                <boxGeometry args={[1.9, 0.03, 0.25]} />
              </mesh>
            ))}
          </group>
        </group>
      ))}
      {/* compressores */}
      {[-3, 0, 3].map((x) => (
        <mesh key={x} material={MAT.paintBlue} position={[x, 0.9, 1.9]}>
          <cylinderGeometry args={[0.4, 0.4, 1.2, 16]} />
        </mesh>
      ))}
      <mesh material={MAT.paintDark} position={[6.2, 1.4, 0]}>
        <boxGeometry args={[0.5, 2, 2.2]} />
      </mesh>
      <StatusLight
        position={[6.5, 2.6, 0]}
        size={0.3}
        get={() => {
          const c = sim.chillers[i];
          if (c.fault) return 'crit';
          if (c.starting > 0) return 'warn';
          return c.on ? 'ok' : 'off';
        }}
      />
      <ChillerLabel i={i} />
    </Pickable>
  );
}

function ChillerLabel({ i }: { i: number }) {
  useSim();
  const labels = useUI((s) => s.labels);
  if (!labels) return null;
  const c = sim.chillers[i];
  return (
    <Html position={[0, 5.4, 0]} distanceFactor={80} zIndexRange={[10, 0]}>
      <div className={'label3d' + (c.fault ? ' alarm' : '')}>
        <b>{c.id}</b>
        {c.fault ? 'FALHA' : c.on ? `${(c.load * 100).toFixed(0)} %` : c.starting > 0 ? 'PARTIDA' : 'STAND-BY'}
      </div>
    </Html>
  );
}

function Pump({ i }: { i: number }) {
  const rot = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (rot.current && sim.pumps[i].run && sim.running) rot.current.rotation.x += 20 * dt;
  });
  const p = sim.pumps[i];
  return (
    <Pickable sel={{ kind: 'pump', id: p.id }} position={pumpPos(i)}>
      <mesh material={MAT.darkSteel} position={[0, 0.15, 0]}>
        <boxGeometry args={[3, 0.3, 1.2]} />
      </mesh>
      <mesh material={MAT.paintBlue} position={[0.6, 0.8, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.42, 0.42, 1.4, 20]} />
      </mesh>
      <mesh ref={rot} material={MAT.steel} position={[-0.25, 0.8, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.12, 0.5, 6]} />
      </mesh>
      <mesh material={MAT.pipeCold} position={[-0.9, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.55, 0.5, 24]} />
      </mesh>
      <StatusLight
        position={[0.6, 1.4, 0]}
        size={0.18}
        get={() => (sim.pumps[i].fault ? 'crit' : sim.pumps[i].run ? 'ok' : 'off')}
      />
    </Pickable>
  );
}

function Pipe({ a, b, r = 0.25, mat }: { a: V3; b: V3; r?: number; mat: THREE.Material }) {
  const { pos, len, quat } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return { pos: va.add(vb).multiplyScalar(0.5), len, quat };
  }, [a, b]);
  return (
    <mesh position={pos} quaternion={quat} material={mat} castShadow>
      <cylinderGeometry args={[r, r, len, 12]} />
    </mesh>
  );
}

function Piping() {
  const segs = useMemo(() => {
    const s: { a: V3; b: V3; m: THREE.Material }[] = [];
    const header = (zs: number, y: number, m: THREE.Material, off: number) => {
      s.push({ a: [-112, y, zs * (58.5 + off)], b: [80, y, zs * (58.5 + off)], m });
    };
    for (const side of [-1, 1]) {
      header(side, 0.9, MAT.pipeCold, 0);
      header(side, 1.5, MAT.pipeWarm, 0.9);
    }
    s.push({ a: [-112, 0.9, -58.5], b: [-112, 0.9, 58.5], m: MAT.pipeCold });
    s.push({ a: [-113, 1.5, -59.4], b: [-113, 1.5, 59.4], m: MAT.pipeWarm });
    SECTORS.forEach((d) => {
      const x = d.cx - 4;
      s.push({ a: [x, 0.9, d.wallSide * 58.5], b: [x, 0.9, d.wallSide * 57.5], m: MAT.pipeCold });
      s.push({ a: [x + 1, 1.5, d.wallSide * 59.4], b: [x + 1, 1.5, d.wallSide * 57.5], m: MAT.pipeWarm });
    });
    for (let i = 0; i < 4; i++) {
      const p = chillerPos(i);
      s.push({ a: [p[0] + 6.5, 0.9, p[2] - 0.6], b: [-112, 0.9, p[2] - 0.6], m: MAT.pipeCold });
      s.push({ a: [p[0] + 6.5, 1.5, p[2] + 0.6], b: [-113, 1.5, p[2] + 0.6], m: MAT.pipeWarm });
    }
    return s;
  }, []);
  return (
    <group>
      {segs.map((x, i) => (
        <Pipe key={i} a={x.a} b={x.b} mat={x.m} r={0.28} />
      ))}
    </group>
  );
}

function ElectricalRoom() {
  return (
    <group>
      <Pickable sel={{ kind: 'panel', id: 'QGBT' }} position={panelPos}>
        {Array.from({ length: 6 }, (_, k) => (
          <group key={k} position={[k * 1.05, 0, 0]}>
            <mesh material={MAT.paintGrey} position={[0, 1.1, 0]} castShadow>
              <boxGeometry args={[1, 2.2, 0.8]} />
            </mesh>
            <mesh material={MAT.darkSteel} position={[0, 0.05, 0]}>
              <boxGeometry args={[1, 0.1, 0.8]} />
            </mesh>
            <mesh material={MAT.black} position={[0.3, 1.2, 0.41]}>
              <boxGeometry args={[0.04, 0.3, 0.02]} />
            </mesh>
          </group>
        ))}
        <mesh position={[2.6, 2.32, 0.41]}>
          <planeGeometry args={[5.6, 0.18]} />
          <meshBasicMaterial color="#f2b632" />
        </mesh>
        <StatusLight position={[0, 2.35, 0.45]} size={0.12} get={() => (sim.mains ? 'ok' : 'crit')} />
        <StatusLight position={[0.4, 2.35, 0.45]} size={0.12} get={() => (sim.cmd24 ? (sim.mains ? 'ok' : 'warn') : 'crit')} />
      </Pickable>
      {SECTORS.map((d) => (
        <Pickable key={d.id} sel={{ kind: 'panel', id: `RIO-0${Math.floor(d.id / 2) + 1}` }} position={rioPos(d.id)} rotation={[0, d.wallSide > 0 ? Math.PI : 0, 0]}>
          <mesh material={MAT.paintGrey} position={[0, 1.4, 0]} castShadow>
            <boxGeometry args={[1.2, 1.6, 0.4]} />
          </mesh>
          <StatusLight position={[0.4, 2.0, 0.22]} size={0.08} get={() => (sim.plcRun ? 'ok' : 'crit')} />
        </Pickable>
      ))}
    </group>
  );
}

// ---------- Rótulos dos setores ----------
function SectorLabels() {
  useSim();
  const labels = useUI((s) => s.labels);
  const select = useUI((s) => s.select);
  if (!labels) return null;
  return (
    <group>
      {SECTORS.map((d) => {
        const s = sim.sectors[d.id];
        const alarm = s.gas >= 10 || s.T >= 27;
        return (
          <Html key={d.id} position={[d.cx, 8.5, d.cz]} distanceFactor={110} zIndexRange={[20, 0]}>
            <div
              className={'label3d big' + (alarm ? ' alarm' : '')}
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              onClick={() => select({ kind: 'sector', id: String(d.id) })}
            >
              <b>{d.code}</b>
              {d.name} · {s.sensorFault ? 'BAD' : `${s.T.toFixed(1)} °C`} · {s.rh.toFixed(0)} %
              {s.gas >= 1 ? ` · ${s.gas.toFixed(0)} %LIE` : ''}
            </div>
          </Html>
        );
      })}
    </group>
  );
}

// ---------- Câmera ----------
export const VIEWS: Record<string, { pos: V3; target: V3 }> = {
  iso: { pos: [125, 100, 140], target: [-8, 0, 4] },
  top: { pos: [0, 260, 0.1], target: [0, 0, 0] },
  front: { pos: [0, 30, 190], target: [0, 2, 0] },
  cag: { pos: [-150, 35, 50], target: [-114, 2, 0] },
  detail: { pos: [55, 28, 85], target: [0, 2, 25] },
};

export function selectionPos(sel: Selection): V3 | null {
  if (!sel) return null;
  switch (sel.kind) {
    case 'sector': {
      const d = SECTORS[+sel.id];
      return [d.cx, 0, d.cz];
    }
    case 'fan': {
      const f = sim.fans.find((x) => x.id === sel.id);
      if (!f) return null;
      return f.kind === 'SUP' ? supplyFanPos(f.sector, f.idx) : exhaustFanPos(f.sector, f.idx);
    }
    case 'chiller':
      return chillerPos(sim.chillers.findIndex((c) => c.id === sel.id));
    case 'pump':
      return pumpPos(sim.pumps.findIndex((c) => c.id === sel.id));
    case 'ahu':
      return ahuPos(+sel.id);
    case 'sensor':
      return sensorPos(+sel.id);
    case 'machine': {
      const [s, k] = sel.id.split('-').map(Number);
      return machinePositions(s)[k];
    }
    case 'panel':
      if (sel.id === 'QGBT') return panelPos;
      return rioPos((+sel.id.slice(-1) - 1) * 2);
  }
  return null;
}

function CameraRig({ initial }: { initial: string }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: { target: THREE.Vector3; update: () => void } | null };
  const camView = useUI((s) => s.camView);
  const selected = useUI((s) => s.selected);
  const anim = useRef<{ pos: THREE.Vector3; target: THREE.Vector3; t: number } | null>(null);
  const first = useRef(true);
  useEffect(() => {
    const v = VIEWS[first.current ? initial : camView.name] ?? VIEWS.iso;
    if (first.current) {
      camera.position.set(v.pos[0] * 1.6, v.pos[1] * 1.6, v.pos[2] * 1.6);
      first.current = false;
    }
    anim.current = { pos: new THREE.Vector3(...v.pos), target: new THREE.Vector3(...v.target), t: 0 };
  }, [camView, camera, initial]);
  useEffect(() => {
    const p = selectionPos(selected);
    if (!p) return;
    const sector = selected?.kind === 'sector';
    const dist = sector ? 60 : 22;
    const target = new THREE.Vector3(p[0], sector ? 0 : Math.max(1.5, p[1]), p[2]);
    const dir = camera.position.clone().sub(controls?.target ?? new THREE.Vector3()).normalize();
    if (dir.y < 0.35) dir.y = 0.5;
    dir.normalize();
    anim.current = { pos: target.clone().addScaledVector(dir, dist), target, t: 0 };
  }, [selected, camera, controls]);
  useFrame((_, dt) => {
    const a = anim.current;
    if (!a || !controls) return;
    a.t += dt;
    const k = 1 - Math.exp(-dt * 3.2);
    camera.position.lerp(a.pos, k);
    controls.target.lerp(a.target, k);
    controls.update();
    if (a.t > 2.2 || camera.position.distanceTo(a.pos) < 0.2) anim.current = null;
  });
  return null;
}

function Lights() {
  const amb = useRef<THREE.HemisphereLight>(null);
  useFrame(() => {
    if (amb.current) amb.current.intensity = sim.mains ? 0.9 : 0.45;
  });
  return (
    <>
      <hemisphereLight ref={amb} args={['#cfe6ff', '#1a2633', 0.9]} />
      <directionalLight
        position={[90, 140, 70]}
        intensity={2.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-140}
        shadow-camera-right={140}
        shadow-camera-top={90}
        shadow-camera-bottom={-90}
        shadow-camera-far={400}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-120, 60, -80]} intensity={0.45} color="#8fc8ff" />
    </>
  );
}

export function PlantScene({ initialView = 'iso', autoRotate = false }: { initialView?: string; autoRotate?: boolean }) {
  const select = useUI((s) => s.select);
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [240, 190, 250], fov: 38, near: 0.5, far: 2000 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      onPointerMissed={() => select(null)}
    >
      <color attach="background" args={['#0a1624']} />
      <fog attach="fog" args={['#0a1624', 320, 700]} />
      <Lights />
      <Structure />
      <FloorMarkings />
      {SECTORS.map((d) => (
        <SectorZone key={d.id} i={d.id} />
      ))}
      <Machines />
      <Workers />
      <Ventilation />
      <Piping />
      {[0, 1, 2, 3].map((i) => (
        <Chiller key={i} i={i} />
      ))}
      {[0, 1, 2].map((i) => (
        <Pump key={i} i={i} />
      ))}
      <ElectricalRoom />
      <AirflowAll />
      {SECTORS.map((d) => (
        <GasCloud key={d.id} i={d.id} />
      ))}
      <SectorLabels />
      <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.08} minDistance={8} maxDistance={520} enableDamping dampingFactor={0.08} autoRotate={autoRotate} autoRotateSpeed={0.35} />
      <CameraRig initial={initialView} />
    </Canvas>
  );
}
