import {PooledEngine} from './PooledEngine.js';
import {getConfigKey} from './ConfigKeyUtils.js';

// TODO: separate pooledEngine from this function?

// This explorer is not itself parallel but uses async/await to support engines working in parallel
// @param stoppingCondition can be used to stop exploring for various reasons, such as:
// - after a given time
// - when a given number of explored configurations has been reached
// - because an error has been found
// - because the user has requested it
//	- exploration should then be performed in a WebWorker so as to not block the UI
// In all stopping cases, the explored state space is returned as the configs slot of the returned object.
// A trace can be reconstructed by starting from the current configuration (as returned by engine.getConfiguration())
// and then following the "from" slot of configs[configKey] back to when it is undefined (i.e., the initial configuration).
// Transitions can be collected along the way in the "transition" slot.
// @param engineProvider must be a function that returns a new engine each time it is called
// Exploration with this function is depth-first
export async function explore(engineProvider, logStatus, stoppingCondition, {
	onfired,
	poolSize = 4,
	useHash = {name: "SHA-256"},
} = {}) {
	let nbConfigurations = 0;
	let nbTransitions = 0;
	let nbDeadlocks = 0;
	let configs = {};
	let shouldStop = false;
	let stoppingConditionReached = false;
	let stoppingConfig = undefined;

	const engine = await PooledEngine.create(poolSize, engineProvider);

	const resetConfig = await engine.reset();

	function log(level) {
		logStatus && logStatus(nbConfigurations, nbTransitions, nbDeadlocks, level);
	}
	// TODO: non-recursive BFS version
	// returns true if stoppingCondition reached
	async function expl(config, from, transition, level = 0) {
		if(from && onfired) {
			onfired(await engine.parseTransition(transition), config);
		}
		let configKey = await getConfigKey(config, engine, !useHash);
		if(configs[configKey]) {
			// already found, nothing to do
		} else {
			configs[configKey] = {from, transition};
			let fireables = await engine.getFireables(config);
			if(!fireables) {
				// engine was closed
				return true;
			}
			if(fireables.length == 0) {
				nbDeadlocks++;
			}
			configs[configKey].fireables = fireables;
			nbConfigurations++;
			nbTransitions += fireables.length;
			//if(nbConfigurations % 1000 == 0) {
				log(level);
			//}

			if(stoppingCondition) {
				const cond = await stoppingCondition(config, nbConfigurations, level);
				if(cond) {
					// set a flag to notify other branches (merge the two following flags?)
					stoppingConditionReached = true;
					if(cond.includes?.("memorize")) {
						// keeping the found config only if asked, so that other stopping conditions (e.g., exploration depth) can be used without other branches overwriting it
						stoppingConfig = config;
					}
					if(cond.includes?.("allBranches")) {
						shouldStop = true;
						engine.close();	// this requires PooledEngine methods to be cancellable, which means that it must check whether it is closed or not before each step
					}
					return true;
				}
			}

			const ret = await Promise.all(fireables.map(async trans => {
				const newConfig = await engine.fire(config, trans);
				return shouldStop || await expl(newConfig, config, trans, level + 1);
			}));
			if(ret.reduce((a, b) => a || b, false)) {
				return true;
			}
		}
		return false;
	}
	try {
		await expl(resetConfig);
	} catch(e) {
		// engine closing is not an error, but rather indicates that the stoppingCondition has been reached
		if(e !== "closed") {
			throw e;
		}
	}
	log();
	if(!engine.closed) {
		engine.close();
	}
	return {nbConfigurations: nbConfigurations, nbTransitions: nbTransitions, nbDeadlocks: nbDeadlocks, stoppingConditionReached, configs, stoppingConfig};
}

