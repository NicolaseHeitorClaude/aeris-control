import { Eye, Layers, Wind, Tag, Grid3x3, Box, MoveHorizontal, Snowflake } from 'lucide-react';
import { PlantScene } from '../three/Plant';
import { useUI } from '../state/store';
import { SECTORS } from '../sim/constants';
import { Inspector, AlarmStrip, ScenarioExplain } from '../components/Shared';

export default function PlantPage() {
  const ui = useUI();
  const views = [
    { id: 'iso', l: 'Isométrica', i: Box },
    { id: 'top', l: 'Superior', i: Grid3x3 },
    { id: 'front', l: 'Frontal', i: MoveHorizontal },
    { id: 'cag', l: 'Central de água gelada', i: Snowflake },
    { id: 'detail', l: 'Detalhe', i: Eye },
  ];
  return (
    <div className="page">
      <div className="stage">
        <PlantScene initialView="iso" />
      </div>
      <div className="overlay" style={{ left: 14, top: 14, display: 'grid', gap: 8 }}>
        <div className="panel glass" style={{ padding: 6 }}>
          <div className="tool-row">
            {views.map((v) => (
              <button key={v.id} className={'btn' + (ui.camView.name === v.id ? ' primary' : '')} onClick={() => ui.setView(v.id)} title={v.l}>
                <v.i size={14} /> {v.l}
              </button>
            ))}
          </div>
        </div>
        <div className="panel glass" style={{ padding: 6 }}>
          <div className="tool-row">
            <button className={'btn' + (ui.roofVisible ? ' primary' : '')} onClick={() => ui.toggle('roofVisible')}>
              <Layers size={14} /> Cobertura {ui.roofVisible ? 'visível' : 'oculta'}
            </button>
            <button className={'btn' + (ui.wallsVisible ? ' primary' : '')} onClick={() => ui.toggle('wallsVisible')}>
              <Layers size={14} /> Fechamentos
            </button>
            <button className={'btn' + (ui.airflow ? ' primary' : '')} onClick={() => ui.toggle('airflow')}>
              <Wind size={14} /> Fluxo de ar
            </button>
            <button className={'btn' + (ui.labels ? ' primary' : '')} onClick={() => ui.toggle('labels')}>
              <Tag size={14} /> Identificação
            </button>
          </div>
        </div>
        <div className="panel glass" style={{ padding: 6 }}>
          <div className="tool-row">
            {SECTORS.map((d) => (
              <button
                key={d.id}
                className={'btn' + (ui.selected?.kind === 'sector' && ui.selected.id === String(d.id) ? ' primary' : '')}
                onClick={() => ui.select({ kind: 'sector', id: String(d.id) })}
                title={d.name}
              >
                {d.code}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="overlay" style={{ right: 14, top: 14 }}>
        <Inspector />
      </div>
      <div className="overlay" style={{ left: '50%', bottom: 14, transform: 'translateX(-50%)', maxWidth: 720, width: 'calc(100% - 360px)' }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <AlarmStrip />
          <ScenarioExplain />
        </div>
      </div>
      <div className="overlay glass" style={{ left: 14, bottom: 14, padding: '8px 10px', fontSize: 11.5, lineHeight: 1.7 }}>
        <div className="muted" style={{ letterSpacing: '.08em', fontSize: 10.5, textTransform: 'uppercase' }}>Legenda</div>
        <div><span style={{ color: '#2ecc71' }}>●</span> operando <span style={{ color: '#f2b632', marginLeft: 8 }}>●</span> alerta <span style={{ color: '#ff4d4f', marginLeft: 8 }}>●</span> falha</div>
        <div><span style={{ color: '#2a7fd4' }}>━</span> água gelada ida 7 °C <span style={{ color: '#d1603d', marginLeft: 6 }}>━</span> retorno 12 °C</div>
        <div className="muted">Piso: mapa térmico por setor · clique para selecionar · arraste para girar</div>
      </div>
    </div>
  );
}
