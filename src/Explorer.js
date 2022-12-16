import {getConfigKey as originalGetConfigKey} from "./ConfigKeyUtils.js";

// stoppingCondition can be used to stop exploring for various reasons, such as:
// - after a given time
// - when a given number of explored configurations has been reached
// - because an error has been found
// - because the user has requested it
//	- exploration should then be performed in a WebWorker so as to not block the UI
// In all stopping cases, the explored state space is returned as the configs slot of the returned object.
// A trace can be reconstructed by starting from the current configuration (as returned by engine.getConfiguration())
// and then following the "from" slot of configs[configKey] back to when it is undefined (i.e., the initial configuration).
// Transitions can be collected along the way in the "transition" slot.
export async function explore(engine, logStatus, stoppingCondition, {onfired, useBlob = true, withBFS = false, getConfigKey = originalGetConfigKey} = {}) {
	if(withBFS) {
		return exploreBreadthFirst(engine, logStatus, stoppingCondition, {onfired, useBlob, getConfigKey});
	}
	var nbConfigurations = 0;
	var nbTransitions = 0;
	var nbDeadlocks = 0;
	var configs = {};
	await engine.reset();

	async function log() {
		logStatus && await logStatus(nbConfigurations, nbTransitions, nbDeadlocks);
	}
	// TODO: non-recursive version
	// returns true if stoppingCondition reached
	async function expl(from, transition) {
		if(from && onfired) {
			onfired(await engine.parseTransition(transition), config);
		}
		var config = await engine.getConfiguration();
		var configKey = await getConfigKey(config, engine, !useBlob);
		if(configs[configKey]) {
			// already found, nothing to do
		} else {
			var fireables = await engine.getFireables();
			if(fireables.length == 0) {
				nbDeadlocks++;
			}
			configs[configKey] = {fireables, from, transition};
			nbConfigurations++;
			nbTransitions += fireables.length;
			//if(nbConfigurations % 1000 == 0) {
				await log();
			//}

			if(stoppingCondition && await stoppingCondition(config, nbConfigurations)) {
				return true;
			}
			for(const trans of fireables) {//.slice(0).reverse()) {
				await engine.setConfiguration(config);
				await engine.fire(trans);
				if(await expl(config, trans)) {
					return true;
				}
			}
		}
		return false;
	}
	const stoppingConditionReached = await expl();
	await log();
	return {nbConfigurations: nbConfigurations, nbTransitions: nbTransitions, nbDeadlocks: nbDeadlocks, stoppingConditionReached, configs};
}

async function exploreBreadthFirst(engine, logStatus, stoppingCondition, {onfired, useBlob = true, getConfigKey} = {}) {
	let nbConfigurations = 0;
	let nbTransitions = 0;
	let nbDeadlocks = 0;
	let nbLevels = 0;
	let currentConfigIndex = 0;
	let configs = {};
	let stoppingConditionReached = false;

	async function addConfig(config, from, transition) {
		var configKey = await getConfigKey(config, engine, !useBlob);
		if(!configs[configKey]) {
			configs[configKey] = {
				//fireables,	// TODO
				from,
				transition,
			};
			nextConfigs.push(config);
			nbConfigurations++;
		}
	}
	async function log() {
		logStatus && await logStatus(nbConfigurations, nbTransitions, nbDeadlocks, nbLevels, currentConfigIndex, currentConfigs.length, nextConfigs.length);
	}

	await engine.reset();
	let nextConfigs = [];
	await addConfig(await engine.getConfiguration());
	let currentConfigs = nextConfigs;
	nextConfigs = [];

	outer: while(currentConfigs.length > 0) {
		nbLevels++;
		currentConfigIndex = 0;
		for(const config of currentConfigs) {
			currentConfigIndex++;
			await engine.setConfiguration(config);
			const fireables = await engine.getFireables();
			if(fireables.length == 0) {
				nbDeadlocks++;
			}
			nbTransitions += fireables.length;
			await log();
			for(const trans of fireables) {
				await engine.setConfiguration(config);
				await engine.fire(trans);
				const newConfig = await engine.getConfiguration(config);
				if(onfired) {
					onfired(await engine.parseTransition(trans), newConfig);
				}
				await addConfig(newConfig, config, trans);
				if(stoppingCondition && await stoppingCondition(newConfig, nbConfigurations)) {
					stoppingConditionReached = true;
					break outer;
				}
			}
		}
		currentConfigs = nextConfigs;
		nextConfigs = [];
	}

	await log();
	return {nbConfigurations, nbTransitions, nbDeadlocks, stoppingConditionReached, configs};
}


export async function buildTrace(engine, configs) {
	let config = await engine.getConfiguration();
	const trace = [];
//console.log(configs)
	do {
//console.log(config)
	       trace.unshift(configs[config].transition);
	} while(config = configs[config].from);
	// removing the initial "reset" transition
	console.assert(trace.shift() == undefined);
	return trace;
}

