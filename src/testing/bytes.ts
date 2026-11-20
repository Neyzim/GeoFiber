/** Texto UTF-8 em bytes criados no contexto atual (evita o `Uint8Array` de outro realm do runner). */
export function strToUtf8(text: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new TextEncoder().encode(text));
}
