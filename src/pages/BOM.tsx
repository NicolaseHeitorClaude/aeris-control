import { useState } from 'react';
import { Printer } from 'lucide-react';
import { BOM } from '../sim/bom';
import { Panel } from '../components/ui';

export default function BOMPage() {
  const groups = Array.from(new Set(BOM.map((b) => b.group)));
  const [g, setG] = useState('Todos');
  const rows = BOM.filter((b) => g === 'Todos' || b.group === g);
  return (
    <div className="page pad">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h1 className="h1">Lista de materiais</h1>
          <p className="sub">Lista preliminar para estudo acadêmico. Marcas citadas são apenas referência ("ou equivalente"). Quantidades de cabos e tubulações dependem do projeto executivo.</p>
        </div>
        <button className="btn no-print" onClick={() => window.print()}>
          <Printer size={14} /> Imprimir
        </button>
      </div>
      <div className="seg no-print" style={{ marginBottom: 12, width: 'fit-content' }}>
        {['Todos', ...groups].map((x) => (
          <button key={x} className={g === x ? 'on' : ''} onClick={() => setG(x)}>
            {x}
          </button>
        ))}
      </div>
      <Panel title={`${rows.length} itens`} bodyClass="">
        <table className="t">
          <thead>
            <tr><th>#</th><th>Grupo</th><th>Item</th><th className="n">Qtd.</th><th>Un.</th><th>Especificação preliminar</th></tr>
          </thead>
          <tbody>
            {rows.map((b, i) => (
              <tr key={b.item}>
                <td className="mono dim">{String(i + 1).padStart(2, '0')}</td>
                <td className="muted">{b.group}</td>
                <td>{b.item}</td>
                <td className="n">{b.qty}</td>
                <td className="muted">{b.un}</td>
                <td className="muted">{b.spec}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
