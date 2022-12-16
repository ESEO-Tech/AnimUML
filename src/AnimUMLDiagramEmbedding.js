import {Model} from './Model.js';
import {exportModel} from './Export2AnimUML.js';
import {preprocess} from './Preprocessor.js';
import * as diags from './AnimUMLTree.js';
import {translateToPlantUMLSyntax} from '../TranslateToPlantUMLSyntax.js';

// For use from an HTML page

export async function process(loadElement) {
	let model = JSON.parse(await loadElement("#model"));
	await preprocess(model, loadElement);
	model = new Model(model);
	globalThis.currentModel = model;
	for(const elem of document.getElementsByClassName("AnimUML")) {
		function filter(attrName) {
			const prefix = `AnimUML.${attrName}.`;
			return Array.prototype.filter.call(elem.classList, c =>
				c.startsWith(prefix)
			).map(c =>
				c.replace(prefix, "")
			);
		}
		function get(attrName) {
			return filter(attrName)[0];
		}
		function getObject(objName) {
			return model.objects.find(obj => obj.name == objName);
		}
		function getClass(className) {
			return model.classes[className];
		}
		function setParam(paramName, processValue, defaultValue) {
			let value = get(paramName) ?? defaultValue;
			if(value != undefined) {
				if(processValue) {
					value = processValue(value);
				}
				(diag.params ??= {})[paramName] = value;
			}
		}
		const type = get("type");
		let diag;
		switch(String(type)) {
		case "class":
			diag = new diags.ClassDiagram({model});
			for(const className of filter("displayedClasses")) {
				//const className = cl.replace(/^AnimUML\.displayedClasses\./, "");
				(diag.params.displayedClasses ??= []).push(
					getClass(className)
				);
			}
			setParam("showProperties", v => v === "true");
			setParam("showDataTypes", v => v === "true");
			setParam("showNonDataTypes", v => v === "true");
			diag.params.propertyCommentLocation = false;
			diag.params.operationCommentLocation = false;
			break;
		case "object":
			diag = new diags.ObjectDiagram({model});
			for(const objName of filter("displayedObjects")) {
				//const objName = cl.replace(/^AnimUML\.displayedObjects\./, "");
				(diag.params.displayedObjects ??= []).push(
					getObject(objName)
				);
			}
			setParam("hideStateMachines", v => v === "true");
			setParam("hideMethods", v => v === "true");
			setParam("propertyCommentLocation", v => {
				if(v === "false") {
					return false;
				} else {
					return v;
				}
			}, false);
			setParam("operationCommentLocation", v => {
				if(v === "false") {
					return false;
				} else {
					return v;
				}
			}, false);
			//diag.params.propertyCommentLocation = false;
			//diag.params.operationCommentLocation = false;
			break;
		case "state":
			const objName = get("object");
			const obj = getObject(objName);
			diag = new diags.StateDiagram({model}, obj);
			setParam("hideClasses", v => v === "true");
			break;
		case "interaction":
			const inter = decodeURIComponent(get("interaction"));
			diag = new diags.InteractionDiagram({model}, model.interactions[inter]);
			break;
		case "open":
			elem.href = animUMLServer + "/AnimUML.html#" + encodeURIComponent(JSON.stringify({
				...exportModel(translateToPlantUMLSyntax(model)),
				settings: model.settings,
			}));
			break;
		case "literals":{
			const cl = getClass(get("enum"));
			if(get("simple") === "true") {
				elem.innerHTML = cl.literals.map(literal => literal.name).join(", ");
			} else {
				elem.innerHTML = `
					<ul>
						${cl.literals.map(literal => `
							<li>${literal.name}${literal.comments ? ` &mdash; ${literal.comments.join("\n")}` : ""}</li>
						`).join("\n")}
					</ul>
				`;
			}
			}break;
		case "properties":{
			const cl = getClass(get("class"));
			elem.innerHTML = `
				<ul>
					${Object.entries(cl.propertyByName || {}).map(([propName, prop]) => `
						<li>${propName}${prop.type ? ` : ${prop.type}` : ""}${prop.comments ? ` &mdash; ${prop.comments.join("\n")}` : ""}</li>
					`).join("\n")}
				</ul>
			`;
			}break;
		case "operations":{
			const cl = getClass(get("class"));
			// TODO: finish operation serialization & put it in a reusable function
			elem.innerHTML = `
				<ul>
					${Object.entries(cl.operationByName || {}).map(([opName, op]) => `
						<li>${opName}(${(op.parameters || []).map(param => param.name).join(", ")})${op.returnType ? ` : ${op.returnType}` : ""}${op.comments ? ` &mdash; ${op.comments.join("\n")}` : ""}</li>
					`).join("\n")}
				</ul>
			`;
			}break;
		case "activity": {
			const [ownerType, ownerName, opName] = get("operation").split(".");
			const op =	(	ownerType === "object"
					?	model.getObject(ownerName)
					:	model.classes[ownerName]
					).operationByName[opName];
			//console.log(ownerType, ownerName, opName, op);
			diag = new diags.ActivityDiagram({model}, op);
			}break;
		default:
			// TODO: error?
			console.error("Unknown diagram type", type);
			break;
		}
		if(diag) {
//console.log(diag.params)
			if(diag.getURL) {
				switch(String(elem.tagName)) {
				case "IMG":
					elem.src = diag.getURL(animUMLServer);
					break;
				case "OBJECT":
					elem.data = diag.getURL(animUMLServer);
					break;
				default:
					// TODO: error?
					console.error("Unsupported element type", elem);
					break;
				}
			} else {
				elem.innerHTML = diag.getData(animUMLServer);
			}
		}
	}
}
