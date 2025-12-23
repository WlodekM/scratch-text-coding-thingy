import {
	Block,
	type Broadcast,
	type List,
	type ScratchBlockInput,
	type SpriteScope,
	type StageScope,
	type Variable
} from "./asttoblocks_TWO.ts";


export class BlockBuilder {
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

export class InputWrapper {
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
