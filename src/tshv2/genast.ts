import { Lexer, Parser } from "./main.ts";

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
