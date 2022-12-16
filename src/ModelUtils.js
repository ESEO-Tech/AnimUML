import {groupBy} from './Utils.js';
import {msgSigRegex} from './AnimUMLEngine.js';

export function getEventName(trigger) {
	return trigger ? trigger.replace(msgSigRegex, "$1") : trigger;
}

export function getEventArgs(trigger) {
	return trigger.match(msgSigRegex)?.[2].split(",").filter(e => e);
}

// TODO: recursively traverse the model? or require a call to toExplicit before?
export function getTriggerContexts(object) {
	const transitions = [
		...object.transitions,
		// TODO: shouldn't internal transitions already be in object.transitions? maybe not after toExplicit? anyway, because of the call to unique, this should not be too big a problem
		...object.states.flatMap(s => Object.values(s.internalTransitions ?? {}))
	];
/*
	const ret = unique(transitions.filter(trans =>
		trans.trigger
	)?.map(trans =>
		getEventName(trans.trigger)
	));
*/
	const ret = groupBy(
		transitions.filter(trans =>
			trans.trigger
		),
		trans => getEventName(trans.trigger)
	);
	return ret;
}

export function getTriggers(object) {
	return Object.keys(getTriggerContexts(object));
}

export function allVertices(region) {
	return (region.states ?? []).flatMap(e =>
		[e, ...allVertices(e)]
	);
}

export function allStates(region) {
	return allVertices(region).filter(e => !e.kind);
}

export function allTransitions(region) {
	return [...region.transitions ?? [], ...allStates(region).flatMap(e => e.transitions)];
}


export function getClassOperations(c) {
	function get(c) {
		return [
			...Object.entries(c?.operationByName ?? {}),
			...c?.supertypes?.flatMap(get) ?? [],
			...c?.interfaces?.flatMap(get) ?? [],
		].filter(([opName, op]) => !op.isStatic);
	}
	return c && Object.fromEntries(get(c));
}

export function getClassProperties(c) {
	function get(c) {
		return [
			...Object.entries(c?.propertyByName ?? {}),
			...c?.supertypes?.flatMap(get) ?? [],
			...c?.interfaces?.flatMap(get) ?? [],
		].filter(([propName, prop]) => !prop.isStatic);
	}
	return c && Object.fromEntries(get(c));
}
