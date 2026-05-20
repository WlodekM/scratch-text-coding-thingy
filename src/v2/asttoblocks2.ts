// import { Project } from "./jsontypes.ts";
// import { Variable } from "../jsontypes.ts";
import { Input, jsBlocksToJSON } from "../blocks.ts";
import { Block, ResolveKind, ScratchBlockValue, Stack, type SpriteOrStageScope, } from './oop_block.ts'
import { AssignmentNode, ASTNode, BranchFunctionCallNode, FunctionCallNode, GreenFlagNode, IdentifierNode, IncludeNode, LiteralNode, VariableDeclarationNode } from "../tshv2/main.ts";
import transformAST from "./preprocess2.ts";
import { BlockBuilder } from "./block_builder.ts";
import { BinaryExpressionNode } from "../tshv2/main.ts";

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
	{node, stack, sprite, parent}: {node: ASTNode, stack?: Stack, sprite: SpriteOrStageScope, parent?: Block},
): Promise<ScratchBlockValue | null>
export function process_node(
	{node, stack, sprite, parent}: {node: ASTNode, stack?: Stack, sprite: SpriteOrStageScope, parent?: Block},
	throw_if_null: false,
): Promise<ScratchBlockValue | null>
export function process_node(
	{node, stack, sprite, parent}: {node: ASTNode, stack?: Stack, sprite: SpriteOrStageScope, parent?: Block},
	throw_if_null: true,
): Promise<ScratchBlockValue>
export async function process_node(
	{node: original_node, stack, sprite, parent}:
	{node: ASTNode, stack?: Stack, sprite: SpriteOrStageScope, parent?: Block},
	throw_if_null = false,
): Promise<ScratchBlockValue | null> {
	const node = await transformAST(original_node, sprite)
	if (!node) return null;
	const handlers: Record<string, (()=>ScratchBlockValue | null) | (()=>Promise<ScratchBlockValue | null>)> = ({
		GreenFlag() {
			if (stack || parent)
				throw 'cannot be in stack or have a parent'
			const _node = node as GreenFlagNode;
			const gf_stack = new Stack(sprite);
			const gf_block = new Block(sprite);
			gf_block.opcode = 'event_whenflagclicked';
			gf_stack.add(gf_block)
			for (const node of _node.branch) {
				process_node({ node, stack: gf_stack, sprite });
			}
			sprite.add_stack(gf_stack)
			return gf_block;
		},
		async FunctionCall() {
			if (!stack) throw 'have to be inside stack';
			const _node = node as FunctionCallNode;
			const block = new Block(sprite);
			block.opcode = _node.identifier;
			const definition = block.scratch_block.definition;
			const [inputs] = definition;
			block.scratch_block.load_inputs()
			for (let i = 0; i < Math.min(_node.args.length,inputs.length); i++) {
				const arg = _node.args[i];
				const input = inputs[i];
				const value = await process_node({
					node: arg,
					sprite,
					parent: block
				});
				if (value === null) throw 'cant use a null node in arguments'
				// console.log(value)
				block
					.scratch_block
					.inputs
					.get(input.name)!
					.value = value;
			}
			stack.add(block)
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
				variable.intial_value = (_node.value as LiteralNode).value

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
				stack.add(block)
				return block;
			}
			
			return variable
		},
		async Include() {
			const _node = node as IncludeNode;
			console.log('meow')
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
				}
				//TODO: other include types
			}
			if (!include_handlers[_node.itype])
				throw `cannot handle include type ${JSON.stringify(_node.itype)}`
			await include_handlers[_node.itype]()
			return null
		},
		async BranchFunctionCall() {
			if (!stack) throw 'have to be inside stack';
			const _node = node as BranchFunctionCallNode;
			const block = new Block(sprite);
			// console.log(_node)
			block.opcode = _node.identifier;
			const definition = block.scratch_block.definition;
			if (definition[1] !== 'branch') throw `definition not branch; are you sure this is a branch block? (${block.opcode})`
			const [inputs] = definition;
			block.scratch_block.load_inputs()
			for (let i = 0; i < Math.min(_node.args.length,inputs.length); i++) {
				const arg = _node.args[i];
				const input = inputs[i];
				// console.log(arg, input)
				const value = await process_node({
					node: arg,
					sprite,
					parent: block
				});
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
			for (let i = 0; i < definition[2]!.length; i++) {
				const branch_arg = definition[2]![i];
				const branch = _node.branches[i];
				const branch_stack = new Stack(sprite);
				for (const node of branch) {
					await process_node({
						node,
						stack: branch_stack,
						sprite
					})
				}
				if (!branch_stack.empty) {
					console.log(branch_arg, block.scratch_block.inputs)
					// block.scratch_block.
					if (!block.scratch_block.inputs.has(branch_arg))
						throw 'what';
					block.scratch_block.inputs.get(branch_arg)!.value = branch_stack.top
				}
			}
			stack.add(block)
			return block
		},
		async Assignment() {
			if (!stack) throw 'have to be inside stack';
			const _node = node as AssignmentNode;
			const variable = sprite.resolve(ResolveKind.Variable, _node.identifier)
			if (!variable)
				throw `cannot resolve variable ${JSON.stringify(variable)}; has it been defined?`
			const block = new BlockBuilder(sprite)
				.set_opcode('data_setvariableto')
				.set_field('VARIABLE', variable)
				.get_input('VALUE')
					.set_value(await process_node({sprite, node: _node.value}, THROW_IF_NULL))
					.up();
			stack.addb(block)
			return block.block
		},
		async BinaryExpression() {
			// if (!stack) throw 'have to be inside stack';
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
				if (i == opcodes.length-1) {
					// inner_block.get_input_by_index(0)
					// 		.set_value(await process_node({sprite, node: _node.left}, THROW_IF_NULL));
					// inner_block.get_input_by_index(1)
					// 		.set_value(await process_node({sprite, node: _node.right}, THROW_IF_NULL));
					inner_block.scratch_block.inputs.get(inputs[0]!.name)!.value =
						await process_node({sprite, node: _node.left}, THROW_IF_NULL);
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
			const variable = sprite.resolve(ResolveKind.Variable, _node.name);
			if (!variable)
				throw `cannot resolve variable ${JSON.stringify(variable)}; has it been defined?`
			return variable
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
