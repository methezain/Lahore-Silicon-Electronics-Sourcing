/**
 * Production preview with gzip, so Lighthouse transfer sizes are compressed bytes.
 * docs/engineering.md#performance-budgets. Cloudflare compresses at the edge;
 * `astro preview` does not.
 */
import { spawn } from "node:child_process";
import http from "node:http";
import { gzipSync } from "node:zlib";

const originPort = 4323;
const listenPort = 4322;
const compressible = /text|javascript|json|xml|svg/;

const preview = spawn(
  "npx",
  ["astro", "preview", "--force", "--host", "127.0.0.1", "--port", String(originPort)],
  { shell: true, stdio: ["ignore", "pipe", "pipe"] },
);

preview.stdout.on("data", (chunk) => process.stderr.write(chunk));
preview.stderr.on("data", (chunk) => process.stderr.write(chunk));

function stop(code) {
  preview.kill();
  process.exit(code);
}

preview.on("exit", (code) => {
  if (code) stop(code ?? 1);
});

async function originReady() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const ok = await new Promise((resolve) => {
        const req = http.get(`http://127.0.0.1:${originPort}/`, (res) => {
          res.resume();
          resolve(res.statusCode && res.statusCode < 500);
        });
        req.on("error", () => resolve(false));
        req.setTimeout(2000, () => {
          req.destroy();
          resolve(false);
        });
      });
      if (ok) return;
    } catch {
      // Preview is still booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Preview did not start.");
}

function proxy(req, res) {
  const headers = { ...req.headers, host: `127.0.0.1:${originPort}` };
  const upstreamReq = http.request(
    {
      hostname: "127.0.0.1",
      port: originPort,
      path: req.url,
      method: req.method,
      headers,
    },
    (upstream) => {
      const chunks = [];
      upstream.on("data", (chunk) => chunks.push(chunk));
      upstream.on("end", () => {
        const body = Buffer.concat(chunks);
        const type = String(upstream.headers["content-type"] ?? "");
        const accept = String(req.headers["accept-encoding"] ?? "");
        const encoded = upstream.headers["content-encoding"];
        /** @type {Record<string, string | string[] | undefined>} */
        const out = { ...upstream.headers };
        delete out["transfer-encoding"];
        delete out["content-length"];
        delete out.connection;
        delete out["keep-alive"];
        let payload = body;
        if (!encoded && accept.includes("gzip") && compressible.test(type) && body.length > 256) {
          payload = gzipSync(body);
          out["content-encoding"] = "gzip";
          const vary = String(out.vary ?? "");
          if (!/accept-encoding/i.test(vary)) out.vary = vary ? `${vary}, Accept-Encoding` : "Accept-Encoding";
        }
        out["content-length"] = String(payload.length);
        res.writeHead(upstream.statusCode ?? 200, out);
        res.end(payload);
      });
    },
  );
  upstreamReq.on("error", () => {
    res.writeHead(502);
    res.end();
  });
  req.pipe(upstreamReq);
}

await originReady();
const server = http.createServer(proxy);
await new Promise((resolve) => server.listen(listenPort, "127.0.0.1", resolve));
console.log(`compressed preview ready http://127.0.0.1:${listenPort}/`);

process.on("SIGTERM", () => stop(0));
process.on("SIGINT", () => stop(0));
