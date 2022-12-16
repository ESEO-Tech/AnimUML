
const debug = !true;

// TODO: add connection timeout with setTimeout
export const RemoteEngine = {
	connect(url, handlers) {
		return new Promise((resolve, reject) => {
			var ws = new WebSocket(url);
			const queue = []
			ws.onclose = () => {
				handlers?.onclose?.();
				queue.forEach(({reject}) => reject("WebSocket was closed while waiting for a response"));
			};
/*
			ws.onerror = (event) => {
				if(debug) console.log("WebSocket error", event);
				reject(event);
			};
/**/
			ws.onopen = () => {
				if(debug) console.log("Websocket open");
				resolve(new function() {
					function send(msg) {
						if(debug) console.log("To remote engine: ", msg);
						ws.send(msg);
					}
					async function receive() {
						return new Promise((resolve, reject) => {
							queue.push({resolve, reject});
						});
					}
					ws.onmessage = async (e) => {
						if(debug) console.log("From remote engine: ", e.data)
						const {resolve} = queue.shift();
						if(resolve) {
							resolve(e.data);
						} else {
							console.log("Unexpected message from remote engine: %s", e.data);
						}
					};
					this.reset = () => {
						send("RESET");
					};
					this.getConfiguration = async () => {
						var ret = receive();
						send("GET_CONFIGURATION");
						return ret;
					};
					// TODO: evaluateAtoms to avoid sending multiple requests (to improve performance)
					this.evaluateAtom = async (atom) => {
						var ret = receive();
						send(`EVALUATE_ATOMS:${atom}`);
						return ret.then((e) => JSON.parse(e)[0]);
					};
					this.getFireables = async () => {
						var ret = receive().then(async n => {
							var ret = [];
							for(var i = 0 ; i < n ; i++) {
								ret.push(await receive());
							}
							return ret;
						});
						send("GET_FIREABLES");
						return ret;
					};
					this.setConfiguration = (config) => {
						send('SET_CONFIGURATION');
						send(config);
					};
					this.fire = (trans) => {
						send('FIRE');
						send(trans);
					};
					this.parseTransition = (transition) => {
						var ret = receive();
						send("PARSE_TRANSITION");
						send(transition);
						return ret;
					};
					function parseConfig(config) {
						var ret = receive();
						send("PARSE_CONFIGURATION");
						send(config);
						return ret;
					}
					this.parseConfiguration = async (config) => {
						if(this.useHash) {
							// experiment that computes a key (only for testExecution tests)
							if(config.arrayBuffer) {
								// necessary in browser, but not in node
								config = await config.arrayBuffer();
							}
							return String.fromCharCode.apply(null, new Uint8Array(await crypto.subtle.digest(this.useHash, config)));
						} else {
							return await parseConfig(config);
						}
					};
					this.showConfiguration = async (config) => {
						var parsedConfig = await parseConfig(config);
						return JSON.parse(parsedConfig);
					};
					this.showTransition = async (transition) => {
						const parsed = await this.parseTransition(transition);
						try {
							const ret = JSON.parse(parsed);
							return ret;
						} catch(e) {
							return parsed;
						}
					};
					this.close = () => {
						ws.close();
					};
					Object.assign(this, {
						get modelName() {
							return url;
						},
						get name() {
							return "RemoteEngine";
						},
					});
				});
			};
		});
	}
};

