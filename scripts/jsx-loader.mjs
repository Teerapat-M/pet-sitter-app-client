import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { loadBindings, transformSync } = require("next/dist/build/swc");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_ROOT = path.join(ROOT, "src");
const STUBS = {
  "next/link": path.join(ROOT, "scripts/test-stubs/next-link.js"),
  "next/navigation": path.join(ROOT, "scripts/test-stubs/next-navigation.js"),
};

export async function initialize() {
  await loadBindings();
}

export async function resolve(specifier, context, nextResolve) {
  if (STUBS[specifier]) {
    return { url: pathToFileURL(STUBS[specifier]).href, shortCircuit: true };
  }
  if (specifier.startsWith("@/")) {
    const base = path.join(SRC_ROOT, specifier.slice(2));
    for (const candidate of [
      base,
      `${base}.js`,
      `${base}.jsx`,
      path.join(base, "index.js"),
    ]) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (!url.startsWith("file:")) return nextLoad(url, context);

  const filePath = fileURLToPath(url);
  const inSrc = filePath.startsWith(SRC_ROOT) && !filePath.endsWith(".test.js");
  const isJsx = filePath.endsWith(".jsx");
  if (!inSrc && !isJsx) return nextLoad(url, context);
  if (!filePath.endsWith(".js") && !filePath.endsWith(".jsx")) {
    return nextLoad(url, context);
  }

  const source = fs.readFileSync(filePath, "utf8");
  const transformed = transformSync(source, {
    filename: filePath,
    jsc: {
      parser: { syntax: "ecmascript", jsx: true },
      transform: { react: { runtime: "automatic" } },
      target: "es2022",
    },
    module: { type: "es6" },
  });

  return { format: "module", source: transformed.code, shortCircuit: true };
}
