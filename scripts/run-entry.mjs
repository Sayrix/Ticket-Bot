import { spawn } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDirectory = fileURLToPath(new URL("..", import.meta.url));
const entryArgument = process.argv[2];
const entryArgs = process.argv.slice(3);

if (!entryArgument) {
	throw new Error("Missing dist entry argument.");
}

const distEntry = path.join(rootDirectory, "dist", entryArgument);

if (await shouldBuild(distEntry)) {
	await run(process.execPath, [path.join(rootDirectory, "scripts", "build.mjs")]);
}

await run(process.execPath, [distEntry, ...entryArgs]);

async function shouldBuild(distEntryPath) {
	let distEntryStat;

	try {
		distEntryStat = await stat(distEntryPath);
	} catch {
		return true;
	}

	const latestSourceMtime = await getLatestSourceMtime([
		path.join(rootDirectory, "src"),
		path.join(rootDirectory, "config"),
		path.join(rootDirectory, "i18n"),
		path.join(rootDirectory, "messages"),
		path.join(rootDirectory, "drizzle.config.ts")
	]);

	return latestSourceMtime > distEntryStat.mtimeMs;
}

async function getLatestSourceMtime(paths) {
	let latest = 0;

	for (const sourcePath of paths) {
		const sourceStat = await stat(sourcePath).catch(() => null);

		if (!sourceStat) {
			continue;
		}

		if (sourceStat.isDirectory()) {
			const entries = await readdir(sourcePath, { withFileTypes: true });
			const childPaths = entries.map((entry) => path.join(sourcePath, entry.name));
			latest = Math.max(latest, await getLatestSourceMtime(childPaths));
			continue;
		}

		if (sourceStat.isFile() && /\.(?:ts|mts|cts|js|mjs|json)$/u.test(sourcePath)) {
			latest = Math.max(latest, sourceStat.mtimeMs);
		}
	}

	return latest;
}

function run(command, args) {
	return new Promise((resolvePromise, rejectPromise) => {
		const child = spawn(command, args, {
			cwd: rootDirectory,
			env: process.env,
			stdio: "inherit"
		});

		child.on("error", rejectPromise);
		child.on("exit", (code) => {
			if (code === 0) {
				resolvePromise();
				return;
			}

			rejectPromise(new Error(`Command failed with exit code ${code ?? "unknown"}.`));
		});
	});
}
