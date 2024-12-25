// deno-lint-ignore-file no-empty-interface ban-unused-ignore
// https://github.com/tlaceby/guide-to-interpreters-series
// -----------------------------------------------------------
// --------------          AST TYPES        ------------------
// ---     Defines the structure of our languages AST      ---
// -----------------------------------------------------------

export type NodeType =
    | "Program"
    | "VariableDeclaraion"

    // null
    | "NullLiteral"

    // expressions
    | "CallExpression"
    | "AssignmentExpr"
    | "NumericLiteral"
    | "Identifier"
    | "MemberExpr"
    | "BinaryExpr";

/**
 * Statements do not result in a value at runtime.
 They contain one or more expressions internally */
export interface Stmt {
    kind: NodeType;
}

export interface AssignmentExpr extends Expr {
    kind: "AssignmentExpr",
    assigne: Expr,
    value: Expr
}

/**
 * Defines a block which contains many statements.
 * -  Only one program will be contained in a file.
 */
export interface Program extends Stmt {
    kind: "Program";
    body: Stmt[];
}

export interface VariableDeclaraion extends Stmt {
    kind: "VariableDeclaraion";
    identifier: string,
    value: Expr
}

/**  Expressions will result in a value at runtime unlike Statements */
export interface Expr extends Stmt { }

/**
 * A operation with two sides seperated by a operator.
 * Both sides can be ANY Complex Expression.
 * - Supported Operators -> + | - | / | * | %
 */
export interface BinaryExpr extends Expr {
    kind: "BinaryExpr";
    left: Expr;
    right: Expr;
    operator: string; // needs to be of type BinaryOperator
}

export interface CallExpression extends Expr {
    kind: "CallExpression";
    arguments: Expr[];
    calle: Expr;
}

export interface MemberExpr extends Expr {
    kind: "MemberExpr";
    object: Expr;
    property: Expr;
}

// LITERAL / PRIMARY EXPRESSION TYPES
/**
 * Represents a user-defined variable or symbol in source.
 */
export interface Identifier extends Expr {
    kind: "Identifier";
    symbol: string;
}

/**
 * Represents a numeric constant inside the soure code.
 */
export interface NumericLiteral extends Expr {
    kind: "NumericLiteral";
    value: number;
}

/**
 * Represents a numeric constant inside the soure code.
 */
export interface NullLiteral extends Expr {
    kind: "NullLiteral";
    value: "null";
}