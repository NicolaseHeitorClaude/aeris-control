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
    // O intertravamento de gás NÃO é liberado aqui: exige rearme industrial (gasRearm).
    x.processOn = !x.gasIsolated;
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
    explain: 'Remove perturbações e falhas (representa a intervenção de manutenção, inclusive a eliminação da fonte de vazamento). Temperatura externa 32 °C, máquinas em carga nominal (200 kW), modo automático. Um intertravamento de gás atuado permanece retido até o rearme industrial.',
    expected: 'Setores estabilizam em ~23,7 °C e 55–61 % UR. Ventiladores em 20 Hz (2 ren./h, mínimo operacional; nominal 6 ren./h a 60 Hz), 2 chillers em operação.',
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
    expected: 'Alarme crítico. O parceiro INS-2B vai a 60 Hz (60.000 m³/h) contra 40.000 m³/h de exaustão em 20 Hz: S2 fica levemente pressurizado (≈ +7 Pa, abaixo do limite de alarme de 12 Pa) e recebe mais ar tratado: a temperatura cai levemente e a umidade do setor sobe, pois a válvula reduz a abertura para evitar sobre-resfriamento.',
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
    expected: 'Alarme crítico. EXA-3A vai a 60 Hz (60.000 m³/h) contra 40.000 m³/h de insuflação em 20 Hz: S3 fica em leve depressão (≈ −7 Pa, sem alarme de ΔP), com infiltração de ar externo; o CO₂ do setor diminui pelo aumento da renovação e a temperatura permanece próxima de 24 °C.',
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
    expected: '10 %LIE: purga em 60 Hz e sinalizador em alerta. 20 %LIE: parada do processo, válvula de gás fechada, sirene de evacuação (retida). Ventilação NÃO é desligada. Liberação somente por rearme na tela Alarmes, após eliminar a fonte (cenário 1) e o gás cair abaixo de 5 %LIE.',
    apply: (s) => {
      s.scenario = 'gas';
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
    expected: 'Motores, chillers e bombas param; CLP registra os eventos no buffer 24 Vcc (autonomia de 60 min: hipótese acadêmica). O cenário 1 restabelece a energia com religamento escalonado.',
    apply: (s) => {
      s.mains = false;
      s.restoreAt = null;
    },
  },
  {
    id: 'reset',
    n: 11,
    title: 'Restaurar condições iniciais',
    short: 'Reset demo',
    explain: 'Reset da DEMONSTRAÇÃO: reinicia o simulador nas condições iniciais do projeto, inclusive intertravamentos. Não representa um rearme industrial, que exige as condições de segurança verificadas na tela Alarmes.',
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
