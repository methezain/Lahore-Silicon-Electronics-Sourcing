console.log("booting");
const { dev } = await import("astro");
const server = await dev({
  root: process.cwd(),
  server: { port: 4471, host: "127.0.0.1" },
  vite: {
    cacheDir: "node_modules/.vite-r0verify",
    server: { strictPort: true, port: 4471, host: "127.0.0.1" },
  },
});
const url = server?.resolvedUrls?.local?.[0] ?? JSON.stringify(server?.address);
console.log("READY " + url);
