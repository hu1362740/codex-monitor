import { gzipSync } from "node:zlib";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dist = new URL("../dist", import.meta.url);
const files = readdirSync(dist).filter((file) => file.endsWith(".js"));

for (const file of files) {
  const buffer = readFileSync(join(dist.pathname, file));
  const gzip = gzipSync(buffer);
  console.log(`${file}: ${(buffer.length / 1024).toFixed(2)} KB, gzip ${(gzip.length / 1024).toFixed(2)} KB`);
}
