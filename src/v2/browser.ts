// deno-lint-ignore-file no-window no-var
// the new and improved tosh !
// now using targets instead of projects !
import { Lexer, Parser } from "../tshv2/main.ts";
//import { Project, SpriteScope, StageScope } from "./oop_block.ts";
import getSpriteGlobals from "../getGlobalVars.ts";
import ASTtoBlocks, { Environment, jsonBlock } from "../asttoblocks.ts";
import * as json from '../jsontypes.ts'
import { blockBlock } from "../main.ts";
import blocks from "../blocks.ts";
//import { parseArgs } from "jsr:@std/cli/parse-args";
//const flags = parseArgs(Deno.args, {
//    boolean: ["r"],
//    // string: ["version"],
//    // default: { color: true },
//    // negatable: ["color"],
//});

//console.log(flags)
//
//const dir: string = path.resolve(flags._ ? String(flags._) : 0 || Deno.cwd() || '.');
//const retro = flags.r;

interface BackslashInterface {
	bsl_error_info: AstError | LexerError | undefined;
	bsl_globals: Map<string, [Record<string, string>, Record<string, [string, string[]]>]>;
	preprocess_globals(code: string, identifier: string): void
	compile_bsl(code: string, identifier: string): Promise<Record<string, json.jsonBlockNoId>>
}

interface ErrorInfo {
	kind: 'ast' | 'lexer'
}

interface AstError extends ErrorInfo {
	kind: 'ast',
	from: [number, number]
	to: [number, number]
	error: string
}

interface LexerError extends ErrorInfo {
	kind: 'lexer',
	location: [number, number]
	error: string
}

declare global {
	var bsl_globals: Map<string, [Record<string, string>, Record<string, [string, string[]]>]>;
	function preprocess_globals(code: string, identifier: string): void
	function compile_bsl(code: string, identifier: string): Promise<Record<string, json.jsonBlockNoId>>
	var Backslash: BackslashInterface & Record<string, any>
	var bsl_error_info: AstError | LexerError | undefined
}

const globals: Map<string, [Record<string, string>, Record<string, [string, string[]]>]> = 
    globalThis.bsl_globals = 
    new Map();

function getLocaiton(code: string, pos: number): [number, number] {
	let line = 0, char = 0;
	for (let i = 0; i < pos; i++) {
		if (code[i]) {
			line++;
			char = 0;
			continue;
		}
		char++;
	}
	return [line, char]
}

globalThis.preprocess_globals =
function preprocess_globals(code: string, identifier: string) {
	globalThis.bsl_error_info = globalThis.Backslash.bsl_error_info = undefined;
    const lexer = new Lexer(code);
    let tokens;
	try {
		tokens = lexer.tokenize();
	} catch (error) {
		globalThis.bsl_error_info = globalThis.Backslash.bsl_error_info = {
			kind: 'lexer',
			error: String(error),
			location: getLocaiton(code, lexer.position)
		};
		return;
	}
    const parser = new Parser(tokens, code);
    let ast;
    try {
        ast = parser.parse();
    } catch (error) {
        // console.error(error)
        // console.log('at', parser.position, '\n'+tokens
        //     .map((a, i) => i == parser.position ? `${i} ${a.type}(${a.value}) <--` : `${i} ${a.type}(${a.value})`)
        //     .filter((_, i) => Math.abs(parser.position - i) < 5)
        //     .join('\n')
        // )
        // throw 'error during parsing'
		globalThis.bsl_error_info = globalThis.Backslash.bsl_error_info = {
			kind: 'ast',
			error: String(error),
			from: getLocaiton(code, tokens[parser.position].start),
			to: getLocaiton(code, tokens[parser.position].end),
		};
		return;
    }
    const newGlobalsList = getSpriteGlobals(ast, {}, {});
    globals.set(identifier, newGlobalsList)
}
globalThis.compile_bsl =
async function compile_bsl(code: string, identifier: string): Promise<Record<string, json.jsonBlockNoId>> {
    if (globals.has(identifier))
        globals.delete(identifier);
    let [lastGlobalVariables, lastGlobalLists] = [{},{}];
    for (const [v, l] of globals.values()) {
        lastGlobalLists = {
            ...lastGlobalLists,
            ...l
        };
        lastGlobalVariables = {
            ...lastGlobalVariables,
            ...v
        }
    }
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, code);
    let ast;
    try {
        ast = parser.parse();
    } catch (error) {
        console.error(error)
        console.log('at', parser.position, '\n'+tokens
            .map((a, i) => i == parser.position ? `${i} ${a.type}(${a.value}) <--` : `${i} ${a.type}(${a.value})`)
            .filter((_, i) => Math.abs(parser.position - i) < 5)
            .join('\n')
        )
        throw 'error during parsing'
    }
    const newGlobalsList = getSpriteGlobals(ast, lastGlobalVariables, lastGlobalLists);
    let [uniqueVars, uniqueLists]:
        [Record<string, string>, Record<string, [string, string[]]>]
        = [{}, {}];
    function find_unique<T>(a:Record<string,T>,source:Record<string,T>) {
        const unique: Record<string, T> = {};
        for (const key in a) {
            if (!Object.hasOwn(a, key)) continue;
            if (typeof source[key] !== 'undefined') continue;
            unique[key] = a[key];
        }
        return unique
    }
    uniqueLists = find_unique(newGlobalsList[1], lastGlobalLists)
    uniqueVars = find_unique(newGlobalsList[0], lastGlobalVariables)
    // console.debug('new globals:', newGlobals);
    //[lastGlobalVariables, lastGlobalLists] = newGlobals;

    globals.set(identifier, [uniqueVars, uniqueLists])

    const [blockaroonies, _env]: [jsonBlock[], Environment] = await ASTtoBlocks(
        ast,
        '',
        lastGlobalVariables,
        lastGlobalLists,
    );

    function removeId(a: blockBlock): json.Block {
        const b: json.Block & { id?: string } = a
        delete b.id;
        return b
    }
    console.debug(blockaroonies)
    return Object.fromEntries(blockaroonies.map<[string, json.jsonBlockNoId]>(b => [b.id, 'data' in b ? b.data : removeId(b)]))
}

globalThis.Backslash = {
	bsl_globals,
	compile_bsl,
	preprocess_globals,
	bsl_error_info: undefined,
	blocks
}
