// the new and improved tosh !
// now using targets instead of projects !
import path from 'node:path'
import { parse, stringify } from "jsr:@std/yaml";
import * as zip from "jsr:@zip-js/zip-js";

const dir: string = path.resolve(Deno.args[0] || Deno.cwd() || '.');

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

if (target_config.insert_blocks) {
	for (const sprite in target_config.insert_blocks) {
		if (!Object.hasOwn(target_config.insert_blocks, sprite)) continue;
		
		const { code: code_path } = target_config.insert_blocks[sprite];
		
		const code = Deno.readTextFileSync(path.resolve(dir, code_path))
	}
}

const base_sb3 = Deno.readFileSync(path.resolve(dir, target_config.base));

const file_reader = new zip.BlobReader(new Blob([base_sb3.buffer]));

// const zip_reader = new zip.ZipReader(file_reader, {
	
// })

const result_zip_writer = new zip.BlobWriter();

const zip_writer = new zip.ZipWriter(result_zip_writer);

zip_writer.prependZip(file_reader);

for (const fpath in resulting_files) {
	if (!Object.hasOwn(resulting_files, fpath)) continue;
	
	let data = resulting_files[fpath];
	if (data instanceof Uint8Array)
		//@ts-ignore: fuck off typescript i know what im doing
		data = data.buffer
	
	const blob = new Blob([data])
	zip_writer.add(fpath, new zip.BlobReader(blob))
}
