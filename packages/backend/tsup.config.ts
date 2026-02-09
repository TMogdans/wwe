import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	target: "node22",
	clean: true,
	sourcemap: true,
	noExternal: [/.*/],
	external: ["node:sqlite"],
	banner: {
		js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
	},
	onSuccess:
		"sed -i '' 's/from \"sqlite\"/from \"node:sqlite\"/g' dist/index.js",
});
