// Espera a stack ficar pronta e imprime o breakdown de tempo.
// Sem dependências: roda igual no Windows local e no runner do CI.
const targets = [
  { name: 'API', url: process.env.API_URL ?? 'http://localhost:8091/status' },
  { name: 'UI', url: process.env.BASE_URL ?? 'http://localhost:4200' },
];
const timeoutMs = Number(process.env.WAIT_TIMEOUT_MS ?? 300_000);
const started = Date.now();

async function waitFor({ name, url }) {
  const t0 = Date.now();
  for (;;) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        console.log(
          `${name.padEnd(4)} pronto em ${((Date.now() - t0) / 1000).toFixed(1)}s (${url})`,
        );
        return;
      }
    } catch {
      // serviço ainda subindo — segue tentando
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error(`${name} não ficou pronto em ${timeoutMs / 1000}s (${url})`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

await Promise.all(targets.map(waitFor));
console.log(`stack pronta em ${((Date.now() - started) / 1000).toFixed(1)}s`);
