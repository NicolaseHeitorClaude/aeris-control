import { describe, it, expect } from 'vitest';
import { createInitialState, step, avg } from '../model';
import { applyScenario } from '../scenarios';
import { IO_SUMMARY } from '../io';

const run = (s: ReturnType<typeof createInitialState>, sec: number) => {
  for (let i = 0; i < sec; i++) step(s);
};
const report = (label: string, s: ReturnType<typeof createInitialState>) => {
  // eslint-disable-next-line no-console
  console.log(
    label,
    'Tavg', avg(s.sectors.map((x) => x.T)).toFixed(2),
    'T', s.sectors.map((x) => x.T.toFixed(1)).join(','),
    'RH', s.sectors.map((x) => x.rh.toFixed(0)).join(','),
    'Hz', s.fans.map((f) => f.hz.toFixed(0)).join(','),
    'q', (s.qCoolTotal / 1000).toFixed(2), 'cap', (s.capAvail / 1000).toFixed(2),
    'ch', s.chillers.map((c) => (c.on ? 1 : 0)).join(''),
    'co2', s.sectors.map((x) => x.co2.toFixed(0)).join(','),
    'gas', s.sectors[4].gas.toFixed(1),
    'v', s.sectors.map((x) => x.valve.toFixed(0)+'/'+x.iFan.toFixed(1)+'/'+x.iValve.toFixed(1)+'/'+x.tSupply.toFixed(1)).join(','),
    'alarms', Object.keys(s.alarms).join(' '),
  );
};

describe('modelo térmico', () => {
  it('converge para o setpoint em operação normal', () => {
    const s = createInitialState();
    run(s, 7200);
    report('normal', s);
    s.sectors.forEach((x) => expect(Math.abs(x.T - 24)).toBeLessThan(1));
  });
  it('cenários alteram o sistema', () => {
    for (const id of ['hot', 'heat', 'supfail', 'exhfail', 'sensor', 'gas', 'chfail', 'pumpfail', 'power']) {
      const s = createInitialState();
      run(s, 1800);
      applyScenario(s, id);
      run(s, 3600);
      report(id, s);
      if (id === 'power') {
        applyScenario(s, 'normal');
        run(s, 3600);
        report('power-restored', s);
        expect(s.fans.every((f) => f.run)).toBe(true);
      }
    }
  });
  it('matriz de E/S consistente', () => {
    expect(IO_SUMMARY.total).toBe(IO_SUMMARY.DI + IO_SUMMARY.DO + IO_SUMMARY.AI + IO_SUMMARY.AO);
    console.log(IO_SUMMARY);
  });
});

describe('revisão técnica', () => {
  it('sinais de instrumentação e módulos por estação', async () => {
    const io = await import('../io');
    expect(io.IO_SUMMARY.total).toBe(229);
    expect(io.IO_SUMMARY.instrumentSignals).toBe(76);
    expect(io.IO_SUMMARY.otherSignals).toBe(153);
    expect(io.INSTR_BASE + io.INSTR_COMP).toBe(69);
    expect(io.IO_SUMMARY.modules).toEqual({ DI: 11, DO: 7, AI: 7, AO: 9 });
  });
  it('operação normal a 2 ren./h (20 Hz)', () => {
    const s = createInitialState();
    run(s, 3600);
    s.fans.forEach((f) => expect(f.hz).toBeCloseTo(20, 0));
  });
  it('cenários 4 e 5: sinal da pressão diferencial', () => {
    const a = createInitialState();
    run(a, 600);
    applyScenario(a, 'supfail');
    run(a, 1800);
    expect(a.sectors[1].dp).toBeGreaterThan(0);
    const b = createInitialState();
    run(b, 600);
    applyScenario(b, 'exhfail');
    run(b, 1800);
    expect(b.sectors[2].dp).toBeLessThan(0);
    report('supfail', a);
    report('exhfail', b);
  });
  it('rearme de gás condicionado; reset da demonstração separado', async () => {
    const m = await import('../model');
    const s = createInitialState();
    applyScenario(s, 'gas');
    let n = 0;
    while (!s.sectors[4].gasIsolated && n++ < 7200) step(s);
    expect(s.sectors[4].gasIsolated).toBe(true);
    expect(m.sirenOn(s, 4)).toBe(true);
    // fonte ativa e gás alto: rearme recusado
    expect(m.gasRearm(s, 4).ok).toBe(false);
    expect(s.sectors[4].gasIsolated).toBe(true);
    // cenário 1 elimina a fonte, mas não libera o intertravamento
    applyScenario(s, 'normal');
    expect(s.sectors[4].gasIsolated).toBe(true);
    expect(s.sectors[4].processOn).toBe(false);
    expect(m.gasRearm(s, 4).ok).toBe(false); // gás ainda ≥ 5 %LIE
    run(s, 3600);
    expect(s.sectors[4].gas).toBeLessThan(5);
    expect(m.sirenOn(s, 4)).toBe(true); // sinalização retida até o rearme
    expect(m.gasRearm(s, 4).ok).toBe(true);
    expect(s.sectors[4].gasIsolated).toBe(false);
    expect(s.sectors[4].processOn).toBe(true);
    expect(m.sirenOn(s, 4)).toBe(false);
    // reset da demonstração
    applyScenario(s, 'gas');
    n = 0;
    while (!s.sectors[4].gasIsolated && n++ < 7200) step(s);
    applyScenario(s, 'reset');
    expect(s.sectors[4].gasIsolated).toBe(false);
    expect(s.sectors[4].gas).toBe(0);
  });
});
