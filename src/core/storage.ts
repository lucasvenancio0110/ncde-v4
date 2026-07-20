import type { FactoryState } from '../domain/types';
import { validateFactoryState } from './draft';

export const FACTORY_STORAGE_KEY = 'ncde-v4:factory-state';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function serializeFactoryState(state: FactoryState): string {
  return JSON.stringify(state);
}

export function parseFactoryState(value: string): FactoryState | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return null;

    const validation = validateFactoryState(parsed as FactoryState);
    return validation.valid ? (parsed as FactoryState) : null;
  } catch {
    return null;
  }
}

export function loadFactoryState(storage: StorageLike): FactoryState | null {
  const saved = storage.getItem(FACTORY_STORAGE_KEY);
  return saved ? parseFactoryState(saved) : null;
}

export function saveFactoryState(storage: StorageLike, state: FactoryState): void {
  storage.setItem(FACTORY_STORAGE_KEY, serializeFactoryState(state));
}

export function clearFactoryState(storage: StorageLike): void {
  storage.removeItem(FACTORY_STORAGE_KEY);
}
