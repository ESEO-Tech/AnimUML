export function indent(strings, ...keys) {
	const trimmed = strings[0].replace(/\s*\n/, '');
	const indent = trimmed.replace(/^(\s*)[\s\S]*$/, '$1');
	function removeIndent(s) {
		return s.replace(new RegExp(`^${indent}`, 'mg'), '');
	}
	function reindent(s) {
		if(typeof(s) === "number") {
			return s;
		} else {
			return s.replace(/\n/g, `\n${lastIndent}`);
		}
	}
	function getLastIndent(string) {
		return string.replace(/^[\s\S]*\n/, '');
	}
	var ret = removeIndent(trimmed);
	var lastIndent = getLastIndent(ret);
	keys.forEach((key, i) => {
		var string = removeIndent(strings[i + 1]);
		var key = Array.isArray(key) ?
			key.map(reindent).join(`\n${lastIndent}`)
		:key == 0 || key ?
			reindent(key)
		:
			''
		;
		if(key === '') {
			// remove whole line if nothing else in it
			if(ret.match(/\n\s*$/) && string.match(/^\s*\n/)) {
				ret = ret.replace(/\n\s*$/, '');
				//string = string.replace(/^s*\n/, '');
			}
		} else {
			ret += key;
		}
		if(i == keys.length - 1) {
			// last one
			string = string.trimEnd();
		}
		ret += string;
		// TODO: handle case when last line of string is not all spaces
		lastIndent = getLastIndent(string);
	});
	return ret;
}
