import {allObjectsToPlantUML, toPlantUML, operationToPlantUMLActivity} from "./Export2PlantUML.js";
import {Model} from "./Model.js";
import {toPlantUMLURI} from "./PlantUMLURI.js";
import {exportInteraction2SVG} from './ExportInteraction2SVG.js';
import {} from "./lib/pako.min.js";
import {mult} from './ExportUtils.js';
import {hasElements} from './Utils.js';
import {analyze} from './AnimUMLStaticAnalysis.js';
import fetch from "node-fetch";
import * as fs from "fs";

import {loadModel} from "./CLILoadModel.js";
//import {saveDiagram, params as defaultParams} from "./au2puUtils.js";
import {toExplicit} from "./TransformStateMachine2Explicit.js";

const fetching = !false;
const exportStaticSVG = true;
// setting this to true makes make believe files have not been properly generated
const onlySaveIfChanged = false;


	// General settings
	export const defaultParams = {
		raw: true,
		forAnimation: false,
		editing: false,
		hideLinks: false,
//		styleMode: "dark",
/*
		colors: {
			noEventColor: "",
			falseGuardColor: "",
			currentStateColor: "",
			fireableTransitionColor: "",
		}
*/
//		displayedObjects: [],
//		callPrefix: "",

		// State machine diagram settings
		showExplicitSM: false,
		hideOuterSMBoxes: !true,

		// Class/Object diagram settings
		showPorts: false,
		hideClasses: false,
		hideMethods: false,
		hideStateMachines: false,
		showEndNames: false,
		hideOperations: false,

		// Semantics settings... TODO: should not be necessary
		checkEvents: false,
	};

	const dummyEngine = {
		getSlots: () => [],
		isFireable: () => !false,
		isActivable: () => !false,
		getFireURI: () => "",
		isCurrent: () => !false,
		eventMatched: () => !false,
	};
	async function saveFile(file, pu) {
		const puri = toPlantUMLURI("http://127.0.0.1:8082/plantuml/", pu)
		console.log(puri);
		if(fetching) {
			const resp = await fetch(puri);
			// apparently the reply code is always 200, even when there is an error
			const svg = await resp.text();
			if(svg.match(/>An error has occured/)) {
				console.error("PlantUML error");
			}
			const current = onlySaveIfChanged && fs.existsSync(file) ? fs.readFileSync(file).toString() : undefined;
			if(current !== svg) {
				fs.writeFileSync(file, svg);
				console.log("Saved to", file)
			} else {
				console.log("Unchanged", file)
			}
		} else {
			console.log("Not fetching SVG from PlantUML, as per config");
		}
	}
	export async function savePU(file, pu, params) {
		if(params.rawPlantUML) {
			file = `${file}.puml`;
			const current = onlySaveIfChanged && fs.existsSync(file) ? fs.readFileSync(file).toString() : undefined;
			const contents = `@startuml\n${pu}\n@enduml`;
			if(current !== contents) {
				fs.writeFileSync(file, contents);
				console.log("Saved to", file)
			} else {
				console.log("Unchanged", file)
			}
		} else {
			await saveFile(`${file}.svg`, pu);
		}
	}
	export async function saveDiagram(file, model, params) {
		const pu = allObjectsToPlantUML(model, dummyEngine, params);

		await savePU(file, pu, params);
		//const pu2 = allObjectsToPlantUML(model, dummyEngine, {...params, raw: false, forAnimation: false});
		//await saveFile(`${file}-forAnimation.svg`, pu2);

		//new AnimUMLEngine(model);
	}

//import {AnimUMLEngine} from "./AnimUMLEngine.js";

export async function main(argv) {
	const model = await loadModel(argv[2], argv[3] || "model");

	console.log("Model static analysis results:");
	analyze(model);

	let i = 0;

	const baseFileName = argv[4] || "testDiagram";
	const fileName = baseFileName;


	const params = Object.fromEntries(argv.slice(5).map(a =>
		a.split("=")
	).map(([pn, pv]) =>
		[pn,
			pv === "true"
			?	true
			:pv === "false"
			?	false
			:	pv.split(",").filter(e => e)
		]
	));

	params.rejectedObjects ??= [];

	if(params.listActive) {
		console.log("ACTIVE_OBJECTS:");
		for(const o of model.objects.filter(o => model.isActive(o))) {
			console.log(o.name);
		}
		console.log("END");
	}
	if(params.listInteractions) {
		console.log("INTERACTIONS:");
		for(const o of Object.keys(model.interactions ?? {})) {
			console.log(o);
		}
		console.log("END");
	}
	if(params.listClasses) {
		console.log("CLASSES:");
		for(const [clName, cl] of Object.entries(model.classes ?? {})) {
			if(!cl.literals && !cl.ends) {
				console.log(clName);
			}
		}
		console.log("END");
	}
	if(params.listEnumerations) {
		console.log("ENUMERATIONS:");
		for(const [clName, cl] of Object.entries(model.classes ?? {})) {
			if(cl.literals) {
				console.log(clName);
			}
		}
		console.log("END");
	}
	if(params.listActive || params.listInteractions) {
		return;
	}


	const commentSettings = {
		operationCommentLocation: false,
		propertyCommentLocation: false,
	};
	await saveDiagram(fileName, model, {...defaultParams, ...params});
	await saveDiagram(`${fileName}-context`, model, {...defaultParams, ...params, hideStateMachines: true,
		displayedObjects: model.objects.filter(o =>
			!params.rejectedObjects.includes(o.name)
		),
		hideMethods: true,
		...commentSettings,
	});
	await saveDiagram(`${fileName}-class`, model, {...defaultParams, ...params, hideStateMachines: true, classDiagram: true, ...commentSettings});
	await saveDiagram(`${fileName}-classes`, model, {...defaultParams, ...params, hideStateMachines: true, classDiagram: true, showDataTypes: false, ...commentSettings});
	await saveDiagram(`${fileName}-datatypes`, model, {...defaultParams, ...params, hideStateMachines: true, classDiagram: true, showNonDataTypes: false, ...commentSettings});

	if(model.classes) {
		fs.writeFileSync(`${fileName}-macros.tex`, texMacros(model));

		for(const [clName, cl] of Object.entries(model.classes)) {
			if(!cl.literals && !cl.ends) {	// neither enumeration nor association => class
				await saveDiagram(`${fileName}-class-${clName}`, model, {
					...defaultParams,
					...params,
					hideStateMachines: true,
					classDiagram: true,
					showDataTypes: false,
					displayedClasses: [cl],
					...commentSettings,
				});
			}
		}
	}

	for(const opRef of params.genActivitiesFor ?? []) {
		const [type, ownerName, opName] = opRef.split(".");
		const owner = type === "class" ? model.classes[ownerName] : model.getObject(ownerName);
		const op = owner?.operationByName?.[opName];
		if(op) {
			const pu = `
				group ${opSig(op)}
				${operationToPlantUMLActivity(op)}
				end group
			`;
			await savePU(`${fileName}-activity-${opRef}`, pu, params);
		} else {
			console.log(`Error: operation ${opRef} not found.`);
		}
	}

	async function activeObjects(infix = "") {
		for(const object of model.objects.filter(obj => model.isActive(obj))) {
			console.log("Processing", object.name);
			const fileName = `${baseFileName}${infix}-${object.name}`;
			await saveDiagram(fileName, model, {displayedObjects: [object], ...defaultParams, ...params});
			await saveDiagram(`${fileName}-SM`, model, {
				...defaultParams,
				displayedObjects: [object],
				hideClasses: true,
				...params,
				hideOuterSMBoxes: true,
			});

			for(const substate of params.foldedStateFQNs?.filter(e => e.startsWith(object.name + ".")) || []) {
				await saveDiagram(`${fileName}-${substate}-SM`, model, {
					...defaultParams,
					displayedObjects: [object],
					hideClasses: true,
					...params,
					//foldedStateFQNs: params.foldedStateFQNs,
					onlyStateFQN: substate,
					hideOuterSMBoxes: false,
				});
			}
		}
	}

	await activeObjects();

/*
	try {
		model.objects = model.objects.map(o => model.isActive(o) ?
			toExplicit(o, model)
		:	o
		);
		await activeObjects("-Explicit");
	} catch {
	}
*/

	Object.entries(model.interactions || {}).forEach(([interName, inter], index) => {
		if(!inter.isDummy) {
console.log("Processing", interName);
console.group();
//console.log(JSON.stringify(inter, null, 2));
			exportSVG(inter, model, `${fileName}-sequence-${interName.replace(/ /g, "_")}.svg`);
console.groupEnd();
		}
	});
}

function saveSVG(file, data) {
	const current = onlySaveIfChanged && fs.existsSync(file) ? fs.readFileSync(file).toString() : undefined;
	if(current !== data) {
		fs.writeFileSync(file, data, "utf8", (err) => {
			if(err) {
				console.log(err);
			}
		});
		console.log("Saved to", file);
	} else {
		console.log("Unchanged", file)
	}
}

function exportSVG(inter, model, file) {
	saveSVG(
		file,
		exportInteraction2SVG(inter, model, exportStaticSVG, {
			// for rsvg
			inlineStyles: true,
			removeDominantBaseline: true,
		})
	);
}

import {indent} from "./TemplateUtils.js";

function texMacros(model) {
	const ret = [];
	ret.push("\\makeatletter");

	for(const [clName, cl] of Object.entries(model.classes)) {
		if(cl.literals) {	// enumeration
			ret.push(indent`
				\\@namedef{enum${clName}LiteralList\\macroSuffix}{${
					cl.literals.map(literal => literal.name).join(", ")
				}}
			`);
			ret.push(indent`
				\\@namedef{enum${clName}LiteralDescriptions\\macroSuffix}{
					\\begin{itemize}
						${cl.literals.map(literal => indent`
							\\item	{\\bf ${literal.name}}
								${literal.comments ? ` --- ${literal.comments.join("\n")}` : ""}
						`)}
					\\end{itemize}
				}
			`);
		} else if(!cl.ends) {	// not association => class
			const props = Object.entries(cl.propertyByName || {});
			ret.push(indent`
				\\@namedef{class${clName}Properties\\macroSuffix}{
					${props.length ? indent`
						\\begin{itemize}
							${props.map(([propName, prop]) => indent`
								\\item	{\\bf ${propName}${prop.type ? ` : ${prop.type}${mult(prop)}` : ""}}
									${prop.comments ? ` --- ${prop.comments.join("\n")}` : ""}
							`).join("\n")}
						\\end{itemize}
					`:indent`
						\\begin{quote}
							N.A.
						\\end{quote}`
					}
				}
			`);
			const ops = Object.entries(cl.operationByName || {});
			ret.push(indent`
				\\@namedef{class${clName}Operations\\macroSuffix}{
					${ops.length ? indent`
						\\begin{itemize}
							${ops.map(([opName, op]) => indent`
								\\item	{\\bf ${opSig(op)}}
								${op.comments ? ` --- ${op.comments.join("\n")}` : ""}
							`).join("\n")}
						\\end{itemize}
					`:indent`
						\\begin{quote}
							N.A.
						\\end{quote}`
					}
				}
			`);
		}
	}

	ret.push("\\makeatother");

	return ret.join("\n").replace(/_/g, "\\_");
}

function opSig(op) {
	const ret = `${op.name}(${(op.parameters || []).map(param =>
		typeof param === "string" ? param : `${param.name ?? ""}${param.type ? ` : ${param.type}${mult(param)}` : ""}`
	).join(", ")})${op.returnType ? ` : ${op.returnType}${mult(op)}` : ""}${
		hasElements(op.stereotypes)
		?	" " + op.stereotypes.map(s => `<<${s}>>`).join("")
		:	""
	}`;
	if(op.isStatic) {
		return `\\underline{${ret}}`;
	} else {
		return ret;
	}
}
