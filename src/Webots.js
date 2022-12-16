import {asyncMap} from './Utils.js';

const RECEIVER = {
	DEFAULT: 0,
	LOGGER: 1,
	WEBOTS: 2,
};
const ORDER = {
	DEFAULT: 0,
	VELOCITY: 1,
	STOP: 2,
	EVENTS: 3,
	RESET: 4,
	CLIENT_CONNECT: 5,
	CLIENT_DISCONNECT: 6,
	LED: 7,
};
const MOTOR = {
	LEFT: 0,
	RIGHT: 1,
	BOTH: 2,
};
export const LED = {
	OFF: 0,
	RED: 1,
	GREEN: 2,
	BLUE: 3,
};
// stub for debugging
export const Webots2 = {
	async connect() {
	},
	setSpeed() {
	},
	async getEvents() {
		return new Promise((resolve) => {
			setTimeout(() => resolve("test"), 10000);
		});
	},
};
export const Webots = {
	async connect({
		url =
			"ws://localhost:10015",
			//"ws://[::1]:10010",
			//"ws://localhost:8091",
		onclose,
	} = {}) {
		// avoid reconnecting if we are already connected
		if(this.ws?.readyState === WebSocket.OPEN) return;

		this.onclose = undefined;
		this.ws?.close();
		this.onclose = onclose;
		return new Promise(async (resolve, reject) => {
			const ws = new WebSocket(url);
			this.ws = ws;
			ws.onerror = (event) => {
				this.onclose = undefined;
				reject(event);
				//console.log(event);
			};

			const queue = [];
			async function receive() {
				return new Promise((resolve, reject) => {
					queue.push({resolve, reject});
				});
			}

			ws.onclose = () => {
				this.onclose?.();
			};
			ws.onmessage = (e) => {
				const {resolve} = queue.shift();
				resolve(e.data);
			};
			ws.onopen = () => {
				this.close = () => {
					ws.close();
				};
				this.send = (receiver, order, motor = 0, motorCommand = 0, led = 0) => {
					const msg = `${receiver},${order},${motor},${motorCommand},${led}`;
					ws.send(msg);
				};
				// -100 <= speed <= 100
				this.setLeftSpeed = (speed) => {
					this.send(RECEIVER.WEBOTS, ORDER.VELOCITY, MOTOR.LEFT, speed);
				};
				this.setRightSpeed = (speed) => {
					this.send(RECEIVER.WEBOTS, ORDER.VELOCITY, MOTOR.RIGHT, speed);
				};
				this.setSpeed = (speed) => {
					this.send(RECEIVER.WEBOTS, ORDER.VELOCITY, MOTOR.BOTH, speed);
				};
				this.resetLeftEncoder = () => {
					this.send(RECEIVER.WEBOTS, ORDER.RESET, MOTOR.LEFT);
				};
				this.resetRightEncoder = () => {
					this.send(RECEIVER.WEBOTS, ORDER.RESET, MOTOR.RIGHT);
				};

				this.getEvents = async () => {
					const ret = receive();
					this.send(RECEIVER.WEBOTS, ORDER.EVENTS);
					return ret;
				};
				this.setLed = (ledState) => {
					this.send(RECEIVER.WEBOTS, ORDER.LED, 0, 0, ledState);
				};
				this.setLedOff = () => {
					this.setLed(LED.OFF);
				};
				this.setLedRed = () => {
					this.setLed(LED.RED);
				};
				this.setLedGreen = () => {
					this.setLed(LED.GREEN);
				};
				this.setLedBlue = () => {
					this.setLed(LED.BLUE);
				};

/*
				// only for testing with an EMI-like server
				this.getConfig = () => {
					const ret = new Promise((resolve, reject) => {
						queue.push({resolve, reject});
					});
					ws.send("GET_CONFIGURATION");
					return ret.then((config) => {	
						const ret = receive();
						ws.send("PARSE_CONFIGURATION");
						ws.send(config);
						return ret;
					});
				};
				this.getFireables = () => {
					const ret = new Promise((resolve, reject) => {
						queue.push({resolve, reject});
					});
					ws.send("GET_FIREABLES");
					return ret.then(async (n) => {
						const ret = [];
						for(let i = 0 ; i < n ; i++) {
							ret.push(receive());
						}
						return asyncMap(ret, async (e) => {
							const ret = receive();
							ws.send("PARSE_TRANSITION");
							ws.send(await e);
							return await ret;
						});
					});
				};
*/
				this.resetWorld = () => {
					ws.send("ResetWorld");
				};

				resolve();
			};
		});
	},
};

