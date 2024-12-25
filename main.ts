// deno-lint-ignore-file no-explicit-any ban-ts-comment
import { parse } from "jsr:@std/yaml";
import * as json from './jsontypes.ts'
import { Lexer, Parser } from "./tshv2/main.ts";

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

const projectjson: { targets: json.Sprite[] } = {
    targets: []
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

    // TODO: add tsh parsing
    jsonsprite.blocks = {}

    jsonsprite.currentCostume = 0;
    jsonsprite.sounds = [] // TODO: fix this

    jsonsprite.volume = 100;
    jsonsprite.layerOrder = layer
    jsonsprite.isStage = sprite.stage ?? false
    if(jsonsprite.isStage) {
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
    if(jsonsprite.isStage) {
        completesprite = jsonsprite as json.Stage
    } else if (jsonsprite.isStage == false) {
        completesprite = jsonsprite as json.RealSprite
    } else throw new Error()
    projectjson.targets.push(completesprite)
}

const encoder = new TextEncoder();
const data = encoder.encode(JSON.stringify(projectjson))
Deno.writeFileSync('out.json', data)