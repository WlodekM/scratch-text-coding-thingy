import {
	Block,
	type Broadcast,
	type List,
	type ScratchBlockInput,
	type SpriteScope,
	type StageScope,
	type Variable
} from "./oop_block.ts";


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
	get_input_by_index(index: number): InputWrapper {
		const inputs = this.block.scratch_block.definition[0];
		if (!inputs[index])
			throw 'input index out of bounds';
		return this.get_input(inputs[index].name)
	}
	get_input(id: string): InputWrapper {
		if (!this.block.scratch_block.inputs.has(id))
			throw 'unknown input';
		return new InputWrapper(
			this.block.scratch_block.inputs.get(id)!,
			this
		)
	}
	set_field(id: string, value: Broadcast | List | Variable) {
		if (!this.block.scratch_block.fields.has(id))
			throw 'unknown field';
		this.block.scratch_block.fields.get(id)!.value = value;
		return this
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
