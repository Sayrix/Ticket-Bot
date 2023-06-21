module.exports = {
	env: {
		browser: true,
		commonjs: true,
		es2021: true,
	},
	overrides: [],
	extends: ["eslint:recommended", "plugin:node/recommended", "prettier", "plugin:@typescript-eslint/recommended"],
	parser: "@typescript-eslint/parser",
	plugins: ["@typescript-eslint"],
	parserOptions: {
		ecmaVersion: "latest",
	},
	rules: {
		"no-unused-vars": "warn",
		"no-console": "off",
		"no-undef": "warn",
		"no-constant-condition": "warn",
		"indent": ["error", "tab"],
		"semi": ["error", "always"],
		"quotes": [2, "double"],
		"semi-style": ["error", "last"],
		"no-process-exit": "off"
	},
};
