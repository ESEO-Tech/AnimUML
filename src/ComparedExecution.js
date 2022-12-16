import {AnimUMLEngine} from "./AnimUMLEngine.js";
import {EMIRemoteEngine} from './EMIRemoteEngine.js';
import {diffExplore, makeDiffExploreLogger} from './DiffExplorer.js';
import {} from "./ContextualEval.cjs";

import websocket from "websocket";
// make globally available for RemoteEngine & RemoteTool
globalThis.WebSocket = websocket.w3cwebsocket;

export async function comparedExecution(model, obpRuntimeURL) {
	const engine1 = new AnimUMLEngine(model, {
		autoFireAfterChoice: true,
		checkEvents: true,
		fireInitialTransitions: true,
		enableEventPools: true,
		matchFirst: true,
		reactiveSystem: true,
	});
	if(model.name.endsWith("v4")) {
		// workaround for default value, until supported by AnimUML
		(currentModel.getObject("env_Env_engine") || currentModel.getObject("env_engine")).transitionByName.Init.effect = "SET(this, speed, 1)";

		// EMI does not have internal transitions
		// we display them as internal, but should not consider them as internal
		function processRegion(r) {
			Object.values(r.internalTransitions || {}).forEach(t => t.isInternal = false);
			r.transitions.forEach(t => t.isInternal = false);
			r.states.forEach(s => processRegion(s));
		}
		currentModel.objects.forEach(o => processRegion(o));
	} else if(model.name.endsWith("LevelCrossing")) {
		const oldReset = engine1.reset;
		engine1.reset = async () => {
			await oldReset.bind(engine1)();
			builtInEngine.configuration.objectState["tcEntrance0"].__EMI__id = 1;
			builtInEngine.configuration.objectState["tcEntrance1"].__EMI__id = 1;
			builtInEngine.configuration.objectState["tcExit"].__EMI__id = 2;
		};
	}


	globalThis.builtInEngine = engine1;	// TODO: get rid of the need for this line


/*
	console.time("explore");
	var results = await exploreWithOBP2(engine);
	console.timeEnd("explore");

	console.time("explore");
	var results = await exploreWithAnimUML(engine);
	console.timeEnd("explore");
*/

	let done = false;
	const modelName = currentModel.name.replace(/^UML2AnimUML_/, "");
	const engine2 = await EMIRemoteEngine.connect(`http://${obpRuntimeURL}/emi/${modelName}.emi/`, {
		onclose() {
			console.log("RemoteEngine closing");
			if(!done) {
				throw "RemoteEngine closed too soon";	// trying to abort the exploration to avoid having to timeout
			}
		},
	});
	console.log("Comparing execution of", modelName, "on", engine1.name, "and", engine2.name);
	console.time("explore");

/*	// disable configuration parsing
	engine1.showConfiguration = (e) => engine1.parseConfiguration(e);
	engine2.showConfiguration = (e) => engine2.parseConfiguration(e);
/**/

	const ret = await diffExplore(engine1, engine2, makeDiffExploreLogger({
		counts() {return true;},
		info({type, args}) {
			return false;
			//return args[0] === "Reached config " && args[1] % 100 == 0;
		},
	}), true);
	console.timeEnd("explore");

	done = true;
	engine2.close();
	return ret;
}

