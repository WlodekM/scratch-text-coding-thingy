// deno-lint-ignore-file no-case-declarations no-explicit-any
import type { AssignmentNode, ASTNode, BinaryExpressionNode, BooleanNode, BranchFunctionCallNode, FunctionCallNode, FunctionDeclarationNode, GreenFlagNode, IdentifierNode, IfNode, IncludeNode, ListDeclarationNode, LiteralNode, NodeType, NotNode, ReturnNode, StartBlockNode, VariableDeclarationNode } from "./tshv2/main.ts";
import * as json from './jsontypes.ts';
import bd from "./blocks.ts";
import { jsBlocksToJSON, blockly } from "./blocks.ts";
import fs from "node:fs";
import { ForNode } from "./tshv2/main.ts";
import path from "node:path";
import {Buffer} from 'node:buffer'
import transformAST from "./preprocess.ts";
import process from "node:process";

let blockDefinitions = bd
const args = 
	typeof Deno !== 'undefined' ? Deno.args :
	//@ts-ignore:
	typeof process !== 'undefined' ? process.argv : []

interface Input {
	name: string,
	type: number,
	field?: string,
	variableTypes?: string[]
}

const soup = '!#$%()*+,-./:;=?@[]^_`{|}~' +
	'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
function genUid() {
	const length = 20;
	const soupLength = soup.length;
	const id: string[] = [];
	for (let i = 0; i < length; i++) {
		id[i] = soup.charAt(Math.random() * soupLength);
	}
	return id.join('');
};

// console.log(genUid(), genUid(), genUid())

export type blockBlock = ({ id: string } & json.Block)
export type varBlock = { id: string, data: [12|13, string, string] }
export type jsonBlock = blockBlock | varBlock
const _class = new (class { })()
type Class = typeof _class

export class Scope {
	identifierBlocks: Map<string, (id: string) => jsonBlock> = new Map()
	duplicate(): Scope {
		const s = new Scope();
		for (const [key, value] of [...this.identifierBlocks.entries()]) {
			s.identifierBlocks.set(key, value);
		}
		return s;
	}
}

let varId = 0;

function genVarId(name: string): string {
	varId++
	return genId(varId) + '-' + name
}

export class Environment {
	variables: Map<string, string> = new Map();
	globalVariables: Map<string, string> = new Map();
	lists: Map<string, [string, string[]]> = new Map();
	globalLists: Map<string, [string, string[]]> = new Map();
	extensions: [string, string][] = [];
	customBlocks: Record<string, CustomBlock> = {};
}

class PartialBlockCollection {
	children: PartialBlockCollection[] = [];
	constructor(children: PartialBlockCollection[]) {
		this.children = children
	};
	unfurl(): jsonBlock[] {
		const blocks: jsonBlock[] = []
		for (const child of this.children) {
			const childBlocks = child.unfurl();
			blocks.push(...childBlocks)
		}
		return blocks
	}
}

class BlockCollection<T = jsonBlock> extends PartialBlockCollection {
	block: T;
	constructor(
		block: T,
		children: PartialBlockCollection[]
	) {
		super(children);
		this.block = block
	}
	override unfurl(): jsonBlock[] {
		const blocks = [this.block as jsonBlock]
		for (const child of this.children) {
			const childBlocks = child.unfurl();
			blocks.push(...childBlocks)
		}
		return blocks
	}
}

enum InputTypes {
	math_number = 4,
	math_positive_number = 5,
	math_whole_number = 6,
	math_integer = 7,
	math_angle = 8,
	colour_picker = 9,
	text = 10,
	event_broadcast_menu = 11,
	data_variable = 12,
	data_listcontents = 13
}

class Cast {
	string(text: string) {
		return [InputTypes.text, text]
	}
	number(number: number) {
		return [InputTypes.math_number, number]
	}
}

const _cast = new Cast() // because yes

function genId(num: number): string {
	let result = "";
	while (num > 0) {
		num--;
		result = String.fromCharCode(97 + (num % 26)) + result;
		num = Math.floor(num / 26);
	}
	return result;
}

interface Mutation {
	tagName: 'mutation' | string,
	children: any[],
	proccode: string,
	argumentids: string,
	argumentnames: string,
	argumentdefaults: string,
	warp: string
}

interface CustomBlock {
	inputs: [1, string][],
	mutation: Mutation
}

function getNodeChildren(node: ASTNode): ASTNode[] {
	const children: ASTNode[] = [];

	let n;
	n = node as FunctionDeclarationNode;
	if (n.type == 'FunctionDeclaration') {
		children.push(...n.body)
	}
	n = node as AssignmentNode;
	if (n.type == 'Assignment') {
		children.push(n.value)
	}
	n = node as BinaryExpressionNode;
	if (n.type == 'BinaryExpression') {
		children.push(n.left, n.right)
	}
	n = node as NotNode;
	if (n.type == 'Not') {
		children.push(n.body)
	}
	n = node as FunctionCallNode;
	if (n.type == 'FunctionCall') {
		children.push(...n.args)
	}
	n = node as BranchFunctionCallNode;
	if (n.type == 'BranchFunctionCall') {
		children.push(...n.args, ...n.branches.reduce<ASTNode[]>((p, c) => {
			p.push(...c);
			return p;
		}, []))
	}
	//FIXME - i dont think this was ever actually implemented in asttoblocks :sob:
	n = node as StartBlockNode;
	if (n.type == 'StartBlock') {
		children.push(...n.body)
	}
	n = node as IfNode;
	if (n.type == 'If') {
		children.push(...n.thenBranch, ...(n.elseBranch??[]),n.condition)
	}
	//FIXME - or this,, this sounds useful i really shoul implement it
	n = node as ForNode;
	if (n.type == 'For') {
		children.push(...n.branch, n.times, n.varname)
	}
	n = node as GreenFlagNode;
	if (n.type == 'GreenFlag') {
		children.push(...n.branch)
	}
	n = node as ListDeclarationNode;
	if (n.type == 'ListDeclaration') {
		children.push(...n.value)
	}
	n = node as ReturnNode;
	if (n.type == 'Return') {
		children.push(n.value)
	}

	return children
}

function findVarDecls(env: Environment, node: ASTNode): void {
	if ((node as VariableDeclarationNode).type == 'VariableDeclaration') {
		const id: string = genVarId((node as VariableDeclarationNode).identifier);
		if ((node as VariableDeclarationNode).vtype == 'var')
			env.variables.set((node as VariableDeclarationNode).identifier, id);
	} else for (const child of getNodeChildren(node)) {
		findVarDecls(env, child)
	}
}

const vmPath = fs.existsSync('pm-vm') ?
	'./pm-vm' : './tw-vm'

export default async function ASTtoBlocks(
	ast: ASTNode[],
	basedir: string,
	globalVariables?: Record<string, string>,
	globalLists?: Record<string, [string, string[]]>
): Promise<[jsonBlock[], Environment]> {
	const blocks: jsonBlock[] = [];
	const sprite = new Environment();
	// //@ts-ignore
	// sprite.globalVariables.set = (...args: any[]) => {
	// 	console.log('set', args)
	// }
	// sprite.globalVariables = new Proxy(sprite.globalVariables, {
	// 	get(t, p, r) {
	// 		console.log('j', p, t);
	// 		//@ts-ignore
	// 		return t[p];
	// 	}
	// })

	if (globalVariables) {
		for (const key of Object.keys(globalVariables)) {
			sprite.globalVariables.set(key, globalVariables[key])
		}
	}
	if (globalLists) {
		for (const key of Object.keys(globalLists)) {
			sprite.globalLists.set(key, globalLists[key])
		}
	}

	// hoist all sprite-only variables since scope doesnt exist in scratch
	for (const node of ast) {
		findVarDecls(sprite, node)
	}

	// console.debug('debug: ast\n', JSON.stringify(ast, null, 2))

	let blockID: number = 0;
	let lastBlock: blockBlock = {} as blockBlock;
	let lastCustomBlock: blockBlock | undefined;
	let lastPrototypeBlock: blockBlock | undefined;

	async function arg2input(level: number, inp: Input, arg: ASTNode, child: PartialBlockCollection[], scope: Scope, setLastBlockId?: string) {
		const thisLast = lastBlock;
		if (setLastBlockId) {
			// console.log('setid', setLastBlockId)
			lastBlock = {
				id: setLastBlockId,
				next: null,
				parent: null,
				inputs: {},
				fields: {},
				shadow: false,
				topLevel: false,
				opcode: setLastBlockId
			};
		}
		if (arg.type == 'Identifier') {
			const childBlock = await processNode(level + 1, arg, false, true, true, scope);
			if (!(childBlock.block as varBlock).data) {
				const blbl = childBlock.block as blockBlock; // the blockaroo
				child.push(childBlock);
				return {
					inputs: [inp.name, [
						inp.type,
						blbl.id.toString(),
						[
							...(
								arg
									? [
										10,
										'0'
									]
									: []
							)
						]
					]],
					fields: [] as [string, any] | []
				}
			}
			lastBlock = thisLast
			return {
				inputs: [inp.name, Array.isArray(childBlock.block)
					? [inp.type, childBlock.block] : [inp.type,
					(childBlock.block as varBlock).data,
					[
						...(
							arg
								? [
									10,
									'0'
								]
								: []
						)
					]
					]],
				fields: [] as [string, any] | []
			}
		}
		if (([
			'FunctionCall', 'Boolean', 'BinaryExpression', 'Not',
			'ObjectAccess', 'ObjectMethodCall'
		] as NodeType[]).includes(arg.type as NodeType)) {
			const childBlock = await processNode(level + 1, arg, false, false, true, scope);
			child.push(childBlock);
			lastBlock = thisLast
			return {
				inputs: [inp.name, Array.isArray(childBlock.block)
					? [inp.type, childBlock.block] : [inp.type,
					childBlock.block.id.toString(),
					[
						...(
							arg
								? [
									10,
									'0'
								]
								: []
						)
					]
					]],
				fields: [] as [string, any] | []
			}
		}
		lastBlock = thisLast
		return {
			inputs:
				[inp.name, [inp.type,
				[
					...(
						arg
							? [
								({
									Literal: typeof (arg as LiteralNode).value == 'number' ? 4 : 10,
								})[arg.type] ?? 10,
								(arg as LiteralNode | any)?.value?.toString()
							]
							: []
					)
				]
				]],
			fields: (inp.field ?
				[inp.name,
					[
						(arg as LiteralNode | any)?.value?.toString(),
						(arg as LiteralNode | any)?.value?.toString(),
						(inp.variableTypes ?? [])[0]
					].filter(k=>k)
				] : []) as [string, any] | []
		}
	}

	async function processNode(level: number, raw_node: ASTNode, topLevel = false,
		noLast = false, noNext = false, scope = new Scope(),
		preprocessFnDecl: boolean = false
	): Promise<BlockCollection> {
		const node = transformAST(raw_node, sprite)
		if (!node)
			return new PartialBlockCollection([]) as BlockCollection;
		blockID++;
		const thisBlockID = genId(blockID);
		function log(...args: any[]) {
			process.stdout.write(' '.repeat(level*2))
			console.log(...args)
		}
		if (args.includes('-v'))
			log('procesing node', thisBlockID, node.type,'\n'+' '.repeat(level*2-1+(+(level==0))), {topLevel, noLast, noNext}, lastBlock.id);
		let blk = {
			next: null,
			parent: null,
			inputs: {},
			fields: {},
			shadow: false,
			topLevel: false,
		}
		if (topLevel) {
			blk = Object.assign(blk, {
				x: 0,
				y: 0,
			})
		}
		switch (node.type) {
			case 'GreenFlag':
				const gfNode = node as GreenFlagNode;
				const tempBlock = {
					opcode: 'event_whenflagclicked',
					id: thisBlockID.toString(),
					next: null,
					topLevel
				} as jsonBlock
				lastBlock = tempBlock as blockBlock
				const processedNodes = [];
				for (const node of gfNode.branch) {
					processedNodes.push(await processNode(level + 1, node, false, false, false, scope))
				}
				const children = new PartialBlockCollection(
					processedNodes
				)
				const firstChild: BlockCollection | undefined =
					children.children[0] as BlockCollection | undefined
				const gfBlock = {
					opcode: 'event_whenflagclicked',
					...blk,
					id: thisBlockID.toString(),
					next: (firstChild?.block as blockBlock).id,
					topLevel
				} as jsonBlock
				if (firstChild) (firstChild.block as blockBlock).parent = thisBlockID.toString();
				lastBlock = gfBlock as blockBlock
				return new BlockCollection(gfBlock, [children])

			case 'Include':
				const includeNode = node as IncludeNode;
				blockID--
				if (includeNode.itype == 'blocks/js') {
					//@ts-ignore: goog...
					globalThis.goog = {
						require: () => { },
						provide: () => { },
					};
					//@ts-ignore: blockly...
					globalThis.Blockly = blockly
					// actually import the blocks
					await import('./' + includeNode.path);
					const bl = jsBlocksToJSON();
					blockDefinitions = {
						...bl,
						...blockDefinitions
					}
				} else if (includeNode.itype.startsWith('extension/builtin')) {
					const nop = () => { };
					const asyncNop = () => {
						const a = { then: ()=>a, catch: ()=>a };
						return a
					}
					let ext: any = null;
					//@ts-ignore:
					const Scratch = globalThis.Scratch = {
						translate: (a: string) => a,
						fetch: asyncNop,
						extensions: {
							unsandboxed: true,
							register: (e: Class) => { ext = e }
						},
						vm: {
							runtime: {
								on: nop,
								frameLoop: {
									framerate: 0
								},
								ioDevices: {
									userData: {},
									mouse: {
										bindToCamera: nop
									}
								},
								registerCompiledExtensionBlocks: nop,
								setRuntimeOptions: nop
							}
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
						Cast,
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
					globalThis.vm = Scratch.vm;
					//@ts-ignore:
					globalThis.module = {}
					// const _ArgumentType = await import(`${vmPath}/src/extension-support/argument-type.js`);
					// //@ts-ignore:
					// const ArgumentType = _ArgumentType ?? module.exports;
					// const _BlockType = await import(`${vmPath}/src/extension-support/block-type.js`);
					// //@ts-ignore:
					// const BlockType = _BlockType ?? module.exports;
					// const _TargetType = await import(`${vmPath}/src/extension-support/target-type.js`);
					// //@ts-ignore:
					// const TargetType = _TargetType ?? module.exports;
					//@ts-ignore:
					Scratch.translate.setup = nop
					// //@ts-ignore:
					// globalThis.require = (moduleName) => {
					// 	if (moduleName == 'format-message')
					// 		return (message: {default: string}) => message.default;
					// 	switch (moduleName) {
					// 		case '../../extension-support/argument-type':
					// 			return ArgumentType;
					// 		case '../../extension-support/block-type':
					// 			return BlockType
					// 		case '../../extension-support/target-type':
					// 			return TargetType;
					// 		case '../../extension-support/tw-l10n':
					// 			return ()=>Scratch.translate;
					// 	}
					// 	return class {}
					// }
					//@ts-ignore:
					globalThis.require = (moduleName: string) => {
						if (moduleName == 'format-message')
							return (message: {default: string}) => message.default;
						// console.log(moduleName)
						switch (moduleName) {
							case '../../extension-support/argument-type':
								return Scratch.ArgumentType;
							case '../../extension-support/block-type':
								return Scratch.BlockType
							case '../../extension-support/target-type':
								return Scratch.TargetType;
							case '../../extension-support/tw-l10n':
								return ()=>Scratch.translate;
						}
						return class {}
					}
					const dir = 
						includeNode.path == 'lmsTempVars2' ? 'lily_tempVars2' :
						includeNode.path == 'text' ? 'scratchLab_animatedText' :
						includeNode.path == 'tempVars' ? 'gsa_tempVars' :
						includeNode.path;
					const path = fs.existsSync(`${vmPath}/src/extensions/${dir}/index.js`) ?
						`${vmPath}/src/extensions/${dir}/index.js` :
						fs.existsSync(`${vmPath}/src/extensions/scratch3_${dir}/index.js`) ?
						`${vmPath}/src/extensions/scratch3_${dir}/index.js` :
						dir.match(/^jw[A-Z]/) && 
						fs.existsSync(`${vmPath}/src/extensions/${
							dir.replace(/^jw([A-Z])/,(_,l)=>'jw_'+l.toLowerCase())}/index.js`) ?
						`${vmPath}/src/extensions/${
							dir.replace(/^jw([A-Z])/,(_,l)=>'jw_'+l.toLowerCase())
						}/index.js` :
						dir.match(/^pm[A-Z]/) && 
						fs.existsSync(`${vmPath}/src/extensions/${
							dir.replace(/^pm([A-Z])/,(_,l)=>'pm_'+l.toLowerCase())}/index.js`) ?
						`${vmPath}/src/extensions/${
							dir.replace(/^pm([A-Z])/,(_,l)=>'pm_'+l.toLowerCase())
						}/index.js` :
						dir.match(/^jg[A-Z]/) && 
						fs.existsSync(`${vmPath}/src/extensions/${
							dir.replace(/^jg([A-Z])/,(_,l)=>'jg_'+l).toLowerCase()}/index.js`) ?
						`${vmPath}/src/extensions/${
							dir.replace(/^jg([A-Z])/,(_,l)=>'jg_'+l).toLowerCase()
						}/index.js` :
						dir.match(/^jg[A-Z]/) && 
						fs.existsSync(`${vmPath}/src/extensions/${
							dir.replace(/^jg([A-Z])/,(_,l)=>'jg_'+l.toLowerCase())}/index.js`) ?
						`${vmPath}/src/extensions/${
							dir.replace(/^jg([A-Z])/,(_,l)=>'jg_'+l.toLowerCase())
						}/index.js` :
						`${vmPath}/src/extensions/${dir}/index.js`;
					await import(path);
					//@ts-ignore:
					ext = new globalThis.module.exports(Scratch.vm.runtime);
					
					if (ext == null || !ext?.getInfo) throw "Extension didnt load properly";
					const { blocks, id: extid } = ext.getInfo();
					sprite.extensions.push([includeNode.path, extid]);
					blockDefinitions = {
						...blockDefinitions,
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
				} else if (includeNode.itype.startsWith('extension')) {
					const nop = () => { };
					const asyncNop = () => {
						const a = { then: ()=>a, catch: ()=>a };
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
							register: (e: Class) => { ext = e }
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
								exports: {},
								setRuntimeOptions: nop
							},
							renderer: {
								on: nop,
								exports: {
									Skin: class {}
								},
								canvas: {},
							},
							exports: {
								RenderedTarget: class RenderedTarget {
									constructor() {}
									blocks = {}
								}
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
						Cast,
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
						observe() {}
					}
					//@ts-ignore:
					Scratch.translate.setup = nop;
					let ipath = includeNode.path;
					if (includeNode.itype == 'extensions/file')
						ipath = path.resolve(basedir, ipath);
					let extUrl = includeNode.path;
					if (includeNode.itype == 'extensions/file') {
						const file = fs.readFileSync(path.resolve(basedir, ipath));
						const base64 = Buffer.from(file).toString('base64')
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
					sprite.extensions.push([extUrl, extid]);
					blockDefinitions = {
						...blockDefinitions,
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
				} else throw `unknown include type "${includeNode.type}"`
				return new PartialBlockCollection([]) as BlockCollection

			// deno-lint-ignore no-fallthrough
			case 'FunctionCall': // custom blocks
				const fnNode2 = node as FunctionCallNode;
				if (fnNode2.identifier in sprite.customBlocks) {
					const blockDefinition = sprite.customBlocks[fnNode2.identifier]
					const definition = [blockDefinition.inputs.map(i => { return { name: i[1], type: i[0] } })]
					const child: PartialBlockCollection[] = [];
					const inputs = [];
					const fields: ([string, any] | [])[] = [];
					for (let i = 0; i < Math.min(definition[0].length, fnNode2.args.length); i++) {
						const inp = definition[0][i];
						// console.log(inp)
						const { inputs: inps, fields: flds } = await arg2input(level, inp, fnNode2.args[i], child, scope)
						inputs.push(inps)
						fields.push(flds)
					}
					const block: jsonBlock = {
						opcode: "procedures_call",
						...blk,
						fields: Object.fromEntries(fields),
						mutation: blockDefinition.mutation,
						id: thisBlockID.toString(),
						inputs: Object.fromEntries(inputs),
						next: null, // no next (yet)
						topLevel,
						parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
						shadow: false,
					}
					// console.debug(block)
					if (!topLevel && !noNext) lastBlock.next = block.id.toString();
					if (!noLast) lastBlock = block;
					return new BlockCollection(block, child) //TODO: figure out how to map function args to children
				}

			// deno-lint-ignore no-duplicate-case
			case 'FunctionCall':
				const fnNode = node as FunctionCallNode;
				if (!blockDefinitions[fnNode.identifier])
					throw 'Unknown opcode "' + fnNode.identifier + '"';
				const definition = blockDefinitions[fnNode.identifier]
				const child: PartialBlockCollection[] = [];
				const inputs = [];
				const fields: ([string, any] | [])[] = [];
				const _fncLastLastBlock = lastBlock;
				lastBlock = {
					opcode: fnNode.identifier,
					...blk,
					id: thisBlockID.toString(),
				};
				for (let i = 0; i < Math.min(definition[0].length, fnNode.args.length); i++) {
					const inp = definition[0][i];
					// console.log(definition, 'ssjfksjfksjkfssj<--', i, inp, fnNode.identifier)
					const { inputs: inps, fields: flds } = await arg2input(level, inp, fnNode.args[i], child, scope)
					inputs.push(inps)
					fields.push(flds)
				}
				lastBlock = _fncLastLastBlock
				const block: jsonBlock = {
					opcode: fnNode.identifier,
					...blk,
					fields: Object.fromEntries(fields),
					id: thisBlockID.toString(),
					inputs: Object.fromEntries(inputs),
					next: null, // no next (yet)
					topLevel,
					parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
					shadow: false,
				}
				// console.debug(block)
				if (!topLevel && !noNext) lastBlock.next = block.id.toString();
				if (!noLast) lastBlock = block;
				else lastBlock = _fncLastLastBlock;
				return new BlockCollection(block, child); //TODO: figure out how to map function args to children
			
			case 'Not':
				if (!Object.keys(blockDefinitions).find(k => k.startsWith('operator_')))
					throw `To use the not operator you have to include the operators category`
				const notNode = node as NotNode;
				const notDefinition = blockDefinitions['operator_not'];
				if (!notDefinition)
					throw 'couldn\'t find definition for operator_not'
				blockID++;
				const notChildren: PartialBlockCollection[] = [];
				const lastLastBlock = lastBlock;
				const notBlock: jsonBlock = {
					// opcode: 'operator_not',
					// ...blk,
					// id: thisBlockID.toString(),
					// topLevel,
					// parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
					// shadow: false,
					// inputs: Object.fromEntries([
					//     [notDefinition[0][0].name, [
					//         notDefinition[0][0].type,
					//         genId(blockID).toString()
					//     ]]
					// ]),
					// next: null
					opcode: 'operator_not',
					...blk,
					id: thisBlockID.toString(),
					topLevel,
					parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
					shadow: false,
					inputs: {}
				};
				lastBlock = notBlock;
				notBlock.inputs = {
					...Object.fromEntries([
						(await arg2input(level, notDefinition[0][0], notNode.body, notChildren, scope)).inputs,
					])
				};
				lastBlock = lastLastBlock
				return new BlockCollection(notBlock, notChildren);

			case 'BinaryExpression':
				if (!Object.keys(blockDefinitions).find(k => k.startsWith('operator_')))
					throw `To use BinExp you have to include the operators category`
				const operations: Record<string, string> = {
					'&': 'operator_and',
					'|': 'operator_or',
					'=': 'operator_equals',
					'+': 'operator_add',
					'-': 'operator_subtract',
					'*': 'operator_multiply',
					'/': 'operator_divide',
					'%': 'operator_mod',
					'<': 'operator_lt',
					'>': 'operator_gt',
				}
				const _lastLastBlock = lastBlock;
				const beNode = node as BinaryExpressionNode;
				const beNodeId = thisBlockID.toString();
				if (beNode.operator.length > 1) {
					const operations: Record<string, [string, string]> = {
						'!=': ['operator_not', 'operator_equals'],
						'<=': ['operator_not', 'operator_gt'],
						'>=': ['operator_not', 'operator_lt']
					}
					if (!operations[beNode.operator]) throw 'unknown operator ' + beNode.operator;
					const beDefinition1 = blockDefinitions[operations[beNode.operator][0]]
					const beDefinition2 = blockDefinitions[operations[beNode.operator][1]]
					const beChildren: PartialBlockCollection[] = [];
					blockID++
					const beBlock: jsonBlock = {
						opcode: operations[beNode.operator][0] ?? 'undefined',
						...blk,
						id: beNodeId,
						topLevel,
						parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
						shadow: false,
						inputs: Object.fromEntries([
							[beDefinition1[0][0].name, [
								beDefinition1[0][0].type,
								genId(blockID).toString()
							]]
						]),
					};
					const beBlock2: jsonBlock = {
						opcode: operations[beNode.operator][1] ?? 'undefined',
						...blk,
						id: genId(blockID).toString(),
						topLevel,
						parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
						shadow: false,
						inputs: {
							...Object.fromEntries([
								(await arg2input(level, beDefinition2[0][0], beNode.left, beChildren, scope)).inputs,
								(await arg2input(level, beDefinition2[0][1], beNode.right, beChildren, scope)).inputs
							])
						},
					};
					beChildren.push(new BlockCollection(beBlock2, []))
					return new BlockCollection(beBlock, beChildren);
				}
				if (!operations[beNode.operator]) throw 'unknown operator ' + beNode.operator;
				const beDefinition = blockDefinitions[operations[beNode.operator]]
				const beChildren: PartialBlockCollection[] = []
				// console.log(lastBlock.id)
				let beInputs = {};
				// lastBlock = {
				// 	opcode: operations[beNode.operator] ?? 'undefined',
				// 	...blk,
				// 	id: beNodeId,
				// };
				beInputs = {
					...Object.fromEntries([
						(await arg2input(level, beDefinition[0][0], beNode.left, beChildren, scope, beNodeId)).inputs,
					])
				}
				beInputs = {
					...beInputs,
					...Object.fromEntries([
						(await arg2input(level, beDefinition[0][1], beNode.right, beChildren, scope, beNodeId)).inputs
					])
				}
				lastBlock = _lastLastBlock;
				const beBlock: jsonBlock = {
					opcode: operations[beNode.operator] ?? 'undefined',
					...blk,
					id: beNodeId,
					topLevel,
					parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
					shadow: false,
					inputs: beInputs,
				};
				return new BlockCollection(beBlock, beChildren);

			case 'If':
				const ifNode = node as IfNode;
				const ifBlock: jsonBlock = {
					opcode: 'control_if',
					...blk,
					id: thisBlockID.toString(),
					topLevel,
					parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
					shadow: false,
					inputs: {},
				};
				if (!topLevel && !noNext) lastBlock.next = ifBlock.id.toString();
				if (!noLast) lastBlock = ifBlock;
				const ifChildren: PartialBlockCollection[] = [];
				const processedThenNodes = [];
				for (let i = 0; i < ifNode.thenBranch.length; i++) {
					const node = ifNode.thenBranch[i];
					processedThenNodes.push(await processNode(level + 1, node, false, false, i == 0, scope))
				}
				const thenBlocks = new PartialBlockCollection(
					processedThenNodes
				)
				const firstThenChild: BlockCollection<blockBlock> | undefined =
					thenBlocks.children[0] as BlockCollection<blockBlock> | undefined
				ifChildren.push(thenBlocks)
				ifBlock.inputs.SUBSTACK = [
					2,
					firstThenChild?.block?.id
				]
				if (!noLast) lastBlock = ifBlock;
				const condition = (await arg2input(level, {
					name: 'CONDITION',
					type: 1
				}, ifNode.condition, ifChildren, scope)).inputs;
				ifBlock.inputs.CONDITION = condition[1] as json.Input
				if (ifNode.elseBranch) {
					ifBlock.opcode = 'control_if_else'
					const processedElseNodes = [];
					if (!noLast) lastBlock = ifBlock;
					for (let i = 0; i < ifNode.elseBranch.length; i++) {
						const node = ifNode.elseBranch[i];
						processedElseNodes.push(await processNode(level + 1, node, false, false, i == 0, scope))
					}
					const elseBlocks = new PartialBlockCollection(
						processedElseNodes
					)
					const firstElseChild: BlockCollection<blockBlock> | undefined =
						elseBlocks.children[0] as BlockCollection<blockBlock> | undefined
					ifChildren.push(elseBlocks)
					ifBlock.inputs.SUBSTACK2 = [
						2,
						firstElseChild?.block?.id
					]
				}
				if (!noLast) lastBlock = ifBlock;
				return new BlockCollection(ifBlock, ifChildren);

			case "Boolean":
				const boolNode = node as BooleanNode;
				const boolBlock: jsonBlock = {
					opcode: boolNode.value ? "operator_not" : "operator_and",
					...blk,
					id: thisBlockID.toString(),
					topLevel,
					parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
				}
				return new BlockCollection(boolBlock, []);

			case "BranchFunctionCall":
				const branchNode = node as BranchFunctionCallNode;
				const bDefinition = blockDefinitions[branchNode.identifier]
				const branchChildren: PartialBlockCollection[] = [];
				const binputs = [];
				const bfields = [];
				const bLastLastBlock = lastBlock;
				lastBlock = {
					id: thisBlockID.toString()
				} as blockBlock
				for (let i = 0; i < Math.min(bDefinition[0].length, branchNode.args.length); i++) {
					const inp = bDefinition[0][i];
					const { inputs: inps, fields: flds } = await arg2input(level, inp, branchNode.args[i], branchChildren, scope)
					// binputs.push(().inputs)
					binputs.push(inps)
					bfields.push(flds)
				}
				const branchBlock: jsonBlock = {
					opcode: branchNode.identifier,
					...blk,
					id: thisBlockID.toString(),
					topLevel,
					parent: topLevel || !bLastLastBlock ? null : bLastLastBlock.id.toString(),
					shadow: false,
					inputs: {},
					fields: Object.fromEntries(bfields)
				};
				branchBlock.inputs = Object.fromEntries([...await Promise.all(bDefinition[0]
						.filter(a => a)
						.filter(a => Array.isArray(a) && a[0])
						.map(
							async (inp, i) => {
								lastBlock = branchBlock;
								return (await arg2input(level, inp, branchNode.args[i], branchChildren, scope)).inputs
							}
						)
					), ...binputs]);
				if (bDefinition[1] == 'hat') {
					if (!topLevel)
						throw 'Hat is allowed in top-level';
					if (branchNode.branches.length > 1)
						throw 'Hat can only have 1 branch';
					const processedBranchNodes = [];
					const branch = branchNode.branches[0]
					if (!noLast) lastBlock = branchBlock;
					for (let i = 0; i < branch.length; i++) {
						const node = branch[i];
						processedBranchNodes.push(await processNode(level + 1, node, false, false, i == 0, scope))
					}
					const branchBlocks = new PartialBlockCollection(
						processedBranchNodes
					)
					branchChildren.push(branchBlocks)
					const firstBranchChild = branchBlocks.children[0] as BlockCollection<blockBlock> | undefined
					if (firstBranchChild?.block?.id) branchBlock.next = firstBranchChild?.block?.id;
					return new BlockCollection(branchBlock, branchChildren);
				}
				if (!topLevel && !noNext) bLastLastBlock.next = branchBlock.id.toString();
				if (!noLast) lastBlock = branchBlock;
				// const firstBranchChildren: (BlockCollection | undefined)[] = [];
				let branchN = 0;
				for (const branch of branchNode.branches) {
					branchN++;
					const processedBranchNodes = [];
					for (let i = 0; i < branch.length; i++) {
						const node = branch[i];
						processedBranchNodes.push(await processNode(level + 1, node, false, false, i == 0, scope))
					}
					const branchBlocks = new PartialBlockCollection(
						processedBranchNodes
					)
					branchChildren.push(branchBlocks)
					const firstBranchChild = branchBlocks.children[0] as BlockCollection<blockBlock> | undefined
					branchBlock.inputs['SUBSTACK' + (branchN == 1 ? '' : branchN)] = [
						2,
						firstBranchChild?.block?.id
					]
				}
				lastBlock = branchBlock;
				return new BlockCollection(branchBlock, branchChildren);

			case 'ListDeclaration':
				const listDeclNode = node as ListDeclarationNode;
				const lid: string = genVarId(listDeclNode.identifier);
				if (listDeclNode.vtype == 'global')
					sprite.globalLists.set(listDeclNode.identifier, [lid, listDeclNode.value.map(n => (n as LiteralNode).value.toString())])
				else sprite.lists.set(listDeclNode.identifier, [lid, listDeclNode.value.map(n => (n as LiteralNode).value.toString())]);
				return new PartialBlockCollection([]) as BlockCollection;

			case 'VariableDeclaration':
				const varDeclNode = node as VariableDeclarationNode;
				let id: string;
				if (!(sprite.globalVariables.has(varDeclNode.identifier) || sprite.variables.has(varDeclNode.identifier))) {
					id = genVarId(varDeclNode.identifier);
					if (varDeclNode.vtype == 'global')
						sprite.globalVariables.set(varDeclNode.identifier, id)
					else sprite.variables.set(varDeclNode.identifier, id);
				} else id = sprite.globalVariables.get(varDeclNode.identifier) ?? sprite.variables.get(varDeclNode.identifier)!
				const varDeclChildren: PartialBlockCollection[] = [];
				const varDeclBlock: jsonBlock = {
					opcode: 'data_setvariableto',
					...blk,
					id: thisBlockID.toString(),
					parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
					inputs: {
						'VALUE': ((await arg2input(level, 
							blockDefinitions.data_setvariableto[0][1],
							varDeclNode.value,
							varDeclChildren,
							scope,
							thisBlockID.toString()
						)).inputs)[1] as json.Input
					},
					fields: {
						"VARIABLE": [
							varDeclNode.identifier,
							id
						]
					},
				}
				// console.log(lastBlock)
				if (!topLevel && !noNext) lastBlock.next = varDeclBlock.id.toString();
				if (!noLast) lastBlock = varDeclBlock;
				return new BlockCollection(varDeclBlock, varDeclChildren);

			case "Assignment":
				const varAssignmentNode = node as AssignmentNode;
				const sid = sprite.variables.get(varAssignmentNode.identifier)
					?? sprite.globalVariables.get(varAssignmentNode.identifier);
				// const global =
				// 	sprite.globalVariables.has(varAssignmentNode.identifier);
				if (!sid) throw `unknown var "${varAssignmentNode.identifier}"`
				const varAssignmentChildren: PartialBlockCollection[] = [];
				const varAssignmentBlock: jsonBlock = {
					opcode: 'data_setvariableto',
					...blk,
					id: thisBlockID.toString(),
					inputs: {
						'VALUE': ((await arg2input(level, 
							blockDefinitions.data_setvariableto[0][1],
							varAssignmentNode.value,
							varAssignmentChildren,
							scope,
							thisBlockID.toString(),
						)).inputs)[1] as json.Input
					},
					fields: {
						"VARIABLE": [
							varAssignmentNode.identifier,
							sid
						]
					},
					parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
				}
				if (!topLevel && !noNext) lastBlock.next = varAssignmentBlock.id.toString();
				if (!noLast) lastBlock = varAssignmentBlock;
				return new BlockCollection(varAssignmentBlock, varAssignmentChildren);

			case "Identifier":
				const identifierNode = node as IdentifierNode;
				// console.debug(scope)
				if (scope.identifierBlocks.has(identifierNode.name)) {
					const bl = scope.identifierBlocks.get(identifierNode.name);
					if (!bl) throw 'how the fuck';
					const blo = bl(thisBlockID);
					if (!Array.isArray(blo))
						(blo as blockBlock).parent = lastBlock.id;
					return new BlockCollection(
						blo,
						[]
					);
				}
				const vid = sprite.variables.get(identifierNode.name)
					?? sprite.globalVariables.get(identifierNode.name);
				const lisid = sprite.lists.get(identifierNode.name)
					?? sprite.globalLists.get(identifierNode.name);
				if (!vid && !lisid) {
					// console.log(sprite.globalVariables)
					throw new Error(`Unknown variable "${identifierNode.name}"`)
				}
				if (!vid && lisid)
					return new BlockCollection({
						id: thisBlockID,
						data: [13, identifierNode.name, lisid[0]]
					}, []);
				if (!vid) throw 'uh';
				return new BlockCollection({
					id: thisBlockID,
					data: [12, identifierNode.name, vid]
				}, []);


			case "FunctionDeclaration":
				const fndNode = node as FunctionDeclarationNode;
				if (!topLevel) throw 'fn definition only in top level'
				const fndBlocks: jsonBlock[] = [];
				const fndChildren: BlockCollection[] = [];

				if ('x' in blk) delete blk.x;
				if ('y' in blk) delete blk.y;

				const prototype: jsonBlock = {
					opcode: 'procedures_prototype',
					...blk,
					next: null,
					id: genId(blockID).toString(),
					inputs: {},
					shadow: true
				}

				if (!preprocessFnDecl)
					blockID++;

				const definitionId = genId(blockID).toString();

				const argumentids = [];
				const argumentdefaults = [];
				const argumentnames = [];
				const sc = scope.duplicate();
				for (const arg of fndNode.params) {
					const argid = genUid();
					argumentids.push(argid)
					argumentnames.push(arg);
					argumentdefaults.push('');

					if (!preprocessFnDecl)
						blockID++;

					const inputBlock: jsonBlock = {
						opcode: "argument_reporter_string_number",
						...blk,
						next: null,
						id: genId(blockID).toString(),
						fields: {
							VALUE: [arg, null]
						},
						parent: prototype.id,
						shadow: true
					}

					fndBlocks.push(inputBlock)

					sc.identifierBlocks.set(arg, id => {
						return {
							...inputBlock,
							id
						}
					})

					prototype.inputs[argid] = [1, inputBlock.id]
				}

				const mutation = prototype.mutation = {
					tagName: 'mutation',
					children: [],
					proccode: fndNode.name + ` %s`.repeat(fndNode.params.length),
					argumentids: JSON.stringify(argumentids),
					argumentnames: JSON.stringify(argumentnames),
					argumentdefaults: JSON.stringify(argumentdefaults),
					warp: JSON.stringify(fndNode.warp)
				}

				sprite.customBlocks[fndNode.name] = {
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

				for (const node of fndNode.body) {
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

			case 'Return':
				// if (!blockDefinitions.procedures_return)
				// 	//TODO: maybe do a fake return thing via a variable
				// 	throw 'you need to have procedures_return in order to use return (make sure you\'re using pm-blocks)'
				const returnNode = node as ReturnNode;
				const returnChildren: PartialBlockCollection[] = [];
				if (lastCustomBlock)
					lastCustomBlock.opcode = 'procedures_definition_return';
				if (lastPrototypeBlock)	{
					lastPrototypeBlock.mutation.returns = 'true';
					lastPrototypeBlock.mutation.optype = '"string"';
				}
				const returnBlock: jsonBlock = {
					opcode: 'procedures_return',
					...blk,
					id: thisBlockID.toString(),
					inputs: {
						'return': ((await arg2input(level, 
							{
								name: 'return',
								type: 1,
							},
							returnNode.value,
							returnChildren,
							scope
						)).inputs)[1] as json.Input
					},
					fields: {},
					parent: topLevel || !lastBlock ? null : lastBlock.id.toString(),
				}
				if (!topLevel && !noNext) lastBlock.next = returnBlock.id.toString();
				if (!noLast) lastBlock = returnBlock;
				return new BlockCollection(returnBlock, returnChildren);

			//TODO: do other nodes

			default:
				throw `Unimplemented (${node.type})`
		}

	}

	for (const node of ast) {
		if (node.type != 'FunctionDeclaration')
			continue;
		//preprocess function declarations
		await processNode(0, node, true, false, false, new Scope(), true);
	}

	for (const node of ast) {
		const coll = await processNode(0, node, true);
		const unfurled = coll.unfurl()
		// console.log(coll, unfurled)
		blocks.push(...unfurled)
	}

	return [blocks, sprite]
}