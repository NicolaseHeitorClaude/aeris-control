import { useMemo, useState } from 'react';
import { sim, useSim } from '../state/store';
import { IO_POINTS, IO_SUMMARY, IO_BY_STATION, INSTRUMENTS, INSTR_BASE, INSTR_COMP, MODULE_CH, type IOType } from '../sim/io';
import { sirenOn } from '../sim/model';
import { Panel, fmt } from '../components/ui';
import { SECTORS } from '../sim/constants';

/** Valor ao vivo de cada ponto de E/S (rastreabilidade sinal ↔ simulação). */
function liveValue(tag: string): string {
  const s = sim;
  const n = (re: RegExp): string[] | null => tag.match(re);
  let m: string[] | null;
  if ((m = n(/^IF-(INS|EXA)-(\d)([AB])\.(RUN|FLT|CMD|SP)$/))) {
    const mm = m;
    const f = s.fans.find((x) => x.id === `${mm[1]}-${mm[2]}${mm[3]}`)!;
    if (m[4] === 'RUN') return f.run ? '1' : '0';
    if (m[4] === 'FLT') return f.fault ? '1' : '0';
    if (m[4] === 'CMD') return f.cmdHz > 0 && s.plcRun ? '1' : '0';
    return `${fmt(4 + (f.cmdHz / 60) * 16, 2)} mA`;
  }
  if ((m = n(/^FS-(INS|EXA)-(\d)([AB])$/))) {
    const id = `${m[1]}-${m[2]}${m[3]}`;
    return s.fans.find((x) => x.id === id)!.flowOk ? '1' : '0';
  }
  if ((m = n(/^(TT|HT|AQ|GD|TS|PDT)-(\d)$/))) {
    const i = +m[2] - 1;
    if (i === 6) return m[1] === 'TT' ? `${fmt(s.tExt, 1)} °C` : `${fmt(s.rhExt, 0)} %`;
    const x = s.sectors[i];
    if ((m[1] === 'TT' || m[1] === 'HT') && x.sensorFault) return 'BAD 3,2 mA';
    const k = m[1] as 'TT' | 'HT' | 'AQ' | 'GD' | 'TS' | 'PDT';
    return { TT: `${fmt(x.T, 1)} °C`, HT: `${fmt(x.rh, 0)} %`, AQ: `${fmt(x.co2, 0)} ppm`, GD: `${fmt(x.gas, 1)} %LIE`, TS: `${fmt(x.tSupply, 1)} °C`, PDT: `${fmt(x.dp, 1)} Pa` }[k];
  }
  if ((m = n(/^FCV-(\d)$/))) return `${fmt(s.sectors[+m[1] - 1].valve, 0)} %`;
  if ((m = n(/^PDS-(\d)$/))) return '0';
  if ((m = n(/^CH-0(\d)\.(RUN|FLT|EN)$/))) {
    const c = s.chillers[+m[1] - 1];
    return m[2] === 'RUN' ? (c.on ? '1' : '0') : m[2] === 'FLT' ? (c.fault ? '1' : '0') : c.manualOn ? '1' : '0';
  }
  if ((m = n(/^FSW-0(\d)$/))) return s.chillers[+m[1] - 1].on && s.chwFlowFrac > 0 ? '1' : '0';
  if ((m = n(/^BAG-0(\d)\.(RUN|FLT|CMD)$/))) {
    const p = s.pumps[+m[1] - 1];
    return m[2] === 'FLT' ? (p.fault ? '1' : '0') : p.run ? '1' : '0';
  }
  if (tag === 'TT-AGS') return `${fmt(s.chwSupply, 1)} °C`;
  if (tag === 'TT-AGR') return `${fmt(s.chwReturn, 1)} °C`;
  if (tag === 'FT-AG') return `${fmt(s.chwFlowFrac * 1067, 0)} m³/h`;
  if (tag === 'PDT-AG') return `${fmt(s.chwFlowFrac * 150, 0)} kPa`;
  if ((m = n(/^SV-(\d)$/))) return sirenOn(s, +m[1] - 1) ? '1' : '0';
  if ((m = n(/^XV-(\d)$/))) return s.sectors[+m[1] - 1].gasIsolated ? '1 (fechada)' : '0';
  if ((m = n(/^PM-(\d)$/))) return s.sectors[+m[1] - 1].processOn ? '1' : '0';
  if (tag === 'RMF-01') return s.mains ? '1' : '0';
  if (tag === 'Q0.ST') return '1';
  if (tag === 'UPS-01') return s.mains ? '0' : '1';
  if (tag === 'KS-01' || tag.startsWith('ES-')) return '1';
  return '0';
}

function Architecture() {
  useSim();
  const ok = sim.plcRun;
  const c = ok ? '#36c5df' : '#ff4d4f';
  const st = (x: number, y: number, t: string, s: string) => (
    <g>
      <rect x={x} y={y} width={190} height={70} fill="#0c1d2f" stroke="#27445f" />
      <text x={x + 10} y={y + 20} style={{ fill: '#f4f7fa', fontSize: 12 }}>{t}</text>
      <text x={x + 10} y={y + 38}>{s}</text>
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={x + 10 + i * 21} y={y + 48} width={16} height={14} fill={i < 2 ? '#243442' : '#34556f'} />
      ))}
    </g>
  );
  return (
    <svg viewBox="0 0 900 300" style={{ width: '100%', height: 'auto' }}>
      <style>{`text{font-family:'IBM Plex Mono';font-size:10.5px;fill:#9eb2c4}`}</style>
      <rect x={330} y={14} width={240} height={86} fill="#142b42" stroke={c} strokeWidth={1.5} />
      <text x={345} y={36} style={{ fill: '#f4f7fa', fontSize: 13 }}>CLP CENTRAL · {ok ? 'RUN' : 'STOP'}</text>
      <text x={345} y={54}>CPU modular PROFINET/Modbus TCP</text>
      <text x={345} y={70}>E/S locais: CAG + energia + segurança</text>
      <text x={345} y={86}>Ciclo de varredura: 50 ms</text>
      <line x1={450} y1={100} x2={450} y2={150} stroke={c} strokeWidth={2} />
      <line x1={115} y1={150} x2={785} y2={150} stroke={c} strokeWidth={2} />
      <text x={600} y={144}>PROFINET (anel MRP)</text>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <line x1={115 + i * 335} y1={150} x2={115 + i * 335} y2={190} stroke={c} strokeWidth={2} />
          {st(20 + i * 335, 190, `RIO-0${i + 1}`, `Setores ${SECTORS[i * 2].code} e ${SECTORS[i * 2 + 1].code}`)}
        </g>
      ))}
      <rect x={640} y={14} width={240} height={86} fill="#0c1d2f" stroke="#27445f" />
      <text x={655} y={36} style={{ fill: '#f4f7fa', fontSize: 12 }}>IHM / SUPERVISÓRIO</text>
      <text x={655} y={54}>AERIS CONTROL (simulado)</text>
      <text x={655} y={70}>Sem conexão a equipamentos reais</text>
      <line x1={570} y1={57} x2={640} y2={57} stroke="#27445f" strokeWidth={2} strokeDasharray="4 3" />
      <rect x={20} y={14} width={240} height={86} fill="#0c1d2f" stroke="#27445f" />
      <text x={35} y={36} style={{ fill: '#f4f7fa', fontSize: 12 }}>CHILLERS ×4</text>
      <text x={35} y={54}>Habilitação e estado via E/S</text>
      <text x={35} y={70}>Dados detalhados via Modbus TCP</text>
      <line x1={260} y1={57} x2={330} y2={57} stroke="#27445f" strokeWidth={2} strokeDasharray="4 3" />
    </svg>
  );
}

export default function PLC() {
  useSim();
  const [f, setF] = useState<'ALL' | IOType>('ALL');
  const [q, setQ] = useState('');
  const rows = useMemo(
    () => IO_POINTS.filter((p) => (f === 'ALL' || p.type === f) && (!q || (p.tag + p.desc + p.station).toLowerCase().includes(q.toLowerCase()))),
    [f, q],
  );
  const types: IOType[] = ['DI', 'DO', 'AI', 'AO'];
  const names: Record<IOType, string> = { DI: 'Entradas digitais', DO: 'Saídas digitais', AI: 'Entradas analógicas', AO: 'Saídas analógicas' };
  return (
    <div className="page pad">
      <h1 className="h1">CLP e sensores</h1>
      <p className="sub">
        CLP modular central com 3 estações remotas de E/S. {INSTR_BASE} instrumentos da especificação inicial + {INSTR_COMP} instrumentos complementares de
        refrigeração e pressão = {INSTR_BASE + INSTR_COMP} instrumentos físicos, que geram {IO_SUMMARY.instrumentSignals} sinais. Somados aos {IO_SUMMARY.otherSignals} sinais de inversores, chillers,
        bombas, segurança e energia, o CLP tem {IO_SUMMARY.total} sinais de E/S. Quantidade de sensores ≠ quantidade de sinais: o transmissor TH, por exemplo, gera 2 entradas
        analógicas (temperatura e umidade). Os detectores multigás estão previstos para %LIE, O₂, CO e H₂S, mas a simulação trata somente o %LIE (1 AI por detector).
      </p>
      <div className="kpi-row" style={{ marginBottom: 12 }}>
        {types.map((t) => (
          <div className="kpi" key={t}>
            <div className="l">{names[t]} ({t})</div>
            <div className="v">{IO_SUMMARY[t]}</div>
            <div className="s">{IO_SUMMARY.modules[t]} módulos × {MODULE_CH[t]} canais = {IO_SUMMARY.modules[t] * MODULE_CH[t]} ({fmt(((IO_SUMMARY.modules[t] * MODULE_CH[t] - IO_SUMMARY[t]) / (IO_SUMMARY.modules[t] * MODULE_CH[t])) * 100, 0)} % reserva)</div>
          </div>
        ))}
        <div className="kpi">
          <div className="l">Total de sinais</div>
          <div className="v">{IO_SUMMARY.total}</div>
          <div className="s">digitais {IO_SUMMARY.DI + IO_SUMMARY.DO} · analógicos {IO_SUMMARY.AI + IO_SUMMARY.AO}</div>
        </div>
        <div className="kpi">
          <div className="l">Sinais de instrumentação</div>
          <div className="v">{IO_SUMMARY.instrumentSignals}</div>
          <div className="s">+ {IO_SUMMARY.otherSignals} de equipamentos e segurança</div>
        </div>
        <div className="kpi">
          <div className="l">Instrumentos físicos</div>
          <div className="v">{INSTR_BASE + INSTR_COMP}</div>
          <div className="s">{INSTR_BASE} iniciais + {INSTR_COMP} complementares</div>
        </div>
      </div>
      <div className="split" style={{ marginBottom: 12 }}>
        <Panel title="Arquitetura de controle">
          <Architecture />
        </Panel>
        <Panel title="Instrumentação" bodyClass="">
          <table className="t">
            <thead>
              <tr><th>Tag</th><th className="n">Qtd.</th><th>Descrição</th><th>Sinais</th></tr>
            </thead>
            <tbody>
              {INSTRUMENTS.map((i) => (
                <tr key={i.tag}>
                  <td className="mono">{i.tag}</td>
                  <td className="n">{i.qty}</td>
                  <td>{i.desc} {!i.base && <span className="tag info">compl.</span>}</td>
                  <td className="muted">{i.signals}</td>
                </tr>
              ))}
              <tr>
                <td><b>Total</b></td>
                <td className="n"><b>{INSTR_BASE + INSTR_COMP}</b></td>
                <td colSpan={2} className="muted">{INSTR_BASE} (especificação) + {INSTR_COMP} (refrigeração e pressão) · {IO_SUMMARY.instrumentSignals} sinais</td>
              </tr>
            </tbody>
          </table>
        </Panel>
      </div>
      <Panel title="Módulos de E/S por estação (+20 % de reserva em cada estação)" bodyClass="" className="" >
        <table className="t">
          <thead>
            <tr><th>Estação</th>{types.map((t) => <th key={t} className="n">{t} sinais / módulos</th>)}</tr>
          </thead>
          <tbody>
            {IO_BY_STATION.map((x) => (
              <tr key={x.station}>
                <td className="mono">{x.station}</td>
                {types.map((t) => <td key={t} className="n">{x.signals[t]} / {x.modules[t]}</td>)}
              </tr>
            ))}
            <tr>
              <td><b>Total</b></td>
              {types.map((t) => <td key={t} className="n"><b>{IO_SUMMARY[t]} / {IO_SUMMARY.modules[t]}</b></td>)}
            </tr>
          </tbody>
        </table>
      </Panel>
      <div style={{ height: 12 }} />
      <Panel
        title={`Matriz de entradas e saídas · ${rows.length} de ${IO_SUMMARY.total} pontos`}
        bodyClass=""
        right={
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="filtrar tag / descrição"
              style={{ height: 26, background: '#0c1d2f', border: '1px solid #27445f', color: '#f4f7fa', padding: '0 8px', fontFamily: 'IBM Plex Mono', fontSize: 11.5 }}
            />
            <div className="seg">
              {(['ALL', ...types] as const).map((t) => (
                <button key={t} className={f === t ? 'on' : ''} onClick={() => setF(t)}>
                  {t === 'ALL' ? 'TODOS' : t}
                </button>
              ))}
            </div>
          </div>
        }
      >
        <div style={{ maxHeight: 460, overflow: 'auto' }}>
          <table className="t">
            <thead>
              <tr><th>Endereço</th><th>Tipo</th><th>Tag</th><th>Descrição</th><th>Sinal</th><th>Estação</th><th>Grupo</th><th className="n">Valor ao vivo</th></tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const v = liveValue(p.tag);
                return (
                  <tr key={p.addr + p.tag}>
                    <td className="mono">{p.addr}</td>
                    <td><span className="tag">{p.type}</span></td>
                    <td className="mono">{p.tag}</td>
                    <td>{p.desc}</td>
                    <td className="muted">{p.signal}</td>
                    <td className="mono muted">{p.station}</td>
                    <td className="muted">{p.group}</td>
                    <td className={'n ' + (v.startsWith('BAD') ? 'warn' : v === '1' && /FLT/.test(p.tag) ? 'crit' : '')}>{v}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="sec-title">Lógica de controle (resumo)</div>
      <div className="split">
        <Panel title="Malhas automáticas">
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
            <li><b>Temperatura → frequência</b>: PI por setor, 20–60 Hz, insufladores e exaustores do setor com a mesma referência.</li>
            <li><b>Umidade → válvula</b>: PI na válvula de água gelada para desumidificar; reforça a temperatura quando a ventilação satura e é limitada se houver sobre-resfriamento.</li>
            <li><b>CO₂</b>: acima de 800 ppm adiciona frequência proporcional.</li>
            <li><b>Chillers</b>: escalonamento por demanda (ceil(carga / 0,9 × 1.550 kW)), com histerese e partida de 30 s.</li>
            <li><b>Bombas</b>: 2 em operação; reserva parte após 5 s de falha.</li>
          </ul>
        </Panel>
        <Panel title="Intertravamentos (ativos também em MANUAL)">
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
            <li><b>Gás ≥ 10 %LIE</b>: ventilação do setor em 60 Hz (purga) e sinalizador SV em alerta.</li>
            <li><b>Gás ≥ 20 %LIE</b>: parada do processo (PM), fechamento da válvula de gás (XV), sirene SV retida, evacuação. Liberação só por rearme manual (fonte eliminada, gás &lt; 5 %LIE, CLP em RUN, 380 Vca). A ventilação NÃO é desligada.</li>
            <li className="warn"><b>Não validado</b>: o intertravamento de gás roda no CLP de processo; não substitui uma central de gás ou CLP de segurança independente.</li>
            <li><b>Falha de ventilador</b>: parceiro do setor em 60 Hz; LOTO para manutenção.</li>
            <li><b>Falha de sensor</b> (&lt; 3,8 mA): valor substituto = média dos demais setores.</li>
            <li><b>Falta de 380 Vca</b>: CLP no buffer 24 Vcc; religamento escalonado (ventilação 10 s → bombas 40 s → chillers 70 s + 20 s cada).</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
