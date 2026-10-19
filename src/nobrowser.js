import path from 'node:path';
import fs from 'node:fs';

export function noBrowser () {
	return {
		name: 'cppPlugin',
		setup(build) {
			
			build.onResolve({ filter: /\.(js|ts)$/ }, args => {
				console.log(args.importer, args.path);
				return {
					path: path.resolve(path.dirname(args.importer), args.path),
					namespace: "cpp" // isolate from normal loader
				}
			})
			build.onLoad({filter: /\.(js|ts)$/, namespace: 'cpp'}, async (args) => {
				let file = fs.readFileSync(args.path).toString();

				file = file.replaceAll(/\/\/#no(web|browser)([^]*?)\/\/#endno(web|browser)/g, '');

				const ext = path.extname(args.path)

				const loaderMap = {
					".ts": "ts",
					".tsx": "tsx",
					".js": "js",
					".jsx": "jsx",
					".json": "json",
					".css": "css",
				}
				return {
					contents: file,
					loader: loaderMap[ext] ?? "js"
				};
			})
		},
	};
}

