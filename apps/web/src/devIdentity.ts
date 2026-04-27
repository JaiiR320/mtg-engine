export type DevIdentity = {
  id: string;
  name: string;
};

const userIdKey = "mtg-engine.devUserId";
const displayNameKey = "mtg-engine.devDisplayName";

export function getDevIdentity(): DevIdentity {
  const existingId = localStorage.getItem(userIdKey);
  const existingName = localStorage.getItem(displayNameKey);
  if (existingId && existingName) return { id: existingId, name: existingName };

  const suffix = Math.random().toString(36).slice(2, 8);
  const identity = {
    id: `player_${suffix}`,
    name: `Player ${suffix}`,
  };
  localStorage.setItem(userIdKey, identity.id);
  localStorage.setItem(displayNameKey, identity.name);
  return identity;
}
