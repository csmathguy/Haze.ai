const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repositoryRoot = path.resolve(__dirname, "..", "..");
const pinnedVersion = readPinnedVersion(repositoryRoot);
const runtime = resolveRuntime(pinnedVersion);
const result = spawnSync(runtime.nodeExecutable, [runtime.npmCli, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
  windowsHide: true
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);

function readPinnedVersion(rootDirectory) {
  const versionFile = path.join(rootDirectory, ".nvmrc");
  return fs.readFileSync(versionFile, "utf8").trim();
}

function resolveRuntime(version) {
  const nvmHome = process.env.NVM_HOME;
  const appData = process.env.APPDATA;
  const nvmDirectory =
    typeof nvmHome === "string" && nvmHome.length > 0
      ? nvmHome
      : typeof appData === "string" && appData.length > 0
        ? path.join(appData, "nvm")
        : null;

  if (nvmDirectory !== null) {
    const nodeDirectory = path.join(nvmDirectory, `v${version}`);
    const nodeExecutable = path.join(nodeDirectory, "node.exe");
    const npmCli = path.join(nodeDirectory, "node_modules", "npm", "bin", "npm-cli.js");

    if (fs.existsSync(nodeExecutable) && fs.existsSync(npmCli)) {
      return {
        nodeExecutable,
        npmCli
      };
    }
  }

  if (typeof process.env.npm_execpath === "string" && process.env.npm_execpath.length > 0) {
    return {
      nodeExecutable: process.execPath,
      npmCli: process.env.npm_execpath
    };
  }

  throw new Error(
    `Pinned Node.js ${version} was not found. Install it under nvm or update .nvmrc to a locally available runtime.`
  );
}
