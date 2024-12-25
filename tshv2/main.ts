// Token types
export enum TokenType {
    VAR = "VAR",
    FN = "FN",
    IDENTIFIER = "IDENTIFIER",
    NUMBER = "NUMBER",
    ASSIGN = "ASSIGN",
    LPAREN = "LPAREN",
    RPAREN = "RPAREN",
    LBRACE = "LBRACE",
    RBRACE = "RBRACE",
    COMMA = "COMMA",
    BINOP = "BINOP",
    STRING = "STRING",
    IF = "IF",
    FOR = "FOR",
    ELSE = "ELSE",
    EOF = "EOF",
    GREATER = "GREATER",
    GREENFLAG = "GREENFLAG"
}

interface Token {
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
        return /[a-zA-Z_]/.test(char);
    }

    private isDigit(char: string): boolean {
        return /\d/.test(char);
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

        while (this.position < this.source.length) {
            const char = this.advance();

            if (this.isWhitespace(char)) {
                continue;
            } else if (this.isAlpha(char)) {
                let identifier = char;
                while (this.isAlpha(this.peek()) || this.isDigit(this.peek())) {
                    identifier += this.advance();
                }

                if (identifier === "var") tokens.push({ type: TokenType.VAR, value: identifier });
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
            else if (char === "=") tokens.push({ type: TokenType.ASSIGN, value: char });
            else if (char === ">") tokens.push({ type: TokenType.GREATER, value: char });
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

// Parser
export class Parser {
    private tokens: Token[];
    private position: number = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    private peek(): Token {
        return this.tokens[this.position];
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

    private expect(type: TokenType, errorMessage: string): Token {
        if (this.peek().type === type) {
            return this.advance();
        }
        throw new Error(errorMessage);
    }

    parse(): ASTNode[] {
        const nodes: ASTNode[] = [];

        while (this.peek().type !== TokenType.EOF) {
            try {
                nodes.push(this.parseStatement());
            } catch (error) {
                console.error(error, 'at', this.peek());
                throw 'error'
            }
        }

        return nodes;
    }

    private parseStatement(): ASTNode {
        if (this.match(TokenType.VAR)) {
            const identifier = this.expect(TokenType.IDENTIFIER, "Expected variable name").value;
            this.expect(TokenType.ASSIGN, "Expected '=' after variable name");
            const value = this.parseExpression();
            return { type: "VariableDeclaration", identifier, value } as VariableDeclarationNode;
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

        // if (this.match(TokenType.START)) {
        //     this.expect(TokenType.LBRACE, "Expected '{' after start");
        //     const body = this.parseBlock();
        //     return { type: "StartBlock", body } as StartBlockNode;
        // }

        if (this.match(TokenType.IF)) {
            this.expect(TokenType.LPAREN, "Expected '(' after 'if'");
            const condition = this.parseExpression();
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
            const varname = this.parseExpression();
            const of = this.expect(TokenType.IDENTIFIER, 'expected of')
            if(of.value != 'of') throw 'expected of'
            const times = this.parseExpression();
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

        if (this.match(TokenType.IDENTIFIER)) {
            const identifier = this.tokens[this.position - 1].value;
            if (this.match(TokenType.ASSIGN)) {
                const value = this.parseExpression();
                return { type: "Assignment", identifier, value } as AssignmentNode;
            }
        
            if (this.match(TokenType.LPAREN)) {
                const args: ASTNode[] = [];
                if (!this.match(TokenType.RPAREN)) {
                    do {
                        args.push(this.parseExpression());
                    } while (this.match(TokenType.COMMA));
                    this.expect(TokenType.RPAREN, "Expected ')' after arguments");
                }
                return { type: "FunctionCall", identifier, args } as FunctionCallNode;
            }
        }

        throw new Error(`Unexpected token: ${this.peek().type}`);
    }

    private parseBlock(): ASTNode[] {
        const nodes: ASTNode[] = [];

        while (!this.match(TokenType.RBRACE)) {
            nodes.push(this.parseStatement());
        }

        return nodes;
    }

    private parseExpression(): ASTNode {
        let left = this.parsePrimary();

        while (this.match(TokenType.BINOP, TokenType.GREATER)) {
            const operator = this.tokens[this.position - 1].value; // Capture operator
            const right = this.parsePrimary();
            left = { type: "BinaryExpression", operator, left, right } as BinaryExpressionNode;
        }

        return left;
    }

    private parsePrimary(): ASTNode {
        if (this.match(TokenType.NUMBER)) {
            return { type: "Literal", value: Number(this.tokens[this.position - 1].value) } as LiteralNode;
        }

        if (this.match(TokenType.STRING)) {
            return { type: "Literal", value: this.tokens[this.position - 1].value } as LiteralNode;
        }

        if (this.match(TokenType.IDENTIFIER)) {
            return { type: "Identifier", name: this.tokens[this.position - 1].value } as IdentifierNode;
        }

        throw new Error(`Unexpected token: ${this.peek().type}`);
    }
}