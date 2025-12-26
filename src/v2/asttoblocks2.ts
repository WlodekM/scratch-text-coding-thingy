// import { Project } from "./jsontypes.ts";
import { Variable } from "../jsontypes.ts";
import { Block, ScratchBlockValue, Stack, type SpriteOrStageScope, } from './oop_block.ts'
import { ASTNode, FunctionCallNode, GreenFlagNode, LiteralNode, VariableDeclarationNode } from "../tshv2/main.ts";

export function process_node(
	{node, stack, sprite}:
	{node: ASTNode, stack?: Stack, sprite: SpriteOrStageScope}
): ScratchBlockValue {
	const handlers: Record<string, ()=>ScratchBlockValue> = ({
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
		FunctionCall() {
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
				block
					.scratch_block
					.inputs
					.get(input.name)!
					.value = process_node({
						node: arg,
						sprite
					});
			}
			stack.add(block)
			return block
		},
		Literal() {
			const _node = node as LiteralNode;
			return _node.value
		},
		VariableDeclaration() {
			const _node = node as VariableDeclarationNode;
			const variable = sprite.define('var', _node.identifier);
			
			if (_node.value.type == 'Literal')
				variable.intial_value = (_node.value as LiteralNode).value

			if (stack) {
				const block = new Block(sprite);
				block.opcode = 'data_setvariableto';
				block.scratch_block.load_inputs();
				block.scratch_block.fields.get('VARIABLE')!.value = variable;
				block.scratch_block.inputs.get('VALUE')!.value = process_node({
					node: _node.value,
					sprite
				});
				stack.add(block)
				return block;
			}
			
			return variable
		}
	});
	if (!handlers[node.type])
		throw `cannot handle node of type ${node.type}
try the old asttoblocks?`;
	return handlers[node.type]()
}
