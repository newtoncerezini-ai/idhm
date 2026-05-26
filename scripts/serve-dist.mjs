import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = join(process.cwd(), "dist");
const port = Number(process.env.PORT ?? 5173);

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function fileFor(url) {
  const pathname = decodeURIComponent(new URL(url, `http://localhost:${port}`).pathname);
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const candidate = join(root, safe);
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  return join(root, "index.html");
}

createServer((req, res) => {
  const file = fileFor(req.url ?? "/");
  res.setHeader("Content-Type", types[extname(file)] ?? "application/octet-stream");
  createReadStream(file)
    .on("error", () => {
      res.statusCode = 404;
      res.end("Not found");
    })
    .pipe(res);
}).listen(port, "0.0.0.0", () => {
  console.log(`Serving ${root} at http://localhost:${port}`);
});
