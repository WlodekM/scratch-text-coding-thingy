// deno-lint-ignore-file no-case-declarations
import type { ASTNode, FunctionCallNode, GreenFlagNode, LiteralNode } from "./tshv2/main.ts";
import * as json from './jsontypes.ts';
import blockDefinitions from "./blocks.ts";

export type jsonBlock = { id: string } & json.Block

type Variable = ["a", string | number] //TODO - figure out the first item

export class Environment {
    variables: Map<string, Variable> = new Map()
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

class BlockCollection extends PartialBlockCollection {
    block: jsonBlock;
    constructor (
        block: jsonBlock,
        children: PartialBlockCollection[]
    ) {
        super(children);
        this.block = block
    }
    override unfurl(): jsonBlock[] {
        const blocks = [this.block]
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

    console.debug('debug: ast\n', JSON.stringify(ast, null, 2))

    let blockID: number = 0;
    let lastBlock: jsonBlock = {} as jsonBlock;

    function processNode(node: ASTNode, topLevel = false, noLast = false): BlockCollection {
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
                lastBlock = tempBlock
                const children = new PartialBlockCollection(
                    gfNode.branch.map(node => processNode(node))
                )
                const firstChild: BlockCollection | undefined =
                    children.children[0] as BlockCollection | undefined
                const gfBlock = {
                    opcode: 'event_whenflagclicked',
                    ...blk,
                    id: thisBlockID.toString(),
                    next: firstChild?.block?.id,
                    topLevel
                } as jsonBlock
                if (firstChild) firstChild.block.parent = thisBlockID.toString();
                lastBlock = gfBlock
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
                            if(fnNode.args[i].type == 'FunctionCall') {
                                const childBlock = processNode(fnNode.args[i], false, true);
                                child.push(childBlock);
                                return [inp.name, [inp.type,
                                    childBlock.block.id.toString(),
                                    [
                                        ...(
                                            fnNode.args[i]
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
                                        fnNode.args[i]
                                        ? [
                                            ({
                                                Literal: typeof (fnNode.args[i] as LiteralNode).value == 'number' ? 4 : 10,
                                            })[fnNode.args[i].type] ?? 10,
                                            (fnNode.args[i] as LiteralNode | any)?.value?.toString()
                                        ]
                                        : []
                                    )
                                ]
                            ]]
                        }
                    )),
                    next: '', // no next (yet)
                    topLevel,
                    parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
                    shadow: false,
                    x: 0,
                    y: 0
                }
                console.debug(block)
                if(!topLevel) lastBlock.next = block.id.toString();
                if(!noLast) lastBlock = block;
                return new BlockCollection(block, child) //TODO: figure out how to map function args to children

            case 'BinaryExpression':
                //TODO: do shit like +, -, *, /, % etc.
                throw 'Unimplemented (BinaryExpression)'
            
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