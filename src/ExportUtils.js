export function escapeId(id) {
	var ret = id
		.replace(/ /g, '_SPACE_')
	;
	if(id.length > 1) {
		ret = ret
			.replace(/\[/g, '_LSQUARE_')
			.replace(/]/g, '_RSQUARE_')
		;
	}
	return ret;
}

function actualLength(s) {
	//return new Blob([s]).size;	// no Blobs in nodejs without third parties libraries
	return (new TextEncoder().encode(s)).length;
}

function pad(target, length) {
	return target + '\0'.repeat(length - actualLength(target));
}

function write(value, length) {
	return value + '\0'.repeat(length - actualLength(value));
}

export function createTarEntry(filename, contents, mode = "0000644", mtime = "00000000000", uid = "0000000", gid = "0000000") {
	var ret = "";
	// name
	ret += write(filename, 100);
	// mode
	ret += write(mode, 8);
	// owner uid
	ret += write(uid, 8);
	// group gid
	ret += write(gid, 8);
	// file size (octal)
	ret += write(actualLength(contents).toString(8), 12);
	// last modification time (octal)
	ret += write(mtime, 12);
	var checksumOffset = actualLength(ret);
	// checksum
	ret += write("        ", 8);
	// link indicator
	ret += write("0", 1);
	// linked file name
	ret += write("", 100);
	ret = pad(ret, 512);

	var checksum = Array.prototype.map.call(ret,
		e => e.charCodeAt(0)
	).reduce((a, b) => a + b).toString(8).padStart(6, "0") + '\0 ';
	ret = ret.slice(0, checksumOffset) + checksum + ret.slice(checksumOffset + 8);

	ret += contents;

	ret = pad(ret, (Math.floor((actualLength(ret) - 1) / 512) + 1) * 512);
	return ret;
}

export function mult(p) {	// p is property or param
	const m = p.multiplicity;
	if(m) {
		const lower = m.lower ?? 0;
		const upper = m.upper;
		if(lower === 0 && upper < 0) {
			return "[*]";
		} else if(lower === upper) {
			if(lower === 1) {
				return "";
			}else {
				return `[${upper}]`;
			}
		} else {
			return `[${lower}..${upper < 0 ? "*" : upper}]`;
		}
	} else {
		return "";
	}
}
