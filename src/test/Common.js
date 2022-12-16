//export {testCases} from '../TestCases.js';
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import assert from "assert";
import {exec} from "child_process";
import {toC} from '../Export2C.js';
import {asyncMap} from "../Utils.js";

// read local environment variables
import dotenv from 'dotenv';
dotenv.config();

export const enableCBuildTests = process.env.ENABLE_C_BUILD_TESTS === "true";

export const obpWebsocketServerURL = process.env.OBP_WEBSOCKET_SERVER_URL || "localhost:80";


import {EMIRemoteEngine} from '../EMIRemoteEngine.js';

export function testCasePath(testCase) {
	return	testCase.path ?? (testCase.load.startsWith("UML2AnimUML_") ?
			`samples/EMI/${testCase.load.replace(/^UML2AnimUML_/, '')}.js`
		:
			`samples/${testCase.load}.js`
	);
}


export function remoteEngineSupplierFor(model, engines, isDone = () => false, url = `http://${obpWebsocketServerURL}/emi/${model.name.replace(/^UML2AnimUML_/, "")}.emi/`, {onclose} = {}) {
	let n = 0;
	return async () => {
		const engineId = n++;
		await new Promise((resolve) => setTimeout(resolve, 500*engineId))
		if(isDone && isDone()) return undefined;
		console.log("creating EMIRemoteEngine", engineId, "to", url)
		const engine = await EMIRemoteEngine.connect(url, {
			onclose() {
				console.log("RemoteEngine", engineId, "closing", isDone?.());
				if(isDone && !isDone()) {
					throw `RemoteEngine ${engineId} closed too soon`;	// trying to abort the exploration to avoid having to timeout in case of a problem
					// TODO: a better solution: remove it from the pool
				}
				onclose?.();
			},
		});
		console.log("created engine", engineId)
		if(engines) {
			engines.push(engine);
		}
		return engine;
	};
}


const portRegex = /^.*NOTICE:  Listening on port ([0-9]+)$/ms;
// TODO: detect connection error
// Supports multiple instances at the same time, by having the generated code use any available port, and by parsing stderr 
// for the port number before the command has finished executing
export async function generatedEngineSupplierFor(model, engines, isDone, generatorSettings = {}) {
	const tar = toC(model, {controllable: true, ...generatorSettings});
	const tmpDir = await tmpBuild(model, tar);
	const process = exec(`cd ${tmpDir} ; cd ${model.name} ; exec ./${model.name}`,
		//{timeout: 50000},
		(err, stdout, stderr) => {
			if(!isDone()) {
				console.trace("ERR:", err);
				console.log("STDOUT:", stdout);
				console.log("STDERR:", stderr);
			}
			// TODO: fail if isDone? this may already be handled when disconnection is detected by remoteEngineSupplierFor
	});
	const port = new Promise((resolve, reject) => {
		process.stderr.on('data', data => {
			//console.log("stderr:", JSON.stringify(data));
			console.log("STDERR:", data.replace(/\n$/, ""));
			const m = data.match(portRegex);
			if(m) {
				console.log("Detected listening port:", m[1]);
/*						// to test with manually run code
				resolve(8091);
/*/
				resolve(m[1]);
/**/
			}
		});
		process.stdout.on('data', data => console.log("STDOUT:", data.replace(/\n$/, "")));
	});
	await sleep(500);	// waiting for process to launch
	const engineSupplier = remoteEngineSupplierFor(model, engines, isDone, `ws://127.0.0.1:${await port}/`, {onclose() {
		process.kill("SIGINT");
		tmpRm(tmpDir);
	}});
	return async () => {
		const ret = await engineSupplier();
		ret.name = "Generated C";
		return ret;
	};
}

export async function tmpBuild(model, tar) {
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'AnimUML.test.toC.controllable-'));
	console.log(tmpDir)
	let error;
	if(tmpDir) {
		fs.writeFileSync(`${tmpDir}/code.tar`, tar)
		await new Promise((resolve, reject) => {
			exec(`cd ${tmpDir} ; tar xvf code.tar ; cd ${model.name} ; make`, async (err, stdout, stderr) => {
				console.log(stdout)
				console.log(stderr)
				if(err) {
					console.log(err)
				}
				error = err;
				resolve();
			});
		});
		if(error) tmpRm(tmpDir);
		assert(!error, "building without error");
	} else {
		assert(false, "tmpDir could not be created");
	}
	return tmpDir;
}

export function tmpRm(tmpDir) {
	fs.rmSync(tmpDir, {recursive: true});
}

async function sleep(t) {
	return new Promise((resolve, reject) => {
		setTimeout(resolve, t);
	});
}

export function applyFireInitialTransitions(engine) {
	const originalGetFireables = engine.getFireables;
	const originalReset = engine.reset;
	engine.reset = async function() {
		await originalReset()

		// ignoring generated code's initial transitions that AnimUML skips with the current settings
		const initialTransitions = await originalGetFireables();
		for(const initialTransition of initialTransitions) {
			console.log("Firing initial transition:", await engine.parseTransition(initialTransition));
			await engine.fire(initialTransition);
		}

	};
	return engine;
}

export function applyReactiveSystemHypothesis(engine) {
	const originalGetFireables = engine.getFireables;
	function isEnv(trans) {
		const objName = trans.split(/\./)[0];
		const ret = (
			objName.startsWith("env_")	// for CruiseControlv4
		||
			objName.endsWith("Env")	// for waterPump	// TODO: use model .isActor
		);
		return ret;
	}
	engine.getFireables = async function() {
		const fireables = await originalGetFireables();
		const fireableNames = await asyncMap(fireables, e => engine.parseTransition(e));
		const hasSysTrans = fireableNames.some(e => !isEnv(e));
		// reactive system hypothesis
		if(hasSysTrans) {
			return fireables.filter((e, i) => !isEnv(fireableNames[i]));
		} else {
			return fireables;
		}
	};
	return engine;
}

