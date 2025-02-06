// deno-lint-ignore-file no-case-declarations
import type { AssignmentNode, ASTNode, BinaryExpressionNode, BooleanNode, BranchFunctionCallNode, FunctionCallNode, GreenFlagNode, IdentifierNode, IfNode, IncludeNode, LiteralNode, VariableDeclarationNode } from "./tshv2/main.ts";
import * as json from './jsontypes.ts';
import bd from "./blocks.ts";
import { jsBlocksToJSON, blockly } from "./blocks.ts";

let blockDefinitions = bd

interface Input {
    name: string,
    type: number
}

export type blockBlock = ({ id: string } & json.Block)
export type varBlock = { id: string, data:  [12, string, string] }
export type jsonBlock = blockBlock | varBlock
const _class = new (class {})()
type Class = typeof _class

let varId = 0;

function genVarId(name: string): string {
    varId++
    return genId(varId) + '-' + name
}

export class Environment {
    variables: Map<string, string> = new Map();
    extensions: [string, string][] = []
}

class PartialBlockCollection {
    children: PartialBlockCollection[] = [];
    constructor (children: PartialBlockCollection[] ) {
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
    constructor (
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
    string (text: string) {
        return [InputTypes.text, text]
    }
    number (number: number) {
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

export default async function ASTtoBlocks(ast: ASTNode[]): Promise<[jsonBlock[], Environment]> {
    const blocks: jsonBlock[] = [];
    const sprite = new Environment();

    // console.debug('debug: ast\n', JSON.stringify(ast, null, 2))

    let blockID: number = 0;
    let lastBlock: blockBlock = {} as blockBlock;

    async function arg2input(inp: Input, arg: ASTNode, child: PartialBlockCollection[]) {
        console.debug(arg, inp)
        if(arg.type == 'Identifier') {
            const childBlock = await processNode(arg, false, true, true);
            console.debug(childBlock.block, 'ahhh')
            return [inp.name, Array.isArray(childBlock.block)
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
            ]]
        }
        if(['FunctionCall', 'Boolean', 'BinaryExpression'].includes(arg.type)) {
            const childBlock = await processNode(arg, false, true, true);
            child.push(childBlock);
            console.debug(childBlock.block, 'ahhh')
            return [inp.name, Array.isArray(childBlock.block)
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
            ]]
        }
        return [inp.name, [inp.type, 
            [
                ...(
                    arg
                    ? [
                        ({
                            Literal: typeof (arg as LiteralNode).value == 'number' ? 4 : 10,
                        })[arg.type] ?? 10,
                        // deno-lint-ignore no-explicit-any
                        (arg as LiteralNode | any)?.value?.toString()
                    ]
                    : []
                )
            ]
        ]]
    }

    async function processNode(node: ASTNode, topLevel = false, noLast = false, noNext = false): Promise<BlockCollection> {
        blockID++;
        const thisBlockID = genId(blockID);
        console.log('procesing node', thisBlockID, node, topLevel, noLast, noNext)
        const blk = {
            next: '',
            parent: null,
            inputs: {},
            fields: {},
            shadow: false,
            topLevel: false,
            x: 0,
            y: 0,
        }
        switch (node.type) {
            case 'GreenFlag':
                const gfNode = node as GreenFlagNode;
                const tempBlock = {
                    opcode: 'event_whenflagclicked',
                    id: thisBlockID.toString(),
                    next: '',
                    topLevel
                } as jsonBlock
                lastBlock = tempBlock as blockBlock
                const processedNodes = [];
                for (const node of gfNode.branch) {
                    processedNodes.push(await processNode(node))
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
                        require: () => {},
                        provide: () => {},
                    };
                    globalThis.Blockly = blockly
                    // actually import the blocks
                    await import('./'+includeNode.path);
                    blockDefinitions = {
                        ...jsBlocksToJSON(),
                        ...blockDefinitions
                    }
                } else if (includeNode.itype.startsWith('extension')) {
                    const nop = () => {};
                    let ext: any = null;
                    //@ts-ignore:
                    const Scratch = globalThis.Scratch = {
                        translate: (a:string)=>a,
                        extensions: {
                            unsandboxed: true,
                            register: (e: Class) => {ext = e}
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
                                console.log(block.opcode)
                                return [extid+'_'+block.opcode, Object.entries(block.arguments ?? {}).map(a => {
                                    return {
                                        name: a[0],
                                        type: 1
                                    } as Input
                                })]
                            })
                        )
                    }
                }
                return new PartialBlockCollection([]) as BlockCollection
            
            case 'FunctionCall':
                const fnNode = node as FunctionCallNode;
                if (!blockDefinitions[fnNode.identifier])
                    throw 'Unknown opcode "' + fnNode.identifier + '"';
                const definition = blockDefinitions[fnNode.identifier]
                // console.log('last: ', lastBlock)
                const child: PartialBlockCollection[] = [];
                const inputs = [];
                for (let i = 0; i < Math.min(definition.length, fnNode.args.length); i++) {
                    const inp = definition[i];
                    inputs.push(await arg2input(inp, fnNode.args[i], child))
                }
                const block: jsonBlock = {
                    opcode: fnNode.identifier,
                    ...blk,
                    fields: {},
                    id: thisBlockID.toString(),
                    inputs: Object.fromEntries(inputs),
                    next: '', // no next (yet)
                    topLevel,
                    parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
                    shadow: false,
                    x: 0,
                    y: 0
                }
                // console.debug(block)
                if(!topLevel && !noNext) lastBlock.next = block.id.toString();
                if(!noLast) lastBlock = block;
                return new BlockCollection(block, child) //TODO: figure out how to map function args to children

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
                            await arg2input(beDefinition[0], beNode.left, beChildren),
                            await arg2input(beDefinition[1], beNode.right, beChildren)
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
                if(!topLevel && !noNext) lastBlock.next = ifBlock.id.toString();
                if(!noLast) lastBlock = ifBlock;
                const ifChildren: PartialBlockCollection[] = [];
                const processedThenNodes = [];
                for (let i = 0; i < ifNode.thenBranch.length; i++) {
                    const node = ifNode.thenBranch[i];
                    processedThenNodes.push(await processNode(node, false, false, i == 0))
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
                const condition = await arg2input({
                    name: 'CONDITION',
                    type: 1
                }, ifNode.condition, ifChildren);
                console.debug(condition)
                ifBlock.inputs.CONDITION = condition[1] as json.Input
                if(ifNode.elseBranch) {
                    ifBlock.opcode = 'control_if_else'
                    const processedElseNodes = [];
                    for (let i = 0; i < ifNode.elseBranch.length; i++) {
                        const node = ifNode.elseBranch[i];
                        processedElseNodes.push(await processNode(node, false, false, i == 0))
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
                if(!noLast) lastBlock = ifBlock;
                return new BlockCollection(ifBlock, ifChildren);
            
            case "Boolean":
                const boolNode = node as BooleanNode;
                const boolBlock: jsonBlock = {
                    opcode: boolNode.value ? "operator_not" : "operator_and",
                    ...blk,
                    id: thisBlockID.toString(),
                    topLevel,
                }
                return new BlockCollection(boolBlock, []);
            
            case "BranchFunctionCall":
                const branchNode = node as BranchFunctionCallNode;
                const bDefinition = blockDefinitions[branchNode.identifier]
                console.debug(branchNode, bDefinition)
                const branchChildren: PartialBlockCollection[] = [];
                const binputs = [];
                for (let i = 0; i < Math.min(bDefinition.length, branchNode.args.length); i++) {
                    const inp = bDefinition[i];
                    binputs.push(await arg2input(inp, branchNode.args[i], branchChildren))
                }
                const branchBlock: jsonBlock = {
                    opcode: branchNode.identifier,
                    ...blk,
                    id: thisBlockID.toString(),
                    topLevel,
                    parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
                    shadow: false,
                    inputs: Object.fromEntries([...await Promise.all(bDefinition
                            .filter(a => a)
                            .filter(a => Array.isArray(a) && a[0])
                        .map(
                            async (inp, i) => {
                                console.log(bDefinition, branchNode.identifier)
                                return await arg2input(inp, branchNode.args[i], branchChildren)
                            }
                        )
                    ), ...binputs]),
                };
                if(!topLevel && !noNext) lastBlock.next = branchBlock.id.toString();
                if(!noLast) lastBlock = branchBlock;
                // const firstBranchChildren: (BlockCollection | undefined)[] = [];
                let branchN = 0;
                for (const branch of branchNode.branches) {
                    branchN++;
                    const processedBranchNodes = [];
                    for (let i = 0; i < branch.length; i++) {
                        const node = branch[i];
                        processedBranchNodes.push(await processNode(node, false, false, i == 0))
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
                return new BlockCollection(branchBlock, branchChildren);
            
            case 'VariableDeclaration':
                const varDeclNode = node as VariableDeclarationNode;
                const id: string = genVarId(varDeclNode.identifier);
                sprite.variables.set(varDeclNode.identifier, id);
                const varDeclChildren: PartialBlockCollection[] = [];
                const varDeclBlock: jsonBlock = {
                    opcode: 'data_setvariableto',
                    ...blk,
                    id: thisBlockID.toString(),
                    inputs: {
                        'VALUE': (await arg2input(
                            blockDefinitions.data_setvariableto[1],
                            varDeclNode.value,
                            varDeclChildren
                        ))[1] as json.Input
                    },
                    fields: {
                        "VARIABLE": [
                            varDeclNode.identifier,
                            id
                        ]
                    },
                    parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
                }
                if(!topLevel && !noNext) lastBlock.next = varDeclBlock.id.toString();
                if(!noLast) lastBlock = varDeclBlock;
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
                        'VALUE': (await arg2input(
                            blockDefinitions.data_setvariableto[1],
                            varAssignmentNode.value,
                            varAssignmentChildren
                        ))[1] as json.Input
                    },
                    fields: {
                        "VARIABLE": [
                            varAssignmentNode.identifier,
                            sid
                        ]
                    },
                    parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
                }
                if(!topLevel && !noNext) lastBlock.next = varAssignmentBlock.id.toString();
                if(!noLast) lastBlock = varAssignmentBlock;
                return new BlockCollection(varAssignmentBlock, varAssignmentChildren);
            
            case "Identifier":
                const identifierNode = node as IdentifierNode;
                const vid = sprite.variables.get(identifierNode.name);
                if (!vid) throw 'Unknown variable'
                return new BlockCollection({
                    id: thisBlockID,
                    data: [12, identifierNode.name, vid]
                }, []);
            
            //TODO: do other nodes

            default:
                throw `Unimplemented (${node.type})`
        }
        
    }

    for (const node of ast) {
        const coll = await processNode(node, true);
        const unfurled = coll.unfurl()
        // console.log(coll, unfurled)
        blocks.push(...unfurled)
    }

    return [blocks, sprite]
}