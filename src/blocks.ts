import fs from "node:fs"
import path from "node:path";
const Blockly = (await import('./get_blockly_shit.js')).default;
// console.log(ScratchBlocksBlock)
// deno-lint-ignore-file no-explicit-any
export interface BaseInput {
    name: string,
    type: number
}

export interface FieldInputA extends BaseInput {
    options: [string, string][],
    variableTypes: string[],
    blocklyType: string
}

export interface FieldInputB extends FieldInputA {
    field: string
}


export interface DropdownInput extends BaseInput {
    variableTypes: string[],
    blocklyType: string
}

type Input = BaseInput | FieldInputA | FieldInputB | DropdownInput

// console.log(import.meta.dirname, 'askjfsikjs', path.resolve(import.meta.dirname, `../pm-blocks`))
//@ts-ignore:
let blocksRoot = fs.existsSync(path.resolve(import.meta.dirname, `../pm-blocks`)) ? path.resolve(import.meta.dirname, `../pm-blocks`) : path.join(import.meta.dirname, `../tw-blocks`)
if (!blocksRoot.startsWith('/') && !blocksRoot.match(/^[A-Z]:/))
    blocksRoot = './' + blocksRoot;
//@ts-ignore:
globalThis.blocksRoot = blocksRoot;

if (!fs.existsSync(blocksRoot))
    throw `you forgot to clone the submodules. do git submodule update --init --recursive`

await import(`${blocksRoot}/msg/js/en.js`);

await import(`${blocksRoot}/core/constants.js`);
await import(`${blocksRoot}/core/colours.js`);

export const blockly = Blockly

//@ts-ignore:
Blockly.scratchBlocksUtils = {generateMutatorShadow(){}}

// await import('./tw-blocks/blocks_vertical/control.js');
await import(`${blocksRoot}/blocks_vertical/event.js`);
// await import('./tw-blocks/blocks_vertical/looks.js');
// await import('./tw-blocks/blocks_vertical/motion.js');
// await import('./tw-blocks/blocks_vertical/operators.js');
// await import('./tw-blocks/blocks_vertical/sound.js');
// await import('./tw-blocks/blocks_vertical/sensing.js');
await import(`${blocksRoot}/blocks_vertical/data.js`);
declare global {
    function aditionalImports(): void | Promise<void>
}
if (globalThis.aditionalImports && typeof globalThis.aditionalImports == 'function') {
    await globalThis.aditionalImports()
}

// this is used for custom blocks
// await import('./tw-blocks/blocks_vertical/procedures.js');

//@ts-expect-error: wut
export function jsBlocksToJSON(jsblocks = Blockly.Blocks) {
    const blocks: Record<string, any> = {};
    for (const [opcode, data] of Object.entries(jsblocks)) {
        let blockdata: any = {};
        const fakeThis = {
            // i think these kinds of block definitions don't have types in tw-types
            jsonInit (data: any) {
                blockdata = data
            },
            appendDummyInput() {
                return {
                    appendField(f: any, id?: string) {
                        if (typeof f == 'string' || !id)
                            return this;
                        if (!blockdata.args0)
                            blockdata.args0 = []
                        blockdata.args0.push({
                            type: 'field_dropdown',
                            name: id,
                        })
                        return this
                    }
                }
            },
            setCategory() {},
            setColour() {},
            setPreviousStatement() {},
            addArgType() {},
            setNextStatement(){},
            //@ts-ignore:
            workspace: Blockly.mainWorkspace,
        };
        (data as any)!.init?.call(fakeThis);
        // if(!blockdata.args1 || blockdata.args1.type == 'field_image') {
        blocks[opcode] = blockdata;
        // }
    }
    
    // console.debug(Object.keys(blocks))

    function process_block([opcode, block]: [string, any]) {
            // console.log(opcode, block)
            try {
                Object.keys(block)
                .filter(a => a.startsWith('args'))
                .map(n => block[n])
                .filter(a => a[0]?.type != 'field_image');
            } catch (error) {
                console.error(block,
                    Object.keys(block)
                    .filter(a => a.startsWith('args'))
                    .map(n => block[n]))
                throw error
            }
            // might probably be [InputThing][]
            const args: InputThing[][] = Object.keys(block)
                .filter(a => a.startsWith('args'))
                .map(n => block[n])
                .filter(a => a[0]?.type != 'field_image');
            type InputThing = {
                type: "input_value" | "input_statement" | "field_variable" | string,
                name: string
                variableTypes?: string[]
                check?: string // might be a pm thing
                options: [string, string][]
            }
            
            if(args.find(sub => sub && Array.isArray(sub) && sub.find(k => k.type == 'input_statement'))) {
                // console.log('branch!!', (args[0] ?? []))
                return [opcode, [
                    (args[0] ?? []).map((arg: any) => {
                        if (arg.type == 'field_dropdown') {
                            return { //TODO - in some way implement this
                                name: arg.name,
                                type: 1,
                                field: arg.name,
                                options: arg.options,
                                variableTypes: arg.variableTypes,
                                blocklyType: arg.type
                            }
                        } else if (arg.type == 'field_image') {
                            return null
                        } else if (arg.type == 'field_variable') {
                            //TODO - implement this in a better way
                            return {
                                name: arg.name,
                                type: 1,
                                options: arg.options,
                                variableTypes: arg.variableTypes,
                                blocklyType: arg.type
                            }
                        } else if (arg.type == 'field_variable_getter') {
                            //TODO - maybe implement this, i mean setting and stuff is done thru syntax but uh
                            return null
                        } else if (arg.type == 'field_numberdropdown') {
                            // this is the list index type, if you didn't know in 2.0 you could
                            // use last, random/all (depending on block) and 3.0
                            // has that too, just no dropdown in the visible block
                            return {
                                name: arg.name,
                                type: 1,
                                variableTypes: arg.variableTypes,
                                blocklyType: arg.type
                            }
                        } else if (arg.type == 'input_statement') {
                            return {}
                        }
                        return {
                            name: arg.name,
                            type: arg.type == 'input_value' ? 1 : (() => {
                                console.error(block, args)
                                throw `Unknown input type ${arg.type} in ${opcode}.${arg.name}`
                            })(),
                            variableTypes: arg.variableTypes,
                            blocklyType: arg.type
                        }
                    }) ?? [], 'branch',
                    args
                        // find branches
                        .filter(sub => sub && Array.isArray(sub) && sub.find(k => k.type == 'input_statement'))
                        // get the uh, branches
                        .reduce((branches, input_collection) => {
                            branches.push(
                                ...input_collection
                                .filter(input => input.type == 'input_statement')
                            );
                            return branches;
                        }, [])
                        // get their names
                        .map(i => i.name)
                ]]
            }
            return [opcode, [((args[0] ?? []).map((arg: any) => {
                if (arg.type == 'field_dropdown') {
                    return { //TODO - in some way implement this
                        name: arg.name,
                        type: 1,
                        field: arg.name,
                        options: arg.options,
                        variableTypes: arg.variableTypes,
                        blocklyType: arg.type
                    }
                } else if (arg.type == 'field_image') {
                    return null
                } else if (arg.type == 'field_variable') {
                    //TODO - implement this in a better way
                    return {
                        name: arg.name,
                        type: 1,
                        field: arg.name,
                        variableTypes: arg.variableTypes,
                        blocklyType: arg.type
                    }
                } else if (arg.type == 'field_variable_getter') {
                    //TODO - maybe implement this, i mean setting and stuff is done thru syntax but uh
                    return null
                } else if (arg.type == 'field_numberdropdown') {
                    // this is the list index type, if you didn't know in 2.0 you could
                    // use last, random/all (depending on block) and 3.0
                    // has that too, just no dropdown in the visible block
                    return {
                        name: arg.name,
                        type: 1,
                        blocklyType: arg.type
                    }
                } else if (arg.type == 'input_statement') {
                    return {}
                } else if (arg.type == 'field_expandable_remove') {
                    // console.log(arg)
                    return {
                        name: arg.name,
                        type: 1,
                        field: arg.name,
                    }
                } else if (arg.type == 'field_expandable_add') {
                    // console.log(arg)
                    return {
                        name: arg.name,
                        type: 1,
                        field: arg.name,
                    }
                } else if (arg.type == 'field_checkbox_original') {
                    // console.log(arg)
                    return {}
                }
                return {
                    name: arg.name,
                    type: arg.type == 'input_value' ? 1 : (() => {
                        console.error(block, args)
                        throw `Unknown input type ${arg.type} in ${opcode}.${arg.name}`
                    })(),
                    variableTypes: arg.variableTypes,
                    blocklyType: arg.type
                }
            }) ?? []), (block.extensions ?? []).includes("shape_hat") ? 'hat' : 'reporter']].filter(a => a != null)
        }
    
    const processedBlocks = Object.fromEntries(
        Object.entries(blocks).map(process_block)
    )
    return processedBlocks
}
export const processedBlocks: Record<string, any[]> = jsBlocksToJSON()

export type Definition = [Input[], string] | [Input[], 'branch', string[]];

export default {
    ...processedBlocks,
    // blocks not in tw here
} as Record<string, Definition>