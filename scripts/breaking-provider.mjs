// A provider that dropped a field, for proving the contract notices.
//
// It forwards everything to the real API and removes `in_stock` from each
// product on the way back — the shape of change a provider team makes when a
// field looks unused. The consumer reads it, so the contract should refuse.
import http from 'node:http';

const UPSTREAM = process.env.UPSTREAM ?? 'http://localhost:8091';
const PORT = Number(process.env.PORT ?? 8099);

http
  .createServer(async (request, response) => {
    const upstream = await fetch(`${UPSTREAM}${request.url}`);
    const body = await upstream.json();

    if (Array.isArray(body?.data)) {
      for (const product of body.data) {
        delete product.in_stock;
      }
    }

    response.writeHead(upstream.status, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(body));
  })
  .listen(PORT, () => console.log(`breaking provider on :${PORT} -> ${UPSTREAM}`));
