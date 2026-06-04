#!/usr/bin/env node

import { timingSafeEqual, createHash } from "node:crypto";
import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { gunzipSync } from "node:zlib";

const root = process.cwd();
const assetsDir = path.join(root, "assets");
const aboutPath = path.join(root, "about.json");
const registryUrl = "https://registry.npmjs.org/mermaid";
const bundlePathInPackage = "package/dist/mermaid.min.js";

async function fetchResponse(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`
    );
  }

  return response;
}

async function fetchJson(url) {
  return (await fetchResponse(url)).json();
}

async function fetchBuffer(url) {
  return Buffer.from(await (await fetchResponse(url)).arrayBuffer());
}

async function fetchPackageMetadata(versionArg) {
  const requestedVersion = versionArg?.replace(/^v/, "") || "latest";

  if (requestedVersion === "latest") {
    return fetchJson(`${registryUrl}/latest`);
  }

  validateVersion(requestedVersion);
  return fetchJson(`${registryUrl}/${requestedVersion}`);
}

function validateVersion(version) {
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(
      `Invalid Mermaid version "${version}". Use a version like "11.12.2" or omit it for latest.`
    );
  }
}

function verifyIntegrity(buffer, integrity) {
  if (!integrity) {
    throw new Error("Package metadata does not include an integrity hash.");
  }

  const supportedIntegrity = integrity
    .split(/\s+/)
    .map((entry) => entry.match(/^(sha(?:256|384|512))-(.+)$/))
    .find(Boolean);

  if (!supportedIntegrity) {
    throw new Error(`Unsupported package integrity format: ${integrity}`);
  }

  const [, algorithm, expectedBase64Digest] = supportedIntegrity;
  const actualDigest = createHash(algorithm).update(buffer).digest();
  const expectedDigest = Buffer.from(expectedBase64Digest, "base64");

  if (
    actualDigest.length !== expectedDigest.length ||
    !timingSafeEqual(actualDigest, expectedDigest)
  ) {
    throw new Error(`Integrity check failed for Mermaid package tarball.`);
  }
}

function readTarString(buffer, start, length) {
  return buffer
    .subarray(start, start + length)
    .toString("utf8")
    .replace(/\0.*$/, "");
}

function extractTarFile(tarBuffer, filePath) {
  let offset = 0;

  while (offset + 512 <= tarBuffer.length) {
    const header = tarBuffer.subarray(offset, offset + 512);

    if (header.every((byte) => byte === 0)) {
      break;
    }

    const name = readTarString(header, 0, 100);
    const prefix = readTarString(header, 345, 155);
    const fullName = prefix ? `${prefix}/${name}` : name;
    const size = parseInt(readTarString(header, 124, 12).trim() || "0", 8);
    const type = readTarString(header, 156, 1) || "0";
    const contentOffset = offset + 512;

    if ((type === "0" || type === "") && fullName === filePath) {
      return tarBuffer.subarray(contentOffset, contentOffset + size);
    }

    offset = contentOffset + Math.ceil(size / 512) * 512;
  }

  throw new Error(`Could not find ${filePath} in Mermaid package tarball.`);
}

async function updateAboutJson(assetPath) {
  const about = JSON.parse(await readFile(aboutPath, "utf8"));
  about.assets ||= {};
  about.assets.mermaid_js = assetPath;

  await writeFile(aboutPath, `${JSON.stringify(about, null, 2)}\n`);
}

async function removeOldMermaidAssets(assetFileName) {
  const files = await readdir(assetsDir);

  await Promise.all(
    files
      .filter(
        (file) => /^mermaid-.*\.min\.js$/.test(file) && file !== assetFileName
      )
      .map((file) => rm(path.join(assetsDir, file)))
  );
}

async function main() {
  const metadata = await fetchPackageMetadata(process.argv[2]);
  const { version } = metadata;
  validateVersion(version);

  const assetFileName = `mermaid-${version}.min.js`;
  const assetPath = `assets/${assetFileName}`;
  const tarballUrl = metadata.dist?.tarball;
  const integrity = metadata.dist?.integrity;

  if (!tarballUrl) {
    throw new Error(
      `Package metadata for Mermaid ${version} has no tarball URL.`
    );
  }

  console.log(`Downloading Mermaid ${version} from ${tarballUrl}`);
  const tarball = await fetchBuffer(tarballUrl);
  verifyIntegrity(tarball, integrity);
  console.log("Verified npm package integrity hash");

  const source = extractTarFile(gunzipSync(tarball), bundlePathInPackage)
    .toString("utf8")
    .trimEnd();

  if (!source.includes("mermaid")) {
    throw new Error(
      "Extracted file does not look like Mermaid's browser bundle."
    );
  }

  await writeFile(path.join(assetsDir, assetFileName), source);
  await updateAboutJson(assetPath);
  await removeOldMermaidAssets(assetFileName);

  console.log(`Updated ${assetPath}`);
  console.log("Updated about.json assets.mermaid_js");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
