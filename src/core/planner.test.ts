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
  it('reserva um preparador para setup crítico antes de montar os jantares', () => {
    const result = planShift({
      ...baseState,
      setups: [{ id: 'setup-130', maquina: 'TNL 130', horario: '19:00', duracaoEstimadaMin: 120, prioridade: 'alta' }],
    });

    expect(result.valid).toBe(true);
    expect(result.actions[0]).toMatchObject({ preparadorId: 'lucas', tipo: 'reservar_setup' });
    expect(result.actions.some((action) => action.preparadorId === 'lucas' && action.tipo === 'jantar')).toBe(false);
    expect(result.actions.some((action) => action.preparadorId === 'alan' && action.tipo === 'jantar')).toBe(true);
  });

  it('respeita o responsável previamente definido para o setup', () => {
    const result = planShift({
      ...baseState,
      setups: [{ id: 'setup-130', maquina: 'TNL 130', horario: '18:30', responsavelId: 'alan', duracaoEstimadaMin: 120, prioridade: 'alta' }],
    });

    expect(result.actions[0]).toMatchObject({ preparadorId: 'alan', tipo: 'reservar_setup' });
  });

  it('marca o plano como inválido quando não há preparador para setup crítico', () => {
    const result = planShift({
      ...baseState,
      preparadores: baseState.preparadores.map((person) => ({ ...person, status: 'ajuste' as const })),
      setups: [{ id: 'setup-130', maquina: 'TNL 130', horario: '18:30', duracaoEstimadaMin: 120, prioridade: 'alta' }],
    });

    expect(result.valid).toBe(false);
    expect(result.warnings).toHaveLength(1);
  });
});
