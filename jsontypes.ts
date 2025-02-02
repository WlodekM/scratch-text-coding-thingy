export type jsonBlock = Block | [12, string, string]

export interface Stage {
    isStage: true
    name: "Stage"
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
    blocks: Record<string, jsonBlock>
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
    parent: string | null
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

/**
 * Scratch 3.0 Project Schema
 */
export interface Project {
    meta: {
        semver: string
        vm?: string
        agent?: string
        origin?: string
        [k: string]: unknown
    }
    targets:
    | []
    | [
        {
            name: "Stage"
            isStage: true
            tempo?: number
            videoTransparency?: number
            videoState?: "on" | "off" | "on-flipped"
            /**
             * The layer order of the stage should be 0, if specified.
             */
            layerOrder?: 0
            [k: string]: unknown
        } & {
            currentCostume?: number
            blocks: {
                [k: string]:
                | {
                    opcode: string
                    comment?: string
                    inputs?: {
                        [k: string]:
                        | []
                        | [
                            1 | 2 | 3,
                            ...(
                                | (string | null)
                                | (
                                    | []
                                    | [4 | 5 | 6 | 7 | 8]
                                    | [4 | 5 | 6 | 7 | 8, string | number]
                                    | []
                                    | [9]
                                    | [9, string]
                                    | []
                                    | [10]
                                    | [10, string | number]
                                    | []
                                    | [11]
                                    | [11, string]
                                    | [11, string, string]
                                    | [12, string, string, ...number[]]
                                    | [13, string, string, ...number[]]
                                )
                            )[]
                        ]
                    }
                    fields?: {
                        [k: string]: unknown
                    }
                    next?: string | null
                    topLevel?: boolean
                    parent?: string | null
                    shadow?: boolean
                    x?: number
                    y?: number
                    mutation?: {
                        tagName?: "mutation"
                        children?: unknown[]
                        proccode?: string
                        argumentids?: string
                        warp?: ("true" | "false" | "null") | boolean | null
                        hasnext?: ("true" | "false" | "null") | boolean | null
                        [k: string]: unknown
                    }
                    [k: string]: unknown
                }
                | (
                    | [12, string, string, ...number[]]
                    | [13, string, string, ...number[]]
                )
            }
            variables: {
                [k: string]:
                | []
                | [string]
                | [string, (string | number) | boolean, ...true[]]
            }
            lists?: {
                [k: string]:
                | []
                | [string]
                | [string, ((string | number) | boolean)[]]
            }
            broadcasts?: {
                /**
                 * the message being broadcasted
                 */
                [k: string]: string
            }
            comments?: {
                [k: string]: {
                    blockId?: string | null
                    text: string
                    minimized?: boolean
                    x?: number | null
                    y?: number | null
                    width?: number
                    height?: number
                    [k: string]: unknown
                }
            }
            costumes: [
                {
                    assetId: string
                    bitmapResolution?: number
                    dataFormat: "png" | "svg" | "jpeg" | "jpg" | "bmp" | "gif"
                    md5ext?: string
                    name: string
                    /**
                     * This property is not required, but is highly recommended.
                     */
                    rotationCenterX?: number
                    /**
                     * This property is not required, but is highly recommended.
                     */
                    rotationCenterY?: number
                    [k: string]: unknown
                },
                ...{
                    assetId: string
                    bitmapResolution?: number
                    dataFormat: "png" | "svg" | "jpeg" | "jpg" | "bmp" | "gif"
                    md5ext?: string
                    name: string
                    /**
                     * This property is not required, but is highly recommended.
                     */
                    rotationCenterX?: number
                    /**
                     * This property is not required, but is highly recommended.
                     */
                    rotationCenterY?: number
                    [k: string]: unknown
                }[]
            ]
            sounds: {
                assetId: string
                dataFormat: "wav" | "wave" | "mp3"
                md5ext?: string
                name: string
                rate?: number
                sampleCount?: number
                [k: string]: unknown
            }[]
            volume?: number
            [k: string]: unknown
        },
        ...({
            name: string
            isStage: false
            visible?: boolean
            x?: number
            y?: number
            size?: number
            direction?: number
            draggable?: boolean
            rotationStyle?: "all around" | "don't rotate" | "left-right"
            /**
             * The layer order of a sprite should be a positive number, if specified.
             */
            layerOrder?: number
            [k: string]: unknown
        } & {
            currentCostume?: number
            blocks: {
                [k: string]:
                | {
                    opcode: string
                    comment?: string
                    inputs?: {
                        [k: string]:
                        | []
                        | [
                            1 | 2 | 3,
                            ...(
                                | (string | null)
                                | (
                                    | []
                                    | [4 | 5 | 6 | 7 | 8]
                                    | [4 | 5 | 6 | 7 | 8, string | number]
                                    | []
                                    | [9]
                                    | [9, string]
                                    | []
                                    | [10]
                                    | [10, string | number]
                                    | []
                                    | [11]
                                    | [11, string]
                                    | [11, string, string]
                                    | [12, string, string, ...number[]]
                                    | [13, string, string, ...number[]]
                                )
                            )[]
                        ]
                    }
                    fields?: {
                        [k: string]: unknown
                    }
                    next?: string | null
                    topLevel?: boolean
                    parent?: string | null
                    shadow?: boolean
                    x?: number
                    y?: number
                    mutation?: {
                        tagName?: "mutation"
                        children?: unknown[]
                        proccode?: string
                        argumentids?: string
                        warp?: ("true" | "false" | "null") | boolean | null
                        hasnext?: ("true" | "false" | "null") | boolean | null
                        [k: string]: unknown
                    }
                    [k: string]: unknown
                }
                | (
                    | [12, string, string, ...number[]]
                    | [13, string, string, ...number[]]
                )
            }
            variables: {
                [k: string]:
                | []
                | [string]
                | [string, (string | number) | boolean, ...true[]]
            }
            lists?: {
                [k: string]:
                | []
                | [string]
                | [string, ((string | number) | boolean)[]]
            }
            broadcasts?: {
                /**
                 * the message being broadcasted
                 */
                [k: string]: string
            }
            comments?: {
                [k: string]: {
                    blockId?: string | null
                    text: string
                    minimized?: boolean
                    x?: number | null
                    y?: number | null
                    width?: number
                    height?: number
                    [k: string]: unknown
                }
            }
            costumes: [
                {
                    assetId: string
                    bitmapResolution?: number
                    dataFormat: "png" | "svg" | "jpeg" | "jpg" | "bmp" | "gif"
                    md5ext?: string
                    name: string
                    /**
                     * This property is not required, but is highly recommended.
                     */
                    rotationCenterX?: number
                    /**
                     * This property is not required, but is highly recommended.
                     */
                    rotationCenterY?: number
                    [k: string]: unknown
                },
                ...{
                    assetId: string
                    bitmapResolution?: number
                    dataFormat: "png" | "svg" | "jpeg" | "jpg" | "bmp" | "gif"
                    md5ext?: string
                    name: string
                    /**
                     * This property is not required, but is highly recommended.
                     */
                    rotationCenterX?: number
                    /**
                     * This property is not required, but is highly recommended.
                     */
                    rotationCenterY?: number
                    [k: string]: unknown
                }[]
            ]
            sounds: {
                assetId: string
                dataFormat: "wav" | "wave" | "mp3"
                md5ext?: string
                name: string
                rate?: number
                sampleCount?: number
                [k: string]: unknown
            }[]
            volume?: number
            [k: string]: unknown
        })[]
    ]
    [k: string]: unknown
}
