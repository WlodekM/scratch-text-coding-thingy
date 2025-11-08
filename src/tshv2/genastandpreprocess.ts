import { getNodeChildren } from "../getGlobalVars.ts";
import transformAST from "../preprocess.ts";
import { ASTNode, Lexer, Parser } from "./main.ts";

// Example usage
const sourceCode = new TextDecoder().decode(Deno.readFileSync('test.tsh'));

const lexer = new Lexer(sourceCode);
const tokens = lexer.tokenize();
const parser = new Parser(tokens, sourceCode);
console.debug(tokens)
const ast = parser.parse();

const encoder = new TextEncoder();
Deno.writeFileSync('ast.json', encoder.encode(JSON.stringify(ast, null, 2)))

console.log(ast);

const env = {
	customBlocks: {},
	extensions: [],
	globalLists: new Map(),
	globalVariables: new Map(),
	lists: new Map(),
	variables: new Map(),
}

function doThingToNode(node: ASTNode) {
	transformAST(node, env)
	getNodeChildren(node).forEach(doThingToNode)
}

ast.forEach(doThingToNode)
