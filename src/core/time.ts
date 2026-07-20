export function toMinutes(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) throw new Error(`Horário inválido: ${value}`);

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new Error(`Horário inválido: ${value}`);

  return hours * 60 + minutes;
}

export function fromMinutes(total: number): string {
  if (!Number.isInteger(total) || total < 0 || total >= 24 * 60) {
    throw new Error(`Minutos fora do dia: ${total}`);
  }

  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function addMinutes(value: string, amount: number): string {
  return fromMinutes(toMinutes(value) + amount);
}

export function minutesBetween(from: string, to: string): number {
  return toMinutes(to) - toMinutes(from);
}
