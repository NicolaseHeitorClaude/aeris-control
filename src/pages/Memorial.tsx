import { Printer } from 'lucide-react';
import { SECTORS, WORKERS_PER_SECTOR } from '../sim/constants';
import { IO_SUMMARY, INSTRUMENTS, INSTR_BASE, INSTR_COMP, MODULE_CH } from '../sim/io';
import { BOM } from '../sim/bom';

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
            + <b>{INSTR_COMP} complementares</b> de refrigeração e pressão = <b>{INSTR_BASE + INSTR_COMP} instrumentos</b>.
          </div>
          <div>Qual CLP?</div>
          <div><b>CLP modular central</b> com CPU PROFINET (ex.: Siemens S7-1500 ou equivalente) e <b>3 estações remotas de E/S</b> (RIO-01 a RIO-03).</div>
          <div>Quantas entradas e saídas?</div>
          <div>
            <b>{IO_SUMMARY.total} sinais</b>: {IO_SUMMARY.DI} DI, {IO_SUMMARY.DO} DO, {IO_SUMMARY.AI} AI, {IO_SUMMARY.AO} AO
            (detalhados na matriz de E/S da tela CLP e sensores).
          </div>
          <div>Qual tipo de partida?</div>
          <div><b>Inversor de frequência</b> individual para cada um dos 24 motores dos ventiladores (e para as 3 bombas).</div>
          <div>Qual lista de materiais?</div>
          <div><b>{BOM.length} itens</b> agrupados em ventilação, refrigeração, instrumentação, automação, elétrica e segurança (seção 08).</div>
          <div>Quais medidas de segurança?</div>
          <div>Grades de proteção, aterramento, proteções elétricas, emergência com relé de segurança, intertravamentos de gás, monitoramento atmosférico, evacuação e bloqueio LOTO (seção 07).</div>
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
          Por setor = 2 insufladores + 2 exaustores = 120.000 m³/h → 6 ren./h em 20.000 m³
        </div>
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
          Carga sensível do ar externo (6 ren./h): ṁ = 720.000 × 1,2 ÷ 3.600 = 240 kg/s; 240 × 1,006 × (32 − 14) ≈ <span className="r">4,3 MW</span><br />
          Consumo elétrico estimado dos chillers (COP 5,2) a plena carga ≈ 6.200 ÷ 5,2 ≈ <span className="r">1.190 kW elétricos</span>
        </div>
        <div className="note">
          A capacidade de 6.200 kW é uma <b>estimativa acadêmica preliminar</b>, sujeita à validação por cálculo de carga térmica e análise psicrométrica.
          Capacidade térmica (kW de calor removido) <b>não</b> é consumo elétrico.
        </div>

        <h2><span className="num">04</span>Sistema elétrico</h2>
        <p>Circuito de força em <b>380 Vca trifásico, 60 Hz</b> (L1, L2, L3 + PE), sem neutro: motores e a fonte de comando utilizam apenas tensões de linha.
          Seccionadora geral bloqueável Q0 → DPS → disjuntores-motor → inversores → motores. Chillers com painel próprio.</p>
        <p>Circuito de comando em <b>24 Vcc</b>: fonte industrial com entrada trifásica 3 × 380–480 Vca, módulo buffer com bateria para manter CLP e sensores na falta de energia,
          relés de interface e relé de segurança. Os condutores de força e comando seguem em eletrocalhas separadas.</p>

        <h2><span className="num">05</span>Automação, CLP e matriz de E/S</h2>
        <table className="t">
          <thead><tr><th>Tipo</th><th className="n">Sinais</th><th className="n">Módulos</th><th className="n">Canais</th><th>Exemplos</th></tr></thead>
          <tbody>
            <tr><td>Entradas digitais (DI)</td><td className="n">{IO_SUMMARY.DI}</td><td className="n">{IO_SUMMARY.modules.DI}</td><td className="n">{IO_SUMMARY.modules.DI * MODULE_CH.DI}</td><td>funcionamento/falha de 24 inversores, 24 fluxostatos, chillers, bombas, emergências</td></tr>
            <tr><td>Saídas digitais (DO)</td><td className="n">{IO_SUMMARY.DO}</td><td className="n">{IO_SUMMARY.modules.DO}</td><td className="n">{IO_SUMMARY.modules.DO * MODULE_CH.DO}</td><td>comando de inversores, habilitação de chillers e bombas, sirenes, válvulas de gás, permissivos</td></tr>
            <tr><td>Entradas analógicas (AI)</td><td className="n">{IO_SUMMARY.AI}</td><td className="n">{IO_SUMMARY.modules.AI}</td><td className="n">{IO_SUMMARY.modules.AI * MODULE_CH.AI}</td><td>temperatura, umidade, CO₂, gás, ar insuflado, pressões, água gelada</td></tr>
            <tr><td>Saídas analógicas (AO)</td><td className="n">{IO_SUMMARY.AO}</td><td className="n">{IO_SUMMARY.modules.AO}</td><td className="n">{IO_SUMMARY.modules.AO * MODULE_CH.AO}</td><td>referência de 24 inversores e 6 válvulas modulantes</td></tr>
            <tr><td><b>Total</b></td><td className="n"><b>{IO_SUMMARY.total}</b></td><td className="n" /><td className="n" /><td>módulos dimensionados com ≥ 20 % de reserva</td></tr>
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
          <li><b>Intertravamentos</b>: gás ≥ 10 %LIE → purga; ≥ 20 %LIE → parada do processo, fechamento da válvula de gás e evacuação. A ventilação essencial não é desligada.</li>
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

        <div className="note">
          <b>Aviso.</b> O AERIS CONTROL é um simulador didático. Não é uma ferramenta certificada de segurança industrial, os parâmetros são didáticos
          e nenhuma parte do software se conecta a equipamentos industriais reais.
        </div>
        <p className="dim" style={{ fontSize: 12 }}>AERIS Automação Industrial · AERIS CONTROL</p>
      </article>
    </div>
  );
}
