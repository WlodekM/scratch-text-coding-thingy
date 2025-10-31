import type { Environment } from "./asttoblocks.ts";
import type { ASTNode, FunctionCallNode, IdentifierNode, LiteralNode, NodeType, ObjectAccessNode } from "./tshv2/main.ts";
import { ObjectMethodCallNode } from "./tshv2/main.ts";

// deno-lint-ignore no-explicit-any
const TRANSFORMERS: [NodeType, (node: any, env: Environment) => ASTNode][] = [
	['ObjectAccess', function(node: ObjectAccessNode, env: Environment): ASTNode {
		let vtype: null | 'v' | 'l' = null;
		const object: IdentifierNode | ASTNode = node.object;
		if ((object as ASTNode).type !== 'Identifier' as NodeType)
			throw `can only access properties of identifiers for now (got ${object.type})`;
		const identifier = object as IdentifierNode;
		if (env.variables.has(identifier.name) ||
			env.globalVariables.has(identifier.name))
			vtype = 'v';
		if (env.lists.has(identifier.name) ||
			env.globalLists.has(identifier.name))
			vtype = 'l';
		if (vtype == null)
			throw `Could not find variable ${identifier.name}`;
		if (vtype == 'l') {
			switch (node.property) {
				case 'length':
					return {
						identifier: 'data_lengthoflist',
						args: [
							{
								type: 'Literal',
								value: identifier.name
							} as LiteralNode
						],
						type: 'FunctionCall'
					} as FunctionCallNode
				
				case 'json':
					return {
						identifier: 'skyhigh173JSON_json_vm_getlist',
						args: [
							{
								type: 'Literal',
								value: identifier.name
							} as LiteralNode
						],
						type: 'FunctionCall'
					} as FunctionCallNode

				case 'initial_json':
					return {
						type: 'Literal',
						value: JSON.stringify(
							(env.lists.get(identifier.name) ?? env.globalLists.get(identifier.name))!
							[1]
						)
					} as LiteralNode

				case 'id':
					return {
						type: 'Literal',
						value:
							(env.lists.get(identifier.name) ?? env.globalLists.get(identifier.name))!
							[0]
					} as LiteralNode
				
				case 'last':
					return {
						identifier: 'data_itemoflist',
						args: [
							{
								identifier: 'data_lengthoflist',
								args: [
									{
										type: 'Literal',
										value: identifier.name
									} as LiteralNode
								],
								type: 'FunctionCall'
							} as FunctionCallNode,
							{
								type: 'Literal',
								value: identifier.name
							} as LiteralNode
						],
						type: 'FunctionCall'
					} as FunctionCallNode
			
				default:
					throw `unknown property ${node.property} for ${vtype} vtype`
			}
		}
		throw 'unhandled'
	}],
	['ObjectMethodCall', function(node: ObjectMethodCallNode, env: Environment): ASTNode {
		let vtype: null | 'v' | 'l' = null;
		const object: IdentifierNode | ASTNode = node.object;
		switch (node.method) {
			case 'letter':
				if (!node.args[0])
					throw 'string::letter() requires an element to push'
				return {
					identifier: 'operator_letter_of',
					args: [
						node.args[0],
						object
					],
					type: 'FunctionCall'
				} as FunctionCallNode
		}
		if ((object as ASTNode).type !== 'Identifier' as NodeType) 
			throw `unknown property ${node.method} for GLOBAL vtype`
		
		const identifier = object as IdentifierNode;
		if (env.variables.has(identifier.name) ||
			env.globalVariables.has(identifier.name))
			vtype = 'v';
		if (env.lists.has(identifier.name) ||
			env.globalLists.has(identifier.name))
			vtype = 'l';
		if (vtype == null)
			throw `Could not find variable ${identifier.name}`;
		if (vtype == 'l') {
			switch (node.method) {
				case 'push':
					if (!node.args[0])
						throw 'list::push() requires an element to push'
					return {
						identifier: 'data_addtolist',
						args: [
							node.args[0],
							{
								type: 'Literal',
								value: identifier.name
							} as LiteralNode
						],
						type: 'FunctionCall'
					} as FunctionCallNode
				
				case 'at':
					if (!node.args[0])
						throw 'list::at() requires an index'
					return {
						identifier: 'data_itemoflist',
						args: [
							node.args[0],
							{
								type: 'Literal',
								value: identifier.name
							} as LiteralNode
						],
						type: 'FunctionCall'
					} as FunctionCallNode
				
				case 'replace':
					if (!node.args[1])
						throw 'list::replace() requires an index and an item'
					return {
						identifier: 'data_replaceitemoflist',
						args: [
							node.args[0],
							{
								type: 'Literal',
								value: identifier.name
							} as LiteralNode,
							node.args[1],
						],
						type: 'FunctionCall'
					} as FunctionCallNode
				
				case 'remove':
					if (!node.args[0])
						throw 'list::remove() requires an index'
					return {
						identifier: 'data_deleteoflist',
						args: [
							node.args[0],
							{
								type: 'Literal',
								value: identifier.name
							} as LiteralNode,
						],
						type: 'FunctionCall'
					} as FunctionCallNode
				

				case 'indexof':
					if (!node.args[0])
						throw 'list::indexof() requires an item'
					return {
						identifier: 'data_itemnumoflist',
						args: [
							node.args[0],
							{
								type: 'Literal',
								value: identifier.name
							} as LiteralNode,
						],
						type: 'FunctionCall'
					} as FunctionCallNode
				
				default:
					throw `unknown property ${node.method} for ${vtype} vtype`
			}
		}
		throw 'unhandled'
	}]
]

// convert nodes that aren't necessarily blocks to block nodes
export default function transformAST(node: ASTNode, env: Environment): ASTNode {
	const [,transformer] = TRANSFORMERS.find(([t]) => t == node.type as NodeType)??[];
	if (!transformer)
		return node;
	return transformer(node, env);
}