import { blockBlock, InputType } from "./jsontypes.ts";
import { Input, InputDataType } from './jsontypes.ts'
import base_definitions, { jsBlocksToJSON } from './blocks.ts'

abstract class SpritePropertyWithId {
	id: string
	name: string
	constructor (id: string, name: string) {
		this.id = id;
		this.name = name;
	}
}
abstract class SpritePropertyWithIdAndIntialValue extends SpritePropertyWithId {
	abstract intial_value: any;
	constructor (id: string, name: string) {
		super(id, name)
	}
}

class Variable extends SpritePropertyWithIdAndIntialValue {
	intial_value: string | number
	constructor (id: string, name: string, intial_value: string | number="") {
		super(id, name)
		this.intial_value = intial_value
	}
}

class List extends SpritePropertyWithIdAndIntialValue {
	intial_value: (string | number)[]
	constructor (id: string, name: string, intial_value: (string | number)[]=[]) {
		super(id, name)
		this.intial_value = intial_value
	}
}

class Broadcast extends SpritePropertyWithId {
	constructor (id: string, name: string) {
		super(id, name)
	}
}

class Scope {
	variables: Map<string, Variable> = new Map()
	list: Map<string, List> = new Map()
	block_dict: Map<string, Block> = new Map()
	get_blocks_json(): Record<string, blockBlock> {
		const blocks: Record<string, blockBlock> = {}
		for (const [id, block] of this.block_dict.entries()) {
			blocks[id] = block.get_JSON()
		}
		return blocks;
	}
}

class StageScope extends Scope {
	broadcasts: Map<string, Broadcast> = new Map()
	stage: StageScope = this;
	// it is here because why not
	definitions = Object.assign({}, base_definitions)
}

class SpriteScope extends Scope {
	stage: StageScope
	constructor(stage: StageScope) {
		super();
		this.stage = stage;
	}
}

export enum BlockInputDataType {
	math_number = 4,
	math_positive_number = 5,
	math_whole_number = 6,
	math_integer = 7,
	math_angle = 8,
	colour_picker = 9,
	text = 10,
	event_broadcast_menu = 11,
	data_variable = 12,
	data_listcontents = 13,

	block = Infinity,
}

class ScratchBlockInput {
	shadow: boolean = false
	value: Broadcast | Block | List | Variable | string | number = 0
	type: BlockInputDataType | InputDataType = InputDataType.math_number
	get_JSON(): Input {
		if (this.type < InputDataType.colour_picker
			|| this.type == InputDataType.text) {
			if (
				typeof this.value !== 'number' &&
				typeof this.value !== 'string'
			)
				throw `Invalid type of ScratchBlockInput.value for type of ${this.type}`
		} else if (this.type == InputDataType.colour_picker) {
			if (
				typeof this.value !== 'string'
			)
				throw `Invalid type of ScratchBlockInput.value for type of ${this.type}`
		} else if (this.type == InputDataType.event_broadcast_menu) {
			if (!(this.value instanceof Broadcast))
				throw `Invalid type of ScratchBlockInput.value for type of ${this.type}`
		} else if (this.type == InputDataType.data_variable) {
			if (!(this.value instanceof Variable))
				throw `Invalid type of ScratchBlockInput.value for type of ${this.type}`
		} else if (this.type == InputDataType.data_listcontents) {
			if (!(this.value instanceof List))
				throw `Invalid type of ScratchBlockInput.value for type of ${this.type}`
		} else if (this.type == BlockInputDataType.block) {
			if (!(this.value instanceof Block))
				throw `Invalid type of ScratchBlockInput.value for type of ${this.type}`
		}
		if (this.type < InputDataType.event_broadcast_menu)
			return [
				InputType.locked,
				[
					this.type,
					this.value
				]
			] as Input
		if (this.type == BlockInputDataType.block)
			return [
				InputType.locked,
				(this.value as Block).id
			] as Input
		this.value = this.value as Variable | List | Broadcast
		if (this.type >= InputDataType.event_broadcast_menu)
			return [
				InputType.locked,
				[
					this.type,
					this.value.name,
					this.value.id,
				]
			] as Input
		throw 'unknown input type'
	}
}

class ScratchBlock {
	opcode: string = 'undefined'
	scope: SpriteScope | StageScope
	get definition() {
		if (this.scope.stage.definitions[this.opcode] === undefined)
			throw `definition not found for ${this.opcode}, have you included base.js?`
		return this.scope.stage.definitions[this.opcode]
	}
	load_inputs() {
		const definition = this.definition;
		const inputs = definition[0];
		const branch = definition[1] == 'branch'
		for (const input of inputs) {
			const sb_input = new ScratchBlockInput()
			if (branch && definition[2]!.includes(input.name))
				sb_input.type = BlockInputDataType.block
			this.inputs.set(input.name, sb_input)
		}
	}
	inputs: Map<string, ScratchBlockInput> = new Map()
	constructor(scope: SpriteScope | StageScope) {
		this.scope = scope;
	}
}

class Block {
	static _id = 0
	scope: SpriteScope | StageScope
	parent: Block | undefined;
	next: Block | undefined;
	id: string;
	scratch_block: ScratchBlock;
	get opcode(): string {
		if (this.scratch_block.opcode === 'undefined')
			throw 'opcode uninitialized';
		return this.scratch_block.opcode;
	}
	set opcode(opcode: string) {
		this.scratch_block.opcode = opcode;
		this.scratch_block.definition;
	}
	topLevel: boolean = false;
	constructor(scope: SpriteScope | StageScope, parent?: Block) {
		//FIXME - non-numerical IDs
		this.id = (Block._id++).toString()
		this.scope = scope;
		this.scratch_block = new ScratchBlock(scope);
		if (!parent)
			this.topLevel = true;
		else {
			this.parent = parent;
			parent.next = this;
		}
		scope.block_dict.set(this.id, this)
	}
	get_JSON(): blockBlock {
		return {
			opcode: this.opcode,
			next: this.next ? this.next.id : null,
			parent: this.parent ? this.parent.id : null,
			fields: {}, //TODO - fields
			inputs: Object.fromEntries(
				[...this.scratch_block.inputs.entries()]
					.map(([id, input]) => [id, input.get_JSON()])
			),
			shadow: false,
			topLevel: this.topLevel,
		}
	}
}

class BlockBuilder {
	block: Block;
	parent?: BlockBuilder;
	constructor(scope: SpriteScope | StageScope, parent?: BlockBuilder) {
		this.parent = parent;
		this.block = new Block(scope, parent?.block);
	}
	set_opcode(opcode: string) {
		this.block.opcode = opcode
		this.block.scratch_block.load_inputs()
		return this;
	}
	next() {
		return new BlockBuilder(this.block.scope, this);
	}
	up() {
		return this.parent
	}
	get_input(id: string): InputWrapper {
		if (!this.block.scratch_block.inputs.has(id))
			throw 'unknown input';
		return new InputWrapper(
			this.block.scratch_block.inputs.get(id)!,
			this
		)
	}
}

class InputWrapper {
	input: ScratchBlockInput
	block: BlockBuilder
	constructor(input: ScratchBlockInput, block: BlockBuilder) {
		this.input = input;
		this.block = block;
	}
	up(): BlockBuilder {
		return this.block
	}
	set_value(value: Broadcast | Block | List | Variable | string | number): InputWrapper {
		this.input.value = value;
		return this;
	}
}

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
//@ts-ignore:
Blockly.Colours = {
  // SVG colours: these must be specificed in #RRGGBB style
  // To add an opacity, this must be specified as a separate property (for SVG fill-opacity)
  "motion": {
    "primary": "#4C97FF",
    "secondary": "#4280D7",
    "tertiary": "#3373CC",
    "quaternary": "#3373CC"
  },
  "looks": {
    "primary": "#9966FF",
    "secondary": "#855CD6",
    "tertiary": "#774DCB",
    "quaternary": "#774DCB"
  },
  "sounds": {
    "primary": "#CF63CF",
    "secondary": "#C94FC9",
    "tertiary": "#BD42BD",
    "quaternary": "#BD42BD"
  },
  "control": {
    "primary": "#FFAB19",
    "secondary": "#EC9C13",
    "tertiary": "#CF8B17",
    "quaternary": "#CF8B17"
  },
  "event": {
    "primary": "#FFBF00",
    "secondary": "#E6AC00",
    "tertiary": "#CC9900",
    "quaternary": "#CC9900"
  },
  "sensing": {
    "primary": "#5CB1D6",
    "secondary": "#47A8D1",
    "tertiary": "#2E8EB8",
    "quaternary": "#2E8EB8"
  },
  "pen": {
    "primary": "#0fBD8C",
    "secondary": "#0DA57A",
    "tertiary": "#0B8E69",
    "quaternary": "#0B8E69"
  },
  "operators": {
    "primary": "#59C059",
    "secondary": "#46B946",
    "tertiary": "#389438",
    "quaternary": "#389438"
  },
  "data": {
    "primary": "#FF8C1A",
    "secondary": "#FF8000",
    "tertiary": "#DB6E00",
    "quaternary": "#DB6E00"
  },
  // This is not a new category, but rather for differentiation
  // between lists and scalar variables.
  "data_lists": {
    "primary": "#FF661A",
    "secondary": "#FF5500",
    "tertiary": "#E64D00",
    "quaternary": "#E64D00"
  },
  "more": {
    "primary": "#FF6680",
    "secondary": "#FF4D6A",
    "tertiary": "#FF3355",
    "quaternary": "#FF3355"
  },
  "text": "#FFFFFF",
  "workspace": "#F9F9F9",
  "toolboxHover": "#4C97FF",
  "toolboxSelected": "#e9eef2",
  "toolboxText": "#575E75",
  "blackText": "#575E75",
  "toolbox": "#FFFFFF",
  "flyout": "#F9F9F9",
  "scrollbar": "#CECDCE",
  "scrollbarHover": '#CECDCE',
  "textField": "#FFFFFF",
  "textFieldText": "#575E75",
  "insertionMarker": "#000000",
  "insertionMarkerOpacity": 0.2,
  "dragShadowOpacity": 0.3,
  "stackGlow": "#FFF200",
  "stackGlowSize": 4,
  "stackGlowOpacity": 1,
  "replacementGlow": "#FFFFFF",
  "replacementGlowSize": 2,
  "replacementGlowOpacity": 1,
  "colourPickerStroke": "#FFFFFF",
  // CSS colours: support RGBA
  "fieldShadow": "rgba(0,0,0,0.1)",
  "dropDownShadow": "rgba(0, 0, 0, .3)",
  "numPadBackground": "#547AB2",
  "numPadBorder": "#435F91",
  "numPadActiveBackground": "#435F91",
  "numPadText": "white", // Do not use hex here, it cannot be inlined with data-uri SVG
  "valueReportBackground": "#FFFFFF",
  "valueReportBorder": "#AAAAAA",
  "valueReportForeground": "#000000",
  "menuHover": "rgba(0, 0, 0, 0.2)",
  "contextMenuBackground": "#ffffff",
  "contextMenuBorder": "#cccccc",
  "contextMenuForeground": "#000000",
  "contextMenuActiveBackground": "#d6e9f8",
  "contextMenuDisabledForeground": "#cccccc",
  "flyoutLabelColor": "#575E75",
  "checkboxInactiveBackground": "#ffffff",
  "checkboxInactiveBorder": "#c8c8c8",
  "checkboxActiveBackground": "#4C97FF",
  "checkboxActiveBorder": "#3373CC",
  "checkboxCheck": "#ffffff",
  "buttonActiveBackground": "#ffffff",
  "buttonForeground": "#575E75",
  "buttonBorder": "#c6c6c6",
  "zoomIconFilter": "none"
};
// actually import the blocks
//@ts-ignore: 
globalThis.blocksRoot = '../tw-blocks'; //pm requires a bit more stuff in blockly
await import(`./base.js`);
const bl = jsBlocksToJSON(Blockly.Blocks);

const stage = new StageScope();
const sprite = new SpriteScope(stage);

stage.definitions = {
	...bl,
	...stage.definitions
}


new BlockBuilder(sprite)
	.set_opcode('event_whenflagclicked')
	.next()
		.set_opcode('looks_say')
		.next()
			.set_opcode('looks_hide')
			.up()!
		.get_input('MESSAGE')
			.set_value('meow')
			.up()!
		.up()!;

console.log(sprite.get_blocks_json())
