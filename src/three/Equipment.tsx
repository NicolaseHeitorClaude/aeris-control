import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sim } from '../state/store';

export const MAT = {
  steel: new THREE.MeshStandardMaterial({ color: '#7d8a96', metalness: 0.7, roughness: 0.35 }),
  darkSteel: new THREE.MeshStandardMaterial({ color: '#2b3a48', metalness: 0.6, roughness: 0.45 }),
  galv: new THREE.MeshStandardMaterial({ color: '#a9b4bd', metalness: 0.8, roughness: 0.3 }),
  paintBlue: new THREE.MeshStandardMaterial({ color: '#0f6ea3', metalness: 0.3, roughness: 0.5 }),
  paintGrey: new THREE.MeshStandardMaterial({ color: '#c9d1d8', metalness: 0.2, roughness: 0.6 }),
  paintDark: new THREE.MeshStandardMaterial({ color: '#1c2b38', metalness: 0.3, roughness: 0.6 }),
  yellow: new THREE.MeshStandardMaterial({ color: '#e8b923', metalness: 0.2, roughness: 0.55 }),
  orange: new THREE.MeshStandardMaterial({ color: '#e26a2c', metalness: 0.2, roughness: 0.55 }),
  green: new THREE.MeshStandardMaterial({ color: '#2f8f5b', metalness: 0.2, roughness: 0.6 }),
  glass: new THREE.MeshStandardMaterial({ color: '#7fc6e6', metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.35 }),
  black: new THREE.MeshStandardMaterial({ color: '#111820', metalness: 0.4, roughness: 0.6 }),
  pipeCold: new THREE.MeshStandardMaterial({ color: '#2a7fd4', metalness: 0.4, roughness: 0.4 }),
  pipeWarm: new THREE.MeshStandardMaterial({ color: '#d1603d', metalness: 0.4, roughness: 0.4 }),
  white: new THREE.MeshStandardMaterial({ color: '#e9eef2', metalness: 0.1, roughness: 0.6 }),
  skin: new THREE.MeshStandardMaterial({ color: '#c99b7a', roughness: 0.8 }),
  vest: new THREE.MeshStandardMaterial({ color: '#f2a12c', roughness: 0.7 }),
  pants: new THREE.MeshStandardMaterial({ color: '#2b3b52', roughness: 0.8 }),
};

const STATUS = {
  ok: new THREE.MeshStandardMaterial({ color: '#2ecc71', emissive: '#2ecc71', emissiveIntensity: 1.4 }),
  warn: new THREE.MeshStandardMaterial({ color: '#f2b632', emissive: '#f2b632', emissiveIntensity: 1.4 }),
  crit: new THREE.MeshStandardMaterial({ color: '#ff4d4f', emissive: '#ff4d4f', emissiveIntensity: 1.8 }),
  off: new THREE.MeshStandardMaterial({ color: '#4a5865', emissive: '#000', emissiveIntensity: 0 }),
};
export type StatusKey = keyof typeof STATUS;

/** LED de status que lê o estado da simulação a cada frame. */
export function StatusLight({ get, position, size = 0.25 }: { get: () => StatusKey; position: [number, number, number]; size?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const k = get();
    ref.current.material = STATUS[k];
    ref.current.visible = k !== 'crit' || Math.floor(clock.elapsedTime * 3) % 2 === 0;
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[size, 12, 8]} />
    </mesh>
  );
}

/** Hélice: cubo + pás inclinadas. */
function Blades({ r, n = 6 }: { r: number; n?: number }) {
  const blades = useMemo(() => Array.from({ length: n }, (_, i) => (i / n) * Math.PI * 2), [n]);
  return (
    <group>
      <mesh material={MAT.darkSteel}>
        <cylinderGeometry args={[r * 0.18, r * 0.18, r * 0.3, 16]} />
      </mesh>
      {blades.map((a, i) => (
        <group key={i} rotation={[0, a, 0]}>
          <mesh position={[r * 0.55, 0, 0]} rotation={[0.45, 0, 0]} material={MAT.galv} castShadow>
            <boxGeometry args={[r * 0.8, 0.04, r * 0.32]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Ventilador axial: carcaça cilíndrica, grade, hélice e motor. Eixo de rotação = Y local. */
export function AxialFan({ fanId, r = 0.9, len = 1.2 }: { fanId: string; r?: number; len?: number }) {
  const rotor = useRef<THREE.Group>(null);
  const fanIdx = useMemo(() => sim.fans.findIndex((f) => f.id === fanId), [fanId]);
  useFrame((_, dt) => {
    const f = sim.fans[fanIdx];
    if (rotor.current && f) rotor.current.rotation.y += (f.hz / 60) * 14 * dt * (sim.running ? 1 : 0);
  });
  const grille = useMemo(() => [0.35, 0.6, 0.85].map((k) => k * r), [r]);
  return (
    <group>
      {/* carcaça */}
      <mesh material={MAT.paintGrey} castShadow>
        <cylinderGeometry args={[r * 1.08, r * 1.08, len, 32, 1, true]} />
      </mesh>
      <mesh material={MAT.darkSteel} position={[0, len / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r * 1.08, 0.06, 8, 32]} />
      </mesh>
      <mesh material={MAT.darkSteel} position={[0, -len / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r * 1.08, 0.06, 8, 32]} />
      </mesh>
      {/* hélice */}
      <group ref={rotor} position={[0, 0.05, 0]}>
        <Blades r={r} />
      </group>
      {/* motor + suportes */}
      <mesh material={MAT.paintBlue} position={[0, -len * 0.32, 0]} castShadow>
        <cylinderGeometry args={[r * 0.28, r * 0.28, len * 0.45, 20]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} material={MAT.darkSteel} position={[0, -len * 0.32, 0]} rotation={[0, (i * Math.PI * 2) / 3, 0]}>
          <boxGeometry args={[r * 2.1, 0.05, 0.08]} />
        </mesh>
      ))}
      {/* grade de proteção (NR-12) */}
      <group position={[0, len / 2 + 0.02, 0]}>
        {grille.map((gr, i) => (
          <mesh key={i} rotation={[Math.PI / 2, 0, 0]} material={MAT.black}>
            <torusGeometry args={[gr, 0.02, 4, 32]} />
          </mesh>
        ))}
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, (i * Math.PI) / 4, 0]} material={MAT.black}>
            <boxGeometry args={[r * 2.1, 0.03, 0.03]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ---------- Máquinas industriais ----------
export function CNC() {
  return (
    <group>
      <mesh material={MAT.darkSteel} position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.2, 0.5, 2.6]} />
      </mesh>
      <mesh material={MAT.paintGrey} position={[0, 1.45, 0]} castShadow>
        <boxGeometry args={[4, 1.9, 2.4]} />
      </mesh>
      <mesh material={MAT.glass} position={[0.2, 1.55, 1.21]}>
        <boxGeometry args={[2.2, 1.1, 0.05]} />
      </mesh>
      <mesh material={MAT.paintBlue} position={[-1.6, 1.45, 1.22]}>
        <boxGeometry args={[0.6, 1.9, 0.06]} />
      </mesh>
      <mesh material={MAT.paintBlue} position={[0.2, 2.55, 0]} castShadow>
        <boxGeometry args={[1.2, 0.5, 1.2]} />
      </mesh>
      <mesh material={MAT.steel} position={[0.2, 2.1, 0]}>
        <cylinderGeometry args={[0.18, 0.12, 0.8, 16]} />
      </mesh>
      {/* painel de controle CNC */}
      <group position={[2.4, 1.4, 1]} rotation={[0, -0.5, 0]}>
        <mesh material={MAT.paintDark} castShadow>
          <boxGeometry args={[0.7, 1, 0.25]} />
        </mesh>
        <mesh position={[0, 0.15, 0.13]}>
          <planeGeometry args={[0.5, 0.35]} />
          <meshStandardMaterial color="#36c5df" emissive="#1d8fb0" emissiveIntensity={0.9} />
        </mesh>
        <mesh material={MAT.steel} position={[0, -0.9, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.9]} />
        </mesh>
      </group>
      <mesh material={MAT.paintGrey} position={[-2.4, 0.6, -0.6]} castShadow>
        <boxGeometry args={[0.6, 1.2, 1]} />
      </mesh>
    </group>
  );
}

export function Press() {
  return (
    <group>
      <mesh material={MAT.darkSteel} position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 0.6, 2.4]} />
      </mesh>
      {[-1.15, 1.15].map((x) => (
        <mesh key={x} material={MAT.paintBlue} position={[x, 2.1, 0]} castShadow>
          <boxGeometry args={[0.55, 3.6, 1.8]} />
        </mesh>
      ))}
      <mesh material={MAT.paintBlue} position={[0, 4.1, 0]} castShadow>
        <boxGeometry args={[3.2, 0.8, 2]} />
      </mesh>
      <mesh material={MAT.steel} position={[0, 2.9, 0]} castShadow>
        <boxGeometry args={[1.6, 0.9, 1.3]} />
      </mesh>
      <mesh material={MAT.darkSteel} position={[0, 1.2, 0]}>
        <boxGeometry args={[1.8, 0.4, 1.5]} />
      </mesh>
      <mesh material={MAT.darkSteel} position={[1.8, 4.1, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.9, 0.9, 0.3, 28]} />
      </mesh>
      {/* cortina de luz NR-12 */}
      {[-0.9, 0.9].map((x) => (
        <mesh key={x} material={MAT.yellow} position={[x, 1.4, 1.2]}>
          <boxGeometry args={[0.08, 1.6, 0.08]} />
        </mesh>
      ))}
    </group>
  );
}

export function RobotCell() {
  const arm = useRef<THREE.Group>(null);
  const fore = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (arm.current) arm.current.rotation.y = Math.sin(t * 0.7) * 1.1;
    if (fore.current) fore.current.rotation.z = -0.9 + Math.sin(t * 1.3) * 0.35;
  });
  return (
    <group>
      {/* grade perimetral (NR-12) */}
      {[
        [0, -2.5, 6, 0],
        [0, 2.5, 6, 0],
        [-3, 0, 5, Math.PI / 2],
        [3, 0, 5, Math.PI / 2],
      ].map(([x, z, w, r], i) => (
        <group key={i} position={[x, 1, z]} rotation={[0, r, 0]}>
          <mesh>
            <boxGeometry args={[w, 2, 0.03]} />
            <meshStandardMaterial color="#e8b923" wireframe />
          </mesh>
          <mesh material={MAT.yellow} position={[0, 1, 0]}>
            <boxGeometry args={[w, 0.06, 0.06]} />
          </mesh>
        </group>
      ))}
      <mesh material={MAT.darkSteel} position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[2.6, 0.8, 1.4]} />
      </mesh>
      <group position={[-1, 0, 0]}>
        <mesh material={MAT.orange} position={[0, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.45, 0.55, 0.6, 20]} />
        </mesh>
        <group ref={arm} position={[0, 0.6, 0]}>
          <mesh material={MAT.orange} position={[0, 0.25, 0]} castShadow>
            <boxGeometry args={[0.6, 0.5, 0.6]} />
          </mesh>
          <group position={[0, 0.5, 0]} rotation={[0, 0, -0.5]}>
            <mesh material={MAT.orange} position={[0, 0.8, 0]} castShadow>
              <boxGeometry args={[0.3, 1.6, 0.35]} />
            </mesh>
            <group ref={fore} position={[0, 1.6, 0]}>
              <mesh material={MAT.orange} position={[0.7, 0, 0]} castShadow>
                <boxGeometry args={[1.4, 0.25, 0.28]} />
              </mesh>
              <mesh material={MAT.darkSteel} position={[1.5, -0.15, 0]}>
                <cylinderGeometry args={[0.08, 0.05, 0.45]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

export function AssemblyLine() {
  return (
    <group>
      <mesh material={MAT.darkSteel} position={[0, 0.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[6, 0.15, 1.1]} />
      </mesh>
      <mesh material={MAT.black} position={[0, 0.94, 0]}>
        <boxGeometry args={[5.8, 0.03, 0.9]} />
      </mesh>
      {[-2.7, -0.9, 0.9, 2.7].map((x) => (
        <mesh key={x} material={MAT.steel} position={[x, 0.4, 0]}>
          <boxGeometry args={[0.1, 0.8, 0.9]} />
        </mesh>
      ))}
      {[-1.8, 0, 1.8].map((x) => (
        <mesh key={x} material={MAT.paintBlue} position={[x, 1.15, 0]} castShadow>
          <boxGeometry args={[0.7, 0.4, 0.6]} />
        </mesh>
      ))}
      <mesh material={MAT.paintGrey} position={[0, 2.2, -0.4]}>
        <boxGeometry args={[6, 0.08, 0.08]} />
      </mesh>
      {[-2.9, 2.9].map((x) => (
        <mesh key={x} material={MAT.paintGrey} position={[x, 1.5, -0.4]}>
          <boxGeometry args={[0.08, 1.5, 0.08]} />
        </mesh>
      ))}
    </group>
  );
}

export function Booth() {
  return (
    <group>
      <mesh material={MAT.paintGrey} position={[0, 1.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[5, 3.2, 3.4]} />
      </mesh>
      <mesh material={MAT.glass} position={[0, 1.6, 1.71]}>
        <boxGeometry args={[3, 2, 0.04]} />
      </mesh>
      <mesh material={MAT.galv} position={[1.4, 3.9, -0.6]} castShadow>
        <cylinderGeometry args={[0.45, 0.45, 1.4, 20]} />
      </mesh>
      <mesh material={MAT.paintDark} position={[-1.6, 3.4, 0]}>
        <boxGeometry args={[1.2, 0.4, 2.6]} />
      </mesh>
      <mesh material={MAT.yellow} position={[2.55, 0.9, 1]}>
        <boxGeometry args={[0.1, 1.8, 0.8]} />
      </mesh>
    </group>
  );
}

export function Packer() {
  return (
    <group>
      <mesh material={MAT.paintBlue} position={[-1.5, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 2.4, 2.2]} />
      </mesh>
      <mesh material={MAT.glass} position={[-1.5, 1.4, 1.11]}>
        <boxGeometry args={[1.6, 1.2, 0.04]} />
      </mesh>
      <mesh material={MAT.darkSteel} position={[1.3, 0.75, 0]} castShadow>
        <boxGeometry args={[3.4, 0.12, 0.9]} />
      </mesh>
      {[0.4, 1.3, 2.2].map((x) => (
        <mesh key={x} position={[x, 1.05, 0]} castShadow>
          <boxGeometry args={[0.55, 0.45, 0.55]} />
          <meshStandardMaterial color="#b48a5a" roughness={0.9} />
        </mesh>
      ))}
      <mesh material={MAT.steel} position={[1.3, 0.35, 0]}>
        <boxGeometry args={[3.2, 0.7, 0.1]} />
      </mesh>
    </group>
  );
}

/** Trabalhador simplificado com EPI (capacete, colete). */
export function Worker({ seed }: { seed: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = seed + Math.sin(clock.elapsedTime * 0.4 + seed) * 0.6;
  });
  return (
    <group ref={ref}>
      <mesh material={MAT.pants} position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.36, 0.9, 0.22]} />
      </mesh>
      <mesh material={MAT.vest} position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[0.46, 0.62, 0.26]} />
      </mesh>
      <mesh material={MAT.skin} position={[0, 1.65, 0]}>
        <sphereGeometry args={[0.14, 12, 10]} />
      </mesh>
      <mesh material={MAT.yellow} position={[0, 1.75, 0]}>
        <sphereGeometry args={[0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
    </group>
  );
}
