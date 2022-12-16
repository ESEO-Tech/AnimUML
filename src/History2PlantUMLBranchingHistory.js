import {hasElements, last} from './Utils.js';

// IDEA: it could be interesting to store the next configuration in all steps and add an explicit initial step with the reset configuration
// TODO: avoid moving branches around when switching branch
// TODO: add support for backTo(someAltConfig)
// TODO: escape object names
// TODO: have the following PlantUML bug fixed: a too large after label will not be displayed in SVG if it would have negative coordinates (but works in PNG)
export function toPlantUMLBranchingHistory(sysHistory, model, {
	colors,
	raw = false,
	showTransitions = false,
	hideStates = false,
	hideSets = false,
	showPseudostateInvariants = false,
	styleMode
} = {}) {
	const current = last(sysHistory);
	const dir = "up";
	const enforceOrderDir = "left";
	function serAlts(alts, prevId, base = 0, path = [0]) {
		if(hasElements(alts)) {
			const ret = alts.map((alt, index) =>
				ser(alt, `${prevId}.alt${index}.`, prevId + "choice", base, [...path, index])
			);
			return `
				state ${prevId}choice <<choice>>
				${prevId} -${dir}-> ${prevId}choice
				${ret.join("\n")}
			`;
		} else {
			return "";
		}
	}
	function link(link, text, tooltip) {
		if(raw) {
			return text;
		} else {
			return `[[${link}{${tooltip?.replace(/\n/g, "\\n").replace(/"/g, "'")}} ${text}]]`;
		}
	}
	function enforceOrder(alts, mainIdx, hasMore, prevId, nextId) {
		if(hasElements(alts)) {
			const order = alts.filter(alt => hasElements(alt)).map((alt, index) => `${prevId}.alt${index}.Config1`);
			if(hasMore) {
				order.splice(mainIdx, 0, nextId);
			}
			let prev;
			let ret = "";
			for(const o of order) {
				if(prev) {
					ret += `\n${prev} -${enforceOrderDir}[hidden]-> ${o}\n`;
				}
				prev = o;
			}
			return ret;
		} else {
			return "";
		}
	}
	function ser(steps, prefix = "", prevId, base = 0, parentPath = []) {
		return steps.map((step, index) => {
			const configId = `${prefix}Config${index + 1}`;
			if(step.cause.startsWith("PlantUML")) {
				const ret = `
					state "Config${index + 1 + base}" as ${configId}
					${configId} : ${step.cause}: ${step.PlantUML}
					${prevId} -${dir}-> ${configId}
				`;
				prevId = configId;
				return ret;
			}
			const path = [...parentPath, index + 1];
			const configString =(() => {
				try {
					return JSON.stringify(engine.treeifyConfig(step.configurationAfter), null, 2);
				} catch(e) {
					console.log(e);
					return "configuration cannot be serialized.";
				}
			})();
			const config = `
				state "${link(
					`javascript:backTo('${path}')`,
					`Config${index + 1 + base}`,
					"Full configuration: " + configString,
				)}" as ${configId} ${
					step == current ? `#${colors.currentStateColor}` : ""
				}
				${Object.entries(step.watchExpressions || {}).map(([name, value]) => `
					${configId} : ${name} = ${value == true ? `<b><color:green>true</color></b>` : value == false ? `<b><color:red>false</color></b>` : value}
				`).join("\n")}
			`;
			let ret;
			if(showTransitions) {
				const transId = `${prefix}Transition${index + 1}`;
				const obj = step.activeObject;
				let objs = step.activeObjects || [obj];
				const currentState = (config) => {
					if(config && !hideStates) {
						return objs.map(obj => {
							const state = config.currentState[obj.name];
							if(!last(state).kind || showPseudostateInvariants) {
								return `hnote over ${obj.name} : ${model.fullStateDisplay(state)}`;
							}
						}).join("\n/ ");
					}
					return "";
				};
				ret = `
					${config}
					note as ${transId}
					{{
'scale 0.5
						hide footbox
						skinparam noteBorderColor #A80036
						skinparam noteBackgroundColor #FBFB77

						mainframe ${step.cause.replace(/^transition:/, '')}
						${objs.map(obj =>
							`participant ${obj.name} #${colors.currentStateColor}`
						).join("\n")}

						${currentState(step.configuration)}
						${step.messages.filter(msg =>
							msg.type !== "set" || !hideSets
						).map(msg => {
							if(msg.signature.match(/^after\(/)) {
								return `... ${msg.signature}...`;
							} else {
								return `
									${msg.source}->${msg.target} : ${msg.signature}
									${msg.returnedValue ? `
										activate ${msg.target}
										return ${JSON.stringify(msg.returnedValue)}
									` : ""}
								`;
							}
						}).join("\n")}
						${currentState(step.configurationAfter) || ""}
					}}
					end note
					${transId} -${dir}-> ${configId}
					${prevId} -${dir}-> ${transId}
				`;
			} else {
				ret = `
					${config}
					${prevId} -${dir}-> ${configId}
				`;
			}
			prevId = configId;

			ret += enforceOrder(step.alts, step.mainIdx, steps.length > index + 1, prevId, `${prefix}Config${index + 2}`);

			ret += serAlts(step.alts, prevId, base + index + 1, [...parentPath, index + 1]);
			if(hasElements(step.alts)) {
				prevId += "choice";
			}
			return ret;
		}).join("\n");
	}
	return `
		skinparam ranksep 20
		skinparam noteBorderColor transparent
		skinparam noteBackgroundColor transparent
		skinparam shadowing false
		${styleMode === "dark" ? "skinparam monochrome reverse" : ""}
		hide empty description

		state "${link("javascript:backTo(0)", "Config0")}" as Config0 ${current ? "" : `#${colors.currentStateColor}`}
		${enforceOrder(sysHistory.alts, sysHistory.mainIdx, sysHistory.length > 0, "Config0", "Config1")}
		${serAlts(sysHistory.alts, "Config0", 0, [0])}
		${ser(sysHistory, "", "Config0" + (hasElements(sysHistory.alts) ? "choice" : ""))}
	`;
}
