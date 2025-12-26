import { Lexer, Parser } from "./tshv2/main.ts";
import { process_node } from './asttoblocks2.ts'
import { StageScope } from "./oop_block.ts";
import { jsBlocksToJSON } from './blocks.ts'
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
await import(`../tw-blocks/core/constants.js`);
await import(`../tw-blocks/core/colours.js`);
// actually import the blocks
//@ts-ignore: 
globalThis.blocksRoot = '../tw-blocks'; //pm requires a bit more stuff in blockly
await import(`./base.js`);
const bl = jsBlocksToJSON(Blockly.Blocks);

const sourceCode = new TextDecoder().decode(Deno.readFileSync('test.bsl'));
const lexer = new Lexer(sourceCode);
const tokens = lexer.tokenize();
const parser = new Parser(tokens, sourceCode);
const ast = parser.parse();

const stage = new StageScope('stage');
stage.definitions = {
	...bl,
	...stage.definitions
};

// console.log(stage.definitions)

for (const node of ast) {
	process_node({node, sprite: stage})
}

console.log(stage.get_blocks_json())
