// deno-lint-ignore-file no-explicit-any
import { parse } from "jsr:@std/yaml";
import * as json from './jsontypes.ts'
import { Lexer, Parser } from "./tshv2/main.ts";
import ASTtoBlocks, { Environment } from "./asttoblocks.ts";
import * as zip from "jsr:@zip-js/zip-js";
import CryptoJS from "https://esm.sh/crypto-js@4.1.1";
import path from 'node:path'
import * as mus from 'music-metadata';

// the t stands for tosh3
type TSound = {
    format: 'wav' | 'mp3' | string
    path: string
}
type TCostume = {
    format: 'svg' | string
    path: string
}
type TSprite = {
    stage?: boolean
    name: string
    costumes: Record<string, TCostume>
    sounds: Record<string, TSound>
    code: null | string
}
type TProject = {
    sprites: Record<string, TSprite>
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

export type blockBlock = ({ id: string } & json.Block)
export type varBlock = { id: string, data:  [12, string, string] }
export type jsonBlock = blockBlock | varBlock

const assets: Map<string, string> = new Map();
const extensions: Set<[string, string]> = new Set();
let lastGlobalVariables: Record<string, string> | undefined = undefined;
let lastGlobalLists: Record<string, [string, string[]]> | undefined = undefined;

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

    if (sprite.code) {
        try {
            const sourceCode = new TextDecoder().decode(Deno.readFileSync(path.join(dir, sprite.code)));

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
                lastGlobalVariables,
                lastGlobalLists
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
                    ...stage.variables
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
        let [rotationCenterX, rotationCenterY] = [0, 0]
        if (!assets.has(asset.path)) {
            const assetData = new TextDecoder().decode(Deno.readFileSync(path.join(dir, asset.path)));
            const match = [...assetData.matchAll(/<!--rotationCenter:(.*?):(.*?)-->/g)][0];
            // console.log(match ? match[1] : 'a')
            if(match && match[1] && match[2]) {
                [rotationCenterX, rotationCenterY] = [Number(match[1]), Number(match[2])]
            }
            const hash = CryptoJS.MD5(assetData).toString();
            assets.set(asset.path, hash);
        }
        const ext = asset.path.match(/\.(.*?)$/g)?.[0]
        jsonSprite.costumes.push({
            assetId: assets.get(asset.path) ?? '',
            dataFormat: asset.format, // TODO - figure out bitmap format
            bitmapResolution: 1,
            md5ext: assets.get(asset.path) as string + ext,
            name,
            rotationCenterX,
            rotationCenterY,
        })
    }

    for (const [name, sound] of Object.entries(sprite.sounds ?? {})) {
        const metadata = await mus.parseFile(path.join(dir, sound.path));
        if (!metadata.format.sampleRate)
            throw 'couldnt get sample rate'
        if (!metadata.format.numberOfSamples)
            throw 'couldnt get sample rate';
        if (!assets.has(sound.path)) {
            const assetData = new TextDecoder().decode(Deno.readFileSync(path.join(dir, sound.path)));
            const hash = CryptoJS.MD5(assetData).toString();
            assets.set(sound.path, hash);
        }
        const ext = sound.path.match(/\.(.*?)$/g)?.[0];
        (jsonSprite.sounds as {
            assetId: string
            dataFormat: "wav" | "wave" | "mp3"
            md5ext?: string
            name: string
            rate?: number
            sampleCount?: number
            [k: string]: unknown
        }[]).push({
            assetId: assets.get(sound.path) ?? '',
            dataFormat: sound.format as "wav" | "wave" | "mp3",
            md5ext: assets.get(sound.path) as string + ext,
            name,
            rate: metadata.format.sampleRate,
            sampleCount: metadata.format.numberOfSamples
        })
    }
    projectJson.targets.push(completesprite)
}

projectJson.extensions = [...extensions].map(a => a[1])
projectJson.extensionURLs = Object.fromEntries([...extensions].filter(([a])=>a.startsWith('http')).map(([a, b]) => [b, a]))

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
for (const [asset, uuid] of [...assets.entries()]) {
    const file = Deno.readFileSync(path.join(dir, asset))
    if (uuids.includes(uuid))
        continue;
    await zipWriter.add(`${uuid}.svg`, new zip.BlobReader(new Blob([file]))) // ungodly conversion between a uint8array and reader
    uuids.push(uuid)
}
await zipWriter.close();

// Retrieves the Blob object containing the zip content into `zipFileBlob`. It
// is also returned by zipWriter.close() for more convenience.
const zipFileBlob = await zipFileWriter.getData();
Deno.writeFileSync(path.join(dir, 'project.sb3'), await zipFileBlob.bytes())
//!SECTION