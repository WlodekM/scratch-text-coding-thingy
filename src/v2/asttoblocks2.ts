// import { Project } from "./jsontypes.ts";
// import { Variable } from "../jsontypes.ts";
import { jsBlocksToJSON } from "../blocks.ts";
import { Block, ScratchBlockValue, Stack, type SpriteOrStageScope, } from './oop_block.ts'
import { ASTNode, FunctionCallNode, GreenFlagNode, IncludeNode, LiteralNode, VariableDeclarationNode } from "../tshv2/main.ts";
import transformAST from "./preprocess2.ts";

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
	{node, stack, sprite}: {node: ASTNode, stack?: Stack, sprite: SpriteOrStageScope},
): Promise<ScratchBlockValue | null>
export function process_node(
	{node, stack, sprite}: {node: ASTNode, stack?: Stack, sprite: SpriteOrStageScope},
	throw_if_null: false,
): Promise<ScratchBlockValue | null>
export function process_node(
	{node, stack, sprite}: {node: ASTNode, stack?: Stack, sprite: SpriteOrStageScope},
	throw_if_null: true,
): Promise<ScratchBlockValue>
export async function process_node(
	{node, stack, sprite}:
	{node: ASTNode, stack?: Stack, sprite: SpriteOrStageScope},
	throw_if_null = false,
): Promise<ScratchBlockValue | null> {
	const _node = await transformAST(node, sprite)
	const handlers: Record<string, (()=>ScratchBlockValue | null) | (()=>Promise<ScratchBlockValue | null>)> = ({
		GreenFlag() {
			const _node = node as GreenFlagNode;
			const stack = new Stack(sprite);
			const gf_block = new Block(sprite);
			gf_block.opcode = 'event_whenflagclicked';
			stack.add(gf_block)
			for (const node of _node.branch) {
				process_node({ node, stack, sprite});
			}
			sprite.add_stack(stack)
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
					sprite
				});
				if (value === null) throw 'cant use a null node in arguments'
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
					sprite
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
					console.log({bl})
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
		}
	});
	if (!handlers[_node.type])
		throw `cannot handle node of type ${_node.type}
try the old asttoblocks?`;
	const return_value = await handlers[_node.type]();
	if (throw_if_null && return_value === null)
		throw 'cannot use null nodes in this context';
	return return_value;
}
