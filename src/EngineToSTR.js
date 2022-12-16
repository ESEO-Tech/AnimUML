export function engineToSTR(engine) {
	return {
		async initial() {
			await engine.reset();
			return [await engine.getConfiguration()];
		},
		async actions(config) {
			await engine.setConfiguration(config);
			return await engine.getFireables();
		},
		async execute(trans, config) {
//console.log("execute")
			await engine.setConfiguration(config);
			await engine.fire(trans);
			return [await engine.getConfiguration()];
		},
		async isAccepting(config) {
			await engine.setConfiguration(config);
			return await engine.isAccept();
		},
	};
}

