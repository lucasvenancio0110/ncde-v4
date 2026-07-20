import { describe, expect, it } from 'vitest';
import type { FactoryState } from '../domain/types';
import { validateFactoryState } from './draft';

const validState: FactoryState = {
  agora: '18:00',
  fimTurno: '22:30',
  preparadores: [{ id: 'lucas', nome: 'Lucas', status: 'livre', jantarConcluido: false }],
  setups: [{ id: 'setup-130', maquina: 'TNL 130', horario: '19:00', duracaoEstimadaMin: 120, prioridade: 'alta' }],
};

describe('validateFactoryState', () => {
  it('aceita um estado operacional completo', () => {
    expect(validateFactoryState(validState)).toEqual({ valid: true, errors: [] });
  });

  it('exige pelo menos um preparador', () => {
    const result = validateFactoryState({ ...validState, preparadores: [] });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Adicione pelo menos um preparador.');
  });

  it('bloqueia nomes duplicados ignorando maiúsculas e espaços', () => {
    const result = validateFactoryState({
      ...validState,
      preparadores: [
        { id: '1', nome: 'Lucas', status: 'livre', jantarConcluido: false },
        { id: '2', nome: ' lucas ', status: 'livre', jantarConcluido: false },
      ],
    });

    expect(result.errors).toContain('Não use nomes de preparadores duplicados.');
  });

  it('rejeita duração inválida de setup', () => {
    const result = validateFactoryState({
      ...validState,
      setups: [{ ...validState.setups[0], duracaoEstimadaMin: 0 }],
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('duração válida');
  });

  it('rejeita fim de turno anterior ao horário atual', () => {
    const result = validateFactoryState({ ...validState, agora: '22:00', fimTurno: '21:00' });

    expect(result.errors).toContain('O fim do turno precisa ser posterior ao horário atual.');
  });
});
