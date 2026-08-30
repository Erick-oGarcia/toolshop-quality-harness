// Runs the performance gate in two passes.
//
// The first measures this machine with no contention; the second runs the load
// profile and has to stay within a multiple of that measurement. Sizing the
// budget from the same host is what makes the gate portable: an absolute
// millisecond figure passes or fails depending on which runner the job landed
// on, and a gate that fires at random gets switched off.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const BASE_URL = process.env.PERF_BASE_URL ?? 'http://host.docker.internal:8091';
const BUDGET_MULTIPLIER = Number(process.env.PERF_BUDGET_MULTIPLIER ?? 2);
// Below this the multiplier would be measuring jitter rather than performance.
const BUDGET_FLOOR_MS = 100;

let failed = false;

function k6(mode, extraEnv = {}) {
  const env = { BASE_URL, MODE: mode, ...extraEnv };
  const envArgs = Object.entries(env).flatMap(([key, value]) => ['--env', `${key}=${value}`]);

  let output;

  try {
    output = execFileSync(
      'docker',
      [
        'run',
        '--rm',
        '-i',
        '--add-host=host.docker.internal:host-gateway',
        'grafana/k6',
        'run',
        ...envArgs,
        '-',
      ],
      {
        input: readScript(),
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'inherit'],
      },
    );
  } catch (error) {
    // k6 exits non-zero when a threshold is breached. That is the gate doing its
    // job, and it deserves a line with the numbers rather than a stack trace.
    output = String(error.stdout ?? Buffer.alloc(0));
    failed = true;
  }

  const line = output.split(String.fromCharCode(10)).find((l) => l.startsWith('HARNESS_SUMMARY '));

  if (line === undefined) {
    throw new Error(`k6 produced no summary in ${mode} mode`);
  }

  return JSON.parse(line.slice('HARNESS_SUMMARY '.length));
}

function readScript() {
  return readFileSync('perf/catalog.js', 'utf8');
}

const baseline = k6('calibrate');
const budget = Math.max(Math.round(baseline.p95 * BUDGET_MULTIPLIER), BUDGET_FLOOR_MS);

console.log(
  `baseline p95 ${baseline.p95.toFixed(1)} ms over ${baseline.requests} requests ` +
    `-> budget ${budget} ms (${BUDGET_MULTIPLIER}x, floor ${BUDGET_FLOOR_MS} ms)`,
);

const loaded = k6('load', { P95_BUDGET_MS: budget });

console.log(
  `under load p95 ${loaded.p95.toFixed(1)} ms over ${loaded.requests} requests, ` +
    `errors ${(loaded.failRate * 100).toFixed(2)}%, failed checks ${(loaded.checksFailed * 100).toFixed(2)}%`,
);

if (failed) {
  console.error(
    `performance gate failed: p95 ${loaded.p95.toFixed(1)} ms exceeded the ${budget} ms budget ` +
      `derived from a ${baseline.p95.toFixed(1)} ms baseline on this machine`,
  );
  process.exit(1);
}
