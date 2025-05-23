// https://github.com/tlaceby/guide-to-interpreters-series
// -----------------------------------------------------------
// ---------------          LEXER          -------------------
// ---  Responsible for producing tokens from the source   ---
// -----------------------------------------------------------

// Represents tokens that our language understands in parsing.
export enum TokenType {
    // Literal Types
    Null,
    Number,
    Identifier,

    // Keywords
    Var,

    // Grouping * Operators
    BinaryOperator,
    Equals,
    OpenParen,
    CloseParen,
    OpenBrace,
    CloseBrace,
    Comma,
    Dot,
    EOF, // Signified the end of file
}

/**
 * Constant lookup for keywords and known identifiers + symbols.
 */
const KEYWORDS: Record<string, TokenType> = {
    var: TokenType.Var,
    null: TokenType.Null
};

// Reoresents a single token from the source-code.
export interface Token {
    value: string; // contains the raw value as seen inside the source code.
    type: TokenType; // tagged structure.
}

// Returns a token of a given type and value
function token(value = "", type: TokenType): Token {
    return { value, type };
}

/**
 * Returns whether the character passed in alphabetic -> [a-zA-Z]
 */
function isalpha(src: string) {
    return src.toUpperCase() != src.toLowerCase();
}

/**
 * Returns true if the character is whitespace like -> [\s, \t, \n]
 */
function isskippable(str: string) {
    return str == " " || str == "\n" || str == "\t";
}

/**
 Return whether the character is a valid integer -> [0-9]
 */
function isint(str: string) {
    const c = str.charCodeAt(0);
    const bounds = ["0".charCodeAt(0), "9".charCodeAt(0)];
    return c >= bounds[0] && c <= bounds[1];
}

/**
 * Given a string representing source code: Produce tokens and handles
 * possible unidentified characters.
 *
 * - Returns a array of tokens.
 * - Does not modify the incoming string.
 */
export function tokenize(sourceCode: string): Token[] {
    const tokens = new Array<Token>();
    const src = sourceCode.split("");

    // produce tokens until the EOF is reached.
    while (src.length > 0) {
        // BEGIN PARSING ONE CHARACTER TOKENS
        switch (src[0]) {
            case ',':
                tokens.push(token(src.shift(), TokenType.Comma));
                break;
            case '.':
                tokens.push(token(src.shift(), TokenType.Comma));
                break;
            case '(':
                tokens.push(token(src.shift(), TokenType.OpenParen));
                break;
            case ')':
                tokens.push(token(src.shift(), TokenType.CloseParen));
                break;
            case '{':
                tokens.push(token(src.shift(), TokenType.OpenBrace));
                break;
            case '}':
                tokens.push(token(src.shift(), TokenType.CloseBrace));
                break;
            case "+":
            case "-":
            case "*":
            case "/":
            case "%":
                tokens.push(token(src.shift(), TokenType.BinaryOperator));
                break;
            case '=':
                tokens.push(token(src.shift(), TokenType.Equals));
                break;
        
            default:
                // Handle numeric literals -> Integers
                if (isint(src[0])) {
                    let num = "";
                    while (src.length > 0 && isint(src[0])) {
                        num += src.shift();
                    }
    
                    // append new numeric token.
                    tokens.push(token(num, TokenType.Number));
                } // Handle Identifier & Keyword Tokens.
                else if (isalpha(src[0])) {
                    let ident = "";
                    while (src.length > 0 && isalpha(src[0])) {
                        ident += src.shift();
                    }
    
                    // CHECK FOR RESERVED KEYWORDS
                    const reserved = KEYWORDS[ident];
                    // If value is not undefined then the identifier is
                    // reconized keyword
                    if (typeof reserved == 'number') {
                        tokens.push(token(ident, reserved));
                    } else {
                        // Unreconized name must mean user defined symbol.
                        tokens.push(token(ident, TokenType.Identifier));
                    }
                } else if (isskippable(src[0])) {
                    // Skip uneeded chars.
                    src.shift();
                } // Handle unreconized characters.
                // TODO: Impliment better errors and error recovery.
                else {
                    console.error(
                        "Unreconized character found in source: ",
                        src[0].charCodeAt(0),
                        src[0],
                    );
                    Deno.exit(1);
                }
                break;
        }
    }

    tokens.push({ type: TokenType.EOF, value: "EndOfFile" });
    return tokens;
}