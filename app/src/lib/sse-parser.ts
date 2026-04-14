/**
 * Shared SSE (Server-Sent Events) stream parser.
 *
 * Reads from a ReadableStream and yields the payload portion (after `data: `)
 * of each SSE line. Callers handle JSON.parse and branching on the payload.
 */
export async function* parseSSE(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<string, void, void> {
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.startsWith('data: ')) yield line.slice(6);
    }
  }
}
