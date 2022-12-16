// engine exploration
export {explore, buildTrace} from './Explorer.js';
export {explore as parallelExplore} from './ParallelExplorer.js';
export {diffExplore} from './DiffExplorer.js';

// PlantUML support, requiers pako.min.js
export {toPlantUMLURI} from './PlantUMLURI.js';

/*
import {zip, debug, hasElements, remove, entryNameComparator, last, sortBy} from "./Utils.js";
import {DBM} from './DBM.js';
import {parser, stringify} from './JavaScriptActionLanguageParser.js';
import {Webots} from './Webots.js';
*/

export {diffInternal} from "./Utils.js";
import {last} from "./Utils.js";


// AnimUML engine

// loadModel requires
//	- fs, which can be loaded as (see webpack.config.library.cjs):
//			globalThis.FS = require("fs");
//		OR
//			TODO: import version
//	- pegjs, which can be loaded as:
//			globalThis.peg = require("./peg-0.10.0.min.js");
//		OR
//			TODO: import version
import {loadModel} from "./CLILoadModel.js";
// AnimUMLEngine requires ContextualEval.js, which can be loaded as:
//		require("./ContextualEval.cjs");
//	OR
//		import {} from "./ContextualEval.cjs";
//	=> cannot be imported directly here because it does not work when imported as a module
import {AnimUMLEngine} from "./AnimUMLEngine.js";

import {preprocess} from "./Preprocessor.js";
import {Model} from "./Model.js";
import {buildModel} from "./ImportFromAnimUML.js";

export async function getAnimUMLEngine(modelPath, settings) {
	let model;
	if(typeof process === "object") {
		// Node.js
		model = await loadModel(modelPath, settings?.modelId);
	} else {
		// Web browser
		model = await fetch(modelPath);
		model = await model.text();
		eval(model);
		console.log(globalThis.examples)
		model = last(globalThis.examples);
		model = buildModel(model);
		await preprocess(model, null);
		model = new Model(model);
	}
	return new AnimUMLEngine(model, settings ?? model.settings?.semantics);
}


// JavaScript action language
import {parser as actionsParser, expressionParser} from './JavaScriptActionLanguageParser.js';
import {matches, transform} from './ASTUtils.js';
//export {matches} from './ASTUtils.js';	// works, but not with my inliner
export {matches};

export function transformActions(code, rules, context) {
	return transform(actionsParser.parse(code), rules, context);
}
export function transformExpression(code, rules, context) {
	return transform(expressionParser.parse(code), rules, context);
}

export {getEventName, getEventArgs} from './ModelUtils.js';

export {Tail} from './utils/Tail.js';

import {Tool, ToolController} from "./RemoteTool.js";

export async function modelCheck(engine, model, propertyName, obpWebsocketServerURL = "localhost:8082") {
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
				toolController.sendCommand("VERIFY_LTL_PROPERTY", uuid, `${propertyName}:${gpsl}`);
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
	//console.log(await result);
	result.then(() => toolController.close());
	return await result;
}

import {history2TCSVGSequence} from './History2TCSVGSequence.js';
import {makeTCSVGStatic} from "./MakeTCSVGStatic.js";

export function history2Sequence(engine, settings) {
	const {
		path = ".",
	} = settings;
	const svg = history2TCSVGSequence(engine.sysHistory, engine.currentModel, {
		origin: `http://127.0.0.1:8082/`,
		participants: engine.currentModel.objects,
		...settings,
	});
	if(settings?.makeStatic) {
		return makeTCSVGStatic(svg, path, settings);
	} else {
		return svg;
	}
}

export {allObjectsToPlantUML} from "./Export2PlantUML.js";

export {main as au2puMain} from "./au2puUtils.js";


import * as z_hashset_predicate_mc from "./z2mc-javascript/src/model-checkers/z_hashset_predicate_mc.js";
import * as str2tr from "./z2mc-javascript/src/operators/str/str2tr.js";
import * as synchronous_product_semantics from "./z2mc-javascript/src/operators/str/synchronous_product_semantics.js";

export const z2mc = {
	z_hashset_predicate_mc,
	str2tr,
	synchronous_product_semantics,
};

import {TreeBuilder, Model as TreeModel} from "./AnimUMLTree.js";
export function getTreeBuilder() {
	const ret = new TreeBuilder();
	return ret;
}
