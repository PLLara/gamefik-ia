import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const nextRoot = join(process.cwd(), "node_modules", "next", "dist");
const marker = "NEXT_SKIP_INTERNAL_TS_SETUP";
const targets = [
  {
    path: join(nextRoot, "lib", "verify-typescript-setup.js"),
    needle:
      "async function verifyTypeScriptSetup({ dir, distDir, cacheDir, tsconfigPath, typeCheckPreflight, disableStaticImages, hasAppDir, hasPagesDir, isolatedDevBuild, appDir, pagesDir, debugBuildPaths }) {",
    replacement:
      "async function verifyTypeScriptSetup({ dir, distDir, cacheDir, tsconfigPath, typeCheckPreflight, disableStaticImages, hasAppDir, hasPagesDir, isolatedDevBuild, appDir, pagesDir, debugBuildPaths }) {\n    if (process.env.NEXT_SKIP_INTERNAL_TS_SETUP === '1') return { version: '7.0.2-native' };",
  },
  {
    path: join(nextRoot, "esm", "lib", "verify-typescript-setup.js"),
    needle:
      "export async function verifyTypeScriptSetup({ dir, distDir, cacheDir, tsconfigPath, typeCheckPreflight, disableStaticImages, hasAppDir, hasPagesDir, isolatedDevBuild, appDir, pagesDir, debugBuildPaths }) {",
    replacement:
      "export async function verifyTypeScriptSetup({ dir, distDir, cacheDir, tsconfigPath, typeCheckPreflight, disableStaticImages, hasAppDir, hasPagesDir, isolatedDevBuild, appDir, pagesDir, debugBuildPaths }) {\n    if (process.env.NEXT_SKIP_INTERNAL_TS_SETUP === '1') return { version: '7.0.2-native' };",
  },
];

for (const target of targets) {
  if (!existsSync(target.path)) {
    throw new Error(`Arquivo interno do Next não encontrado: ${target.path}`);
  }

  const source = readFileSync(target.path, "utf8");
  if (source.includes(marker)) continue;
  if (!source.includes(target.needle)) {
    throw new Error(`Next incompatível com o patch TypeScript 7: ${target.path}`);
  }

  writeFileSync(target.path, source.replace(target.needle, target.replacement));
}

console.log("Compatibilidade Next + TypeScript 7 aplicada.");
