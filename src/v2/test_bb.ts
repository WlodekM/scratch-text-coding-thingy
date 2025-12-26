import { Block, SpriteScope, Stack, StageScope } from "./oop_block.ts";
import { BlockBuilder } from "./block_builder.ts";
import { jsBlocksToJSON } from '../blocks.ts'
//@ts-ignore: goog...
globalThis.goog = {
    //@ts-ignore:
	require: () => { },
	provide: () => { },
};
//@ts-ignore: blockly...
const Blockly = globalThis.Blockly = {
    //@ts-ignore:
    Blocks: {},
    Constants: {
        //@ts-ignore:
        Data: {}
    },
    //@ts-ignore:
    Extensions: {
        registerMixin: () => {}
    },
    ScratchBlocks: {
        //@ts-ignore:
        ProcedureUtils: {
            //@ts-ignore:
            parseReturnMutation: () => {}
        }
    },
    //@ts-ignore:
    Msg: {},
    mainWorkspace: {
        options: {
            pathToMedia: ''
        },
        enableProcedureReturns() {}
    },
    //@ts-ignore:
    Categories: {},
    FieldDropdown: class FieldDropdown {}
};
await import(`../../tw-blocks/core/constants.js`);
await import(`../../tw-blocks/core/colours.js`);
// actually import the blocks
//@ts-ignore: 
globalThis.blocksRoot = '../tw-blocks'; //pm requires a bit more stuff in blockly
await import(`../base.js`);
const bl = jsBlocksToJSON(Blockly.Blocks);

const stage = new StageScope('stage');
const sprite = new SpriteScope('sprite', stage);

stage.definitions = {
	...bl,
	...stage.definitions
}


// new BlockBuilder(sprite)
// 	.set_opcode('event_whenflagclicked')
// 	.next()
// 		.set_opcode('looks_say')
// 		.next()
// 			.set_opcode('looks_hide')
// 			.up()!
// 		.get_input('MESSAGE')
// 			.set_value('meow')
// 			.up()!
// 		.up()!;

const stack = new Stack(sprite)
stack.addb(
    new BlockBuilder(stack.scope)
        .set_opcode('looks_say')
        .get_input('MESSAGE')
            .set_value('meow')
            .up()!,
    new BlockBuilder(stack.scope)
        .set_opcode('looks_hide')
)
const meow = sprite.define('var', 'meow')
const b = new BlockBuilder(stack.scope)
    .set_opcode('data_setvariableto')
    .set_field('VARIABLE', meow)
    .get_input('VALUE').set_value('estrogen').up()!
stack.addb(b)
console.log(sprite.get_blocks_json())