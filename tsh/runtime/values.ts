export type ValueTypes = "null" | "number" | "boolean";

export interface RuntimeValue {
    type: ValueTypes
}

export interface NullValue extends RuntimeValue {
    type: 'null',
    value: null
}

export interface BooleanValue extends RuntimeValue {
    type: 'boolean',
    value: boolean
}

export interface NumberValue extends RuntimeValue {
    type: 'number',
    value: number
}

export function MK_NUMBER(number = 0): NumberValue {
    return {
        type: 'number',
        value: number
    }
}

export function MK_BOOL(value: boolean): BooleanValue {
    return {
        type: 'boolean',
        value: value
    }
}