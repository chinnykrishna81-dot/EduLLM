function viewerSeed(): string {
  try {
    const token = localStorage.getItem('edullm_student_token');
    if (token) return token;
    const key = 'edullm_option_shuffle_seed';
    let seed = localStorage.getItem(key);
    if (!seed) {
      seed = `${Date.now()}-${Math.random()}-${Math.random()}`;
      localStorage.setItem(key, seed);
    }
    return seed;
  } catch {
    return 'anonymous';
  }
}

function hash(value: string): number {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function shuffleForStudent<T>(values: T[], itemId: string): T[] {
  const result = [...values];
  let state = hash(`${viewerSeed()}:${itemId}`) || 1;
  for (let index = result.length - 1; index > 0; index -= 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const swap = (state >>> 0) % (index + 1);
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}
