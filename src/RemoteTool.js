// One ToolController can control many Tools running on the same server
// However, it does not hurt to create several ToolControllers if convenient

const debugRemoteTool = false;
export class ToolController {
	constructor(url) {
		var resolveReply;
		var ws = new Promise((resolve, reject) => {
			var ws = new WebSocket(url);
			ws.onopen = () => resolve(ws);
			ws.onmessage = (e) => {
				resolveReply && resolveReply(e.data);
				resolveReply = undefined;
			};
		});
		this.askCommands = async () => {
			return new Promise(async (resolve, reject) => {
				resolveReply = resolve;
				this.sendCommand("ASK_COMMANDS");
			}).then(JSON.parse);
		};
		this.sendCommand = async (...command) => {
			const cmd = JSON.stringify(command);
//console.log("Sending: ", cmd);
			(await ws).send(cmd);
		};
		this.close = async () => {
			(await ws).close();
		};
	}
}

// Work in progress
export class Tool {
	constructor(url, handlers) {
		var ws = new WebSocket(url);
		const queue = [];
		function send(msg) {
			if(debugRemoteTool) console.log("To tool: ", msg);
			ws.send(msg);
		}
		async function receive() {
			return new Promise((resolve, reject) => {
				queue.push(resolve);
			});
		}
		this.close = () => {
			// TODO: reject pending requests in queue (as in RemoteEngine)?
			ws.close();
		};

		ws.onerror = function (error) {
			console.log('WebSocket Error: %s', error);
		};

		ws.onclose = function() {
			handlers?.onclose?.();
		};

		// problem: WebSockets do not await on their "onmessage"
		// solution: chain actions as promises
		var previous = Promise.resolve();
		ws.onmessage = (e) => {
			if(debugRemoteTool) console.log("From tool: ", e.data)
			function process() {
//				console.log("Processing: ", e.data)
				const resolve = queue.shift();
				if(resolve) {
//					console.log("Resolving: ", e.data)
					resolve(e.data);
/*
					if(e.data instanceof Blob) {
						e.data.text().then((d) => {
							console.log("received: ", d);
						});
					} else {
						console.log("received: ", e.data);
					}
*/
				} else {
//					console.log("Handling: ", e.data)
					var parts = e.data.split(":");
					var cmd = parts[0];
					var args = parts.slice(1).join(":");
					switch(String(cmd)) {
						case "RESET": {
							this.engine.reset();
							break;
						}
						case "GET_CONFIGURATION": {
							previous = previous.then(async () => {
								const config = await this.engine.getConfiguration();
								await send(config);
								if(handlers?.ongetconfig) {
									await handlers.ongetconfig(config);
								};
							});
							break;
						}
						case "PARSE_CONFIGURATION": {
							const config = receive();
							previous = previous.then(async () => {
								send(await this.engine.parseConfiguration(await config));
							});
							break;
						}
						case "GET_FIREABLES": {
							previous = previous.then(async () => {
								const fs = await this.engine.getFireables();
								send("" + fs.length);
								for(const f of fs) {
									send(f);
								}
							});
							break;
						}
						case "PARSE_TRANSITION": {
							const trans = receive();
							previous = previous.then(async () => {
								send(await this.engine.parseTransition(await trans));
							});
							break;
						}
						case "FIRE": {
							const trans = receive();
							previous = previous.then(async () => {
								await this.engine.fire(await trans)
								if(handlers?.onfired) {
									await handlers.onfired(await trans);
								}
							});
							break;
						}
						case "SET_CONFIGURATION": {
							const config = receive();
							previous = previous.then(async () => {
								await this.engine.setConfiguration(await config)
							});
							break;
						}
						case "EVALUATE_ATOMS": {
							previous = previous.then(() =>
								Promise.all(args.split(";").map(async arg => {
									try {
										return await this.engine.evaluateAtom(
											arg
												.replace(/\\\|/g, "|")	// because OBP2 sends escaped '|'
										);
									} catch(e) {
										return false;
									}
								}))
							).then(evaluatedAtoms =>
								send(JSON.stringify(evaluatedAtoms))
							);
							break;
						}
						case "UUID": {
							//handlers && handlers.onuuid && handlers.onuuid(args);
							handlers?.onuuid?.(args);
							//this.uuid = args;
							break;
						}
						case "RESULTS": {
							handlers?.onresults?.(e.data);
							break;
						}
						case "PROGRESS": {
							handlers?.onprogress?.(e.data);
							break;
						}
						default: {
							console.log("Unsupported request from server: %s", e.data);
							break;
						}
					}
				}
			}
			process.bind(this)();
			// TODO: try to use a function like the following one instead of repeatedly assigning to "previous" above
			function next() {
				previous = previous.then(async () => {
					console.log("doing: ", e.data)
					await process.bind(this)()
					console.log("done. ", e.data)
				});
			}
		};
	}
	setEngine(engine) {
		this.engine = engine;
	}
}

