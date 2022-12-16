
export async function getConfigKey(config, engine, parse = false) {
	if(!parse) {
		if(config.arrayBuffer) {
			// necessary in browser, but not in node
			config = await config.arrayBuffer();
		}
/*			// computing a hash is more expensive, but results in less memory usage for large configs
		const ret = String.fromCharCode.apply(null, new Uint8Array(await crypto.subtle.digest(useHash, config)));
		return ret;
/*/
		if(typeof config === "string") {
			return config;
		}
		let dataView = new DataView(config);
		// as shown by the following code, decoding as iso-8859-15 preserves a 1-byte-to-1-char correspondance (even though it cannot be easily encoded back)
		// a=new Array(255).fill().map((e, index) => index); s=new TextDecoder("iso-8859-15").decode(new Uint8Array(a)); new Set(a.map(e => s.charAt(e)))
		let decoder = new TextDecoder("iso-8859-15");
		const ret = decoder.decode(dataView);
		return ret;
/**/
	} else {
		return await engine.parseConfiguration(config);
	}
}

