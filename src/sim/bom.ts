import { IO_SUMMARY, INSTR_BASE, INSTR_COMP } from './io';

export interface BomItem {
  item: string;
  qty: number;
  un: string;
  spec: string;
  group: string;
}

export const BOM: BomItem[] = [
  // Ventilação
  { group: 'Ventilação', item: 'Insuflador axial com carcaça, grade e base', qty: 12, un: 'pç', spec: '60.000 m³/h · Ø 1.250 mm · ~500 Pa' },
  { group: 'Ventilação', item: 'Exaustor axial de cobertura com grade e chapéu', qty: 12, un: 'pç', spec: '60.000 m³/h · Ø 1.250 mm' },
  { group: 'Ventilação', item: 'Motor de indução trifásico IE3', qty: 24, un: 'pç', spec: '15 kW · 380 V · 60 Hz · 6 polos · IP55' },
  { group: 'Ventilação', item: 'Inversor de frequência', qty: 24, un: 'pç', spec: '15 kW · 3 × 380 V · STO · entrada 4–20 mA' },
  { group: 'Ventilação', item: 'Dutos galvanizados com difusores', qty: 12, un: 'cj', spec: '1.600 × 1.200 mm · 38 m · 6 difusores' },
  { group: 'Ventilação', item: 'Filtros de ar (pré G4 + fino F7)', qty: 12, un: 'cj', spec: 'por insuflador' },
  // Refrigeração
  { group: 'Refrigeração', item: 'Chiller de condensação a ar', qty: 4, un: 'pç', spec: '1.550 kW térmicos (≈ 441 TR) · água 7/12 °C' },
  { group: 'Refrigeração', item: 'Unidade de tratamento de ar (UTA)', qty: 6, un: 'pç', spec: 'serpentina de água gelada · ~1.150 kW máx.' },
  { group: 'Refrigeração', item: 'Bomba centrífuga de água gelada', qty: 3, un: 'pç', spec: '533 m³/h · 37 kW · 2 operação + 1 reserva' },
  { group: 'Refrigeração', item: 'Inversor para bomba', qty: 3, un: 'pç', spec: '37 kW · 3 × 380 V' },
  { group: 'Refrigeração', item: 'Válvula de controle modulante com atuador', qty: 6, un: 'pç', spec: '2 vias · 4–20 mA · 24 Vcc' },
  { group: 'Refrigeração', item: 'Tubulação de água gelada isolada', qty: 1, un: 'vb', spec: 'aço carbono, isolamento elastomérico, ida e retorno' },
  { group: 'Refrigeração', item: 'Tanque de expansão, válvulas de bloqueio e filtros Y', qty: 1, un: 'cj', spec: 'circuito primário' },
  // Instrumentação
  { group: 'Instrumentação', item: 'Transmissor de temperatura e umidade', qty: 7, un: 'pç', spec: '4–20 mA · 0–50 °C / 0–100 % UR' },
  { group: 'Instrumentação', item: 'Sensor de CO₂ (NDIR)', qty: 6, un: 'pç', spec: '0–2.000 ppm · 4–20 mA' },
  { group: 'Instrumentação', item: 'Detector multigás fixo', qty: 6, un: 'pç', spec: '%LIE, O₂, CO, H₂S · 4–20 mA' },
  { group: 'Instrumentação', item: 'Fluxostato de ar', qty: 24, un: 'pç', spec: 'contato seco 24 Vcc' },
  { group: 'Instrumentação', item: 'Sensor de temperatura de ar insuflado', qty: 6, un: 'pç', spec: 'Pt100 com transmissor 4–20 mA' },
  { group: 'Instrumentação', item: 'Transmissor de temperatura de água gelada', qty: 2, un: 'pç', spec: 'ida / retorno · 4–20 mA' },
  { group: 'Instrumentação', item: 'Transmissor de pressão diferencial (água)', qty: 1, un: 'pç', spec: '0–250 kPa · 4–20 mA' },
  { group: 'Instrumentação', item: 'Medidor de vazão eletromagnético', qty: 1, un: 'pç', spec: 'DN 300 · 4–20 mA' },
  { group: 'Instrumentação', item: 'Fluxostato de água (evaporador)', qty: 4, un: 'pç', spec: 'contato seco' },
  { group: 'Instrumentação', item: 'Pressostato diferencial de filtro', qty: 6, un: 'pç', spec: '50–500 Pa · contato seco' },
  { group: 'Instrumentação', item: 'Transmissor de pressão diferencial ambiente', qty: 6, un: 'pç', spec: '±50 Pa · 4–20 mA' },
  // Automação
  { group: 'Automação', item: 'CLP modular — CPU com PROFINET', qty: 1, un: 'pç', spec: 'ex.: Siemens S7-1500 (CPU 1515-2 PN) ou equivalente' },
  { group: 'Automação', item: 'Estação remota de E/S (interface PROFINET)', qty: 3, un: 'pç', spec: 'ex.: ET 200SP ou equivalente' },
  { group: 'Automação', item: 'Módulo de entradas digitais 16 canais 24 Vcc', qty: IO_SUMMARY.modules.DI, un: 'pç', spec: `${IO_SUMMARY.DI} DI + 20 % reserva` },
  { group: 'Automação', item: 'Módulo de saídas digitais 16 canais 24 Vcc', qty: IO_SUMMARY.modules.DO, un: 'pç', spec: `${IO_SUMMARY.DO} DO + 20 % reserva` },
  { group: 'Automação', item: 'Módulo de entradas analógicas 8 canais 4–20 mA', qty: IO_SUMMARY.modules.AI, un: 'pç', spec: `${IO_SUMMARY.AI} AI + 20 % reserva` },
  { group: 'Automação', item: 'Módulo de saídas analógicas 4 canais 4–20 mA', qty: IO_SUMMARY.modules.AO, un: 'pç', spec: `${IO_SUMMARY.AO} AO + 20 % reserva` },
  { group: 'Automação', item: 'Switch industrial gerenciável', qty: 4, un: 'pç', spec: 'PROFINET · anel MRP' },
  { group: 'Automação', item: 'IHM / estação de supervisão', qty: 1, un: 'pç', spec: 'AERIS CONTROL' },
  // Elétrica
  { group: 'Elétrica', item: 'Painel geral (QGBT / CCM) com placa de montagem', qty: 1, un: 'cj', spec: '380 Vca 3F + PE · IP54' },
  { group: 'Elétrica', item: 'Painel de estação remota', qty: 3, un: 'pç', spec: 'IP65 · 24 Vcc' },
  { group: 'Elétrica', item: 'Seccionadora geral sob carga, bloqueável', qty: 1, un: 'pç', spec: 'tripolar · cadeado LOTO' },
  { group: 'Elétrica', item: 'Dispositivo de proteção contra surtos (DPS)', qty: 1, un: 'cj', spec: 'classe II · 3 polos + PE' },
  { group: 'Elétrica', item: 'Disjuntor-motor / disjuntor de alimentador', qty: 32, un: 'pç', spec: '24 ventiladores + 3 bombas + 4 chillers + 1 fonte' },
  { group: 'Elétrica', item: 'Fonte industrial 24 Vcc, entrada trifásica', qty: 1, un: 'pç', spec: '3 × 380–480 Vca → 24 Vcc / 40 A' },
  { group: 'Elétrica', item: 'Módulo buffer / UPS 24 Vcc com bateria', qty: 1, un: 'pç', spec: 'autonomia ~60 min para CLP e sensores' },
  { group: 'Elétrica', item: 'Relé de interface 24 Vcc', qty: IO_SUMMARY.DO, un: 'pç', spec: 'uma por saída digital' },
  { group: 'Elétrica', item: 'Relé de monitoramento de fases', qty: 1, un: 'pç', spec: 'falta / sequência de fases 380 V' },
  { group: 'Elétrica', item: 'Bornes, canaletas, trilhos DIN, identificação', qty: 1, un: 'vb', spec: 'conforme projeto executivo' },
  { group: 'Elétrica', item: 'Cabos de força e de sinal blindados', qty: 1, un: 'vb', spec: 'cabos blindados para inversores e 4–20 mA' },
  // Segurança
  { group: 'Segurança', item: 'Relé de segurança', qty: 1, un: 'pç', spec: 'dois canais · monitoramento de emergência' },
  { group: 'Segurança', item: 'Botão de parada de emergência', qty: 7, un: 'pç', spec: '6 setores + painel principal' },
  { group: 'Segurança', item: 'Sinalizador sonoro-visual', qty: 6, un: 'pç', spec: 'um por setor' },
  { group: 'Segurança', item: 'Válvula solenoide de isolamento de gás', qty: 6, un: 'pç', spec: 'normalmente fechada · 24 Vcc' },
  { group: 'Segurança', item: 'Kit de bloqueio e etiquetagem (LOTO)', qty: 6, un: 'cj', spec: 'cadeados, etiquetas, garras' },
  { group: 'Segurança', item: 'Sinalização de segurança e rotas de fuga', qty: 1, un: 'vb', spec: 'placas, faixas de piso, iluminação de emergência' },
  { group: 'Segurança', item: 'Malha de aterramento e equipotencialização', qty: 1, un: 'vb', spec: 'PE de carcaças, estruturas e painéis' },
];

export const BOM_TOTALS = { items: BOM.length, instruments: INSTR_BASE + INSTR_COMP };
