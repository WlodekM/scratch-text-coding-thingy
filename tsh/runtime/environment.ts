import { MK_BOOL, RuntimeValue } from "./values.ts";

export function createGlobalEnv() {
    const env = new Environment();
    // Create Default Global Enviornment
    env.declareVariable("true", MK_BOOL(true));
    env.declareVariable("false", MK_BOOL(false));

    return env;
}

export default class Environment {
    private parent?: Environment;
    private variables: Map<string, RuntimeValue> = new Map();

    constructor(parent?: Environment) {
        this.parent = parent;
    }

    public declareVariable(name: string, value: RuntimeValue): RuntimeValue {
        if (this.variables.has(name)) throw "dumbass, " + name + " already exists you baffon";
        this.variables.set(name, value)
        return value;
    }

    public assignVariable(name: string, value: RuntimeValue): RuntimeValue {
        const env = this.resolve(name)
        env.variables.set(name, value)
        return value;
    }

    public lookupVariable(name: string): RuntimeValue {
        const env = this.resolve(name)
        return env.variables.get(name) as RuntimeValue;
    }

    public resolve(name: string): Environment {
        if (this.variables.has(name)) return this;
        if (this.parent) return this.parent.resolve(name);
        throw 'yo dumbass, ' + name + ' doesnt exist anywhere, you baffon'
    }
}
