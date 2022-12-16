// To correctly have all "small" steps, the wrapped engine must have fireInitialTransitions set to false
export class AnimUMLSmallerStepsEngine {
	constructor(engine, settings) {
		var configExt;

		function resetConfig() {
			configExt = {
				baseTransition: undefined,
				currentMessage: undefined,
				messages: [],
			};
		}
		// doing this here makes it possible to start from the current engine state instead of having to reset it
		resetConfig();

		// From the STR interface of our formalization
		this.reset = async () => {
			await engine.reset();
		};
		this.getConfiguration = async () => {
			return JSON.stringify({
				base: await engine.getConfiguration(),
				configExt
			});
		};
		this.parseConfiguration = async (config) => {
			return config;
		};
		this.setConfiguration = async (config) => {
			const c = JSON.parse(config);
			await engine.setConfiguration(c.base);
			configExt = c.configExt;
		};
		this.getFireables = async () => {
			if(configExt.messages.length == 0) {
				return await engine.getFireables();
			} else {
				return [configExt.baseTransition];
			}
		};
		this.fire = async (fireable) => {
			if(configExt.messages.length == 0) {
				await engine.fire(fireable);
				const messages = await engine.evaluateAtom("MESSAGES()");
				if(messages.length > 0) {
					const sentMessages = await engine.evaluateAtom("SENT_MESSAGES()");
					const receivedMessages = await engine.evaluateAtom("RECEIVED_MESSAGES()");
					for(const msg of messages) {
						configExt.messages.push({
							source: msg.source,
							target: msg.target,
							signature: msg.signature,
							isSent: sentMessages.some(e => e == msg),
							isReceived: receivedMessages.some(e => e == msg),
						});
					}
					configExt.baseTransition = fireable;
					configExt.currentMessage = configExt.messages.shift();
				} else {
					configExt.baseTransition = undefined;
					configExt.currentMessage = undefined;
					configExt.messages = [];
				}
			} else {
				configExt.currentMessage = configExt.messages.shift();
			}
		};

		// From the APE interface of our formalization
		this.evaluateAtom = async (atom) => {
			const extraOps = {
				MESSAGES() {
					return configExt.currentMessage ? [configExt.currentMessage] : [];
				},
				SENT_MESSAGES() {
					return extraOps.MESSAGES().filter(msg => msg.isSent);
				},
				RECEIVED_MESSAGES() {
					return extraOps.MESSAGES().filter(msg => msg.isReceived);
				},
			};
			return engine.evaluateAtom(atom, extraOps);
		};
	}
}

