// base blocks, for including in ur projects
const blocksRoot = globalThis.blocksRoot ?? 'tw-blocks'
await import(`${blocksRoot}/blocks_vertical/control.js`);
await import(`${blocksRoot}/blocks_vertical/event.js`);
await import(`${blocksRoot}/blocks_vertical/looks.js`);
await import(`${blocksRoot}/blocks_vertical/motion.js`);
await import(`${blocksRoot}/blocks_vertical/operators.js`);
await import(`${blocksRoot}/blocks_vertical/sound.js`);
await import(`${blocksRoot}/blocks_vertical/sensing.js`);
// no data.js since that gets auto-imported as it is needed for var declaration