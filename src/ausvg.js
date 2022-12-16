import * as fs from 'fs';
import {parser} from './ImportFromPlantUMLSequence.js';
import {auSamples, samples} from './ExtendedPlantUMLSequenceExamples.js';
import {createDummyModel, loadModel} from './CLILoadModel.js';
import {exportInteraction2SVG} from './ExportInteraction2SVG.js';

const exportStaticSVG = true;
const debug = false;

function saveFile(file, data) {
	fs.writeFile(file, data, "utf8", (err) => {
		if(err) {
			console.log(err);
		}
	});
	console.log("Saved to", file);
}

function exportSVG(inter, model, file) {
	saveFile(
		file,
		exportInteraction2SVG(inter, model, exportStaticSVG)
	);
}

async function main() {
	let file = process.argv[2];
	if(file) {
		const id = process.argv[3] || "model";
		const model = await loadModel(file, id);
		if(model) {
			Object.entries(model.interactions || {}).forEach(([interName, inter], index) => {
				if(!inter.isDummy) {
					console.log("Processing", interName);
					console.group();
					//console.log(JSON.stringify(inter, null, 2));
					exportSVG(inter, model, `testDiagram-${index}.svg`);
					console.groupEnd();
				}
			});
		}
	} else {
/*
		auSamples
			//.concat(samples)
			.forEach((sample, index) => {
				const inter = parser.parse(sample);
				if(debug) console.log(JSON.stringify(inter, null, 2))
				//console.log(JSON.stringify(model, null, 2))
				const file = `testDiagram-${index}.svg`;
				try {
					exportSVG(inter, createDummyModel(inter), file);
				} catch(e) {
					console.log("Error exporting ", file, e);
				}
			});
*/
	}
}
main();
