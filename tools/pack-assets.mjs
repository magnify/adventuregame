#!/usr/bin/env node
// Repeatable step 2 of the asset pipeline: takes the already-merged/pre-baked
// GLBs in assets-src/ and meshopt-compresses them for the web build.
//
// Step 1 (extracting + merging the raw Quaternius/KayKit kits into
// assets-src/nature.glb and assets-src/rogue.glb) is a one-off, kit-specific
// job — see assets-src/README.md. This script only does the part that needs
// to run every time an input changes.
//
// Output goes to public/models/*.glb, loaded at runtime with three's
// GLTFLoader + MeshoptDecoder (from the `meshoptimizer` package) — see
// src/game/app.js for the loader wiring.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC_DIR = path.join(ROOT, 'assets-src');
const OUT_DIR = path.join(ROOT, 'public', 'models');

const FILES = ['nature.glb', 'rogue.glb'];

function kb(bytes) {
  return `${(bytes / 1024).toFixed(0)}KB`;
}

async function main() {
  await MeshoptEncoder.ready;
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

  for (const file of FILES) {
    const inPath = path.join(SRC_DIR, file);
    if (!fs.existsSync(inPath)) {
      console.error(`missing ${inPath} — see assets-src/README.md`);
      process.exitCode = 1;
      continue;
    }
    const before = fs.statSync(inPath).size;

    const doc = await io.read(inPath);
    await doc.transform(
      dedup(),
      prune(),
      meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
    );

    const outPath = path.join(OUT_DIR, file);
    await io.write(outPath, doc);
    const after = fs.statSync(outPath).size;

    console.log(`${file}: ${kb(before)} -> ${kb(after)} (${outPath})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
