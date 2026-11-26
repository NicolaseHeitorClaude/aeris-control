import { X, Wrench, AlertTriangle } from 'lucide-react';
import { SECTORS, WORKERS_PER_SECTOR } from '../sim/constants';
import { sim, useSim, useUI, simActions } from '../state/store';
import { SCENARIOS } from '../sim/scenarios';
import { plcTemp } from '../sim/model';
import { fmt, sevLabel } from './ui';

export function ScenarioList({ compact }: { compact?: boolean }) {
  const scenario = useUI((s) => s.scenario);
  const last = useUI((s) => s.lastScenario);
  return (
    <div className="scn-list">
      {SCENARIOS.map((s) => (
        <button
          key={s.id}
          className={'scn' + (last === s.id ? ' on' : '') + (s.id === 'reset' ? ' reset' : '')}
          onClick={() => scenario(s.id)}
          title={s.explain}
        >
          <span className="n">{String(s.n).padStart(2, '0')}</span>
          <span>{compact ? s.short : s.title}</span>
        </button>
      ))}
    </div>
  );
}

export function ScenarioExplain() {
  const last = useUI((s) => s.lastScenario);
  const sc = SCENARIOS.find((s) => s.id === last);
  if (!sc) return null;
  return (
    <div className="explain">
      <div>
        <b>Cenário {sc.n} — {sc.title}.</b> {sc.explain}
      </div>
      <div style={{ marginTop: 4 }} className="muted">
        <b style={{ color: '#f2b632' }}>Resposta esperada:</b> {sc.expected}
      </div>
    </div>
  );
}

export function AlarmStrip() {
  useSim();
  const setPage = useUI((s) => s.setPage);
  const act = Object.values(sim.alarms).filter((a) => a.sev === 'crit' && !a.ack);
  if (!act.length) return null;
  const a = act[act.length - 1];
  return (
    <div className="alarm-strip" onClick={() => setPage('alarms')} style={{ cursor: 'pointer' }}>
      <span className="blink" />
      <span className="mono" style={{ color: '#ff9a9b' }}>{a.tag}</span>
      <span>{a.msg}</span>
      {act.length > 1 && <span className="tag crit">+{act.length - 1}</span>}
    </div>
  );
}

/** Painel de inspeção do equipamento selecionado (dados ao vivo + ações). */
export function Inspector() {
  useSim();
  const sel = useUI((s) => s.selected);
  const select = useUI((s) => s.select);
  if (!sel) return null;
  let title = '';
  let sub = '';
  let rows: [string, React.ReactNode][] = [];
  let action: React.ReactNode = null;
  let status: { c: string; t: string } = { c: 'ok', t: 'NORMAL' };

  if (sel.kind === 'fan') {
    const f = sim.fans.find((x) => x.id === sel.id)!;
    title = f.id;
    sub = `${f.kind === 'SUP' ? 'Insuflador axial' : 'Exaustor axial de cobertura'} · Setor ${SECTORS[f.sector].code}`;
    status = f.fault ? { c: 'crit', t: 'FALHA' } : f.run ? { c: 'ok', t: 'OPERANDO' } : { c: 'off', t: 'PARADO' };
    rows = [
      ['Referência CLP', `${fmt(f.cmdHz, 1)} Hz`],
      ['Frequência real', `${fmt(f.hz, 1)} Hz`],
      ['Rotação estimada', `${fmt((f.hz / 60) * 1170, 0)} rpm`],
      ['Vazão', `${fmt(f.run ? (60000 * f.hz) / 60 : 0, 0)} m³/h`],
      ['Potência (lei dos ventiladores)', `${fmt(f.kw, 2)} kW`],
      ['Motor', '15 kW · 380 V · 6 polos'],
      ['Inversor', `IF-${f.id} · 15 kW`],
      ['Fluxostato', f.flowOk ? 'VAZÃO OK' : 'SEM VAZÃO'],
    ];
    action = (
      <button className={'btn ' + (f.fault ? 'primary' : 'danger')} onClick={() => simActions.update(() => (f.fault = !f.fault))}>
        {f.fault ? <Wrench size={14} /> : <AlertTriangle size={14} />}
        {f.fault ? 'Reparar e rearmar' : 'Injetar falha'}
      </button>
    );
  } else if (sel.kind === 'chiller') {
    const c = sim.chillers.find((x) => x.id === sel.id)!;
    title = c.id;
    sub = 'Chiller de condensação a ar · 1.550 kW térmicos';
    status = c.fault ? { c: 'crit', t: 'FALHA' } : c.on ? { c: 'ok', t: 'OPERANDO' } : c.starting > 0 ? { c: 'warn', t: 'PARTIDA' } : { c: 'off', t: 'STAND-BY' };
    rows = [
      ['Carga', `${fmt(c.load * 100, 0)} %`],
      ['Capacidade entregue', `${fmt(c.kwTh, 0)} kW`],
      ['Consumo elétrico (COP 5,2)', `${fmt(c.kwEl, 0)} kW`],
      ['Água gelada ida/retorno', `${fmt(sim.chwSupply, 1)} / ${fmt(sim.chwReturn, 1)} °C`],
    ];
    action = (
      <button className={'btn ' + (c.fault ? 'primary' : 'danger')} onClick={() => simActions.update(() => (c.fault = !c.fault))}>
        {c.fault ? <Wrench size={14} /> : <AlertTriangle size={14} />}
        {c.fault ? 'Reparar e rearmar' : 'Injetar falha'}
      </button>
    );
  } else if (sel.kind === 'pump') {
    const p = sim.pumps.find((x) => x.id === sel.id)!;
    title = p.id;
    sub = `Bomba centrífuga de água gelada · ${p.role === 'duty' ? 'operação' : 'reserva'}`;
    status = p.fault ? { c: 'crit', t: 'FALHA' } : p.run ? { c: 'ok', t: 'OPERANDO' } : { c: 'off', t: 'PARADA' };
    rows = [
      ['Motor', '37 kW · 380 V · partida por inversor'],
      ['Vazão nominal', '533 m³/h'],
      ['Vazão do circuito', `${fmt(sim.chwFlowFrac * 100, 0)} %`],
    ];
    action = (
      <button className={'btn ' + (p.fault ? 'primary' : 'danger')} onClick={() => simActions.update(() => (p.fault = !p.fault))}>
        {p.fault ? 'Reparar e rearmar' : 'Injetar falha'}
      </button>
    );
  } else if (sel.kind === 'sector' || sel.kind === 'sensor' || sel.kind === 'ahu' || sel.kind === 'machine') {
    const i = sel.kind === 'machine' ? +sel.id.split('-')[0] : +sel.id;
    const s = sim.sectors[i];
    const d = SECTORS[i];
    title = sel.kind === 'ahu' ? `UTA-${i + 1}` : sel.kind === 'sensor' ? `TH-${i + 1} · AQ-${i + 1} · GD-${i + 1}` : sel.kind === 'machine' ? `M-${i + 1}.${+sel.id.split('-')[1] + 1}` : `${d.code} — ${d.name}`;
    sub =
      sel.kind === 'ahu'
        ? 'Unidade de tratamento de ar · filtro G4+F7 · serpentina de água gelada'
        : sel.kind === 'sensor'
          ? 'Temperatura/umidade · CO₂ · multigás'
          : sel.kind === 'machine'
            ? `Máquina industrial 10 kW · ${d.name}`
            : `${d.machines} máquinas · ${WORKERS_PER_SECTOR[i]} trabalhadores · 20.000 m³`;
    status = s.gas >= 20 ? { c: 'crit', t: 'EVACUAR' } : s.T >= 27 || s.gas >= 10 ? { c: 'warn', t: 'ALERTA' } : { c: 'ok', t: 'NORMAL' };
    if (sel.kind === 'machine') status = !s.processOn || !sim.mains ? { c: 'crit', t: 'SEM PERMISSIVO' } : { c: 'ok', t: 'PRODUZINDO' };
    rows = [
      ['Temperatura', s.sensorFault ? `BAD (subst. ${fmt(plcTemp(sim, i), 1)} °C)` : `${fmt(s.T, 1)} °C`],
      ['Umidade relativa', `${fmt(s.rh, 0)} %`],
      ['CO₂', `${fmt(s.co2, 0)} ppm`],
      ['Gás (%LIE)', fmt(s.gas, 1)],
      ['Ar insuflado', `${fmt(s.tSupply, 1)} °C`],
      ['Insuflação / exaustão', `${fmt(s.supplyFlow / 1000, 0)}k / ${fmt(s.exhaustFlow / 1000, 0)}k m³/h`],
      ['Renovação efetiva', `${fmt(Math.max(s.supplyFlow, s.exhaustFlow) / 20000, 1)} /h`],
      ['Válvula FCV', `${fmt(s.valve, 0)} %`],
      ['Carga da serpentina', `${fmt(s.qCoil, 0)} kW`],
      ['Carga interna', `${fmt(s.qInt, 0)} kW`],
      ['Pressão diferencial', `${fmt(s.dp, 1)} Pa`],
    ];
  } else if (sel.kind === 'panel') {
    title = sel.id;
    sub = sel.id === 'QGBT' ? 'Painel geral de força e comando (CCM + CLP)' : 'Estação remota de E/S (PROFINET)';
    status = sim.mains ? { c: 'ok', t: 'ENERGIZADO' } : { c: 'crit', t: 'SEM 380 Vca' };
    rows = [
      ['Força', sim.mains ? '380 Vca OK' : 'FALTA'],
      ['Comando', sim.cmd24 ? (sim.mains ? '24 Vcc OK' : `24 Vcc bateria ${fmt(sim.ups, 0)} %`) : 'FALTA'],
      ['CLP', sim.plcRun ? 'RUN' : 'STOP'],
    ];
  }

  return (
    <div className="panel glass inspector">
      <div className="panel-h">
        <span style={{ color: '#f4f7fa', letterSpacing: '.04em', fontSize: 12 }}>{title}</span>
        <span className="grow" />
        <span className={'tag ' + status.c}>{status.t}</span>
        <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => select(null)} aria-label="Fechar">
          <X size={13} />
        </button>
      </div>
      <div className="panel-b">
        <div className="muted" style={{ fontSize: 11.5, marginBottom: 10 }}>{sub}</div>
        <div className="kv">
          {rows.map(([k, v]) => [<span key={k + 'k'}>{k}</span>, <span key={k + 'v'}>{v}</span>])}
        </div>
        {action && <div style={{ marginTop: 12 }}>{action}</div>}
      </div>
    </div>
  );
}

export function SevTag({ s }: { s: 'crit' | 'warn' | 'info' }) {
  return <span className={'tag ' + s}>{sevLabel[s]}</span>;
}
