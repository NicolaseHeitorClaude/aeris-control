import { SECTORS, VENT } from '../sim/constants';
import { sim, useSim, useUI, simActions } from '../state/store';
import { Kpi, Panel, TrendChart, fmt, SECTOR_COLORS } from '../components/ui';
import { ScenarioExplain } from '../components/Shared';

function FanBar({ hz, fault }: { hz: number; fault: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div className="bar" style={{ flex: 1, height: 6 }}>
        <i style={{ width: `${(hz / 60) * 100}%`, background: fault ? 'var(--crit)' : hz >= 59 ? 'var(--warn)' : 'var(--cyan)' }} />
      </div>
      <span className="mono" style={{ width: 52, textAlign: 'right' }}>{fault ? 'FALHA' : `${fmt(hz, 1)} Hz`}</span>
    </div>
  );
}

/** Esquema da central de água gelada (SVG animado). */
function CAGDiagram() {
  useSim();
  const flow = sim.chwFlowFrac;
  const dur = flow > 0 ? `${2.4 / flow}s` : '0s';
  const pipe = (d: string, c: string) => (
    <g>
      <path d={d} stroke={c} strokeWidth={5} fill="none" opacity={0.35} />
      <path d={d} stroke={c} strokeWidth={2} fill="none" strokeDasharray="8 10" style={{ animation: flow > 0 ? `dash ${dur} linear infinite` : 'none' }} />
    </g>
  );
  return (
    <svg viewBox="0 0 900 300" style={{ width: '100%', maxWidth: 980, height: 'auto', display: 'block', margin: '0 auto' }}>
      <style>{`@keyframes dash { to { stroke-dashoffset: -36; } } text{font-family:'IBM Plex Mono';font-size:11px;fill:#9eb2c4}`}</style>
      {pipe('M150,70 H860', '#2a7fd4')}
      {pipe('M860,230 H150', '#d1603d')}
      {sim.chillers.map((c, i) => {
        const x = 40 + i * 0;
        const y = 30 + i * 62;
        const col = c.fault ? '#ff4d4f' : c.on ? '#2ecc71' : c.starting > 0 ? '#f2b632' : '#4a5865';
        return (
          <g key={c.id} transform={`translate(${x},${y})`} style={{ cursor: 'pointer' }} onClick={() => useUI.getState().select({ kind: 'chiller', id: c.id })}>
            <rect width="90" height="44" fill="#142b42" stroke={col} />
            <text x="8" y="17" style={{ fill: '#f4f7fa' }}>{c.id}</text>
            <text x="8" y="34">{c.fault ? 'FALHA' : c.on ? `${fmt(c.load * 100, 0)} %` : c.starting > 0 ? 'PARTIDA' : 'STBY'}</text>
            <line x1="90" y1="14" x2="110" y2="14" stroke="#2a7fd4" strokeWidth={2} />
            <line x1="90" y1="30" x2="110" y2="30" stroke="#d1603d" strokeWidth={2} />
          </g>
        );
      })}
      <line x1="110" y1="44" x2="110" y2="230" stroke="#d1603d" strokeWidth={2} />
      <line x1="110" y1="44" x2="150" y2="70" stroke="#2a7fd4" strokeWidth={2} />
      {sim.pumps.map((p, i) => {
        const cx = 200 + i * 55;
        const col = p.fault ? '#ff4d4f' : p.run ? '#2ecc71' : '#4a5865';
        return (
          <g key={p.id} style={{ cursor: 'pointer' }} onClick={() => useUI.getState().select({ kind: 'pump', id: p.id })}>
            <circle cx={cx} cy={230} r={14} fill="#0c1d2f" stroke={col} strokeWidth={2} />
            <path d={`M${cx - 6},${222} L${cx + 8},${230} L${cx - 6},${238} Z`} fill={col} />
            <text x={cx - 22} y={262}>{p.id}</text>
            <text x={cx - 18} y={276} style={{ fontSize: 10 }}>{p.role === 'duty' ? 'oper.' : 'reserva'}</text>
          </g>
        );
      })}
      {SECTORS.map((d, i) => {
        const x = 400 + i * 78;
        const s = sim.sectors[d.id];
        return (
          <g key={d.id}>
            <line x1={x + 20} y1={70} x2={x + 20} y2={120} stroke="#2a7fd4" strokeWidth={2} />
            <line x1={x + 40} y1={180} x2={x + 40} y2={230} stroke="#d1603d" strokeWidth={2} />
            <rect x={x} y={120} width={60} height={60} fill="#142b42" stroke="#27445f" />
            <text x={x + 6} y={136} style={{ fill: '#f4f7fa' }}>UTA-{i + 1}</text>
            <text x={x + 6} y={152}>{fmt(s.valve, 0)} %</text>
            <text x={x + 6} y={168}>{fmt(s.qCoil, 0)}kW</text>
            {/* válvula */}
            <path d={`M${x + 14},${95} L${x + 26},${103} L${x + 14},${111} Z M${x + 26},${95} L${x + 14},${103} L${x + 26},${111}`} fill="none" stroke="#36c5df" transform={`rotate(90 ${x + 20} ${103})`} />
          </g>
        );
      })}
      <text x={160} y={60}>ÁGUA GELADA — IDA {fmt(sim.chwSupply, 1)} °C</text>
      <text x={500} y={250}>RETORNO {fmt(sim.chwReturn, 1)} °C · VAZÃO {fmt(sim.chwFlowFrac * 100, 0)} %</text>
    </svg>
  );
}

export default function HVAC() {
  const s = useSim();
  const manual = s.mode === 'manual';
  const sup = s.sectors.reduce((a, x) => a + x.supplyFlow, 0);
  const exh = s.sectors.reduce((a, x) => a + x.exhaustFlow, 0);
  return (
    <div className="page pad">
      <h1 className="h1">Ventilação e refrigeração</h1>
      <p className="sub">
        12 insufladores + 12 exaustores (2 + 2 por setor), cada um com motor trifásico de 15 kW acionado por inversor de frequência.
        A refrigeração é feita por 4 chillers de 1.550 kW térmicos, 3 bombas (2 + 1 reserva) e 6 UTAs com válvulas modulantes.
        {manual ? ' Modo MANUAL ativo: ajuste frequência, válvulas, chillers e bombas abaixo.' : ' Modo AUTOMÁTICO: o CLP calcula todas as referências.'}
      </p>
      <div style={{ marginBottom: 12 }}>
        <ScenarioExplain />
      </div>
      <div className="kpi-row" style={{ marginBottom: 12 }}>
        <Kpi l="Insuflação total" v={sup / 1000} d={0} u="k m³/h" s={`${fmt((sup / 120000), 2)} ren./h`} />
        <Kpi l="Exaustão total" v={exh / 1000} d={0} u="k m³/h" s={`${fmt((exh / 120000), 2)} ren./h`} />
        <Kpi l="Freq. média" v={s.fans.reduce((a, f) => a + f.hz, 0) / 24} u="Hz" />
        <Kpi l="Potência ventilação" v={s.fanKW} d={1} u="kW" s={`nominal 24 × 15 kW = 360 kW`} />
        <Kpi l="Carga das serpentinas" v={s.qCoolTotal / 1000} d={2} u="MW" />
        <Kpi l="Capacidade disponível" v={s.capAvail / 1000} d={2} u="MW" s="instalada 6,20 MW" />
        <Kpi l="Água gelada" v={`${fmt(s.chwSupply, 1)} / ${fmt(s.chwReturn, 1)}`} u="°C" s="ida / retorno" />
      </div>

      <div className="split" style={{ marginBottom: 12 }}>
        <Panel title="Temperatura por setor">
          <TrendChart
            data={s.hist}
            height={220}
            unit="°"
            series={[...SECTORS.map((d, i) => ({ k: `T${i + 1}`, n: d.code, c: SECTOR_COLORS[i] })), { k: 'tExt', n: 'Externa', c: '#ff4d4f', dash: '4 3' }]}
          />
        </Panel>
        <Panel title="Refrigeração e vazão">
          <TrendChart
            data={s.hist}
            height={220}
            area
            series={[
              { k: 'capCool', n: 'Capacidade disponível (kW)', c: '#9eb2c4' },
              { k: 'qCool', n: 'Carga entregue (kW)', c: '#36c5df' },
            ]}
          />
        </Panel>
      </div>

      <Panel title="Central de água gelada — esquema funcional" className="" right={<span className="dim">clique nos equipamentos para detalhes</span>}>
        <CAGDiagram />
        {manual && (
          <div className="tool-row" style={{ marginTop: 8 }}>
            {s.chillers.map((c) => (
              <button key={c.id} className={'btn' + (c.manualOn ? ' primary' : '')} onClick={() => simActions.update(() => (c.manualOn = !c.manualOn))}>
                {c.id} {c.manualOn ? 'LIGADO' : 'DESLIGADO'}
              </button>
            ))}
            {s.pumps.map((p) => (
              <button key={p.id} className={'btn' + (p.manualOn ? ' primary' : '')} onClick={() => simActions.update(() => (p.manualOn = !p.manualOn))}>
                {p.id} {p.manualOn ? 'LIGADA' : 'DESLIGADA'}
              </button>
            ))}
          </div>
        )}
      </Panel>

      <div className="sec-title">Ventiladores, inversores e UTAs por setor</div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
        {SECTORS.map((d) => {
          const sec = s.sectors[d.id];
          return (
            <Panel key={d.id} title={`${d.code} · ${d.name}`} right={<span className="mono" style={{ color: '#f4f7fa' }}>{sec.sensorFault ? 'BAD' : `${fmt(sec.T, 1)} °C`} · {fmt(sec.rh, 0)} %</span>}>
              <table className="t">
                <tbody>
                  {s.fans
                    .filter((f) => f.sector === d.id)
                    .map((f) => (
                      <tr key={f.id} className="click" onClick={() => useUI.getState().select({ kind: 'fan', id: f.id })}>
                        <td className="mono" style={{ width: 70 }}>{f.id}</td>
                        <td style={{ width: 90 }} className="muted">{f.kind === 'SUP' ? 'insuflador' : 'exaustor'}</td>
                        <td>
                          <FanBar hz={f.hz} fault={f.fault} />
                        </td>
                        <td className="n" style={{ width: 80 }}>{fmt(f.run ? (VENT.fanFlow * f.hz) / 60000 : 0, 1)}k m³/h</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <div className="kv" style={{ marginTop: 10 }}>
                <span>Ar insuflado (TS-{d.id + 1})</span>
                <span>{fmt(sec.tSupply, 1)} °C</span>
                <span>Válvula FCV-{d.id + 1}</span>
                <span>{fmt(sec.valve, 0)} %</span>
                <span>Carga serpentina</span>
                <span>{fmt(sec.qCoil, 0)} kW</span>
                <span>Pressão diferencial</span>
                <span className={Math.abs(sec.dp) > 12 ? 'warn' : ''}>{fmt(sec.dp, 1)} Pa</span>
              </div>
              {manual && (
                <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                  <label className="muted" style={{ display: 'grid', gridTemplateColumns: '110px 1fr 50px', alignItems: 'center', gap: 8 }}>
                    Frequência
                    <input type="range" min={20} max={60} value={sec.manualHz} onChange={(e) => simActions.update(() => (sec.manualHz = +e.target.value))} />
                    <span className="mono">{sec.manualHz} Hz</span>
                  </label>
                  <label className="muted" style={{ display: 'grid', gridTemplateColumns: '110px 1fr 50px', alignItems: 'center', gap: 8 }}>
                    Válvula
                    <input type="range" min={0} max={100} value={sec.manualValve} onChange={(e) => simActions.update(() => (sec.manualValve = +e.target.value))} />
                    <span className="mono">{sec.manualValve} %</span>
                  </label>
                </div>
              )}
            </Panel>
          );
        })}
      </div>

      <div className="sec-title">Parâmetros externos</div>
      <Panel title="Condições externas (entrada do operador)">
        <label className="muted" style={{ display: 'grid', gridTemplateColumns: '220px 1fr 60px', alignItems: 'center', gap: 10, maxWidth: 700 }}>
          Temperatura externa alvo
          <input type="range" min={20} max={42} step={0.5} value={s.tExtTarget} onChange={(e) => simActions.update(() => (s.tExtTarget = +e.target.value))} />
          <span className="mono">{fmt(s.tExtTarget, 1)} °C</span>
        </label>
        <label className="muted" style={{ display: 'grid', gridTemplateColumns: '220px 1fr 60px', alignItems: 'center', gap: 10, maxWidth: 700, marginTop: 8 }}>
          Umidade relativa externa
          <input type="range" min={20} max={90} step={1} value={s.rhExt} onChange={(e) => simActions.update(() => (s.rhExt = +e.target.value))} />
          <span className="mono">{fmt(s.rhExt, 0)} %</span>
        </label>
        <label className="muted" style={{ display: 'grid', gridTemplateColumns: '220px 1fr 60px', alignItems: 'center', gap: 10, maxWidth: 700, marginTop: 8 }}>
          Fator de carga das máquinas
          <input type="range" min={0} max={2} step={0.05} value={s.sectors[0].loadFactor} onChange={(e) => simActions.update(() => s.sectors.forEach((x) => (x.loadFactor = +e.target.value)))} />
          <span className="mono">{fmt(s.sectors[0].loadFactor * 200, 0)} kW</span>
        </label>
        <p className="dim" style={{ marginTop: 8 }}>A temperatura externa varia progressivamente (0,02 °C/s simulado) até o alvo. O modo automático reage a qualquer alteração.</p>
      </Panel>
    </div>
  );
}
