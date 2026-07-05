// import { Project } from "./jsontypes.ts";
// import { Variable } from "../jsontypes.ts";
import { Input, jsBlocksToJSON } from "../blocks.ts";
import { ScratchBlockInput, Block, genUid, List, ResolveKind, ScratchBlockValue, Stack, Variable, type SpriteOrStageScope, } from './oop_block.ts'
import { AssignmentNode, ASTNode, BranchFunctionCallNode, FunctionCallNode, FunctionDeclarationNode, GreenFlagNode, IdentifierNode, IncludeNode, LiteralNode, VariableDeclarationNode } from "../tshv2/main.ts";
import transformAST from "./preprocess2.ts";
import { BlockBuilder } from "./block_builder.ts";
import { BinaryExpressionNode } from "../tshv2/main.ts";
import fs from 'node:fs';
import path from "node:path";
import { Buffer } from "node:buffer";
import { InputDataType } from "../jsontypes.ts";

const THROW_IF_NULL = true

//@ts-expect-error:
const is_browser = typeof globalThis.vm !== 'undefined';
let blockly: typeof Blockly;
if (is_browser)
	//@ts-ignore:
	blockly = globalThis.ScratchBlocks ?? globalThis.Blockly
else {
	blockly = (await import('./fake_blockly.ts')).blockly
}

export function process_node(
	{ node, stack, sprite, parent }: { node: ASTNode, stack?: Stack, sprite: SpriteOrStageScope, parent?: Block },
): Promise<ScratchBlockValue | null>
export function process_node(
	{ node, stack, sprite, parent }: { node: ASTNode, stack?: Stack, sprite: SpriteOrStageScope, parent?: Block },
	throw_if_null: false,
): Promise<ScratchBlockValue | null>
export function process_node(
	{ node, stack, sprite, parent }: { node: ASTNode, stack?: Stack, sprite: SpriteOrStageScope, parent?: Block },
	throw_if_null: true,
): Promise<ScratchBlockValue>
export async function process_node(
	{ node: original_node, stack, sprite, parent }:
		{ node: ASTNode, stack?: Stack, sprite: SpriteOrStageScope, parent?: Block },
	throw_if_null = false,
): Promise<ScratchBlockValue | null> {
	const node = await transformAST(original_node, sprite)
	if (!node) return null;
	const handlers: Record<string, (() => ScratchBlockValue | null) | (() => Promise<ScratchBlockValue | null>)> = ({
		async GreenFlag() {
			if (stack || parent)
				throw 'cannot be in stack or have a parent'
			const _node = node as GreenFlagNode;
			const gf_stack = new Stack(sprite);
			const gf_block = new Block(sprite);
			gf_block.opcode = 'event_whenflagclicked';
			gf_stack.add(gf_block)
			for (const node of _node.branch) {
				await process_node({ node, stack: gf_stack, sprite });
			}
			sprite.add_stack(gf_stack)
			return gf_block;
		},
		async FunctionCall() {
			// console.log(node,stack)
			// if (!stack) throw new Error('have to be inside stack');
			const _node = node as FunctionCallNode;
			const block = new Block(sprite);
			block.opcode = _node.identifier;
			const definition = block.scratch_block.definition;
			const [inputs] = definition;
			block.scratch_block.load_inputs()
			for (let i = 0; i < Math.min(_node.args.length, inputs.length); i++) {
				const arg = _node.args[i];
				const input = inputs[i];
				const value = await process_node({
					node: arg,
					sprite,
					parent: block
				});
				if (value === null) throw 'cant use a null node in arguments'
				console.log(value, input.name, block.scratch_block.inputs)
				if (block.scratch_block.fields.has(input.name)) {
					if (typeof value !== 'string' && !(value instanceof Variable) && !(value instanceof List))
						throw 'expected string or list or var in field'
					block.scratch_block.fields.get(input.name)!.value = value
				} else
					block
						.scratch_block
						.inputs
						.get(input.name)!
						.value = value;
			}
			if (stack)
				stack.add(block);
			else
				block.set_parent(parent);
			return block
		},
		Literal() {
			const _node = node as LiteralNode;
			return _node.value
		},
		async VariableDeclaration() {
			const _node = node as VariableDeclarationNode;
			const variable = sprite.define('var', _node.identifier);

			if (_node.value.type == 'Literal')
				variable.initial_value = (_node.value as LiteralNode).value

			if (stack) {
				const block = new Block(sprite);
				block.opcode = 'data_setvariableto';
				block.scratch_block.load_inputs();
				block.scratch_block.fields.get('VARIABLE')!.value = variable;
				block.scratch_block.inputs.get('VALUE')!.value = await process_node({
					node: _node.value,
					sprite,
					parent: block
				}, THROW_IF_NULL);
				stack.add(block);
				// console.log(block.scratch_block.inputs)
				return block;
			}

			return variable
		},
		async Include() {
			const _node = node as IncludeNode;
			// console.log('meow')
			const include_handlers: Record<typeof _node.itype, () => void | Promise<void>> = {
				'blocks/js': async function () {
					//@ts-ignore: blockly...
					globalThis.Blockly = blockly
					// actually import the blocks
					await import('./' + _node.path);
					const bl = jsBlocksToJSON();
					// console.log({bl})
					sprite.stage.definitions = {
						...bl,
						...sprite.stage.definitions
					}

					// janky patch to make some penguinmod bullshit work
					//TODO: fix this
					if (sprite.stage.definitions.control_expandableIf
						&& sprite.stage.definitions.control_expandableIf[1] != 'branch') {
						sprite.stage.definitions.control_expandableIf[0].unshift({
							name: 'BOOL1',
							type: 1,
							// variableTypes: arg.variableTypes
						})
						sprite.stage.definitions.control_expandableIf[1] = 'branch'
					}
				},
				'extension': async function () {
					const nop = () => { };
					const asyncNop = () => {
						const a = { then: () => a, catch: () => a };
						return a
					}
					let ext: any = null;
					//@ts-ignore:
					globalThis.window = globalThis
					//@ts-ignore:
					const Scratch = globalThis.Scratch = {
						translate: (a: string) => a,
						fetch: asyncNop,
						extensions: {
							unsandboxed: true,
							register: (e: Object) => { ext = e }
						},
						vm: {
							runtime: {
								on: nop,
								targets: [],
								ioDevices: {
									userData: {},
									mouse: {
										bindToCamera: nop
									}
								},
								frameLoop: {
									framerate: 0
								},
								exports: {
									JSGenerator: class { }
								},
								setRuntimeOptions: nop,
								setInterpolation: nop,
								runtimeOptions: {},
								ext_scratch3_looks: {},
							},
							renderer: {
								on: nop,
								exports: {
									Skin: class { },
									Drawable: { prototype: {} }
								},
								canvas: {},
								_drawList: []
							},
							exports: {
								RenderedTarget: class RenderedTarget {
									constructor() { }
									blocks = {}
								},
								JSGenerator: class { }
							},
						},
						BlockType: {
							BOOLEAN: "Boolean",
							BUTTON: "button",
							LABEL: "label",
							COMMAND: "command",
							CONDITIONAL: "conditional",
							EVENT: "event",
							HAT: "hat",
							LOOP: "loop",
							REPORTER: "reporter",
							XML: "xml"
						},
						TargetType: {
							SPRITE: "sprite",
							STAGE: "stage"
						},
						Cast: {},
						renderer: {
							canvas: {},
						},
						ArgumentType: {
							ANGLE: "angle",
							BOOLEAN: "Boolean",
							COLOR: "color",
							NUMBER: "number",
							STRING: "string",
							MATRIX: "matrix",
							NOTE: "note",
							IMAGE: "image",
							COSTUME: "costume",
							SOUND: "sound"
						}
					}
					//@ts-ignore:
					globalThis.MutationObserver = class {
						observe() { }
					}
					//@ts-ignore:
					Scratch.translate.setup = nop;
					let ipath = _node.path;
					//TODO: basedir
					if (_node.itype == 'extensions/file')
						ipath = path.resolve('.', ipath);
					let extUrl = _node.path;
					if (_node.itype == 'extensions/file') {
						const file = fs.readFileSync(path.resolve('.', ipath));
						const base64 = (typeof file == 'string' ? Buffer.from(file) : file).toString('base64')
						const url = encodeURIComponent(file.toString())
						// console.log(base64, url)
						if (base64.length < url.length)
							extUrl = `data:text/javascript;base64,${base64}`;
						else
							extUrl = `data:text/javascript,${url}`;
					}
					await import(ipath);
					if (ext == null || !ext?.getInfo) throw "Extension didnt load properly";
					const { blocks, id: extid } = ext.getInfo();
					sprite.project.extensions.push(extid);
					sprite.project.extensionUrls[extid] = extUrl;
					sprite.stage.definitions = {
						...sprite.stage.definitions,
						...Object.fromEntries(
							blocks.map((block: any) => {
								if (typeof block !== 'object' || !block.opcode)
									return [];
								return [extid + '_' + block.opcode, [Object.entries(block.arguments ?? {}).map(a => {
									return {
										name: a[0],
										type: 1
									} as Input
								}), block.blockType == Scratch.BlockType.EVENT ? 'hat' : 'reporter']]
							})
						)
					}
				},
				//TODO: other include types
			}
			include_handlers['extension/file'] = include_handlers.extension;
			if (!include_handlers[_node.itype])
				throw `cannot handle include type ${JSON.stringify(_node.itype)}`
			await include_handlers[_node.itype]()
			return null
		},
		async BranchFunctionCall() {
			if (!stack) throw new Error('have to be inside stack');
			const _node = node as BranchFunctionCallNode;
			const block = new Block(sprite);
			// console.log(_node)
			block.opcode = _node.identifier;
			const definition = block.scratch_block.definition;
			if (definition[1] !== 'branch') throw `definition not branch; are you sure this is a branch block? (${block.opcode})`
			const [inputs] = definition;
			block.scratch_block.load_inputs();
			// console.log('auiuinjsflom', _node.args, inputs.length)
			for (let i = 0; i < Math.min(_node.args.length, inputs.length); i++) {
				const arg = _node.args[i];
				const input = inputs[i];
				console.log(arg, input)
				const value = await process_node({
					node: arg,
					sprite,
					parent: block
				});
				console.log('akjshfkjskjlkvxnojnvdkdn', value)
				// if (value instanceof Block) {
				// 	value.set_parent(block)
				// }
				if (value === null) throw 'cant use a null node in arguments'

				const scratch_block = block
					.scratch_block;
				if (scratch_block.fields.has(input.name))
					scratch_block.fields.get(input.name)!.value = sprite.resolve(ResolveKind.Var_or_list, input.name);
				else
					scratch_block
						.inputs
						.get(input.name)!
						.value = value;
			}
			console.log(block.scratch_block.inputs)
			for (let i = 0; i < definition[2]!.length; i++) {
				const branch_arg = definition[2]![i];
				const branch = _node.branches[i];
				const branch_stack = new Stack(sprite, block);
				for (const node of branch) {
					await process_node({
						node,
						stack: branch_stack,
						sprite,
					});
				}
				if (!branch_stack.empty) {
					// console.log('asdasagdss',branch_arg, block.scratch_block.inputs)
					// block.scratch_block.
					if (!block.scratch_block.inputs.has(branch_arg))
						throw 'what';
					block.scratch_block.inputs.get(branch_arg)!.value = branch_stack.top
				} else {
					console.log('empty');
					// block.scratch_block.inputs.get(branch_arg)!.value = 0;
				}
			}
			stack.add(block)
			return block
		},
		async Assignment() {
			if (!stack) throw new Error('have to be inside stack');
			const _node = node as AssignmentNode;
			const variable = sprite.resolve(ResolveKind.Variable, _node.identifier)
			if (!variable)
				throw `cannot resolve variable ${JSON.stringify(variable)}; has it been defined?`
			const block = new BlockBuilder(sprite)
				.set_opcode('data_setvariableto')
				.set_field('VARIABLE', variable);
			block.get_input('VALUE')
				.set_value(await process_node({ sprite, node: _node.value, parent: block.block }, THROW_IF_NULL))
			stack.addb(block)
			return block.block
		},
		async BinaryExpression() {
			// if (!stack) throw new Error('have to be inside stack');
			const _node = node as BinaryExpressionNode;
			if (!Object.keys(sprite.stage.definitions).some(k => k.startsWith('operator_')))
				throw `To use BinExp you have to include the operators category`
			const operations: Record<string, string[]> = {
				'&': ['operator_and'],
				'|': ['operator_or'],
				'=': ['operator_equals'],
				'+': ['operator_add'],
				'-': ['operator_subtract'],
				'*': ['operator_multiply'],
				'/': ['operator_divide'],
				'%': ['operator_mod'],
				'<': ['operator_lt'],
				'>': ['operator_gt'],
				'!=': ['operator_not', 'operator_equals'],
				'<=': ['operator_not', 'operator_gt'],
				'>=': ['operator_not', 'operator_lt']
			};
			const opcodes = operations[_node.operator];
			if (!opcodes) throw `unhandled operation ${_node.operator}`;
			let block: Block | undefined;
			for (let i = 0; i < opcodes.length; i++) {
				const opcode = opcodes[i];
				const inner_block = new Block(sprite, block);
				inner_block.opcode = opcode;
				inner_block.scratch_block.load_inputs()
				const inputs: Input[] = inner_block.scratch_block.definition[0];
				if (i == opcodes.length - 1) {
					// inner_block.get_input_by_index(0)
					// 		.set_value(await process_node({sprite, node: _node.left}, THROW_IF_NULL));
					// inner_block.get_input_by_index(1)
					// 		.set_value(await process_node({sprite, node: _node.right}, THROW_IF_NULL));
					inner_block.scratch_block.inputs.get(inputs[0]!.name)!.value =
						await process_node({ sprite, node: _node.left, parent: block ?? inner_block }, THROW_IF_NULL);
					inner_block.scratch_block.inputs.get(inputs[1]!.name)!.value =
						await process_node({ sprite, node: _node.right, parent: block ?? inner_block }, THROW_IF_NULL);
				}
				if (!block) block = inner_block;
			}
			if (!block) throw 'no'
			// stack.addb(block);
			block.set_parent(parent);
			// console.log(block.topLevel, parent)
			return block
		},
		Identifier() {
			const _node = node as IdentifierNode;
			if (sprite.identifier_macros[_node.name]) {
				const returnValue = sprite.identifier_macros[_node.name]();
				if (returnValue instanceof Stack) {
					if (!stack) throw 'need to be in stack to use '+_node.name;
					for (const block of returnValue.blocks) {
						block.topLevel = false;
						stack.add(block);
					}
					return null;
				} else if (returnValue instanceof Block) {
					if (!stack) throw 'need to be in stack to use '+_node.name;
					stack.add(returnValue);
					return null;
				}
				return returnValue;
			}
			const variable = sprite.resolve(ResolveKind.Variable, _node.name);
			if (!variable)
				throw `cannot resolve variable ${JSON.stringify(variable)}; has it been defined?`
			return variable
		},
		async FunctionDeclaration() {
			const _node = node as FunctionDeclarationNode;
			if (parent) throw 'fn definition only in top level';
			const function_stack = new Stack(sprite);
			const prototype = new Block(sprite);
			prototype.opcode = 'procedures_prototype';
			prototype.shadow = true;

			const fndBlocks: jsonBlock[] = [];
			const fndChildren: BlockCollection[] = [];

			// if ('x' in blk) delete blk.x;
			// if ('y' in blk) delete blk.y;

			// const prototype: jsonBlock = {
			// 	opcode: 'procedures_prototype',
			// 	...blk,
			// 	next: null,
			// 	id: genId(blockID).toString(),
			// 	inputs: {},
			// 	shadow: true
			// }

			// if (!preprocessFnDecl)
			// 	blockID++;

			// const definitionId = genId(blockID).toString();
			const definition = new Block(sprite);
			definition.opcode = 'procedures_definition';

			const argumentids = [];
			const argumentdefaults = [];
			const argumentnames = [];
			const fndScope = sprite.duplicate();
			for (const arg of _node.params) {
				const argid = genUid();
				argumentids.push(argid)
				argumentnames.push(arg);
				argumentdefaults.push('');

				const inputBlock = () => {
					const block = new Block(sprite);
					block.opcode = "argument_reporter_string_number";
					block.scratch_block.fields.get('VALUE')!.value = arg;
					block.shadow = true;
					return block;
					// {
					// 	opcode: "argument_reporter_string_number",
					// 	...blk,
					// 	next: null,
					// 	id: genId(blockID).toString(),
					// 	fields: {
					// 		VALUE: [arg, null]
					// 	},
					// 	parent: prototype.id,
					// 	shadow: true
					// }
				}

				// fndBlocks.push(inputBlock)

				// sc.identifierBlocks.set(arg, id => {
				// 	return {
				// 		...inputBlock,
				// 		id
				// 	}
				// })

				const input = new ScratchBlockInput(prototype.scratch_block);
				input.type = InputDataType.text;
				prototype.scratch_block.inputs.set(argid, input);
				prototype.inputs[argid] = [1, inputBlock.id]
			}

			const mutation = prototype.mutation = {
				tagName: 'mutation',
				children: [],
				proccode: _node.name + ` %s`.repeat(_node.params.length),
				argumentids: JSON.stringify(argumentids),
				argumentnames: JSON.stringify(argumentnames),
				argumentdefaults: JSON.stringify(argumentdefaults),
				warp: JSON.stringify(_node.warp)
			}

			sprite.customBlocks[_node.name] = {
				mutation,
				inputs: Object.entries(prototype.inputs).map(i => [1, i[0]])
			}
			if (preprocessFnDecl)
				return new PartialBlockCollection([]) as BlockCollection;

			prototype.parent = definitionId

			lastBlock = {
				id: definitionId,
				...blk,
				opcode: 'procedures_definition'
			};
			lastCustomBlock = lastBlock;
			lastPrototypeBlock = prototype;

			// console.debug(sc)

			for (const node of _node.body) {
				fndChildren.push(await processNode(level + 1, node, false, false, false, sc))
			}

			lastBlock = {} as blockBlock;

			const firstFndChild: BlockCollection | undefined =
				fndChildren[0] as BlockCollection | undefined;

			fndBlocks.push({
				opcode: lastCustomBlock.opcode,
				...blk,
				next: firstFndChild ? firstFndChild.block.id : null,
				inputs: {
					custom_block: [
						1,
						prototype.id
					]
				},
				topLevel: true,
				id: definitionId,
				x: 0,
				y: 0
			} as jsonBlock, prototype)
			lastCustomBlock = undefined;
			lastPrototypeBlock = undefined;
			return new PartialBlockCollection([
				...fndBlocks.map(bl => new BlockCollection(bl, [])),
				new PartialBlockCollection(fndChildren),
			]) as BlockCollection;
		}
	});
	if (!handlers[node.type]) {
		console.error(node)
		throw `cannot handle node of type ${node.type}
try the old asttoblocks?`;
	}
	const return_value = await handlers[node.type]();
	if (throw_if_null && return_value === null)
		throw 'cannot use null nodes in this context';
	return return_value;
}
