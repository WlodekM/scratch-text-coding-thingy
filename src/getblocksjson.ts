globalThis.aditionalImports = async function () {
	await import('./base.js')
}
const blockaroonies = await import('./blocks.ts');

console.log(JSON.stringify(blockaroonies.default));
Deno.exit(0)
