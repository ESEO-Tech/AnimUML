import * as fs from 'fs';
import {Model} from "./Model.js";
import {toC} from './Export2C.js';
import {toCeptre} from './Export2Ceptre.js';
import {toCSharp} from './Export2CSharp.js';
import {totUML} from './Export2tUML.js';
import {loadModel} from './CLILoadModel.js';
import {testCases} from './TestCases.js';

function saveFile(file, data) {
	fs.writeFile(file, data, "utf8", (err) => {
		if(err) {
			console.log(err);
		}
	});
}

async function main() {
	const argv = process.argv.slice(2);
	const settings = {};

	if(argv[0] === "--enable-observers") {
		settings.enableObservers = true;
		argv.shift();
	}

	let file = argv[0]
	let otherFile = argv[1]
	const model = await loadModel(file)
	const otherModel = otherFile && await loadModel(otherFile);

	const testCase = testCases.find(testCase => testCase.load === model.name);
	if(testCase) {
		testCase.setup?.(model);
	}

	if(otherModel) {
		console.log("Adding objects from", otherFile, ":", otherModel.objects.map(o => o.name).join());
		Array.prototype.push.apply(model.objects, otherModel.objects);
//console.log(model.objects.map(o => o.name))
	}

	saveFile(`${file}.tar`, toC(model, {...settings, controllable: false}));
	saveFile(`${file}-controllable.tar`, toC(model, {...settings, controllable: true}));
	saveFile(`${file}.cs`, toCSharp(model));
	saveFile(`${file}.tuml`, totUML(model));
	try {
		saveFile(`${file}.cep`, toCeptre(model));
	} catch(e) {
		console.log(e);
	}
}
main();
