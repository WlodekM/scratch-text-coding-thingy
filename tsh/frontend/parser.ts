// deno-lint-ignore-file no-explicit-any
import {
    BinaryExpr,
    Expr,
    Identifier,
    NumericLiteral,
    Program,
    Stmt,
    NullLiteral,
    VariableDeclaraion,
    AssignmentExpr,
    CallExpression,
    MemberExpr
} from "./ast.ts";

import { Token, tokenize, TokenType } from "./lexer.ts";

/**
 * Frontend for producing a valid AST from sourcode
 */
export default class Parser {
    private tokens: Token[] = [];

    /*
     * Determines if the parsing is complete and the END OF FILE Is reached.
     */
    private notEOF(): boolean {
        return this.tokens[0].type != TokenType.EOF;
    }

    /**
     * Returns the currently available token
     */
    private at() {
        return this.tokens[0] as Token;
    }

    /**
     * yummers
     */
    private eat() {
        const prev = this.tokens.shift() as Token;
        return prev;
    }

    /**
     * Returns the previous token and then advances the tokens array to the next value.
     *  Also checks the type of expected token and throws if the values dnot match.
     */
    private expect(type: TokenType, err: any) {
        const prev = this.tokens.shift() as Token;
        if (!prev || prev.type != type) {
            console.error("Parser Error:\n", err, prev, " - Expecting: ", type);
            Deno.exit(1);
        }

        return prev;
    }

    public produceAST(sourceCode: string): Program {
        this.tokens = tokenize(sourceCode);
        const program: Program = {
            kind: "Program",
            body: [],
        };

        console.log(program, this.at())

        // Parse until end of file
        while (this.notEOF()) {
            const a = this.parseStatement()
            console.log(a)
            program.body.push(a);
        }

        return program;
    }

    private parseVarDeclaration(): Stmt {
        this.eat() // eat the var keyword
        const identifier = this.expect(TokenType.Identifier, 'yo dipshit you forgor the var name').value;
        this.expect(TokenType.Equals, 'yo dipshit, where the fuck is the equals')
        const declaration = {
            kind: "VariableDeclaraion",
            identifier,
            value: this.parseExpression()
        } as VariableDeclaraion
        return declaration
    }

    // Handle complex statement types
    private parseStatement(): Stmt {
        switch (this.at().type) {
            case TokenType.Var:
                return this.parseVarDeclaration()

            default:
                return this.parseExpression()
        }
    }

    private parseAssignmentExpression(): Expr {
        const left = this.parseAdditiveExpression()

        if (this.at().type == TokenType.Equals) {
            this.eat() // eat equals
            const value = this.parseAssignmentExpression();
            return { value, assigne: left, kind: "AssignmentExpr" } as AssignmentExpr
        }

        return left;
    }

    // Handle expressions
    private parseExpression(): Expr {
        return this.parseAssignmentExpression();
    }

    // Handle Addition & Subtraction Operations
    private parseAdditiveExpression(): Expr {
        let left = this.parsemultiplicitaveexpr();

        while (this.at().value == "+" || this.at().value == "-") {
            const operator = this.eat().value;
            const right = this.parsemultiplicitaveexpr();
            left = {
                kind: "BinaryExpr",
                left,
                right,
                operator,
            } as BinaryExpr;
        }

        return left;
    }

    private parseMemberExpression(): Expr {
        let object: Expr = this.parsePrimaryExpr();

        while (this.at().type == TokenType.Dot || this.at().type) {
            this.eat()
            const property: Expr = this.parsePrimaryExpr();
            console.log(property)

            if (property.kind != 'Identifier') {
                throw 'yo dumbass what is this, y is this not an identifier'
            }

            object = {
                kind: "MemberExpr",
                object,
                property
            } as MemberExpr
        }

        return object
    }

    private parseArgumentsList(): Expr[] {
        const args = [this.parseExpression()];

        while (this.notEOF()
            && this.at().type == TokenType.Comma
            && this.eat()
        ) {
            args.push(this.parseExpression());
        }

        return args
    }

    private parseArguments(): Expr[] {
        this.expect(TokenType.OpenParen, 'yo dumbshit where is the open parenthesis');
        const args: Expr[] = this.at().type == TokenType.CloseParen
            ? []
            : this.parseArgumentsList();

        this.expect(TokenType.CloseParen, 'where the FUCK is the closing parenthesis after arguments list');

        return args;
    }

    private parseCallExpression(caller: Expr): Expr {
        let callExpression: Expr = {
            kind: 'CallExpression',
            calle: caller,
            arguments: this.parseArguments()
        } as CallExpression;

        if (this.at().type == TokenType.OpenParen)
            callExpression = this.parseCallExpression(callExpression);

        return callExpression
    }

    private parseCallMemberExpression(): Expr {
        const member = this.parseMemberExpression()

        if (this.at().type == TokenType.OpenParen)
            return this.parseCallExpression(member)

        return member
    }

    // Handle Multiplication, Division & Modulo Operations
    private parsemultiplicitaveexpr(): Expr {
        let left = this.parseCallMemberExpression();

        while (
            this.at().value == "/" || this.at().value == "*" || this.at().value == "%"
        ) {
            const operator = this.eat().value;
            const right = this.parseCallMemberExpression();
            left = {
                kind: "BinaryExpr",
                left,
                right,
                operator,
            } as BinaryExpr;
        }

        return left;
    }

    // Orders Of Prescidence
    // AdditiveExpr
    // MultiplicitaveExpr
    // PrimaryExpr

    // Parse Literal Values & Grouping Expressions
    private parsePrimaryExpr(): Expr {
        console.log(this.at())
        const tk = this.at().type;
        console.log(tk, TokenType[tk])

        // Determine which token we are currently at and return literal value
        switch (tk) {
            // User defined values.
            case TokenType.Identifier:
                return { kind: "Identifier", symbol: this.eat().value } as Identifier;

            case TokenType.Null:
                this.eat();
                return { kind: "NullLiteral", value: 'null' } as NullLiteral

            // Constants and Numeric Constants
            case TokenType.Number:
                return {
                    kind: "NumericLiteral",
                    value: parseFloat(this.eat().value),
                } as NumericLiteral;

            // Grouping Expressions
            case TokenType.OpenParen: {
                this.eat(); // eat the opening paren
                const value = this.parseExpression();
                this.expect(
                    TokenType.CloseParen,
                    "Unexpected token found inside parenthesised expression. Expected closing parenthesis.",
                ); // closing paren
                return value;
            }

            // Unidentified Tokens and Invalid Code Reached
            default:
                console.error("yo dumbass, what the fuck is this token", this.at());
                Deno.exit(1);
        }
    }
}