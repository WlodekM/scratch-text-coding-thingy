import { RuntimeValue, NumberValue, NullValue } from './values.ts'
import { AssignmentExpr, BinaryExpr, Identifier, NumericLiteral, Program, Stmt, VariableDeclaraion } from "../frontend/ast.ts";
import Environment from "./environment.ts";

function evaluateProgram (program: Program, env: Environment): RuntimeValue {
    let lastEvaluated: RuntimeValue = { type: "null", value: null } as NullValue;
    for (const statement of program.body) {
        lastEvaluated = evaluate(statement, env)
    }
    return lastEvaluated
}

function evaluateBinaryExpr (binop: BinaryExpr, env: Environment): RuntimeValue {
    const leftSide = evaluate(binop.left, env) as NumberValue;
    const rightSide = evaluate(binop.right, env) as NumberValue;

    if (leftSide.type != 'number' || rightSide.type != 'number') return { type: 'null', value: null} as NullValue;
    
    let result: number = 0;

    switch (binop.operator) {
        case '+':
            result = leftSide.value + rightSide.value
            break;
        
        case '-':
            result = leftSide.value - rightSide.value
            break;

        case '*':
            result = leftSide.value * rightSide.value
            break;

        case '/':
            result = leftSide.value / rightSide.value
            break;
        
        case '%':
            result = leftSide.value % rightSide.value
            break;
    }
    return { type: 'number', value: result } as NumberValue
}

function evaluateIdentifier(identifier: Identifier, env: Environment): RuntimeValue {
    const val = env.lookupVariable(identifier.symbol);
    return val;
}

function evalVariableDeclaration(declaration: VariableDeclaraion, env: Environment): RuntimeValue {
    return env.declareVariable(declaration.identifier, evaluate(declaration.value, env))
}

function evaluateAssIgnmentExpression(expression: AssignmentExpr, env: Environment): RuntimeValue {
    if (expression.assigne.kind != 'Identifier')
        throw 'yo dumbass, this isnt dreamberd, you cant asign to numbers';

    const varname = (expression.assigne as Identifier).symbol
    return env.assignVariable(varname, evaluate(expression.value, env))
}

export function evaluate (astNode: Stmt, env: Environment): RuntimeValue {
    switch (astNode.kind) {
        case "NumericLiteral":
            return {
                value: (astNode as NumericLiteral).value,
                type: 'number'
            } as NumberValue
        case 'NullLiteral':
            return {
                value: null,
                type: 'null'
            } as NullValue
        case 'BinaryExpr':
            return evaluateBinaryExpr(astNode as BinaryExpr, env)
        case 'Program':
            return evaluateProgram(astNode as Program, env)
        case 'Identifier':
            return evaluateIdentifier(astNode as Identifier, env)
        case 'VariableDeclaraion':
            return evalVariableDeclaration(astNode as VariableDeclaraion, env)
        case "AssignmentExpr":
            return evaluateAssIgnmentExpression(astNode as AssignmentExpr, env)
        default:
            console.error('not implemented', astNode)
            Deno.exit(1)
    }
}