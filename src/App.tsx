import { useEffect, useMemo, useState } from 'react';
import { validateFactoryState } from './core/draft';
import { planShift } from './core/planner';
import { clearFactoryState, loadFactoryState, saveFactoryState } from './core/storage';
import type { FactoryState, PlanningResult, PreparadorStatus } from './domain/types';
import './styles.css';

const initialState: FactoryState = {
  agora: '18:00',
  fimTurno: '22:30',
  preparadores: [
    { id: 'lucas', nome: 'Lucas V.', status: 'livre', jantarConcluido: false },
    { id: 'alan', nome: 'Alan', status: 'livre', jantarConcluido: false },
  ],
  setups: [
    {
      id: 'setup-130',
      maquina: 'TNL 130',
      horario: '19:00',
      duracaoEstimadaMin: 120,
      prioridade: 'alta',
    },
  ],
};

const statuses: { value: PreparadorStatus; label: string }[] = [
  { value: 'livre', label: 'Livre' },
  { value: 'ajuste', label: 'Em ajuste' },
  { value: 'setup', label: 'Em setup' },
  { value: 'revezamento', label: 'Revezando' },
  { value: 'jantar', label: 'No jantar' },
  { value: 'reservado', label: 'Reservado' },
  { value: 'indisponivel', label: 'Indisponível' },
];

function loadInitialState(): FactoryState {
  if (typeof window === 'undefined') return initialState;
  return loadFactoryState(window.localStorage) ?? initialState;
}

export default function App() {
  const [factory, setFactory] = useState<FactoryState>(loadInitialState);
  const [result, setResult] = useState<PlanningResult | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'pending'>('saved');

  const preparadores = useMemo(
    () => new Map(factory.preparadores.map((person) => [person.id, person])),
    [factory.preparadores],
  );

  useEffect(() => {
    const validation = validateFactoryState(factory);
    if (!validation.valid) {
      setSaveStatus('pending');
      return;
    }

    const timer = window.setTimeout(() => {
      saveFactoryState(window.localStorage, factory);
      setSaveStatus('saved');
    }, 350);

    return () => window.clearTimeout(timer);
  }, [factory]);

  function changeFactory(update: (current: FactoryState) => FactoryState) {
    setResult(null);
    setFormErrors([]);
    setSaveStatus('pending');
    setFactory(update);
  }

  function updatePreparador(id: string, field: 'nome' | 'status' | 'compromissoAte', value: string) {
    changeFactory((current) => ({
      ...current,
      preparadores: current.preparadores.map((person) =>
        person.id === id ? { ...person, [field]: value || undefined } : person,
      ),
    }));
  }

  function addPreparador() {
    changeFactory((current) => ({
      ...current,
      preparadores: [
        ...current.preparadores,
        { id: `preparador-${Date.now()}`, nome: '', status: 'livre', jantarConcluido: false },
      ],
    }));
  }

  function removePreparador(id: string) {
    changeFactory((current) => ({
      ...current,
      preparadores: current.preparadores.filter((person) => person.id !== id),
      setups: current.setups.map((setup) =>
        setup.responsavelId === id ? { ...setup, responsavelId: undefined } : setup,
      ),
    }));
  }

  function addSetup() {
    changeFactory((current) => ({
      ...current,
      setups: [
        ...current.setups,
        {
          id: `setup-${Date.now()}`,
          maquina: '',
          horario: current.agora,
          duracaoEstimadaMin: 120,
          prioridade: 'alta',
        },
      ],
    }));
  }

  function updateSetup(id: string, field: string, value: string) {
    changeFactory((current) => ({
      ...current,
      setups: current.setups.map((setup) => {
        if (setup.id !== id) return setup;
        if (field === 'duracaoEstimadaMin') return { ...setup, duracaoEstimadaMin: Number(value) };
        return { ...setup, [field]: value || undefined };
      }),
    }));
  }

  function removeSetup(id: string) {
    changeFactory((current) => ({ ...current, setups: current.setups.filter((setup) => setup.id !== id) }));
  }

  function resetShift() {
    if (!window.confirm('Limpar os dados deste turno e voltar ao exemplo inicial?')) return;
    clearFactoryState(window.localStorage);
    setFactory(initialState);
    setResult(null);
    setFormErrors([]);
    setSaveStatus('saved');
  }

  function generatePlan() {
    const validation = validateFactoryState(factory);
    setFormErrors(validation.errors);
    if (!validation.valid) {
      setResult(null);
      return;
    }
    saveFactoryState(window.localStorage, factory);
    setSaveStatus('saved');
    setResult(planShift(factory));
  }

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">NEW CNC DECISION ENGINE</p>
          <h1>NCDE V4</h1>
          <p className="subtitle">Monte o estado real do turno e gere uma recomendação operacional.</p>
        </div>
        <div className="hero-actions">
          <span className={`save-status ${saveStatus}`}>{saveStatus === 'saved' ? 'DADOS SALVOS' : 'PREENCHIMENTO PENDENTE'}</span>
          <span className={`status ${result?.valid ? 'ok' : result ? 'risk' : 'idle'}`}>
            {result ? (result.valid ? 'PLANO SEGURO' : 'AÇÃO NECESSÁRIA') : 'AGUARDANDO PLANO'}
          </span>
        </div>
      </header>

      <section className="workspace">
        <div className="editor-column">
          <section className="panel form-panel">
            <div className="section-heading">
              <div><p className="eyebrow">ETAPA 1</p><h2>Turno</h2></div>
              <button className="text-button" type="button" onClick={resetShift}>Limpar turno</button>
            </div>
            <div className="form-grid two-columns">
              <label>Horário atual<input type="time" value={factory.agora} onChange={(event) => changeFactory((current) => ({ ...current, agora: event.target.value }))} /></label>
              <label>Fim do turno<input type="time" value={factory.fimTurno} onChange={(event) => changeFactory((current) => ({ ...current, fimTurno: event.target.value }))} /></label>
            </div>
          </section>

          <section className="panel form-panel">
            <div className="section-heading">
              <div><p className="eyebrow">ETAPA 2</p><h2>Preparadores</h2></div>
              <button className="secondary-button" type="button" onClick={addPreparador}>+ Adicionar</button>
            </div>
            <div className="editable-list">
              {factory.preparadores.map((person) => (
                <article className="editable-card" key={person.id}>
                  <label>Nome<input value={person.nome} placeholder="Nome do preparador" onChange={(event) => updatePreparador(person.id, 'nome', event.target.value)} /></label>
                  <div className="form-grid two-columns">
                    <label>Situação atual<select value={person.status} onChange={(event) => updatePreparador(person.id, 'status', event.target.value)}>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
                    <label>Livre a partir de<input type="time" value={person.compromissoAte ?? ''} onChange={(event) => updatePreparador(person.id, 'compromissoAte', event.target.value)} /></label>
                  </div>
                  <button className="danger-button" type="button" onClick={() => removePreparador(person.id)}>Remover preparador</button>
                </article>
              ))}
            </div>
          </section>

          <section className="panel form-panel">
            <div className="section-heading">
              <div><p className="eyebrow">ETAPA 3</p><h2>Setups</h2></div>
              <button className="secondary-button" type="button" onClick={addSetup}>+ Adicionar</button>
            </div>
            <div className="editable-list">
              {factory.setups.length === 0 && <p className="empty-state">Nenhum setup informado.</p>}
              {factory.setups.map((setup) => (
                <article className="editable-card" key={setup.id}>
                  <div className="form-grid two-columns">
                    <label>Máquina<input value={setup.maquina} placeholder="Ex.: TNL 130" onChange={(event) => updateSetup(setup.id, 'maquina', event.target.value)} /></label>
                    <label>Horário<input type="time" value={setup.horario} onChange={(event) => updateSetup(setup.id, 'horario', event.target.value)} /></label>
                    <label>Duração estimada (min)<input type="number" min="1" value={setup.duracaoEstimadaMin} onChange={(event) => updateSetup(setup.id, 'duracaoEstimadaMin', event.target.value)} /></label>
                    <label>Responsável<select value={setup.responsavelId ?? ''} onChange={(event) => updateSetup(setup.id, 'responsavelId', event.target.value)}><option value="">Motor decide</option>{factory.preparadores.map((person) => <option key={person.id} value={person.id}>{person.nome || 'Sem nome'}</option>)}</select></label>
                  </div>
                  <button className="danger-button" type="button" onClick={() => removeSetup(setup.id)}>Remover setup</button>
                </article>
              ))}
            </div>
          </section>

          {formErrors.length > 0 && <div className="warnings">{formErrors.map((error) => <p key={error}>{error}</p>)}</div>}
          <button className="primary-button" type="button" onClick={generatePlan}>GERAR PLANO</button>
        </div>

        <section className="panel result-panel">
          <div className="panel-heading"><div><p className="eyebrow">RECOMENDAÇÃO ATUAL</p><h2>Plano do turno</h2></div><strong>{factory.agora}</strong></div>
          {!result && <div className="result-placeholder"><strong>O motor ainda não foi executado.</strong><p>Preencha o estado do turno e toque em “Gerar plano”.</p></div>}
          {result && <>
            <div className="timeline">
              {result.actions.length === 0 && <p className="empty-state">Nenhuma ação necessária neste momento.</p>}
              {result.actions.map((action, index) => (
                <article className="action" key={`${action.preparadorId}-${action.tipo}-${index}`}>
                  <time>{action.horario}</time><div><h3>{preparadores.get(action.preparadorId)?.nome}</h3><p>{action.tipo === 'jantar' ? 'Jantar' : 'Reserva operacional'}</p><small>{action.motivo}</small>{action.fim && <span className="action-end">Até {action.fim}</span>}</div>
                </article>
              ))}
            </div>
            {result.warnings.length > 0 && <div className="warnings">{result.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>}
          </>}
        </section>
      </section>
    </main>
  );
}
