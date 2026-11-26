// Matriz de entradas e saídas (sinais efetivamente simulados).
// Um instrumento físico pode gerar mais de um sinal (ex.: TH = temperatura + umidade).
import { SECTORS } from './constants';

export type IOType = 'DI' | 'DO' | 'AI' | 'AO';
export interface IOPoint {
  addr: string;
  type: IOType;
  tag: string;
  desc: string;
  signal: string;
  station: string;
  group: string;
}

const STATIONS = ['RIO-01', 'RIO-01', 'RIO-02', 'RIO-02', 'RIO-03', 'RIO-03'];
const raw: Omit<IOPoint, 'addr'>[] = [];
const p = (type: IOType, tag: string, desc: string, signal: string, station: string, group: string) =>
  raw.push({ type, tag, desc, signal, station, group });

// Ventilação — 24 conjuntos motor + inversor
SECTORS.forEach((s, i) => {
  (['INS', 'EXA'] as const).forEach((k) => {
    ['A', 'B'].forEach((ab) => {
      const tag = `${k}-${i + 1}${ab}`;
      const st = STATIONS[i];
      const g = 'Ventilação';
      p('DI', `IF-${tag}.RUN`, `Inversor ${tag} em funcionamento`, '24 Vcc', st, g);
      p('DI', `IF-${tag}.FLT`, `Inversor ${tag} em falha`, '24 Vcc', st, g);
      p('DI', `FS-${tag}`, `Fluxostato de ar ${tag}`, '24 Vcc', st, g);
      p('DO', `IF-${tag}.CMD`, `Comando liga/desliga ${tag}`, 'Relé 24 Vcc', st, g);
      p('AO', `IF-${tag}.SP`, `Referência de frequência ${tag} (0–60 Hz)`, '4–20 mA', st, g);
    });
  });
});

// Instrumentação ambiental
SECTORS.forEach((s, i) => {
  const st = STATIONS[i];
  const g = 'Ambiente';
  p('AI', `TT-${i + 1}`, `Temperatura ambiente ${s.code}`, '4–20 mA', st, g);
  p('AI', `HT-${i + 1}`, `Umidade relativa ${s.code}`, '4–20 mA', st, g);
  p('AI', `AQ-${i + 1}`, `CO₂ ${s.code}`, '4–20 mA', st, g);
  p('AI', `GD-${i + 1}`, `Detector multigás ${s.code} (%LIE)`, '4–20 mA', st, g);
  p('AI', `TS-${i + 1}`, `Temperatura do ar insuflado UTA-${i + 1}`, '4–20 mA', st, g);
  p('AI', `PDT-${i + 1}`, `Pressão diferencial ${s.code} × externo`, '4–20 mA', st, g);
});
p('AI', 'TT-7', 'Temperatura externa (TH-7)', '4–20 mA', 'CPU', 'Ambiente');
p('AI', 'HT-7', 'Umidade externa (TH-7)', '4–20 mA', 'CPU', 'Ambiente');

// Refrigeração
for (let i = 1; i <= 6; i++) {
  p('AO', `FCV-${i}`, `Válvula modulante de água gelada UTA-${i}`, '4–20 mA', STATIONS[i - 1], 'Refrigeração');
  p('DI', `PDS-${i}`, `Pressostato diferencial do filtro UTA-${i} (filtro saturado)`, '24 Vcc', STATIONS[i - 1], 'Refrigeração');
}
for (let i = 1; i <= 4; i++) {
  p('DI', `CH-0${i}.RUN`, `Chiller CH-0${i} em operação`, '24 Vcc', 'CPU', 'Refrigeração');
  p('DI', `CH-0${i}.FLT`, `Chiller CH-0${i} em falha`, '24 Vcc', 'CPU', 'Refrigeração');
  p('DI', `FSW-0${i}`, `Fluxostato de água do evaporador CH-0${i}`, '24 Vcc', 'CPU', 'Refrigeração');
  p('DO', `CH-0${i}.EN`, `Habilitação do chiller CH-0${i}`, 'Relé 24 Vcc', 'CPU', 'Refrigeração');
}
for (let i = 1; i <= 3; i++) {
  p('DI', `BAG-0${i}.RUN`, `Bomba BAG-0${i} em operação`, '24 Vcc', 'CPU', 'Refrigeração');
  p('DI', `BAG-0${i}.FLT`, `Bomba BAG-0${i} — relé de sobrecarga`, '24 Vcc', 'CPU', 'Refrigeração');
  p('DO', `BAG-0${i}.CMD`, `Comando da bomba BAG-0${i}`, 'Relé 24 Vcc', 'CPU', 'Refrigeração');
}
p('AI', 'TT-AGS', 'Temperatura da água gelada — ida (7 °C)', '4–20 mA', 'CPU', 'Refrigeração');
p('AI', 'TT-AGR', 'Temperatura da água gelada — retorno (12 °C)', '4–20 mA', 'CPU', 'Refrigeração');
p('AI', 'PDT-AG', 'Pressão diferencial do circuito de água gelada', '4–20 mA', 'CPU', 'Refrigeração');
p('AI', 'FT-AG', 'Vazão de água gelada', '4–20 mA', 'CPU', 'Refrigeração');

// Segurança e energia
SECTORS.forEach((s, i) => {
  const st = STATIONS[i];
  p('DI', `ES-${i + 1}`, `Botão de emergência ${s.code} (via relé de segurança)`, '24 Vcc', st, 'Segurança');
  p('DO', `SV-${i + 1}`, `Sinalizador sonoro-visual ${s.code}`, 'Relé 24 Vcc', st, 'Segurança');
  p('DO', `XV-${i + 1}`, `Válvula de isolamento de gás ${s.code}`, 'Relé 24 Vcc', st, 'Segurança');
  p('DO', `PM-${i + 1}`, `Permissivo das máquinas ${s.code}`, 'Relé 24 Vcc', st, 'Segurança');
});
p('DI', 'ES-QGBT', 'Emergência do painel principal', '24 Vcc', 'CPU', 'Segurança');
p('DI', 'KS-01', 'Relé de segurança — circuito OK', '24 Vcc', 'CPU', 'Segurança');
p('DI', 'RMF-01', 'Relé de monitoramento de fases 380 Vca', '24 Vcc', 'CPU', 'Energia');
p('DI', 'Q0.ST', 'Seccionadora geral Q0 fechada', '24 Vcc', 'CPU', 'Energia');
p('DI', 'UPS-01', 'Módulo buffer 24 Vcc em bateria', '24 Vcc', 'CPU', 'Energia');
p('DI', 'PNL-DOOR', 'Porta do painel aberta', '24 Vcc', 'CPU', 'Energia');

// Endereçamento sequencial por tipo
const counters: Record<IOType, number> = { DI: 0, DO: 0, AI: 0, AO: 0 };
const pre: Record<IOType, string> = { DI: '%I', DO: '%Q', AI: '%IW', AO: '%QW' };
export const IO_POINTS: IOPoint[] = raw.map((r) => {
  const n = counters[r.type]++;
  const addr =
    r.type === 'DI' || r.type === 'DO' ? `${pre[r.type]}${Math.floor(n / 8)}.${n % 8}` : `${pre[r.type]}${256 + n * 2}`;
  return { ...r, addr };
});

const count = (t: IOType) => IO_POINTS.filter((x) => x.type === t).length;
const DI = count('DI'),
  DO = count('DO'),
  AI = count('AI'),
  AO = count('AO');
export const MODULE_CH: Record<IOType, number> = { DI: 16, DO: 16, AI: 8, AO: 4 };
const modules = (n: number, ch: number) => Math.ceil((n * 1.2) / ch); // +20 % de reserva
export const IO_SUMMARY = {
  DI,
  DO,
  AI,
  AO,
  total: DI + DO + AI + AO,
  modules: {
    DI: modules(DI, MODULE_CH.DI),
    DO: modules(DO, MODULE_CH.DO),
    AI: modules(AI, MODULE_CH.AI),
    AO: modules(AO, MODULE_CH.AO),
  },
};

export const INSTRUMENTS = [
  { tag: 'TH-1…7', qty: 7, desc: 'Transmissor combinado de temperatura e umidade (6 setores + 1 externo)', signals: '2 AI cada', base: true },
  { tag: 'AQ-1…6', qty: 6, desc: 'Sensor de CO₂ (NDIR, 0–2000 ppm)', signals: '1 AI', base: true },
  { tag: 'GD-1…6', qty: 6, desc: 'Detector multigás (%LIE, O₂, CO, H₂S)', signals: '1 AI (%LIE simulado)', base: true },
  { tag: 'FS-…', qty: 24, desc: 'Fluxostato de ar (um por ventilador)', signals: '1 DI', base: true },
  { tag: 'TS-1…6', qty: 6, desc: 'Sensor de temperatura do ar insuflado (saída UTA)', signals: '1 AI', base: true },
  { tag: 'TT-AGS / TT-AGR', qty: 2, desc: 'Temperatura da água gelada ida/retorno', signals: '1 AI', base: false },
  { tag: 'PDT-AG', qty: 1, desc: 'Pressão diferencial do circuito hidráulico', signals: '1 AI', base: false },
  { tag: 'FT-AG', qty: 1, desc: 'Medidor de vazão de água gelada (eletromagnético)', signals: '1 AI', base: false },
  { tag: 'FSW-01…04', qty: 4, desc: 'Fluxostato de água dos evaporadores', signals: '1 DI', base: false },
  { tag: 'PDS-1…6', qty: 6, desc: 'Pressostato diferencial de filtro das UTAs', signals: '1 DI', base: false },
  { tag: 'PDT-1…6', qty: 6, desc: 'Transmissor de pressão diferencial ambiente', signals: '1 AI', base: false },
];
export const INSTR_BASE = INSTRUMENTS.filter((i) => i.base).reduce((a, i) => a + i.qty, 0);
export const INSTR_COMP = INSTRUMENTS.filter((i) => !i.base).reduce((a, i) => a + i.qty, 0);
