import { createInitialState, pushLog, type SimState } from './model';

export interface Scenario {
  id: string;
  n: number;
  title: string;
  short: string;
  explain: string;
  expected: string;
  apply: (s: SimState) => void;
}

const reset = (s: SimState) => {
  const fresh = createInitialState();
  const keep = { t: s.t, speed: s.speed, running: s.running, hist: s.hist, log: s.log, lastHist: s.lastHist };
  Object.assign(s, fresh, keep);
};

/** Remove falhas e perturbações mantendo o estado térmico atual. */
const clearFaults = (s: SimState) => {
  s.fans.forEach((f) => (f.fault = false));
  s.chillers.forEach((c) => (c.fault = false));
  s.pumps.forEach((p) => (p.fault = false));
  s.sectors.forEach((x) => {
    x.sensorFault = false;
    x.loadFactor = 1;
    x.gasIsolated = false;
    x.processOn = true;
  });
  if (!s.mains) {
    s.mains = true;
    s.restoreAt = s.t;
  }
  s.tExtTarget = 32;
  s.mode = 'auto';
};

export const SCENARIOS: Scenario[] = [
  {
    id: 'normal',
    n: 1,
    title: 'Operação normal',
    short: 'Normal',
    explain: 'Remove perturbações e falhas. Temperatura externa 32 °C, máquinas em carga nominal (200 kW), modo automático.',
    expected: 'Setores convergem para 24 °C e ~55 % UR. Ventiladores modulam próximo da frequência mínima (economia de energia), 2 chillers em operação.',
    apply: (s) => clearFaults(s),
  },
  {
    id: 'hot',
    n: 2,
    title: 'Aumento da temperatura externa',
    short: 'T. externa 38 °C',
    explain: 'A temperatura externa sobe progressivamente de 32 °C para 38 °C (0,02 °C/s).',
    expected: 'O ar externo mais quente aumenta a carga das serpentinas. O CLP abre as válvulas de água gelada e parte o 3º chiller.',
    apply: (s) => {
      s.tExtTarget = 38;
    },
  },
  {
    id: 'heat',
    n: 3,
    title: 'Aumento do calor das máquinas',
    short: 'Calor +80 %',
    explain: 'Processo em sobrecarga: carga térmica das 20 máquinas passa de 200 kW para 360 kW (fator 1,8).',
    expected: 'Temperatura interna sobe, malhas PI elevam vazão e água gelada. Sistema absorve a carga dentro da capacidade.',
    apply: (s) => s.sectors.forEach((x) => (x.loadFactor = 1.8)),
  },
  {
    id: 'supfail',
    n: 4,
    title: 'Falha de insuflador',
    short: 'Falha INS-2A',
    explain: 'O inversor do insuflador INS-2A (setor S2) entra em falha; o fluxostato confirma ausência de vazão.',
    expected: 'Alarme crítico. O parceiro INS-2B vai a 60 Hz; S2 fica em depressão (infiltração de ar quente) e aquece ligeiramente.',
    apply: (s) => {
      const f = s.fans.find((x) => x.id === 'INS-2A');
      if (f) f.fault = true;
    },
  },
  {
    id: 'exhfail',
    n: 5,
    title: 'Falha de exaustor',
    short: 'Falha EXA-3B',
    explain: 'O exaustor EXA-3B (setor S3 — soldagem) para por sobrecorrente.',
    expected: 'Alarme crítico, EXA-3A em 60 Hz. Setor pressurizado e CO₂/fumos tendem a subir; alarme de desbalanço de pressão.',
    apply: (s) => {
      const f = s.fans.find((x) => x.id === 'EXA-3B');
      if (f) f.fault = true;
    },
  },
  {
    id: 'sensor',
    n: 6,
    title: 'Falha de sensor',
    short: 'Falha TH-4',
    explain: 'O transmissor de temperatura e umidade TH-4 (setor S4) envia sinal abaixo de 3,8 mA (cabo rompido).',
    expected: 'Leitura marcada como BAD. O CLP usa valor substituto (média dos demais setores) e o controle continua estável.',
    apply: (s) => (s.sectors[3].sensorFault = true),
  },
  {
    id: 'gas',
    n: 7,
    title: 'Detecção de gás perigoso',
    short: 'Gás em S5',
    explain: 'Vazamento de vapor inflamável na cabine do setor S5 (tratamento superficial).',
    expected: '10 %LIE: purga em 60 Hz. 20 %LIE: parada do processo, válvula de gás fechada, sirene e evacuação. Ventilação NÃO é desligada.',
    apply: (s) => {
      s.scenario = 'gas';
      s.sectors[4].gasIsolated = false;
    },
  },
  {
    id: 'chfail',
    n: 8,
    title: 'Falha de chiller',
    short: 'Falha CH-01',
    explain: 'O chiller CH-01 desarma por alta pressão de condensação.',
    expected: 'Alarme crítico. O escalonamento parte o chiller reserva disponível após 30 s de partida.',
    apply: (s) => (s.chillers[0].fault = true),
  },
  {
    id: 'pumpfail',
    n: 9,
    title: 'Falha de bomba',
    short: 'Falha BAG-02',
    explain: 'A bomba de água gelada BAG-02 desarma pelo relé de sobrecarga.',
    expected: 'Vazão cai para 60 % por 5 s; a bomba reserva BAG-03 parte automaticamente e restabelece a vazão.',
    apply: (s) => (s.pumps[1].fault = true),
  },
  {
    id: 'power',
    n: 10,
    title: 'Perda da alimentação elétrica',
    short: 'Perda 380 Vca',
    explain: 'Falta de energia trifásica 380 Vca. O comando 24 Vcc permanece alimentado pelo módulo buffer/bateria.',
    expected: 'Motores, chillers e bombas param; CLP registra os eventos. Ao restaurar (cenário 1 ou 11) o religamento é escalonado.',
    apply: (s) => {
      s.mains = false;
      s.restoreAt = null;
    },
  },
  {
    id: 'reset',
    n: 11,
    title: 'Restaurar condições iniciais',
    short: 'Restaurar',
    explain: 'Restaura todas as variáveis, equipamentos e parâmetros às condições iniciais do projeto.',
    expected: 'Estado inicial: 32 °C externo, setpoint 24 °C, 2 chillers, 2 bombas, 24 ventiladores em 20 Hz.',
    apply: (s) => reset(s),
  },
];

export function applyScenario(s: SimState, id: string) {
  const sc = SCENARIOS.find((x) => x.id === id);
  if (!sc) return;
  sc.apply(s);
  if (id === 'gas') s.scenario = 'gas';
  if (id === 'normal' || id === 'reset') s.scenario = 'normal';
  pushLog(s, { t: s.t, id: 'SCN-' + id, sev: 'info', tag: 'CENÁRIO', msg: `Cenário ${sc.n}: ${sc.title}`, event: 'EVENTO' });
}
