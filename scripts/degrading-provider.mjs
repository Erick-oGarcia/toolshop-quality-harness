// A provider that gets slower the longer it has been up, for proving the gate
// notices.
//
// The latency grows with elapsed time, not with the number of requests served.
// The first version counted requests and barely degraded at all: slowing down
// reduces the request rate, which reduces the thing driving the slowdown, so the
// defect throttled itself. Leaks, filling pools and degrading caches grow with
// uptime, and so does this.
//
// This is deliberately the failure the gate is built for. Because the budget is
// calibrated in the same run, a uniformly slower build would move the baseline
// with it and pass; degradation *during* the run is what same-run calibration
// can see.
import http from 'node:http';

const UPSTREAM = process.env.UPSTREAM ?? 'http://localhost:8091';
const PORT = Number(process.env.PORT ?? 8099);
const HEALTHY_MS = Number(process.env.HEALTHY_MS ?? 20_000);
const MS_ADDED_PER_SECOND = Number(process.env.MS_ADDED_PER_SECOND ?? 60);

const startedAt = Date.now();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

http
  .createServer(async (request, response) => {
    const overdueSeconds = Math.max(0, Date.now() - startedAt - HEALTHY_MS) / 1000;
    await sleep(overdueSeconds * MS_ADDED_PER_SECOND);

    const upstream = await fetch(`${UPSTREAM}${request.url}`);
    const body = await upstream.text();

    response.writeHead(upstream.status, { 'Content-Type': 'application/json' });
    response.end(body);
  })
  .listen(PORT, () =>
    console.log(`degrading provider on :${PORT} — healthy for ${HEALTHY_MS / 1000}s`),
  );
