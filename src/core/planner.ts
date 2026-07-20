import type { FactoryState, PlanAction, PlanningResult, Preparador, Setup } from '../domain/types';
import { addMinutes, fromMinutes, minutesBetween, toMinutes } from './time';

const DINNER_SLOTS = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30'] as const;
const DINNER_DURATION_MINUTES = 60;
const SETUP_PROTECTION_HORIZON_MINUTES = 60;
const SETUP_PREPARATION_BUFFER_MINUTES = 30;

interface Occupation {
  start: number;
  end: number;
}

function availabilityStart(state: FactoryState, preparador: Preparador): number | undefined {
  const now = toMinutes(state.agora);

  if (preparador.status === 'indisponivel') return undefined;
  if (preparador.status === 'livre' && !preparador.compromissoAte) return now;
  if (!preparador.compromissoAte) return undefined;

  return Math.max(now, toMinutes(preparador.compromissoAte));
}

function setupNeedsProtection(state: FactoryState, setup: Setup): boolean {
  const delta = minutesBetween(state.agora, setup.horario);
  return delta >= 0 && delta <= SETUP_PROTECTION_HORIZON_MINUTES;
}

function overlaps(left: Occupation, right: Occupation): boolean {
  return left.start < right.end && right.start < left.end;
}

function setupOccupation(state: FactoryState, setup: Setup): Occupation {
  return {
    start: Math.max(toMinutes(state.agora), toMinutes(setup.horario) - SETUP_PREPARATION_BUFFER_MINUTES),
    end: toMinutes(setup.horario) + setup.duracaoEstimadaMin,
  };
}

function hasConflict(occupations: Occupation[], candidate: Occupation): boolean {
  return occupations.some((occupation) => overlaps(occupation, candidate));
}

function canReceiveAt(
  state: FactoryState,
  preparador: Preparador,
  agendas: Map<string, Occupation[]>,
  occupation: Occupation,
): boolean {
  const availableAt = availabilityStart(state, preparador);

  return (
    availableAt !== undefined &&
    availableAt <= occupation.start &&
    !hasConflict(agendas.get(preparador.id) ?? [], occupation)
  );
}

function chooseSetupOwner(
  setup: Setup,
  preparadores: Preparador[],
  state: FactoryState,
  agendas: Map<string, Occupation[]>,
  occupation: Occupation,
): Preparador | undefined {
  if (setup.responsavelId) {
    return preparadores.find(
      (person) => person.id === setup.responsavelId && canReceiveAt(state, person, agendas, occupation),
    );
  }

  return preparadores.find((person) => canReceiveAt(state, person, agendas, occupation));
}

function buildDinnerActions(state: FactoryState, agendas: Map<string, Occupation[]>): PlanAction[] {
  const candidates = state.preparadores.filter(
    (person) => !person.jantarConcluido && availabilityStart(state, person) !== undefined,
  );
  const assigned = new Set<string>();
  const actions: PlanAction[] = [];

  for (const slot of DINNER_SLOTS) {
    const start = toMinutes(slot);
    const end = start + DINNER_DURATION_MINUTES;
    if (start < toMinutes(state.agora) || end > toMinutes(state.fimTurno)) continue;

    const person = candidates.find((candidate) => {
      const availableAt = availabilityStart(state, candidate);

      return (
        !assigned.has(candidate.id) &&
        availableAt !== undefined &&
        availableAt <= start &&
        !hasConflict(agendas.get(candidate.id) ?? [], { start, end })
      );
    });
    if (!person) continue;

    assigned.add(person.id);
    agendas.set(person.id, [...(agendas.get(person.id) ?? []), { start, end }]);
    actions.push({
      horario: slot,
      fim: addMinutes(slot, DINNER_DURATION_MINUTES),
      preparadorId: person.id,
      tipo: 'jantar',
      motivo: 'Horário definido após o compromisso atual e sem conflito com setups protegidos.',
    });
  }

  return actions;
}

export function planShift(state: FactoryState): PlanningResult {
  const actions: PlanAction[] = [];
  const warnings: string[] = [];
  const agendas = new Map<string, Occupation[]>();

  const criticalSetups = [...state.setups]
    .filter((setup) => setupNeedsProtection(state, setup))
    .sort((a, b) => toMinutes(a.horario) - toMinutes(b.horario));

  for (const setup of criticalSetups) {
    const occupation = setupOccupation(state, setup);

    if (occupation.end > toMinutes(state.fimTurno)) {
      warnings.push(`O setup da ${setup.maquina} ultrapassa o fim do turno (${state.fimTurno}).`);
    }

    const owner = chooseSetupOwner(setup, state.preparadores, state, agendas, occupation);

    if (!owner) {
      const ownerMessage = setup.responsavelId
        ? 'O responsável definido não estará disponível a tempo'
        : 'Não há preparador disponível a tempo';
      warnings.push(`${ownerMessage} para o setup da ${setup.maquina} às ${setup.horario}.`);
      continue;
    }

    agendas.set(owner.id, [...(agendas.get(owner.id) ?? []), occupation]);
    actions.push({
      horario: fromMinutes(occupation.start),
      fim: fromMinutes(occupation.end),
      preparadorId: owner.id,
      tipo: 'reservar_setup',
      motivo: `Proteger setup da ${setup.maquina} às ${setup.horario}.`,
      referenciaId: setup.id,
    });
  }

  actions.push(...buildDinnerActions(state, agendas));
  actions.sort((left, right) => {
    const timeDifference = toMinutes(left.horario) - toMinutes(right.horario);
    if (timeDifference !== 0) return timeDifference;
    return left.tipo === 'reservar_setup' ? -1 : 1;
  });

  return {
    actions,
    warnings,
    valid: warnings.length === 0,
  };
}
