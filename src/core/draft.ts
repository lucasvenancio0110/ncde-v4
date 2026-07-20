import type { FactoryState } from '../domain/types';
import { toMinutes } from './time';

export interface DraftValidation {
  valid: boolean;
  errors: string[];
}

export function validateFactoryState(state: FactoryState): DraftValidation {
  const errors: string[] = [];

  try {
    if (toMinutes(state.agora) >= toMinutes(state.fimTurno)) {
      errors.push('O fim do turno precisa ser posterior ao horário atual.');
    }
  } catch {
    errors.push('Revise os horários do turno.');
  }

  if (state.preparadores.length === 0) {
    errors.push('Adicione pelo menos um preparador.');
  }

  const names = state.preparadores.map((person) => person.nome.trim().toLocaleLowerCase('pt-BR'));
  if (names.some((name) => !name)) {
    errors.push('Todos os preparadores precisam ter nome.');
  }

  if (new Set(names).size !== names.length) {
    errors.push('Não use nomes de preparadores duplicados.');
  }

  for (const setup of state.setups) {
    if (!setup.maquina.trim()) {
      errors.push('Todos os setups precisam informar a máquina.');
    }

    if (!Number.isFinite(setup.duracaoEstimadaMin) || setup.duracaoEstimadaMin <= 0) {
      errors.push(`Informe uma duração válida para o setup da ${setup.maquina || 'máquina sem nome'}.`);
    }

    try {
      toMinutes(setup.horario);
    } catch {
      errors.push(`Revise o horário do setup da ${setup.maquina || 'máquina sem nome'}.`);
    }
  }

  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}
