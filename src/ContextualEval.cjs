// for Node JS
// In a Common JS module to be allowed to use "with", which is forbidden in strict mode (and ECMAScript modules are necessarily strict)
function contextualEval(code, asAsync = false, asFunction = false) {
	return eval(`
		${asFunction || asAsync ? `(${asAsync ? "async " : ""}() => {` : ""}
		with(this) {
			${code};
		}
		${asFunction || asAsync ? "})()" : ""}
	`);
}
globalThis.contextualEval = contextualEval;
function contextualEvalNoWith(code) {
	const oldModule = module;
	module = undefined;
	const ret = eval(code);
	module = oldModule;
	return ret;
}
globalThis.contextualEvalNoWith = contextualEvalNoWith;
