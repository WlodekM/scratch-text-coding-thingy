// deno-lint-ignore-file no-case-declarations
import type { ASTNode, GreenFlagNode } from "./tshv2/main.ts";
import * as json from './jsontypes.ts';

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

export default function ASTtoBlocks(ast: ASTNode[]): json.Block[] {
    const blocks: json.Block[] = [];
    const variables: string[] = [];

    let blockID: number = 0;

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
                    next: firstChild?.block?.id
                } as jsonBlock
                return new BlockCollection(gfBlock, [children])
            
            case 'FunctionCall':
                // TODO: finish this
        }
        
    }

    for (const node of ast) {
    }

    return blocks
}