import { describe, expect, it } from 'vitest';
import type { FactoryState } from '../domain/types';
import { planShift } from './planner';

const baseState: FactoryState = {
  agora: '18:00',
  fimTurno: '22:30',
  preparadores: [
    { id: 'lucas', nome: 'Lucas', status: 'livre', jantarConcluido: false },
    { id: 'alan', nome: 'Alan', status: 'livre', jantarConcluido: false },
    { id: 'gabriel', nome: 'Gabriel', status: 'ajuste', jantarConcluido: false },
  ],
  setups: [],
};

describe('planShift', () => {
  it('protege o setup e bloqueia jantar conflitante do responsável', () => {
    const result = planShift({
      ...baseState,
      setups: [
        {
          id: 'setup-130',
          maquina: 'TNL 130',
          horario: '19:00',
          duracaoEstimadaMin: 120,
          prioridade: 'alta',
        },
      ],
    });

    expect(result.valid).toBe(true);
    expect(result.actions.find((action) => action.tipo === 'reservar_setup')).toMatchObject({
      horario: '18:30',
      fim: '21:00',
      preparadorId: 'lucas',
      referenciaId: 'setup-130',
    });
    expect(result.actions.some((action) => action.preparadorId === 'lucas' && action.tipo === 'jantar')).toBe(false);
    expect(result.actions.some((action) => action.preparadorId === 'alan' && action.tipo === 'jantar')).toBe(true);
  });

  it('respeita o responsável previamente definido para o setup', () => {
    const result = planShift({
      ...baseState,
      setups: [
        {
          id: 'setup-130',
          maquina: 'TNL 130',
          horario: '18:30',
          responsavelId: 'alan',
          duracaoEstimadaMin: 120,
          prioridade: 'alta',
        },
      ],
    });

    expect(result.actions.find((action) => action.tipo === 'reservar_setup')).toMatchObject({
      preparadorId: 'alan',
    });
  });

  it('marca o plano como inválido quando não há preparador para setup crítico', () => {
    const result = planShift({
      ...baseState,
      preparadores: baseState.preparadores.map((person) => ({ ...person, status: 'ajuste' as const })),
      setups: [
        {
          id: 'setup-130',
          maquina: 'TNL 130',
          horario: '18:30',
          duracaoEstimadaMin: 120,
          prioridade: 'alta',
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.warnings).toHaveLength(1);
  });

  it('não permite dois setups sobrepostos para o mesmo responsável', () => {
    const result = planShift({
      ...baseState,
      setups: [
        {
          id: 'setup-130',
          maquina: 'TNL 130',
          horario: '18:30',
          responsavelId: 'lucas',
          duracaoEstimadaMin: 120,
          prioridade: 'alta',
        },
        {
          id: 'setup-005',
          maquina: 'TNL 005',
          horario: '19:00',
          responsavelId: 'lucas',
          duracaoEstimadaMin: 120,
          prioridade: 'alta',
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.warnings[0]).toContain('responsável definido não estará disponível');
  });

  it('ignora slots de jantar que já passaram', () => {
    const result = planShift({ ...baseState, agora: '19:10' });

    expect(result.actions[0]?.horario).toBe('19:30');
  });

  it('não agenda jantar depois do fim do turno', () => {
    const result = planShift({ ...baseState, agora: '20:00', fimTurno: '21:00' });

    expect(result.actions).toHaveLength(1);
    expect(result.actions[0]).toMatchObject({ horario: '20:00', fim: '21:00', tipo: 'jantar' });
  });

  it('usa um preparador que termina o ajuste antes da reserva do setup', () => {
    const result = planShift({
      ...baseState,
      preparadores: [
        {
          id: 'lucas',
          nome: 'Lucas',
          status: 'ajuste',
          compromissoAte: '18:20',
          jantarConcluido: false,
        },
        { id: 'alan', nome: 'Alan', status: 'indisponivel', jantarConcluido: false },
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
    });

    expect(result.valid).toBe(true);
    expect(result.actions.find((action) => action.tipo === 'reservar_setup')).toMatchObject({
      preparadorId: 'lucas',
      horario: '18:30',
    });
  });

  it('rejeita o responsável quando o compromisso termina depois da preparação', () => {
    const result = planShift({
      ...baseState,
      preparadores: [
        {
          id: 'lucas',
          nome: 'Lucas',
          status: 'ajuste',
          compromissoAte: '18:40',
          jantarConcluido: false,
        },
      ],
      setups: [
        {
          id: 'setup-130',
          maquina: 'TNL 130',
          horario: '19:00',
          responsavelId: 'lucas',
          duracaoEstimadaMin: 120,
          prioridade: 'alta',
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.warnings[0]).toContain('não estará disponível a tempo');
  });

  it('agenda jantar somente depois do término do compromisso atual', () => {
    const result = planShift({
      ...baseState,
      preparadores: [
        {
          id: 'lucas',
          nome: 'Lucas',
          status: 'ajuste',
          compromissoAte: '18:20',
          jantarConcluido: false,
        },
      ],
    });

    expect(result.actions).toHaveLength(1);
    expect(result.actions[0]).toMatchObject({ preparadorId: 'lucas', horario: '18:30', tipo: 'jantar' });
  });

  it('não cria reserva com horário anterior ao momento atual', () => {
    const result = planShift({
      ...baseState,
      setups: [
        {
          id: 'setup-130',
          maquina: 'TNL 130',
          horario: '18:10',
          duracaoEstimadaMin: 60,
          prioridade: 'alta',
        },
      ],
    });

    expect(result.actions.find((action) => action.tipo === 'reservar_setup')?.horario).toBe('18:00');
  });

  it('alerta quando um setup protegido ultrapassa o fim do turno', () => {
    const result = planShift({
      ...baseState,
      agora: '21:00',
      setups: [
        {
          id: 'setup-130',
          maquina: 'TNL 130',
          horario: '21:30',
          duracaoEstimadaMin: 120,
          prioridade: 'alta',
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.warnings).toContain('O setup da TNL 130 ultrapassa o fim do turno (22:30).');
  });
});
