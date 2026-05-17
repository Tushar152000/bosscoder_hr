const AVATAR_COLORS = [
  '#0C447C', '#1D9E75', '#534AB7', '#993556',
  '#D85A30', '#BA7517', '#378ADD',
] as const;

export function colorForName(name: string): string {
  const sum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}
