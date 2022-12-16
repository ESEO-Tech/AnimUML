import {generateTCSVGSequence} from './TCSVGSequenceGenerator.js';
import {interactionLifelines} from './InteractionUtils.js';
import {last, sortBy} from './Utils.js';

export function interaction2TCSVGSequence(inter, model, {origin, interactionConfig, participants = [], styleMode}) {
	function partId(part) {
		return `participant.${part}`;
	}
	function call(events, event) {
		return events[event.accept];
	}
	function spanOfList(events) {
		const span = new Set(events.flatMap(e => spanOfOne(events, e)));
		const ret = lifelines.filter(objName => span.has(objName));
		return ret;
		//return model.objects.map(e => e.name).filter(objName => ret.has(objName));
	}
	function spanOfOne(events, event) {
		if("fromGate" in event) {
			return [event.to];
		} else if("call" in event) {
			return [event.from];
		} else if("accept" in event) {
			if(typeof event.accept === "string") {
				return [event.from, event.to];
			} else {
				return [call(events, event).to];
			}
		} else if("state" in event) {
			return [event.object];
		} else if("loopBody" in event) {
			const ret = spanOfList(event.loopBody);
			return ret;
		} else if("altBody" in event) {
			return spanOfList(event.altBody);
		} else if("alternatives" in event) {
			return spanOfList(event.alternatives);//.flatMap(alt => spanOfList(alt.altBody));
		} else if("ref" in event) {
			const fullRefSpan = spanOfList(model.interactions[event.ref]?.events ?? []);
			const refSpan = lifelines.filter(e => fullRefSpan.includes(e));
			// TODO: error message?
			if(refSpan.length == 0) {
				return lifelines;
			} else {
				return refSpan;
			}
		} else if("after" in event || "ref" in event || "returningCall" in event) {
			return [];
		} else {
			console.log("Unsupported event: ", event);
		}
	}
	function span(events, event) {
		return spanOfOne(events, event);
	}
	function getUse(events, event, index, prefix, parentId) {
		function afterId() {
			return `event[${prefix}${index - 1}]`;
		}
		function after() {
			return index > 0 ? `after="${afterId()}"` : "";
		}
		function isCurrent(object) {
			const currentId = `${prefix}${index}`;
			return interactionConfig && interactionConfig[object].some(({eventRef}) => {
console.log(eventRef.join("."), "===", currentId);
				return eventRef.join(".") === currentId;
			});
		}
		function current(object) {
			if(isCurrent(object)) {
				return "<param name='cursor' value='yes'/>";
			} else {
				return "";
			}
		}
		function getId(suffix = "") {
			return `event[${prefix}${index}${suffix}]`;
		}
		function idAttr(suffix) {
			const id = getId(suffix);
			lastId = id;
			return `id="${id}"`;
		}
		function parent() {
/*
			if(prefix !== "") {
				return `parent="event[${prefix.replace(/\.$/, "")}]"`;
			} else {
				return "";
			}
*/
			return parentId ? `parent="${parentId}"` : "";
		}

		if("fromGate" in event) {
			const target = event.target ? `${event.target} = ` : "";
			return `
				<use	${idAttr()}
					xlink:href="#found"
					${after()}
					${parent()}
					leftmost="${partId(lifelines[0])}"
				>
					<param name="on" value="${partId(event.to)}"/>
					<param name="signature" value="${target}${event.call}(${event.arguments || []})"/>
					<param name="circle" value="none"/>
					${current(event.from)}
				</use>
			`;
		} else if("call" in event) {
			const id = getId();
			unacceptedCalls.set(id, event);
			return `
				<use	${idAttr()}
					xlink:href="#call" 
					${after()}
					${parent()}
				>
					<param name="on" value="${partId(event.from)}"/>
					${current(event.from)}
				</use>
			`;
		} else if("accept" in event) {
			let callEvent;
			let callId;
			let inlineCall;
			let afterIdent;
			let callName;
			let target = "";
			if(typeof event.accept === "string") {
				callEvent = event;
				callId = `${getId()}.call`;
				inlineCall = `
					<use	id="${callId}"
						xlink:href="#call" 
						${after()}
						${parent()}
					>
						<param name="on" value="${partId(event.from)}"/>
						${current(event.from)}
					</use>
				`;
				afterIdent = callId;
				callName = callEvent.accept;
				if(event.target) {
					target = `${event.target} = `;
				}
			} else {
				callEvent = call(events, event);
				callId = `event[${prefix}${event.accept}]`;
				inlineCall = "";	// call has already been serialized
				afterIdent = afterId();
				callName = callEvent.call;
				unacceptedCalls.delete(callId);
				if(callEvent.target) {
					target = `${callEvent.target} = `;
				}
			}
			return `
				${inlineCall}
				<use	${idAttr()}
					xlink:href="#${callEvent.to === callEvent.from ? "selfaccept" : "accept"}"
					after="${afterIdent}"
					call="${callId}"
					${parent()}
				>
					<param name="on" value="${partId(callEvent.to)}"/>
					<param name="signature" value="${target}${callName}(${callEvent.arguments || []})"/>
					${current(callEvent.to)}
				</use>
			`;
		} else if("returningCall" in event) {
			const callEvent = events[event.returningCall];
			if(callEvent.from === callEvent.to) {
				return `
					<use	${idAttr("call")}
						xlink:href="#call"
						${after()}
						${parent()}
					>
						<param name="on" value="${partId(callEvent.to)}"/>
					</use>
					<use	${idAttr()}
						xlink:href="#selfaccept"
						after="${getId("call")}"
						call="${getId("call")}"
						${parent()}
						class="dashed"
					>
						<param name="on" value="${partId(callEvent.from)}"/>
						<param name="signature" value="${event.return}"/>
						${current(callEvent.to)}
					</use>
				`;
			} else {
				return `
					<use	${idAttr()}
						xlink:href="#direct"
						${after()}
						${parent()}
						from="${partId(callEvent.to)}"
						to="${partId(callEvent.from)}"
						class="dashed"
					>
						<param name="signature" value="${event.return}"/>
						${current(callEvent.to)}
					</use>
				`;
			}
		} else if("state" in event) {
			return `
				<use	${idAttr()}
					xlink:href="#invariant"
					${after()}
					${parent()}
				>
					<param name="on" value="${partId(event.object)}"/>
					<param name="invariant" value="${event.state}"/>
					${current(event.object)}
				</use>
			`;
		} else if("after" in event) {
			return `
				<use	${idAttr()}
					xlink:href="#after"
					${after()}
					${parent()}
				>
					<param name="on" value="${lifelines.map(partId)}"/>
					<param name="signature" value="after(${event.after})"/>
					${current(event.object)}
				</use>
			`;
		} else if("ref" in event) {
			const refSpan = spanOfOne(events, event);
			//console.log(event.ref, fullRefSpan, "filteredBy", lifelines, "results in", refSpan);
			return `
				<use	${idAttr()}
					xlink:href="#fragment"
					${after()}
					${parent()}
				>
					<param name="on" value="${refSpan.map(partId)}"/>
					<param name="label" value="ref"/>
					<param name="condition" value=" "/>
				</use>
				<use	id="${getId()}.text"
					xlink:href="#textcompartment"
					parent="${getId()}"
				>
					<param name="label" value="${event.ref}"/>
				</use>
				${(event.gates || []).map((gate, index) => {
					const callEvent = events[gate.accept];
					const callId = `event[${prefix}${gate.accept}]`;
					unacceptedCalls.delete(callId);
					const target = callEvent.target ? `${callEvent.target} = ` : "";
					return `
						<use	${idAttr(`.gate.${index}`)}
							xlink:href="#actualgate"
							call="${callId}"
							fragment="${getId()}"
						>
							<param name="signature" value="${target}${callEvent.call}(${callEvent.arguments || []})"/>
						</use>
					`;
				}).join("\n")}
			`;
		} else if("alternatives" in event) {
			const nestedPrefix = `${prefix}${index}.`;
			return `
				<use	${idAttr()}
					xlink:href="#fragment"
					${after()}
					${parent()}
				>
					<param name="on" value="${span(events, event).map(partId)}"/>
					<param name="label" value="${event.type ?? "alt"}"/>
					<param name="condition" value=" "/>
				</use>
				${event.alternatives.map((alt, alti) => {
					const altid = `${nestedPrefix}${alti}`;
					return `
						<use	id="${altid}"
							xlink:href="#compartment"
							${alti == 0 ? "" : `after="${nestedPrefix}${alti-1}"`}
							parent="${getId()}"
						>
							<param name="condition" value="${alt.condition}"/>
						</use>
						${alt.altBody.map((e, i) =>
							getUse(alt.altBody, e, i, `${altid}.`, altid)
						).join("\n")}
					`;
				}).join("\n")}
			`;
		} else if("loopBody" in event) {
			const nestedPrefix = `${prefix}${index}.`;
			function condition() {
				if("condition" in event) {
					return `[${event.condition}]`;
				} else if("lower" in event) {
					if(event.lower === event.upper) {
						switch(event.lower) {
							case 1:
								return `[once]`;
								break;
							case 2:
								return `[twice]`;
								break;
							default:
								return `[${event.lower} times]`;
								break;
						}
					} else {
						return `[between ${event.lower} and ${event.upper} times]`;
					}
				} else {
					return ""; 
				}
			}
			return `
				<use	${idAttr()}
					xlink:href="#fragment"
					${after()}
					${parent()}
				>
					<param name="on" value="${span(events, event).map(partId)}"/>
					<param name="label" value="loop"/>
					<param name="condition" value="${condition()}"/>
					${Object.values(interactionConfig || {}).includes(index) ?
						"<param name='color' value='blue'/>"
					:	""
					}
				</use>
				${event.loopBody.map((e, i) => getUse(event.loopBody, e, i, nestedPrefix, getId())).join("\n")}
			`;
		} else {
			console.log("Error: event of unknown type: ", event);
			return "";
		}
	}
	const parts = participants.map(e => e.name);
	let lifelines = inter.lifelines;
	if(!lifelines) {
		lifelines = model.objects.map(obj => obj.name);
		lifelines = sortBy(spanOfList(inter.events), e => parts.indexOf(e));
	}
	//console.log(lifelines, parts, spanOfList(inter.events, event), spanOfList(inter.events, event).map(e => parts.indexOf(e)))
	const unacceptedCalls = new Map();
	let unacceptedIndex = 0;
	let lastId;
	const ret = generateTCSVGSequence(`
		${(() => {
			return lifelines.map((objName, i) => `
				<use id="${partId(objName)}" xlink:href="#${model.getObject(objName)?.isActor ? 'actor' : 'object'}" ${i == 0 ? `x="100" y="0"` : `after="${partId(lifelines[i-1])}"`}>
					<param name="name" value="${objName} : ${model.getObject(objName)?.class || ''}"/>
				</use>`
			);
		})().join("\n")}


		${inter.events.map((event, index) => {
			return getUse(inter.events, event, index, "", "");
		}).join("\n")}
		${[...unacceptedCalls.entries()].map(([callId, callEvent]) => {
			const target = callEvent.target ? `${callEvent.target} = ` : "";
			return `
				<use	id="unaccepted[${unacceptedIndex++}]"
					xlink:href="#unaccepted"
					after="${unacceptedIndex > 1 ? `unaccepted[${unacceptedIndex}]` : lastId}"
					call="${callId}"
					rightmost="${partId(last(lifelines))}"
				>
					<param name="signature" value="${target}${callEvent.call}(${callEvent.arguments || []})"/>
				</use>
			`;
		}).join("\n")}
	`, {origin, styleMode});
	//console.log(ret);
	return ret;
}

