// import { timestamp } from "https://jsr.io/@std/yaml/1.0.6/_type/timestamp.ts";
//TODO - add explicit arg/field defintion
// Token types
export enum TokenType {
	VAR			= "VAR",
	FN			= "FN",
	WARP_FN		= "WFN",
	IDENTIFIER	= "IDENTIFIER",
	NUMBER		= "NUMBER",
	ASSIGN		= "ASSIGN",
	LPAREN		= "LPAREN",
	RPAREN		= "RPAREN",
	LBRACE		= "LBRACE",
	RBRACE		= "RBRACE",
	COMMA		= "COMMA",
	BINOP		= "BINOP",
	STRING		= "STRING",
	IF			= "IF",
	FOR			= "FOR",
	ELSE		= "ELSE",
	EOF			= "EOF",
	GREATER		= "GREATER",
	GREENFLAG	= "GREENFLAG",
	INCLUDE		= "INCLUDE",
	LIST		= "LIST",
	NOT			= "NOT",
	RETURN		= "RETURN",
	ASSIGNBINOP	= "ASSIGNBINOP",
	LBRACKET	= "LBRAKET",
	RBRACKET	= "RBRAKET",
	COLON_THINGY= "COLON_THINGY"
}

export interface Token {
	type: TokenType;
	value: string;
	line: number
}

// Lexer
export class Lexer {
	private source: string;
	private position: number = 0;

	constructor(source: string) {
		this.source = source;
	}

	private isAlpha(char: string): boolean {
		return /[a-zA-Z_#]/.test(char);
	}

	private isDigit(char: string): boolean {
		return /-?[\d\.]/.test(char);
	}

	private isWhitespace(char: string): boolean {
		return /\s/.test(char);
	}

	private advance(): string {
		return this.source[this.position++];
	}

	private peek(offset: number = 0): string {
		return this.source[this.position + offset] || "";
	}

	private match(expected: string): boolean {
		if (this.peek() === expected) {
			this.position++;
			return true;
		}
		return false;
	}

	tokenize(): Token[] {
		const tokens: Token[] = [];

		let inComment = false;
		let global = 0;
		let line = 0;
		let start = 0;

		while (this.position < this.source.length) {
			const char = this.advance();
			if (char == '\n') line++

			if (global > 0) global--;

			if (inComment) {
				if (char == '\n') inComment = false;
				continue;
			} else if (char == '/' && this.peek() == '/') {
				inComment = true
			} else if (this.isWhitespace(char)) {
				continue;
			} else if (this.isAlpha(char)) {
				let identifier = char;
				start = this.position;
				while (this.isAlpha(this.peek()) || this.isDigit(this.peek())) {
					identifier += this.advance();
				}

				if 		(identifier.toLowerCase() === "#include")	tokens.push({ line, type: TokenType.INCLUDE, value: identifier })
				else if	(identifier === 'return')	tokens.push({ line, type: TokenType.RETURN, value: identifier })
				else if	(identifier === "var")		tokens.push({ line, type: TokenType.VAR, value: global > 0 ? 'global' : identifier });
				else if	(identifier === "list")		tokens.push({ line, type: TokenType.LIST, value: global > 0 ? 'global' : identifier });
				else if	(identifier === "global")	global = 3;
				else if	(identifier === "fn")		tokens.push({ line, type: TokenType.FN, value: identifier });
				else if	(identifier === "warp")		tokens.push({ line, type: TokenType.WARP_FN, value: identifier })
				else if	(identifier === "if")		tokens.push({ line, type: TokenType.IF, value: identifier });
				else if	(identifier === "for")		tokens.push({ line, type: TokenType.FOR, value: identifier });
				else if	(identifier === "gf")		tokens.push({ line, type: TokenType.GREENFLAG, value: identifier });
				else if	(identifier === "start")	tokens.push({ line, type: TokenType.GREENFLAG, value: identifier });
				else if	(identifier === "else")		tokens.push({ line, type: TokenType.ELSE, value: identifier });
				else 								tokens.push({ line, type: TokenType.IDENTIFIER, value: identifier });
			} else if (this.isDigit(char)) {
				let number = char;
				start = this.position;
				while (this.isDigit(this.peek())) {
					number += this.advance();
				}
				tokens.push({ line, type: TokenType.NUMBER, value: number });
			} else if (char === '"') {
				start = this.position;
				let string = "";
				while (
					!(
						(this.peek() == '"' && this.peek(-1) !== '\\')
						|| this.peek() == ""
					)
				) {
					// console.log(this.position, this.peek(), this.peek(-1))
					string += this.advance();
				}
				if (!this.match('"')) {
					throw new Error("Unterminated string");
				}
				tokens.push({ line, type: TokenType.STRING, value: string });
			} else if (char === "(") tokens.push({ line, type: TokenType.LPAREN, value: char });
			else if (char === ")")   tokens.push({ line, type: TokenType.RPAREN, value: char });
			else if (char === "{")   tokens.push({ line, type: TokenType.LBRACE, value: char });
			else if (char === "}")   tokens.push({ line, type: TokenType.RBRACE, value: char });
			else if (char === "[")   tokens.push({ line, type: TokenType.LBRACKET, value: char });
			else if (char === "]")   tokens.push({ line, type: TokenType.RBRACKET, value: char });
			else if (char === ",")   tokens.push({ line, type: TokenType.COMMA,  value: char });
			else if (char === ":" && this.peek() === ':') {
				tokens.push({ line, type: TokenType.COLON_THINGY, value: '+=' });
				this.advance();
			}
			else if (char === "+" && this.peek() === '=') {
				tokens.push({ line, type: TokenType.ASSIGNBINOP, value: '+=' });
				this.advance();
			}
			else if (char === "-" && this.peek() === '=') {
				tokens.push({ line, type: TokenType.ASSIGNBINOP, value: '-=' });
				this.advance();
			}
			else if (char === "/" && this.peek() === '=') {
				tokens.push({ line, type: TokenType.ASSIGNBINOP, value: '/=' });
				this.advance();
			}
			else if (char === "*" && this.peek() === '=') {
				tokens.push({ line, type: TokenType.ASSIGNBINOP, value: '*=' });
				this.advance();
			}
			else if (char === "%" && this.peek() === '=') {
				tokens.push({ line, type: TokenType.ASSIGNBINOP, value: '%=' });
				this.advance();
			}
			else if (char === "+")   tokens.push({ line, type: TokenType.BINOP,  value: char });
			else if (char === "-")   tokens.push({ line, type: TokenType.BINOP,  value: char });
			else if (char === "*")   tokens.push({ line, type: TokenType.BINOP,  value: char });
			else if (char === "/")   tokens.push({ line, type: TokenType.BINOP,  value: char });
			else if (char === "%")   tokens.push({ line, type: TokenType.BINOP,  value: char });
			else if (char === "=" && this.peek() === '=') {
				tokens.push({ line, type: TokenType.BINOP, value: char });
				this.advance();
			}
			else if (char === "&" && this.peek() === '&') {
				tokens.push({ line, type: TokenType.BINOP, value: char });
				this.advance();
			}
			else if (char === "!" && this.peek() === '=') {
				tokens.push({ line, type: TokenType.BINOP, value: '!=' });
				this.advance();
			}
			else if (char === "<" && this.peek() === '=') {
				tokens.push({ line, type: TokenType.BINOP, value: '<=' });
				this.advance();
			}
			else if (char === ">" && this.peek() === '=') {
				tokens.push({ line, type: TokenType.BINOP, value: '>=' });
				this.advance();
			}
			else if (char === ">")	tokens.push({ line, type: TokenType.BINOP, value: char });
			else if (char === "<")	tokens.push({ line, type: TokenType.BINOP, value: char });
			else if (char === "=")	tokens.push({ line, type: TokenType.ASSIGN, value: char });
			else if (char === "!")	tokens.push({ line, type: TokenType.NOT,    value: char });
			else {
				throw new Error(`Unexpected character: ${char} on line ${line+1}\n${
					this.source.split('').filter((_,i)=>Math.abs(i-this.position) <= 6).join('')
				}\n     ^`);
			}
		}

		tokens.push({ line, type: TokenType.EOF, value: "" });
		return tokens;
	}
}

// AST Nodes
export type NodeType = "VariableDeclaration" |
	"FunctionDeclaration" |
	"Assignment" |
	"BinaryExpression" |
	"Not" |
	"Literal" |
	"Identifier" |
	"FunctionCall" |
	"BranchFunctionCall" |
	"StartBlock" |
	"If" |
	"For" |
	"GreenFlag" |
	"Boolean" |
	"Include" |
	"ListDeclaration" |
	"Return" |
	"ObjectAccess" |
	"ObjectMethodCall"

export interface ASTNode {
	type: string;
}

export interface VariableDeclarationNode extends ASTNode {
	type: "VariableDeclaration";
	identifier: string;
	value: ASTNode;
	vtype: 'var' | 'global'
}

export interface FunctionDeclarationNode extends ASTNode {
	type: "FunctionDeclaration";
	name: string;
	params: string[];
	body: ASTNode[];
	/** run without screen refresh */
	warp: boolean;
}

export interface AssignmentNode extends ASTNode {
	type: "Assignment";
	identifier: string;
	value: ASTNode;
}

export interface BinaryExpressionNode extends ASTNode {
	type: "BinaryExpression";
	operator: string;
	left: ASTNode;
	right: ASTNode;
}

export interface NotNode extends ASTNode {
	type: "Not";
	body: ASTNode;
}

export interface LiteralNode extends ASTNode {
	type: "Literal";
	value: string | number;
}

export interface IdentifierNode extends ASTNode {
	type: "Identifier";
	name: string;
}

export interface FunctionCallNode extends ASTNode {
	type: "FunctionCall";
	identifier: string;
	args: ASTNode[];
}

export interface BranchFunctionCallNode extends ASTNode {
	type: "BranchFunctionCall";
	identifier: string;
	args: ASTNode[];
	branches: ASTNode[][];
}

export interface StartBlockNode extends ASTNode {
	type: "StartBlock";
	body: ASTNode[];
}

export interface IfNode extends ASTNode {
	type: "If";
	condition: ASTNode;
	thenBranch: ASTNode[];
	elseBranch?: ASTNode[];
}

export interface ForNode extends ASTNode {
	type: "For";
	times: ASTNode;
	varname: ASTNode;
	branch: ASTNode[];
}

export interface GreenFlagNode extends ASTNode {
	type: "GreenFlag";
	branch: ASTNode[];
}

export interface BooleanNode extends ASTNode {
	type: "Boolean";
	value: boolean;
}

export interface IncludeNode extends ASTNode {
	type: "Include";
	itype: string;
	path: string;
}

export interface ListDeclarationNode extends ASTNode {
	type: "ListDeclaration";
	identifier: string;
	value: ASTNode[];
	vtype: 'list' | 'global'
}

export interface ReturnNode extends ASTNode {
	type: "Return";
	value: ASTNode;
}

export interface ObjectAccessNode extends ASTNode {
	type: "ObjectAccess";
	object: ASTNode;
	property: string;
}

export interface ObjectMethodCallNode extends ASTNode {
	type: "ObjectMethodCall";
	object: ASTNode;
	method: string;
	args: ASTNode[];
}

export type Node = VariableDeclarationNode |
	FunctionDeclarationNode |
	AssignmentNode |
	BinaryExpressionNode |
	NotNode |
	LiteralNode |
	IdentifierNode |
	FunctionCallNode |
	BranchFunctionCallNode |
	StartBlockNode |
	IfNode |
	ForNode |
	GreenFlagNode |
	BooleanNode |
	IncludeNode |
	ListDeclarationNode |
	ReturnNode |
	ObjectAccessNode |
	ObjectMethodCallNode


// Parser
export class Parser {
	private tokens: Token[];
	private source: string;
	position: number = 0;
	localVars: string[] = [];
	globalVars: string[] = [];
	traces: boolean = true;

	constructor(tokens: Token[], source: string) {
		this.tokens = tokens;
		this.source = source;
	}

	private peek(ahead = 0): Token {
		return this.tokens[this.position + ahead];
	}

	private trace(error: string, line: number) {
		if (!this.traces) return error;
		return this.source.split('\n')
			.map(l => l.replace(/^\s*/, ''))
			.map((t, l) => `${l+1} | ${t}`)
			.map((t, l) => {
				if (l != line)
					return t;
				return `${t}\n${' '.repeat(l.toString().length)} | ^ ${error}`
			})
			.filter((_, l) => Math.abs(l - line) < 4)
			.join('\n')
	}

	private advance(): Token {
		return this.tokens[this.position++];
	}

	private match(...types: TokenType[]): boolean {
		if (types.includes(this.peek().type)) {
			this.advance();
			return true;
		}
		return false;
	}

	private matchTk(types: TokenType[], token = this.peek()): boolean {
		if (types.includes(token.type)) {
			return true;
		}
		return false;
	}

	private expect(type: TokenType, errorMessage: string): Token {
		if (this.peek().type === type) {
			return this.advance();
		}
		// let ch = 0;
		// const line = 
		// 	(this.source.split('\n')
		// 		.map((l, i) => {
		// 			ch += l.length
		// 			return {
		// 				start: ch - l.length,
		// 				len: l.length,
		// 				i,
		// 				l,
		// 			}
		// 		})
		// 		.find((l) => l.start <= this.position
		// 			&& l.start + l.len >= this.position))
		// const positionInLine = this.position - (line ? (
		// 	line.start
		// ) : 0);
		// // if (line)
		// // 	positionInLine - (line.l.length - line.l.replace(/^\s*/,'').length)
		// // console.error('trace: tokens', this.tokens, '\nIDX:', this.position);
		// const trace = this.source.split('\n')
		// 	.map(l => l.replace(/^\s*/, ''))
		// 	.map((t, l) => `${l+1} | ${t}`)
		// 	.map((t, l) => {
		// 		if (l != this.peek().line)
		// 			return t;
		// 		return `${t}\n${' '.repeat(l.toString().length)} |${' '.repeat(positionInLine)}^ ${errorMessage}`
		// 	})
		// 	.filter((_, l) => Math.abs(l - this.peek().line) < 4)

		throw new Error(this.trace(errorMessage, this.peek().line));
	}


	parse(): ASTNode[] {
		const nodes: ASTNode[] = [];
		while (this.peek().type !== TokenType.EOF) {
			nodes.push(this.parseStatement());
		}
		return nodes;
	}

	private parseStatement(): ASTNode {
		if (this.match(TokenType.VAR)) {
			const node = this.peek(-1);
			const type = node.value
			const identifier = this.expect(TokenType.IDENTIFIER, "Expected variable name").value;
			if (type == 'global')
				this.globalVars.push(identifier);
			else this.localVars.push(identifier);
			this.expect(TokenType.ASSIGN, "Expected '=' after variable name");
			const value = this.parseAssignment();
			return { type: "VariableDeclaration", identifier, value, vtype: type } as VariableDeclarationNode;
		}

		if (this.match(TokenType.LIST)) {
			const type = this.peek(-1).value
			const identifier = this.expect(TokenType.IDENTIFIER, "Expected list name").value;
			this.expect(TokenType.ASSIGN, "Expected '=' after list name");
			const value: ASTNode[] = [];

			this.expect(TokenType.LBRACE, "Expected {array} as list value")

			while (!this.match(TokenType.RBRACE, TokenType.EOF)) {
				value.push(this.parsePrimary());
				this.match(TokenType.COMMA)
			}
			if (!this.peek()) throw 'reached EOF'

			return { type: "ListDeclaration", identifier, value, vtype: type } as ListDeclarationNode;
		}

		if (this.match(TokenType.INCLUDE)) {
			if (this.expect(TokenType.BINOP, 'Expected < after #include').value !== '<')
				throw new Error("Expected < after #include");
			const itype = this.expect(TokenType.STRING, 'Expected string (type)').value;
			const path = this.expect(TokenType.STRING, 'Expected string (path)').value;
			if (this.expect(TokenType.BINOP, 'Expected > after include statement').value !== '>')
				throw new Error("Expected > after include statement");
			return { itype, path, type: "Include" } as IncludeNode;
		}

		function doFn(this: Parser, warp: boolean): FunctionDeclarationNode {
			const name = this.expect(TokenType.IDENTIFIER, "Expected function name").value;
			this.expect(TokenType.LPAREN, "Expected '(' after function name");
			const params: string[] = [];
			if (!this.match(TokenType.RPAREN)) {
				do {
					params.push(this.expect(TokenType.IDENTIFIER, "Expected parameter name").value);
				} while (this.match(TokenType.COMMA));
				this.expect(TokenType.RPAREN, "Expected ')' after parameters");
			}
			this.expect(TokenType.LBRACE, "Expected '{' before function body");
			const body = this.parseBlock();
			return { type: "FunctionDeclaration", name, params, body, warp } as FunctionDeclarationNode;
		}

		if (this.match(TokenType.WARP_FN)) {
			this.expect(TokenType.FN, "Expected 'fn' after 'warp'");
			return doFn.call(this, true)
		}

		if (this.match(TokenType.FN)) {
			return doFn.call(this, false)
		}


		if (this.match(TokenType.IF)) {
			this.expect(TokenType.LPAREN, "Expected '(' after 'if'");
			const condition = this.parseAssignment();
			this.expect(TokenType.RPAREN, "Expected ')' after if condition");
			this.expect(TokenType.LBRACE, "Expected '{' after if condition");
			const thenBranch = this.parseBlock();
			let elseBranch: ASTNode[] | undefined;
			if (this.match(TokenType.ELSE)) {
				this.expect(TokenType.LBRACE, "Expected '{' after 'else'");
				elseBranch = this.parseBlock();
			}
			return { type: "If", condition, thenBranch, elseBranch } as IfNode;
		}


		if (this.match(TokenType.FOR)) {
			this.expect(TokenType.LPAREN, "Expected '(' after 'for'");
			const varname = this.parseAssignment();
			const of = this.expect(TokenType.IDENTIFIER, 'expected of');
			if (of.value !== 'of') throw new Error('expected of');
			const times = this.parseAssignment();
			this.expect(TokenType.RPAREN, "Expected ')' after for");
			this.expect(TokenType.LBRACE, "Expected '{' after for");
			const branch = this.parseBlock();

			return { type: "For", varname, times, branch } as ForNode;
		}

		if (this.match(TokenType.GREENFLAG)) {
			this.expect(TokenType.LBRACE, "Expected '{' after greenflag");
			const branch = this.parseBlock();

			return { type: "GreenFlag", branch } as GreenFlagNode;
		}

		if (this.match(TokenType.RETURN)) {
			const value = this.parseCall();

			return { type: "Return", value } as ReturnNode;
		}

		return this.parseAssignment();
	}


	private parseBlock(): ASTNode[] {
		const nodes: ASTNode[] = [];

		while (!this.match(TokenType.RBRACE)) {
			nodes.push(this.parseStatement());
		}

		return nodes;
	}

	private parseAssignment(): ASTNode {
		if (this.match(TokenType.NOT)) {
			return {
				type: 'Not',
				body: this.parseAssignment(),
			} as NotNode
		}
		const expr = this.parseBinaryExpression();
		if (this.match(TokenType.ASSIGN)) {
			if (expr.type !== "Identifier")
				throw new Error("Invalid assignment target; expected an identifier");
			const value = this.parseAssignment();
			return { type: "Assignment", identifier: (expr as IdentifierNode).name, value } as AssignmentNode;
		}
		if (this.peek().type == TokenType.ASSIGNBINOP) {
			const uh = this.advance();
			//FIXME - prolly would be better to put this in asttoblocks
			if (expr.type !== "Identifier")
				throw new Error("Invalid assignment target; expected an identifier");
			const value = this.parseAssignment();
			return { type: "Assignment", identifier: (expr as IdentifierNode).name, value: {
				type: 'BinaryExpression',
				left: {
					type: 'Identifier',
					name: (expr as IdentifierNode).name
				} as IdentifierNode,
				right: value,
				operator: uh.value[0]
			} as BinaryExpressionNode} as AssignmentNode;
		}
		return expr;
	}

	private parseBinaryExpression(): ASTNode {
		let left = this.parseCall();

		while (this.peek().type === TokenType.BINOP || this.peek().type === TokenType.GREATER) {
			const operator = this.advance().value;
			const right = this.parseCall();
			left = { type: "BinaryExpression", operator, left, right } as BinaryExpressionNode;
		}
		return left;
	}

	private parseCall(): ASTNode {
		let expr = this.parsePrimary();

		while (this.peek().type === TokenType.LPAREN) {
			expr = this.finishCall(expr);
		}
		return expr;
	}

	private finishCall(callee: ASTNode, allowBranch: false): FunctionCallNode
	private finishCall(callee: ASTNode, allowBranch?: true): BranchFunctionCallNode | FunctionCallNode
	private finishCall(callee: ASTNode, allowBranch = true): BranchFunctionCallNode | FunctionCallNode {
		// console.log(this.peek())
		this.expect(TokenType.LPAREN, "Expected '(' after function name");
		const args: ASTNode[] = [];
		if (this.peek().type !== TokenType.RPAREN) {
			do {
				args.push(this.parseAssignment());
			} while (this.match(TokenType.COMMA));
		}
		this.expect(TokenType.RPAREN, "Expected ')' after arguments");


		if (this.peek().type === TokenType.LBRACE) {
			if (!allowBranch)
				throw 'Branch function calls are not allowed in the current context'
			const branches: ASTNode[][] = [];
			do {
				this.expect(TokenType.LBRACE, "Expected '{' for branch block");
				branches.push(this.parseBlock());
			} while (this.peek().type === TokenType.LBRACE);

			if (callee.type !== "Identifier")
				throw new Error("Branch function call expects an identifier");
			return {
				type: "BranchFunctionCall",
				identifier: (callee as IdentifierNode).name,
				args,
				branches,
			} as BranchFunctionCallNode;
		}


		if (callee.type !== "Identifier")
			throw new Error("Function call expects an identifier");
		return {
			type: "FunctionCall",
			identifier: (callee as IdentifierNode).name,
			args,
		} as FunctionCallNode;
	}

	private parsePrimary(allowOther = true): ASTNode {
		const token = this.peek();

		if (this.match(TokenType.NUMBER)) {
			return { type: "Literal", value: Number(token.value) } as LiteralNode;
		}

		if (this.match(TokenType.STRING)) {
			return { type: "Literal", value: token.value.replace(/\\(.)/g, (m, s) => {
				if (s == '\\')
					return '\\';
				if (s == '"')
					return '"';
				if (s == 'n')
					return '\n';
				if (s == 'r')
					return '\r';
				return m;
			}) } as LiteralNode;
		}

		if (this.match(TokenType.IDENTIFIER) && allowOther) {
			if (["True", "true", "False", "false"].includes(token.value)) {
				return {
					type: "Boolean",
					value: token.value === "True" || token.value === "true"
				} as BooleanNode;
			}
			let returnValue: IdentifierNode | ObjectAccessNode | ObjectMethodCallNode = {
				type: "Identifier",
				name: token.value
			} as IdentifierNode
			while (this.matchTk([TokenType.COLON_THINGY])) {
				this.advance();
				const identifier = this.expect(TokenType.IDENTIFIER, "Expected identifier after OOP dereferencer");
				if (this.matchTk([TokenType.LPAREN])) {
					const fnCallNode = this.finishCall(returnValue, false);
					returnValue = {
						object: returnValue,
						type: 'ObjectMethodCall',
						args: fnCallNode.args,
						method: identifier.value
					} as ObjectMethodCallNode
					continue;
				}
				returnValue = {
					object: returnValue,
					property: identifier.value,
					type: 'ObjectAccess'
				} as ObjectAccessNode
			}
			return returnValue;
		}

		if (this.match(TokenType.LPAREN) && allowOther) {
			const expr = this.parseAssignment();
			this.expect(TokenType.RPAREN, "Expected ')' after expression");
			return expr;
		}

		if (this.peek().type == TokenType.BINOP && this.peek(1).type == TokenType.NUMBER) {
			const operator = this.expect(TokenType.BINOP, 'uh oh').value
			const right = this.parseCall();
			const left: LiteralNode = {
				type: 'Literal',
				value: 0
			}
			return { type: "BinaryExpression", operator, left, right } as BinaryExpressionNode;
		}

		throw new Error(this.trace(`Unexpected token: ${token.type}`, token.line));
	}
}
