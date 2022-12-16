import {last, exportSymbols} from './Utils.js';
// TODO: add timing information, to test performance regressions||improvements
export const testCases = [
	{
		override: {
			"builtInEngine.autoFireAfterChoice": true,
			"sysHistoryEngine.autoFireAfterChoice": true,
			"checkEvents.checked": true,
			"considerGuardsTrue.checked": false,
			"fireInitialTransitions.checked": true,
			"enableEventPools.checked": true,
			"matchFirst.checked": false,
			"symbolicValues.checked": false,
		},
		engineSettings: {
			"autoFireAfterChoice": true,
			"checkEvents": true,
			"considerGuardsTrue": false,
			"fireInitialTransitions": true,
			"enableEventPools": true,
			"matchFirst": false,
			"symbolicValues": false,
		},
		load: "UML2AnimUML_AliceBob1",
		expected: new Expected(4, 8, 0),
		runWithEMI: true,
	},
	{
		override: {
			"builtInEngine.autoFireAfterChoice": true,
			"sysHistoryEngine.autoFireAfterChoice": true,
			"checkEvents.checked": true,
			"considerGuardsTrue.checked": false,
			"fireInitialTransitions.checked": true,
			"enableEventPools.checked": true,
			"matchFirst.checked": false,
			"symbolicValues.checked": false,
		},
		engineSettings: {
			"autoFireAfterChoice": true,
			"checkEvents": true,
			"considerGuardsTrue": false,
			"fireInitialTransitions": true,
			"enableEventPools": true,
			"matchFirst": false,
			"symbolicValues": false,
		},
		load: "UML2AnimUML_AliceBob2",
		expected: new Expected(8, 12, 1),
		runWithEMI: true,
	},
	{
		long: true,
		override: {
			// TODO: move support for autoFireAfterChoice to fireInternal instead of having to duplicate it in both engines?
			"builtInEngine.autoFireAfterChoice": true,
			"sysHistoryEngine.autoFireAfterChoice": true,
			"checkEvents.checked": true,
			"considerGuardsTrue.checked": false,
			"fireInitialTransitions.checked": true,
			"enableEventPools.checked": true,
			"matchFirst.checked": true,
			"symbolicValues.checked": false,
			"reactiveSystem.checked": true,
		},
		engineSettings: {
			"autoFireAfterChoice": true,
			"checkEvents": true,
			"considerGuardsTrue": false,
			"fireInitialTransitions": true,
			"enableEventPools": true,
			"matchFirst": true,
			"symbolicValues": false,
			"reactiveSystem": true,
		},
		load: "UML2AnimUML_CruiseControlv4",
		setup(model) {
			// workaround for default value, until supported by AnimUML
			(model.getObject("env_Env_engine") || model.getObject("env_engine")).transitionByName.Init.effect = "SET(this, speed, 1)";

			// EMI does not have internal transitions
			// we display them as internal, but should not consider them as internal
			function processRegion(r) {
				Object.values(r.internalTransitions || {}).forEach(t => {
					t.isInternal = false;
				});
				// TODO: why is this necessary?
				r.transitions?.forEach(t => t.isInternal = false);
				r.states?.forEach(s => processRegion(s));
			}
			model.objects.forEach(o => processRegion(o));
		},
		expected: new Expected(6704, 11324, 0),
		runWithEMI: true,
	},
];

export function Expected(nbConfigurations, nbTransitions, nbDeadlocks) {
	this.nbConfigurations = nbConfigurations;
	this.nbTransitions = nbTransitions;
	this.nbDeadlocks = nbDeadlocks;
	this.equals = (actual) => {
		return	actual.nbConfigurations == this.nbConfigurations &&
			actual.nbTransitions == this.nbTransitions &&
			actual.nbDeadlocks ==  this.nbDeadlocks
		;
	}
}

function logStatus(nbConfigurations, nbTransitions, nbDeadlocks) {
	console.log(nbConfigurations, " configurations; ", nbTransitions, " transitions; ", nbDeadlocks, " deadlocks");
}

// TODO: make it possible to select a different analysis tool (e.g., OBP2 instead of the AnimUML explorer)
export async function testExecution(eng = engine, stoppingCondition) {
	console.time("explore");
	var ret = await (await import(`./Explorer.js?nocache=${Math.random()}`)).explore(eng, (...args) => {
		//console.timeLog('explore');	// does not seem to work anymore now that explore is in a separate module
		logStatus.apply(null, args)
	}, stoppingCondition);
	console.timeEnd("explore");
	return ret;
}


export async function testExecutions(runLongs = false, filter) {
	const oldExample = currentModel.name;
	const oldKeepOneMessagePerTrigger = keepOneMessagePerTrigger.checked;
	keepOneMessagePerTrigger.checked = true;	// necessary for model checking (some examples may even disable ether altogether)

	var nbTests = 0;
	var nbFailed = 0;
	function assert(condition) {
		console.assert.apply(console, arguments);
		if(!condition) {
			nbFailed++;
		}
	}

	function processOverride(override, f) {
		Object.entries(override).forEach(([expr, value]) => {
			var v = window;
			var parts = expr.split(".");
			parts.slice(0, -1).forEach(e => v = v[e]);
			var pn = last(parts);

			f(overriden, expr, v, pn, value);
		});
	}

	for(const testCase of testCases) {
		for(const variant of testCase.variants || [{}]) {
			if(filter && !filter(testCase, variant)) {
				console.log("Skipping a test according to filter");
				continue;
			}
			var long = variant.long == undefined ? testCase.long : variant.long;
			if(long && !runLongs) {
				console.log("Skipping a long test. If you want to run all tests, pass true as first argument to testExecutions");
				continue;
			}
			console.log("Loading: ", testCase.load);
			switchExample(testCase.load);
			nbTests++;

			testCase.setup && testCase.setup(currentModel);
			variant.keepOneObject && load(currentModel.getObject(variant.keepOneObject));
			variant.setup && variant.setup(testCase);

			// applying overrides after saving
			var overriden = {};
			var override = Object.assign(Object.assign({}, testCase.override), variant.override);
			processOverride(override, (overriden, expr, v, pn, value) => {
				overriden[expr] = v[pn];
				v[pn] = value;
			});

			var expected = variant.expected || testCase.expected;
			console.log("Expecting: ", expected.nbConfigurations, " configurations; ", expected.nbTransitions, " transitions; ", expected.nbDeadlocks, " deadlocks");

			async function run(engine) {
				console.log("Running with engine: ", engine.name);
				var actual = await testExecution(
					engine
				);
				assert(expected.equals(actual), `${testCase.load}${variant.keepOneObject ? `.${variant.keepOneObject}` : ""}:`, "expected: ", expected, ", actual: ", actual);
			}
			await run(builtInEngine);
			//await run(compressingBuiltInEngine);

			// testing with sysHistoryEngine can unveil bugs in copyConfig
			// maybe the sysHistory-specific copyConfig should be dropped, and serialzieConfig used instead?
			// but sysHistory still supports more features than setConfig, notably wrt. sequence and timing diagrams
			//var actual = await testExecution(sysHistoryEngine);
			//assert(expected.equals(actual), `${testCase.load}${variant.keepOneObject ? `.${variant.keepOneObject}` : ""}:`, "expected: ", expected, ", actual: ", actual);
//			await run(sysHistoryEngine);

			if((testCase.runWithEMI && (variant.runWithEMI == undefined)) || variant.runWithEMI) {
				await emiConnect();
				await run(engine);
			}

			// restoring overrides
			processOverride(override, (overriden, expr, v, pn) => {
				//console.log(expr, " = ", overriden[expr])
				v[pn] = overriden[expr];
			});

			variant.tearDown && variant.tearDown();
			testCase.tearDown && testCase.tearDown();
		}
	}

	console.log("Ran ", nbTests, " tests with ", nbFailed, " fails.");

	keepOneMessagePerTrigger.checked = oldKeepOneMessagePerTrigger;
	switchExample(oldExample);
}

exportSymbols(
	(symbol) => eval(symbol),
	"testExecution",
	"testExecutions",
);
