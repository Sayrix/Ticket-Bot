import { spawn } from "node:child_process";
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const rootDirectory = fileURLToPath(new URL("..", import.meta.url));
const distDirectory = path.join(rootDirectory, "dist");
const tsconfigPath = path.join(rootDirectory, "tsconfig.build.json");
const tscEntrypoint = path.join(rootDirectory, "node_modules", "typescript", "bin", "tsc");

await rm(distDirectory, { recursive: true, force: true });
await run(process.execPath, [tscEntrypoint, "--project", tsconfigPath]);
await rewriteDirectory(distDirectory);

async function rewriteDirectory(directory) {
	const entries = await readdir(directory, { withFileTypes: true });

	for (const entry of entries) {
		const entryPath = path.join(directory, entry.name);

		if (entry.isDirectory()) {
			await rewriteDirectory(entryPath);
			continue;
		}

		if (!entry.isFile() || path.extname(entry.name) !== ".js") {
			continue;
		}

		const source = await readFile(entryPath, "utf8");
		const rewritten = rewriteImports(source, entryPath);

		if (rewritten !== source) {
			await writeFile(entryPath, rewritten);
		}
	}
}

function rewriteImports(source, filePath) {
	const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
	const edits = [];

	const visit = (node) => {
		if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
			edits.push({
				start: node.moduleSpecifier.getStart(sourceFile) + 1,
				end: node.moduleSpecifier.getEnd() - 1,
				value: rewriteSpecifier(node.moduleSpecifier.text, filePath)
			});
		}

		if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
			const [argument] = node.arguments;

			if (argument && ts.isStringLiteralLike(argument)) {
				edits.push({
					start: argument.getStart(sourceFile) + 1,
					end: argument.getEnd() - 1,
					value: rewriteSpecifier(argument.text, filePath)
				});
			}
		}

		ts.forEachChild(node, visit);
	};

	visit(sourceFile);

	return edits
		.sort((left, right) => right.start - left.start)
		.reduce((currentSource, edit) => {
			return `${currentSource.slice(0, edit.start)}${edit.value}${currentSource.slice(edit.end)}`;
		}, source);
}

function rewriteSpecifier(specifier, filePath) {
	if (specifier.startsWith("@/")) {
		const targetPath = path.join(rootDirectory, "dist", "src", specifier.slice(2));
		return toImportPath(path.relative(path.dirname(filePath), ensureJsExtension(targetPath)));
	}

	if (specifier.startsWith(".")) {
		return normalizeRelativeExtension(specifier);
	}

	return specifier;
}

function normalizeRelativeExtension(specifier) {
	if (/\.(?:c|m)?js$|\.json$|\.node$/u.test(specifier)) {
		return specifier;
	}

	if (/\.(?:cts|mts|tsx|ts)$/u.test(specifier)) {
		return specifier.replace(/\.(?:cts|mts|tsx|ts)$/u, ".js");
	}

	return `${specifier}.js`;
}

function ensureJsExtension(filePath) {
	if (/\.(?:c|m)?js$/u.test(filePath)) {
		return filePath;
	}

	if (/\.(?:cts|mts|tsx|ts)$/u.test(filePath)) {
		return filePath.replace(/\.(?:cts|mts|tsx|ts)$/u, ".js");
	}

	return `${filePath}.js`;
}

function toImportPath(relativePath) {
	const normalizedPath = relativePath.split(path.sep).join("/");

	if (normalizedPath.startsWith(".")) {
		return normalizedPath;
	}

	return `./${normalizedPath}`;
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
