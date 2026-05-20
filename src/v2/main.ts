// the new and improved tosh !
// now using targets instead of projects !
import path from 'node:path'
import { parse } from "jsr:@std/yaml";
import * as zip from "jsr:@zip-js/zip-js";
import { Lexer, Parser } from "../tshv2/main.ts";
import { Project, SpriteScope, StageScope } from "./oop_block.ts";
import { process_node } from "./asttoblocks2.ts";
import getSpriteGlobals from "../getGlobalVars.ts";
import ASTtoBlocks, { Environment, jsonBlock } from "../asttoblocks.ts";
import * as json from '../jsontypes.ts'
import { blockBlock } from "../main.ts";
import { parseArgs } from "jsr:@std/cli/parse-args";
const flags = parseArgs(Deno.args, {
	boolean: ["r", "d"],
	// string: ["version"],
	// default: { color: true },
	// negatable: ["color"],
});

console.log(flags)

const dir: string = path.resolve(flags._ ? String(flags._) : 0 || Deno.cwd() || '.');
const retro = flags.r;
const debug = flags.d;

interface TInsertBlocks {
	code: string
}

type TSound = {
    format: 'wav' | 'mp3' | string
    path: string
}
type TCostume = {
    format: 'svg' | string
    path: string
    rotationCenter?: [number, number]
}
type TSprite = {
    stage?: boolean
    name: string
    costumes: Record<string, TCostume>
    sounds: Record<string, TSound>
    code: null | string
    path_root?: string
    hidden?: boolean
    current_costume?: number,
    x?: number,
    y?: number,
    layer?: number
}

interface TargetConfig {
	insert_blocks?: Record<string, TInsertBlocks>,
	base: string
}

const target_config: TargetConfig =
	parse(Deno.readTextFileSync(path.resolve(dir, 'target.trg.yaml'))) as any;

const resulting_files: Record<string, Uint8Array|string> = {}

// const assets: Map<string, [string, string]> = new Map();
// const extensions: Set<[string, string]> = new Set();
let lastGlobalVariables: Record<string, string> = {};
let lastGlobalLists: Record<string, [string, string[]]> = {};

const project = new Project();
if (target_config.insert_blocks) {
	const stage = new StageScope('stage', project);
	console.log(stage.definitions)
	for (const sprite_name in target_config.insert_blocks) {
		if (!Object.hasOwn(target_config.insert_blocks, sprite_name)) continue;
		
		const { code: code_path } = target_config.insert_blocks[sprite_name];

		console.log(code_path)
		
		const code = Deno.readTextFileSync(path.resolve(dir, code_path));
		console.log(code)
		const lexer = new Lexer(code);
		const tokens = lexer.tokenize();
		const parser = new Parser(tokens, code);
		const sprite = new SpriteScope(sprite_name, stage);
		if (retro) {
			// deno-lint-ignore no-inner-declarations
			function get_path(_path: string): string {
				return path.resolve(dir, _path)
			}
			const basedir = path.dirname(get_path(code))
			let ast;
			try {
				ast = parser.parse();
			} catch (error) {
				console.error(error)
				console.log('at', parser.position, '\n'+tokens
					.map((a, i) => i == parser.position ? `${i} ${a.type}(${a.value}) <--` : `${i} ${a.type}(${a.value})`)
					.filter((_, i) => Math.abs(parser.position - i) < 5)
					.join('\n')
				)
				throw 'error during parsing'
			}
			const newGlobals = getSpriteGlobals(ast, lastGlobalVariables, lastGlobalLists);
			// console.debug('new globals:', newGlobals);
			[lastGlobalVariables, lastGlobalLists] = newGlobals;

			/*dont care*/// deno-lint-ignore no-unused-vars
			const [blockaroonies, env]: [jsonBlock[], Environment] = await ASTtoBlocks(
				ast,
				basedir,
				lastGlobalVariables,
				lastGlobalLists,
			);

			// deno-lint-ignore no-inner-declarations
			function removeId(a: blockBlock): json.Block {
				const b: json.Block & { id?: string } = a
				delete b.id;
				return b
			}
			sprite.block_json = Object.fromEntries(blockaroonies.map(b => [b.id, 'data' in b ? b.data : removeId(b)]))
			continue;
		}
		const ast = parser.parse();

		for (const node of ast) {
			console.log(node)
			await process_node({node, sprite});
		}

		const json = sprite.get_blocks_json();
		console.log('and i know just where youre going', sprite_name)
		console.log(json)
	}
}

const base_sb3 = Deno.readFileSync(path.resolve(dir, target_config.base));

const file_reader = new zip.BlobReader(new Blob([base_sb3.buffer]));

const zip_reader = new zip.ZipReader(file_reader)

const base_entries = await zip_reader.getEntries();
const base_project_entry = base_entries.find((e:any) => e.filename == 'project.json')
//@ts-ignoreL
const base_project_json_data: ArrayBuffer = await base_project_entry!.arrayBuffer();
const td = new TextDecoder();
const base_project: json.Project = JSON.parse(td.decode(base_project_json_data))
// console.log(base_project)

for (const [name, sprite] of project.sprites.entries()) {
	const target = base_project.targets.find(t => {
		console.log(t.name, name)
		return t.name == name
	})
	if (!target) {
		console.log('skippng', name)
		continue;
	}
	//@ts-ignore: fuck off typescript
	target.blocks = sprite.get_blocks_json()
}

resulting_files['_project.json'] = JSON.stringify(base_project);

if (debug)
	Deno.writeTextFileSync('project.json', resulting_files['_project.json'])

// const zip_reader = new zip.ZipReader(file_reader, {
	
// })

const result_zip_writer = new zip.BlobWriter();

const zip_writer = new zip.ZipWriter(result_zip_writer);

await zip_writer.prependZip(file_reader);

for (let fpath in resulting_files) {
	if (!Object.hasOwn(resulting_files, fpath)) continue;
	let data = resulting_files[fpath];
	if (fpath.startsWith('_')) {
		fpath = fpath.replace('_','')
		await zip_writer.remove(fpath);
	}
	if (data instanceof Uint8Array)
		//@ts-ignore: fuck off typescript i know what im doing
		data = data.buffer
	
	//@ts-ignore: fuck off typescript
	const blob = new Blob([data])
	console.log(fpath, data)
	// if ()
	await zip_writer.add(fpath, new zip.BlobReader(blob))
}

console.log('uh')
await zip_writer.close();

// Retrieves the Blob object containing the zip content into `zipFileBlob`. It
// is also returned by zipWriter.close() for more convenience.
console.log('compressing zip')
const zipFileBlob = await result_zip_writer.getData();
console.log('writing zip')
const bytes = await zipFileBlob.bytes();
Deno.writeFileSync(path.join(dir, 'project.sb3'), bytes)
console.log('done')
