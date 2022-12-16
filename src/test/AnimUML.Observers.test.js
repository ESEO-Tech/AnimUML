import {testCasePath, enableCBuildTests, remoteEngineSupplierFor, obpWebsocketServerURL, generatedEngineSupplierFor, tmpRm, tmpBuild, applyFireInitialTransitions, applyReactiveSystemHypothesis} from "./Common.js";
import {testCases, Expected} from '../TestCases.js';
import {loadModel} from "../CLILoadModel.js";
import {AnimUMLEngine} from '../AnimUMLEngine.js';
import {ObserverAnimUMLEngine} from '../ObserverAnimUMLEngine.js';
import {SynchronousCompositionEngine} from '../SynchronousCompositionEngine.js';
import {explore} from '../Explorer.js';
import {diffExplore} from '../DiffExplorer.js';
import {asyncMap, zip} from "../Utils.js";
import assert from "assert";

/*
	The original CruiseControlv4 example is from
		uml-interpreter-c/samples/CruiseControl/CCISoSym/CruiseControlSimple
	and CruiseControlObserver1 is basically the same model to which a single observer has been added
*/
describe("Observers", async function() {
	const withBFS = true;
	const engines = [];
	const model = {
		name: 'CruiseControlObserver1',
		//name: 'AliceBob2',
	};
	this.timeout(140000);

	const modelNames = [
		"UML2AnimUML_CruiseControlv4",
	];
	// for Generated C
	function adaptRemoteEngine(emiEngine, withObservers) {
		if(!withObservers) {
			emiEngine.showConfiguration = emiEngine.parseConfiguration;
		}
		applyFireInitialTransitions(emiEngine);
		applyReactiveSystemHypothesis(emiEngine);
	}
	testCases.find(testCase => testCase.load === "UML2AnimUML_CruiseControlv4").observerModel = {
		load: "UML2AnimUML_CruiseControlv4-Observer1",
	};
	const allTestCases = testCases.slice(0);

	for(const modelName of modelNames) {

		const testCase = allTestCases.find(testCase => testCase.load === modelName);
		const path = testCasePath(testCase);

		async function makeEMIEngine(isDone, withObservers) {
			const currentModel = await loadModel(path);
			testCase.setup && testCase.setup(currentModel);
			// TODO: fix EMIRemoteEngine so that it does not require the currentModel as a global variable:
			// + this makes getObjectRelative not work... which makes AnimUMLEngine send messages to ]
			//globalThis.currentModel = currentModel;
			const engineProvider = remoteEngineSupplierFor(model, engines, isDone, testCase.engineURL);
			const ret = await engineProvider();
			testCase.engineSetup?.(ret, withObservers);
			return ret;
		}
		// debugging util
		async function step(engine) {
			const transitions = (await engine.getFireables());
			console.log("Firing the first", engine.name,"transition among the", transitions.length, "fireable ones:", await asyncMap(transitions, t => engine.parseTransition(t)));
			await engine.fire(transitions[0]);
			console.log(await engine.parseConfiguration(await engine.getConfiguration()));
		}
		if(testCase.runWithEMI) {
			it(`should be able to explore EMI with Observers: ${modelName}`, async function() {
				let done = false;
				const emiEngine = await makeEMIEngine(() => done);

/*
				await emiEngine.reset();
				await step(emiEngine);
				await step(emiEngine);
				await step(emiEngine);
				return
*/

				const result = await explore(emiEngine,
					(nbConfigs, nbTrans, nbDeadlocks) => {
						if(nbConfigs % 1000 == 0) {
							console.log(nbConfigs, nbTrans, nbDeadlocks);
						}
					},
					undefined,
					{withBFS},
				);
				console.log({...result, configs: undefined});
				done = true;
				for(const engine of engines) {
					//console.log(await engine.parseConfiguration(await engine.getConfiguration()))
					engine.close();
				}
			});
		}

		async function makeAnimUMLEngine(withObserver = true, settingsOverride = {}) {
			const currentModel = await loadModel(path);
			testCase.setup && testCase.setup(currentModel);
			const sysEngine = new AnimUMLEngine(currentModel, {keepOneMessagePerTrigger: true, ...testCase.engineSettings, ...settingsOverride});
/*
			console.log(currentModel.getObject('env_engine'))
			sysEngine.reset()
			async function ev(atom) {
					console.log(atom, "=>", await sysEngine.evalActions(atom, {}, currentModel.getObject('env_engine')))
			}
			await ev("A == B");
			await ev("A == A");
			sysEngine.a.b;
*/
			if(withObserver) {
/*
				const observers = currentModel.objects.filter(obj => obj.isObserver);
/*/
				const observerModel = testCase.observerModel ? await loadModel(testCasePath(testCase.observerModel)) : currentModel;
				const observers = observerModel.objects.filter(o => o.isObserver);
/**/
				const observerEngines = observers.map(obs => new ObserverAnimUMLEngine(observerModel, obs));
				const engine = new SynchronousCompositionEngine(sysEngine, ...observerEngines);
				return {animUMLEngine: engine, observerEngines};
			} else {
				return {animUMLEngine: sysEngine, observerEngines: []};
			}
		}
		it(`should be able to explore with AnimUML engine and observers: ${modelName}`, async function() {
			// TODO: why deadlock when no observer with CruiseControl?

			const {animUMLEngine, observerEngines} = await makeAnimUMLEngine(true);
/*
			await animUMLEngine.reset();
			await step(animUMLEngine);
			await step(animUMLEngine);
			await step(animUMLEngine);
			return
*/
			const result = await explore(animUMLEngine,
				(nbConfigs, nbTrans, nbDeadlocks) => {
					if(nbConfigs % 1000 == 0) {
						console.log(nbConfigs, nbTrans, nbDeadlocks);
					}
				},
				() => {
					//console.log(observerEngines.map(e => ({currentState: e.configuration.currentState, isAccept: e.isAccept()})));
					return observerEngines.some(e => e.isAccept());
				},
				{withBFS},
			);
			console.log({...result, configs: undefined});
			if(result.stoppingConditionReached) {
				console.log("Stopped because of", observerEngines.filter(e => e.isAccept()).map(e => e.observer.name));
			}
			//console.log(await engine.parseConfiguration(await engine.getConfiguration()))
		});

		const engineInfos = [];
		if(enableCBuildTests) {
			engineInfos.push({
				name: "Generated C",
				async createEngine(isDone, withObservers) {
/*					// obsolete connection to externally run generated code
					const url = `ws://localhost:8091/`
					const emiEngine = await EMIRemoteEngine.connect(url, {
						onclose() {
							console.log("RemoteEngine", "", "closing", isDone());
							if(!isDone()) {
								throw `RemoteEngine closed too soon`;	// trying to abort the exploration to avoid having to timeout in case of a problem
								// TODO: a better solution: remove it from the pool
							}
						},
					});
					adaptRemoteEngine(emiEngine, withObservers);
					engines.push(emiEngine);
/*/					// generate, build, run, connect
					const model = await loadModel(path);
					testCase.setup?.(model);
					if(testCase.observerModel) {
						const observerModel = await loadModel(testCasePath(testCase.observerModel));
						model.objects.push(...observerModel.objects);
					}
					const engineSupplier = await generatedEngineSupplierFor(model, engines, isDone, {enableObservers: withObservers});
					const engine = await engineSupplier();
					adaptRemoteEngine(engine, withObservers);
					return engine;
/**/
				},
				animUMLEngineSettingsOverride: {
					autoFireAfterChoice: false,	// because generated code does not do it
					matchFirst: false,		// because generated code does not do it
				},
			});
		}
		if(testCase.runWithEMI) {
			engineInfos.push({
				name: "EMI",
				async createEngine(isDone, withObservers) {
					// EMI engine
					const emiEngine = await makeEMIEngine(isDone);
					const originalReset = emiEngine.reset;
					emiEngine.reset = async function() {
						await originalReset()

						// ignoring EMI's initial transition that AnimUML does not support yet
						const initialTransition = (await emiEngine.getFireables())[0];
						console.log("Firing initial EMI transition:", await emiEngine.parseTransition(initialTransition));
						await emiEngine.fire(initialTransition);
					};
					return emiEngine;
				},
			});
		}
		for(const engineInfo of engineInfos) {
			// currently fails with CruiseControlv4 because of port tagging not supported by code generator
			it(`should explore in the same way with ${engineInfo.name} and AnimUML: ${modelName}`, async function() {
				const withObservers = true;
				let done = false;
				const isDone = () => done;
				const {animUMLEngine, observerEngines} = await makeAnimUMLEngine(withObservers, engineInfo.animUMLEngineSettingsOverride);
				if(!withObservers) {
					animUMLEngine.showConfiguration = (e) => e;
				}
				let emiEngine = await engineInfo.createEngine(isDone, withObservers);

				const result = await diffExplore(
					animUMLEngine,
					emiEngine,
					async (type, ...args) => {
						switch(String(type)) {
						case 'info':
/*							// only for debugging
							if(args.length == 1) {
								console.log(type, ...await args[0]());
							} else {
								console.log(type, ...args.slice(0, 2), ...await args[2]());
							}
/**/
							break;
						case 'diff':
							console.log(type, ...args);
							break;
						case 'counts':
							console.log(type, ...args);
							break;
						default:
							throw "Unknown log type " + type;
							break;
						}
					},
					false,	// could probably be true in some cases, but not when there are hierarchical states flattened by the code generator
						// unless we compared generated code to AnimUMLEngine interpreting explicit versions of the model's state machines
					{
						// TODO: use a keyProvider instead?
						configurationComparator(left, right) {
							if(withObservers) {
//*
								const l = left.rights;
								const r = right.rights;
/*/
								const l = left.rights[0].currentState.healthMonitor;
								const r = right.rights[0].currentState.healthMonitor;
/**/
								const ret = l.length === r.length && zip(l, r).every(([a,b]) => a === b);
								//console.log(l, "===", r, "=>", ret)
								return ret;
							} else {
								return true;
							}
						},
					}
				);
				console.log({...result, configs: undefined});
				done = true;
				for(const engine of engines) {
					//console.log(await engine.parseConfiguration(await engine.getConfiguration()))
					engine.close();
				}
				assert(!result.diff, "same state space shape");
			});
		}
	}
});
