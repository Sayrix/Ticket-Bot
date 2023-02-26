module.exports = {
	env: {
		browser: true,
		commonjs: true,
		es2021: true,
	},
	overrides: [],
	extends: ["eslint:recommended", "plugin:node/recommended", "prettier"],
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
	},
};
