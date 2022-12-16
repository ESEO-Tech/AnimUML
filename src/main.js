import websocket from "websocket";
// make globally available for RemoteEngine & RemoteTool
globalThis.WebSocket = websocket.w3cwebsocket;

import subtleCrypto from 'subtle';
// requires at least node 14.0.0 because of the safe navigation operator
// See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining
// To update: https://phoenixnap.com/kb/update-node-js-version
import {RemoteEngine} from './RemoteEngine.js';
import {Tool, ToolController} from './RemoteTool.js';
import {explore} from './Explorer.js';
import {testCases} from './TestCases.js';
import {Model} from "./Model.js";
import {comparedExecution} from "./ComparedExecution.js"

import {} from "./samples/EMI/AliceBob1.js";
import {} from "./samples/EMI/AliceBob2.js";
import {} from "./samples/EMI/LevelCrossing.js";
import {} from "./samples/EMI/CruiseControlv4.js";

globalThis.crypto = {subtle: subtleCrypto};

const baseURL = "ws://localhost:8090";

// Explore with AnimUML
async function exploreWithAnimUML(engine) {
	return await explore(engine, console.log)
}

// Explore with OBP2
async function exploreWithOBP2(engine) {
	const control = new ToolController(`${baseURL}/obp2/control`);
	//console.log(await control.askCommands())

	const tool = await new Promise((resolve, reject) => {
		const tool = new Tool(`${baseURL}/obp2`, {
			async onuuid(uuid) {
				tool.setEngine(engine);	// TODO: is tool always guaranteed to have a value here?
				control.sendCommand("EXPLORE_STATE_SPACE", uuid);
			},
			onresults(msg) {
				console.log(msg);
				resolve(tool);
			},
			onprogress(msg) {
				console.log(msg);
			},
		});
	});

	tool.close();
	control.close();
}

async function testExploration() {
	const model =
//		"AliceBob1"
//		"AliceBob2"
//		"LevelCrossing"
		"CruiseControlv4"
	;
	globalThis.engine = await RemoteEngine.connect(`${baseURL}/emi/${model}.emi/`, {
		onclose() {
			console.log("RemoteEngine closing");
		},
	});
//	console.log(await(engine.parseConfiguration(await engine.getConfiguration())))
	engine.useHash = {name: "SHA-256"};
	console.time("explore");

console.log(engine.modelName)

/*
	await exploreWithAnimUML(engine);
	await exploreWithOBP2();
*/

/*
	// TODO: change logger arguments to be an object instead of strings, so that it can be displayed in a better way when using node (notably: not listing objects because they are not collapsed)
	const engine2 =  await RemoteEngine.connect(engine.modelName);
	await diffExplore(engine, engine2, makeDiffExploreLogger({
		counts() {return true;},
		info({type, args}) {
			return args[0] === "Reached config " && args[1] % 100 == 0;
		},
	}));
	engine2.close();
*/


	console.timeEnd("explore");



	engine.close();
}

async function exploreEMI() {
	for(const testCase of testCases.filter(tc => tc.runWithEMI)) {
		const engine = await RemoteEngine.connect(`${baseURL}/emi/${testCase.load.replace(/^UML2AnimUML_/, "")}.emi/`, {
			onclose() {
				console.log("RemoteEngine closing");
			},
		});
		console.log(`Exploring ${testCase.load}`);
		console.time("explore");

		//const results = await exploreWithAnimUML(engine);
		const results = await exploreWithOBP2(engine);
		console.assert(true);	//TODO
		
		console.timeEnd("explore");
		engine.close();
	}
}

async function main() {
	for(const example of examples) {
		const model = new Model(example);
		await comparedExecution(model, baseURL);
	}
}

console.log("Starting headless AnimUML");


main();
