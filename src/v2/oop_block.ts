import { blockBlock, InputType } from "../jsontypes.ts";
import { Input, InputDataType } from '../jsontypes.ts'
import base_definitions, { Definition, FieldInputB } from '../blocks.ts'
import { type BlockBuilder } from "./block_builder.ts";

const soup = '!#$%()*+,-./:;=?@[]^_`{|}~' +
	'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
// gen weed
function genUid() {
	const length = 20;
	const soupLength = soup.length;
	const id: string[] = [];
	for (let i = 0; i < length; i++) {
		id[i] = soup.charAt(Math.random() * soupLength);
	}
	return id.join('');
};

export abstract class SpritePropertyWithId {
	id: string
	name: string
	constructor (id: string, name: string) {
		this.id = id+'-'+name;
		this.name = name;
	}
}
export abstract class SpritePropertyWithIdAndIntialValue extends SpritePropertyWithId {
	abstract intial_value: any;
	constructor (id: string, name: string) {
		super(id, name)
	}
}

export class Variable extends SpritePropertyWithIdAndIntialValue {
	intial_value: string | number
	constructor (id: string, name: string, intial_value: string | number="") {
		super(id, name)
		this.intial_value = intial_value
	}
}

export class List extends SpritePropertyWithIdAndIntialValue {
	intial_value: (string | number)[]
	constructor (id: string, name: string, intial_value: (string | number)[]=[]) {
		super(id, name)
		this.intial_value = intial_value
	}
}

export class Broadcast extends SpritePropertyWithId {
	constructor (id: string, name: string) {
		super(id, name)
	}
}

export class Project {
	sprites: Map<string, StageScope | SpriteScope> = new Map()
	definitions: Record<string, Definition> = Object.assign({}, base_definitions)
}

export enum ResolveKind {
	Variable,
	List,
	Var_or_list,
	Broadcast,
	Function
}

type definition_type = 'var' | 'list' | 'broadcast' | 'function'
export class Scope {
	project: Project
	define(type: 'broadcast', name: string): Broadcast
	define(type: 'list', name: string): List
	define(type: 'var', name: string): Variable
	define(type: definition_type, name: string): Variable | List | Broadcast {
		if (type == 'function') throw 'TODO'
		if (type == 'var') {
			const variable = new Variable(genUid(), name);
			this.variables.set(name, variable);
			return variable;
		}
		else if (type == 'list') {
			const list = new List(genUid(), name);
			this.lists.set(name, list);
			return list;
		}
		const broadcast = new Broadcast(genUid(), name);
		this.stage.broadcasts.set(name, broadcast);
		return broadcast;
	}
	resolve(kind: ResolveKind): Variable | List | Broadcast {
		if (kind == ResolveKind.Variable || ResolveKind.Var_or_list)
			throw 'todo'
			//TODO:
			throw 'todo'
	}
	stage: StageScope = undefined as unknown as StageScope;
	variables: Map<string, Variable> = new Map()
	lists: Map<string, List> = new Map()
	block_dict: Map<string, Block> = new Map()
	block_json: any
	get_blocks_json(): Record<string, blockBlock> {
		if (this.block_json) return this.block_json;
		const blocks: Record<string, blockBlock> = {}
		for (const [id, block] of this.block_dict.entries()) {
			blocks[id] = block.get_JSON()
		}
		return blocks;
	}
	add_stack(stack: Stack) {
		for (const block of stack.blocks) {
			this.block_dict.set(block.id, block)
		}
	}
	constructor(project: Project) {
		this.project = project
	}
}

export class StageScope extends Scope {
	broadcasts: Map<string, Broadcast> = new Map()
	
	constructor(id: string, project?: Project) {
		if (!project)
			project = new Project()
		super(project)
		this.stage = this;
		this.project.sprites.set(id, this);
		this.definitions = project.definitions;
	}
	definitions: Record<string, Definition>;
}

export class SpriteScope extends Scope {
	constructor(id: string, stage: StageScope) {
		super(stage.project);
		this.stage = stage;
		this.project.sprites.set(id, this)
	}
}

export type SpriteOrStageScope = StageScope | SpriteScope

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

export class ScratchBlockField {
	value: Broadcast | Variable | List | null = null;
	get_JSON(): [string, string] | [] {
		if (!this.value)
			return []
		return [this.value.name, this.value.id]
	}
}

export type ScratchBlockValue = Broadcast | Block | List | Variable | string | number;

export class ScratchBlockInput {
	shadow: boolean = false
	value: ScratchBlockValue = 0
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

export class ScratchBlock {
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
			if ((input as FieldInputB)?.field) {
				this.fields.set(input.name, new ScratchBlockField())
				continue;
			}
			const sb_input = new ScratchBlockInput()
			if (branch && definition[2]!.includes(input.name))
				sb_input.type = BlockInputDataType.block
			this.inputs.set(input.name, sb_input)
		}
	}
	inputs: Map<string, ScratchBlockInput> = new Map()
	fields: Map<string, ScratchBlockField> = new Map()
	constructor(scope: SpriteScope | StageScope) {
		this.scope = scope;
	}
}

export class Block {
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
			fields: Object.fromEntries(
				this.scratch_block.fields
				.entries()
				.map(([id, field]) => [id, field.get_JSON()])),
			inputs: Object.fromEntries(
				[...this.scratch_block.inputs.entries()]
					.map(([id, input]) => [id, input.get_JSON()])
			),
			shadow: false,
			topLevel: this.topLevel,
		}
	}
}

export class Stack {
	blocks: Block[] = [];
	scope: StageScope | SpriteScope;
	constructor(scope: StageScope | SpriteScope) {
		this.scope = scope;
	}
	add(block: Block) {
		block.scope = this.scope;
		block.parent = this.blocks.at(-1)
		if (this.blocks.length != 0)
			this.blocks.at(-1)!.next = block
		block.topLevel = this.blocks.length == 0
		this.blocks.push(block)
		return block
	}
	addb(...block_builder_list: BlockBuilder[]) {
		for (const block_builder of block_builder_list) {
			this.add(block_builder.block)
		}
	}
}
