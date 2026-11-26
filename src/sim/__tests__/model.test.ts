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
