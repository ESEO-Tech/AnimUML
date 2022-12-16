import {asyncMap, diffInternal, zip} from "./Utils.js";

/*
	Can be used in two ways:
	- If configurations are comparable, then they can be compared
	- If configurations are not comparable, at least we can know if the state spaces have the same shape
*/
export async function diffExplore(engine1, engine2, logStatus, compareConfigurations = true, {configurationComparator} = {}) {
	logStatus = logStatus || console.log;

	let diff = false;
	var nbConfigurations = 0;
	var nbTransitions = 0;
	const configs1 = {};
	const configs1a = [];
	const configs2 = {};
	const configs2a = [];
	await Promise.all([engine1.reset(), engine2.reset()]);

	async function log(type) {
		if(type) {
			await logStatus.apply(null, arguments);
		} else {
			await logStatus("counts", nbConfigurations, nbTransitions, NaN);
		}
	}
	// TODO: non-recursive version
	// returns true when diff found
	async function expl() {
		//if(window.stopExploration) {return;}	// TODO: make something like this work, but maybe it could only work in a web worker?
//*
		async function getAndParse(engine) {
			const config = await engine.getConfiguration();
			const configKey = await engine.parseConfiguration(config);
			return [config, configKey];
		}
		const [[config1, config1Key], [config2, config2Key]] = await Promise.all([getAndParse(engine1), getAndParse(engine2)]);
/*/
		const config1 = await engine1.getConfiguration();
		const config1Key = await engine1.parseConfiguration(config1);
		const config2 = await engine2.getConfiguration();
		const config2Key = await engine2.parseConfiguration(config2);
/**/
		const c1 = configs1[config1Key];
		const c2 = configs2[config2Key];
		if(c1 && c2) {
			if(c1.id == c2.id) {
				// already found, nothing to do
				await log("info", async () => ["Back to config ", c1.id, ": ", await engine1.showConfiguration(config1), ", and ", c2.id, ": ", await engine2.showConfiguration(config2)]);
			} else {
				diff = true;
				await log("diff", engine1.name, " went back to known config ", c1.id, ": ", await engine1.showConfiguration(config1), " whereas ", engine2.name, " went back to known config ", c2.id, ": ", await engine2.showConfiguration(config2));
				return true;
			}
		} else if(c1) {
			diff = true;
			await log("diff", engine1.name, " went back to known config ", c1.id, ": ", await engine1.showConfiguration(config1), " whereas ", engine2.name, " went to a new config: ", await engine2.showConfiguration(config2));
			await log("diff", "=> ", engine2.name, " was supposed to be in ", await engine2.showConfiguration(configs2a[c1.id].config), " but is instead in ", await engine2.showConfiguration(config2));
			await log("diff", "=> These two configurations differ at: ");
			var d = diffInternal(configs2a[c1.id].configKey, config2Key);
			await log("diff", "\t", d[0]);
			await log("diff", "\t", d[1]);
			return true;
		} else if(c2) {
			diff = true;
			await log("diff", engine1.name, " went to a new config: ", await engine1.showConfiguration(config1), " whereas ", engine2.name, " went to known config ", c2.id, ": ", await engine2.showConfiguration(config2));
			await log("diff", "=> ", engine1.name, " was supposed to be in ", await engine1.showConfiguration(configs1a[c2.id].config), " but is instead in ", await engine1.showConfiguration(config1));
			await log("diff", "=> These two configurations differ at: ");
			var d = diffInternal(configs1a[c2.id].configKey, config1Key);
			await log("diff", "\t", d[0]);
			await log("diff", "\t", d[1]);
			return true;
		} else {
			await log("info", "Reached config ", nbConfigurations, async () => [": ", await engine1.showConfiguration(config1), ", and ",
				await engine2.showConfiguration(config2)
				//JSON.parse(await engine2.parseConfiguration(config2))
			]);

			// TODO: investigate issue uncovered for CruiseControlv4 around config 180 when configuration comparison is enabled
			if(compareConfigurations) {
				var cc1 = JSON.stringify(await engine1.showConfiguration(config1));
				var cc2 = JSON.stringify(await engine2.showConfiguration(config2));
				if(cc1 !== cc2) {
					diff = true;
					await log("diff", "=> These two configurations (", nbConfigurations, ") : ", JSON.parse(cc1), " and ",  JSON.parse(cc2), " differ at: ");
					var d = diffInternal(cc1, cc2);
					await log("diff", "\t", d[0]);
					await log("diff", "\t", d[1]);
					return true;
				}
			}
			if(configurationComparator) {
				const [cc1, cc2] = await Promise.all([engine1.showConfiguration(config1), engine2.showConfiguration(config2)]);
				if(!configurationComparator(cc1, cc2)) {
					diff = true;
					await log("diff", "=> These two configurations (", nbConfigurations, ") : ", cc1, " and ",  cc2, " differ according to the given comparator");
					return true;
				}
			}

			const [fireables1, fireables2] = await Promise.all([engine1.getFireables(), engine2.getFireables()]);
			configs1[config1Key] = {fireables: fireables1, id : nbConfigurations, config: config1, configKey: config1Key};
			configs1a.push(configs1[config1Key]);

			configs2[config2Key] = {fireables: fireables2, id: nbConfigurations, config: config2, configKey: config2Key};
			configs2a.push(configs2[config2Key]);

			await log("info", async () => [engine1.name, "'s parsed transition ends are: ", await asyncMap(fireables1, e => engine1.showTransition(e)), ", and ", engine2.name, "'s are: ", await asyncMap(fireables2, e => engine2.showTransition(e))]);
			if(fireables1.length != fireables2.length) {
				diff = true;
				await log("diff", engine1.name, " returned ", fireables1.length, " fireable transitions: ", await asyncMap(fireables1, e => engine1.parseTransition(e)), ", whereas ", engine2.name, " returned ", fireables2.length, " fireable transitions: ", await asyncMap(fireables2, e => engine2.parseTransition(e)));
				return true;
			}

			nbConfigurations++;
			nbTransitions += fireables1.length;
			if(nbConfigurations % 1000 == 0) {
				await log();
			}
			// we assume that transitions are returned in the same order
			for(const [trans1, trans2] of zip(fireables1, fireables2)) {
				await log("info", async () => ["Firing ", await engine1.showTransition(trans1), ", and ", await engine2.showTransition(trans2)]);
				await log("info", async () => ["\tfrom ", configs1[config1Key].id, ": ", await engine1.showConfiguration(config1), " and ", configs2[config2Key].id, ": ", await engine2.showConfiguration(config2)]);
/*
				if(await engine1.parseConfiguration(config1) !== config1Key) {
					console.log("AA1")
					console.log(JSON.parse(await engine1.parseConfiguration(config1)))
					console.log(JSON.parse(config1Key))
					await engine1.reset();
					console.log("after reset:");
					console.log(JSON.parse(await engine1.parseConfiguration(config1)))
					aa
				}
				if(await engine2.parseConfiguration(config2) !== config2Key) {
					console.log("AA2")
					console.log(JSON.parse(await engine2.parseConfiguration(config2)))
					console.log(JSON.parse(config2Key))
					await engine2.reset();
					console.log("after reset:");
					console.log(JSON.parse(await engine2.parseConfiguration(config2)))
					aa
				}
*/
				//await log("info", "\twith fireables ", fireables1, " and ", fireables2);
				async function setAndFire(engine, config, trans) {
					await engine.setConfiguration(config);
					await engine.fire(trans);
				}
/*
				await engine1.setConfiguration(config1);
				await engine2.setConfiguration(config2);
				// should not be necessary, but CruiseControlv4 fails at around 883 configs if commented out
				// actually this is a problem in the trMap used by OBP2Runtime-AnimUML to translate EMI configurations
				// DONE: change the WebSocket protocol to use binary configurations and transitions + a projection function
				// this will also remove the need to store a configMap in OBP2Runtime-AnimUML.
				//await engine1.getFireables();
				//await engine2.getFireables();
				await engine1.fire(trans1);
				await engine2.fire(trans2);
/*/
				await Promise.all([setAndFire(engine1, config1, trans1), setAndFire(engine2, config2, trans2)]);
/**/
				if(await expl()) {
					return true;
				}
			}
		}
		return false;
	}
	await expl();

	// TODO: use a callback?
	globalThis.configs1a = configs1a;
	globalThis.configs2a = configs2a;

	await log();
	return {nbConfigurations: nbConfigurations, nbTransitions: nbTransitions, diff};
}

// support for lazily computed args
async function process(args) {
	const resolved = await Promise.all(args.map(async (arg) =>
		typeof(arg) === "function" ?
			await arg()
		:
			[arg]
	));
	return resolved.flatMap(e => e);
}

export function makeDiffExploreLogger(filter) {
	return async (...allArgs) => {
		const [type, ...args] = allArgs;
		if(type === "diff" || filter?.[type]?.({type, args})) {
			console.log.apply(console, await process(allArgs));
		}
/*
		if(type === "info") {
			if(args.length === 1) {
				console.log(type, ...await args[0]());
			} else {
				console.log(type, ...args.slice(0, 2), ...await args[2]());
			}
		}
/**/
/*
		switch(String(type)) {
			case "info":
				if(args[0] === "Reached config ") {
					if(args[1] % 100 == 0 && !shouldLog) {
						console.timeLog("explore");
						console.log.apply(console, await process(args));
					}
					//if(args[1] > 880 && !shouldLog) {	// fails around 883 because the wrong transition is apparently fired by EMI (workaround: call getFireables after each setConfig)
					//if(args[1] > 1410 && !shouldLog) {	// blocks at 1413 because params are not supported yet (the "wrong" transition gets fired a bit earlier actually)
					//if(args[1] > 3080 && !shouldLog) {	// blocks at 3086 because AnimUML returns 2 transitions vs. EMI only 1. The problem is that AnimUML considers all events, whereas EMI only considers the first matching event
					if(false) {
						shouldLog = true;
					}
				}
				if(shouldLog) {
					console.log.apply(console, await process(args));
				}
				break;
			case "diff":
				break;
			case "counts":
				logStatus.apply(null, await process(args));
				break;
			default:
				console.log("Message of unknown type: ", type, " with args: ", await process(args));
				break;
		}
*/
	};
}

