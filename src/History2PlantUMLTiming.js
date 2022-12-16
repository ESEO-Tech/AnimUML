import {escapeId} from "./ExportUtils.js";
import {last} from "./Utils.js";
// Serialize history into a PlantUML timing diagram
export function toPlantUMLTiming(hist, raw, model, {callPrefix, stateOfIn, hideSets, styleMode, participants, scale}) {
	function wrapState(name, index) {
		if(raw) {
			return name;
		} else {
			return `${name} : [[javascript:${callPrefix}backTo(${index}) goto]]`;
		}
	}
	function wrapParticipant(objectName) {
		var ret = objectName;
		if(!raw) {
			ret = `[[javascript:${callPrefix}switchToObject('${objectName}') ${objectName}]]`;
		}
		return ret;
	}
	function escId(id) {
		if(id == ']') {
			return '_LOST_';
		} else if(id == '[') {
			return '_FOUND_';
		} else {
			return escapeId(id);
		}
	}
	function stateChanged(object, newState) {
		return model.fullStateDisplay(previousState[object.name]) !== model.fullStateDisplay(newState);
	}
	function sig(msg) {
		return msg.displaySignature ?? msg.signature;
	}

	const STEP = 1;
	var time = 0;
	var previousState = {};
	let parts = participants ?? model.objects;
//console.log(participants, parts)
	// hide time-axis does not seem to work on animuml.kher.nl, but does work on plantuml.com/plantuml
/*
'			@${time}
'				${escapeId(object.name)} is ${fullStateDisplay([getInitial(object)])}
*/
	return `
		${styleMode === "dark" ? "skinparam monochrome reverse" : ""}
		'hide time-axis
		${scale ?
			`scale 1 as ${scale} pixels`
		:""}
		robust "Unknown source" as _FOUND_
		${parts.map(object =>
			`concise ":${wrapParticipant(object.name)}" as ${escapeId(object.name)}
			${model.isActive(object) ? '' : `
				@0
				${escapeId(object.name)} is {-}
			`}
		`).join('')}
		robust "Unknown target" as _LOST_
		${raw ? '' : `concise "History" as _HISTORY_`}
		@0
		        _LOST_ is  "                            "
		        _FOUND_ is "                            "
		${hist.map((step, index) => {
			var ret =`
				@${time}
				${raw ? '' : `_HISTORY_ is ${wrapState(index, index)}`}
				${parts.filter(object => model.isActive(object) && ((step.configuration && stateChanged(object, stateOfIn(object, step))) || object == step.activeObject)).map(object => {
						// if we want to change state for external transition, we would need to alter the condition in filter above:
						// || object == step.activeObject && "external"
					previousState[object.name] = stateOfIn(object, step);
					//  is ${wrapState(fullStateDisplay(stateOfIn(object, step)), index)}
					if(showPseudostateInvariants.checked || (step.configuration && !last(stateOfIn(object, step)).kind)) {
						return `${escapeId(object.name)} is ${model.fullStateDisplay(stateOfIn(object, step))}
`
					} else {
						return "";
					}
				;}).join('')}
			`;
			time += STEP;
			step.logicalTime = time;	// TODO: avoid modifying the source
			ret += `
				@${time}
				${(step.messages || []).filter(msg => (!hideSets) || msg.type !== 'set').filter(msg => {
					if(!msg.receivedAt) {
						return true;
					} else {
						return msg.receivedAt.logicalTime && msg.receivedAt.logicalTime == time;
					}
				}).map(msg => sig(msg).match(/^after\(/) ?
					`
						${escapeId(step.activeObject.name)}@${time - STEP} <-> @${time} : ${sig(msg)}
						@${time}`
				:
					`
						${escId(msg.source)}@${msg.sentAt ? msg.sentAt.logicalTime : time}->${escId(msg.target)} : ${sig(msg)}${msg.receivedAt ? "" : " ?"}`
				).join('')}
			`;
			return ret;
		}).join('')}
		@${time}
		${parts.filter(object => model.isActive(object) && stateChanged(object, builtInEngine.configuration.currentState[object.name])).map(object =>
			`${escapeId(object.name)} is ${model.fullStateDisplay(builtInEngine.configuration.currentState[object.name])}
		`).join('')}
		${raw ? '' : `_HISTORY_ is {hidden}`}
	`;
}

