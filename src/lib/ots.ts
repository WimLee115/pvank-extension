const MAGIC = new Uint8Array([
  0x00, 0x4f, 0x70, 0x65, 0x6e, 0x54, 0x69, 0x6d, 0x65, 0x73, 0x74, 0x61, 0x6d, 0x70, 0x73,
  0x00, 0x00, 0x50, 0x72, 0x6f, 0x6f, 0x66, 0x00, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94,
]);
const VERSION = 0x01;
const OP_SHA256 = 0x08;

const CALENDARS = [
  "https://a.pool.opentimestamps.org",
  "https://b.pool.opentimestamps.org",
  "https://alice.btc.calendar.opentimestamps.org",
];

export async function stamp(digest: Uint8Array): Promise<Uint8Array> {
  if (digest.length !== 32) throw new Error(`Expected 32-byte SHA-256 digest, got ${digest.length}`);

  let lastError: unknown;
  for (const calendar of CALENDARS) {
    try {
      const proof = await fetchCalendar(calendar, digest);
      return wrapOTSFile(digest, proof);
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`All OTS calendars failed: ${String(lastError)}`);
}

async function fetchCalendar(base: string, digest: Uint8Array): Promise<Uint8Array> {
  const body = digest.buffer.slice(digest.byteOffset, digest.byteOffset + digest.byteLength) as ArrayBuffer;
  const res = await fetch(`${base}/digest`, {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/octet-stream",
      Accept: "application/vnd.opentimestamps.v1",
    },
  });
  if (!res.ok) throw new Error(`${base}: HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

function wrapOTSFile(digest: Uint8Array, calendarProof: Uint8Array): Uint8Array {
  const out = new Uint8Array(MAGIC.length + 1 + 1 + 32 + calendarProof.length);
  let offset = 0;
  out.set(MAGIC, offset); offset += MAGIC.length;
  out[offset++] = VERSION;
  out[offset++] = OP_SHA256;
  out.set(digest, offset); offset += 32;
  out.set(calendarProof, offset);
  return out;
}
