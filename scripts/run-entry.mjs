import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDirectory = fileURLToPath(new URL("..", import.meta.url));
const entryArgument = process.argv[2];

if (!entryArgument) {
	throw new Error("Missing dist entry argument.");
}

const distEntry = path.join(rootDirectory, "dist", entryArgument);

try {
	await stat(distEntry);
} catch {
	await run(process.execPath, [path.join(rootDirectory, "scripts", "build.mjs")]);
}

await run(process.execPath, [distEntry]);

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
