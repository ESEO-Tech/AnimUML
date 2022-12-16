import * as fs from "fs";
import * as pathm from "path";
import {testCasePath, enableCBuildTests, remoteEngineSupplierFor, obpWebsocketServerURL, generatedEngineSupplierFor, tmpRm, tmpBuild, applyFireInitialTransitions, applyReactiveSystemHypothesis} from "./Common.js";
import {allObjectsToPlantUML, toPlantUML} from "../Export2PlantUML.js";
import {Model} from "../Model.js";
import {toPlantUMLURI} from "../PlantUMLURI.js";
import {loadModel} from "../CLILoadModel.js";
import {comparedExecution} from "../ComparedExecution.js";
import {} from "../lib/pako_deflate.min.js";
import fetch from "node-fetch";
import assert from "assert";
import {exportInteraction2SVG} from '../ExportInteraction2SVG.js';
import {toExplicit} from '../TransformStateMachine2Explicit.js';
import {explore as parallelExplore} from '../ParallelExplorer.js';
import {explore} from '../Explorer.js';
import {diffExplore} from '../DiffExplorer.js';
import {AnimUMLEngine} from '../AnimUMLEngine.js';
import {toC} from '../Export2C.js';
import {totUML} from '../Export2tUML.js';
import {exportModel, exportObject} from '../Export2AnimUML.js';
import {Tool, ToolController} from '../RemoteTool.js';
import {testCases, Expected} from '../TestCases.js';
import {stringify, parser as actionLanguageParser, expressionParser} from '../JavaScriptActionLanguageParser.js';
import {RemoteEngine} from '../RemoteEngine.js';
import {exec, execSync} from "child_process";
import {getTriggerContexts} from "../ModelUtils.js";
import {asyncMap} from "../Utils.js";
import {AnimUMLSynchronousCommunicationEngine} from '../AnimUMLSynchronousCommunicationEngine.js';
import {AnimUMLTimedEngine} from '../AnimUMLTimedEngine.js';
import {translateToPlantUMLSyntax, jsStringify} from '../TranslateToPlantUMLSyntax.js';
import {preprocess} from '../Preprocessor.js';
import {analyzeToObject, autoFix} from '../AnimUMLStaticAnalysis.js';



// for ParallelExplore if useHash=true
import subtleCrypto from 'subtle';
globalThis.crypto = {subtle: subtleCrypto};


const fetching = true;

const plantumlURL = process.env.PLANTUML_URL || "localhost:80";


describe("Explorations", function() {
	for(const withBFS of [true, false])
	for(const testCase of testCases) {
		describe(`exploring model ${testCase.load}`, function() {
			const path = testCasePath(testCase);
			let model;
			before(async function() {
				model = await loadModel(path)
			});

			for(const variant of testCase.variants || [{}]) {
				const long = variant.long == undefined ? testCase.long : variant.long;
				if(false && long) {
					// exploring CruiseControlV4 takes too much memory, even though exploring it in ComparedExecutions work
					console.log("Skipping a long test");
					continue;
				}
				const {equals, ...expected} = variant.expected || testCase.expected;
				it(`should have the same state space as recorded when exploring ${withBFS ? "breadth-first" : "depth-first"}: ${testCase.load} => ${JSON.stringify(expected)}`, async function() {
					this.timeout(40000);

					let currentModel = model;
					function load(obj) {
						currentModel = new Model({name: obj.name, objects: [obj]});
					}
					testCase.setup && testCase.setup(model);
					variant.keepOneObject && load(currentModel.getObject(variant.keepOneObject));
					variant.setup && variant.setup(testCase);


					console.log("Expecting: ", expected.nbConfigurations, " configurations; ", expected.nbTransitions, " transitions; ", expected.nbDeadlocks, " deadlocks");

					async function run(engineProvider) {
						const {configs, stoppingConditionReached, ...actual} =
//*
							await explore(await engineProvider(),
/*/
							await parallelExplore(engineProvider,
/**/
								(nbConfigs, nbTrans, nbDeadlocks) => {
									if(nbConfigs % 1000 == 0) {
										console.log(nbConfigs, nbTrans, nbDeadlocks);
									}
								},
								undefined,
								{withBFS},
							);
						/*
						console.log(engine.configuration)
						console.log(expected)
						*/
						console.log(actual)

						assert.deepEqual(actual, expected, `${testCase.load}${variant.keepOneObject ? `.${variant.keepOneObject}` : ""}:`, "expected: ", expected, ", actual: ", actual);
					}
//*
					await run(() => new AnimUMLEngine(currentModel, {keepOneMessagePerTrigger: true, ...testCase.engineSettings, ...variant.engineSettings}));
/**/
					//await run(compressingBuiltInEngine);

					// testing with sysHistoryEngine can unveil bugs in copyConfig
					// maybe the sysHistory-specific copyConfig should be dropped, and serialzieConfig used instead?
					// but sysHistory still supports more features than setConfig, notably wrt. sequence and timing diagrams
					//var actual = await testExecution(sysHistoryEngine);
					//assert(expected.equals(actual), `${testCase.load}${variant.keepOneObject ? `.${variant.keepOneObject}` : ""}:`, "expected: ", expected, ", actual: ", actual);
			//		await run(sysHistoryEngine);

//*
					if((testCase.runWithEMI && (variant.runWithEMI == undefined)) || variant.runWithEMI) {
						this.timeout(120000);	// can be much longer in some cases (e.g., remote server with huge latency (like ESEO server over VPN) in sequential mode)
						globalThis.currentModel = model;
						// variable to remember created engines so that they can be later closed
						let engines = [];
						let done = false
						await run(remoteEngineSupplierFor(model, engines, () => done));
						done = true;
						// closing engines
						for(const engine of engines) {
							engine.close();
						}
					}
/**/
				});
			}
		});
	}
});

describe("ExplicitStateMachines", function() {
	const withoutHistory = [
		"./samples/EMI/CruiseControlv4.js",

		"./samples/Lamp.js",
		"./samples/ButtonLamp.js",
	];
	const withHistory = [
	];
	const modelFiles = [
		...withoutHistory,
		...withHistory,
	];
	for(const modelFile of modelFiles) {
		function allToExplicit(model) {
			model.objects.forEach((sm, i) => {
				const explicitSM = toExplicit(sm, model, false);
				model.objects[i] = explicitSM;
			});
			//console.log(JSON.stringify(exportModel(model), undefined, 2));
		}
		function newEngine(model, name = "AnimUML", autoFireAfterChoice = false) {
			const testCaseSettings = testCases.find(t => t.load === model.name)?.engineSettings;
			const engine = new AnimUMLEngine(model, {
				keepOneMessagePerTrigger: true,
				isCheckedEvent(e) {
					return e.startsWith("GUARD_");
				},
				...model.settings?.semantics ?? {},
				...testCaseSettings ?? {},
				autoFireAfterChoice,
				fireInitialTransitions: true,	// because nested init pseudostates are removed by the transformation to explicit state machines
				disableEther: false,		// because explicit guard handling relies on ether
			});
			engine.extraOperations = {
				setTimer(name, duration) {
					//console.log("setTimer", name.valueOfProperty, duration)
					this[name.valueOfProperty]();
				},
				resetTimer(name) {
					//console.log("resetTimer", name.valueOfProperty)
					delete engine.configuration.ether[name.valueOfProperty];
				},
			};
			engine.name = name;
			return engine;
		}
//*		// actually not true when a shallowHistory is transformed into a choice
		if(withoutHistory.includes(modelFile)) {
			it(`should be the same with one or two applications of the transformation to explicit state machine (toExplicit idempotency): ${modelFile}`, async function() {
				const model = await loadModel(modelFile);
				allToExplicit(model);
				const expected = JSON.stringify(exportModel(model), null, 2);
				allToExplicit(model);
				const actual = JSON.stringify(exportModel(model), null, 2);
				assert.equal(actual, expected, "same serialization after two applications of toExplicit");
			});
		}
/**/
		// This test is kind of made obsolete by the compared execution test below, but may still be useful.
		// For instance, it showed that the state space of a model had the same size, while compared execution failed because of (now fixed) transition ordering issues.
		// + it compares the log trace
		it(`should have a state space with the same number of configurations and transitions whether executed normally or after being transformed to explicit state machines: ${modelFile}`, async function() {
			this.timeout(40000);
			const model = await loadModel(modelFile);

			async function exploreSM(model, autoFireAfterChoice = false) {
				const engine = newEngine(model, undefined, autoFireAfterChoice);
				engine.extraOperations.log = function(...args) {
					//console.log(...args);
					logTrace.push(args);	// remember log trace, so that we can compare it
				};
				//globalThis.builtInEngine = engine;
				const ret = await explore(engine, (...args) => {
					const [nbConfigs] = args;
					if(nbConfigs % 1000 == 0) {
						console.log(...args);
					}
				});
//				const {configs, ...stats} = ret;
//				console.log(stats);
//				console.log(...Object.values(ret).slice(0, 3));
				return ret;
			}
			let logTrace = [];
			const expectedRet = await exploreSM(model);
			const expectedLogTrace = logTrace;
			console.log({...expectedRet, configs: undefined})
			//console.log(logTrace)

			allToExplicit(model);

			let actualLogTrace = logTrace = [];
			const actualRet = await exploreSM(model, true);	// autoFireAfterChoice to test history translation, until we get rid of the generated choice
			//console.log(logTrace)
/*
			fs.writeFileSync("stateSpace-expected.json", JSON.stringify(expectedRet, null, 2));
			fs.writeFileSync("stateSpace-actual.json", JSON.stringify(actualRet, null, 2));
/**/
			assert.equal(actualRet.nbConfigurations, expectedRet.nbConfigurations, "same number of configurations");
			assert.equal(actualRet.nbTransitions, expectedRet.nbTransitions, "same number of transitions");

/*
			console.log({expectedLogTrace})
			console.log({actualLogTrace})
/**/
			assert.deepEqual(actualLogTrace, expectedLogTrace, "same log trace");
		});
		it(`should execute in the same way as a normal or explicit state machine: ${modelFile}`, async function() {
			this.timeout(40000);
			const originalModel = await loadModel(modelFile);
			const explicitModel = await loadModel(modelFile);
			allToExplicit(explicitModel);
/*			// only for debugging
			function saveModel(file, model) {
				fs.writeFileSync(file, JSON.stringify(exportModel(model), null, 2));
			}
			saveModel("/tmp/original.js", originalModel);
			saveModel("/tmp/explicit.js", explicitModel);
/**/
			//console.log(JSON.stringify(exportModel(originalModel), null, 2))
			const toExplicitEngine = newEngine(explicitModel, "explicit", true);	// autoFireAfterChoice to test history translation, until we get rid of the generated choice
			const baseEngine = newEngine(originalModel, "original", false);
//*			// to display configurations in unparsed JSON, otherwise nodejs will only show higher levels
			toExplicitEngine.showConfiguration = (e) => e;
			baseEngine.showConfiguration = (e) => e;
/*			// to avoid transition parsing issues
			toExplicitEngine.showTransition = (e) => e;
			baseEngine.showTransition = (e) => e;
*/
/**/
			const ret = await diffExplore(
				toExplicitEngine,
				baseEngine,
				async (type, ...args) => {
					switch(String(type)) {
					case 'info':
/*						// only for debugging
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
				false
			);
			assert(!ret.diff, "same state space shape");
			console.log(ret)
		});
	}
});


async function build(model, tar, additionalCommand) {
	const tmpDir = await tmpBuild(model, tar);
	if(additionalCommand) {
		await additionalCommand(tmpDir);
	}
	tmpRm(tmpDir);
}

async function generateBuildExplore(model) {
	let engines = [];
	let done = false
	const engineSupplier = await generatedEngineSupplierFor(model, engines, () => done);
	const engine = await engineSupplier();
	applyFireInitialTransitions(engine);
	applyReactiveSystemHypothesis(engine);

	const {configs, stoppingConditionReached, ...actual} =
//*
		await explore(engine,
/*/
		await parallelExplore(engineSupplier,	// TODO: apply reactive system hypothesis
/**/
			(nbConfigs, nbTrans, nbDeadlocks) => {
				if(nbConfigs % 1000 == 0) {
					console.log(model.name, nbConfigs, nbTrans, nbDeadlocks);
				}
			}
		)
	;
	console.log("Exploration results:" , actual)
	done = true;
	for(const engine of engines) {
		engine.close();
	}
}

async function oldGenerateBuildExplore(model) {
	const tar = toC(model, {controllable: true});
	const tmpDir = await tmpBuild(model, tar);
	const processEnd = new Promise(async (resolve, reject) => {
		const process = exec(`cd ${tmpDir} ; cd ${model.name} ; exec ./${model.name}`, {timeout: 50000}, (err, stdout, stderr) => {
			//console.log(stdout);
			console.log(stderr);
		});
/*
		// redundant with timeout above
		setTimeout(() => {
			process.kill("SIGINT");
			console.log("sent SIGINT")
		}, 50000);
		process.on("exit", () => {
			console.log("exit")
		});
*/
		setTimeout(async () => {
			try {
				let engines = [];
				let done = false
				const engineSupplier = remoteEngineSupplierFor(model, engines, () => done, "ws://127.0.0.1:8091/");
				const {configs, stoppingConditionReached, ...actual} =
//*
					await explore(await engineSupplier(),
/*/
					await parallelExplore(engineSupplier,
/**/
						(nbConfigs, nbTrans, nbDeadlocks) => {
							if(nbConfigs % 1000 == 0) {
								console.log(model.name, nbConfigs, nbTrans, nbDeadlocks);
							}
						}
					)
				;
				console.log("Exploration results:" , actual)
				done = true;
				for(const engine of engines) {
					engine.close();
				}
				resolve();
				process.kill("SIGINT");
			} catch(e) {
				process.kill("SIGINT");
			}
		}, 500);	// waiting for process to launch
	});
	await processEnd;
	tmpRm(tmpDir);
}

describe("Exports", function() {
	describe("to AnimUML", function() {
		describe("before build", function() {
			const files = sampleModelFiles();
			for(const file of [
						...files,
					]) {
				it(`should reexport raw models as is for ${file}`, async function() {
					const model = await loadModel(file, undefined, true);
					const exportedModel =
						(model.objects || model.connectorByName) ?
							exportModel(model)
						:
							exportObject(model)
					;
					assert.equal(JSON.stringify(exportedModel, null, 2), JSON.stringify(model, null, 2));
					//assert.equal(exportedModel, model);	// object comparison fails for some reason
				});
			}
		});
		describe("after build", function() {
			const files = sampleModelFiles();
			for(const file of [
						...files,
					]) {
				it(`should reexport built models as is for ${file}`, async function() {
					const rawModel = await loadModel(file, undefined, true);
					// must copy because `new Model(rawModel) changes the rawModel in place
					// also, loading twice (once with raw=false, and once with raw=true) does not work for all models
					let rawModelCopy = JSON.parse(JSON.stringify(rawModel));
					if(!(rawModelCopy.objects || rawModelCopy.connectorByName)) {
						// but at least convert from single object to multi-object model, because export does not revert it
						rawModelCopy = {
							name: rawModelCopy.name,
							objects: [rawModelCopy],
						};
					}


					const model = new Model(rawModel);
					const exportedModel = exportModel(model);
					assert.equal(
						JSON.stringify(exportedModel, null, 2),
						JSON.stringify(rawModelCopy, null, 2)
					);
					//assert.equal(exportedModel, rawModelCopy);	// object comparison fails for some reason
				});
			}
		});
	});
	describe("to C", function() {
		const files = sampleModelFiles();
		const unbuildable = [
			// toExplicit issues
			"Bridge",				// toExplicit not called on class behavior
			"ExemplesExplicites",			// history transformation generates duplicate transition names
			"LecteurK7V1",				// duplicate transition names
			"LecteurK7V2",				// duplicate transition names
			"LecteurK7V5",				// duplicate transition names
			"PubliphoneV3",				// duplicate transition names
			"PubliphoneV4",				// duplicate transition names
			"PubliphoneV5",				// duplicate transition names
			"PubliphoneV6",				// duplicate transition names
			"RobotV3",				// duplicate transition names
			"ShallowHistoryTest",			// history transformation generates duplicate transition names
			"ThermostatV1",				// duplicate transition names
			"ThermostatV2",				// duplicate transition names

			// multivalued element issues
			"AscenseurArchitectureCandidate",	// multivalued object
			"AscenseurContexte",			// multivalued object
			"UML2AnimUML_LevelCrossing",		// multivalued connector
			"UML2AnimUML_TrafficLight",		// multivalued connector
			"UML2AnimUML_ProducerConsumer",		// multivalued connector
			"UML2AnimUML_archiCandidate",		// multivalued connector

			// other issues
			"UML2AnimUML_SyncComposition",		// defines its own Object type
			"UML2AnimUML_TimerModel",		// clock symbol redeclaration

			// non existing types are referenced in property and parameter types
			"BCabine",
		];
		const ungenerable = [
			"UML2AnimUML_TrafficLight",		// SEND to result of AT

			// unidentified issue
			"Bridge",
			"BridgeWithExplicitDBM",
			"BridgeWithExplicitDBMTests",
			"UML2AnimUML_ChallengeMain",
			"UML2AnimUML_LevelCrossing",
			"UML2AnimUML_ProducerConsumer",

			// uses new + additional types not exported by UML2AnimUML + generator would have to start from classes instead of objects
			"UML2AnimUML_SecureScadaSystem-V5",

			// advanced JS
			"WebotsDemo2",
		];
		for(const file of [
					...files,
				]) {
			test("non-controllable", {controllable: false});
			test("controllable", {controllable: true});
			function test(desc, options) {
				it(`should export to ${desc} C without exception: ${file}`, async function() {
					const model = await loadModel(file, undefined, false);

					if(ungenerable.includes(model.name)) {
						console.log("Skipping model with known issues");
						return;
					}
					toC(model, options);
				});

				if(enableCBuildTests) {
					it(`should export to buildable ${desc} C without exception when omitting actions: ${file}`, async function() {
						this.timeout(10000);
						const model = await loadModel(file, undefined, false);
						if(ungenerable.includes(model.name) || unbuildable.includes(model.name)) {
							console.log("Skipping model with known issues");
							return;
						}

						const tar = toC(model, {...options, serializeActions: false});

						//if(true) return;	// to disable actual build test until the gitlab runners support it

						await build(model, tar);
					});
				}
			}
		}
		const unexplorable = [
			// do not build with actions
				// potentially easy to solve
				"UML2AnimUML_TASMonitoringV1",	// enum, properties: add support in UML2AnimUML
				"UML2AnimUML_TASMonitoringV2",
				"UML2AnimUML_AtmUser",
				"UML2AnimUML_ChallengeMain",

				// state space too large to be explored without reactive system hypothesis => see how this is handled in Observers tests
				"UML2AnimUML_CruiseControlv4",
				"SimpleCruiseControl",
				//"WaterPump_c3_one_monitor",

				// ether
				"LampeV1",
				"LampeV1_2",
				"LampeV2",
				"BoutonLampe",
				"BoutonLampeAmpoule",
				"BoutonLampeAmpoulePassive",
				"Lamp",
				"LampWithDisablableTimer",
				"ButtonLamp",
				"ButtonLampBulb",
				"ButtonLampBulbWithMethods",
				"LampeEssaiTest-RemoteStorage",
				"LampeEssaiTest",
				"LecteurK7V3",
				"LecteurK7V4",
				"LevelCrossing",
				"PubliphoneV1",
				"PubliphoneV2",
				"PhotoFinish",
				"BCabine",
				"JDLevelCrossing",

				// JavaScript to C issues
				//	access to attribute without this
				//	explicit calls but without this
				//	missing ";"
				"BridgeWithExplicitDBM",		// + dbm
				"BridgeWithExplicitDBMTests",		// + dbm

				"SynchronousCommunicationExample",

				// timer
				"ButtonLampExplicitTargets",
				"ButtonLampBulbExplicitTargets",

			// builds with actions, but crashes at runtime
				"UML2AnimUML_CruiseControlSystem",	// in libwebsockets

			// webots API
				"WebotsTests",
				"WebotsDemo",
				"WebotsDemo2",

			// undeclared functions
				"RobotModel",
		];
		if(enableCBuildTests) {
			for(const file of [
				...files,
			]
			) {
				it(`should export to explorable C without exception: ${file}`, async function() {
					this.timeout(120000);
					const model = await loadModel(file, undefined, false);
					if(ungenerable.includes(model.name) || unbuildable.includes(model.name) || unexplorable.includes(model.name)) {
						console.log("Skipping model with known issues");
						return;
					}
					await generateBuildExplore(model);
				});
			}
		}
	});
	describe("to tUML", function() {
		const files = sampleModelFiles();
		for(const file of [
					...files,
				]) {
			it(`should export to tUML without exception: ${file}`, async function() {
				const model = await loadModel(file, undefined, false);
				// TODO: check result
				totUML(model);
			});
		}
	});
});

describe("ComparedExecution", function() {
	const modelFiles = [
		"./samples/EMI/AliceBob1.js",
		"./samples/EMI/AliceBob2.js",
		"./samples/EMI/LevelCrossing.js",
		"./samples/EMI/CruiseControlv4.js",
	];
	for(const modelFile of modelFiles) {
		it(`should have the same state space on EMI & AnimUML: ${modelFile}`, async function() {
			this.timeout(120000);
			const model = await loadModel(modelFile);
			try {
				const ret = await comparedExecution(model, obpWebsocketServerURL);
				assert(!ret.diff, "equivalent state spaces");
			} catch(e) {
				console.log(e.stack ?? e);
				assert(false, "compared execution failed");
			}
		});
	}
});

describe("Interaction2TCSVGSequence", function() {
	const modelFiles = [
		{file: "./samples/ButtonLampBulbExplicitTargets.js", models: ["model"]},
		{file: "./samples/ButtonLamp.js", models: ["model"]},
	];
	for(const modelFile of modelFiles) {
		it(`should generate correct SVG files from the interactions defined in: ${modelFile.file} for models ${modelFile.models}`, async function() {
			this.timeout(120000);
			for(const modelId of modelFile.models) {
				const model = await loadModel(modelFile.file, modelId);
				Object.entries(model.interactions || {}).forEach(([interName, inter], index) => {
					if(!inter.isDummy) {
						console.log("Processing", interName);
						console.group();
						exportInteraction2SVG(inter, model);
						console.groupEnd();
					}
				});
			}
		});
	}
});

function listFiles(path) {
	return fs.readdirSync(path, {withFileTypes: true}).flatMap(file => {
		const fullPath = pathm.join(path, file.name);
		if(file.isDirectory()) {
			return listFiles(fullPath);
		} else {
			return [fullPath];
		}
	});
}

function sampleModelFiles() {
	return listFiles("samples").filter(e =>
			e.endsWith(".js")
		&&	e !== "samples/EMI/EMISamples.js"	// not a model
	);
}

describe("allObjectsToPlantUML", function() {
	this.timeout(40000);
	const files = sampleModelFiles();
	for(const file of [
		...files,
	]) {
		describe(`applied to ${file}`, function() {
			let model, dummyEngine;
			before(async function() {
				model = await loadModel(file, "model");
				dummyEngine = {
					getSlots: () => [],
					isFireable: () => !false,
					isActivable: () => !false,
					getFireURI: () => "",
					isCurrent: () => !false,
					eventMatched: () => !false,
					getTransURI(op, transition, part) {
						return `javascript:${op}('${encodeURIComponent(model.transFullName(transition))}'${part ? `,'${part}'` : ''})`;
					},
				};
			});
			// TODO: test more options, including raw & forAnimation
			async function tryWith(params) {
				const pu = allObjectsToPlantUML(model, dummyEngine, params)
						.replace(/@(start|end)uml\n/g, "")	// sub-diagrams @(start|end)uml are supported by the web service in GET mode, but not in command line or with POST
				;
				//const puri = toPlantUMLURI(`http://${plantumlURL}/plantuml/`, pu);
/*
				fs.writeFileSync("testDiagram.puml", `@startuml\n${
					pu
						//.replace(/@(start|end)uml\n/g, "")	// sub-diagrams @(start|end)uml are supported by the web service, but not in command line
				}\n@enduml`);
				console.log(puri);
/**/
				if(fetching) {
					//const resp = await fetch(puri);
					// using POST instead of GET because some diagrams are too big for GET
					const resp = await fetch(`http://${plantumlURL}/plantuml/svg/`, {method: "POST", body: `@startuml\n${pu}\n@enduml`});
					const svg = await resp.text();
/*
					fs.writeFileSync("testDiagram.svg", svg);
					//console.log("Saved to", file)
/**/
					assert(resp.ok, "PlantUML response ok");
					// apparently the reply code is always 200, even when there is an error
					assert.doesNotMatch(svg, />An error has occured/);
					assert.doesNotMatch(svg, />Welcome to PlantUML!</);
				}
			}
			const params = [
				undefined,
				{hideClasses: true},
				{editing: true, raw: false},
				{raw: true},
				{forAnimation: true, raw: false},
				{showMethodsAsActivities: true},
				{showPorts: true},
				{classDiagram: true},
			];
			for(const param of params) {
				it(`should generate correct PlantUML from ${file} with parameters ${JSON.stringify(param)}`, async function() {
					await tryWith(param);
				});
			}
		});
	}
});

describe("parsingActions", function() {
	const files = sampleModelFiles();
	for(const file of [
		...files,
	]) {
		it(`should be possible to parse with the pegjs parser every action from ${file}`, async function() {
			const model = await loadModel(file, "model");
			for(const object of model.objects) {
				function parseExp(type, s) {
					return parse(type, s, expressionParser);
				}
				function parse(type, s, parser = actionLanguageParser) {
					console.log(`${type}:`, s);
					try {
						const parsed = parser.parse(s);
						console.log(JSON.stringify(parsed, null, 2));
						// check that serializing then reparsing yields an equivalent AST
						const reser = stringify(parsed, null, 2);
						console.log(reser);
						assert.deepStrictEqual(parser.parse(reser), parsed, "serializing then parsing does not yield the same AST");
					} catch(e) {
						console.log(e);
						throw e;
					}
				}
				for(const method of Object.values(object.operationByName || {}).filter(op => op.method).map(op => op.method)) {
					parse("method", method);
				}
				function allTransitions(region) {
					return [...region.transitions || [], ...(region.states || []).flatMap(allTransitions)];
				}
				function allStates(region) {
					return [...region.states || [], ...(region.states || []).flatMap(allStates)];
				}
				for(const trans of allTransitions(object)) {
					if(trans.guard) {
						parseExp("guard", trans.guard);
					}
					if(trans.effect) {
						parse("effect", trans.effect);
					}
				}
				for(const state of allStates(object)) {
					if(state.entry) {
						parse("entry", state.entry);
					}
					if(state.exit) {
						parse("exit", state.exit);
					}
					if(state.doActivity) {
						parse("doActivity", state.doActivity);
					}
				}
			}
		});
	}
});

// TODO: for remote tool and remote engine: make sure we close the connection and that there is no pending promise preventing node from properly terminating

// TODO: OBP2 tests
//	- LTL verification
//	- LTL parsing error
//	- state space exploration
describe("LTL model checking", function() {
	async function test(reactiveSystem) {
		const model = await loadModel("samples/ButtonLamp.js");
		const engine = new AnimUMLEngine(model, {
			autoFireAfterChoice: true,
			keepOneMessagePerTrigger: true,
			fireInitialTransitions: true,
			checkEvents: true,
			reactiveSystem,
		});

		function slots2GPSL(slots, isAtoms) {
			return Object.entries(slots).map(([propName, prop]) => `${propName} = ${isAtoms ? `|${prop}|` : prop}`);
		}
		const gpsl = [...slots2GPSL(model.watchExpressions, true), ...slots2GPSL(model.LTLProperties)].join("\n");
		const LTLPropertyNames = Object.keys(model.LTLProperties);

		const toolURL = `http://${obpWebsocketServerURL}/obp2`;

		let toolController;
		const result = new Promise((resolve) => {
			const tool = new Tool(`${toolURL}`, {
				onuuid(uuid) {
					toolController = new ToolController(`${toolURL}/control`);
					//const toolCommands = await toolController.askCommands();
					tool.setEngine(engine);
					toolController.sendCommand("VERIFY_LTL_PROPERTY", uuid, `lampTurnsOn:${gpsl}`);
					// closing here seems to be causing some race condition in the server between receiving this message and closing the connection
					//toolController.close();
				},
				onerror(msg) {
					console.error(msg);
				},
				onresults(msg) {
					resolve(msg);
					tool.close();
				},
			});
		});
		console.log(await result);
		result.then(() => toolController.close());
		return await result;
	}
	it(`should verify that ButtonLamp's lampTurnsOn property is violated without the reactive system hypothesis`, async function() {
		this.timeout(10000);
		assert((await test(false)).match(/VIOLATED/));
	});
	it(`should verify that ButtonLamp's lampTurnsOn property is satisfied with the reactive system hypothesis`, async function() {
		this.timeout(10000);
		assert((await test(true)).match(/SATISFIED/));
	});
});
 
// with partial state space exploration (with a stoppingCondition)
// Should probably use breadth-first, but not supported for bisimulation yet
describe("DBMs", function() {
	it(`should be possible to bisimulate Bridge & BridgeWithExplicitDBM`, async function() {
		this.timeout(100000);

/*
		const implicitDBM = await loadModel("samples/Bridge.js");
		const explicitDBM = await loadModel("samples/BridgeWithExplicitDBM.js");

		const implicitEngine = new AnimUMLSynchronousCommunicationEngine(new AnimUMLTimedEngine(new AnimUMLEngine(implicitDBM, {fireInitialTransitions: true})));
		implicitEngine.name = "implicit DBM";
		const explicitEngine = new AnimUMLSynchronousCommunicationEngine(new AnimUMLEngine(explicitDBM, {
			fireInitialTransitions: true,
			disableEther: true,			// the Bridge model does not use the ether, but it becomes filled by calls to passive DBM methods
			//keepOneMessagePerTrigger: true,	// if the ether was not disabled, this would be necessary to make sure it does not grow indefinitely
		}));
		explicitEngine.name = "explicit DBM";

		implicitEngine.showConfiguration = implicitEngine.parseConfiguration;
		implicitEngine.showTransition = e => e;
		explicitEngine.showConfiguration = explicitEngine.parseConfiguration;
		explicitEngine.showTransition = e => e;
/*/
		async function createEngine(path, usesImplicitDBMs) {
			const model = await loadModel(path);
			let engine = new AnimUMLEngine(model, {
				fireInitialTransitions: true,
				disableEther: true,			// the Bridge model does not use the ether, but it becomes filled by calls to passive DBM methods (for explicit version)
				//keepOneMessagePerTrigger: true,	// if the ether was not disabled, this would be necessary to make sure it does not grow indefinitely
			});
			if(usesImplicitDBMs) {
				engine = new AnimUMLTimedEngine(engine)
			}
			engine = new AnimUMLSynchronousCommunicationEngine(engine);
			engine.name = (usesImplicitDBMs ? "Im" : "Ex") + "plicitDBM";

			engine.showConfiguration = engine.parseConfiguration;
			engine.showTransition = e => e;
			return engine;
		}
		const implicitEngine = await createEngine("samples/Bridge.js", true);
		const explicitEngine = await createEngine("samples/BridgeWithExplicitDBM.js", false);
/**/

		function cut(engine, cuttingCondition) {
			const originalGetFireables = engine.getFireables;
			engine.getFireables = async () => {
				if(await cuttingCondition(engine)) {
					return [];
				} else {
					const fireables = await originalGetFireables();
					return fireables;
				}
			};
		}

		function configBasedCuttingCondition(cuttingCondition) {
			return async (engine) => {
				const config = await engine.getConfiguration();

				return cuttingCondition(JSON.parse(config))
			};
		}

		function someSafe(config) {
			function vSafe(n) {
				return config.currentState[`viking${n}`][0] === `viking${n}.Safe`;
			}
			// cutting when any viking is safe works
			//return [vSafe(1), vSafe(2), vSafe(3), vSafe(4)].filter(e => e).length >= 1;
			//OR: return vSafe(1) || vSafe(2) || vSafe(3) || vSafe(4)];
			// cutting when two vikings are safe does not work, because with DBMs it is possible for a viking to go back and forth indefinitely without the other moving at all
			//return [vSafe(1), vSafe(2), vSafe(3), vSafe(4)].filter(e => e).length >= 2;

			return [vSafe(1), vSafe(2), vSafe(3), vSafe(4)].filter(e => e).length >= 4;
		}
		const cutCond1 = configBasedCuttingCondition(someSafe);

		const maxBound = 60;

		const visitedi = new Map();
		let nbSomeSafe=0;
		const cutCond2i = async (engine) => {
			const config = await engine.getConfiguration();

			if(someSafe(JSON.parse(config)))
			nbSomeSafe++

			const configWithoutDBM = JSON.stringify({...JSON.parse(config), ...{dbm: undefined}});
			if(visitedi.has(configWithoutDBM) && visitedi.get(configWithoutDBM) !== config) {
				// already visited the same config with a different DBM
				// remark: cutting in this way may prevent finding fastest solution... globalClock should probably be taken into account
				return true;
			} else {
				visitedi.set(configWithoutDBM, config);
			}

			const bound = await engine.evaluateAtom("let globalClockId = 5; __getDBM__().getMin(globalClockId)");
			//console.log("impl", {bound});
			return bound > maxBound;
		};


		// with side effects, but returns config to facilitate its use
		function normalizeExplicitConfig(config) {
			// normalizing config
			config.dbm = config.objectState.dbm.internalDBM ?? [0,32767,32767,32767,32767,0,32767,0,32767,32767,32767,32767,32767,32767,0,32767,32767,32767,32767,32767,32767,0,32767,32767,32767,32767,32767,32767,0,32767,0,32767,32767,32767,32767,0];
			config.objectState.dbm = undefined;
			config.objectState.viking1.y = undefined;
			config.objectState.viking2.y = undefined;
			config.objectState.viking3.y = undefined;
			config.objectState.viking4.y = undefined;
			//config.ether = {};

			return config;
		}
		const visitede = new Map();
		const cutCond2e = async (engine) => {
			const config = await engine.getConfiguration();
			const configWithoutDBM = JSON.stringify({...normalizeExplicitConfig(JSON.parse(config)), ...{dbm: undefined}});
			if(visitede.has(configWithoutDBM) && visitede.get(configWithoutDBM) !== config) {
				return true;
			} else {
				visitede.set(configWithoutDBM, config);
			}

			const bound = await engine.evaluateAtom("let globalClockId = 5; new __builtin__.DBM(__ROOT__dbm.nextClock, __ROOT__dbm.internalDBM).getMin(globalClockId)");
			//console.log("expl", {bound});	// TODO: why is this sometimes different from impl's value?
			return bound > maxBound;
		};

		cut(implicitEngine, cutCond2i);
		cut(explicitEngine, cutCond2e);

		const result = await diffExplore(
			implicitEngine,
			explicitEngine,
			async (type, ...args) => {
				switch(String(type)) {
				case 'info':
/*					// only for debugging
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
/*
					// using the configurationComparator as a stopping condition... TODO: add support for stoppingCondition to DiffExplorer?
					const leftConfig = JSON.parse(left);

					function vSafe(n) {
						return leftConfig.currentState.[`viking${n}`][0] === `viking${n}.Safe`;
					}
					return !(vSafe(1) && vSafe(2));
/*/
					const rightConfig = JSON.parse(right);

					normalizeExplicitConfig(rightConfig);
					const normalizedRight = JSON.stringify(rightConfig);
					//console.log("left:           ", left)
					//console.log("normalizedRight:", normalizedRight);
					return left === normalizedRight;
/**/
				},
			}
		);
		console.log({...result, configs: undefined});
		assert(!result.diff, "same state space shape");
		console.log("number of configs with some safe:", nbSomeSafe)
	});
});

import {getEventType} from "../ImportFromPlantUMLSequence.js";

describe("Translation to PlantUML-like syntax", function() {
	const files = sampleModelFiles();
	const entryComparator = ([an, av], [bn, bv]) => an < bn ? -1 : an > bn ? 1 : 0;
	const namedComparator = (a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
	const excludedFiles = [
		// synchronous communication
		"samples/Bridge.js",
		"samples/BridgeWithExplicitDBM.js",
		"samples/BridgeWithExplicitDBMTests.js",
		"samples/SynchronousCommunicationExample.js",
	];
	for(const file of	[
					...files.filter(file =>
						!excludedFiles.includes(file)
					),
				]) {
		it(`should be possible to translate back and force without change for ${file}`, async function() {
			const model = await loadModel(file, "model");

			// normalizing
			function normalize(model) {
				function trim(e, prop) {
					e[prop] = e[prop]?.trimStart();
				}
				function process(region) {
					// PlantUML-like state machine parsing automatically adds missing () in triggers
					// Adding them here makes sure this will not count as a difference when diffing below
					function processTrans(trans) {
						if(trans.trigger && !trans.trigger.endsWith(")")) {
							trans.trigger = `${trans.trigger}()`;
						}
						trim(trans, "effect");
					}
					(region.transitions ?? []).forEach(processTrans);
					Object.entries(region.internalTransitions ?? {}).forEach(([transName, trans]) => processTrans(trans));

					if(region.stateByName) {
						const states = Object.entries(region.stateByName);
						for(const entry of states) {
							if(entry[1].kind) {
								// this is always set by parser
								entry[1].type = "Peudostate";
							}
							switch(entry[1].kind) {
								// it also names "init" the initial pseudostates
								case "initial":
									entry[0] = entry[1].name = "init";
									break;
								case "shallowHistory":
									entry[0] = entry[1].name = "_hist_";
									break;
								case "terminate":
									entry[0] = entry[1].name = "__end__";
									break;
							}
							entry[0] = entry[1].name = entry[0].replace(/__SPACE__/g, " ");

							trim(entry[1], "entry");
							trim(entry[1], "exit");
						}
						// it also places initial pseudostates first... and actually ordering is hard to guarrantee -> normalizing it
						//console.log("before sort", states.map(([a, v]) => a), region.states.map(e => e.name));
						states.sort(entryComparator);
						//region.states.sort(namedComparator);
						//console.log("after sort", states.map(([a, v]) => a), region.states.map(e => e.name));
						region.stateByName = Object.fromEntries(states);

						states.forEach(([stateName, state]) => process(state));
					}
/*
					if(region.operationByName) {	// should only exist at object level, not in subregions
						for(const op of Object.values(region.operationByName)) {
							normalizeMethod(op);
						}
					}
*/
				}
				function normalizeMethod(op) {
					op.method = op.method
						// collapse all non-newline whitespace sequences to a single space
						?.replace(/[ \t\r]+/g, " ")
						// remove spaces around newlines
						.replace(/ ?\n ?/g, "\n")
						.trim()
					;
				}
				model.objects.forEach(process);
				function normalizeFeature(e) {
					if(e.comment) {
						(e.comments ??= []).push(e.comment);
						e.comment = undefined;
					}
					if(e.comments) {
						e.comments = e.comments.map(e => e.trim());
					}
					if(e.private === false) {
						e.private = undefined;
					}
				}
				for(const object of [...model.objects, ...Object.values(model.classes ?? {})]) {
					for(const [,prop] of Object.entries(object.propertyByName ?? {})) {
						// defaultValues are parsed as strings
						if(prop.defaultValue !== undefined) {
							prop.defaultValue = "" + prop.defaultValue;
						}
						normalizeFeature(prop);
					}
					for(const [,op] of Object.entries(object.operationByName ?? {})) {
						normalizeFeature(op);
						if(op.parameters) {
							op.parameters = op.parameters.map(param =>
								typeof(param) === "string"
								?	{name: param}
								:	param
							);
						}
						normalizeMethod(op);
					}
				}
				for(const [name, inter] of Object.entries(model.interactions ?? {})) {
					if(inter.title === null) {
						inter.title = undefined;
					}
					function visit(e) {
						const type = getEventType(e);
						switch(type) {
							case "loop":
								e.loopBody = e.loopBody.map(visit);
								break;
							case "alt":
/*
								for(const alt of e.alternatives) {
									alt.altBody = alt.altBody.map(visit);
								}
*/
								e.alternatives = e.alternatives.map(visit);
								break;
							case "alternative":
								e.altBody = e.altBody.map(visit);
								break;
							case "ref":
								if(e.gates?.length === 0) {
									e.gates = undefined;
								}
								break;
						}
						if(e.arguments?.length === 0) {
							e.arguments = undefined;
						}
						if(e.type) {
							//assert.equal(type, e.type, "recomputed event type");
						} else {
							e.type = type;
						}

						return Object.fromEntries(Object.entries(e).sort((a, b) => a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0));
					}
					inter.events = inter.events.map(visit);
				}
			}
			normalize(model);

			const expected = JSON.stringify(exportModel(model), undefined, 2);

			const serModel = exportModel(translateToPlantUMLSyntax(model));
/*
			const stringify = JSON.stringify;
			const parse = JSON.parse;
/*/
			const stringify = jsStringify;
			const parse = (s) => eval(`(${s})`);
/**/
			const exportedModel = stringify(serModel, undefined, 2);
			console.log("exportedModel:", exportedModel)

/*
			await preprocess(serModel);
			const reparsedModel = new Model(serModel);
/*/
			const reimportedModel = parse(exportedModel);
			await preprocess(reimportedModel);
			const reparsedModel = new Model(reimportedModel);
/**/
			normalize(reparsedModel);

			const actual = JSON.stringify(exportModel(reparsedModel), undefined, 2);

			//console.log("expected:", expected, "exportedModel:", exportedModel, "actual:", actual);
			assert.equal(actual, expected, "same serialization after translation to PlantUML-like syntax and back");
		});
	}
});

describe("Static analysis", function() {
	const excludedFiles = [
		// synchronous communication
/*
		"samples/Bridge.js",
		"samples/BridgeWithExplicitDBM.js",
		"samples/BridgeWithExplicitDBMTests.js",
		"samples/SynchronousCommunicationExample.js",
*/
	];
	const files = [
		...sampleModelFiles().filter(file =>
			!excludedFiles.includes(file)
		),
		"test/samples/WarningTest/WarningTest.js",
	];
	async function actuals() {
		const ret = [];
		for(const file of files) {
			const model = await loadModel(file, "model");
			const actual = analyzeToObject(model);
			ret.push([
				file,
				actual,
			]);
		}
		//console.log(JSON.stringify(Object.fromEntries(ret), undefined, 2));
		const file = "/tmp/actuals.json";
		fs.writeFileSync(file, JSON.stringify(Object.fromEntries(ret), undefined, 2));
		console.log(`Actual issues written to ${file}.`);
	}
	const allExpected = JSON.parse(fs.readFileSync("test/samples/WarningTest/Expected.json"));
	for(const file of files) {
		it(`should have the same warnings and errors as before for ${file}`, async function() {
			const model = await loadModel(file, "model");

			const expected = allExpected[file];
			const actual = analyzeToObject(model);
			//console.log({expected, actual})
			assert.ok(expected, "expected value must exist");
			assert.deepStrictEqual(actual, expected, "same warnings and errors as before");
		});
		it(`should be auto-fixable for file ${file}`, async function() {
			const model = await loadModel(file, "model");

			const actual = autoFix(model);
			//assert.deepStrictEqual(actual, expected, "same warnings and errors as before");
		});
	}
/*
	it(`computes all actuals, e.g., to be stored as Expected.json after manual checks`, async function() {
		await actuals();
	});
/**/
});

