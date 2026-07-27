import { spawnSync } from "node:child_process";
import { join } from "node:path";

const nextBin = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const result = spawnSync(process.execPath, [nextBin, ...process.argv.slice(2)], {
  env: {
    ...process.env,
    NEXT_SKIP_INTERNAL_TS_SETUP: "1",
  },
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
