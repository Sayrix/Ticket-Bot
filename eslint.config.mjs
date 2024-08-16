import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all
});

export default [
	...compat.extends("eslint:recommended", "prettier", "plugin:@typescript-eslint/recommended"),
	{
		plugins: {
			"@typescript-eslint": typescriptEslint
		},

		languageOptions: {
			globals: {
				...globals.node
			},

			parser: tsParser,
			ecmaVersion: "latest",
			sourceType: "module"
		},

		rules: {
			"no-unused-vars": "warn",
			"no-console": "off",
			"no-undef": "warn",
			"no-constant-condition": "error",
			indent: ["error", "tab"],
			semi: ["error", "always"],
			quotes: [2, "double"],
			"semi-style": ["error", "last"],
			"no-process-exit": "off",
			"node/no-missing-import": "off",
			"no-var-requires": "off"
		}
	}
];
