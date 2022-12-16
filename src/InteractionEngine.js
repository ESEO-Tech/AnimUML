import {interactionLifelines} from './InteractionUtils.js';
import {unique} from './Utils.js';

const debug = !false;

/*
	class Interaction {
		name : String
		events : Event[]
	}

	abstract class Event {

	}

	class CallEvent extends Event {
		call : String	// operation name
		arguments : []
		from : String	// object name
		to : String?	// object name, or undefined for "lost" messages
	}

	class AcceptEvent extends Event {
		accept :  String	// operation name for "found" messages
			 |Number	// CallEvent index
		to : String?		// object name for "found" messages
	}

	class StateInvariant extends Event {
		object : String		// object name
		state : String		// state fullname (without object name)
	}

*/


// TODO: decide whether to keep (and properly indent) or drop each logging statement

// Allowing stuttering on anything but a currently possible interaction step would make it possible for the system to continue forever on an incompatible path
//	=> we forbid all messages recognized by the whole interaction while stuttering, not just the next ones

// The observed UML engine must:
//	- have "small" steps (i.e., one step per interaction action, such as : call, accept)
//	- have fireInitialTransitions set to false
export class InteractionEngine {
	constructor(interaction, settings) {
		let configuration;
		const lifelines = interactionLifelines(interaction);

		function getTo(events, acceptEvent) {
			return typeof acceptEvent.accept === "string" ? acceptEvent.to : events[acceptEvent.accept].to;
		}
		function getCall(events, acceptEvent) {
			return typeof acceptEvent.accept === "string" ? acceptEvent.accept : events[acceptEvent.accept].call;
		}
		function getArguments(events, acceptEvent) {
			return typeof acceptEvent.accept === "string" ? acceptEvent.arguments : events[acceptEvent.accept].arguments;
		}
		function isSimple(evt) {
			return "call" in evt || "accept" in evt || "state" in evt;
		}
		function getObjectName(events, simpleEvent) {
			if("call" in simpleEvent) {
				return simpleEvent.from;
			} else if("accept" in simpleEvent) {
				return getTo(events, simpleEvent);
			} else if("state" in simpleEvent) {
				return simpleEvent.object;
			} else {
				throw `getObjectName cannot process this event of unknown type: ${JSON.stringify(evt)}`;
			}
		}
		// currentStep is an event reference
		function next(objName, currentStep) {
console.debug("next", objName, currentStep);
console.groupCollapsed();
			if(currentStep.length == 0) {
console.groupEnd();
				return currentStep;
			}
			function inext(events, currentStep, path) {
				let ret = [];
console.debug("inext", events, currentStep)
console.groupCollapsed();
				if(currentStep.length > 1) {
console.debug("events[", currentStep[0], "] = ", events[currentStep[0]]);
					const evt = events[currentStep[0]];
					const newPath = [...path, currentStep[0]];
					const id = newPath.join(",");
					const nestedRet = inext(nestedEvents(evt), currentStep.slice(1), newPath);
					if(nestedRet.length > 0) {
console.groupEnd();
						return nestedRet;
					} else if(isLoop(evt)) {
						const loopCounter = configuration.trace[objName][id];
console.log("CAN LOOP AGAIN:", loopCounter + 1, "<", evt.upper)
						if(loopCounter + 1 < evt.upper) {
							ret.push(...inext(nestedEvents(evt), [-1], newPath).map(e => ({eventRef: [currentStep[0], ...e.eventRef], actions: [{increment: id}, ...e.actions]})));
						}
						if(loopCounter + 1 < evt.lower) {
							return ret;
						}
console.log("LOOP", ret)
					}
					// else fallthrough to looking for next event in current context
				}
console.debug("typeof", currentStep[0], typeof currentStep[0])
				let nexti = currentStep[0] + 1;
				while(nexti < events.length) {
console.debug(`events[${nexti}] = `, events[nexti])
					const evt = events[nexti];
					if(isSimple(evt)) {
console.debug("objectName", getObjectName(events, evt))
						if(getObjectName(events, evt) === objName) {
							ret.push({eventRef: [nexti], actions: []});
console.groupEnd();
							return ret;
						}
					} else {
						const newPath = [...path, nexti];
						const nestedRet = inext(nestedEvents(evt), [-1], newPath);
						if(nestedRet.length != 0) {
console.log("RET", ret, nestedRet)
							ret.push(...nestedRet.map(e => ({eventRef: [nexti, ...e.eventRef], actions: [{enter: newPath.join(",")}, ...e.actions]})));
console.log("RET", ret)
console.groupEnd();
							return ret;
						}
					}
					nexti++;
				}
console.groupEnd();
				return [];	// not found
			}
			const n = inext(interaction.events, currentStep, []);
console.debug("\t->", n)
console.groupEnd();
			return n;
		}

		// From the STR interface of our formalization
		this.reset = async () => {
			//configuration = Object.fromEntries(lifelines.map(objName => [objName, next(objName, [-1])]));
			configuration = {};
			lifelines.forEach(objName => {configuration[objName] = next(objName, [-1]);});
			configuration.trace = Object.fromEntries(lifelines.map(objName => [objName, {}]));
			if(debug) console.log(`Reset config: ${JSON.stringify(configuration)}`);
		};
		// The configuration is an object with one field per lifeline named after it + a trace.
		// The value of each lifeine field is an array of the possible next steps for that lifeline (empty when there are no more events on that lifeline) along with actions.
		// Each possible next step is an event reference (i.e., an array of indices).
		// The trace records the number of loop iterations, and the taken alternatives for each lifeline.
		//	So that when later lifelines reach the same steps as earlier lifelines, they can loop as many times, or take the same alternatives.
		//	Recording the number of iterations is also useful for bounded loops.
		// The trace is an object with one field named loopTrace that has one filed per lifeline, and another field named altTrace.
		this.getConfiguration = async () => {
			return JSON.stringify(configuration);
		};
		this.parseConfiguration = async (config) => {
			return config;
		};
		this.setConfiguration = async (config) => {
			configuration = JSON.parse(config);
			if(debug) console.log(`Set config: ${JSON.stringify(configuration)}`);
		};
		// Returns the list of active transitions that are actually fireable only if the corresponding atom evaluates to true
		this.getFireables = async () => {
			if(debug) console.log("getFireables");
console.groupCollapsed();
			const ret = lifelines.flatMap(objName => {
				const ret = configuration[objName];
//				if(debug) console.log(`Next for ${objName} is`, ret);
				return ret.filter(({eventRef}) =>
					eventRef.length > 0
				).filter(({eventRef}) => {
					const evt = getEvent(eventRef);
					if("accept" in evt) {
						// make sure calls are made before being accepted
						if(typeof evt.accept === "number") {
							const sender = getParentEvents(eventRef)[evt.accept].from;
							const senderSteps = configuration[sender];
console.log("sender of", eventRef, evt, ":", sender, senderSteps);
							if(		senderSteps.length > 0	// senderStep.length == 0 means that there are no more events for sender
								&&
									senderSteps.some(({eventRef: senderStep}) => le(senderStep, eventRef))) {	// TODO: take loop iterator into account
console.log("DROPPED");
								return false;
							}
						}
					}
console.log("KEPT");
					return true;
				})
			});
			// FOR STUTTERING
			// TODO: not when we've reached the end of the interaction
			if(!await this.isAccept()) {
				ret.push({eventRef: [], actions: []});
			}
			if(debug) console.log(`Fireables: ${JSON.stringify(ret)}`);
console.groupEnd();
			return ret;
		};
		// where a & b are event references
		function le(a, b) { 
console.log("le", a, b);
console.groupCollapsed();
			for(let i = 0 ; i < a.length && i < b.length ; i++) {
console.log("i = ", i)
				if(a[i] < b[i]) {
console.log("<");
console.groupEnd();
					return true;
				} else if(a[i] > b[i]) {
console.log(">");
console.groupEnd();
					return false;
				}
console.log("==");
			}
console.groupEnd();
			return a.length <= b.length;
		}
		function getParentEvents(eventRef) {
			const parent = getParent(eventRef);
			return nestedEvents(parent);
		}
		function getParent(eventRef) {
			if(eventRef.length == 1) {
				return undefined
			} else {
				return getEvent(eventRef.slice(0, -1));
			}
		}
		function isLoop(evt) {
			return "loopBody" in evt;
		}
		function nestedEvents(compositeEvent) {
			if(compositeEvent == undefined) {
				return interaction.events;
			} else if (isLoop(compositeEvent)) {
				return compositeEvent.loopBody;
			} else if("alternatives" in compositeEvent) {
				return compositeEvent.alternatives;
			} else if("altBody" in compositeEvent) {
				return compositeEvent.altBody;
			} else {
				throw `Event of unsupported type: ${JSON.stringify(compositeEvent)}`;
			}
		}
		function getEvent(eventRef) {
			const ret = eventRef.reduce((acc, i, index) =>
				(index == 0) ?
					acc = interaction.events[i]
				:
					nestedEvents(acc)[i]
			, undefined);
//console.log("getEvent(%o) = ", eventRef, ret);
			return ret;
		}
		// fireable is an event reference
		this.fire = async (fireable) => {
console.debug("fire(%o)", fireable);
			const {eventRef, actions} = fireable;
			// STUTTERING
			if(eventRef.length == 0) {
				// nothing to do, just letting the system progress
				return;
			}
console.groupCollapsed();
			const evt = getEvent(eventRef);
			const parent = getParent(eventRef);
			const parentEvents = nestedEvents(parent);
			const objName = getObjectName(parentEvents, evt);
			if(debug) console.log(`Firing ${JSON.stringify(fireable)}:${JSON.stringify(evt)} for object ${objName}`);

			for(const action of fireable.actions) {
				if("enter" in action ) {
					configuration.trace[objName][action.enter] = 0;
				} else if("increment" in action ) {
					configuration.trace[objName][action.increment]++;
				} else {
					console.error("Unknown action:", action);
				}
			}

			configuration[objName] = next(objName, eventRef);



/*		// TODO: make next(...) return actions (e.g., loop actions) with each eventRef because only next(...) knows if we have, e.g., entered or repeated a loop, but only fire can perform such actions
			if(parent && isLoop(parent)) {
console.log("FIRED IN LOOP");
				if(parentEvents
			}
console.log("LOOP index before looping", configuration.trace[objName][currentStep[0]])
						configuration.trace[objName][currentStep[0]]++;
console.log("LOOP index after looping", configuration.trace[objName][currentStep[0]])
*/

			// TODO: autofire state invariants?
			// should they always be autofired? (otherwise what's the point of having them since they could be reached after a very long time)

console.groupEnd();
			if(debug) console.log(`Reached config: ${JSON.stringify(configuration)}`);
		};

		function getAtom(eventRef, fullSigMatch) {
			// we assume that the transition has just been fired

			const parentEvents = getParentEvents(eventRef);
			const evt = getEvent(eventRef);

			function sigRegExp(call, args) {
				if(fullSigMatch) {
					return `/^${call}\\(${(args || []).map(e => {
						if(e === "*") {
							return ".*";
						} else {
							return e;
						}
					}).join(", ")}\\)$/`;
				} else {
					return `/^${call}\\(/`;
				}
			}
			// TODO: match call & accept arguments (by generating regexes so that we can have wildcards?)
			// TODO: check target of calls & source of accepts, in case there are multiple occurrences of the same signature with different source & target
			if("call" in evt) {
				//return `console.log(MESSAGES(), SENT_MESSAGES()),`
				return `SENT_MESSAGES().some(msg => msg.source === '${evt.from}' && msg.signature.match(${sigRegExp(evt.call, evt.arguments)}))`;
			} else if("accept" in evt) {
				return `RECEIVED_MESSAGES().some(msg => msg.target === '${getTo(parentEvents, evt)}' && msg.signature.match(${sigRegExp(getCall(parentEvents, evt), getArguments(parentEvents, evt))}))`;
			} else if("state" in evt) {
				// check that evt.object is in evt.state
				// TODO: this could happen without firing an additional transition on the system...
				// actually, according to [UML 2.5, Section 17.2.3.5], it should be evaluated immediately before the following event (so, must there always be one?)
				return `IS_IN_STATE(${evt.object}, ${evt.object}.${evt.state})`;
			} else {
				throw `Event of unknown type: ${JSON.stringify(evt)}`;
			}
		}
		function allSimpleEvents() {
			function all(events, path) {
				return events.flatMap((evt, index) => {
					const nestedPath = [...path, index];
					if(isSimple(evt)) {
						return [nestedPath];
					} else {
						return all(nestedEvents(evt), nestedPath);
					}
				});
			}
			return all(interaction.events, []);
		}
console.debug("allSimpleEvents", allSimpleEvents());
		// TODO: optimize by removing duplicates
		// TODO: ignore arguments (once we match on them)
		const allAtoms = unique(allSimpleEvents().map(e => getAtom(e, false)));
console.debug({allAtoms})
		// From the APC interface of our formalization
		this.getAtoms = async () => {
			const ret = (await this.getFireables()).map(({eventRef}) => {
				if(eventRef.length > 0) {
					return getAtom(eventRef, true);
				} else {
					// STUTTERING
					return allAtoms.map(atom => `(!(${atom}))`).concat("true").join("&&");
				}
			});
			if(debug) console.log(`Returning atoms:\n\t${ret.join("\n\t")}`);
			return ret;
		};

		// From the ACC interface of our formalization (means that we have found an execution scenario corresponding to the interaction, but can mean that we have found an error for a LTL property)
		this.isAccept = async () => {
			return lifelines.every(objName => configuration[objName].length == 0);
		};
	}
}

