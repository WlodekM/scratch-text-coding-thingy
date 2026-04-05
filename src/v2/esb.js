import esbuildPluginTsc from 'esbuild-plugin-tsc';
import { noBrowser } from './nobrowser.js';
import * as esbuild from 'esbuild'
import fs from 'node:fs';
import path from 'node:path';
// yarn esbuild $PWD/browser.ts --bundle --outfile=backslash.js --log-limit=0 --minify --sourcemap --format=esm
let envPlugin = {
	name: 'env',
	setup(build) {
		// Intercept import paths called "env" so esbuild doesn't attempt
		// to map them to a file system location. Tag them with the "env-ns"
		// namespace to reserve them for this plugin.
		build.onResolve({ filter: /.*/ }, args => {
		//	console.log(args);
			if (args.kind == 'dynamic-import')
				return { path: args.path, external: true }
		})
		build.onResolve({ filter: /\.ts$/ }, (args) => {
			if (args.path.includes('node_modules')) return;
			console.log(args);
			return {
				path: path.resolve(path.dirname(args.importer), args.path),
				namespace: "env-ns",
			};
		})
		build.onLoad({ filter: /\.ts$/, namespace: 'env-ns' }, async (args) => {
			console.log(args.path, 'pp');
			let text = await fs.promises.readFile(args.path, 'utf8')
			text = text.replace(/\/\/#noweb([^]*?)\/\/#endnoweb/g, '');
			return {
				contents: text,
				loader: 'ts',
			}
		})

	},
}

await esbuild.build({
	entryPoints: ['browser.ts'],
	bundle: true,
	outfile: 'backslash.js',
	plugins: [noBrowser()],
	format: 'iife',
	external: ['esbuild'],
	// minify: true,
	minifyIdentifiers: true,
	tsconfig: 'tsconfig.json',
	minifyWhitespace: true,
	sourcemap: true,
	// minifySyntax: true
})
