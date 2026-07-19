export function toMinutes(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) throw new Error(`Horário inválido: ${value}`);

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new Error(`Horário inválido: ${value}`);

  return hours * 60 + minutes;
}

export function minutesBetween(from: string, to: string): number {
  return toMinutes(to) - toMinutes(from);
}
