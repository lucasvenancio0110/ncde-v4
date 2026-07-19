import { useMemo } from 'react';
import { planShift } from './core/planner';
import type { FactoryState } from './domain/types';
import './styles.css';

const demoState: FactoryState = {
  agora: '18:00',
  fimTurno: '22:30',
  preparadores: [
    { id: 'lucas', nome: 'Lucas V.', status: 'livre', jantarConcluido: false },
    { id: 'alan', nome: 'Alan', status: 'livre', jantarConcluido: false },
    { id: 'gabriel', nome: 'Gabriel', status: 'ajuste', jantarConcluido: false },
  ],
  setups: [{ id: 'setup-130', maquina: 'TNL 130', horario: '19:00', duracaoEstimadaMin: 120, prioridade: 'alta' }],
};

export default function App() {
  const result = useMemo(() => planShift(demoState), []);
  const preparadores = new Map(demoState.preparadores.map((person) => [person.id, person]));

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">NEW CNC DECISION ENGINE</p>
          <h1>NCDE V4</h1>
          <p className="subtitle">Planejamento operacional com produção em primeiro lugar.</p>
        </div>
        <span className={`status ${result.valid ? 'ok' : 'risk'}`}>
          {result.valid ? 'PLANO SEGURO' : 'AÇÃO NECESSÁRIA'}
        </span>
      </header>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">RECOMENDAÇÃO ATUAL</p>
            <h2>Plano do turno</h2>
          </div>
          <strong>{demoState.agora}</strong>
        </div>

        <div className="timeline">
          {result.actions.map((action, index) => (
            <article className="action" key={`${action.preparadorId}-${action.tipo}-${index}`}>
              <time>{action.horario}</time>
              <div>
                <h3>{preparadores.get(action.preparadorId)?.nome}</h3>
                <p>{action.tipo === 'jantar' ? 'Jantar' : 'Reserva operacional'}</p>
                <small>{action.motivo}</small>
              </div>
            </article>
          ))}
        </div>

        {result.warnings.length > 0 && (
          <div className="warnings">
            {result.warnings.map((warning) => <p key={warning}>{warning}</p>)}
          </div>
        )}
      </section>
    </main>
  );
}
