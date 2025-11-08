import type { Environment } from "./asttoblocks.ts";
import type { ASTNode, BranchFunctionCallNode, FunctionCallNode, IdentifierNode, LiteralNode, NodeType, ObjectAccessNode, OnEventNode } from "./tshv2/main.ts";
import { ObjectMethodCallNode } from "./tshv2/main.ts";

function fnc_helper(opcode: string, ...args: ASTNode[]) {
	return {
		identifier: opcode,
		args: args,
		type: 'FunctionCall'
	} as FunctionCallNode
}
function bfnc_helper(opcode: string, branches: ASTNode[][], ...args: ASTNode[]) {
	return {
		type: 'BranchFunctionCall',
		identifier: opcode,
		args: args,
		branches
	} as BranchFunctionCallNode
}

function literal_helper(value: string | number) {
	return  {
			type: 'Literal',
			value: value
		} as LiteralNode
}

const identifier_defintions: Map<string, ASTNode | undefined> = new Map();
const function_defintions: Map<string, ASTNode | undefined> = new Map();

// deno-lint-ignore no-explicit-any
const TRANSFORMERS: [NodeType, (node: any, env: Environment) => ASTNode | undefined][] = [
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
					return fnc_helper('data_lengthoflist',
						literal_helper(identifier.name)
					)
				
				case 'json':
					return fnc_helper('skyhigh173JSON_json_vm_getlist',
						literal_helper(identifier.name)
					)

				case 'initial_json':
					return literal_helper(JSON.stringify(
						(env.lists.get(identifier.name) ?? env.globalLists.get(identifier.name))!
						[1]
					))

				case 'id':
					return literal_helper(
						(env.lists.get(identifier.name) ?? env.globalLists.get(identifier.name))!
						[0]
					)
				
				case 'last':
					return fnc_helper('data_itemoflist',
						fnc_helper('data_lengthoflist', literal_helper(identifier.name)),
						literal_helper(identifier.name)
					)
			
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
				return fnc_helper('operator_letter_of',
					node.args[0],
					object
				)

			case 'str_length':
				return fnc_helper('operator_length',
					object
				)

			case 'join':
				if (!node.args[0])
					throw 'string::join() requires a second string'
				return fnc_helper('operator_join',
					object,
					node.args[0]
				)
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
					return fnc_helper('data_addtolist',
						node.args[0],
						literal_helper(identifier.name)
					)
				
				case 'replace':
					if (!node.args[1])
						throw 'list::replace() requires an index and an item'
					return fnc_helper('data_replaceitemoflist',
						node.args[0],
						literal_helper(identifier.name),
						node.args[1]
					)
				
				case 'remove':
					if (!node.args[0])
						throw 'list::remove() requires an index'
					return fnc_helper('data_deleteoflist',
						node.args[0],
						literal_helper(identifier.name)
					)
				
				case 'insert':
					if (!node.args[1])
						throw 'list::insert() requires an index and an item'
					return fnc_helper('data_insertatlist',
						node.args[1],
						node.args[0],
						literal_helper(identifier.name),
					)
				
				case 'clear':
					return fnc_helper('data_deletealloflist',
						literal_helper(identifier.name)
					)
				
				case 'at':
					if (!node.args[0])
						throw 'list::at() requires an index'
					return fnc_helper('data_itemoflist',
						node.args[0],
						literal_helper(identifier.name)
					)

				case 'indexof':
					if (!node.args[0])
						throw 'list::indexof() requires an item'
					return fnc_helper('data_itemnumoflist',
						node.args[0],
						literal_helper(identifier.name)
					)

				case 'contains':
					if (!node.args[0])
						throw 'list::contains() requires an item'
					return fnc_helper('data_listcontainsitem',
						node.args[0],
						literal_helper(identifier.name)
					)
				
				default:
					throw `unknown property ${node.method} for ${vtype} vtype`
			}
		}
		throw 'unhandled'
	}],
	['FunctionCall', function(node: FunctionCallNode, env: Environment): ASTNode | undefined {
		if (function_defintions.has(node.identifier))
			return function_defintions.get(node.identifier);
		if (node.identifier === 'evaljs') {
			if (!node.args[0] || node.args[0].type !== 'Literal')
				throw 'arg 1 must be literal'
			return eval((node.args[0] as LiteralNode).value.toString())
		}
		if (node.identifier === 'identifier_redefine') {
			if (!node.args[0] || node.args[0].type !== 'Identifier')
				throw 'arg 1 must be identifier'
			if (!node.args[1] || node.args[1].type !== 'Literal')
				throw 'arg 2 must be literal'
			identifier_defintions.set(
				(node.args[1] as IdentifierNode).name,
				eval((node.args[1] as LiteralNode).value.toString())
			)
			return
		}
		if (node.identifier === 'func_redefine') {
			if (!node.args[0] || node.args[0].type !== 'Identifier')
				throw 'arg 1 must be identifier'
			if (!node.args[1] || node.args[1].type !== 'Literal')
				throw 'arg 2 must be literal'
			function_defintions.set(
				(node.args[1] as IdentifierNode).name,
				eval((node.args[1] as LiteralNode).value.toString())
			)
			return
		}
		return node
	}],
	['Identifier', function(node: FunctionCallNode, env: Environment): ASTNode | undefined {
		if (!identifier_defintions.has(node.identifier))
			return node;
		return identifier_defintions.get(node.identifier)!
	}],
	['OnEvent', function(node: OnEventNode, env: Environment): ASTNode {
		return bfnc_helper('event_whenbroadcastreceived',
			[
				node.branch
			],
			literal_helper(node.event),
		)
	}]
]

// convert nodes that aren't necessarily blocks to block nodes
export default function transformAST(node: ASTNode, env: Environment): ASTNode | undefined {
	const [,transformer] = TRANSFORMERS.find(([t]) => t == node.type as NodeType)??[];
	if (!transformer)
		return node;
	return transformer(node, env);
}