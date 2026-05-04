// 轻量、确定性、跨浏览器一致的伪随机/哈希工具，
// 替代 Python random.Random + hashlib.sha256；
// 不要求与 Python 实现二进制一致，只要求自身可重现。

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function randUniform(rng: () => number, low: number, high: number): number {
  return low + (high - low) * rng();
}

export function randChoice<T>(rng: () => number, items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error("randChoice on empty array");
  }
  const idx = Math.floor(rng() * items.length);
  return items[Math.min(idx, items.length - 1)] as T;
}

// cyrb53 是稳定可重现的字符串哈希，输出 53bit 整数（JS 安全整数范围内）。
// 用于在 action_flavor 里替代 hashlib.sha256 的截断式 seed 计算。
export function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
