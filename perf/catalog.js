import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL;
const MODE = __ENV.MODE ?? 'load';

/**
/**
 * Two modes, one script, at the same concurrency.
 *
 * `calibrate` runs a short pass of the load profile to learn what this machine
 * does when the application is healthy. `load` runs the full profile and has to
 * stay within a small multiple of that.
 *
 * Calibrating at one idle user was the first attempt and it was wrong: the
 * multiplier then had to absorb the cost of concurrency itself, so a perfectly
 * healthy app measured 6x its idle latency and the gate fired on it. Comparing
 * like with like leaves the multiplier covering only run-to-run variance, which
 * is what it is for.
 *
 * The error rate stays absolute: a failed request is a failure on any hardware.
 */
const LOAD_STAGES = [
  { duration: '10s', target: 10 },
  { duration: '20s', target: 10 },
  { duration: '5s', target: 0 },
];

export const options =
  MODE === 'calibrate'
    ? {
        stages: [
          { duration: '5s', target: 10 },
          { duration: '10s', target: 10 },
        ],
        thresholds: { http_req_failed: ['rate<0.01'] },
      }
    : {
        stages: LOAD_STAGES,
        thresholds: {
          http_req_failed: ['rate<0.01'],
          http_req_duration: [`p(95)<${__ENV.P95_BUDGET_MS}`],
        },
      };

export default function () {
  const response = http.get(`${BASE_URL}/products?page=1`);

  // A 500 returned quickly is not a fast endpoint. Without this the latency
  // numbers would improve as the application got worse.
  check(response, {
    'status is 200': (r) => r.status === 200,
    'body carries products': (r) => (r.json('data') ?? []).length > 0,
  });
}

export function handleSummary(data) {
  const summary = {
    p95: data.metrics.http_req_duration.values['p(95)'],
    failRate: data.metrics.http_req_failed.values.rate,
    checksFailed: data.metrics.checks ? 1 - data.metrics.checks.values.rate : 0,
    requests: data.metrics.http_reqs.values.count,
  };

  // Marked so the orchestrator can find it: k6 writes its own progress to the
  // same stream, and picking "the last line" would depend on that formatting.
  return { stdout: 'HARNESS_SUMMARY ' + JSON.stringify(summary) + '\n' };
}
