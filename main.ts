// deno-lint-ignore-file no-explicit-any
import { parse } from "jsr:@std/yaml";
import * as json from './jsontypes.ts'
import { Lexer, Parser } from "./tshv2/main.ts";
import ASTtoBlocks from "./asttoblocks.ts";
import * as zip from "jsr:@zip-js/zip-js";
import CryptoJS from "https://esm.sh/crypto-js@4.1.1";

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

const decoder = new TextDecoder("utf-8");
const rawProjectConfig: string = decoder.decode(Deno.readFileSync('project.prj.yaml'))
const project: TProject = parse(rawProjectConfig) as TProject

console.debug(project)

const projectJson: { targets: json.Sprite[], meta: any, $schema?: string } = {
    targets: [],
    meta: {}
}

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
        const sourceCode = new TextDecoder().decode(Deno.readFileSync(sprite.code));

        const lexer = new Lexer(sourceCode);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const blockaroonies: (json.Block & { id: string })[] = ASTtoBlocks(ast);
        console.log(ast, blockaroonies)
        jsonSprite.blocks = Object.fromEntries(blockaroonies.map(b => [b.id, b]))
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
        if (!assets.has(asset.path)) {
            const assetData = new TextDecoder().decode(Deno.readFileSync(asset.path))
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
            rotationCenterX: 0,
            rotationCenterY: 0,
        })
    }
    projectJson.targets.push(completesprite)
}

projectJson.meta = {
    agent: '',
    semver: '3.0.0',
    platform: {
        name: 'TurboWarp-compatible SLTLCC',
        url: 'https://github.com/WlodekM/scratch-text-coding-thingy'
    }
}

//TODO - figure out what the SHIT is causing it to error
//@ts-expect-error: uh
const completeproject: json.Project & { $schema?: string } = {$schema: "./schema/sb3_schema.json", ...projectJson}

const encoder = new TextEncoder();
const data = encoder.encode(JSON.stringify(completeproject))
Deno.writeFileSync('out.json', data)

//SECTION - Write the project json and assets into a zip
const zipFileWriter = new zip.BlobWriter();

const zipWriter = new zip.ZipWriter(zipFileWriter);
await zipWriter.add("project.json", new zip.TextReader(JSON.stringify(completeproject)));
await zipWriter.add('assets/')
for (const [asset, uuid] of [...assets.entries()]) {
    const file = await Deno.readFileSync(asset)
    await zipWriter.add(`assets/${uuid}.svg`, new zip.BlobReader(new Blob([file]))) // ungodly conversion between a uint8array and reader
}
await zipWriter.close();

// Retrieves the Blob object containing the zip content into `zipFileBlob`. It
// is also returned by zipWriter.close() for more convenience.
const zipFileBlob = await zipFileWriter.getData();
Deno.writeFileSync('project.sb3', await zipFileBlob.bytes())
//!SECTION