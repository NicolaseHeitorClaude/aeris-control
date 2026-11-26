import { CheckCheck, Check, ShieldAlert } from 'lucide-react';
import { sim, useSim, simActions } from '../state/store';
import { fmtTime, gasRearmCheck, GAS_REARM_MAX } from '../sim/model';
import { SECTORS } from '../sim/constants';
import { Panel, TrendChart } from '../components/ui';
import { ScenarioList, ScenarioExplain, SevTag } from '../components/Shared';

/** Intertravamentos de gás retidos e rearme industrial (condições verificadas). */
function GasInterlocks() {
  const latched = sim.sectors.map((x, i) => ({ x, i })).filter(({ x }) => x.gasIsolated);
  if (!latched.length) return null;
  return (
    <Panel title={<><ShieldAlert size={14} /> Intertravamento de gás retido · rearme industrial</>}>
      {latched.map(({ x, i }) => {
        const chk = gasRearmCheck(sim, i);
        return (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', marginBottom: 8 }}>
            <div>
              <div style={{ color: '#f4f7fa' }}>
                {SECTORS[i].code} · {SECTORS[i].name} — XV-{i + 1} fechada, PM-{i + 1} bloqueado, SV-{i + 1} retido · gás {x.gas.toFixed(1)} %LIE
              </div>
              <div className={chk.ok ? 'ok' : 'warn'} style={{ fontSize: 11.5, marginTop: 3 }}>
                {chk.ok ? `Condições atendidas (fonte eliminada, gás < ${GAS_REARM_MAX} %LIE, CLP em RUN, 380 Vca).` : `Rearme bloqueado: ${chk.reasons.join(' ')}`}
              </div>
            </div>
            <button className={'btn ' + (chk.ok ? 'primary' : '')} disabled={!chk.ok} onClick={() => simActions.gasRearm(i)}>
              Rearmar {SECTORS[i].code}
            </button>
          </div>
        );
      })}
      <div className="dim" style={{ fontSize: 11.5 }}>
        O rearme industrial verifica as condições de segurança antes de liberar o processo. O cenário 11 é apenas o reset da demonstração e não equivale a rearme.
      </div>
    </Panel>
  );
}

export default function Alarms() {
  useSim();
  const order = { crit: 0, warn: 1, info: 2 };
  const active = Object.values(sim.alarms).sort((a, b) => order[a.sev] - order[b.sev] || b.since - a.since);
  return (
    <div className="page pad">
      <h1 className="h1">Alarmes e eventos</h1>
      <p className="sub">Alarmes gerados pela lógica do CLP a partir das variáveis simuladas. Cada alarme informa causa, consequência e ação. Use os cenários para provocar condições anormais.</p>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 260px' }}>
        <div className="grid" style={{ alignContent: 'start' }}>
          <ScenarioExplain />
          <GasInterlocks />
          <Panel
            title={`Alarmes ativos · ${active.length}`}
            bodyClass=""
            right={
              <button className="btn" onClick={() => simActions.ackAll()} disabled={!active.some((a) => !a.ack)}>
                <CheckCheck size={14} /> Reconhecer todos
              </button>
            }
          >
            {active.length === 0 ? (
              <div className="panel-b ok">Nenhum alarme ativo. Sistema em operação normal.</div>
            ) : (
              <table className="t">
                <thead>
                  <tr><th>Início</th><th>Severidade</th><th>Tag</th><th>Mensagem / causa / consequência / ação</th><th /></tr>
                </thead>
                <tbody>
                  {active.map((a) => (
                    <tr key={a.id} style={{ opacity: a.ack ? 0.7 : 1 }}>
                      <td className="mono">{fmtTime(a.since)}</td>
                      <td><SevTag s={a.sev} /></td>
                      <td className="mono">{a.tag}</td>
                      <td>
                        <div style={{ color: '#f4f7fa', fontWeight: 500 }}>{a.msg}</div>
                        <div className="muted" style={{ fontSize: 11.5, marginTop: 3, lineHeight: 1.5 }}>
                          <b>Causa:</b> {a.cause} <b>Consequência:</b> {a.consequence} <b>Ação:</b> {a.action}
                        </div>
                      </td>
                      <td>
                        {a.ack ? <span className="tag off">RECONHECIDO</span> : (
                          <button className="btn" onClick={() => simActions.ack(a.id)}><Check size={13} /> Reconhecer</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
          <div className="split">
            <Panel title="Qualidade do ar">
              <TrendChart data={sim.hist} height={180} series={[{ k: 'co2Max', n: 'CO₂ máx. (ppm)', c: '#36c5df' }]} />
            </Panel>
            <Panel title="Gás inflamável">
              <TrendChart data={sim.hist} height={180} area series={[{ k: 'gasMax', n: 'Gás máx. (%LIE)', c: '#ff4d4f' }]} domain={[0, 30]} />
            </Panel>
          </div>
          <Panel title={`Registro de eventos · ${sim.log.length}`} bodyClass="">
            <div style={{ maxHeight: 380, overflow: 'auto' }}>
              <table className="t">
                <thead>
                  <tr><th>Tempo</th><th>Evento</th><th>Severidade</th><th>Tag</th><th>Mensagem</th></tr>
                </thead>
                <tbody>
                  {sim.log.map((e, i) => (
                    <tr key={i}>
                      <td className="mono">{fmtTime(e.t)}</td>
                      <td><span className={'tag ' + (e.event === 'ATIVO' ? e.sev : e.event === 'NORMALIZADO' ? 'ok' : 'off')}>{e.event}</span></td>
                      <td><SevTag s={e.sev} /></td>
                      <td className="mono">{e.tag}</td>
                      <td>{e.msg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
        <Panel title="Cenários" className="" bodyClass="panel-b">
          <ScenarioList />
        </Panel>
      </div>
    </div>
  );
}
