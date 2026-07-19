import type {
  FactoryState,
  PlanAction,
  PlanningResult,
  Preparador,
  Setup,
} from '../domain/types';
import { minutesBetween, toMinutes } from './time';

const DINNER_SLOTS = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30'] as const;
const SETUP_PROTECTION_MINUTES = 60;

function isOperationallyAvailable(preparador: Preparador): boolean {
  return preparador.status === 'livre' && !preparador.compromissoAte;
}

function setupNeedsProtection(state: FactoryState, setup: Setup): boolean {
  const delta = minutesBetween(state.agora, setup.horario);
  return delta >= 0 && delta <= SETUP_PROTECTION_MINUTES;
}

function chooseSetupOwner(setup: Setup, available: Preparador[], reservedIds: Set<string>): Preparador | undefined {
  if (setup.responsavelId) {
    return available.find((person) => person.id === setup.responsavelId && !reservedIds.has(person.id));
  }

  return available.find((person) => !reservedIds.has(person.id));
}

function buildDinnerActions(state: FactoryState, reservedIds: Set<string>): PlanAction[] {
  const candidates = state.preparadores.filter(
    (person) => !person.jantarConcluido && isOperationallyAvailable(person) && !reservedIds.has(person.id),
  );

  const actions: PlanAction[] = [];
  let candidateIndex = 0;

  for (const slot of DINNER_SLOTS) {
    if (toMinutes(slot) < toMinutes(state.agora)) continue;
    const person = candidates[candidateIndex];
    if (!person) break;

    actions.push({
      horario: slot,
      preparadorId: person.id,
      tipo: 'jantar',
      motivo: 'Horário definido sem comprometer setups protegidos.',
    });
    candidateIndex += 1;
  }

  return actions;
}

export function planShift(state: FactoryState): PlanningResult {
  const actions: PlanAction[] = [];
  const warnings: string[] = [];
  const reservedIds = new Set<string>();
  const available = state.preparadores.filter(isOperationallyAvailable);

  const criticalSetups = [...state.setups]
    .filter((setup) => setupNeedsProtection(state, setup))
    .sort((a, b) => toMinutes(a.horario) - toMinutes(b.horario));

  for (const setup of criticalSetups) {
    const owner = chooseSetupOwner(setup, available, reservedIds);

    if (!owner) {
      warnings.push(`Setup da ${setup.maquina} às ${setup.horario} está sem preparador disponível.`);
      continue;
    }

    reservedIds.add(owner.id);
    actions.push({
      horario: state.agora,
      preparadorId: owner.id,
      tipo: 'reservar_setup',
      motivo: `Proteger setup da ${setup.maquina} às ${setup.horario}.`,
    });
  }

  actions.push(...buildDinnerActions(state, reservedIds));

  return {
    actions,
    warnings,
    valid: warnings.length === 0,
  };
}
