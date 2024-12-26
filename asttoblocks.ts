// deno-lint-ignore-file no-case-declarations
import type { ASTNode, FunctionCallNode, GreenFlagNode } from "./tshv2/main.ts";
import * as json from './jsontypes.ts';
import blockDefinitions from "./blocks.ts";

type jsonBlock = { id: string } & json.Block

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

const cast = new Cast() // because yes

export default function ASTtoBlocks(ast: ASTNode[]): json.Block[] {
    const blocks: json.Block[] = [];
    const variables: string[] = [];

    let blockID: number = 0;
    let lastBlock: jsonBlock = {} as jsonBlock;

    function processNode(node: ASTNode, topLevel = false): BlockCollection {
        const thisBlockID = blockID++;
        switch (node.type) {
            case 'GreenFlag':
                const gfNode = node as GreenFlagNode
                const children = new PartialBlockCollection(
                    gfNode.branch.map(node => processNode(node))
                )
                const firstChild: BlockCollection | undefined =
                    children.children[0] as BlockCollection | undefined
                const gfBlock = {
                    opcode: 'event_whenflagclicked',
                    id: thisBlockID.toString(),
                    next: firstChild?.block?.id,
                    topLevel
                } as jsonBlock
                if (firstChild) firstChild.block.parent = thisBlockID;
                lastBlock = gfBlock
                return new BlockCollection(gfBlock, [children])
            
            case 'FunctionCall':
                const fnNode = node as FunctionCallNode;
                if (!blockDefinitions[fnNode.identifier])
                    throw 'Unknown opcode "' + fnNode.identifier + '"';
                const definition = blockDefinitions[fnNode.identifier]
                const block: jsonBlock = {
                    opcode: fnNode.identifier,
                    fields: [],
                    id: ''+(blockID++),
                    inputs: Object.fromEntries(definition.map(
                        (inp, i) => [inp.name, [inp.type, 
                            ...(
                                fnNode.args[i]
                                ? [fnNode.args[i]]
                                : []
                            )
                        ]]
                    )),
                    next: 
                }
                if(!topLevel) lastBlock.next = block.id;
                lastBlock = block;
                break;

            case 'BinaryExpression':
        }
        
    }

    for (const node of ast) {
    }

    return blocks
}