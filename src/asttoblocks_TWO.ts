import { InputType } from "./jsontypes.ts";
import { Input, InputDataType } from './jsontypes.ts'
import base_definitions from './blocks.ts'

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
			throw `definition not found for ${this.opcode}, have you included blocks.js?`
		return this.scope.stage.definitions[this.opcode]
	}
	loadInputs() {
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
	constructor(scope: SpriteScope | StageScope, parent: Block | undefined) {
		this.id = (Block._id++).toString()
		this.scope = scope;
		this.scratch_block = new ScratchBlock(scope);
		if (!parent)
			this.topLevel = true;
		else {
			this.parent = parent;
			parent.next = this;
		}
	}
}
