import {} from "./ContextualEval.cjs";

import {AnimUMLEngine} from './AnimUMLEngine.js';
import {ObserverAnimUMLEngine} from './ObserverAnimUMLEngine.js';
import {SynchronousCompositionEngine} from './SynchronousCompositionEngine.js';
import {loadModel} from './CLILoadModel.js';
import {explore, buildTrace} from './Explorer.js';

const withBFS = true;

async function testAFewSteps(engine) {
	await engine.reset();
	console.log(await engine.getConfiguration());

	var fireables;

	async function updateFireables() {
		fireables = await engine.getFireables();
		console.log("Fireables:", fireables);

		if(engine.getAtoms) {
			console.log("Atoms:", await engine.getAtoms());
		}
	}
	await updateFireables();

	async function fire() {
		const fireable = fireables[fireables.length - 1];
		console.log("Firing:", fireable);
		engine.fire(fireable);
		console.log(await engine.getConfiguration());
	}
	await fire();

	await updateFireables();

	await fire();

	await updateFireables();

	await fire();

	await updateFireables();
}

async function testEngine(engine) {
	console.group("Testing", engine.name);

	await testAFewSteps(engine);

	console.group("Explore");
	const results = await explore(engine, async (...args) => {
		console.log(...args, await engine.isAccept?.(), await engine.getConfiguration());
	}, async (config, nbConfigs) =>
		engine.isAccept?.()
	, {withBFS});
	console.log({...results, configs: undefined});

	if(results.stoppingConditionReached) {
		const trace = await buildTrace(engine, results.configs);
		console.log(trace.length, trace);
	}

	console.groupEnd();
	console.groupEnd();
}

async function testModel(modelPath, settings) {
	const model =
		await loadModel(modelPath)
	;
	const systemEngine = new AnimUMLEngine(model, settings);
	const observerEngines = model.objects.filter(obj => obj.isObserver).map(obs => new ObserverAnimUMLEngine(model, obs));
console.log(observerEngines)
	const engine = new SynchronousCompositionEngine(systemEngine, ...observerEngines);

	globalThis.display = {
		notify(...args) {
			console.log(...args);
		},
	};

	for(const observerEngine of observerEngines) {
		await testEngine(observerEngine);
	}
	await testEngine(systemEngine);
	await testEngine(engine);

}

async function main() {
	await testModel("test/samples/Lamp-withObserver.js", {
		disableEther: true,
		checkEvents: false,
	});
/*
	await testModel("../..//animuml-case-studies/waterPump/waterPump_chap3_one_monitor.html", {
		checkEvents: true,
		enableEventPools: true,
		reactiveSystem: true,
	});
/**/
}

main();

