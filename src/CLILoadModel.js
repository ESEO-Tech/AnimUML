import * as fs from 'fs';
import {Model} from "./Model.js";
import {parser} from './ImportFromPlantUMLSequence.js';
import {preprocess} from './Preprocessor.js';

function getScript(fileData, id) {
	const match = fileData.match(new RegExp(`^.*<script [^>]*id="${id}"[^>]*>(.*?)<\/script>.*$`, "s"));
	if(match) {
		return match[1];
	} else {
		return undefined;
	}
}

export function createDummyModel(inter) {
	return {
		getObject(objName) {
			const ret = inter.objects.find(e => e.name === objName).isActor;
			return {isActor: ret};
		},
		interactions: Object.fromEntries([[inter.name, inter]].concat([...inter.refSpans.entries()].map(([key, value]) => {
			return [key, {events: value.map(e => ({object: e, state: "TODO"})), isDummy: true}];
		}))),
	};
}

// a raw model is just what is read from the file (e.g., parsed JSON)
export async function loadModel(file, id, raw = false) {
	const fileData = fs.readFileSync(file, "utf8");
	console.log("Trying to load a JavaScript sample");
	globalThis.examples = undefined
	try {
		eval(fileData);
	} catch(e) {
	}
	if(globalThis.examples) {
		if(raw) {
			return globalThis.examples[0];
		} else {
			const data = globalThis.examples[0];
			await preprocess(data);
			return new Model(data);
		}
	} else {
		console.log("Failed, trying to extract JSON from a <script> with id:", id);
		// extracting the JSON
		let data = getScript(fileData, id);
		if(data) {
			async function processed(data) {
				if(raw) {
					return data;
				} else {
					await preprocess(data, async (id) => {
						const ret = getScript(fileData, id.replace(/^#/, ""));
						return ret;
					});
					return new Model(data);
				}
			}
			try {
				data = JSON.parse(data);
				return processed(data);
			} catch(e) {
				console.log("Found non-JSON <script> with id:", id, ", trying to eval");
				try {
					data = eval(data);
					return processed(data);
				} catch{e} {
					console.log("Failed to eval, trying to parse as PlantUML-like sequence diagram");
					//	console.log(data)
					// saving old settings
					const {keepObjects, keepRefSpans} = parser;

					// setting necessary settings
					parser.keepObjects = parser.keepRefSpans = true;

					// parsing
					const inter = parser.parse(data);

					// restoring old settings
					parser.keepObjects = keepObjects;
					parser.keepRefSpans = keepRefSpans;

					//	console.log(JSON.stringify(inter, null, 2));
					const ret = createDummyModel(inter);
					return ret;
				}
			}
			// TODO: try parsing as state machine?
		} else {
			console.log("Could not find a model with id:", id);
			console.log("Here is a list of <script> element ids in the given file:");
			for(const script of fileData.matchAll(/<script id="([^"]*)"/g)) {
				console.log("\t", script[1]);
			}
			console.log("Trying to extract JSON from a <script> variable");

			const match = fileData.match(/^.*<script(?:[ \t\r\n][^>]*)?>(.*?)<\/script>.*$/s);
			const def = {objects: []};
			let success = false;
			const ret = await new Promise(async (resolve, reject) => {
				try {
					if(match) {
						let model;
						const document = {
							write(t) {
								//const m = t.match(/^.*<iframe(?:[ \t\r\n][>]*)?><\/iframe>.*$/s);
								const m = t.match(/^.*src='[ \t\r\n]*https?:\/\/[^\/]*\/+[Aa][Nn][Ii][Mm][Uu][Mm][Ll].[Hh][Tt][Mm][Ll]#([^']*)'.*$/s);
								if(m) {
									model = JSON.parse(decodeURIComponent(m[1]));
								} else {
									console.log("document.write called with unrecognizable model:", t);
								}
							}
						};
						eval(match[1]);
						
						if(model) {
							await preprocess(model);
							success = true;
							resolve(new Model(model));
						} else {
							resolve(def);
						}
					} else {
						resolve(def);
					}
				} catch(e) {
					reject(e);
				}
			});
			if(success) {
				return ret;
			} else {
				const urlRegex = /(?<=https:\/\/[^\/]*\/AnimUML.html#)([^ \t\n]*})/g;
				const models = fileData.match(urlRegex);
				console.log("Found", models.length, "model URLs");
				const jsonModel = models[id] ?? models[0];
				const model = JSON.parse(decodeURIComponent(jsonModel));
				await preprocess(model);
				return new Model(model);
			}
		}
	}
}

