import { openAsBlob } from "node:fs";
import { basename } from "node:path";

const [apiBase, token, applicationId, release, filePath, sourceRoot] = process.argv.slice(2);

if (!apiBase || !token || !applicationId || !release || !filePath) {
  console.error("Usage: node scripts/upload-sourcemap.mjs <apiBase> <jwtToken> <applicationId> <release> <filePath> [sourceRoot]");
  process.exit(1);
}

const form = new FormData();
form.set("applicationId", applicationId);
form.set("release", release);
if (sourceRoot) {
  form.set("sourceRoot", sourceRoot);
}
form.set("file", await openAsBlob(filePath), basename(filePath));

const response = await fetch(`${apiBase.replace(/\/$/, "")}/sourcemaps/upload`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`
  },
  body: form
});

if (!response.ok) {
  console.error(await response.text());
  process.exit(1);
}

console.log(await response.json());
