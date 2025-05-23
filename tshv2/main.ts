// Token types
export enum TokenType {
    VAR = "VAR",
    FN = "FN",
    IDENTIFIER = "IDENTIFIER",
    NUMBER     = "NUMBER",
    ASSIGN     = "ASSIGN",
    LPAREN     = "LPAREN",
    RPAREN     = "RPAREN",
    LBRACE     = "LBRACE",
    RBRACE     = "RBRACE",
    COMMA      = "COMMA",
    BINOP      = "BINOP",
    STRING     = "STRING",
    IF         = "IF",
    FOR        = "FOR",
    ELSE       = "ELSE",
    EOF        = "EOF",
    GREATER    = "GREATER",
    GREENFLAG  = "GREENFLAG",
    INCLUDE    = "INCLUDE",
    LIST       = "LIST"
}

export interface Token {
    type: TokenType;
    value: string;
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

    private peek(): string {
        return this.source[this.position] || "";
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

        while (this.position < this.source.length) {
            const char = this.advance();

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
                while (this.isAlpha(this.peek()) || this.isDigit(this.peek())) {
                    identifier += this.advance();
                }

                if (identifier === "#include") {
                    // while(this.isWhitespace(this.peek()) && this.position < this.source.length) {
                    //     this.advance()
                    // }
                    // if (this.advance() != '<') throw "Expected a < after #include"
                    // let id = ''
                    // while (this.peek() != '>'
                    //     && (this.isAlpha(this.peek()) || this.isDigit(this.peek()))) {
                    //     id += this.advance();
                    // }
                    // if (this.advance() != '>') throw "Expected a > after #include <..."
                    tokens.push({ type: TokenType.INCLUDE, value: identifier });
                } else if (identifier === "var") tokens.push({ type: TokenType.VAR, value: global > 0 ? 'global' : identifier });
                else if (identifier === "list") tokens.push({ type: TokenType.LIST, value: global > 0 ? 'global' : identifier });
                else if (identifier === "global") global = 2;
                else if (identifier === "fn") tokens.push({ type: TokenType.FN, value: identifier });
                else if (identifier === "if") tokens.push({ type: TokenType.IF, value: identifier });
                else if (identifier === "for") tokens.push({ type: TokenType.FOR, value: identifier });
                else if (identifier === "gf") tokens.push({ type: TokenType.GREENFLAG, value: identifier });
                else if (identifier === "start") tokens.push({ type: TokenType.GREENFLAG, value: identifier });
                else if (identifier === "else") tokens.push({ type: TokenType.ELSE, value: identifier });
                else tokens.push({ type: TokenType.IDENTIFIER, value: identifier });
            } else if (this.isDigit(char)) {
                let number = char;
                while (this.isDigit(this.peek())) {
                    number += this.advance();
                }
                tokens.push({ type: TokenType.NUMBER, value: number });
            } else if (char === '"') {
                let string = "";
                while (this.peek() !== '"' && this.peek() !== "") {
                    string += this.advance();
                }
                if (!this.match('"')) {
                    throw new Error("Unterminated string");
                }
                tokens.push({ type: TokenType.STRING, value: string });
            } else if (char === "(") tokens.push({ type: TokenType.LPAREN, value: char });
            else if (char === ")") tokens.push({ type: TokenType.RPAREN, value: char });
            else if (char === "{") tokens.push({ type: TokenType.LBRACE, value: char });
            else if (char === "}") tokens.push({ type: TokenType.RBRACE, value: char });
            else if (char === ",") tokens.push({ type: TokenType.COMMA, value: char });
            else if (char === "+") tokens.push({ type: TokenType.BINOP, value: char });
            else if (char === "-") tokens.push({ type: TokenType.BINOP, value: char });
            else if (char === "*") tokens.push({ type: TokenType.BINOP, value: char });
            else if (char === "/") tokens.push({ type: TokenType.BINOP, value: char });
            else if (char === "%") tokens.push({ type: TokenType.BINOP, value: char });
            else if (char === "=" && this.peek() === '=') {
                tokens.push({ type: TokenType.BINOP, value: char });
                this.advance();
            }
            else if (char === "&" && this.peek() === '&') {
                tokens.push({ type: TokenType.BINOP, value: char });
                this.advance();
            }
            else if (char === "!" && this.peek() === '=') {
                tokens.push({ type: TokenType.BINOP, value: '!=' });
                this.advance();
            }
            else if (char === "<" && this.peek() === '=') {
                tokens.push({ type: TokenType.BINOP, value: '<=' });
                this.advance();
            }
            else if (char === ">" && this.peek() === '=') {
                tokens.push({ type: TokenType.BINOP, value: '>=' });
                this.advance();
            }
            else if (char === ">") tokens.push({ type: TokenType.BINOP, value: char });
            else if (char === "<") tokens.push({ type: TokenType.BINOP, value: char });
            else if (char === "=") tokens.push({ type: TokenType.ASSIGN, value: char });
            else {
                throw new Error(`Unexpected character: ${char}`);
            }
        }

        tokens.push({ type: TokenType.EOF, value: "" });
        return tokens;
    }
}

// AST Nodes
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

// Parser
export class Parser {
    private tokens: Token[];
    private position: number = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    private peek(ahead = 0): Token {
        return this.tokens[this.position + ahead];
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
        console.error('trace: tokens', this.tokens, '\nIDX:', this.position);
        throw new Error(errorMessage);
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
            const type = this.peek(-1).value
            const identifier = this.expect(TokenType.IDENTIFIER, "Expected variable name").value;
            this.expect(TokenType.ASSIGN, "Expected '=' after variable name");
            const value = this.parseAssignment();
            return { type: "VariableDeclaration", identifier, value, vtype: type } as VariableDeclarationNode;
        }

        if (this.match(TokenType.LIST)) {
            const type = this.peek(-1).value
            const identifier = this.expect(TokenType.IDENTIFIER, "Expected list name").value;
            this.expect(TokenType.ASSIGN, "Expected '=' after list name");
            const value = [];

            this.expect(TokenType.LBRACE, "Expected {array} as list value")

            while (!this.match(TokenType.RBRACE) || this.match(TokenType.EOF)) {
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

        if (this.match(TokenType.FN)) {
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
            return { type: "FunctionDeclaration", name, params, body } as FunctionDeclarationNode;
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

        const expr = this.parseBinaryExpression();
        if (this.match(TokenType.ASSIGN)) {
            if (expr.type !== "Identifier")
                throw new Error("Invalid assignment target; expected an identifier");
            const value = this.parseAssignment();
            return { type: "Assignment", identifier: (expr as IdentifierNode).name, value } as AssignmentNode;
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

    private finishCall(callee: ASTNode): ASTNode {


        this.expect(TokenType.LPAREN, "Expected '(' after function name");
        const args: ASTNode[] = [];
        if (this.peek().type !== TokenType.RPAREN) {
            do {
                args.push(this.parseAssignment());
            } while (this.match(TokenType.COMMA));
        }
        this.expect(TokenType.RPAREN, "Expected ')' after arguments");


        if (this.peek().type === TokenType.LBRACE) {
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
            return { type: "Literal", value: token.value } as LiteralNode;
        }

        if (this.match(TokenType.IDENTIFIER) && allowOther) {

            if (["True", "true", "False", "false"].includes(token.value)) {
                return {
                    type: "Boolean",
                    value: token.value === "True" || token.value === "true"
                } as BooleanNode;
            }
            return { type: "Identifier", name: token.value } as IdentifierNode;
        }

        if (this.match(TokenType.LPAREN) && allowOther) {
            const expr = this.parseAssignment();
            this.expect(TokenType.RPAREN, "Expected ')' after expression");
            return expr;
        }

        throw new Error(`Unexpected token: ${token.type}`);
    }
}
