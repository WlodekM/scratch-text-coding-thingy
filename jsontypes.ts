export interface Stage {
    isStage: true
    name: string
    variables: Variables
    lists: Lists
    broadcasts: Broadcasts
    blocks: Record<string, Block>
    comments: Comments
    currentCostume: number
    costumes: Costume[]
    sounds: any[]
    volume: number
    layerOrder: number
    tempo: number
    videoTransparency: number
    videoState: string
    textToSpeechLanguage: any
}

export interface RealSprite {
    isStage: false
    name: string
    variables: Variables
    lists: Lists
    broadcasts: Broadcasts
    blocks: Record<string, Block>
    comments: Comments
    currentCostume: number
    costumes: Costume[]
    sounds: any[]
    volume: number
    layerOrder: number
    visible: boolean
    x: number
    y: number
    size: number
    direction: number
    draggable: boolean
    rotationStyle: string
}

export type Sprite = Stage | RealSprite

export type Variable = [string, number]

export type Variables = Record<string, Variable>

export interface Lists { }

export interface Broadcasts { }

export interface Block {
    opcode: string
    next: string
    parent: any
    inputs: Inputs
    fields: any
    shadow: boolean
    topLevel: boolean
    x?: number
    y?: number
}

export type Inputs = Record<string, Input>

export type Input = [number, ...any]

export interface Inputs3 {
    STEPS: [number, [number, string]]
}

export interface Comments { }

export interface Costume {
    name: string
    bitmapResolution: number
    dataFormat: string
    assetId: string
    md5ext: string
    rotationCenterX: number
    rotationCenterY: number
}
