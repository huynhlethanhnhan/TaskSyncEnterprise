export const isValidEntityId = (id: unknown): id is number =>
  typeof id === 'number' &&
  Number.isFinite(id) &&
  Number.isInteger(id) &&
  id > 0;
