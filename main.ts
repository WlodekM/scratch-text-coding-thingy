// deno-lint-ignore-file no-explicit-any
import { parse } from "jsr:@std/yaml";
import * as json from './jsontypes.ts'
import { Lexer, Parser } from "./tshv2/main.ts";
import ASTtoBlocks from "./asttoblocks.ts";

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
const rawProjectConfig: string = decoder.decode(Deno.readFileSync('project.prj'))
const project: TProject = parse(rawProjectConfig) as TProject

console.debug(project)

const projectjson: { targets: json.Sprite[], meta: any, $schema?: string } = {
    targets: [],
    meta: {}
}

let layer = 0;
for (const spriteName in project.sprites) {
    layer++;
    const sprite: TSprite = project.sprites[spriteName];
    const jsonsprite: Partial<json.Sprite> = {};
    jsonsprite.name = sprite.name
    jsonsprite.isStage = sprite.stage ?? false
    jsonsprite.lists = {}
    jsonsprite.variables = {}
    jsonsprite.broadcasts = {}

    if (sprite.code) {
        const sourceCode = new TextDecoder().decode(Deno.readFileSync(sprite.code));

        const lexer = new Lexer(sourceCode);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const blockaroonies: (json.Block & {id: string})[] = ASTtoBlocks(ast);
        console.log(ast, blockaroonies)
        jsonsprite.blocks = Object.fromEntries(blockaroonies.map(b => [b.id, b]))
    } else {
        jsonsprite.blocks = {}
    }

    jsonsprite.currentCostume = 0;
    jsonsprite.sounds = [] // TODO: fix this

    jsonsprite.volume = 100;
    jsonsprite.layerOrder = layer
    jsonsprite.isStage = sprite.stage ?? false
    if (jsonsprite.isStage) {
        jsonsprite.tempo = 60
        jsonsprite.videoTransparency = 50
        jsonsprite.videoState = 'on'
    } else if (jsonsprite.isStage == false) {
        jsonsprite.visible = true
        jsonsprite.x = 0;
        jsonsprite.y = 0;
        jsonsprite.size = 100;
        jsonsprite.direction = 90;
        jsonsprite.draggable = false;
        jsonsprite.rotationStyle = 'all around'
    }
    let completesprite: json.Sprite;
    if (jsonsprite.isStage) {
        completesprite = jsonsprite as json.Stage
    } else if (jsonsprite.isStage == false) {
        completesprite = jsonsprite as json.RealSprite
    } else throw new Error()
    projectjson.targets.push(completesprite)
}

projectjson.meta = {
    agent: '',
    semver: '3.0.0',
    platform: {
        name: 'SLTLCC',
        url: 'https://github.com/WlodekM/scratch-text-coding-thingy'
    }
}

//NOTE - debug
projectjson.$schema = "./schema/sb3_schema.json"

//TODO - figure out what the SHIT is causing it to error
//@ts-expect-error: uh
const completeproject: json.Project & { $schema?: string } = projectjson

const encoder = new TextEncoder();
const data = encoder.encode(JSON.stringify(completeproject))
Deno.writeFileSync('out.json', data)