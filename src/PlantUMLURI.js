import {} from './lib/pako.min.js';

function encode64(data) {
       var r = "";
        for (var i=0; i<data.length; i+=3) {
                if (i+2==data.length) {
                        r +=append3bytes(data.charCodeAt(i), data.charCodeAt(i+1), 0);
                } else if (i+1==data.length) {
                        r += append3bytes(data.charCodeAt(i), 0, 0);
                } else {
                        r += append3bytes(data.charCodeAt(i), data.charCodeAt(i+1), data.charCodeAt(i+2));
                }
        }
        return r;
}

function append3bytes(b1, b2, b3) {
        var c1 = b1 >> 2;
        var c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
        var c3 = ((b2 & 0xF) << 2) | (b3 >> 6);
        var c4 = b3 & 0x3F;
        var r = "";
        r += encode6bit(c1 & 0x3F);
        r += encode6bit(c2 & 0x3F);
        r += encode6bit(c3 & 0x3F);
        r += encode6bit(c4 & 0x3F);
        return r;
}

function encode6bit(b) {
        if (b < 10) {
                return String.fromCharCode(48 + b);
        }
        b -= 10;
        if (b < 26) {
                return String.fromCharCode(65 + b);
        }
        b -= 26;
        if (b < 26) {
                return String.fromCharCode(97 + b);
        }
        b -= 26;
        if (b == 0) {
                return '-';
        }
        if (b == 1) {
                return '_';
        }
        return '?';
}

export function toPlantUMLURI(pu, text) {
	var e = encode64(
		// using pako instead of RawDeflate, which is buggy (it sometimes generates invalid compressed streams) although it is recommended on the PlantUML website
		pako.deflateRaw(
			// do we need to convert to UTF-8 using something like unescape(encodeURIComponent(text))?, apparently no
//			unescape(encodeURIComponent(
				text
//			))
			,{level: 9, to: 'string'}
		)
	);
	var uri = pu + 'svg/' + e;
	return uri;
}

