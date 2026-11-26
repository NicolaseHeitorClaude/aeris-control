import { PlantScene } from '../three/Plant';
import { sim, useSim, useUI } from '../state/store';
import { SECTORS } from '../sim/constants';
import { avg } from '../sim/model';
import { Kpi, Panel, TrendChart, fmt } from '../components/ui';
import { ScenarioList, ScenarioExplain, Inspector, AlarmStrip } from '../components/Shared';

function KpiColumn() {
  useSim();
  const tAvg = avg(sim.sectors.map((x) => x.T));
  const rh = avg(sim.sectors.map((x) => x.rh));
  const sup = sim.sectors.reduce((a, x) => a + x.supplyFlow, 0);
  const exh = sim.sectors.reduce((a, x) => a + x.exhaustFlow, 0);
  const fansOn = sim.fans.filter((f) => f.run).length;
  const chOn = sim.chillers.filter((c) => c.on).length;
  return (
    <div className="panel glass" style={{ width: 300 }}>
      <div className="panel-h">Supervisório · tempo real simulado</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <Kpi l="Temp. interna média" v={tAvg} u="°C" s={`setpoint 24,0 °C`} cls={tAvg > 27 ? 'warn' : ''} />
        <Kpi l="Temp. externa" v={sim.tExt} u="°C" s={`alvo ${fmt(sim.tExtTarget, 0)} °C`} />
        <Kpi l="Umidade média" v={rh} u="%" d={0} s="desejada 55 %" />
        <Kpi l="Equip. ativos" v={`${fansOn}/24`} s={`${chOn}/4 chillers · ${sim.pumps.filter((p) => p.run).length}/3 bombas`} />
        <Kpi l="Insuflação" v={sup / 1000} d={0} u="k m³/h" s="nominal 720k" />
        <Kpi l="Exaustão" v={exh / 1000} d={0} u="k m³/h" s="nominal 720k" />
        <Kpi l="Refrigeração" v={sim.qCoolTotal / 1000} d={2} u="MW" s={`disp. ${fmt(sim.capAvail / 1000, 2)} / 6,20 MW`} />
        <Kpi l="Potência elétrica" v={sim.elecKW} d={0} u="kW" s={`ventiladores ${fmt(sim.fanKW, 0)} kW`} />
      </div>
      <div style={{ borderTop: '1px solid var(--line)', padding: '6px 4px 0' }}>
        <TrendChart
          data={sim.hist}
          height={130}
          series={[
            { k: 'tAvg', n: 'T média', c: '#36c5df' },
            { k: 'tExt', n: 'T externa', c: '#ff8a3d', dash: '4 3' },
          ]}
          unit="°"
        />
      </div>
    </div>
  );
}

function SectorTiles() {
  useSim();
  const select = useUI((s) => s.select);
  const selected = useUI((s) => s.selected);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(110px, 1fr))', gap: 6 }}>
      {SECTORS.map((d) => {
        const s = sim.sectors[d.id];
        const cls = s.gas >= 20 || s.T >= 30 ? ' alarm' : s.gas >= 10 || s.T >= 27 || s.sensorFault ? ' warnb' : '';
        const hz = avg(sim.fans.filter((f) => f.sector === d.id).map((f) => f.hz));
        return (
          <button
            key={d.id}
            className={'sector-tile glass' + cls + (selected?.kind === 'sector' && selected.id === String(d.id) ? ' sel' : '')}
            onClick={() => select({ kind: 'sector', id: String(d.id) })}
          >
            <div className="top">
              <span>{d.code} · {d.name}</span>
            </div>
            <div className="tv">
              {s.sensorFault ? <span className="warn">BAD</span> : `${fmt(s.T, 1)}°`}
              <span className="muted" style={{ fontSize: 12 }}> {fmt(s.rh, 0)}%</span>
            </div>
            <div className="top">
              <span>{fmt(hz, 0)} Hz</span>
              <span className={s.gas >= 10 ? 'crit' : ''}>{s.gas >= 1 ? `${fmt(s.gas, 0)} %LIE` : `${fmt(s.co2, 0)} ppm`}</span>
            </div>
            <div className="bar">
              <i style={{ width: `${Math.min(100, (Math.max(s.supplyFlow, s.exhaustFlow) / 120000) * 100)}%` }} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function Overview() {
  const selected = useUI((s) => s.selected);
  return (
    <div className="page">
      <div className="stage">
        <PlantScene initialView="iso" />
      </div>
      <div className="overlay" style={{ left: 14, top: 14 }}>
        <KpiColumn />
      </div>
      <div className="overlay" style={{ right: 14, top: 14, width: 230 }}>
        <div className="panel glass">
          <div className="panel-h">Cenários de demonstração</div>
          <div className="panel-b" style={{ padding: 8 }}>
            <ScenarioList compact />
          </div>
        </div>
      </div>
      <div className="overlay" style={{ left: '50%', top: 14, transform: 'translateX(-50%)', maxWidth: 560 }}>
        <AlarmStrip />
      </div>
      {selected && (
        <div className="overlay" style={{ right: 258, top: 14 }}>
          <Inspector />
        </div>
      )}
      <div className="overlay" style={{ left: 328, right: 258, bottom: 14 }}>
        <div style={{ marginBottom: 6 }}>
          <ScenarioExplain />
        </div>
        <SectorTiles />
      </div>
    </div>
  );
}

export { Panel };
