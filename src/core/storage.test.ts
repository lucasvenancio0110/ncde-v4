import { describe, expect, it } from 'vitest';
import type { FactoryState } from '../domain/types';
import {
  FACTORY_STORAGE_KEY,
  clearFactoryState,
  loadFactoryState,
  parseFactoryState,
  saveFactoryState,
  serializeFactoryState,
  type StorageLike,
} from './storage';

const validState: FactoryState = {
  agora: '18:00',
  fimTurno: '22:30',
  preparadores: [
    { id: 'lucas', nome: 'Lucas', status: 'livre', jantarConcluido: false },
  ],
  setups: [],
};

function createStorage(): StorageLike {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe('factory storage', () => {
  it('serializa e recupera um estado válido', () => {
    expect(parseFactoryState(serializeFactoryState(validState))).toEqual(validState);
  });

  it('ignora JSON inválido', () => {
    expect(parseFactoryState('{')).toBeNull();
  });

  it('ignora rascunho salvo que não passa na validação', () => {
    expect(parseFactoryState(JSON.stringify({ ...validState, preparadores: [] }))).toBeNull();
  });

  it('salva, carrega e remove o estado usando a chave oficial', () => {
    const storage = createStorage();

    saveFactoryState(storage, validState);
    expect(storage.getItem(FACTORY_STORAGE_KEY)).not.toBeNull();
    expect(loadFactoryState(storage)).toEqual(validState);

    clearFactoryState(storage);
    expect(loadFactoryState(storage)).toBeNull();
  });
});
