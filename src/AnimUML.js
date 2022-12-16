var startAndNoExportAtEOF = true;
//*
import {totUML} from './Export2tUML.js';
import {toC} from './Export2C.js';
import {toCeptre} from './Export2Ceptre.js';
import {Tool, ToolController} from './RemoteTool.js';
import {EMIRemoteEngine} from './EMIRemoteEngine.js';
import {exportModel, exportObject} from './Export2AnimUML.js';
import {allObjectsToPlantUML, toPlantUML} from './Export2PlantUML.js';
import {toExplicit} from './TransformStateMachine2Explicit.js';	// for testConversions
import {toPlantUMLTiming} from './History2PlantUMLTiming.js';
import {toPlantUMLBranchingHistory} from './History2PlantUMLBranchingHistory.js';
import {toPlantUMLSeq} from './History2PlantUMLSequence.js';
import {toPlantUMLURI} from './PlantUMLURI.js';
import {escapeId} from './ExportUtils.js';
import {unique, diffInternal, entryNameComparator, remove, exportSymbols, indentEsc, hasElements, last, getSelected, forEachEntryAsync} from './Utils.js';
import {makeDiffExploreLogger} from './DiffExplorer.js';
import {testCases} from './TestCases.js';
import {buildModel} from './ImportFromAnimUML.js';
import {Editor, initEditor, updateStates} from './Editor.js';
import {Model} from './Model.js';
import {AnimUMLEngine} from './AnimUMLEngine.js';
import {InteractionEngine} from './InteractionEngine.js';
import {SynchronousCompositionEngine} from './SynchronousCompositionEngine.js';
import {AnimUMLSmallerStepsEngine} from './AnimUMLSmallerStepsEngine.js';
import {history2TCSVGSequence} from './History2TCSVGSequence.js';
import {interaction2TCSVGSequence} from './Interaction2TCSVGSequence.js';
import {inactivateSVG} from './TCSVGSequenceGenerator.js';
import {preprocess} from './Preprocessor.js';
import {AnimUMLSynchronousCommunicationEngine} from './AnimUMLSynchronousCommunicationEngine.js';
import {AnimUMLTimedEngine} from './AnimUMLTimedEngine.js';
import {getTriggers, getEventName} from './ModelUtils.js';
import {ObserverAnimUMLEngine} from './ObserverAnimUMLEngine.js';
import {indent} from './TemplateUtils.js';
import {translateToPlantUMLSyntax, jsStringify} from './TranslateToPlantUMLSyntax.js';
import {analyzeToObject, autoFix, analyze} from './AnimUMLStaticAnalysis.js';



export {last} from './Utils.js';

// apparently mostly useless, still need the "manual exports" at this end of this file
export {
//	isCurrentState,
//	getObject,
	testExport,
	//testExecutions,
	testComparedExecutions,
	sysHistoryEngine,
	// for UI
	toggle,
	disconnectFromEMI,
	disconnectFromTool,
	backTo,
	fire,
	emiFire,
//	getTransition,
	// for modules
	diffInternal,
//	parseEMIConfiguration,
//	convertEMI2AnimUML,
};

/*/
"use strict";	// modules are automatically strict, so only needed if not in a module
(async function() {
	await myImport("totUML", "Export2tUML");
	await myImport("toC", 'Export2C');

	await myImport(["Tool", "ToolController"], 'RemoteTool');

	await myImport("EMIRemoteEngine", 'EMIRemoteEngine');

	await myImport(["exportModel", "exportObject"], 'Export2AnimUML');
	// uncomment for testing
	//testExport();
	await myImport(["allObjectsToPlantUML", "toPlantUML", "showExplicit"], 'Export2PlantUML');
	await myImport("toExplicit", 'TransformStateMachine2Explicit');
	await myImport("toPlantUMLTiming", 'History2PlantUMLTiming');
	await myImport("toPlantUMLSeq", 'History2PlantUMLSequence');
	await myImport("toPlantUMLURI", 'PlantUMLURI');
	await myImport("escapeId", 'ExportUtils');
	await myImport(["exportSymbols", "indentEsc", "hasElements", "last", "getSelected", "forEachEntry"], 'Utils');
	await myImport("testCases", 'TestCases');
	await myImport("buildModel", 'ImportFromAnimUML');
	await myImport(["Editor", "initEditor", "updateStates"], 'Editor');
	await myImport("Model", 'Model');
	await myImport("AnimUMLEngine", 'AnimUMLEngine');

	start();
})();
startAndNoExportAtEOF = false;
/**/
function start() {
	doExportSymbols();
	if(document.location.hash.match(/^#({|%7B)/)) {
		try {
			var example = JSON.parse(decodeURIComponent(document.location.hash.slice(1)));
			// prefix name to avoid collisions with built-in examples
			example.name = `Imported_${example.name.replace(/^Imported_/, '')}`;
			example = buildModel(example);
			//load(example);
			examples.unshift(example);
		} catch(e) {
			console.log("Error importing model from URL: %s", e);
			throw e;
		}
	}
	init();

	window.builtInEngine = new AnimUMLEngine(undefined, {
		get checkEvents() {
			return checkEvents.checked;
		},
		get enableEventPools() {
			return enableEventPools.checked;
		},
		get keepOneMessagePerTrigger() {
			return keepOneMessagePerTrigger.checked;
		},
		get fireInitialTransitions() {
			return fireInitialTransitions.checked || showExplicitSM.checked;
		},
		get autoFireAfterChoice() {
			return autoFireAfterChoice.checked || showExplicitSM.checked;
		},
		get considerGuardsTrue() {
			return considerGuardsTrue.checked;
		},
		get matchFirst() {
			return matchFirst.checked;
		},
		get reactiveSystem() {
			return reactiveSystem.checked;
		},
		get symbolicValues() {
			return symbolicValues.checked;
		},
		async onconfigchanged() {
			// TODO: only update atom GUI in interactive mode?
			const atomValues = await updateAtomValues();
			if(sysHistory.length > 0) {
				last(sysHistory).watchExpressions = atomValues;
			}
			//updateFig();	// TODO: this is duplicatng work done somewhere else. Added on 20220827 to makeit possible for plugins to trigger view updates.
		},
	});


	window.engine = builtInEngine;

	baseEngine = builtInEngine;

	synchronousCommunication.onchange();

	loadFirstValidExample();
}

let baseEngine;

function isSyncCom() {
	return window.builtInEngine instanceof AnimUMLSynchronousCommunicationEngine;
}

function isTimed() {
	return	(window.builtInEngine instanceof AnimUMLTimedEngine)
	||	(
			isSyncCom()
		&&
			(window.builtInEngine.baseEngine instanceof AnimUMLTimedEngine)
	);
}

withDBM.onchange =
synchronousCommunication.onchange = () => {
	function makeBase() {
		window.builtInEngine = window.engine = baseEngine;
	}
	function makeTimed() {
		window.builtInEngine = window.engine = new AnimUMLTimedEngine(window.engine);
	}
	function makeSyncCom() {
		window.builtInEngine = window.engine = new AnimUMLSynchronousCommunicationEngine(window.engine);
	}
	if(synchronousCommunication.checked) {
		if(withDBM.checked) {
			if(!isTimed()) {
				makeBase();
				makeTimed();
			}
			if(!isSyncCom()) {
				makeSyncCom();
			}
		} else {
			if(isTimed() || !isSyncCom()) {
				delete baseEngine.extraOperations.__getDBM__;
				makeBase();
				makeSyncCom();
			}
		}
	} else {
		if(withDBM.checked) {
			if(isSyncCom() || !isTimed()) {
				makeBase();
				makeTimed();
			}
		} else {
			delete baseEngine.extraOperations.__getDBM__;
			makeBase();
		}
	}
};


// PlantUML configuration variables:
var	plantumlServer = 'www.plantuml.com';
//	plantumlServer = '127.0.0.1:8080'
	plantumlServer = location.host;	// use same server as the one serving AnimUML, otherwise cross-site scripting protection prevents ANimUML from working properly
var plantumlPrefix = '/plantuml/'
var pu = document.location.protocol + '//' + plantumlServer + plantumlPrefix;
//pu = "https://animuml.kher.nl/plantuml/";


const svgNS = "http://www.w3.org/2000/svg";
const xlinkNS = "http://www.w3.org/1999/xlink";

const wsHost = document.location.hostname;
const wsProt = document.location.protocol.match(/https/) ? "wss" : "ws";
const wsPort = document.location.port.length == 0 ? "" : `:${document.location.port}`;
const defaultToolURL = `${wsProt}://${wsHost}${wsPort}/obp2`;
toolURL.value = defaultToolURL;
const emiURLPrefix = `${wsProt}://${wsHost}${wsPort}/emi`;
emiURL.value = `${emiURLPrefix}/LevelCrossing.emi/`;

// Config
const defaultsToAllObjects = true;
const testCSSAnimation = false;

// Some constants
const colors = {
	currentStateColor: "lightgreen",
	fireableTransitionColor: "green",
	noEventColor: "red",
	falseGuardColor: "red",
};

// Some global variables
var editing = false;
var currentModel;	// current model
//var displayedObjects;	// currently displayed object
window.displayedObjects = undefined;
var participants;

// prefix before actual javascript: URI calls (in case we are in an iframe)
var callPrefix = "";



const objectSelect = document.getElementById('objectSelect');
const ALL_OBJECTS = "All objects";
objectSelect.onchange = e => {
	var selected = getSelected(objectSelect);
	if(selected == ALL_OBJECTS) {
		displayedObjects = currentModel.objects.slice();
		updateStates(currentModelWrapper);
		updateFig();
	} else {
		switchToObject(selected);
	}
};
function getObjectSelectIndex(objectName) {
	return currentModel.objects.map(e => e.name).indexOf(objectName) + (defaultsToAllObjects ? 1 : 0);
}
function switchToObject(objectName) {
	// for the case when not switching from select (e.g., from Sequence diagram)
	objectSelect.selectedIndex = getObjectSelectIndex(objectName);

	displayedObjects = [currentModel.getObject(objectName)];
	updateStates(currentModelWrapper);
	updateFig();
}


var currentModelWrapper;
const oldCurrentModelWrapper = {


};

var hideEmptyHistory = false;
var changeSVGLinksIntoListeners = false;
var styleMode;
async function load(model) {
	const ret = await internalLoad(model);
/*
	(async () => {
		const treeBuilder = new (await import('./AnimUMLTree.js?nocache=${new Date()}')).TreeBuilder(ret);
		let tree;
		function update() {
			tree = treeBuilder.getTree();
			console.log(JSON.stringify(tree, null, 2));
		}
		update();
		Object.values(tree.actions)[0].perform("ButtonLamp");
		update();
		Object.values(tree.models)[0].actions["New object diagram"].perform();
		update();
		let url = Object.values(Object.values(tree.models)[0].diagrams)[0].getURL();
		function showURL() {
			console.log(document.location.protocol + '//' + plantumlServer + url);
		}
		showURL();
		update();
		Object.values(tree.models)[0].actions["Open state diagram of button"].perform();
		update();
		url = Object.values(Object.values(tree.models)[0].diagrams)[1].getURL();
		showURL();
		Object.values(tree.models)[0].actions["New execution"].perform();
		update();
	})();
*/
	updateInteractions();

	updateFig();
	return ret;
}
async function internalLoad(model) {
	var historyCauses = model.historyCauses;
	await preprocess(model, loadFromParent);
	model = new Model(model, {
		onload(model) {
		},
		onaddobject(object) {
			builtInEngine.setInitialState(object);
		},
	});
	currentModel = model;
	currentModelWrapper = model;
	builtInEngine.setModel(model);

	if(defaultsToAllObjects) {
		displayedObjects = currentModel.objects.slice();
	} else {
		displayedObjects = [currentModel.objects[0]];
	}
	participants = currentModel.objects.slice();

	editor.setModel(model);

	checkEvents.checked = model.objects.length > 1;
	emiURL.value = `${emiURLPrefix}/${model.name.replace(/^(Imported_)?(UML2AnimUML_)?/, "")}.emi/`;
	toolURL.value = defaultToolURL;
	updateObjects();
	updateExport(model);// already called by updateStates below?
	updateStates(model);

	if(window != window.parent) {
		changeSVGLinksIntoListeners = true;
	}

/*
	// https://flaviocopes.com/javascript-detect-dark-mode/
	if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
		styleMode = "dark";
		// TODO: detect mode change?
	}
*/
	if(model.settings) {
		var is = model.settings.interface;
		var ds = model.settings.display;
		var ss = model.settings.semantics;
		var ts = model.settings.tools;

		if(ts) {
			if(ts.defaultRemoteEngineURL) {
				emiURL.value = ts.defaultRemoteEngineURL;
			}
			if(ts.defaultRemoteAnalysisToolURL) {
				toolURL.value = ts.defaultRemoteAnalysisToolURL;
			}
		}

		if(is) {
			if(is.load) {
				var example;
				if(is.load.match(/^#/)) {
					example = await loadFromParent(is.load, is.iframe);
					try {
						example = JSON.parse(example);
					} catch(e) {
						console.log("Cannot parse as JSON:", e);
						console.log("Attempting eval...");
						example = eval(example);
					}
				} else {
					example = examples.find(e => e.name == is.load);
				}
				if(model.settings.overrides) {
					Object.entries(model.settings.overrides).forEach(([path, value]) => {
						const idx = example.objects.findIndex(object => object.name === path);
						if(idx >= 0) {
							example.objects[idx] = value;
						} else {
							const parts = path.split(".");
							var cur = example;
							for(const part of parts.slice(0, -1)) {
//const old = cur;
								if(Array.isArray(cur)) {
									cur = cur.find(e => e.name === part);
								} else {
									cur = cur[part];
								}
//console.log(old, "-[", part, "]->", cur);
							}
							const part = parts.slice(-1)[0];
//console.log(cur, ".", part, "=", value);
							if(Array.isArray(cur)) {
								value.name = value.name || part;
								const idx = cur.findIndex(e => e.name === part);
//console.log(cur, "[name='", name, "'].index = ", idx);
								if(idx >= 0) {
									cur[idx] = value;
								} else {
									cur.push(value);
								}
							} else {
								cur[part] = value;
							}
						}
					});
//console.log(example)
				}
				if(!historyCauses && model.objects[0].historyCauses) {
					historyCauses = model.objects[0].historyCauses;
				}
				let oldModel = model;
				model = await internalLoad(example);
				if(historyCauses) {
					//example = Object.assign({}, example);
					model.historyCauses = historyCauses;
				}
				if(oldModel.settings.defaultToolValues) {
					model.settings.defaultToolValues = model.settings?.defaultToolValues || {};
					Object.assign(model.settings.defaultToolValues, oldModel.settings.defaultToolValues);
				}
			}
			if(is.displayedObjects) {
				displayedObjects = is.displayedObjects.map(on => model.getObject(on));
				participants = displayedObjects.slice(0);
				if(displayedObjects.length == 1) {
					objectSelect.selectedIndex = getObjectSelectIndex(displayedObjects[0].name);
				}
			}
			if(is.iframe) {
				callPrefix = `(globalThis.get?.('${is.iframe}')??globalThis).`;
			}
			if(is.hideEmptyHistory) {
				hideEmptyHistory = true;
			}
			if(is.interactionHeight) {
				seqDiag.style.height = is.interactionHeight;
				seqDiag.style.overflow = "auto";
			}
			if(is.mainHeight) {
				mainDiag.style.height = is.mainHeight;
				mainDiag.style.overflow = "auto";
			}
			if(is.disableExperimental) {
				const exps = document.getElementsByClassName("experimental");
				for(const e of exps) {
					hide(e);
				}
			}
			if(is.disableInteractionSelection) {
				interactionSelection.style.display = "none";
			}
			if(is.disableModelSelection) {
				hide(modelSelection);
				model.name = model.name.replace(/^Imported_/, '');
				// in case there was a single root object:
				model.objects[0].name = model.objects[0].name.replace(/^Imported_/, '');
			}
			if(is.disableObjectSelection) {
				hide(objectSelection);
			}
			if(is.disableDoc) {
				hide(docButton);
			}
			if(is.disableSettings) {
				hide(settingsButtons);
			}
			if(is.disableHistorySettings) {
				hide(historySettings);
			}
			if(is.disableReset) {
				hide(resetButton);
			}
			if(is.disableSwitchDiagram) {
				hide(switchDiagram);
			}
			if(is.mainWidth) {
				mainDiag.style.width = is.mainWidth;
			}
			if(is.histWidth) {
				seqDiag.style.width = is.histWidth;
			}
			if(is.onlyInteraction) {
				seqDiag.style.left = 0;
				seqDiag.style.width = "100%";
				mainDiag.style = 'display: none';
			}
			if(is.hideInteraction) {
				mainDiag.style  = 'width: 100%;'
				seqDiag.style = 'display: none';
			}
			if(is.disableExports) {
				//hide(modelExports);	// now part of settingsButtons
				hide(historyExports);
			}
/*
			if(is.hideHistory) {
				hide(seqDiag);
			}
/**/
			if(is.disableEdit) {
				hide(editButton);
			}
			if(is.historyType) {
				setHistoryType(is.historyType);
			}
			if(is.interaction) {
				defaultInteraction = is.interaction;
			}
			if(is.styleMode) {
				styleMode = is.styleMode;
				if(styleMode === "dark") {
					document.getElementsByTagName("body")[0].classList.add("dark-mode");
				}
			}
		}

		if(ds) {
			hideLinks.checked = ds.hideLinks;

			hideClasses.checked = ds.hideClasses;
			hideOperations.checked = ds.hideOperations;
			showEventPools.checked = ds.showEventPools ?? true;
			hideMethods.checked = ds.hideMethods;
			showPorts.checked = ds.showPorts;
			showEndNames.checked = ds.showEndNames;
			showClassDiagram.checked = ds.showClassDiagram;
			showMethodsAsActivities.checked = ds.showMethodsAsActivities;
			showActorsAsObjects.checked = ds.showActorsAsObjects;

			hideStateMachines.checked = ds.hideStateMachines;
			hideOuterSMBoxes.checked = ds.hideOuterSMBoxes;
			// not exported, so should not be imported
			//showExplicitSM.checked = ds.showExplicitSM;
			showSelfTransitionsAsInternal.checked = ds.showSelfTransitionsAsInternal;

			hideStates.checked = ds.hideStates;
			showPseudostateInvariants.checked = ds.showPseudostateInvariants;
			hideSets.checked = ds.hideSets;
			showTransitions.checked = ds.showTransitions;

			showComments.checked = ds.showComments ?? true;
		}

		if(ss) {
			const semanticSettings = [
				"fireInitialTransitions",
				"autoFireAfterChoice",
				"autoReceiveDisabled",
				"considerGuardsTrue",
				"checkEvents",
				"keepOneMessagePerTrigger",
				"enableEventPools",
				"matchFirst",
				"symbolicValues",
				"reactiveSystem",
				"synchronousCommunication",
				"withDBM",
			];
			for(const semanticSetting of semanticSettings) {
				if(semanticSetting in ss) {
					document.getElementById(semanticSetting).checked = ss[semanticSetting];
				}
			}
			// in case it has changed:
			synchronousCommunication.onchange();
/*
			fireInitialTransitions.checked = ss.fireInitialTransitions;
			autoFireAfterChoice.checked = ss.autoFireAfterChoice;
			autoReceiveDisabled.checked = ss.autoReceiveDisabled;
			considerGuardsTrue.checked = ss.considerGuardsTrue;
			checkEvents.checked = ss.checkEvents;
			keepOneMessagePerTrigger.checked = ss.keepOneMessagePerTrigger;
			enableEventPools.checked = ss.enableEventPools;
			matchFirst.checked = ss.matchFirst;
			symbolicValues.checked = ss.symbolicValues;
			reactiveSystem.checked = ss.reactiveSystem;
*/
		}

/*
		if(is && is.load) {
			updateFig();
			return;
		}
*/
		if(model.settings?.defaultToolValues) {
			globalThis.defaultToolValues = model.settings.defaultToolValues;
		}
	}

	atoms.innerHTML = Object.entries(model.watchExpressions || {}).map(([name, atom]) => `
		<tr>
			<td contenteditable style="font-weight: bold;">${name}</td>
			<td contenteditable>${atom}</td>
			<td></td>
			<td>↕</td>
		</tr>
	`).join("");
	updateAtomSelects();
	properties.innerHTML = Object.entries(model.LTLProperties || {}).map(([name, prop]) => `
		<tr>
			<td contenteditable style="font-weight: bold;">${name}</td>
			<td contenteditable>${prop}</td>
			<td>↕</td>
		</tr>
	`).join("");
	updatePropertySelects();

	await builtInEngine.reset();

	await replayHistoryCauses(model.historyCauses);


	//console.log("Model static analysis results:");
	//analyze(model);
	updateIssues(model);


	return model;
}
function updateIssues(model) {
	const issues = analyzeToObject(model, true);
	function listIssues(issues, type) {
		return `
			<ol>
				${issues[type].map((w, i) => `
					<li>${w.message}
						<ul>
							${Object.entries(w.fixes ?? {}).map(([actionName, action]) => `
								<li><a href="javascript:fix('${type}', ${i}, '${actionName}')">${actionName}</a></li>
							`).join("")}
						</ul>
					</li>
				`).join("")}
			</ol>
		`;
	}
	staticAnalysisResults.innerHTML = `
		<ul>
			<li>Errors:
				${listIssues(issues, "errors")}
			</li>
			<li>Warnings:
				${listIssues(issues, "warnings")}
			</li>
		</ol>
	`;
}
function fix(issueType, index, actionName) {
	const issues = analyzeToObject(currentModel, true);
	console.log({issueType, index, actionName, issues});
	issues[issueType][index].fixes[actionName]();
	updateIssues(currentModel);
	updateFig();
}

// TODO: show parse errors when there are some
globalThis.showBuchiAutomata = async () => {
	const thead = properties.parentNode.children[0].children[0];
	const lastTH = last(thead.children);
	if(lastTH.innerHTML === "Automaton") {
		thead.removeChild(lastTH);
		for(const property of properties.children) {
			if(property.children.length > 3) {
				property.removeChild(property.children[2]);
			}
		}
	} else {
		const th = document.createElement("th");
		th.innerHTML = "Automaton";
		properties.parentNode.children[0].children[0].appendChild(th);
		for(const property of properties.children) {
			let prop = property.children[1].innerText;
			const td = document.createElement("td");
			// TODO: handle all possible characters (e.g., by reusing the similar function from TransformationToExplicit.js)
			prop = prop.replace(/\|[^|]+\|/g, (a) => {
				a = a.replace(/^\||\|$| /g, "");
				a = a.replace(/\(|\)|,/g, "_");
				a = a.replace(/=/g, "_EQ_");
				a = a.replace(/>/g, "_GT_");
				a = a.replace(/</g, "_LT_");
				a = a.replace(/-/g, "_MINUS_");
				a = a.replace(/\+/g, "_PLUS_");
				a = a.replace(/!/g, "_NOT_");
				return a;
			});
			const url = "/api/translate/" + encodeURIComponent(prop) + "?a=b&p=a&l=h&o=statebased";
			const fetched = JSON.parse(await (await fetch(url)).text());
			if(fetched.parse_error) {
				td.innerHTML = `<code><pre>${fetched.parse_error}</pre></code>`;
			} else {
				td.innerHTML = `<a target="_blank" download="Property.svg" href="${
					URL.createObjectURL(new Blob([fetched.automaton_svg], {type: "image/svg+xml"}))
				}">${fetched.automaton_svg}</a>`;
			}
			property.children[1].after(td);
		}
	}
}

async function loadFromParent(id, iframeId) {
	const modelId = id.replace(/^#/, "");
	try {
		try {
			// first try to directly access the parent document (works if it has the same origin as AnimUML)
			return parent.document.getElementById(modelId).innerHTML;
		} catch(e) {
			//console.log("Could not access parent document:", e);
			// else try to use the getModel function in the parent
			return parent.getModel(modelId).innerText;
		}
	} catch(e) {
		//console.log("Could not use parent.getModel(modelId):", e);
		// else try to communicate with the parent
		//console.log("Could not get model, atempting postMessage")
		if(iframeId) {
			// javascript URLs of cross-origin iframe SVG objects won't work anyway
			callPrefix = "";
		}
		// if it fails (e.g., because of cross-origin restrictions), try to communicate with the parent

		// TODO: do this more globally in case something else needs onmessage?
		return new Promise((resolve, reject) => {
			window.onmessage = (event) => {
				switch(String(event.data.reply)) {
					case "getModel":
						resolve(event.data.model);
						break;
					default:
						console.log("Unexpected message: ", event);
						break;
				}
			}
			parent.postMessage({action: "getModel", id: modelId}, "*");
		});
	}
}
// TODO: make sure we end up in the right spot even if it is on a root alt
async function playHistoryCause(cause) {
	if(cause.loop) {
		for(var i = 0 ; i < cause.loop ; i++) {
			cause.causes.forEach(playHistoryCause);
		}
	} else if(Array.isArray(cause)) {
		const mark = sysHistory.length;
		for(const alt of cause.slice(1).reverse()) {
			await replayHistoryCauses(alt);
			await engine.backToInternal(mark);
		}
		await replayHistoryCauses(cause[0]);
	} else {
		var parts = cause.split(":");
		switch(String(parts[0])) {
			case 'transition':
				//fire(parts[1]);
				const trans = currentModel.getTransition(parts[1]);
				if(fireInitialTransitions.checked && trans.source.kind === 'initial') {
					// ignoring transitions that the engine will automatically fire
				} else {
					await builtInEngine.fireInternal(trans);
				}
				break;
			case 'operation':
				if(builtInEngine.callOperation) {
					await builtInEngine.callOperation(parts[1], parts[2]);
				} else {
					console.log("error: could not replay an operation call with the current engine:", builtInEngine);
				}
				break;
			case 'PlantUML':
				builtInEngine.sysHistory.push({
					cause: cause,
					PlantUML: parts.slice(1).join(':'),
				});
				break;
			default:
				console.log(`Unknown history step cause: ${parts[0]} in ${cause}`);
				break;
		}
	}
}
async function replayHistoryCauses(historyCauses) {
	if(hasElements(historyCauses) && Array.isArray(historyCauses[0])) {
		await playHistoryCause(historyCauses);
	} else{
		for(const cause of historyCauses || []) {
			await playHistoryCause(cause);
		}
	}
}
let interactionEngine;
let sce;
let interactionConfig;
const sceHistory = [];
let interactionFireables = {};
globalThis.syncInteraction = () => {
	if(interactionSelect.selectedIndex == 0) {
		alert("Please select another interaction than history/trace first");
	} else {
		const inter = currentModel.interactions[getSelected(interactionSelect)];
		interactionEngine = new InteractionEngine(inter);
		interactionEngine.reset();
		const ste = new AnimUMLSmallerStepsEngine(engine);
		sce = new SynchronousCompositionEngine(ste, interactionEngine);

		const conv = (trans) => interactionFireables[currentModel.transFullName(trans)];

		currentEngine = Object.assign({...builtInCurrentEngine}, {
//			getSlots(object) {
//				return builtInEngine.configuration.objectState[object.name];
//			},
			isFireable(trans) {
				return conv(trans);
			},
//			getTransURI(op, transition, part) {
//				return `javascript:${callPrefix}${op}('${encodeURIComponent(currentModel.transFullName(transition))}'${part ? `,'${part}'` : ''})`;
//			},
			getFireURI(transition) {
				return `javascript:syncFire(${JSON.stringify(conv(transition)).replace(/{/g, "%7B")})`;
			},
//			isCurrent(state) {
//				return builtInEngine.isCurrentState(state);
//			},
//			isActivable(trans) {
//				return builtInEngine.isActivable(trans);
//			},
//			eventMatched(trans) {
//				return builtInEngine.eventMatched(trans);
//			},
//			getFireable(object, filter) {
//				return builtInEngine.getFireable(object, filter);
//			},
//			findMessage(event, target, ports) {
//				return builtInEngine.findMessage(event, target, ports);
//			},
		});


		updateInterFireables();
	}
};
globalThis.syncReplayHistory = async () => {
	const preConfig = await sce.getConfiguration();

	const historyCauses = getHistoryCauses(currentModel);
	await engine.reset();
	replayHistoryCauses(historyCauses);

	const postConfig = await sce.getConfiguration();
	if(preConfig !== postConfig) {
		alert("There was a problem replaying history/trace: ", preConfig, postConfig);
	}
	updateFig();
}
async function updateInterFireables() {
	interactionConfig = JSON.parse(await interactionEngine.getConfiguration());
	sceHistory.push(await sce.getConfiguration());
	interFireables.innerHTML = "";
	const sysHistoryLength = sysHistory.length;

	const fireables = await sce.getFireables();

	interactionFireables = Object.fromEntries(fireables.map(e => [JSON.parse(e).left, e]));
	updateFig();

	// put sysHistory back in the state before we pre-fired some transitions as part of the synchronous composition
	sysHistory.length = sysHistoryLength;
	interFireables.innerHTML = 
		`
			<li><a href='javascript:syncReplayHistory()'>Replay history/trace</a></li>
			<li><a href='javascript:syncReset()'>Back to first configuration</a></li>
			${sceHistory.length > 1 ?
				`<li><a href='javascript:syncBack()'>Back to previous configuration</a></li>`
			: ""
			}
		` +
		fireables.map(e => `
			<li><a href='javascript:syncFire(${JSON.stringify(e)})'>${e}</a></li>
		`).join("\n")
	;
}
function syncStop() {
	interFireables.innerHTML = "";
	sce = undefined;
	interactionEngine = undefined;
	interactionConfig = undefined;
	currentEngine = builtInCurrentEngine;
	updateFig();
}
globalThis.syncBack = async () => {
	// TODO: update engine.sysHistory? or better => show counter example
	// drop current config
	sceHistory.splice(-1);
	// TODO: last step should not be removed if it corresponds to a small step
	const config = sceHistory.splice(-1);
	await sce.setConfiguration(config);
	await updateInterFireables();
};
globalThis.syncReset = async () => {
	// TODO: update engine.sysHistory? or better => show counter example
	const config = sceHistory[0];
	// drop all history
	sceHistory.splice(0);
	await sce.setConfiguration(config);
	await updateInterFireables();
};
globalThis.syncFire = async (trans) => {
	//console.log("FIRING", trans);
	await sce.fire(trans);
	await updateInterFireables();
};
globalThis.checkInteraction = async () => {
	if(interactionSelect.selectedIndex == 0) {
		alert("No selected interaction");
	} else {
		const inter = currentModel.interactions[getSelected(interactionSelect)];
		const ie = new InteractionEngine(inter);
		const ste = new AnimUMLSmallerStepsEngine(engine);
		const sce = new SynchronousCompositionEngine(ste, ie);
		(await import('./Explorer.js')).explore(sce, console.log, (config, nbConfigs) => nbConfigs > 100, {withBFS: withBFS.checked});
	}
}
const HISTORY = "Linear execution history/trace";
const STATE_SPACE = "Branching execution history/trace";
function updateInteractions() {
	interactionSelect.innerHTML = "";
	addOption(interactionSelect, HISTORY);
	addOption(interactionSelect, STATE_SPACE);
	for(const [name, inter] of Object.entries(currentModel.interactions || {})) {
		addOption(interactionSelect, name);
	}
/*
	if(interactionSelect.length > 1) {
		interactionSelect.selectedIndex = 1;
	}
		interactionSelect.selectedIndex = 1;
*/
	if(defaultInteraction) {
		setInteraction(defaultInteraction);
		defaultInteraction = undefined;
	}
}
let defaultInteraction;
interactionSelect.onchange = () => {
	curSVGHash = "";
	updateInteractionFig();
};
function setInteraction(interName) {
	interactionSelect.selectedIndex = Array.prototype.map.call(interactionSelect.options, e => e.value).indexOf(interName);
}

globalThis.trace2Interaction = () => {
	const sigRegExp = /^([^(]*)(\((.*)\))?$/;
	const afterRegExp = /^after\(([^)]*)\)$/;
	let index = 0;
	const inter = {
		lifelines: currentModel.objects.map(o => o.name),
		events: sysHistory.flatMap(step =>
			(step.messages || []).filter(msg =>
				msg.type !== "set"
			).flatMap(msg => {
				const ret = [];
				let nb = 0;
				if(msg.signature.match(afterRegExp)) {
					ret.push({
						after: msg.signature.replace(afterRegExp, "$1"),
					});
					index++;
				} else {
					const call = msg.signature.replace(sigRegExp, "$1");
					const args = msg.signature.replace(sigRegExp, "$3").split(/, */).filter(e => e !== "");
					if(msg.sentAt === step) {
						ret.push({
							call,
							arguments: args,
							from: msg.source,
							to: msg.target,
						});
						msg.tempIndex = index;
						index++;
					}
					if(msg.receivedAt === step) {
						if(msg.sentAt) {
							ret.push({
								accept: msg.tempIndex,
							});
						} else {
							ret.push({
								fromGate: "??",	//found
								to: msg.target,
								call,
								arguments: args,
							});
						}
						index++;
					}
				}
				return ret;
			})
		),
	};
	currentModel.interactions = currentModel.interactions || {};
	const baseName = "LiftedTrace";
	let i = 1;
	const name = () => baseName + i;
	while(name() in currentModel.interactions) i++;
	currentModel.interactions[name()] = inter;
	updateInteractions();
	return name();
};



function updateObjects() {
	objectSelect.innerHTML = '';
	function addAll() {
		addOption(objectSelect, ALL_OBJECTS);
	}
	var allObjectsIndex = 0;
	var offset = 0;
	if(defaultsToAllObjects) {
		addAll();
	}
	currentModel.objects.forEach(object => {
		addOption(objectSelect, object.name);
	});
	if(!defaultsToAllObjects) {
		allObjectsIndex = objectSelect.options.length;
		offset = 0;
		addAll();
	}
	if(displayedObjects.length > 1) {
		objectSelect.selectedIndex = allObjectsIndex;
	} else {
		objectSelect.selectedIndex = currentModel.objects.indexOf(displayedObjects[0]) + offset;
	}
	displayedObjectSelection.innerHTML = '';
	const checkboxes = [];
	for(const obj of currentModel.objects) {
		const li = document.createElement("li");
		displayedObjectSelection.appendChild(li);
		const input = document.createElement("input");
		li.appendChild(input);
		checkboxes.push(input);
		input.type = "checkbox";
		input.checked = true;
		li.appendChild(document.createTextNode(obj.name));
		input.onchange = () => {
			if(input.checked) {
				displayedObjects.push(obj);
			} else {
				remove(displayedObjects, obj);
			}
			updateFig();
		};
	}
}

// all === false => none
function selectDisplayedObjects(all) {
	document.querySelectorAll('#displayedObjectSelection input').forEach(n =>
		n.checked = all
	);
	if(all) {
		displayedObjects = [...currentModel.objects];
	} else {
		displayedObjects = [];
	}
	updateFig();
}

// necessary when embedding, because javascript: links do not work then
resetButton.onclick = async () => {
	await engine.reset();
	//updateFig();
	// in case we were synchronously composing the system model with an interaction
	syncStop();
};


function switchExample(name) {
	var example = examples.find(e => e.name == name);
	load(example);
}
const exampleSelect = document.getElementById('exampleSelect');
var editor;
function init() {
	editor = new Editor();
	initEditor(currentModelWrapper);
	examples.forEach(e => {
		addExample(e);
	});
	exampleSelect.onchange = (e) => {
		switchExample(getSelected(exampleSelect));
	};
}



function toggle(e, display) {
	if(e.style.display == 'none') {
		show(e, display);
	} else {
		hide(e);
	}
}

function hide(e) {
	e.style.display = 'none';
}

function show(e, display) {
	e.style.display = display || '';
}

var checkEvents = document.getElementById('checkEvents');
checkEvents.onchange = () => updateFig();


considerGuardsTrue.onchange = updateFig;
async function fire(trans) {
	await builtInEngine.fireInternal(currentModel.getTransition(trans));
	updateFig();
}
globalThis.sender = undefined;
function setSender(objectName) {
	globalThis.sender = currentModel.getObject(objectName);
}
function callOperation(opFullName, sourceName) {
	builtInEngine.callOperation(opFullName, sourceName, globalThis.sender);
	updateFig();
	globalThis.sender = undefined;
}

//const oldSeqDiagStyle = {};
const oldMainDiagStyle = {};
const oldEditButtonStyle = {};
// Switch to edit mode
function edit() {
	if(editing) {
		editing = false;
		editBlock.style = 'display: none';
		//seqDiag.style = 'width: 45%; float: right';
		seqDiag.style.display = "";
		mainDiag.style.width = oldMainDiagStyle.width;
		editButton.style.display = oldEditButtonStyle.display;
		// in case it was still displayed when disabling edition:
		inputBlock.style = 'display: none';

		participants = currentModel.objects.slice();
	} else {
		//oldSeqDiagStyle.width = seqDiag.style.width;
		oldMainDiagStyle.width = mainDiag.style.width;
		oldEditButtonStyle.display = editButton.style.display;
		editButton.style.display = 'inline';
		editing = true;
		editBlock.style = 'display: inline';
		seqDiag.style.display = 'none';
		mainDiag.style.width = "100%";
	}
	updateFig();
}
// End edition


// Begin UML utils
// End UML utils

showExplicitSM.onchange = updateFig;
hideOuterSMBoxes.onchange = updateFig;

// TODO: but maybe after we have a history visitor
function toPlantUMLCom(hist, raw) {
	return `
		object
	`;
}

// History utility functions
function stateOfIn(object, step) {
	return step.configuration.currentState[object.name];
}
var timingScaleDiv = document.getElementById('timingScaleDiv');
var timingScale = document.getElementById('timingScale');
timingScale.onchange = () => {
	updateInteractionFig();
};

showPseudostateInvariants.onchange = () => updateFig();
hideStates.onchange = () => updateFig();
hideSets.onchange = () => updateFig();


async function backTo(index) {
	//if(index < sysHistory.length) {
		await builtInEngine.backToInternal(index);
		updateFig();
	//}
}


var noCache = 0;


function updateOneFig(code, type, code2) {
	var uri;

	// How to preload an <object>?
	// We cannot use an <img> because of the hyperlinks

	// TODO: generalize this once PlantUML supports serialization of all required ids
	if(testCSSAnimation && !editing && currentModel.name.endsWith('BoutonLampe') && type === 'state') {
		uri = `${document.location.origin}/samples/BoutonLampe.svg`
	} else
	if(testCSSAnimation && !editing && currentModel.name.endsWith("PubliphoneV6") && type === 'state') {
		uri = `${document.location.origin}/samples/PubliphoneV6.svg`
	} else {

		uri = toPlantUMLURI(pu, code()) + '?nocache=1';// + `?nocache=${noCache++}`;
	}
	var fig = document.getElementById(`${type}Figo`);
	if(fig.data !== uri) {	// avoid unnecessary reload & flickering when no change
		let figPreload = document.getElementById(`${type}FigoPreload`);
		fig.style.opacity = .4;
		fig.style.pointerEvents = "none";
		figPreload.onload = () => {
			fig.width = fig.offsetWidth
			fig.height = fig.offsetHeight
			fig.data = uri;
			fig.addEventListener("load", () => {
				fig.width = fig.height = "";
				fig.style.opacity = "";
				fig.style.pointerEvents = "";
			});
		}
		figPreload.data = uri;
	}

	var uri2;
	function getURI2() {
		uri2 = uri2 || (code2 ? toPlantUMLURI(pu, code2()) : uri).replace(/svg/, 'uml');
		return uri2;
	}
	var link = document.getElementById(`${type}PlantUML`);
	link.href = "#clickLinkToUpdateIt";
	link.removeAttribute("download");
	link.onclick = () => {
		link.href = getURI2();
	}
}

const withAnnotations = document.getElementById('plantUMLType');
if(withAnnotations.checked) {
	show(forAnimationDiv);
}
withAnnotations.onchange = () => {
	updateFig();
	toggle(forAnimationDiv);
};
forAnimation.onchange = () => {
	updateFig();
};
hideLinks.onchange = updateFig;
const historyType = document.getElementById('historyType');
historyType.onchange = () => {
	curSVGHash = "";
	updateFig();
};
function setHistoryType(type) {
	curSVGHash = "";
	historyType.selectedIndex = Array.prototype.map.call(historyType.options, e => e.value).indexOf(type);
}

let curSVGHash = undefined;
function showSVG(svg) {
/*
	// loading as object data URI
	seqFigo.data = `data:image/svg+xml;utf8,${svg
		.replace(/#/g, "%23")
	}`;
	seqFigo.hidden = false;
/*/
	// loading as embedded SVG
	// this cannot currently work because the scripts are not designed to be loaded multiple times
	function loadScript(s) {
		return new Promise((resolve, error) => {
			// we could also use HTML script tags by using the noNS lines below, but exporting the SVG would not rerun the scripts with src attributes instead of href
			//noNS: const ns = document.createElement("script");
			const ns = document.createElementNS(svgNS, "script");
			ns.onload = () => {
				resolve();
			};
			if(s.type) {
				ns.type = s.type;
			}
			if(s.href.baseVal) {
				//noNS: ns.src = s.href.baseVal;
				ns.href.baseVal = s.href.baseVal;
			} else if(s.textContent) {
				ns.textContent = s.textContent;
			}
			s.parentNode.replaceChild(ns, s);
			if(!s.href.baseVal) {
				// without src, we are already loaded (onload will not be called)
				resolve();
			}
		});
	}
	async function loadScripts(e) {
		for(const s of Array.prototype.slice.call(e.getElementsByTagName("script"), 0)) {
			// using await here to make sure scripts are loaded in proper order
			await loadScript(s);
		}
		for(const a of seqFigo.getElementsByTagName("a")) {
			console.log(a.getAttribute("href"))
		}
	}
	async function hash(t) {
		if(crypto.subtle) {
			const h = await crypto.subtle?.digest({name: "SHA-256"}, new TextEncoder().encode(svg))
					|| t;	// for the cases where crypto.subtle is undefined (e.g., in insecure contexts)
			return [...new Uint8Array(h)].map(e => e.toString(16).padStart(2, "0")).join("");
		} else {
			return t;
		}
	}
	async function update() {
		const newSVGHash = await hash(svg);
		//console.log(newSVGHash, "=?=", curSVGHash);
		if(newSVGHash !== curSVGHash) {
			curSVGHash = newSVGHash;
			seqFigs.innerHTML = svg;
			var loaded = false;
			new IntersectionObserver(async (entries) => {
				if(seqFigs.offsetParent && !loaded) {
					loaded = true;
					await loadScripts(seqFigs);
					Array.prototype.filter.call(seqFigs.querySelectorAll("a"), e => e.href.baseVal === "").forEach(e => e.removeAttribute("href"));
	/*
					console.log(currentModel.name, Array.prototype.map.call(seqFigs.getElementsByTagName("text"), (e) => {
						return e.getBBox().height;
					}));
	/**/
				}
			}).observe(seqFigs);
					//loadScripts(seqFigs);
	/**/
			var link = document.getElementById(`seqPlantUML`);
			link.href = "#clickLinkToUpdateIt";
			link.onclick = () => {
				let svgc = svg;
				if(!plantUMLType.checked) {
					svgc = inactivateSVG(seqFigs);
				} else {
					// use the contents of the svg variable, because without inactivating seqFigs, scripts would be rerun on load, which would instantiate templates a second time
				}

				link.href = URL.createObjectURL(new Blob([svgc], {type: "image/svg+xml"}));
				link.download = "diagram.svg";
			}

		}
	}
	update()
}

registerPNG("seqPNG", () =>
	seqFigs.children[0] ?? seqFigo.getSVGDocument().children[0]
);
registerPNG("mainPNG", () =>
	stateFigo.getSVGDocument().children[0]
);
function registerPNG(linkId, svgTagGetter) {
	const link = document.getElementById(linkId);
	link.href = "#";
	link.onclick = () => {
		const scale = 2;
		const can = document.createElement("canvas");
		const svgTag = svgTagGetter();
		const bcr = svgTag.getBoundingClientRect();
		can.width = (bcr.width + 10) * scale;
		can.height = bcr.height * scale;
		const svg = new XMLSerializer().serializeToString(svgTag);
		const blob = new Blob([svg], {type: "image/svg+xml"});
		const url = URL.createObjectURL(blob);
		const img = new Image();
		img.onload = () => {
			const ctxt = can.getContext("2d");

			ctxt.rect(0, 0, can.width, can.height);
			ctxt.fillStyle = "white";	// TODO: change depending on mode (dark or not)?
			ctxt.fill();

			ctxt.drawImage(img, 0, 0,
				//bcr.width, bcr.height, 0, 0,
				bcr.width * scale, bcr.height * scale,
			);

			URL.revokeObjectURL(url);

			const a = document.createElement("a");
			a.href = can.toDataURL("image/png");
			//a.target = "_blank";
			a.download = "diagram.png";
			a.click();
			URL.revokeObjectURL(a.href);
		};
		img.src = url;
	};
}

showTransitions.onchange = updateFig;
function updateInteractionFig() {
	switch(interactionSelect.selectedIndex) {
	case 0:
		show(historySpecificSettings, "inline");
		hide(interactionSettings);
		updateHistoryFig();
		break;
	case 1:
		seqFigo.hidden = false;
		seqFigs.innerHTML = "";
		const params = {
			colors,
			showTransitions: showTransitions.checked,
			hideStates: hideStates.checked,
			hideSets: hideSets.checked,
			showPseudostateInvariants: showPseudostateInvariants.checked,
			styleMode,
		};
		updateOneFig(
			() => toPlantUMLBranchingHistory(sysHistory, currentModel, params),
			"seq",
			() => toPlantUMLBranchingHistory(sysHistory, currentModel, {...params, raw: !withAnnotations.checked})
		);
		break;
	default:
		hide(historySpecificSettings);
		show(interactionSettings, "inline");
		show(timingScaleDiv, "inline");
		seqFigo.hidden = true;
		const inter = currentModel.interactions[getSelected(interactionSelect)];
		const svg = interaction2TCSVGSequence(inter, currentModel, {origin: `${document.location.origin}/`, interactionConfig, participants: getParticipants(), styleMode});
		//seqFigo.data = `data:image/svg+xml;utf8,${svg.replace(/#/g, "%23")}`;
		showSVG(svg);
		break;
	}
}
function getParticipants() {
	return participants.filter(obj =>
		showPorts.checked || !currentModel.isPort(obj)
	).filter(obj => !obj.isObserver);
}
function updateHistoryFig() {
	const ht = getSelected(historyType);
	seqFigo.data = "";
	if(hideEmptyHistory && sysHistory.length == 0) {
		seqFigo.hidden = false;
		seqFigs.innerHTML = "";
		return;
	}
	if(ht === 'sequence') {
		seqFigo.hidden = false;
		seqFigs.innerHTML = "";
		updateOneFig(
			() => toPlantUMLSeq(sysHistory, currentModelWrapper, currentEngine, {stateOfIn, ALL_OBJECTS, configuration: builtInEngine.configuration, callPrefix, participants: getParticipants(), colors, hideStates: hideStates.checked, hideSets: hideSets.checked, hideLinks: hideLinks.checked, styleMode, hideStateMachines: hideStateMachines.checked, showPseudostateInvariants: showPseudostateInvariants.checked}),
			"seq",
			() => toPlantUMLSeq(sysHistory, currentModelWrapper, currentEngine, {stateOfIn, ALL_OBJECTS, configuration: builtInEngine.configuration, callPrefix, participants: getParticipants(), colors, raw: !withAnnotations.checked, hideStates: hideStates.checked, hideSets: hideSets.checked, styleMode, hideStateMachines: hideStateMachines.checked, showPseudostateInvariants: showPseudostateInvariants.checked}));
		hide(timingScaleDiv);
	} else if(ht === 'TCSVG sequence') {
		seqFigo.hidden = true;
		const svg = history2TCSVGSequence(sysHistory, currentModelWrapper, {origin: `${document.location.origin}/`, scale: timingScale.value, hideSets: hideSets.checked, hideStates: hideStates.checked, showPseudostateInvariants: showPseudostateInvariants.checked, hideLinks: hideLinks.checked, participants: getParticipants(), styleMode, showTransitions: showTransitions.checked});
		showSVG(svg);
		show(timingScaleDiv, "inline");
	} else {
		seqFigo.hidden = false;
		seqFigs.innerHTML = "";
		updateOneFig(() => toPlantUMLTiming(sysHistory, false, currentModelWrapper, {stateOfIn, callPrefix, hideSets: hideSets.checked, styleMode, participants: getParticipants(), scale: timingScale.value}), "seq", () => toPlantUMLTiming(sysHistory, !withAnnotations.checked, currentModelWrapper, {stateOfIn, callPrefix, hideSets: hideSets.checked, hideLinks: hideLinks.checked, styleMode, participants: getParticipants(), scale: timingScale.value}));
		show(timingScaleDiv, "inline");
	}
}
var hideClasses = document.getElementById('hideClasses');
var hideStateMachines = document.getElementById('hideStateMachines');
hideClasses.onchange = updateFig;
showActorsAsObjects.onchange = updateFig;
hideStateMachines.onchange = updateFig;
hideMethods.onchange = updateFig;
hideOperations.onchange = updateFig;
showPorts.onchange = updateFig;
showEndNames.onchange = updateFig;
var stateFigoStyle;
function updateFig() {
	if(testCSSAnimation && (currentModel.name.endsWith("BoutonLampe") || currentModel.name.endsWith("PubliphoneV6"))) {
		// TODO: generalize this
		// TODO: <color> in hyperlinks? for unmatched triggers and unsatisfied guards
		// or ask for <span:id></span> (or tspan)
		// An idea that seems to work: separate in multiple hyperlinks with different tooltips (e.g., [[<link>{guard} text]], [[<link>{effect} text]],
		// possibly prefixed by transition id), and then use some CSS like:
		//  a[title="<tooltip>"] > text {text-decoration: line-through;fill: red;}
		function stateId(state) {
			if(state.kind === 'initial') {
				return `*start*${currentModel.stateFullName(state.region)}`;
			} else {
				return currentModel.stateFullName(state);
			}
		}
		function transId(trans) {
/*
			return transFullName(trans);
/*/
			return `${stateId(trans.source)}->${stateId(trans.target)}`.replace(/([*.>])/g, "\\$1");
/**/
		}
		function allTransitions(region) {
			return (region.transitions || []).concat(
				(region.states || []).flatMap(allTransitions)
			);
		}
		function updateState() {
			if(editing) return;
			var style = Object.entries(engine.configuration.currentState).flatMap(([objectName, currentStates]) =>
				currentStates.map(currentState => `
					#${currentState.name} > rect {
						fill: ${colors.currentStateColor};
					}
				`)
			).join("") +
			// removing link style by default
			`
				a > text {
					fill: black; text-decoration: none;
				}
			` + currentModel.objects.flatMap(allTransitions).filter(trans => engine.isFireable(trans)).map(trans => `
				#${transId(trans)} {
					stroke: ${colors.fireableTransitionColor} !important;
				}
				#${transId(trans)} + polygon {
					fill: ${colors.fireableTransitionColor};
					stroke: ${colors.fireableTransitionColor} !important;
				}
				#${transId(trans)} + polygon + a > text {
					fill: #0000EE; text-decoration: underline;
				}
			`).join("");
			// SVG styling: https://css-tricks.com/svg-properties-and-css/
			// escaping complex ids: https://mathiasbynens.be/notes/css-escapes
			// with tool: https://mothereff.in/css-escapes
			// e.g.: *start*PubliphoneV6.Décroché->PubliphoneV6.Décroché.AttentePièce -> \*start\*PubliphoneV6\.Décroché-\>PubliphoneV6\.Décroché\.AttentePièce
			/*
				// removing "link" style:
				#test > text {
				    fill: black;
				    text-decoration: none;
				}
				disabling can be done in the fire() function, which would do nothing for disabled transitions

				to hide notes: opacity: 0 can work, but the text is still selectable (but does not show even when selected)
				=> display:none is better
			*/
			//console.log(style);
			stateFigoStyle.textContent = style;
		}
		if(!stateFigoStyle) {
			var obj = document.getElementById("stateFigo");
			obj.addEventListener("load", () => {
				var rootSVG = obj.contentDocument.getElementsByTagName("svg")[0];
				var s = document.createElement("style");
				rootSVG.appendChild(s);
				stateFigoStyle = s;
				updateState();
			});
		} else {
			updateState();
		}
	}

	document.getElementById("stateFigo").onload =
	document.getElementById("seqFigo").onload =
		(e) => {
			if(e.target.contentDocument) {
				e.target.contentDocument.onkeydown = onkeydown;
				// TODO: only if necessary (i.e., if we are in a cross-origin iframe)?
				if(changeSVGLinksIntoListeners) {
					for(const link of e.target.contentDocument.getElementsByTagName("a")) {
						const url = link.href.baseVal;
						if(url.startsWith("javascript:")) {
							link.onclick = () => {
								eval(decodeURIComponent(url.replace(/^javascript:get\([^)]*\)\./, "")));
							};
							link.href.baseVal = "javascript:";
							//.link.title.baseVal = "";
							link.setAttributeNS(xlinkNS, "title", "");
						}
					}
				}
			}
		};
	const objectCommentLocationValue = getSelected(objectCommentLocation);
	const operationCommentLocationValue = getSelected(operationCommentLocation);
	const propertyCommentLocationValue = getSelected(propertyCommentLocation);
	const stateCommentLocationValue = getSelected(stateCommentLocation);
	const transitionCommentLocationValue = getSelected(transitionCommentLocation);
	const params = {
		displayedObjects,
		editing,
		callPrefix,
		colors,
		//hideLinks: hideLinks.checked,
		styleMode,
		showExplicitSM: showExplicitSM.checked,
		hideOuterSMBoxes: hideOuterSMBoxes.checked,
		showPorts: showPorts.checked,
		hideClasses: hideClasses.checked,
		showActorsAsObjects: showActorsAsObjects.checked,
		checkEvents: checkEvents.checked,
		hideMethods: hideMethods.checked,
		hideStateMachines: hideStateMachines.checked,
		showEndNames: showEndNames.checked,
		hideOperations: hideOperations.checked,
		objectCommentLocation: objectCommentLocationValue === "do not show them" || !showComments.checked ? false : objectCommentLocationValue,
		operationCommentLocation: operationCommentLocationValue === "do not show them" || !showComments.checked ? false : operationCommentLocationValue,
		propertyCommentLocation: propertyCommentLocationValue === "do not show them" || !showComments.checked ? false : propertyCommentLocationValue,
		stateCommentLocation: stateCommentLocationValue === "do not show them" || !showComments.checked ? false : stateCommentLocationValue,
		transitionCommentLocation: transitionCommentLocationValue === "do not show them" || !showComments.checked ? false : transitionCommentLocationValue,
		heatMap: showHeatMap.checked && heatMap,
		showSelfTransitionsAsInternal: showSelfTransitionsAsInternal.checked,
		classDiagram: showClassDiagram.checked,
		showEventPools: showEventPools.checked,
		showMethodsAsActivities: showMethodsAsActivities.checked,
		narrow: narrow.checked,
	};
	updateOneFig(
		() => allObjectsToPlantUML(currentModelWrapper, currentEngine, {raw: false, forAnimation: false, hideLinks: hideLinks.checked, ...params}),
		"state",
		() => allObjectsToPlantUML(currentModelWrapper, currentEngine, {raw: !withAnnotations.checked, forAnimation: forAnimation.checked, ...params})
	);
	updateInteractionFig();

}

narrow.onchange =
showMethodsAsActivities.onchange =
showEventPools.onchange =
showClassDiagram.onchange =
showSelfTransitionsAsInternal.onchange =
showHeatMap.onchange =
showComments.onchange =
objectCommentLocation.onchange =
operationCommentLocation.onchange =
propertyCommentLocation.onchange =
stateCommentLocation.onchange =
transitionCommentLocation.onchange = updateFig;

// TODO: store the current config somehow
// this used to work when we were not trying to keep the overall branching history shape
function getHistoryCauses(model) {
/*
	let ret = sysHistory.map(e => e.cause);
	if(fireInitialTransitions.checked) {
		const trCauseRegex = /^transition:/;
		ret = ret.filter(cause =>
			!cause.match(trCauseRegex) || model.getTransition(cause.replace(trCauseRegex, "")).source.kind !== 'initial'
		);
	}
	return ret;
/*/
	function process(steps) {
		const ret = [];
		let i = 0;
		for(const step of steps) {
			const alts = step.alts?.slice(0);
			if(hasElements(alts)) {
				const rest = steps.slice(i + 1);
				alts.splice(step.mainIdx, 0, rest);
				return [...ret, step.cause, alts.map(alt => process(alt))];
			} else {
				ret.push(step.cause);
			}
			i++;
		}
		return ret;
	}
	let ret;
	const alts = sysHistory.alts?.slice(0);
	if(hasElements(alts)) {
		alts.splice(sysHistory.mainIdx, 0, sysHistory);
		ret = alts.map(alt => process(alt));
	} else {
		ret = process(sysHistory);
	}
	return ret;
/**/
}

const exportLink = document.getElementById('export');
function updateExport(model) {
	function addSettings(model) {
		var settings = {
			interface: {
				displayedObjects: displayedObjects.map(o => o.name),
			},
			display: {
				hideClasses: hideClasses.checked,
				//hideStates: hideStates.checked,
				//hideSets: hideSets.checked,
				hideMethods: hideMethods.checked,
				hideOperations: hideOperations.checked,
				hideStateMachines: hideStateMachines.checked,
				showPseudostateInvariants: showPseudostateInvariants.checked,
				showPorts: showPorts.checked,
				showTransitions: showTransitions.checked,
				showEndNames: showEndNames.checked,
				showMethodsAsActivities: showMethodsAsActivities.checked,
				showActorsAsObjects: showActorsAsObjects.checked,
				//showExplicitSM: showExplicitSM.checked,
				//hideLinks: hideLinks.checked,
			},
			semantics: {
				fireInitialTransitions: fireInitialTransitions.checked,
				autoFireAfterChoice: autoFireAfterChoice.checked,
				autoReceiveDisabled: autoReceiveDisabled.checked,
				considerGuardsTrue: considerGuardsTrue.checked,
				checkEvents: checkEvents.checked,
				keepOneMessagePerTrigger: keepOneMessagePerTrigger.checked,
				enableEventPools: enableEventPools.checked,
				matchFirst: matchFirst.checked,
				symbolicValues: symbolicValues.checked,
				reactiveSystem: reactiveSystem.checked,
				synchronousCommunication: synchronousCommunication.checked,
				withDBM: withDBM.checked,
			},
			defaultToolValues: globalThis.defaultToolValues,
		};
		model.settings = settings;
	}

	function json(model, space) {
		return JSON.stringify(
			model, undefined, space
		)
			// we do not encodeURIComponent to make the link more readable, but we must at least encode percents
			.replace(/%/g,"%25")
			// we encode stars so that they are not interpreted by instant messengers like WhatsApp
			.replace(/\*/g,"%2A")
		;
	}
	var exportedModel = null;

	function getTargetServer() {
		const origin = getSelected(linkTargetServer);
		console.log(origin);
		return origin;
	}

	exportLink.href = "#clickLinkToUpdateIt";
	exportPretty.href = "#clickLinkToUpdateIt";
	exportHTML.href = "#clickLinkToUpdateIt";
	function getExportedModel(withPlantUMLLikeSyntax = false) {
		if(withPlantUMLLikeSyntax) {
			exportedModel = exportModel(translateToPlantUMLSyntax(currentModel));
		} else {
			exportedModel = exportedModel || exportModel(currentModel);
		}
		if(properties.children.length > 0) {
			const LTLProperties = Object.fromEntries(Array.prototype.map.call(properties.children, e => [e.children[0].innerText, e.children[1].innerText]));
			exportedModel.LTLProperties = LTLProperties;
		}
		if(atoms.children.length > 0) {
			const watchExpressions = Object.fromEntries(Array.prototype.map.call(atoms.children, e => [e.children[0].innerText, e.children[1].innerText]));
			exportedModel.watchExpressions = watchExpressions;
		}
		return exportedModel;
	}

	exportLink.onclick = () => {
		exportLink.href = `${document.location.toString().replace(/#.*$/, '')}#${json(getExportedModel()).replace(/\\/g, "%5C")}`;
	};
	exportPretty.onclick = () => {
		exportPretty.download = `${currentModel.name}.json`;
		exportPretty.href = `data:text/plain,${encodeURIComponent(json(getExportedModel(), 2))}`;
	};
	exportHTML.onclick = () => {
		htmlExport(exportHTML, getExportedModel);
	}
	histExportHTML.onclick = () => {
		htmlExport(histExportHTML, histExported);
	}
	function htmlExport(link, exportedModelGetter) {
		link.download = `${currentModel.name}.html`;
		const html = indent`
			<script>
				const model =
					${jsStringify(exportedModelGetter(true))}
				;
				document.write(\`
					<iframe width="100%" height="100%" src='${location.origin}/AnimUML.html#\${encodeURIComponent(JSON.stringify(model)).replace(/'/g, '%27')}'></iframe>
				\`);
			</script>
		`;
		link.href = `data:text/plain,${encodeURIComponent(html)}`;
	};

	function histExported(withPlantUMLLikeSyntax) {
		var exportedModel = getExportedModel(withPlantUMLLikeSyntax);
		if(sysHistory) {
			exportedModel = Object.assign({}, exportedModel);
			exportedModel.historyCauses = getHistoryCauses(model);
		}
		addSettings(exportedModel);
		return exportedModel;
	}
	histExport.href = "#clickLinkToUpdateIt";
	histExport.onclick = () => {
		histExport.href = `${document.location.toString().replace(/#.*$/, '')}#${json(histExported())}`;
	}
	histExportPretty.href = "#clickLinkToUpdateIt";
	histExportPretty.onclick = () => {
		histExportPretty.download = `${currentModel.name}-withHistory.json`;
		histExportPretty.href = `data:text/plain,${encodeURIComponent(json(histExported(), 2))}`;
	}

	var tUML = null;
	function gettUML() {
		tUML = tUML || totUML(currentModelWrapper);
		return tUML;
	}
	tUMLExport.href = "#clickLinkToUpdateIt";
	tUMLExport.onclick = () => {
		tUMLExport.download = `${currentModel.name}.tuml`;
		tUMLExport.href = `data:text/plain,${encodeURIComponent(gettUML())}`;
	};

	if(window.cExport) {
		cExport.href = "#clickLinkToUpdateIt";
		cExport.onclick = () => {
			cExport.download = `${currentModel.name}.tar.gz`;
			// Either one of the following encodings work
/*
			// Base64
			cExport.href = `data:text/plain;base64,${btoa(toC(currentModel))}`;
/*/
			// encoded URI
			var tar = toC(currentModelWrapper);
			const b64 = true;	// b64==false => invalid download files
			tar = pako.gzip(tar, {level: 9, to: "string"});
			if(b64) {
				tar = btoa(tar);
			}
			cExport.href = `data:text/plain${b64 ? ';base64' : ''},${encodeURIComponent(tar)}`;
/**/
		}
	}
	if(window.ceptreExport) {
		ceptreExport.href = "#clickLinkToUpdateIt";
		ceptreExport.onclick = () => {
			ceptreExport.download = `${currentModel.name}.cep`;
			// encoded URI
			let code = toCeptre(currentModelWrapper);
			const b64 = true;	// b64==false => invalid download files
			//code = pako.gzip(code, {level: 9, to: "string"});
			if(b64) {
				code = btoa(code);
			}
			ceptreExport.href = `data:text/plain${b64 ? ';base64' : ''},${encodeURIComponent(code)}`;
/**/
		}
	}
}

function diff(expected, actual, expectedJSON, actualJSON) {
	console.log("Expected: ", expected, ", actual: ", actual);
	console.log("\t", expectedJSON);
	console.log("\t", actualJSON);
	var d = diffInternal(expectedJSON, actualJSON);
	console.log("\t", d[0]);
	console.log("\t", d[1]);
}
// Remarks:
// - these test make several assumptions on the original models, which are not actually mandatory:
//	- a specific order of elements (e.g., operations after states and transitions)
//	- empty states should not be specified
//	=> all examples should be in canonic format || we should use a canonifying function
// - these tests must be run before building any model because they assume they can be stringified, which is not true after building
function testExportWithoutBuild(ex) {
	examples.slice(1).filter(e => !ex || e.name === ex).forEach(e => {
		var exported = e.objects || e.connectorByName ? exportModel(e) : exportObject(e);
		//var exported = exportRegion(e);
		var ej = JSON.stringify(e);
		var eej =  JSON.stringify(exported);
		var result = ej === eej;
		console.log('A: %s', result);
		if(!result) {
			diff(e, exported, ej, eej);
			(e.objects || []).forEach(o => {
				var oj = JSON.stringify(o);
				var ej  = JSON.stringify(exportObject(o));
				var result = oj === ej;
				if(!result) {
					console.log(`\tA.${o.name}: %s`, result);
					console.log("\t\t", oj);
					console.log("\t\t", ej);
					if(o.operationByName) {
						console.log(`\t\tOperations of ${o.name}: `, JSON.stringify(Object.entries(o.operationByName)) === JSON.stringify(Object.entries(exportObject(o).operationByName)));
					}
					if(o.stateByName) {
						console.log(`\t\tStates of ${o.name}: `, JSON.stringify(Object.entries(o.stateByName)) === JSON.stringify(Object.entries(exportObject(o).stateByName)));
					}
					if(o.transitionByName) {
						console.log(`\t\tTransitions of ${o.name}: `, JSON.stringify(Object.entries(o.transitionByName)) === JSON.stringify(Object.entries(exportObject(o).transitionByName)));
					}
				}
			});
			if(e.connectorByName) {
				console.log("\tConnectors: ", JSON.stringify(Object.entries(e.connectorByName)) === JSON.stringify(Object.entries(exported.connectorByName)));
			}
			if(e.operationByName) {
				console.log("\tOperations: ", JSON.stringify(Object.entries(e.operationByName)) === JSON.stringify(Object.entries(exported.operationByName)));
			}
		}
	});
}
function testExportAfterBuild() {
	examples.slice(0).forEach(e => {
		var original = JSON.stringify(e);

		function buildExport(e) {
			return e.objects || e.connectorByName ?
				exportModel(buildModel(e))
			:
				exportObject(buildModel(e))
			;
		}
		var afterBuildingOnce = buildExport(e);
		var afterBuildingOncej = JSON.stringify(afterBuildingOnce);
		var b = original === afterBuildingOncej;
		if(!b) {
			diff(e, afterBuildingOnce, original, afterBuildingOncej);
		}

		// testing that buildModel does not change anything significant when rerun
		var afterBuildingTwice = buildExport(e);
		var afterBuildingTwicej = JSON.stringify(afterBuildingTwice);
		var c = original === afterBuildingTwicej;
		if(!(b && c)) {
			console.log(`B(${e.name}) : %s, C: %s`, b, c);
		}
	});
}
function testExport() {
	// TODO: UML2AnimUML should not serialize empty objects if they are connected
	testExportWithoutBuild();
	testExportAfterBuild();
}



// Begin analysis tools connection

const b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
// Should be equivalent to:
// btoa(String.fromCharCode.apply(null, new Uint8Array(ab)))
function b64encode(array) {
	var ret = "";
	for(var i = 0 ; i + 2 < array.length ; i+=3) {
		const a = array[i];
		const b = array[i + 1];
		const c = array[i + 2];
		ret += b64chars[a >> 2];
		ret += b64chars[((a << 4) & 0x3F) | b >> 4];
		ret += b64chars[((b << 2) & 0x3F) | c >> 6];
		ret += b64chars[c & 0x3F];
	}
	switch(array.length % 3) {
	case 1:
		var a = array[array.length - 1];
		ret += b64chars[a >> 2];
		ret += b64chars[((a << 4) & 0x3F)];
		ret += "==";
		break;
	case 2:
		var a = array[array.length - 2];
		var b = array[array.length - 1];
		ret += b64chars[a >> 2];
		ret += b64chars[((a << 4) & 0x3F) | b >> 4];
		ret += b64chars[((b << 2) & 0x3F)];
		ret += "=";
		break;
	}
	return ret;
}
// Not really working because JavaScript a priori does not have any efficient way to convert between blobs and strings
function Blob2TextEngine(engine) {
	Object.assign(this, {
		isFireable(trans) {
			return engine.isFireable(trans);
		},
		getFireables() {
			return engine.getFireables().then(async (fs) => {
				const ret = [];
				for(f of fs) {
					ret.push(await f.text());
				}
				return ret;
			});
		},
		getConfiguration() {
			return engine.getConfiguration().then(config =>
// TODO: rather use base64, otherwise it is necessary to revoke the blobs
				//URL.createObjectURL(config)
				config.arrayBuffer()
			).then(e => b64encode(new Uint8Array(e)));
		},
		setConfiguration(config) {
console.log(JSON.stringify(config))
			const b = fetch(config).then(response => response.blob()).then(c => {
console.log(c);
				engine.setConfiguration(c);
			});
		},
		fire(trans) {
			engine.fire(new Blob([trans]));
		},
		reset() {
			engine.reset();
		},
		get modelName() {
			return engine.modelName;
		},
		get name() {
			return engine.name;
		},
		parseTransition(transition) {
			return engine.parseTransition(transition);
		},
		parseConfiguration(config) {
			return engine.parseConfiguration(config);
		},
		convertConfiguration(config) {
			// TODO
			return convertEMI2AnimUML(config);
		},
		disconnect() {
			return engine.disconnect();
		},
	});
}

function addToolControl(toolURL, uuid) {
	// TODO: show controls for multiple tools?
	//console.log("Adding UI controls for: ", toolURL, uuid);
	var toolController = new ToolController(`${toolURL}/control`);
	toolController.askCommands().then((commands) => {
		analysisCommands.innerHTML = `
			Commands:
			<ul id="toolCommands">
			</ul>
		`;
		commands.forEach(command => {
			function paramId(param) {
				return `${uuid}.${command[0]}.${param}`;
			}
			const a = document.createElement("a");
			a.innerHTML = command[0];
			a.href = "javascript:";	// to turn it into a link (no href would not), without changing the location ('#' would)
			a.onclick = () => {
				const rawArgs = [];
				const args = command.slice(1).map(param => {
					const parts = param.split(":");
					let input = document.getElementById(paramId(parts[0]));
					let ret;
					if(param === "property") {
						rawArgs.push(`${parts[0]} = ${getSelected(input)}`);
						ret = getSelected(input) + ":" +
							Array.from(atoms.children).map(e => `
								${e.children[0].innerText} = |${e.children[1].innerText.replace(/\|/g, "\\|")}|
							`).join("") +
							Array.prototype.map.call(properties.children, e => `
								${e.children[0].innerText} = ${e.children[1].innerText}
							`).join("")
						;
					} else {
						switch(String(parts[1])) {
							case "bool":
								rawArgs.push(`${parts[0]} = ${input.checked}`);
								ret = input.checked;
								break;
							default:
								rawArgs.push(`${parts[0]} = ${input.value}`);
								ret = input.value;
								break;
						}
					}
					return ret;
				});
				analysisTool.setEngine(engine);
				analysisOutput.innerText = `Starting ${command[0]}(${rawArgs.join(", ")})`;
				toolController.sendCommand(command[0], uuid, ...args);
			};
			const li = document.createElement("li");
			li.appendChild(a);
			if(command.length > 1) {
				const sp = document.createElement("span");
				li.appendChild(sp);
				sp.innerHTML += `(${command.slice(1).map(param => {
							const parts = param.split(":");
							if(param === "property") {
								return `${parts[0]} = <select class="propertySelect" id="${paramId(parts[0])}">${propertySelectOptions()}</select>`;
							} else {
								return `${parts[0]} = <input size="100" id="${paramId(parts[0])}" ${parts[1] === "bool" ? 'type="checkbox"' : ""} value="${globalThis.defaultToolValues?.[`${command[0]}.${param}`] || ""}"} list="test"><datalist id="test"><option value="a"></option><option value="B"></option></datalist>`;
							}
						}).join(", ")})`;
			}
			toolCommands.appendChild(li);
		});
	}).catch(e => console.log(e));
}
function propertySelectOptions() {
	let ret = "";
	for(const row of properties.children) {
		const propName = row.children[0].innerText;
		const prop = row.children[1].innerText;
		ret += `<option>${propName}</option>`;
	}
	return ret;
}
function atomSelectOptions(optional) {
	let ret = optional ? "<option></option>" : "";
	for(const row of atoms.children) {
		const atomName = row.children[0].innerText;
		ret += `<option>${atomName}</option>`;
	}
	return ret;
}
let draggedRow;
function ondragstart(e) {
	draggedRow = e.target;
}
function makeDraggable(row) {
	// https://www.therogerlab.com/how-can-i/javascript/reorder-html-table-rows-using-drag-and-drop.html#reorderRows
	row.draggable = true;
	row.ondragstart = ondragstart;
	row.ondragover = (e) => {
		if(draggedRow.parentNode != row.parentNode) {
			return;
		}
		e.preventDefault();
		//console.log("dragging", draggedRow.children[0].innerText, "to", e.target.parentNode.children[0].innerText)
		if(Array.from(row.parentNode.children).indexOf(e.target.parentNode) > Array.from(row.parentNode.children).indexOf(draggedRow)) {
			e.target.parentNode.after(draggedRow);
		} else {
			e.target.parentNode.before(draggedRow);
		}
	};
}
function updatePropertySelects() {
	for(const select of document.getElementsByClassName("propertySelect")) {
		select.innerHTML = propertySelectOptions();
	}
	Array.from(properties.children).forEach(makeDraggable);
}
globalThis.updatePropertySelects = updatePropertySelects;
new MutationObserver((...args) => {
	for(const row of properties.children) {
		const propName = row.children[0].innerText;
		if(propName === "") {
			row.remove();
		}
	}
	globalThis.updatePropertySelects();
}).observe(properties, {subtree: true, characterData: true});

function updateAtomSelects() {
	function process(className, optional) {
		const prevSelected = {};
		for(const select of document.getElementsByClassName(className)) {
			prevSelected[select.id] = getSelected(select);
		}
		for(const select of document.getElementsByClassName(className)) {
			select.innerHTML = atomSelectOptions(optional);
			select.value = prevSelected[select.id];
			if(select.selectedIndex < 0) {
				select.selectedIndex = 0;
			}
		}
	}
	process("atomSelect", false);
	process("optionalAtomSelect", true);
	Array.from(atoms.children).forEach(makeDraggable);
}
globalThis.updateAtomSelects = updateAtomSelects;
async function updateAtomValues(updateView = true) {
	const values = {};
	for(const atom of atoms.children) {
		const name = atom.children[0].innerText;
		const expr = atom.children[1].innerText;
		const valElem = atom.children[2];
		if(updateView) {
			valElem.innerHTML = "<i>evaluating</i>";
		}
		try {
			const val = await engine.evaluateAtom(expr, values);
			values[name] = val;
			if(updateView) {
				const vals = JSON.stringify(val, (key, value) =>
					typeof value === "bigint"
					?	value.toString()
					:	value
				);
				switch(String(vals)) {
					case "true":
						valElem.innerHTML = `<span style="color: green; font-weight: bold;">true</span>`;
						break;
					case "false":
						valElem.innerHTML = `<span style="color: red; font-weight: bold;">false</span>`;
						break;
					default:
						valElem.innerText = vals;
						break;
				}
			}
		} catch(e) {
			values[name] = e;
			if(updateView) {
				valElem.innerHTML = `<i>${e}</i>`;
			}
		}
	}
	return values;
}
new MutationObserver((...args) => {
	for(const row of atoms.children) {
		const atomName = row.children[0].innerText;
		if(atomName === "") {
			row.remove();
		}
	}
	globalThis.updateAtomSelects();
	updateAtomValues();
}).observe(atoms, {subtree: true, characterData: true});

var analysisTool;
var toolOkListener = (e) => {
	const url = toolURL.value;
	onToolConnect();
	analysisTool = new Tool(url, {
		onuuid(uuid) {
			addToolControl(url, uuid);
		},
		onclose() {
			disconnectFromTool();
		},
		onresults(msg) {
			msg = msg.replace(/;counterexample (.*)$/, `;<a href="javascript:replay('$1')">show counterexample</a>`);
			analysisOutput.innerHTML = msg;
			updateFig();
		},
		onprogress(msg) {
			analysisOutput.innerText = msg;
		},
		ongetconfig(trans) {
			return new Promise((resolve, reject) => {
				setTimeout(resolve, toolDelay.value);
				if(toolAnimation.checked) {
					//refreshTimeout();	// TODO: reimplement this from OldRemoteTool?
					updateFig();
				}
			});
		},
	});
	// in case we use the OBP2 GUI, we cannot wait until a command is sent to set the engine
	analysisTool.setEngine(engine);
};
async function play(transitions) {
	await replay(transitions, false);
}
async function replay(transitions, withReset = true) {
	if(withReset) {
		await engine.reset();
	}

	let hasLoop = false;

	transitions = transitions.split(",");
	for(const trans of transitions) {
		if(trans === "LOOP START") {
			builtInEngine.sysHistory.push({
				cause: "PlantUML:loop",
				PlantUML: "loop",
			});
			hasLoop = true;
		} else {
			await engine.fire(trans);
		}
	}

	if(hasLoop) {
		builtInEngine.sysHistory.push({
			cause: "PlantUML",
			PlantUML: "end",
		});
	}

	interactionSelect.selectedIndex = 0;
	curSVGHash = "";
	updateFig();
}
function disconnectFromTool() {
	if(debugAnalysis.checked) {
		console.log("Disconnecting from analysis tool");
	}
	show(connectToToolLI);
	hide(disconnectFromToolLI);
	analysisTool.close();
}
function onToolConnect() {
	analysisOutput.innerText = 'Not output from analysis tool yet';
	analysisCommands.innerText = 'Not available command yet';
	hide(connectToToolLI);
	show(disconnectFromToolLI);
}
toolOk.onclick = toolOkListener;
toolURL.onkeypress = (e) => {
	if(e.keyCode === 13) {
		toolOkListener(e);
	}
}

// End analysis tools connection

// Begin EMI connection

function disconnectFromEMINew() {
	if(debugEMI.checked) {
		console.log("Disconnecting from EMI");
//console.trace();
	}
	show(connectToEMI);
	hide(disconnectFromEMILI);
	engine?.name === "EMI" && engine.close();
	//currentEngine = undefined;
	engine = builtInEngine;
	updateFig();
}
var emiOkListenerNew = async (e, f) => {
	hide(connectToEMI);
	emiFireables.innerText = '';
	emiConnectedURL.innerText = emiURL.value.replace(/^[^:]+:\/\/[^\/]+\/emi\//, "").replace(/\.emi\/$/, "");
	show(disconnectFromEMILI);
	var remoteEngine = await EMIRemoteEngine.connect(emiURL.value, {
		onclose: disconnectFromEMI,
	});
	if(emiAnimation.checked) {
		// TODO: use events rather than wrapping the engine
		engine = {
			isFireable(trans) {
				throw "unsupported";
			},
			async getFireables() {
				var ret = await remoteEngine.getFireables();
						if(emiAnimation.checked) {
							emiFireables.innerText = '';
							emiFireableBlobs.splice(0, emiFireableBlobs.length);
							emiFireableBlobsIndex = 0;
							for(const trans of ret) {
								await this.parseTransition(trans);
							}
							emiFireableBlobs.push(...ret);
						}
				return ret;
			},
			async getConfiguration() {
				var ret = await remoteEngine.getConfiguration();
					if(emiAnimation.checked) {
						await this.parseConfiguration(ret);
					}
				return ret;
			},
			async setConfiguration(config) {
				await remoteEngine.setConfiguration(config);
			},
			async fire(transition) {
				await remoteEngine.fire(transition);
			},
			async reset() {
				await remoteEngine.reset();
					if(emiAnimation.checked) {
						await this.getConfiguration();
						await this.getFireables();
					}
			},
			get modelName() {
				return remoteEngine.modelName;
			},
			get name() {
				return remoteEngine.name;
			},
			async parseTransition(transition) {
				var ret = await remoteEngine.parseTransition(transition);
					if(emiAnimation.checked) {
						var e = ret;
							if(debugEMI.checked) {
								var objectName = JSON.parse(e)[0].activeObject.replace(/.*_/, "");
								var sourceName = JSON.parse(e)[0].source;
								var targetName = JSON.parse(e)[0].target;

								// empty string if no name in model
								var transName = JSON.parse(e)[0].transitions[0];

								if(sourceName === targetName) {
									transName = `${sourceName}.__internal__${transName}__`;
								}
								if(transName === "") {
									// TODO: how to figure out the indice?
									transName = `${sourceName}2${targetName}_<idx>`;
								}
								transName = `${objectName}.${transName}`;

								console.log("%s => %o", transName, getTransition(transName));
							}
							const a = document.createElement("a");
							a.innerText = e;
							//a.href = `javascript:${callPrefix}emiFire(${JSON.stringify(JSON.stringify(JSON.parse(e)[0]))})`;
							//a.href = `javascript:${callPrefix}emiFire(${JSON.stringify(e)})`;
							a.href = `javascript:${callPrefix}emiFire(${emiFireableBlobsIndex})`;
							emiFireableBlobsIndex++;
							const li = document.createElement("li");
							li.appendChild(a);
							emiFireables.appendChild(li);
					}
				return ret;
			},
			async parseConfiguration(config) {
				var ret = await remoteEngine.parseConfiguration(config);
					if(emiAnimation.checked) {
						var config = JSON.parse(ret);
						if(debugEMI.checked) {
							console.log(config);
						}
						currentModel.objects.filter(obj => currentModel.isActive(obj)).forEach(object => {
							if(config.children) {
console.log("original EMI config")
								// original EMI config
								function emiGet(o, pn) {
									return o.children.find(e => e.name === pn);
								}
								var emiObject = config.children.find(e => e.name.endsWith(`_${object.name}`));
								if(emiObject) {
									const emiCS = emiGet(emiObject, "cs").value;
									const cs = `${object.name}.${emiCS}`;
									configuration.currentState[object.name] = fullState(getState(cs));
								} else {
									console.log("Could not find object %s in EMI configuation", object.name);
								}
							} else if(config.currentState) {
console.log("AnimUML-compatible config")
								// AnimUML-compatible config
								var emiObjectCS = config.currentState[object.name];
								if(emiObjectCS) {
									builtInEngine.configuration.currentState[object.name] = currentModel.fullState(currentModel.getState(emiObjectCS[0]));
								} else {
									console.log("Could not find object %s in EMI configuation", object.name);
								}
							} else {
								// simplified EMI config
								var emiObject = Object.entries(config).find(([objectName, object]) => objectName.endsWith(`_${object.name}`))?.object;
								if(emiObject) {
									const emiCS = emiObject.cs;
									const cs = `${object.name}.${emiCS}`;
									builtInEngine.configuration.currentState[object.name] = currentModel.fullState(currentModel.getState(cs));
								} else {
									console.log("Could not find object %s in EMI configuation", object.name);
								}
							}
						});
						updateFig();
					}
				return ret;
			},
			async showConfiguration(config) {
				var ret = await remoteEngine.showConfiguration(config);
				return ret;
			},
			async showTransition(transition) {
				var ret = await remoteEngine.showTransition(transition);
				return ret;
			},
			close() {
				remoteEngine.close();
			},
		};
		await engine.getConfiguration();
		await engine.getFireables();
	} else {
		engine = remoteEngine;
	}
	if(typeof(e) === "function") {
		e(engine);
	}
};
const emiFireableBlobs = [];
var emiFireableBlobsIndex = 0;
async function emiFireNew(transIndex) {
	const trans = emiFireableBlobs[transIndex];
	await engine.fire(trans);
	await engine.getConfiguration();
	await engine.getFireables();
}

var emiWS;
var emiState;
function emiSend(msg) {
	if(debugEMI.checked) {
		console.log("Sending to EMI: ", msg)
	}
	emiWS.send(msg);
}

var emiOkListener = emiOkListenerNew;
var disconnectFromEMI = disconnectFromEMINew;
var emiFire = emiFireNew;

emiOk.onclick = emiOkListener;
emiURL.onkeypress = (e) => {
	if(e.keyCode === 13) {
		emiOkListener(e);
	}
}
// End EMI connection

function stopExploration() {
	worker?.postMessage({action: "stop"});
	syncStop();
}

var worker;
const debugWorker = false;
function exploreStateSpace(until, noReset) {
/*
	let previousTrace = noReset ?
		// TODO: save all branches, not just the main one
		sysHistory.filter(e =>
			e.cause.startsWith("transition:") && !e.isAuto
		).map(e =>
			e.cause.replace(/^transition:/, "")
		)
	:	[]
	;
/*/
	let previousTrace = [...sysHistory];
/**/
	worker = worker || new Worker("AnalysisWorker.min.js?d=20211031", {type: "module"});	// firefox ignores type: module
worker.onerror = console.log;
	function returnValue(value) {
//console.log("posting", value)
		worker.postMessage({
			action: "return",
			value: value,
		});
	}
	let engineHeatMap = {};
	(engine.settings ??= {}).onfired = (trans) => {
		const transFQN = currentModel.transFullName(trans);
		engineHeatMap[transFQN] ??= 0;
		engineHeatMap[transFQN]++;
	};
	let analysisEngine = engine;
	if(withObservers.checked && currentModel.objects.some(obj => obj.isObserver)) {
		analysisEngine = new SynchronousCompositionEngine(engine, ...currentModel.objects.filter(obj => obj.isObserver).map(obs => new ObserverAnimUMLEngine(currentModel, obs)));
	}
	const canonizerAtomId = getSelected(exploreCanonizer);
	worker.onmessage = async (msg) => {
		if(debugWorker) {
			console.log("Message from worker: ", msg);
		}
		switch(String(msg.data.action)) {
			case "reset":
				if(!noReset) {
					analysisEngine.reset().then(returnValue);
				} else {
					returnValue();
				}
				break;
			case "getConfiguration":
				analysisEngine.getConfiguration().then(returnValue);
				break;
			case "parseConfiguration":
				analysisEngine.parseConfiguration(msg.data.config).then(returnValue);
				break;
			case "setConfiguration":
				const r = analysisEngine.setConfiguration(msg.data.config);
				// only for sync
				if(r && r.then) {
					// engine has an async setConfiguration method
					r.then(
						returnValue
					);
				} else {
					// engine has a sync setConfiguration method
					returnValue();
				}
				break;
			case "fire":
//console.log("fire", msg.data.trans)
				analysisEngine.fire(msg.data.trans).then(
					// only for sync
					returnValue
				);
				break;
			case "parseTransition":
				analysisEngine.parseTransition(msg.data.trans).then(
					returnValue
				);
				break;
			case "getFireables":
				analysisEngine.getFireables().then(returnValue);
				break;
			case "isAccept":
				if(until) {
					const select = noReset ? exploreStopCondition : resetExploreStopCondition;
					//const ret = await engine.evaluateAtom(atoms.children[select.selectedIndex].children[1].innerText);
					if(getSelected(select)) {
						const ret = await updateAtomValues(false);
						returnValue(ret[getSelected(select)]);
					} else {
						returnValue(false);
					}
				} else if(analysisEngine.isAccept) {
					returnValue(await analysisEngine.isAccept());
				} else {
					returnValue(false);
				}
				break;
			case "results":
				let results = msg.data.value;
				if(noReset && hasElements(previousTrace)) {
/*
					results = results.replace(/replay\('/, `$&${previousTrace.join(",")},`);
/*/
					sysHistory.splice(0);
					sysHistory.push(...previousTrace);
					analysisEngine.configuration = analysisEngine.copyConfig(sysHistory.slice(-1)[0].configurationAfter);
					await analysisEngine.settings?.onconfigchanged?.();
					const regex = /; <a href="javascript:replay\('([^']*)'\)">show trace<\/a>/;
					const m = results.match(regex);
					if(m) {
						const trace = m[1];
						replay(trace, false);
						results = results.replace(regex, "");
					}
/**/
				}
				explorationsOutput.innerHTML = `RESULTS: ${results}`;
				worker.postMessage({action: "askHeatMap"});
				updateFig();
				break;
			case "setHeatMap":
				heatMap = msg.data.value;
				function addHeatMapMax(heatMap) {
					heatMap.max = Object.values(heatMap).reduce((a, b) => Math.max(a, b), 0);
				}
				addHeatMapMax(engineHeatMap);
				if(engineHeatMap.max > 0) {
					heatMap = engineHeatMap;
				} else {
					addHeatMapMax(heatMap);
				}
				if(showHeatMap.checked) {
					updateFig();
				}
				//console.log("heatMap", msg.data.value);
				break;
			case "stopped":
				explorationsOutput.innerText = `STOPPED: ${msg.data.value}`;
				worker.postMessage({action: "askHeatMap"});
				break;
			case "progress":
				explorationsOutput.innerText = `PROGRESS: ${msg.data.value}`;
				break;
			case "getConfigKey":
				// msg.data.config could be the current configuration, but we cannot assume that it still is
				await engine.setConfiguration(msg.data.config);
				const ret = await updateAtomValues(false);
				returnValue(ret[canonizerAtomId]);
				break;
			default:
				throw "Unsupported action from worker: " + msg.data.action;
				break;
		}
	};
	worker.postMessage({
		action: 'exploreStateSpace',
		withBFS: withBFS.checked,
		withCustomConfigKey: canonizerAtomId,
		useZ2mc: useZ2mc.checked,
		stepBreakpoint: stepBreakpoint.checked,
	});
}
let heatMap;

// resolve full name in order to get the "real" transition, and not a view version of it (e.g., after toExplicit)
function actualTrans(trans) {
	if(showExplicitSM.checked) {
		const transFullName =	trans.isInternal ?
						`${trans.region.region.name}.${trans.region.name}.${trans.name}`
					:
						`${trans.region.name}.${trans.name}`
		;
		return currentModel.getTransition(transFullName);
	} else {
		return trans;
	}
}

const builtInCurrentEngine = {
		getEventPool(object) {
			return builtInEngine.configuration.objectState[object.name]?.__EP__;
		},
		getMatchingEtherMessages(object) {
			const triggers = currentModel.isActive(object) ? getTriggers(object) : [];
			const operations = object.operations?.map(e => e.name) ?? [];
			return unique([...triggers, ...operations]).flatMap(trigger => builtInEngine.configuration.ether[trigger] ?? []);
		},
		getSlots(object) {
			return builtInEngine.configuration.objectState[object.name];
		},
		isActivable(trans) {
			const atrans = actualTrans(trans);
			if(atrans) {
				return builtInEngine.isActivable(atrans);
			} else {
				return false;
			}
		},
		isFireable(trans) {
			const atrans = actualTrans(trans);
			if(atrans) {
				return builtInEngine.isFireable(atrans);
			} else {
				return false;
			}
		},
		getTransURI(op, transition, part) {
			return `javascript:${callPrefix}${op}('${encodeURIComponent(currentModel.transFullName(transition))}'${part ? `,'${part}'` : ''})`;
		},
		getFireURI(transition) {
			return this.getTransURI('fire', transition);
		},
		isCurrent(state) {
			return builtInEngine.isCurrentState(state);
		},
		eventMatched(trans) {
			return builtInEngine.eventMatched(actualTrans(trans));
		},
		getFireable(object, filter) {
			return builtInEngine.getFireable(object, filter);
		},
		findMessage(event, target, ports) {
			return builtInEngine.findMessage(event, target, ports);
		},
	};
var currentEngine = builtInCurrentEngine;

// remark: makes more methods necessarily async, which was not the case for the builtInEngine
// because it is basically sync, and which as not the case for RemoteEngine because messages sent to it
// were necessarily sequential
/*
const compressingBuiltInEngine = Object.assign(Object.assign({}, builtInEngine), {
	async getConfiguration() {
		const config = await builtInEngine.getConfiguration();
		const ret = pako.deflateRaw(config, {level: 9});
		return ret;
	},
	async decompress(config) {
//console.log(`Decompressing(${config.length}): `, config);
		if(config instanceof Blob) {
			config = await config.arrayBuffer();
		}
		return pako.inflateRaw(config, {to: "string"});
	},
	async setConfiguration(config) {
		await builtInEngine.setConfiguration(await this.decompress(config));
	},
	async parseConfiguration(config) {
		return builtInEngine.parseConfiguration(await this.decompress(config));
	},
	async showConfiguration(config) {
		return builtInEngine.showConfiguration(await this.decompress(config));
	},
});
*/


// An engine that uses history navigation (see the backTo function) in order to support setConfiguration
// This only works if user code always rolls back to a previous configuration in the current history
// Rationale: this can be used to test sysHistory and backTo
var sysHistoryEngine = {
	isFireable(trans) {
		isFireable(trans);
	},
	getFireables() {
		return Promise.resolve(builtInEngine.getFireables().map(transFullName));
	},
	getConfiguration() {
		const ret = serializeConfig(configuration);
		return Promise.resolve(ret);
	},
	setConfiguration(config) {
		if(config !== serializeConfig(configuration)) {		// otherwise no need to go back, we should already be in the reset state
			const index = this.hist.indexOf(config);

			// if index < 0: let it crash, because we do not support this case
			if(index < 0) {
				console.log("Cannot find this configuration in sysHistory: ", config);
			}

			backToInternal(index);
			var currentConfig = serializeConfig(configuration);
			console.assert(config === currentConfig, "After backTo(", index, "), should be in ", JSON.parse(config), " but is in ", JSON.parse(currentConfig), "\n\texpected:\t", config, "\n\tactual:\t\t", currentConfig);
			this.hist.splice(
				index,
				this.hist.length	// too large on purpose, to remove all remaining elements. hist.length - index should work
			);
			console.assert(this.hist.length == sysHistory.length)
		}
	},
	fire(transName) {
		this.hist.push(serializeConfig(configuration));
		var trans = getTransition(transName);
		fireInternal(trans);

		while(this.autoFireAfterChoice && trans.target.kind === "choice") {
			const obj = getTransObject(trans);
			// we've reached a Pseudostate, and we need to proceed
			var fireables = getFireable(obj);
			if(fireables.length != 1) {// && trans.target.kind === "choice") {
				// we should remove else transitions, which AnimUML keeps
				fireables = fireables.filter(t => t.guard !== "else");
			}
			if(fireables.length != 1) {
				throw "There should be exactly one fireable transition";
			}
			trans = fireables[0];
			this.hist.push(serializeConfig(configuration));
			fireInternal(trans);
		}
	},
	reset() {
		builtInEngine.reset();
		this.hist = [];
		// we do not care about initialisation
		sysHistory = [];
	},
	get modelName() {
		return currentModel.name;
	},
	get name() {
		return "AnimUML-sysHistory";
	},
	async parseTransition(transName) {
		return transName;
	},
	async parseConfiguration(config) {
		return config;
	},
	async showTransition(transName) {
		const trans = getTransition(transName);
		return {object: getTransObject(trans).name, source: trans.source.name, target: trans.target.name};
	},
	async showConfiguration(config) {
		return JSON.parse(config);
	},
};

function testConversions() {
	// export tests are currently designed to run before any model loading occurs
	//testExport();

	// test conversions (totUML, toC) and transformations (toExplicit), for absence of exception only so far
	examples.slice(0).forEach(e => {
		//console.log("Testing ", e.name, ".totUML()");
		// must load, so that model.objects is created if not present in (single-object) example
		load(e);
		totUML(currentModelWrapper);
		toC(currentModelWrapper);
		currentModel.objects.filter(o => currentModel.isActive(o)).map(e => toExplicit(e, currentModelWrapper));
	});
}

async function testComparedProducerConsumer() {
	await testComparedExecution("UML2AnimUML_ProducerConsumer", () => {
		getObject("Mainintermediate").name = "intermediate";
	});
}

async function testComparedAliceBob2() {
/*	// no longer necessary now that we have endNames in connectors
	const oldReset = builtInEngine.reset;
	builtInEngine.reset = () => {
		oldReset();
		configuration.objectState.alice.__EMI__dataManager = {name: "dataManager"};
		configuration.objectState.bob.__EMI__dataManager = {name: "dataManager"};
	};
*/

	try {
		await testComparedExecution("UML2AnimUML_AliceBob2", undefined, false);
	} finally {
		// TODO: why is this not called when testComparedExecution throws?
		// also tested with .finally(() => {...}) before the await
		// both work great when there is no exception...
		//builtInEngine.reset = oldReset;
	}
}

async function emiConnect() {
	if(engine != builtInEngine) {
		// we are already connected
		const portRegex = /:[0-9]+\//;
		if(engine.modelName.replace(portRegex, "") !== emiURL.value.replace(portRegex, "")) {
			// but we are connected to the wrong model
			//engine.close();
			disconnectFromEMI();
		}
	}
	if(engine == builtInEngine) {
		await new Promise((resolve, reject) => emiOkListener(resolve));
	}
}

async function testComparedExecution(example, setup, logInfo = false, customReset, compareConfigurations = true) {
	console.log("Comparing AnimUML vs EMI execution for: ", example);
	switchExample(example);
	checkEvents.checked = true;
	considerGuardsTrue.checked = false;
	fireInitialTransitions.checked = true;

	await emiConnect();

	setup && setup();

	var oldReset;
	if(customReset) {
		oldReset = builtInEngine.reset;
		builtInEngine.reset = () => {
			oldReset.bind(builtInEngine)();
			customReset();
		};
	}

	const engine1 =
		builtInEngine;
		//compressingBuiltInEngine;
	try {
		// for testing
		var shouldLog = logInfo;
	//var ret = (await import('./Explorer.js')).explore(eng, (...args) => {
		console.time("explore");
		var result = await (await import(`./DiffExplorer.js?nocache=${Math.random()}`)).diffExplore(engine1, engine, 
			makeDiffExploreLogger({
				info({type, args}) {
					if(args[0] === "Reached config ") {
						if(args[1] % 100 == 0 && !shouldLog) {
							console.timeLog("explore");
							return true;
						}
						//if(args[1] > 880 && !shouldLog) {	// fails around 883 because the wrong transition is apparently fired by EMI (workaround: call getFireables after each setConfig)
						//if(args[1] > 1410 && !shouldLog) {	// blocks at 1413 because params are not supported yet (the "wrong" transition gets fired a bit earlier actually)
						//if(args[1] > 3080 && !shouldLog) {	// blocks at 3086 because AnimUML returns 2 transitions vs. EMI only 1. The problem is that AnimUML considers all events, whereas EMI only considers the first matching event
						if(false) {
							shouldLog = true;
						}
					}
					if(shouldLog) {
						return true;
					}
					return false;
				},
				counts: ()=>true,
			})
/*
		async (type, ...args) => {
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
					console.log.apply(console, await process(args));
					break;
				case "counts":
					logStatus.apply(null, await process(args));
					break;
				default:
					console.log("Message of unknown type: ", type, " with args: ", await process(args));
					break;
			}
		}
*/
		, compareConfigurations);
		console.timeEnd("explore");
	} finally {
		// TODO: why is this not called when testComparedExecution throws?
		// also tested with .finally(() => {...}) before the await
		// both work great when there is no exception...
		if(oldReset) {
			builtInEngine.reset = oldReset;
		}
	}
}

async function testComparedLevelCrossing() {
	await testComparedExecution("UML2AnimUML_LevelCrossing", undefined, false, () =>{
		builtInEngine.configuration.objectState["tcEntrance0"].__EMI__id = 1;
		builtInEngine.configuration.objectState["tcEntrance1"].__EMI__id = 1;
		builtInEngine.configuration.objectState["tcExit"].__EMI__id = 2;
	});
}

async function testComparedExecutions() {
	await testComparedExecution("UML2AnimUML_AliceBob1");
	await testComparedAliceBob2();
	await testComparedLevelCrossing();
	// DONE: add necessary features for this
	//	- reactive system hypothesis
	//		- making all ENV objects actors (in UML2AnimUML)
	//		- implementing the semantics: actor transitions only fireable when no system transition is fireable
	// TODO:
	//	- root object (used in EP_IS_EMPTY)
	await testComparedCruiseControlv4();
}

// TODO: use testCases for testComparedExecution so that we do not need this
function prepareCruiseControlv4() {
	// TODO: restore after execution, or better: use testCases for comparedExecution too?
	//builtInEngine.settings.autoFireAfterChoice = true;
	autoFireAfterChoice.checked = true;
	//compressingBuiltInEngine && (compressingBuiltInEngine.autoFireAfterChoice = true);
	sysHistoryEngine.autoFireAfterChoice = true;
	checkEvents.checked = true;
	considerGuardsTrue.checked = false;
	fireInitialTransitions.checked = true;
	enableEventPools.checked = true;
	matchFirst.checked = true;
	symbolicValues.checked = false;
	reactiveSystem.checked = true;	

	// workaround for default value, until supported by AnimUML
	currentModel.getObject("env_Env_engine").transitionByName.Init.effect = "SET(this, speed, 1)";

	// EMI does not have internal transitions
	// we display them as internal, but should not consider them as internal
	function processRegion(r) {
		Object.values(r.internalTransitions || {}).forEach(t => t.isInternal = false);
		r.transitions.forEach(t => t.isInternal = false);
		r.states.forEach(s => processRegion(s));
	}
	currentModel.objects.forEach(o => processRegion(o));
}

async function testComparedCruiseControlv4(logInfo = false) {
	await testComparedExecution("UML2AnimUML_CruiseControlv4", prepareCruiseControlv4, logInfo);
}

async function testComparedLevelCrossingManual() {
	// TODO: this fails because event ordering in the controller's event pools matter for EMI, but not for the Ether
	await testComparedExecution("LevelCrossing", () => {
		// TODO: restore after execution
		builtInEngine.nbMessagesToKeepInEther = 1;
	}, false, () => {
		// maybe unnecessary
	},
		false	// configurations are not comparable because the "manual" model is different (even though it was made more similar): it uses the ether
	);
}

async function testFailingComparedExecutions() {
	await testComparedLevelCrossingManual();


	// TODO: add necessary features for this
	await testComparedProducerConsumer();
}

// TODO: test execution without setConfiguration, but with sysHistory's backTo, and compare


function sleep(t) {
	return new Promise(r => setTimeout(r, t));
}
// TODO: test sequence and timing diagrams
async function testPlantUML(timeout = 0) {
	for(const e of examples) {
		console.log("Switching to example ", e);
		switchExample(e.name);
		await sleep(timeout);
		edit();
		await sleep(timeout);
		edit();
		// TODO: check that there is no PlantUML error
	}
}

function addExample(e) {
	addOption(exampleSelect, e.name);
}


async function loadFirstValidExample() {
	const add = document.location.hash.match(/^#({|%7B)/) ? [] : examples.filter(e => "#" + e.name === document.location.hash);
	for(let example of [...add, ...examples]) {
		try {
			await load(buildModel(example));
			exampleSelect.selectedIndex = [...exampleSelect.options].find(o => o.value === currentModel.name).index;
			break;
		} catch(e) {
			console.log("Could not load model %s: %s", example.name, e);
			throw e;
		}
	}
}

export function exportDynamicSymbols(getSymbol, ...symbols) {
	for(const symbol of symbols) {
		Object.defineProperty(globalThis, symbol, {
			get: function() {
				return getSymbol(symbol);
			},
		});
	}
}



function doExportSymbols() {
	//*	// TODO: use module export and, more importantly, improve modularization to avoid most of these
	exportSymbols(
		(symbol) => eval(symbol),
		// unclassified
		"loadSample",
		"addExample",
/*
		"isCurrentState",
		"getObject",
*/
		// for UI
			// for use in .html
			"toggle",
			"edit",
			"disconnectFromEMI",
			"disconnectFromTool",
			"backTo",
			"fire",
			"emiFire",
	//		"getTransition",
			"callOperation",
	//		"reset",
			"switchToObject",
			"setSender",
			"play",
			"replay",
			"exploreStateSpace",
			"stopExploration",
			"selectDisplayedObjects",
			"fix",
			"autoFix",
			"updateIssues",

			// for use in Editor.js
			"show",
			"hide",
			"updateExport",
			"updateFig",
			"ALL_OBJECTS",
			"updateObjects",
		// for modules
	//P	"diffInternal",
//		"parseEMIConfiguration",
//		"convertEMI2AnimUML",
		// for TestCases
		"switchExample",
		"load",
		"emiConnect",
		// for testing, debugging
		"testComparedAliceBob2",
		"testComparedCruiseControlv4",
		"prepareCruiseControlv4",
		"testExport",
		"testExecutions",
		"testComparedExecution",
		"testComparedExecutions",
		"sysHistoryEngine",
		"testConversions",
		"testPlantUML",
	//P	"AnimUMLEngine",
		"testFailingComparedExecutions",

		"loadFromParent",


		// for debug
		"currentEngine",
		"analyzeToObject",
	);
	exportDynamicSymbols(
		(symbol) => eval(symbol),
		"analysisTool",
	);

	window.reset = () => {
		//builtInEngine.reset();
		// actual work now done in resetButton.onclick
	};

	Object.defineProperty(window, "sysHistory", {
		get: () => builtInEngine.sysHistory,
	});
	// for debug
	Object.defineProperty(window, "interactionEngine", {
		get: () => interactionEngine,
	});
}

if(startAndNoExportAtEOF) {
	start();
}

/*
require(["agda/jAgda.UMLEngine.js"], function(ue) {
});
*/

const commands = {
	"ArrowLeft": {
		description: "Go left, attempting to control remark.js (previous slide) or reveal.js.",
		doIt() {
			try {
				// try controlling remark.js
				window.parent?.slideshow?.gotoPreviousSlide()
			} catch(e) {}
			// try controlling reveal.js
			window.parent.postMessage( JSON.stringify({ method: 'left'}), '*' );
		},
	},
	"ArrowUp": {
		description: "Go up, attempting to control remark.js (previous slide) or reveal.js.",
		doIt() {
			try {
				// try controlling remark.js
				window.parent?.slideshow?.gotoPreviousSlide()
			} catch(e) {}
			// try controlling reveal.js
			window.parent.postMessage( JSON.stringify({ method: 'up'}), '*' );
		},
	},
	"ArrowRight": {
		description: "Go right, attempting to control remark.js (next slide) or reveal.js.",
		doIt() {
			try {
				// try controlling remark.js
				window.parent?.slideshow?.gotoNextSlide()
			} catch(e) {}
			// try controlling reveal.js
			window.parent.postMessage( JSON.stringify({ method: 'right'}), '*' );
		},
	},
	"ArrowDown": {
		description: "Go down, attempting to control remark.js (next slide) or reveal.js.",
		doIt() {
			try {
				// try controlling remark.js
				window.parent?.slideshow?.gotoNextSlide()
			} catch(e) {}
			// try controlling reveal.js
			window.parent.postMessage( JSON.stringify({ method: 'down'}), '*' );
		},
	},
	"r": {
		description: "Reset execution.",
		async doIt() {
			//reset();
			await builtInEngine.reset();
			syncStop();
		},
	},
	"e": {
		description: "Toggle edit mode.",
		doIt() {
			edit();
		},
	},
	"o": {
		description: "Toggle settings menu.",
		doIt() {
			//histExport.click();
			toggle(settingsButtons, "inline");
		},
	},
	"s": {
		description: "Switch history to TCSVG sequence.",
		doIt() {
			setHistoryType("TCSVG sequence");
			updateFig();
		},
	},
	"p": {
		description: "Switch history to PlantUML sequence.",
		doIt() {
			setHistoryType("sequence");
			updateFig();
		},
	},
	"t": {
		description: "Switch history to PlantUML timing.",
		doIt() {
			setHistoryType("timing");
			updateFig();
		},
	},
	"c": {
		description: "Toggle showing objects.",
		doIt() {
			hideClasses.checked = hideClasses.checked ? false : true;
			updateFig();
		},
	},
	"b": {
		description: "Toggle showing behavioral state machines.",
		doIt() {
			hideStateMachines.checked = hideStateMachines.checked ? false : true;
			updateFig();
		},
	},
	"l": {
		description: "Reify current trace/history into an interaction.",
		doIt() {
			const interName = trace2Interaction();
			setInteraction(interName);
			updateFig();
		},
	},
	"T": {
		description: "Toggle showing transition notes in history.",
		doIt() {
			showTransitions.checked = showTransitions.checked ? false : true;
			updateFig();
		},
	},
	"S": {
		description: "Toggle showing state invariants in history.",
		doIt() {
			hideStates.checked ^= true;
			updateFig();
		},
	},
	"A": {
		description: "Toggle showing set/assignment pseudo messages in history.",
		doIt() {
			hideSets.checked ^= true;
			updateFig();
		},
	},
	"P": {
		description: "Toggle showing pseudostate invariants in history.",
		doIt() {
			showPseudostateInvariants.checked = showPseudostateInvariants.checked ? false : true;
			updateFig();
		},
	},
	"C": {
		description: "Toggle showing class diagram.",
		doIt() {
			showClassDiagram.checked ^= true;
			updateFig();
		},
	},
	"n": {
		description: "Display next interaction (in the order listed in the 'select interation' dropdown list.",
		doIt() {
			interactionSelect.selectedIndex = (interactionSelect.selectedIndex + 1) % interactionSelect.options.length;
			curSVGHash = "";
			updateFig();
		},
	},
	"N": {
		description: "Display previous interaction (in the order listed in the 'select interation' dropdown list.",
		doIt() {
			if(interactionSelect.selectedIndex > 0) {
				interactionSelect.selectedIndex--;
			} else {
				interactionSelect.selectedIndex = interactionSelect.options.length - 1;
			}
			curSVGHash = "";
			updateFig();
		},
	},
	"m": {
		description: "Toggle displaying methods as activity diagrams.",
		doIt() {
			showMethodsAsActivities.checked ^= true;
			updateFig();
		},
	},
	"M": {
		description: "Toggle showing methods as notes.",
		doIt() {
			hideMethods.checked ^= true;
			updateFig();
		},
	},
	"E": {
		description: "Toggle showing event pools.",
		doIt() {
			showEventPools.checked ^= true;
			updateFig();
		},
	},
	"w": {
		description: "Toggle narrow mode.",
		doIt() {
			narrow.checked ^= true;
			updateFig();
		},
	},
	"a": {
		description: "Toggle displaying actors as objects.",
		doIt() {
			showActorsAsObjects.checked ^= true;
			updateFig();
		},
	},
	"L": {
		description: "List available commands in console.",
		doIt() {
			const allCommands = Object.entries(commands).sort();
			for(const [key, command] of allCommands) {
				console.log("%s: %s", key, command.description);
			}
		},
	},
	"F": {
		description: "Auto-fix all possible issues detected by static analysis.",
		doIt() {
			autoFix(currentModel);
			updateIssues(currentModel);
			updateFig();
		},
	},
	"f": {
		description: "Auto-fix first possible issue detected by static analysis.",
		doIt() {
			const issues = analyzeToObject(currentModel, true);
			let fixedSomething = false;
			//console.log(issues);
			outer: for(const issue of [...issues.errors, ...issues.warnings]) {
				for(const [desc, fix] of Object.entries(issue.fixes ?? {})) {
					console.log('Fixing "%s" with "%s".', issue.message, desc);
					fix();
					fixedSomething = true;
					break outer;
					//issues[issueType][index].fixes[actionName]();
				}
			}

			if(fixedSomething) {
				updateIssues(currentModel);
				updateFig();
			} else {
				console.log("No auto-fixable issue found.");
			}
		},
	},
};

// TODO: improve this quick hack for remark.js presentations
onkeydown = async (e) => {
	const target = e.target.tagName.toLowerCase();
	if("input" === target || e.target.isContentEditable) {
		return;
	}
	if(e.altKey) {
		switch(String(e.key)) {
			case "c":
				showComments.checked ^= true;
				updateFig();
				break;
			default:
				break;
		}
	} else {
		await commands[e.key]?.doIt();
	}
};

