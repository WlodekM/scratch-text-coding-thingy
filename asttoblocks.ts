// deno-lint-ignore-file no-case-declarations no-explicit-any
import type { AssignmentNode, ASTNode, BinaryExpressionNode, BooleanNode, BranchFunctionCallNode, FunctionCallNode, FunctionDeclarationNode, GreenFlagNode, IdentifierNode, IfNode, IncludeNode, ListDeclarationNode, LiteralNode, NotNode, VariableDeclarationNode } from "./tshv2/main.ts";
import * as json from './jsontypes.ts';
import bd from "./blocks.ts";
import { jsBlocksToJSON, blockly } from "./blocks.ts";

let blockDefinitions = bd

interface Input {
    name: string,
    type: number,
    field?: string,
    variableTypes?: string[]
}

const soup = '!#$%()*+,-./:;=?@[]^_`{|}~' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
function genUid() {
    const length = 20;
    const soupLength = soup.length;
    const id = [];
    for (let i = 0; i < length; i++) {
        id[i] = soup.charAt(Math.random() * soupLength);
    }
    return id.join('');
};

// console.log(genUid(), genUid(), genUid())

export type blockBlock = ({ id: string } & json.Block)
export type varBlock = { id: string, data: [12, string, string] }
export type jsonBlock = blockBlock | varBlock
const _class = new (class { })()
type Class = typeof _class

class Scope {
    identifierBlocks: Map<string, (id: string) => jsonBlock> = new Map()
    duplicate(): Scope {
        const s = new Scope();
        for (const [key, value] of [...this.identifierBlocks.entries()]) {
            s.identifierBlocks.set(key, value);
        }
        return s;
    }
}

let varId = 0;

function genVarId(name: string): string {
    varId++
    return genId(varId) + '-' + name
}

export class Environment {
    variables: Map<string, string> = new Map();
    globalVariables: Map<string, string> = new Map();
    lists: Map<string, [string, string[]]> = new Map();
    globalLists: Map<string, [string, string[]]> = new Map();
    extensions: [string, string][] = [];
    customBlocks: Record<string, CustomBlock> = {};
}

class PartialBlockCollection {
    children: PartialBlockCollection[] = [];
    constructor(children: PartialBlockCollection[]) {
        this.children = children
    };
    unfurl(): jsonBlock[] {
        const blocks = []
        for (const child of this.children) {
            const childBlocks = child.unfurl();
            blocks.push(...childBlocks)
        }
        return blocks
    }
}

class BlockCollection<T = jsonBlock> extends PartialBlockCollection {
    block: T;
    constructor(
        block: T,
        children: PartialBlockCollection[]
    ) {
        super(children);
        this.block = block
    }
    override unfurl(): jsonBlock[] {
        const blocks = [this.block as jsonBlock]
        for (const child of this.children) {
            const childBlocks = child.unfurl();
            blocks.push(...childBlocks)
        }
        return blocks
    }
}

enum InputTypes {
    math_number = 4,
    math_positive_number = 5,
    math_whole_number = 6,
    math_integer = 7,
    math_angle = 8,
    colour_picker = 9,
    text = 10,
    event_broadcast_menu = 11,
    data_variable = 12,
    data_listcontents = 13
}

class Cast {
    string(text: string) {
        return [InputTypes.text, text]
    }
    number(number: number) {
        return [InputTypes.math_number, number]
    }
}

const _cast = new Cast() // because yes

function genId(num: number): string {
    let result = "";
    while (num > 0) {
        num--;
        result = String.fromCharCode(97 + (num % 26)) + result;
        num = Math.floor(num / 26);
    }
    return result;
}

interface Mutation {
    tagName: 'mutation' | string,
    children: any[],
    proccode: string,
    argumentids: string,
    argumentnames: string,
    argumentdefaults: string,
    warp: string
}

interface CustomBlock {
    inputs: [1, string][],
    mutation: Mutation
}

export default async function ASTtoBlocks(ast: ASTNode[]): Promise<[jsonBlock[], Environment]> {
    const blocks: jsonBlock[] = [];
    const sprite = new Environment();

    // console.debug('debug: ast\n', JSON.stringify(ast, null, 2))

    let blockID: number = 0;
    let lastBlock: blockBlock = {} as blockBlock;

    async function arg2input(level: number, inp: Input, arg: ASTNode, child: PartialBlockCollection[], scope: Scope) {
        if (arg.type == 'Identifier') {
            const childBlock = await processNode(level + 1, arg, false, true, true, scope);
            if (!(childBlock.block as varBlock).data) {
                const blbl = childBlock.block as blockBlock; // the blockaroo
                child.push(childBlock);
                return {
                    inputs: [inp.name, [
                        inp.type,
                        blbl.id.toString(),
                        [
                            ...(
                                arg
                                    ? [
                                        10,
                                        '0'
                                    ]
                                    : []
                            )
                        ]
                    ]],
                    fields: [] as [string, any] | []
                }
            }
            return {
                inputs: [inp.name, Array.isArray(childBlock.block)
                    ? [inp.type, childBlock.block] : [inp.type,
                    (childBlock.block as varBlock).data,
                    [
                        ...(
                            arg
                                ? [
                                    10,
                                    '0'
                                ]
                                : []
                        )
                    ]
                    ]],
                fields: [] as [string, any] | []
            }
        }
        if (['FunctionCall', 'Boolean', 'BinaryExpression', 'Not'].includes(arg.type)) {
            const childBlock = await processNode(level + 1, arg, false, true, true, scope);
            child.push(childBlock);
            return {
                inputs: [inp.name, Array.isArray(childBlock.block)
                    ? [inp.type, childBlock.block] : [inp.type,
                    childBlock.block.id.toString(),
                    [
                        ...(
                            arg
                                ? [
                                    10,
                                    '0'
                                ]
                                : []
                        )
                    ]
                    ]],
                fields: [] as [string, any] | []
            }
        }
        return {
            inputs:
                [inp.name, [inp.type,
                [
                    ...(
                        arg
                            ? [
                                ({
                                    Literal: typeof (arg as LiteralNode).value == 'number' ? 4 : 10,
                                })[arg.type] ?? 10,
                                (arg as LiteralNode | any)?.value?.toString()
                            ]
                            : []
                    )
                ]
                ]],
            fields: (inp.field ?
                [inp.name,
                    [
                        (arg as LiteralNode | any)?.value?.toString(),
                        (arg as LiteralNode | any)?.value?.toString(),
                        (inp.variableTypes ?? [])[0]
                    ].filter(k=>k)
                ] : []) as [string, any] | []
        }
    }

    async function processNode(level: number, node: ASTNode, topLevel = false, noLast = false, noNext = false, scope = new Scope()): Promise<BlockCollection> {
        blockID++;
        const thisBlockID = genId(blockID);
        console.log(' '.repeat(level*2), 'procesing node', thisBlockID, node.type,'\n'+' '.repeat(level*2), {topLevel, noLast, noNext}, lastBlock.id)
        let blk = {
            next: null,
            parent: null,
            inputs: {},
            fields: {},
            shadow: false,
            topLevel: false,
        }
        if (topLevel) {
            blk = Object.assign(blk, {
                x: 0,
                y: 0,
            })
        }
        switch (node.type) {
            case 'GreenFlag':
                const gfNode = node as GreenFlagNode;
                const tempBlock = {
                    opcode: 'event_whenflagclicked',
                    id: thisBlockID.toString(),
                    next: null,
                    topLevel
                } as jsonBlock
                lastBlock = tempBlock as blockBlock
                const processedNodes = [];
                for (const node of gfNode.branch) {
                    processedNodes.push(await processNode(level + 1, node, false, false, false, scope))
                }
                const children = new PartialBlockCollection(
                    processedNodes
                )
                const firstChild: BlockCollection | undefined =
                    children.children[0] as BlockCollection | undefined
                const gfBlock = {
                    opcode: 'event_whenflagclicked',
                    ...blk,
                    id: thisBlockID.toString(),
                    next: (firstChild?.block as blockBlock).id,
                    topLevel
                } as jsonBlock
                if (firstChild) (firstChild.block as blockBlock).parent = thisBlockID.toString();
                lastBlock = gfBlock as blockBlock
                return new BlockCollection(gfBlock, [children])

            case 'Include':
                const includeNode = node as IncludeNode;
                blockID--
                if (includeNode.itype == 'blocks/js') {
                    //@ts-ignore: goog...
                    globalThis.goog = {
                        require: () => { },
                        provide: () => { },
                    };
                    globalThis.Blockly = blockly
                    // actually import the blocks
                    await import('./' + includeNode.path);
                    const bl = jsBlocksToJSON();
                    blockDefinitions = {
                        ...bl,
                        ...blockDefinitions
                    }
                } else if (includeNode.itype.startsWith('extension')) {
                    const nop = () => { };
                    let ext: any = null;
                    //@ts-ignore:
                    const Scratch = globalThis.Scratch = {
                        translate: (a: string) => a,
                        extensions: {
                            unsandboxed: true,
                            register: (e: Class) => { ext = e }
                        },
                        vm: {
                            runtime: {
                                on: nop
                            }
                        },
                        BlockType: {
                            BOOLEAN: "Boolean",
                            BUTTON: "button",
                            LABEL: "label",
                            COMMAND: "command",
                            CONDITIONAL: "conditional",
                            EVENT: "event",
                            HAT: "hat",
                            LOOP: "loop",
                            REPORTER: "reporter",
                            XML: "xml"
                        },
                        TargetType: {
                            SPRITE: "sprite",
                            STAGE: "stage"
                        },
                        Cast,
                        ArgumentType: {
                            ANGLE: "angle",
                            BOOLEAN: "Boolean",
                            COLOR: "color",
                            NUMBER: "number",
                            STRING: "string",
                            MATRIX: "matrix",
                            NOTE: "note",
                            IMAGE: "image",
                            COSTUME: "costume",
                            SOUND: "sound"
                        }
                    }
                    //@ts-ignore:
                    Scratch.translate.setup = nop
                    await import(includeNode.path);
                    if (ext == null || !ext?.getInfo) throw "Extension didnt load properly";
                    const { blocks, id: extid } = ext.getInfo();
                    sprite.extensions.push([includeNode.path, extid]);
                    blockDefinitions = {
                        ...blockDefinitions,
                        ...Object.fromEntries(
                            blocks.map((block: any) => {
                                if (typeof block !== 'object' || !block.opcode)
                                    return [];
                                return [extid + '_' + block.opcode, [Object.entries(block.arguments ?? {}).map(a => {
                                    return {
                                        name: a[0],
                                        type: 1
                                    } as Input
                                }), block.blockType == Scratch.BlockType.EVENT ? 'hat' : 'reporter']]
                            })
                        )
                    }
                }
                return new PartialBlockCollection([]) as BlockCollection

            // deno-lint-ignore no-fallthrough
            case 'FunctionCall': // custom blocks
                const fnNode2 = node as FunctionCallNode;
                if (fnNode2.identifier in sprite.customBlocks) {
                    const blockDefinition = sprite.customBlocks[fnNode2.identifier]
                    const definition = [blockDefinition.inputs.map(i => { return { name: i[1], type: i[0] } })]
                    const child: PartialBlockCollection[] = [];
                    const inputs = [];
                    const fields: ([string, any] | [])[] = [];
                    for (let i = 0; i < Math.min(definition[0].length, fnNode2.args.length); i++) {
                        const inp = definition[0][i];
                        // console.log(inp)
                        const { inputs: inps, fields: flds } = await arg2input(level, inp, fnNode2.args[i], child, scope)
                        inputs.push(inps)
                        fields.push(flds)
                    }
                    const block: jsonBlock = {
                        opcode: "procedures_call",
                        ...blk,
                        fields: Object.fromEntries(fields),
                        mutation: blockDefinition.mutation,
                        id: thisBlockID.toString(),
                        inputs: Object.fromEntries(inputs),
                        next: null, // no next (yet)
                        topLevel,
                        parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
                        shadow: false,
                    }
                    // console.debug(block)
                    if (!topLevel && !noNext) lastBlock.next = block.id.toString();
                    if (!noLast) lastBlock = block;
                    return new BlockCollection(block, child) //TODO: figure out how to map function args to children
                }

            // deno-lint-ignore no-duplicate-case
            case 'FunctionCall':
                const fnNode = node as FunctionCallNode;
                if (!blockDefinitions[fnNode.identifier])
                    throw 'Unknown opcode "' + fnNode.identifier + '"';
                const definition = blockDefinitions[fnNode.identifier]
                const child: PartialBlockCollection[] = [];
                const inputs = [];
                const fields: ([string, any] | [])[] = [];
                for (let i = 0; i < Math.min(definition.length, fnNode.args.length); i++) {
                    const inp = definition[0][i];
                    const { inputs: inps, fields: flds } = await arg2input(level, inp, fnNode.args[i], child, scope)
                    inputs.push(inps)
                    fields.push(flds)
                }
                const block: jsonBlock = {
                    opcode: fnNode.identifier,
                    ...blk,
                    fields: Object.fromEntries(fields),
                    id: thisBlockID.toString(),
                    inputs: Object.fromEntries(inputs),
                    next: null, // no next (yet)
                    topLevel,
                    parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
                    shadow: false,
                }
                // console.debug(block)
                if (!topLevel && !noNext) lastBlock.next = block.id.toString();
                if (!noLast) lastBlock = block;
                return new BlockCollection(block, child); //TODO: figure out how to map function args to children
            
            case 'Not':
                if (!Object.keys(blockDefinitions).find(k => k.startsWith('operator_')))
                    throw `To use the not operator you have to include the operators category`
                const notNode = node as NotNode;
                const notDefinition = blockDefinitions['operator_not'];
                if (!notDefinition)
                    throw 'couldn\'t find definition for operator_not'
                blockID++;
                const notChildren: PartialBlockCollection[] = [];
                const lastLastBlock = lastBlock;
                const notBlock: jsonBlock = {
                    // opcode: 'operator_not',
                    // ...blk,
                    // id: thisBlockID.toString(),
                    // topLevel,
                    // parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
                    // shadow: false,
                    // inputs: Object.fromEntries([
                    //     [notDefinition[0][0].name, [
                    //         notDefinition[0][0].type,
                    //         genId(blockID).toString()
                    //     ]]
                    // ]),
                    // next: null
                    opcode: 'operator_not',
                    ...blk,
                    id: thisBlockID.toString(),
                    topLevel,
                    parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
                    shadow: false,
                    inputs: {}
                };
                lastBlock = notBlock;
                notBlock.inputs = {
                    ...Object.fromEntries([
                        (await arg2input(level, notDefinition[0][0], notNode.body, notChildren, scope)).inputs,
                    ])
                };
                lastBlock = lastLastBlock
                return new BlockCollection(notBlock, notChildren);

            case 'BinaryExpression':
                if (!Object.keys(blockDefinitions).find(k => k.startsWith('operator_')))
                    throw `To use BinExp you have to include the operators category`
                const operations: Record<string, string> = {
                    '&': 'operator_and',
                    '=': 'operator_equals',
                    '+': 'operator_add',
                    '-': 'operator_subtract',
                    '*': 'operator_multiply',
                    '/': 'operator_divide',
                    '%': 'operator_mod',
                    '<': 'operator_lt',
                    '>': 'operator_gt',
                }
                const beNode = node as BinaryExpressionNode;
                if (beNode.operator.length > 1) {
                    const operations: Record<string, [string, string]> = {
                        '!=': ['operator_not', 'operator_equals'],
                        '<=': ['operator_not', 'operator_gt'],
                        '>=': ['operator_not', 'operator_lt']
                    }
                    if (!operations[beNode.operator]) throw 'unknown operator ' + beNode.operator;
                    const beDefinition1 = blockDefinitions[operations[beNode.operator][0]]
                    const beDefinition2 = blockDefinitions[operations[beNode.operator][1]]
                    const beChildren: PartialBlockCollection[] = [];
                    blockID++
                    const beBlock: jsonBlock = {
                        opcode: operations[beNode.operator][0] ?? 'undefined',
                        ...blk,
                        id: thisBlockID.toString(),
                        topLevel,
                        parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
                        shadow: false,
                        inputs: Object.fromEntries([
                            [beDefinition1[0][0].name, [
                                beDefinition1[0][0].type,
                                genId(blockID).toString()
                            ]]
                        ]),
                    };
                    const beBlock2: jsonBlock = {
                        opcode: operations[beNode.operator][1] ?? 'undefined',
                        ...blk,
                        id: genId(blockID).toString(),
                        topLevel,
                        parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
                        shadow: false,
                        inputs: {
                            ...Object.fromEntries([
                                (await arg2input(level, beDefinition2[0][0], beNode.left, beChildren, scope)).inputs,
                                (await arg2input(level, beDefinition2[0][1], beNode.right, beChildren, scope)).inputs
                            ])
                        },
                    };
                    beChildren.push(new BlockCollection(beBlock2, []))
                    return new BlockCollection(beBlock, beChildren);
                }
                if (!operations[beNode.operator]) throw 'unknown operator ' + beNode.operator;
                const beDefinition = blockDefinitions[operations[beNode.operator]]
                const beChildren: PartialBlockCollection[] = []
                const beBlock: jsonBlock = {
                    opcode: operations[beNode.operator] ?? 'undefined',
                    ...blk,
                    id: thisBlockID.toString(),
                    topLevel,
                    parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
                    shadow: false,
                    inputs: {
                        ...Object.fromEntries([
                            (await arg2input(level, beDefinition[0][0], beNode.left, beChildren, scope)).inputs,
                            (await arg2input(level, beDefinition[0][1], beNode.right, beChildren, scope)).inputs
                        ])
                    },
                };
                return new BlockCollection(beBlock, beChildren);

            case 'If':
                const ifNode = node as IfNode;
                const ifBlock: jsonBlock = {
                    opcode: 'control_if',
                    ...blk,
                    id: thisBlockID.toString(),
                    topLevel,
                    parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
                    shadow: false,
                    inputs: {},
                };
                if (!topLevel && !noNext) lastBlock.next = ifBlock.id.toString();
                if (!noLast) lastBlock = ifBlock;
                const ifChildren: PartialBlockCollection[] = [];
                const processedThenNodes = [];
                for (let i = 0; i < ifNode.thenBranch.length; i++) {
                    const node = ifNode.thenBranch[i];
                    processedThenNodes.push(await processNode(level + 1, node, false, false, i == 0, scope))
                }
                const thenBlocks = new PartialBlockCollection(
                    processedThenNodes
                )
                const firstThenChild: BlockCollection<blockBlock> | undefined =
                    thenBlocks.children[0] as BlockCollection<blockBlock> | undefined
                ifChildren.push(thenBlocks)
                ifBlock.inputs.SUBSTACK = [
                    2,
                    firstThenChild?.block?.id
                ]
                if (!noLast) lastBlock = ifBlock;
                const condition = (await arg2input(level, {
                    name: 'CONDITION',
                    type: 1
                }, ifNode.condition, ifChildren, scope)).inputs;
                ifBlock.inputs.CONDITION = condition[1] as json.Input
                if (ifNode.elseBranch) {
                    ifBlock.opcode = 'control_if_else'
                    const processedElseNodes = [];
                    if (!noLast) lastBlock = ifBlock;
                    for (let i = 0; i < ifNode.elseBranch.length; i++) {
                        const node = ifNode.elseBranch[i];
                        processedElseNodes.push(await processNode(level + 1, node, false, false, i == 0, scope))
                    }
                    const elseBlocks = new PartialBlockCollection(
                        processedElseNodes
                    )
                    const firstElseChild: BlockCollection<blockBlock> | undefined =
                        elseBlocks.children[0] as BlockCollection<blockBlock> | undefined
                    ifChildren.push(elseBlocks)
                    ifBlock.inputs.SUBSTACK2 = [
                        2,
                        firstElseChild?.block?.id
                    ]
                }
                if (!noLast) lastBlock = ifBlock;
                return new BlockCollection(ifBlock, ifChildren);

            case "Boolean":
                const boolNode = node as BooleanNode;
                const boolBlock: jsonBlock = {
                    opcode: boolNode.value ? "operator_not" : "operator_and",
                    ...blk,
                    id: thisBlockID.toString(),
                    topLevel,
                    parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
                }
                return new BlockCollection(boolBlock, []);

            case "BranchFunctionCall":
                const branchNode = node as BranchFunctionCallNode;
                const bDefinition = blockDefinitions[branchNode.identifier]
                const branchChildren: PartialBlockCollection[] = [];
                const binputs = [];
                const bfields = [];
                const bLastLastBlock = lastBlock;
                lastBlock = {
                    id: thisBlockID.toString()
                } as blockBlock
                for (let i = 0; i < Math.min(bDefinition.length, branchNode.args.length); i++) {
                    const inp = bDefinition[0][i];
                    const { inputs: inps, fields: flds } = await arg2input(level, inp, branchNode.args[i], branchChildren, scope)
                    // binputs.push(().inputs)
                    binputs.push(inps)
                    bfields.push(flds)
                }
                const branchBlock: jsonBlock = {
                    opcode: branchNode.identifier,
                    ...blk,
                    id: thisBlockID.toString(),
                    topLevel,
                    parent: topLevel || !bLastLastBlock ? null : bLastLastBlock.id.toString(),
                    shadow: false,
                    inputs: {},
                    fields: Object.fromEntries(bfields)
                };
                branchBlock.inputs = Object.fromEntries([...await Promise.all(bDefinition[0]
                        .filter(a => a)
                        .filter(a => Array.isArray(a) && a[0])
                        .map(
                            async (inp, i) => {
                                lastBlock = branchBlock;
                                return (await arg2input(level, inp, branchNode.args[i], branchChildren, scope)).inputs
                            }
                        )
                    ), ...binputs]);
                if (bDefinition[1] == 'hat') {
                    if (!topLevel)
                        throw 'Hat is allowed in top-level';
                    if (branchNode.branches.length > 1)
                        throw 'Hat can only have 1 branch';
                    const processedBranchNodes = [];
                    const branch = branchNode.branches[0]
                    if (!noLast) lastBlock = branchBlock;
                    for (let i = 0; i < branch.length; i++) {
                        const node = branch[i];
                        processedBranchNodes.push(await processNode(level + 1, node, false, false, i == 0, scope))
                    }
                    const branchBlocks = new PartialBlockCollection(
                        processedBranchNodes
                    )
                    branchChildren.push(branchBlocks)
                    const firstBranchChild = branchBlocks.children[0] as BlockCollection<blockBlock> | undefined
                    if (firstBranchChild?.block?.id) branchBlock.next = firstBranchChild?.block?.id;
                    return new BlockCollection(branchBlock, branchChildren);
                }
                if (!topLevel && !noNext) bLastLastBlock.next = branchBlock.id.toString();
                if (!noLast) lastBlock = branchBlock;
                // const firstBranchChildren: (BlockCollection | undefined)[] = [];
                let branchN = 0;
                for (const branch of branchNode.branches) {
                    branchN++;
                    const processedBranchNodes = [];
                    for (let i = 0; i < branch.length; i++) {
                        const node = branch[i];
                        processedBranchNodes.push(await processNode(level + 1, node, false, false, i == 0, scope))
                    }
                    const branchBlocks = new PartialBlockCollection(
                        processedBranchNodes
                    )
                    branchChildren.push(branchBlocks)
                    const firstBranchChild = branchBlocks.children[0] as BlockCollection<blockBlock> | undefined
                    branchBlock.inputs['SUBSTACK' + (branchN == 1 ? '' : branchN)] = [
                        2,
                        firstBranchChild?.block?.id
                    ]
                }
                lastBlock = branchBlock;
                return new BlockCollection(branchBlock, branchChildren);

            case 'ListDeclaration':
                const listDeclNode = node as ListDeclarationNode;
                const lid: string = genVarId(listDeclNode.identifier);
                if (listDeclNode.vtype == 'global')
                    sprite.globalLists.set(listDeclNode.identifier, [lid, listDeclNode.value.map(n => (n as LiteralNode).value.toString())])
                else sprite.lists.set(listDeclNode.identifier, [lid, listDeclNode.value.map(n => (n as LiteralNode).value.toString())]);
                return new PartialBlockCollection([]) as BlockCollection;

            case 'VariableDeclaration':
                const varDeclNode = node as VariableDeclarationNode;
                const id: string = genVarId(varDeclNode.identifier);
                if (varDeclNode.vtype == 'global')
                    sprite.globalVariables.set(varDeclNode.identifier, id)
                else sprite.variables.set(varDeclNode.identifier, id);
                const varDeclChildren: PartialBlockCollection[] = [];
                const varDeclBlock: jsonBlock = {
                    opcode: 'data_setvariableto',
                    ...blk,
                    id: thisBlockID.toString(),
                    inputs: {
                        'VALUE': ((await arg2input(level, 
                            blockDefinitions.data_setvariableto[0][1],
                            varDeclNode.value,
                            varDeclChildren,
                            scope
                        )).inputs)[1] as json.Input
                    },
                    fields: {
                        "VARIABLE": [
                            varDeclNode.identifier,
                            id
                        ]
                    },
                    parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
                }
                if (!topLevel && !noNext) lastBlock.next = varDeclBlock.id.toString();
                if (!noLast) lastBlock = varDeclBlock;
                return new BlockCollection(varDeclBlock, varDeclChildren);

            case "Assignment":
                const varAssignmentNode = node as AssignmentNode;
                const sid = sprite.variables.get(varAssignmentNode.identifier);
                if (!sid) throw 'unknown var'
                const varAssignmentChildren: PartialBlockCollection[] = [];
                const varAssignmentBlock: jsonBlock = {
                    opcode: 'data_setvariableto',
                    ...blk,
                    id: thisBlockID.toString(),
                    inputs: {
                        'VALUE': ((await arg2input(level, 
                            blockDefinitions.data_setvariableto[0][1],
                            varAssignmentNode.value,
                            varAssignmentChildren,
                            scope
                        )).inputs)[1] as json.Input
                    },
                    fields: {
                        "VARIABLE": [
                            varAssignmentNode.identifier,
                            sid
                        ]
                    },
                    parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
                }
                if (!topLevel && !noNext) lastBlock.next = varAssignmentBlock.id.toString();
                if (!noLast) lastBlock = varAssignmentBlock;
                return new BlockCollection(varAssignmentBlock, varAssignmentChildren);

            case "Identifier":
                const identifierNode = node as IdentifierNode;
                // console.debug(scope)
                if (scope.identifierBlocks.has(identifierNode.name)) {
                    const bl = scope.identifierBlocks.get(identifierNode.name);
                    if (!bl) throw 'how the fuck';
                    return new BlockCollection(
                        bl(thisBlockID),
                        []
                    );
                }
                const vid = sprite.variables.get(identifierNode.name);
                if (!vid) throw 'Unknown variable'
                return new BlockCollection({
                    id: thisBlockID,
                    data: [12, identifierNode.name, vid]
                }, []);


            case "FunctionDeclaration":
                const fndNode = node as FunctionDeclarationNode;
                if (!topLevel) throw 'fn definition only in top level'
                const fndBlocks: jsonBlock[] = [];
                const fndChildren: BlockCollection[] = [];

                if ('x' in blk) delete blk.x;
                if ('y' in blk) delete blk.y;

                const prototype: jsonBlock = {
                    opcode: 'procedures_prototype',
                    ...blk,
                    next: null,
                    id: genId(blockID).toString(),
                    inputs: {},
                    shadow: true
                }

                blockID++;

                const definitionId = genId(blockID).toString();

                const argumentids = [];
                const argumentdefaults = [];
                const argumentnames = [];
                const sc = scope.duplicate();
                for (const arg of fndNode.params) {
                    const argid = genUid();
                    argumentids.push(argid)
                    argumentnames.push(arg);
                    argumentdefaults.push('');

                    blockID++;

                    const inputBlock: jsonBlock = {
                        opcode: "argument_reporter_string_number",
                        ...blk,
                        next: null,
                        id: genId(blockID).toString(),
                        fields: {
                            VALUE: [arg, null]
                        },
                        parent: prototype.id,
                        shadow: true
                    }

                    fndBlocks.push(inputBlock)

                    sc.identifierBlocks.set(arg, id => {
                        return {
                            ...inputBlock,
                            id
                        }
                    })

                    prototype.inputs[argid] = [1, inputBlock.id]
                }

                const mutation = prototype.mutation = {
                    tagName: 'mutation',
                    children: [],
                    proccode: fndNode.name + ` %s`.repeat(fndNode.params.length),
                    argumentids: JSON.stringify(argumentids),
                    argumentnames: JSON.stringify(argumentnames),
                    argumentdefaults: JSON.stringify(argumentdefaults),
                    warp: JSON.stringify(fndNode.warp)
                }

                sprite.customBlocks[fndNode.name] = {
                    mutation,
                    inputs: Object.entries(prototype.inputs).map(i => [1, i[0]])
                }

                prototype.parent = definitionId

                lastBlock = {
                    id: definitionId,
                    ...blk,
                    opcode: 'procedures_definition'
                };

                // console.debug(sc)

                for (const node of fndNode.body) {
                    fndChildren.push(await processNode(level + 1, node, false, false, false, sc))
                }

                lastBlock = {} as blockBlock;

                const firstFndChild: BlockCollection | undefined =
                    fndChildren[0] as BlockCollection | undefined

                fndBlocks.push({
                    opcode: 'procedures_definition',
                    ...blk,
                    next: firstFndChild ? firstFndChild.block.id : null,
                    inputs: {
                        custom_block: [
                            1,
                            prototype.id
                        ]
                    },
                    topLevel: true,
                    id: definitionId,
                    x: 0,
                    y: 0
                } as jsonBlock, prototype)
                return new PartialBlockCollection([
                    ...fndBlocks.map(bl => new BlockCollection(bl, [])),
                    new PartialBlockCollection(fndChildren),
                ]) as BlockCollection;

            //TODO: do other nodes

            default:
                throw `Unimplemented (${node.type})`
        }

    }

    for (const node of ast) {
        const coll = await processNode(0, node, true);
        const unfurled = coll.unfurl()
        // console.log(coll, unfurled)
        blocks.push(...unfurled)
    }

    return [blocks, sprite]
}