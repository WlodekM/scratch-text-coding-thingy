// deno-lint-ignore-file no-case-declarations
import type { AssignmentNode, ASTNode, BooleanNode, BranchFunctionCallNode, FunctionCallNode, GreenFlagNode, IdentifierNode, IfNode, LiteralNode, VariableDeclarationNode } from "./tshv2/main.ts";
import * as json from './jsontypes.ts';
import blockDefinitions from "./blocks.ts";

interface Input {
    name: string,
    type: number
}

export type blockBlock = ({ id: string } & json.Block)
export type jsonBlock = ({ id: string } & json.Block) | [12, string, string]

type Variable = ["a", string | number] //TODO - figure out the first item

let varId = 0;

function genVarId(name: string): string {
    varId++
    return genId(varId) + '-' + name
}

export class Environment {
    variables: Map<string, string> = new Map()
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

export default function ASTtoBlocks(ast: ASTNode[]): [jsonBlock[], Environment] {
    const blocks: jsonBlock[] = [];
    const sprite = new Environment();

    // console.debug('debug: ast\n', JSON.stringify(ast, null, 2))

    let blockID: number = 0;
    let lastBlock: blockBlock = {} as blockBlock;

    function arg2input(inp: Input, arg: ASTNode, child: PartialBlockCollection[]) {
        console.debug(arg, inp)
        if(['FunctionCall', 'Boolean', 'Identifier'].includes(arg.type)) {
            const childBlock = processNode(arg, false, true);
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
                        (arg as LiteralNode | any)?.value?.toString()
                    ]
                    : []
                )
            ]
        ]]
    }

    function processNode(node: ASTNode, topLevel = false, noLast = false, noNext = false): BlockCollection {
        blockID++;
        const thisBlockID = genId(blockID);
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
                const children = new PartialBlockCollection(
                    gfNode.branch.map(node => processNode(node))
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
            
            case 'FunctionCall':
                const fnNode = node as FunctionCallNode;
                if (!blockDefinitions[fnNode.identifier])
                    throw 'Unknown opcode "' + fnNode.identifier + '"';
                const definition = blockDefinitions[fnNode.identifier]
                console.log('last: ', lastBlock)
                console.log(topLevel || !lastBlock ? undefined : lastBlock.id.toString())
                console.log(lastBlock.id);
                const child: PartialBlockCollection[] = [];
                const block: jsonBlock = {
                    opcode: fnNode.identifier,
                    ...blk,
                    fields: {},
                    id: thisBlockID.toString(),
                    inputs: Object.fromEntries(definition.map(
                        (inp, i) => {
                            return arg2input(inp, fnNode.args[i], child)
                        }
                    )),
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
                //TODO: do shit like +, -, *, /, % etc.
                throw 'Unimplemented (BinaryExpression)'
            
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
                const thenBlocks = new PartialBlockCollection(
                    ifNode.thenBranch.map((node, i) => processNode(node, false, false, i == 0))
                )
                const firstThenChild: BlockCollection<blockBlock> | undefined =
                    thenBlocks.children[0] as BlockCollection<blockBlock> | undefined
                ifChildren.push(thenBlocks)
                ifBlock.inputs.SUBSTACK = [
                    2,
                    firstThenChild?.block?.id
                ]
                const condition = arg2input({
                    name: 'CONDITION',
                    type: 1
                }, ifNode.condition, ifChildren);
                console.debug(condition)
                ifBlock.inputs.CONDITION = condition[1] as json.Input
                if(ifNode.elseBranch) {
                    ifBlock.opcode = 'control_if_else'
                    const elseBlocks = new PartialBlockCollection(
                        ifNode.thenBranch.map((node, i) => processNode(node, false, false, i == 0))
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
                const branchBlock: jsonBlock = {
                    opcode: branchNode.identifier,
                    ...blk,
                    id: thisBlockID.toString(),
                    topLevel,
                    parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
                    shadow: false,
                    inputs: Object.fromEntries(bDefinition
                            .filter(a => a)
                            .filter(a => Array.isArray(a) && a[0])
                        .map(
                            (inp, i) => {
                                console.log(bDefinition, branchNode.identifier)
                                return arg2input(inp, branchNode.args[i], branchChildren)
                            }
                        )
                    ),
                };
                if(!topLevel && !noNext) lastBlock.next = branchBlock.id.toString();
                if(!noLast) lastBlock = branchBlock;
                // const firstBranchChildren: (BlockCollection | undefined)[] = [];
                let branchN = 0;
                for (const branch of branchNode.branches) {
                    branchN++;
                    const branchBlocks = new PartialBlockCollection(
                        branch.map((node, i) => processNode(node, false, false, i == 0))
                    );
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
                        'VALUE': arg2input(
                            blockDefinitions.data_setvariableto[1],
                            varDeclNode.value,
                            varDeclChildren
                        )[1] as json.Input
                    },
                    fields: {
                        "VARIABLE": [
                            varDeclNode.identifier,
                            id
                        ]
                    }
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
                        'VALUE': arg2input(
                            blockDefinitions.data_setvariableto[1],
                            varAssignmentNode.value,
                            varAssignmentChildren
                        )[1] as json.Input
                    },
                    fields: {
                        "VARIABLE": [
                            varAssignmentNode.identifier,
                            sid
                        ]
                    }
                }
                if(!topLevel && !noNext) lastBlock.next = varAssignmentBlock.id.toString();
                if(!noLast) lastBlock = varAssignmentBlock;
                return new BlockCollection(varAssignmentBlock, varAssignmentChildren);
            
            case "Identifier":
                const identifierNode = node as IdentifierNode;
                const vid = sprite.variables.get(identifierNode.name);
                //@ts-ignore: uh
                return new BlockCollection([12, identifierNode.name, vid], []);
            
            //TODO: do other nodes

            default:
                throw `Unimplemented (${node.type})`
        }
        
    }

    for (const node of ast) {
        const coll = processNode(node, true);
        const unfurled = coll.unfurl()
        console.log(coll, unfurled)
        blocks.push(...unfurled)
    }

    return [blocks, sprite]
}