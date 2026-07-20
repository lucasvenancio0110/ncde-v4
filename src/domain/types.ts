export type PreparadorStatus =
  | 'livre'
  | 'setup'
  | 'ajuste'
  | 'revezamento'
  | 'jantar'
  | 'reservado'
  | 'indisponivel';

export interface Preparador {
  id: string;
  nome: string;
  status: PreparadorStatus;
  jantarConcluido: boolean;
  compromissoAte?: string;
}

export interface Setup {
  id: string;
  maquina: string;
  horario: string;
  responsavelId?: string;
  duracaoEstimadaMin: number;
  prioridade: 'alta' | 'normal';
}

export interface FactoryState {
  agora: string;
  fimTurno: string;
  preparadores: Preparador[];
  setups: Setup[];
}

export interface PlanAction {
  horario: string;
  fim?: string;
  preparadorId: string;
  tipo: 'jantar' | 'reservar_setup';
  motivo: string;
  referenciaId?: string;
}

export interface PlanningResult {
  actions: PlanAction[];
  warnings: string[];
  valid: boolean;
}
