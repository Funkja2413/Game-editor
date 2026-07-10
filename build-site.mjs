import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(join(dist, "server"), { recursive: true });

for (const file of ["index.html", "styles.css", "app.js"]) {
  await cp(join(root, file), join(dist, file));
}

for (const directory of ["assets", "data"]) {
  await cp(join(root, directory), join(dist, directory), { recursive: true });
}

await writeFile(
  join(dist, "server", "index.js"),
  `const immutableAssetPattern = /\\\\.(?:png|jpg|jpeg|gif|webp|avif|ico|svg|js|css|json|woff2?)$/i;

function withHeaders(response, pathname) {
  const headers = new Headers(response.headers);
  if (!headers.has("cache-control") && immutableAssetPattern.test(pathname)) {
    headers.set("cache-control", "public, max-age=31536000, immutable");
  }
  headers.set("x-content-type-options", "nosniff");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) return withHeaders(assetResponse, url.pathname);

    const fallbackUrl = new URL(request.url);
    fallbackUrl.pathname = "/index.html";
    fallbackUrl.search = "";
    const fallbackResponse = await env.ASSETS.fetch(new Request(fallbackUrl, request));
    return withHeaders(fallbackResponse, "/index.html");
  }
};
`
);
