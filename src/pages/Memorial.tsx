import { Printer } from 'lucide-react';
import { SECTORS, WORKERS_PER_SECTOR } from '../sim/constants';
import { IO_SUMMARY, INSTRUMENTS, INSTR_BASE, INSTR_COMP, MODULE_CH } from '../sim/io';
import { BOM } from '../sim/bom';
import { wFrom, MODEL } from '../sim/model';

const nf = (v: number, d = 0) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

/** Carga da serpentina com 100 % de ar externo levado a 14 °C (mesmas equações do motor de simulação). */
function coilLoad(tExt: number, ach: number) {
  const m = (120000 * ach * MODEL.rho) / 3600; // kg/s
  const wsa = 0.95 * wFrom(14, 100);
  const sens = m * MODEL.cp * (tExt - 14);
  const lat = m * MODEL.hfg * Math.max(0, wFrom(tExt, 45) - wsa);
  return { m, sens, lat, total: sens + lat };
}
const LOAD_CASES = [
  { t: 32, ach: 2, l: '32 °C / 45 % · 2 ren./h (20 Hz) — operação normal simulada' },
  { t: 32, ach: 6, l: '32 °C / 45 % · 6 ren./h (60 Hz) — renovação nominal' },
  { t: 38, ach: 2, l: '38 °C / 45 % · 2 ren./h (20 Hz)' },
  { t: 38, ach: 6, l: '38 °C / 45 % · 6 ren./h (60 Hz)' },
].map((c) => ({ ...c, ...coilLoad(c.t, c.ach) }));
const INTERNAL = {
  machines: 200,
  people: 30 * MODEL.personKW,
  lighting: 6 * MODEL.lightingKW,
  solar: 6 * MODEL.solar,
  envelope: 6 * MODEL.UA * (32 - 24),
};
const INTERNAL_TOTAL = Object.values(INTERNAL).reduce((a, b) => a + b, 0);
const LATENT_INT = MODEL.moistKgS.reduce((a, b) => a + b, 0) * MODEL.hfg + 30 * 0.00006 * MODEL.hfg;

function Layout() {
  return (
    <svg viewBox="0 0 640 340" style={{ width: '100%', height: 'auto', margin: '8px 0' }}>
      <style>{`text{font-family:'IBM Plex Mono';font-size:10.5px;fill:#9eb2c4}`}</style>
      <rect x={20} y={40} width={600} height={260} fill="#0c1d2f" stroke="#36c5df" />
      {SECTORS.map((d) => {
        const col = d.id % 3;
        const row = d.id < 3 ? 0 : 1;
        const x = 20 + col * 200;
        const y = 40 + row * 130;
        return (
          <g key={d.id}>
            <rect x={x} y={y} width={200} height={130} fill="none" stroke="#27445f" />
            <text x={x + 10} y={y + 22} style={{ fill: '#f4f7fa', fontSize: 12 }}>{d.code} · {d.name}</text>
            <text x={x + 10} y={y + 40}>{d.machines} máquinas · {WORKERS_PER_SECTOR[d.id]} pessoas</text>
            <text x={x + 10} y={y + 56}>2 INS + 2 EXA · UTA-{d.id + 1}</text>
            {[0, 1].map((k) => (
              <g key={k}>
                <rect x={x + 60 + k * 70} y={row === 0 ? y - 12 : y + 130} width={20} height={12} fill="#0088cc" />
                <circle cx={x + 50 + k * 100} cy={y + 90 + (row === 0 ? 10 : -30)} r={8} fill="none" stroke="#ff8a3d" />
              </g>
            ))}
          </g>
        );
      })}
      <text x={20} y={24}>200 m</text>
      <text x={590} y={322}>100 m</text>
      <rect x={30} y={318} width={12} height={10} fill="#0088cc" />
      <text x={48} y={327}>insuflador (parede) + UTA externa</text>
      <circle cx={300} cy={323} r={6} fill="none" stroke="#ff8a3d" />
      <text x={312} y={327}>exaustor (cobertura)</text>
    </svg>
  );
}

export default function Memorial() {
  return (
    <div className="page">
      <article className="doc">
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn" onClick={() => window.print()}>
            <Printer size={14} /> Imprimir / salvar PDF
          </button>
        </div>
        <div className="doc-head">
          <div>
            <div className="mono" style={{ color: '#36c5df', fontSize: 11, letterSpacing: '.16em' }}>MEMORIAL TÉCNICO DESCRITIVO · REV. 0</div>
            <h1>Sistema automatizado de ventilação, exaustão e refrigeração industrial</h1>
            <p className="lead">AERIS CONTROL — solução de supervisão e controle para galpão industrial de 20.000 m² com 6 setores produtivos. Documento acadêmico com premissas didáticas.</p>
          </div>
          <img src="./brand/aeris-horizontal.png" alt="AERIS Automação Industrial" className="screen-only" />
        </div>
        <div className="doc-meta">
          <div><div className="l">Área</div><div className="v">20.000 m²</div></div>
          <div><div className="l">Volume</div><div className="v">120.000 m³</div></div>
          <div><div className="l">Vazão nominal</div><div className="v">720.000 m³/h</div></div>
          <div><div className="l">Refrigeração</div><div className="v">6.200 kW</div></div>
        </div>

        <h2><span className="num">00</span>Respostas diretas da avaliação</h2>
        <div className="answer">
          <div>Quantos exaustores?</div>
          <div><b>12 exaustores</b> axiais de cobertura, 2 por setor, 60.000 m³/h cada.</div>
          <div>Quantos insufladores?</div>
          <div><b>12 insufladores</b> axiais, 2 por setor, 60.000 m³/h cada, associados às 6 UTAs.</div>
          <div>Quantos e quais sensores?</div>
          <div>
            <b>{INSTR_BASE} instrumentos da especificação</b> (7 temperatura/umidade, 6 CO₂, 6 multigás, 24 fluxostatos de ar, 6 temperatura de ar insuflado)
            + <b>{INSTR_COMP} complementares</b> de refrigeração e pressão = <b>{INSTR_BASE + INSTR_COMP} instrumentos</b>, que geram <b>{IO_SUMMARY.instrumentSignals} sinais</b>. Detector multigás previsto para %LIE, O₂, CO e H₂S; a simulação trata somente %LIE.
          </div>
          <div>Qual CLP?</div>
          <div><b>CLP modular central</b> com CPU PROFINET (ex.: Siemens S7-1500 ou equivalente) e <b>3 estações remotas de E/S</b> (RIO-01 a RIO-03).</div>
          <div>Quantas entradas e saídas?</div>
          <div>
            <b>{IO_SUMMARY.total} sinais</b>: {IO_SUMMARY.DI} DI, {IO_SUMMARY.DO} DO, {IO_SUMMARY.AI} AI, {IO_SUMMARY.AO} AO
            ({IO_SUMMARY.instrumentSignals} de instrumentação + {IO_SUMMARY.otherSignals} de inversores, chillers, bombas, segurança e energia), em {IO_SUMMARY.modules.DI} módulos DI,
            {IO_SUMMARY.modules.DO} DO, {IO_SUMMARY.modules.AI} AI e {IO_SUMMARY.modules.AO} AO, com reserva de 20 % em cada estação.
          </div>
          <div>Qual tipo de partida?</div>
          <div><b>Inversor de frequência</b> individual para cada um dos 24 motores dos ventiladores (e para as 3 bombas).</div>
          <div>Qual lista de materiais?</div>
          <div><b>{BOM.length} itens</b> agrupados em ventilação, refrigeração, instrumentação, automação, elétrica e segurança (seção 08).</div>
          <div>Quais medidas de segurança?</div>
          <div>Grades de proteção, aterramento, proteções elétricas, emergência com relé de segurança, intertravamentos de gás com rearme condicionado, monitoramento atmosférico, evacuação e bloqueio LOTO (seção 07). Limitações não validadas na seção 10.</div>
        </div>

        <h2><span className="num">01</span>Premissas acadêmicas</h2>
        <ul>
          <li>Galpão de 200 × 100 × 6 m, cobertura e paredes termoacústicas.</li>
          <li>30 trabalhadores; 20 máquinas de 10 kW (200 kW); 6 setores.</li>
          <li>Temperatura externa inicial 32 °C; interna desejada 24 °C; umidade desejada 55 %.</li>
          <li>Taxa de renovação nominal <b>6 renovações/h</b> e vazão de <b>60.000 m³/h por ventilador</b> são <b>hipóteses acadêmicas</b>.</li>
          <li>Força 380 Vca trifásico 60 Hz sem neutro; comando 24 Vcc.</li>
        </ul>
        <Layout />

        <h2><span className="num">02</span>Cálculo da ventilação</h2>
        <div className="calc">
          Área = 200 × 100 = <span className="r">20.000 m²</span><br />
          Volume = 200 × 100 × 6 = <span className="r">120.000 m³</span><br />
          Vazão nominal = 120.000 m³ × 6 ren./h = <span className="r">720.000 m³/h</span><br />
          Insufladores = 720.000 ÷ 60.000 = <span className="r">12</span><br />
          Exaustores = 720.000 ÷ 60.000 = <span className="r">12</span> (mesma vazão, equilíbrio de pressão)<br />
          Por setor = 2 insufladores + 2 exaustores = 120.000 m³/h → 6 ren./h em 20.000 m³ (a 60 Hz)<br />
          Mínimo operacional (20 Hz) = 12 × 20.000 = <span className="r">240.000 m³/h → 2 ren./h</span>
        </div>
        <table className="t" style={{ marginTop: 10 }}>
          <thead><tr><th>Condição</th><th className="n">Frequência</th><th className="n">Vazão total</th><th className="n">Renovação</th><th>Uso</th></tr></thead>
          <tbody>
            <tr><td><b>Nominal (capacidade de projeto)</b></td><td className="n">60 Hz</td><td className="n">720.000 m³/h</td><td className="n">6 /h</td><td>Dimensiona 12 insufladores + 12 exaustores; usada na purga de gás e na compensação de falha</td></tr>
            <tr><td><b>Operação normal simulada</b></td><td className="n">20 Hz</td><td className="n">240.000 m³/h</td><td className="n">2 /h</td><td>Mínimo operacional; o controle PI estabiliza nesse ponto na condição de 32 °C</td></tr>
          </tbody>
        </table>
        <div className="note">
          A insuflação e a exaustão <b>não são somadas</b> para determinar a renovação: o mesmo ar que entra é o que sai. A renovação é 720.000 / 120.000 = 6 /h, e não 12 /h.
        </div>

        <h2><span className="num">03</span>Refrigeração</h2>
        <table className="t">
          <thead><tr><th>Equipamento</th><th className="n">Qtd.</th><th>Característica</th></tr></thead>
          <tbody>
            <tr><td>Chillers</td><td className="n">4</td><td>1.550 kW térmicos cada → 6.200 kW instalados (≈ 1.763 TR)</td></tr>
            <tr><td>Unidades de tratamento de ar</td><td className="n">6</td><td>uma por setor, filtro G4 + F7 e serpentina de água gelada</td></tr>
            <tr><td>Bombas de circulação</td><td className="n">3</td><td>2 em operação + 1 reserva com comutação automática</td></tr>
            <tr><td>Válvulas modulantes</td><td className="n">6</td><td>4–20 mA, uma por UTA</td></tr>
            <tr><td>Água gelada</td><td className="n">—</td><td>fornecimento 7 °C, retorno 12 °C (ΔT = 5 K)</td></tr>
          </tbody>
        </table>
        <div className="calc" style={{ marginTop: 10 }}>
          Vazão de água = Q ÷ (cp · ΔT) = 6.200 ÷ (4,186 × 5) ≈ <span className="r">296 kg/s ≈ 1.067 m³/h</span> → 533 m³/h por bomba em operação<br />
          Consumo elétrico estimado dos chillers (COP 5,2) a plena carga ≈ 6.200 ÷ 5,2 ≈ <span className="r">1.190 kW elétricos</span>
        </div>
        <h3>Ganhos internos e de envoltória (hipóteses do modelo, 32 °C externo / 24 °C interno)</h3>
        <table className="t">
          <thead><tr><th>Parcela</th><th>Hipótese</th><th className="n">kW</th></tr></thead>
          <tbody>
            <tr><td>Máquinas</td><td>20 × 10 kW</td><td className="n">{nf(INTERNAL.machines, 1)}</td></tr>
            <tr><td>Pessoas</td><td>30 × 0,12 kW sensível</td><td className="n">{nf(INTERNAL.people, 1)}</td></tr>
            <tr><td>Iluminação</td><td>6 × 20 kW (~6 W/m²)</td><td className="n">{nf(INTERNAL.lighting, 1)}</td></tr>
            <tr><td>Radiação na cobertura</td><td>6 × 45 kW</td><td className="n">{nf(INTERNAL.solar, 1)}</td></tr>
            <tr><td>Envoltória</td><td>6 × 2,5 kW/K × 8 K</td><td className="n">{nf(INTERNAL.envelope, 1)}</td></tr>
            <tr><td><b>Sensível interno + envoltória</b></td><td /><td className="n"><b>{nf(INTERNAL_TOTAL, 1)}</b></td></tr>
            <tr><td>Latente interno</td><td>vapor de processo + pessoas</td><td className="n">{nf(LATENT_INT, 1)}</td></tr>
          </tbody>
        </table>
        <h3>Carga das serpentinas — sensível e latente (100 % de ar externo levado a 14 °C)</h3>
        <table className="t">
          <thead><tr><th>Condição</th><th className="n">Ar (kg/s)</th><th className="n">Sensível</th><th className="n">Latente</th><th className="n">Total</th><th className="n">× 6.200 kW</th></tr></thead>
          <tbody>
            {LOAD_CASES.map((c) => (
              <tr key={c.l}>
                <td>{c.l}</td>
                <td className="n">{nf(c.m)}</td>
                <td className="n">{nf(c.sens)} kW</td>
                <td className="n">{nf(c.lat)} kW</td>
                <td className="n"><b>{nf(c.total)} kW</b></td>
                <td className={'n ' + (c.total > 6200 ? 'crit' : 'ok')}>{c.total > 6200 ? `falta ${nf(c.total - 6200)}` : `sobra ${nf(6200 - c.total)}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="calc" style={{ marginTop: 10 }}>
          Sensível = ṁ · 1,006 · (T<sub>ext</sub> − 14) · Latente = ṁ · 2.450 · (w<sub>ext</sub> − w<sub>ins</sub>) · w<sub>ins</sub> = 0,95 · w<sub>sat</sub>(14 °C)<br />
          Ar necessário para os ganhos internos com insuflação a 14 °C: {nf(INTERNAL_TOTAL, 0)} ÷ (1,006 × 10) ≈ <span className="r">{nf(INTERNAL_TOTAL / 10.06, 0)} kg/s ≈ {nf((INTERNAL_TOTAL / 10.06 / 1.2) * 3600 / 120000, 1)} ren./h</span>
        </div>
        <div className="note">
          <b>Limitação dos 6.200 kW instalados.</b> Com 100 % de ar externo, a carga da serpentina depende da vazão de ar externo, e não dos ganhos internos.
          A 32 °C, a renovação nominal de 6 ren./h com desumidificação exige ≈ {nf(LOAD_CASES[1].total)} kW, acima dos 6.200 kW instalados; a 38 °C, ≈ {nf(LOAD_CASES[3].total)} kW.
          O sistema só atende 24 °C / 55 % porque opera a 2 ren./h (≈ {nf(LOAD_CASES[0].total)} kW). Para operar continuamente a 6 ren./h seria preciso
          recirculação parcial nas UTAs, recuperação de energia ou maior capacidade de refrigeração. Em purga de gás (60 Hz) a umidade do setor pode subir acima de 70 %.
        </div>
        <div className="note">
          A capacidade de 6.200 kW é uma <b>estimativa acadêmica preliminar</b>, sujeita à validação por cálculo de carga térmica e análise psicrométrica.
          Capacidade térmica (kW de calor removido) <b>não</b> é consumo elétrico.
        </div>

        <h2><span className="num">04</span>Sistema elétrico</h2>
        <p>Circuito de força em <b>380 Vca trifásico, 60 Hz</b> (L1, L2, L3 + PE), sem neutro: motores e a fonte de comando utilizam apenas tensões de linha.
          Seccionadora geral bloqueável Q0 → DPS → disjuntores-motor → inversores → motores. Chillers com painel próprio.</p>
        <p>Circuito de comando em <b>24 Vcc</b>: fonte industrial com entrada trifásica 3 × 380–480 Vca, módulo buffer com bateria para manter CLP e sensores na falta de energia (autonomia de ~60 min adotada como hipótese acadêmica, sem dimensionamento em Ah),
          relés de interface e relé de segurança. Os condutores de força e comando seguem em eletrocalhas separadas.</p>

        <h2><span className="num">05</span>Automação, CLP e matriz de E/S</h2>
        <table className="t">
          <thead><tr><th>Tipo</th><th className="n">Sinais</th><th className="n">Módulos (soma por estação)</th><th className="n">Canais</th><th>Exemplos</th></tr></thead>
          <tbody>
            <tr><td>Entradas digitais (DI)</td><td className="n">{IO_SUMMARY.DI}</td><td className="n">{IO_SUMMARY.modules.DI}</td><td className="n">{IO_SUMMARY.modules.DI * MODULE_CH.DI}</td><td>funcionamento/falha de 24 inversores, 24 fluxostatos, chillers, bombas, emergências</td></tr>
            <tr><td>Saídas digitais (DO)</td><td className="n">{IO_SUMMARY.DO}</td><td className="n">{IO_SUMMARY.modules.DO}</td><td className="n">{IO_SUMMARY.modules.DO * MODULE_CH.DO}</td><td>comando de inversores, habilitação de chillers e bombas, sirenes, válvulas de gás, permissivos</td></tr>
            <tr><td>Entradas analógicas (AI)</td><td className="n">{IO_SUMMARY.AI}</td><td className="n">{IO_SUMMARY.modules.AI}</td><td className="n">{IO_SUMMARY.modules.AI * MODULE_CH.AI}</td><td>temperatura, umidade, CO₂, gás, ar insuflado, pressões, água gelada</td></tr>
            <tr><td>Saídas analógicas (AO)</td><td className="n">{IO_SUMMARY.AO}</td><td className="n">{IO_SUMMARY.modules.AO}</td><td className="n">{IO_SUMMARY.modules.AO * MODULE_CH.AO}</td><td>referência de 24 inversores e 6 válvulas modulantes</td></tr>
            <tr><td><b>Total</b></td><td className="n"><b>{IO_SUMMARY.total}</b></td><td className="n" /><td className="n" /><td>+20 % de reserva aplicada em cada estação (RIO-01 a 03 e CPU)</td></tr>
          </tbody>
        </table>
        <h3>Instrumentação</h3>
        <table className="t">
          <thead><tr><th>Tag</th><th className="n">Qtd.</th><th>Descrição</th><th>Sinais</th></tr></thead>
          <tbody>
            {INSTRUMENTS.map((i) => (
              <tr key={i.tag}><td className="mono">{i.tag}</td><td className="n">{i.qty}</td><td>{i.desc}</td><td>{i.signals}</td></tr>
            ))}
          </tbody>
        </table>
        <h3>Estratégia de controle</h3>
        <ul>
          <li>PI de temperatura por setor atuando na frequência dos ventiladores (20–60 Hz).</li>
          <li>PI de umidade atuando na válvula de água gelada (desumidificação), com reforço de temperatura e limitação contra sobre-resfriamento.</li>
          <li>Escalonamento automático dos chillers por demanda; bomba reserva com comutação automática.</li>
          <li>Compensação de falha de ventilador (parceiro a 60 Hz) e valor substituto para sensor em falha.</li>
        </ul>

        <h2><span className="num">06</span>Tipo de partida</h2>
        <p>Foi adotado <b>inversor de frequência</b> para cada motor: controle de velocidade, ajuste de vazão, partida gradual, controle individual,
          monitoramento e economia de energia (P ∝ n³). Partida direta e reversora não variam a velocidade e geram corrente de 6–8 × In;
          estrela-triângulo reduz a corrente, mas sem controle de vazão; soft-starter suaviza apenas a partida.</p>

        <h2><span className="num">07</span>Segurança (NR-10, NR-12, NR-33)</h2>
        <ul>
          <li><b>Proteções mecânicas e grades</b> nas hélices de insufladores e exaustores, grades perimetrais em células robotizadas e cortinas de luz em prensas (NR-12).</li>
          <li><b>Aterramento</b> e equipotencialização de carcaças, painéis e estruturas; <b>proteções elétricas</b>: seccionadora, DPS, disjuntores, proteções dos inversores (NR-10).</li>
          <li><b>Sinalização</b> de segurança, demarcação de piso e sinalizadores sonoro-visuais por setor.</li>
          <li><b>Parada de emergência</b> em cada setor e no painel, com relé de segurança e função STO.</li>
          <li><b>Intertravamentos</b>: gás ≥ 10 %LIE → purga a 60 Hz e sinalizador em alerta; ≥ 20 %LIE → parada do processo, fechamento da válvula de gás, sirene de evacuação retida. A ventilação essencial não é desligada.</li>
          <li><b>Rearme após gás</b>: manual e condicionado — fonte eliminada, gás &lt; 5 %LIE, CLP em RUN e 380 Vca presentes. O reset da demonstração (cenário 11) reinicia o simulador e <b>não</b> equivale a rearme industrial.</li>
          <li><b>Monitoramento atmosférico simulado</b>: somente %LIE. O monitoramento multigás completo (O₂, CO, H₂S) está previsto na lista de materiais, mas não é simulado nem consta na matriz de E/S.</li>
          <li><b>Monitoramento atmosférico</b> contínuo (multigás, CO₂) e <b>rotas de evacuação</b> sinalizadas.</li>
          <li><b>Bloqueio para manutenção (LOTO)</b> na seccionadora e nos alimentadores.</li>
        </ul>
        <div className="note">
          A classificação formal de um ambiente como <b>espaço confinado</b> depende dos critérios da NR-33 (aberturas limitadas, ventilação insuficiente, não destinado à ocupação contínua);
          um galpão ventilado normalmente não se enquadra, mas dutos, UTAs e reservatórios podem se enquadrar durante manutenção.
        </div>

        <h2><span className="num">08</span>Lista de materiais (resumo)</h2>
        <table className="t">
          <thead><tr><th>Grupo</th><th>Item</th><th className="n">Qtd.</th><th>Especificação</th></tr></thead>
          <tbody>
            {BOM.map((b) => (
              <tr key={b.item}><td className="muted">{b.group}</td><td>{b.item}</td><td className="n">{b.qty} {b.un}</td><td className="muted">{b.spec}</td></tr>
            ))}
          </tbody>
        </table>

        <h2><span className="num">09</span>Modelo térmico da simulação</h2>
        <p>Cada setor (20.000 m³) é tratado como volume de mistura perfeita, integrado a cada 1 s simulado:</p>
        <div className="calc">
          C · dT/dt = Q<sub>int</sub> + UA·(T<sub>ext</sub> − T) + Q<sub>sol</sub> − ṁ·cp·(T − T<sub>ins</sub>) + ṁ<sub>inf</sub>·cp·(T<sub>ext</sub> − T)<br />
          C = 6 × massa de ar × cp ≈ 145 MJ/K · UA = 2,5 kW/K · Q<sub>sol</sub> = 45 kW · Q<sub>int</sub> = máquinas + 0,12 kW/pessoa + 20 kW iluminação<br />
          Umidade: balanço da razão de umidade (Magnus-Tetens); CO₂ e gás: diluição pela vazão de renovação.
        </div>
        <p>A lógica de controle é determinística (sem números aleatórios). As temperaturas variam progressivamente conforme a capacitância térmica.</p>

        <h2><span className="num">10</span>Limitações de segurança e engenharia não validadas</h2>
        <h3>Segurança</h3>
        <ul>
          <li>Equipamentos no fluxo de purga (exaustores, motores, inversores, iluminação) sem especificação para atmosfera explosiva (ABNT NBR IEC 60079); classificação de áreas e NR-20 não avaliadas.</li>
          <li>Purga com insuflação igual à exaustão: o setor contaminado não é mantido em depressão; setores vizinhos não são purgados nem evacuados.</li>
          <li>Intertravamento de gás executado pelo CLP de processo; sem central de gás ou CLP de segurança independente; sem diagnóstico de falha nem redundância dos detectores.</li>
          <li>Um detector por setor (≈ 3.333 m²); localização e quantidade dependem de estudo de dispersão junto às fontes.</li>
          <li>Somente %LIE é simulado; O₂, CO e H₂S previstos exigem 4 canais ou comunicação digital por detector.</li>
          <li>Categoria/PL da parada de emergência e sua atuação sobre a ventilação dependem de análise de risco NR-12.</li>
          <li>Botões de emergência, relé de segurança, seccionadora, porta do painel e filtros têm sinais estáticos na simulação (16 DI).</li>
        </ul>
        <h3>Engenharia</h3>
        <ul>
          <li>6 ren./h é a capacidade nominal; a operação normal simulada é 2 ren./h. A capacidade de 6.200 kW não atende 6 ren./h com desumidificação (seção 03).</li>
          <li>Autonomia de ~60 min do módulo buffer 24 Vcc é <b>hipótese acadêmica</b>: carga de 24 Vcc e capacidade da bateria (Ah) não dimensionadas.</li>
          <li>COP 5,2 é otimista para chiller de condensação a ar (faixa usual ≈ 2,8–3,5); o consumo elétrico pode ser maior.</li>
          <li>Iluminação e cargas monofásicas sem alimentação definida no sistema sem neutro (transformador não previsto).</li>
          <li>Válvulas de 2 vias com bombas de rotação fixa: bypass ou controle de pressão diferencial não previstos.</li>
          <li>Operação contínua dos motores a 20 Hz depende de confirmação do fabricante (ventilação do motor).</li>
          <li>Modelo térmico de mistura perfeita, sem troca entre setores, sem curvas reais de ventiladores, bombas e chillers.</li>
        </ul>

        <div className="note">
          <b>Aviso.</b> O AERIS CONTROL é um simulador didático. Não é uma ferramenta certificada de segurança industrial, os parâmetros são didáticos
          e nenhuma parte do software se conecta a equipamentos industriais reais.
        </div>
        <p className="dim" style={{ fontSize: 12 }}>AERIS Automação Industrial · AERIS CONTROL</p>
      </article>
    </div>
  );
}
