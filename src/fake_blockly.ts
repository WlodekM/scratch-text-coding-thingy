import fs from 'node:fs'
import path from 'node:path'
//#nobrowser
// if (!is_browser) {
// console.log(import.meta.dirname, 'askjfsikjs', path.resolve(import.meta.dirname, `../pm-blocks`))
const dirname = import.meta.dirname;
if (!dirname) throw 'dirname is undefined';
let blocksRoot =
	fs.existsSync(path.resolve(dirname, `../../pm-blocks`)) ?
	path.resolve(dirname, `../../pm-blocks`) :
	path.join(dirname, `../../tw-blocks`)
if (!blocksRoot.startsWith('/') && !blocksRoot.match(/^[A-Z]:/))
	blocksRoot = './' + blocksRoot;
//@ts-ignore:
globalThis.blocksRoot = blocksRoot;

if (!fs.existsSync(blocksRoot))
	throw `you forgot to clone the submodules. do git submodule update --init --recursive`

await import(`${blocksRoot}/msg/js/en.js`);

await import(`${blocksRoot}/core/constants.js`);
await import(`${blocksRoot}/core/colours.js`);


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
// }
//#endnobrowser
export const blockly = Blockly
declare global {
	function aditionalImports(): void | Promise<void>
}
//#nobrowser
if (globalThis.aditionalImports && typeof globalThis.aditionalImports == 'function') {
	await globalThis.aditionalImports()
}
//#endnobrowser
