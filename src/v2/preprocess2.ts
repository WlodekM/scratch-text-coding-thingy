import { Sprite } from "../jsontypes.ts";
import type { ASTNode, BranchFunctionCallNode, ForNode, FunctionCallNode, IdentifierNode, IfNode, LiteralNode, NodeType, ObjectAccessNode, OnEventNode, VariableDeclarationNode } from "../tshv2/main.ts";
import { ObjectMethodCallNode } from "../tshv2/main.ts";
import { ResolveKind, SpriteOrStageScope } from "./oop_block.ts";

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
const TRANSFORMERS: [NodeType, (node: any, sprite: SpriteOrStageScope) => ASTNode | undefined][] = [
	['ObjectAccess', function(node: ObjectAccessNode, sprite: SpriteOrStageScope): ASTNode {
		let vtype: null | 'v' | 'l' = null;
		const object: IdentifierNode | ASTNode = node.object;
		if ((object as ASTNode).type !== 'Identifier' as NodeType)
			throw `can only access properties of identifiers for now (got ${object.type})`;
		const identifier = object as IdentifierNode;
		const identifier_value = sprite.resolve(ResolveKind.Var_or_list, identifier.name)
		if (!identifier_value) {
			console.warn('PREPROCESSOR', 'could not find variable', identifier.name, 'in', node)
			return object
		}
		if (identifier_value.kind == 'list') {
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
						identifier_value.initial_value
					))

				case 'id':
					return literal_helper(
						identifier_value.id
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
		throw `unhandled object access alias ${JSON.stringify(node)}`
	}],
	['ObjectMethodCall', function(node: ObjectMethodCallNode, sprite: SpriteOrStageScope): ASTNode {
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
		const identifier_value = sprite.resolve(ResolveKind.Var_or_list, identifier.name)
		if (!identifier_value) {
			console.warn('PREPROCESSOR', 'could not find variable', identifier.name, 'in', node)
			return object
		}
		if (identifier_value.kind == 'list') {
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
					throw `unknown property ${node.method} for ${identifier_value.kind} identifier kind`
			}
		}
		throw `unhandled object method call alias ${JSON.stringify(node)}`
	}],
	['FunctionCall', function(node: FunctionCallNode): ASTNode | undefined {
		if (function_defintions.has(node.identifier))
			return function_defintions.get(node.identifier);
		//#nobrowser
		if (node.identifier === 'evaljs') {
			if (!node.args[0] || node.args[0].type !== 'Literal')
				throw 'arg 1 must be literal'
			const code = (node.args[0] as LiteralNode).value.toString();
			return eval(code)
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
		//#endnobrowser
		return node
	}],
	['Identifier', function(node: FunctionCallNode): ASTNode | undefined {
		if (!identifier_defintions.has(node.identifier))
			return node;
		return identifier_defintions.get(node.identifier)!
	}],
	['OnEvent', function(node: OnEventNode): ASTNode {
		return bfnc_helper('event_whenbroadcastreceived',
			[
				node.branch
			],
			literal_helper(node.event),
		)
	}],
	['For', function(node: ForNode): ASTNode {
		const loop = bfnc_helper("control_for_each", [
			node.branch
		], literal_helper((node.varname as IdentifierNode).name), node.times);
		if (!node.define)
			return loop;
		return bfnc_helper("control_repeat", [
			[
				{
					identifier: node.varname.name,
					type: "VariableDeclaration",
					value: literal_helper(1),
					vtype: 'var'
				} as VariableDeclarationNode,
				loop
			]
		], literal_helper(1));
	}],
	['If', function (node: IfNode): ASTNode {
		return bfnc_helper("control_if", [
			node.thenBranch,
			node.elseBranch,
		].filter(b=>b!==undefined), node.condition)
	}]
]

// convert nodes that aren't necessarily blocks to block nodes
export default function transformAST(node: ASTNode, sprite: SpriteOrStageScope): ASTNode | undefined {
	const [,transformer] = TRANSFORMERS.find(([t]) => t == node.type as NodeType)??[];
	if (!transformer)
		return node;
	return transformer(node, sprite);
}
