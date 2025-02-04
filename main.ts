// deno-lint-ignore-file no-explicit-any
import { parse } from "jsr:@std/yaml";
import * as json from './jsontypes.ts'
import { Lexer, Parser } from "./tshv2/main.ts";
import ASTtoBlocks, { Environment } from "./asttoblocks.ts";
import * as zip from "jsr:@zip-js/zip-js";
import CryptoJS from "https://esm.sh/crypto-js@4.1.1";
import path from 'node:path'

// the t stands for tosh3
type TSound = any // TODO: finish this
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

console.debug(project)

const projectJson: { targets: json.Sprite[], meta: any, $schema?: string } = {
    targets: [],
    meta: {}
}

export type blockBlock = ({ id: string } & json.Block)
export type varBlock = { id: string, data:  [12, string, string] }
export type jsonBlock = blockBlock | varBlock

const assets: Map<string, string> = new Map();

let layer = -1;
for (const spriteName in project.sprites) {
    layer++;
    const sprite: TSprite = project.sprites[spriteName];
    const jsonSprite: Partial<json.Sprite> = {};
    jsonSprite.name = sprite.name
    jsonSprite.isStage = sprite.stage ?? false
    jsonSprite.lists = {}
    jsonSprite.variables = {}
    jsonSprite.broadcasts = {}
    jsonSprite.costumes = []

    if (sprite.code) {
        const sourceCode = new TextDecoder().decode(Deno.readFileSync(path.join(dir, sprite.code)));

        const lexer = new Lexer(sourceCode);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        if (Deno.args.includes('-a')) {
            Deno.writeFileSync('ast.json', new TextEncoder().encode(JSON.stringify(ast, null, 4)))
        }
        const [blockaroonies, env]: [jsonBlock[], Environment] = await ASTtoBlocks(ast);
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
        jsonSprite.blocks = Object.fromEntries(blockaroonies.map(b => [b.id, 'data' in b ? b.data : b]))
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
            console.log(match ? match[1] : 'a')
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
    projectJson.targets.push(completesprite)
}

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
await zipWriter.add('assets/')
for (const [asset, uuid] of [...assets.entries()]) {
    const file = Deno.readFileSync(path.join(dir, asset))
    await zipWriter.add(`assets/${uuid}.svg`, new zip.BlobReader(new Blob([file]))) // ungodly conversion between a uint8array and reader
}
await zipWriter.close();

// Retrieves the Blob object containing the zip content into `zipFileBlob`. It
// is also returned by zipWriter.close() for more convenience.
const zipFileBlob = await zipFileWriter.getData();
Deno.writeFileSync(path.join(dir, 'project.sb3'), await zipFileBlob.bytes())
//!SECTION