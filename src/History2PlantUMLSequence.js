import {getSelected, indentEsc, last} from './Utils.js';
import {linkStyle} from './PlantUMLUtils.js';
import {escapeId} from './ExportUtils.js';


// Serialize history into a PlantUML sequence diagram, with support for rollback annotations
// Set raw to true in order to serialize plain PlantUML without annotation
export function toPlantUMLSeq(hist, model, engine, {stateOfIn, ALL_OBJECTS, configuration, callPrefix, participants, raw, colors, hideStates, hideSets, hideLinks, styleMode, showPseudostateInvariants, hideStateMachines}) {
	function wrapState(name, index) {
		if(raw) {
			return name;
		} else {
			return `[[javascript:${callPrefix}backTo(${index}) ${name}]]`;
		}
	}
	function wrapParticipant(objectName) {
		var ret = objectName;
		if(!raw) {
			ret = `[[javascript:${callPrefix}switchToObject('${objectName}') ${objectName}]]`;
		}
		return ret;
	}
	function source(step, msg) {
		if(msg.sentAt !== step && msg.sentAt && msg.receivedAt !== msg.sentAt) {
			return msg.source === '[' ? '' : 'Ether';
		} else {
			return escapeId(msg.source);
		}
	}
	function target(step, msg) {
		//if(msg.receivedAt !== step && msg.receivedAt && msg.receivedAt !== msg.sentAt) {
		if(msg.receivedAt !== step && msg.receivedAt !== msg.sentAt) {
			return 'Ether';
		} else {
			return escapeId(msg.target);
		}
	}
	function transLabel(trans) {
		var ret = `${trans.source.name} -> ${trans.target.name}`;
		if(trans.trigger || trans.guard || trans.effect) {
			ret += ` : ${indentEsc(trans.trigger) || ''}${trans.ports ? ` from ${trans.ports.join(", ")}${trans.guard ? " " : ""}` : ""}${trans.guard ? `[${indentEsc(trans.guard)}]` : ''}${trans.effect ? `/${indentEsc(trans.effect)}` : ''}`;
		}
		return ret;
	}
	// to support the new (optional) step.activeObjects property introduced by AnimUMLSynchronousCommunicationEngine
	function activeObjects(step) {
		return step.activeObjects || [step.activeObject];
	}
	// if activeIn===step, then hnote shown just before changing to other state
	// if activeIn=== previous step, then hnote shown just after reaching state
	//	TODO: fix showing initial pseudostates in that case
	function stateInvariants(step, index, activeIn) {
		const prev = hist[index-1];
		return hideStates ? "" : model.objects.filter(object => 
						//states(stateOfIn(object, step)) != prevState[object.name]
						//index === 0 ||
						model.isActive(object) &&
						activeObjects(activeIn).some(obj => obj === object) &&
						(showPseudostateInvariants || !last(stateOfIn(object, step)).kind) &&
						(showUnchangedStateInvariants || !prev || model.fullStateDisplay(stateOfIn(object, step)) !== prevState[object.name])
					).map(object => {
			const st = model.fullStateDisplay(stateOfIn(object, step));
			prevState[object.name] = st;
			return `hnote over ${escapeId(object.name)} : ${wrapState(st, index)}
		`}).join('/');
	}
	function sig(msg) {
		return msg.displaySignature ?? msg.signature;
	}
	var parts = participants || model.objects.filter(o => !model.isPort(o)).filter(o => !o.isObserver);
	const prevState = {};
	const showUnchangedStateInvariants = !raw;	// for the time being, state invariants are hyperlinks to go back in time
	return `
		${styleMode === "dark" ? "skinparam monochrome reverse" : ""}
		${linkStyle(hideLinks)}
		${parts.map(object => `
			${object.isActor ? 'actor' : 'participant'} "${wrapParticipant(object.name)} : ${object.class ? object.class : ""}" as ${escapeId(object.name)}`
		).join('')}
		${model.objects.length > 1 ? 'participant Ether' : ''}
		${hist.map((step, index) =>
		step.PlantUML ? `
			${step.PlantUML}
		`:`
			${stateInvariants(step, index, hist[index-1] || step)}
			${step.messages.filter(msg => (!hideSets) || msg.type !== 'set').map(msg => sig(msg).match(/^after\(/) ?
				`
					... ${sig(msg)}...`
			:
				`
					${source(step, msg)}${msg.source === '[' ? 'o' : ''}->${msg.ignored ? `o ` : ''}${target(step, msg)} : ${sig(msg)}
					${msg.returnedValue ? `
						activate ${target(step, msg)}
						return ${JSON.stringify(msg.returnedValue)}
					` : ""}
				`
			).join('')}`
		).join('')}
		${true || hideStates ? "" :  parts.filter(object => model.isActive(object) && (showPseudostateInvariants || !last(configuration.currentState[object.name]).kind)).map(object =>
			`hnote over ${escapeId(object.name)} : ${model.fullStateDisplay(configuration.currentState[object.name])}
		`).join('/')}
		${!raw && (true || hideStateMachines || !(getSelected(objectSelect) == ALL_OBJECTS)) ?
// TODO: also add receivable operations on all objects (active or not)
		parts.filter(obj => model.isActive(obj)).map(object =>
			`note over ${escapeId(object.name)}
				Fireable triggers:
				${engine.getFireable(object).map(trans => 
//					`*${stateFullName(trans.source)}->${stateFullName(trans.target)}
					// TODO: getTransURI?
					`*[[javascript:${callPrefix}fire('${model.transFullName(trans)}'){${transLabel(trans)}} ${
						trans.trigger ?
							trans.trigger
						:trans.guard ?
							`[${trans.guard}]`
						:trans.effect && trans.effect.length < 15 ?
							`/${trans.effect}`
						:
							'// fire'	// TODO: `${trans.source}->${trans.target}`? => already as tooltip now
					}]]
				`).join('')}Other triggers:
				${
				engine.getFireable(object, engine.isActivable).filter(t => !engine.eventMatched(t)).map(trans => 
					`*<color:${colors.noEventColor}><s>${trans.trigger ? trans.trigger : (trans.guard ? `[${trans.guard}]` : '// fire')}</s></color>
				`).join('') +
				engine.getFireable(object, engine.isActivable).filter(engine.eventMatched).filter(e => !engine.isFireable(e)).map(trans => 
					`*<color:${colors.noEventColor}><s>${trans.trigger ? trans.trigger : (trans.guard ? `[${trans.guard}]` : '// fire')}</s></color>
				`).join('')
				}
			 end note
		`).join('/') +
		parts.filter(e => e.isActor && !model.isActive(e)).map(object =>
			`/note over ${escapeId(object.name)}
				Callable operations:
				${model.connectors.filter(c => c.ends.some(e => e == object)).map(c =>
					c.possibleMessages?.forward.map(e =>
						((tgtName) =>
// TODO: encodeURIComponent (as in allObjectsToPlantUML.wrapOperation)
						`* [[javascript:${callPrefix}callOperation('${esc(tgtName)}.${esc(e)}','${object.name}') ${tgtName}.${e}]]`
						)(c.ends.find(e => e != object).name)
					).join(`
				`)
				).join(`
				`)}
			end note
		`).join('')
		: ''}
	`;
}

function esc(s) {
	return s.replace(/ /g, "%20");
}
