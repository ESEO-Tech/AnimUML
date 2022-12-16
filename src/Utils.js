export function debug(value, ...msg) {
	if(hasElements(msg)) {
		console.log.apply(console, [msg, [value]].flatMap(e => e));
	} else {
		console.log(value);
	}
	return value;
}
export function entryNameComparator(a, b) {
	a = a[0];
	b = b[0];
	return a < b ? -1 : (a > b ? 1 : 0);
}

export function unique(a) {
	return Array.from(new Set(a));
}
export function last(array) {
	// this looks simpler, but creates a temporary one-element array
	//return array.slice(-1)[0];
	return array[array.length - 1];
}

export function indentEsc(s, indent = '    ') {
//*	// removing common whitespace prefix
	// or should we do this when loading to avoid doing it again and again? but that would break reexport tests
	const parts = s?.split("\n");
	if(parts?.length > 0) {
		const ignoreFirst = parts[0] === "" && parts.length > 1;
		const prefix = parts[ignoreFirst ? 1 : 0].replace(/[^ \t].*$/, "");
		const regex = new RegExp(`^${prefix}`);
		s = parts.map(part => 
			part.replace(regex, "")
		).join("\n");
	}
/**/
	const ret = s && s
		.replace(/\\/g, '\\\\')
		.replace(/\n/g, '\\n' + indent)
		.replace(/{/g, "<U+007B>")	// works except in tooltip
		//.replace(/{/g, "&#007B;")	// does not work because behaves like {

		.replace(/\\n/g, "\\l")
		.replace(/__/g, "~__")		// to escape creole style
	;
	return ret?.trimEnd();
}

export function zip(a, b) {
	return a.map((ae, i) => [ae, b[i]]);
}

export function diffInternal(expectedJSON, actualJSON) {

	function zipWith(a, b, f) {
		return zip(a, b).map(([ae, be], i) => f(ae, be, i));
	}
/*
	var ret1 = "";
	var ret2 = "";
	zip(expectedJSON.split(""), actualJSON.split(""), (a, b, i) => {
		if(a !== b || ret1 !== "") {
			if(ret1 === "") {
				ret1 = ret2 = `...[${i}]:`;
			}
			ret1 += a;
			ret2 += b;
		}
	});
/*/
	var i = 0;
	zipWith(expectedJSON.split(""), actualJSON.split(""), (a, b, i) => a === b).every(e => e && ++i);
	var ret1 = expectedJSON.slice(i);
	var ret2 = actualJSON.slice(i);
/**/
	return [ret1, ret2];
}


export function forEachEntry(o, callback) {
	if(o) {
		for(const [k, v] of Object.entries(o)) {
			callback(k, v);
		}
	}
}

export async function forEachEntryAsync(o, callback) {
	if(o) {
		for(const [k, v] of Object.entries(o)) {
			await callback(k, v);
		}
	}
}

export async function forEachAsync(as, callback) {
	for(const a of as) {
		await callback(a);
	}
}

export function hasElements(a) {
	return a && a.length && a.length > 0;
}

export function remove(array, element) {
	var index = array.indexOf(element);
	if(index >= 0) {
		array.splice(index, 1);
	}
}


// UI Utils
// TODO: move to a separate module?
export function getSelected(select) {
	return select.selectedOptions[0]?.innerText;
}

export function exportSymbols(getSymbol, ...symbols) {
	for(const symbol of symbols) {
		const value =
			//self[symbol];
			getSymbol(symbol);
		//console.log("exporting ", symbol, value)
		globalThis[symbol] = value;
	}
}

export function groupBy(array, getKey) {
	return array.reduce((acc, e) => {
		const key = getKey(e);
		return {
			...acc,
			[key]: (acc[key] || []).concat([e]),
		};
	}, {});
}

export function sortBy(array, lambda) {
	return array.sort((a, b) => {
		const la = lambda(a);
		const lb = lambda(b);
		return la < lb ?
			-1
		:(la > lb ?
			1
		:
			0
		);
	});
}

export function cartesian(...xss) {
	if(xss.length === 1) {
		if(xss[0].length) {
			return xss;
		} else {
			return [];
		}
	} else {
		// xs is the accumulator
		// ys is the current value
		return xss.reduce((xs, ys) =>
			xs.flatMap(x =>
				ys.map(y =>
					[x, y]
				)
			)
		);
	}
}

export async function asyncMap(array, f) {
	const ret = [];
	for(const e of array) {
		ret.push(await f(e));
	}
	return ret;
}

export function firstToUpper(s) {
	return s[0].toUpperCase() + s.slice(1);
}

