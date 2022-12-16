import {diffInternal} from './Utils.js';

export const defaultRule = Symbol("default");

export function transform(ast, rules = {}, context, typeProp = "type") {
	function transObject(e) {
		return Object.fromEntries(Object.entries(e).map(([key, value]) =>
			[
				key,
				typeof value === "object"
				?	trans(value)
				:	value
			]
		));
	}
	function trans(e) {
		if(e === null) {
			return null;
		} else if(e === undefined) {
			return undefined;
		} else if(typeof e === "string") {
			return e;
		} else if(typeof e === "number") {
			return e;
		} else if(e instanceof Array) {
			return e.map(trans);
		} else if(e[typeProp] in rules) {
			return rules[e[typeProp]](e, (o) => e === o ? transObject(e) : trans(o), context);
		} else if(defaultRule in rules) {
			rules[defaultRule](e, (o) => e === o ? transObject(e) : trans(o), context);
		} else {
			return transObject(e);
		}
	}
	return trans(ast);
}

const debugAll = false;
export function matches(ast, pattern, ignore = {}, path = [], debugUnmatched = false) {
	const {ignoreKey = () => false, ignoreNode = () => false} = ignore;
	function rec(ast, pattern, path) {
		const ret = matches(ast, pattern, ignore, path, debugUnmatched);
		if(debugUnmatched && !ret) {
			console.log("unmatched:", ast, pattern, path);
		}
		return ret;
	}
	if(debugAll) console.log("matching", ast, pattern);
	if(ast === null && pattern === null) {
		if(debugAll) console.log("\t=>", true);
		return true;
	} else if(ast === null || pattern === null) {
		if(debugUnmatched) console.log("unmatched:", ast, pattern, "\t=>", false);
		return false;
	} else if(Array.isArray(ast) && Array.isArray(pattern)) {
		if(pattern.length <= ast.length) {
			const ret = pattern.map((e, i) =>
				rec(ast[i], e, [...path, i])
			).every(e => e);
			if(debugAll) console.log("\t=>", ret);
			return ret;
		} else {
			if(debugAll) console.log("\t=>", false);
			if(debugUnmatched) console.log("unmatched length:", ast.length, pattern.length, "\t=>", false, path);

			// showing differences nonetheless
			ast.map((e, i) =>
				rec(e, pattern[i], [...path, i])
			).every(e => e);

			return false;
		}
	} else if(Array.isArray(ast) && ast.every(ignoreNode)) {
		return true;
	} else if(Array.isArray(pattern) && pattern.every(ignoreNode)) {
		return true;
	} else if(typeof ast === "object" && ignoreNode(ast)) {
		return true;
	} else if(typeof pattern === "object" && ignoreNode(pattern)) {
		return true;
	} else if(typeof ast === "object" && typeof pattern === "object") {
		if(ignoreNode(pattern) || ignoreNode(ast)) {
			return true;
		} else {
			const ret = Object.entries(pattern).filter(([n, v]) =>
				//!(n.startsWith("__") && n.endsWith("__"))
				!ignoreKey(n)
			).map(([n, v]) =>
				rec(ast[n], v, [...path, n])
			).every(e => e);
			if(debugAll) console.log("\t=>", ret);
			return ret;
		}
	} else {
		const ret = ast === pattern;
		if(debugAll) console.log("\t=>", ret);
		if(debugUnmatched && !ret && typeof ast === "string" && typeof pattern === "string") {
			console.log(diffInternal(ast, pattern));
		}
		return ret;
	}
}
