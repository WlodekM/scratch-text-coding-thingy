// deno-lint-ignore-file no-explicit-any
import { parse, stringify } from "jsr:@std/yaml";
import * as json from './jsontypes.ts'
import { Lexer, Parser } from "./tshv2/main.ts";
import ASTtoBlocks, { Environment, jsonBlock } from "./asttoblocks.ts";
import * as zip from "jsr:@zip-js/zip-js";
import CryptoJS from "https://esm.sh/crypto-js@4.1.1";
import path from 'node:path'
import * as mus from 'music-metadata';
import getSpriteGlobals from "./getGlobalVars.ts";

// the t stands for tosh3
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
}
type TProject = {
    sprites: Record<string, TSprite>
    preprocess?: string
    search_dir?: string
}

const dir: string = path.resolve(Deno.args[0] || Deno.cwd() || '.');

console.log(dir)

const decoder = new TextDecoder("utf-8");
const rawProjectConfig: string = decoder.decode(
    Deno.readFileSync(
        path.join(dir, 'project.prj.yaml')
    )
)
const project: TProject = parse(rawProjectConfig) as TProject

function search_dir(_path: string) {
    const dir = Deno.readDirSync(_path)
    for (const element of dir) {
        if (element.isDirectory) {
            search_dir(path.join(_path, element.name))
            continue;
        }
        if (!element.name.endsWith('.spr.yaml'))
            continue;
        const raw_sprite: string = decoder.decode(
            Deno.readFileSync(
                path.join(_path, element.name)
            )
        )//.replaceAll(`src/${element.name.replace('.spr.yaml','')}/`, '')
        // console.log(`src/${element.name}/`)
        const sprite: TSprite = parse(raw_sprite) as TSprite
        if (!sprite.path_root)
            sprite.path_root = _path
        // Deno.writeTextFileSync(
        //     path.join(_path, element.name),
        //     stringify(sprite)
        // )
        project.sprites[element.name] = sprite;
    }
}
if (project.search_dir) {
    search_dir(path.resolve(dir, project.search_dir))
}

// console.debug(project)

const projectJson: {
    targets: json.Sprite[],
    meta: any,
    $schema?: string,
    extensions: string[],
    extensionURLs: Record<string, string>
} = {
    targets: [],
    meta: {},
    extensions: [],
    extensionURLs: {},
}

function removeId(a: blockBlock): json.Block {
    const b: json.Block & { id?: string } = a
    delete b.id;
    return b
}

async function getCode(sourcePath:string) {
    if (!project.preprocess)
        return new TextDecoder().decode(Deno.readFileSync(sourcePath));
    const cmd = [...project.preprocess.replaceAll('$$', sourcePath).split(' ')]
    const prog = cmd.shift()
    if(!prog)throw 'no program'
    const c = new Deno.Command(prog, {
        args: cmd,
        stdout: "piped",
        stderr: "piped",
    })
    const output = await c.output();
    if (output.code != 0) {
        console.error(`prepreprocessing code code not OK; code is ${output.code}.`)
        console.log('stdout:')
        Deno.stdout.write(output.stdout)
        console.log('stderr:')
        Deno.stderr.write(output.stderr);
        throw 'error at prepreprocessing'
    }
    if (Deno.args.includes('-dd'))
        Deno.stdout.write(output.stdout)
    return new TextDecoder().decode(output.stdout)
}

function parseIncludes(code:string, basedir: string) {
    code = code.replace(/^.include(\s*)"(.*)"/gm, (m,_, _path) => {
        return Deno.readTextFileSync(path.resolve(basedir, _path))
    })
    return code
}

export type blockBlock = ({ id: string } & json.Block)
export type varBlock = { id: string, data:  [12, string, string] }
// export type jsonBlock = blockBlock | varBlock

// path, [id, type]
const assets: Map<string, [string, string]> = new Map();
const extensions: Set<[string, string]> = new Set();
let lastGlobalVariables: Record<string, string> = {};
let lastGlobalLists: Record<string, [string, string[]]> = {};

for (const spriteName of Object.keys(project.sprites)
    .sort((a, b) => +(project.sprites[b].stage??0) - +(project.sprites[a].stage??0))
) {
    const sprite: TSprite = project.sprites[spriteName];
    console.log('preprocessing', sprite.name)
    const jsonSprite: Partial<json.Sprite> = {};
    jsonSprite.name = sprite.name
    jsonSprite.isStage = sprite.stage ?? false
    jsonSprite.lists = {}
    jsonSprite.variables = {}
    jsonSprite.broadcasts = {}
    jsonSprite.costumes = []

    if (sprite.code) {
        // console.debug('has code!')
        try {
            const sourceCode = await getCode(path.resolve(sprite.path_root??dir, sprite.code));
            const lexer = new Lexer(sourceCode);
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens, sourceCode);
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
        } catch (error) {
            console.error('error while parsing code for', sprite.name);
            throw error;
        }
    }
}

let layer = -1;
for (const spriteName of Object.keys(project.sprites)
    .sort((a, b) => +(project.sprites[b].stage??0) - +(project.sprites[a].stage??0))
) {
    layer++;
    const sprite: TSprite = project.sprites[spriteName];
    console.log('processing', sprite.name)
    const jsonSprite: Partial<json.Sprite> = {};
    jsonSprite.name = sprite.name
    jsonSprite.isStage = sprite.stage ?? false
    jsonSprite.lists = {}
    jsonSprite.variables = {}
    jsonSprite.broadcasts = {}
    jsonSprite.costumes = []

    // deno-lint-ignore no-inner-declarations
    function get_path(_path: string): string {
        return path.resolve(sprite.path_root??dir, _path)
    }

    if (sprite.code) {
        try {
            const basedir = path.dirname(get_path(sprite.code))
            const sourceCode = parseIncludes(
                await getCode(get_path(sprite.code)),
                basedir
            );
            if (Deno.args.includes('-da'))
                console.log(sourceCode)

            const lexer = new Lexer(sourceCode);
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens, sourceCode);
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
            if (Deno.args.includes('-a')) {
                Deno.writeFileSync('ast.json', new TextEncoder().encode(JSON.stringify(ast, null, 4)))
            }
            const [blockaroonies, env]: [jsonBlock[], Environment] = await ASTtoBlocks(
                ast,
                basedir,
                lastGlobalVariables,
                lastGlobalLists,
            );
            // console.log(ast, blockaroonies, env)
            jsonSprite.variables = {
                ...Object.fromEntries(
                    [...env.variables.entries()].map(([v, n]) => [
                        n,
                        [
                            v,
                            0
                        ]
                    ])
                )
            }
            jsonSprite.lists = {
                ...Object.fromEntries(
                    [...env.lists.entries()].map(([v, n]) => [
                        n[0],
                        [
                            v,
                            n[1]
                        ]
                    ])
                )
            }
            const stage = projectJson.targets.find(t => t.isStage);
            if (stage) {
                stage.variables = {
                    ...Object.fromEntries(
                        [...env.globalVariables.entries()].map(([v, n]) => [
                            n,
                            [
                                v,
                                0
                            ]
                        ])
                    ),
                    ...stage.variables
                }
                stage.lists = {
                    ...Object.fromEntries(
                        [...env.globalLists.entries()].map(([v, n]) => [
                            n[0],
                            [
                                v,
                                n[1]
                            ]
                        ])
                    ),
                    ...stage.lists
                }
            }
            lastGlobalVariables = Object.fromEntries([...env.globalVariables.entries()]);
            lastGlobalLists = Object.fromEntries([...env.globalLists.entries()])
            // console.log(
            //     lastGlobalVariables,
            //     lastGlobalLists,
            //     env.globalVariables
            // )
            env.extensions.forEach(ext => extensions.add(ext))
            //FIXME - fix either the type or this idfk
            //@ts-ignore: im just so tired atp
            jsonSprite.blocks = Object.fromEntries(blockaroonies.map(b => [b.id, 'data' in b ? b.data : removeId(b)]))
        } catch (error) {
            console.error('error while parsing code for', sprite.name);
            throw error;
        }
    } else {
        jsonSprite.blocks = {}
    }

    jsonSprite.currentCostume = 0;
    jsonSprite.sounds = [] // TODO: fix this

    jsonSprite.volume = 100;
    jsonSprite.layerOrder = layer
    jsonSprite.isStage = sprite.stage ?? false
    if (jsonSprite.isStage) {
        jsonSprite.tempo = 60
        jsonSprite.videoTransparency = 50
        jsonSprite.videoState = 'on'
    } else if (jsonSprite.isStage == false) {
        jsonSprite.visible = true
        jsonSprite.x = 0;
        jsonSprite.y = 0;
        jsonSprite.size = 100;
        jsonSprite.direction = 90;
        jsonSprite.draggable = false;
        jsonSprite.rotationStyle = 'all around'
    }
    let completesprite: json.Sprite;
    if (jsonSprite.isStage) {
        completesprite = jsonSprite as json.Stage
    } else if (jsonSprite.isStage == false) {
        completesprite = jsonSprite as json.RealSprite
    } else throw new Error()

    for (const [name, asset] of Object.entries(sprite.costumes)) {
        const asset_path = get_path(asset.path)
        let [rotationCenterX, rotationCenterY] = [0, 0]
        const ext = asset_path.match(/\.([^\.]*?)$/)![1]
        if (!assets.has(asset_path)) {
            const assetData = new TextDecoder().decode(Deno.readFileSync(asset_path));
            const match = [...assetData.matchAll(/<!--rotationCenter:(.*?):(.*?)-->/g)][0];
            // console.log(match ? match[1] : 'a')
            if(match && match[1] && match[2]) {
                [rotationCenterX, rotationCenterY] = [Number(match[1]), Number(match[2])]
            }
            const hash = CryptoJS.MD5(assetData).toString();
            assets.set(asset_path, [hash, ext]);
        }
        if (asset.rotationCenter)
            [rotationCenterX, rotationCenterY] = asset.rotationCenter;
        jsonSprite.costumes.push({
            assetId: (assets.get(asset_path) ?? [''])[0],
            dataFormat: asset.format, // TODO - figure out bitmap format
            bitmapResolution: 1,
            md5ext: assets.get(asset_path)!.join('.'),
            name,
            rotationCenterX,
            rotationCenterY,
        })
    }

    for (const [name, sound] of Object.entries(sprite.sounds ?? {})) {
        const sound_path = get_path(sound.path)
        let metadata;
        try {
            metadata = await mus.parseFile(sound_path);
        } catch (error) {
            console.error('error with parsing sound file at', sound_path);
            throw error
        }
        if (!metadata.format.sampleRate)
            throw 'couldnt get sample rate'
        if (!metadata.format.numberOfSamples)
            throw 'couldnt get sample rate';
        const ext = sound_path.match(/\.([^\.]*?)$/)![1]
        if (!assets.has(sound_path)) {
            const assetData = new TextDecoder().decode(Deno.readFileSync(sound_path));
            const hash = CryptoJS.MD5(assetData).toString();
            assets.set(sound_path, [hash, ext]);
        }
        (jsonSprite.sounds as {
            assetId: string
            dataFormat: "wav" | "wave" | "mp3"
            md5ext?: string
            name: string
            rate?: number
            sampleCount?: number
            [k: string]: unknown
        }[]).push({
            assetId: (assets.get(sound_path) ?? [''])[0],
            dataFormat: sound.format as "wav" | "wave" | "mp3",
            md5ext: assets.get(sound_path)!.join('.'),
            name,
            rate: metadata.format.sampleRate,
            sampleCount: metadata.format.numberOfSamples
        })
    }
    projectJson.targets.push(completesprite)
}

projectJson.extensions = [...extensions].map(a => a[1])
projectJson.extensionURLs = Object.fromEntries([...extensions].filter(([a])=>a.startsWith('http')||a.startsWith('data')).map(([a, b]) => [b, a]))

projectJson.meta = {
    agent: '',
    semver: '3.0.0',
    platform: {
        name: 'backslash. (TurboWarp-compatible)',
        url: 'https://github.com/WlodekM/scratch-text-coding-thingy'
    }
}

//TODO - figure out what the SHIT is causing it to error
//@ts-expect-error: uh
const completeproject: json.Project & { $schema?: string } = {
    $schema: "../schema/sb3_schema.json",
    ...projectJson
}

const encoder = new TextEncoder();
const data = encoder.encode(JSON.stringify(completeproject, null, 4)) // Since this now outputs an sb3, this is purely for debugging so we can indent
Deno.writeFileSync(path.join(dir, 'out.json'), data)

//SECTION - Write the project json and assets into a zip
const zipFileWriter = new zip.BlobWriter();

const zipWriter = new zip.ZipWriter(zipFileWriter);
await zipWriter.add("project.json", new zip.TextReader(JSON.stringify(completeproject)));
// await zipWriter.add('assets/')
const uuids: string[] = []
for (const [asset, [uuid, ext]] of [...assets.entries()]) {
    const file = Deno.readFileSync(asset)
    if (uuids.includes(uuid))
        continue;
    await zipWriter.add(`${uuid}.${ext}`, new zip.BlobReader(new Blob([file]))) // ungodly conversion between a uint8array and reader
    uuids.push(uuid)
}
await zipWriter.close();

// Retrieves the Blob object containing the zip content into `zipFileBlob`. It
// is also returned by zipWriter.close() for more convenience.
const zipFileBlob = await zipFileWriter.getData();
Deno.writeFileSync(path.join(dir, 'project.sb3'), await zipFileBlob.bytes())
//!SECTION