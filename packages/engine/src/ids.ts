let nextId = 1;

export function createId(prefix: string): string {
  return `${prefix}_${nextId++}`;
}

export function resetIdsForTests(): void {
  nextId = 1;
}
