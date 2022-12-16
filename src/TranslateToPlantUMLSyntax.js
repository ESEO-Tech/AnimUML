import {indent} from "./TemplateUtils.js";
import {hasElements} from "./Utils.js";
import {getEventType} from "./ImportFromPlantUMLSequence.js";

export function translateToPlantUMLSyntax(model) {
	const {objects: sourceObjects, classes: sourceClasses} = model;
	const objects = [];

	for(const object of sourceObjects) {
		const behavior = translateRegion(object) || undefined;	// "" -> undefined
		const features = translateFeatures(object) || undefined;
//		console.log(object.name, ":", behavior);
//		console.log(object.name, ":", features);
		objects.push({
			...object,
			behavior,
			stateByName: undefined,
			transitionByName: undefined,
			states: undefined,
			transitions: undefined,

			features,
			propertyByName: undefined,
			operationByName: undefined,
		});

	}

	const classes = translateClasses(sourceClasses);

	const interactions = model.interactions
	?	Object.fromEntries(Object.entries(model.interactions).map(([name, inter]) =>
			[name, translateInteraction(inter, model)]
		))
	:	model.interactions;

	return {
		...model,
		objects,
		classes,
		interactions,
	};
}

export function jsStringify(o) {
	if(o === null) {
		return "null";
	}
	function escKey(k) {
		if(k.match(/^[\p{ID_Start}_$][\p{ID_Continue}_$\u200C\u200D]*$/u)) {
			return k;
		} else {
			return `"${k}"`;
		}
	}
	switch(typeof o) {
		case "undefined":
			return "undefined";
		case "string":
			if(o.match(/\n/)) {
				return indent`
					String.raw\`
						${o.split("\n")}
					\`
				`;
			}
			// falling through
		case "boolean":
		case "number":
			return JSON.stringify(o);
		case "object":
			if(Array.isArray(o)) {
				return indent`
					[
						${o.map(jsStringify).map(e => e + ",")}
					]
				`;
			} else {
				return indent`
					{
						${Object.entries(o).filter(([k, v]) =>
							v !== undefined
						).map(([k, v]) =>
							`${escKey(k)}: ${jsStringify(v)},`
						)}
					}
				`;
			}
		default:
			throw `Unsupported type: ${typeof o}`;
	}
}

function translateInteraction(inter, model) {
	function serLoopCond(e) {
		if("condition" in e) {
			return e.condition;
		} else if("lower" in e && e.lower === e.upper) {
			return `${e.lower} times`;
		} else {
			return "";
		}
	}
	function serEvent(e, i) {
		const type = getEventType(e);
		switch(type) {
			case "autoAcceptCall":
				return `e${i} : ${e.from} -> ${e.to} : ${e.accept}(${(e.arguments ?? []).join(",")})`;
			case "call":
				return `e${i} : ${e.from} -? ${e.to} : ${e.call}(${(e.arguments ?? []).join(",")})`;
			case "accept":
				return `accept e${e.accept}`;
			case "return":
				return `returning e${e.returningCall} : ${e.return}`;
			case "ref":
				return `ref over a, b ${
					e.gates?.length > 0
					?	`accepting ${e.gates.map(g => `e${g.accept} from ${g.name}`).join(", ")} `
					:	""
				}: ${e.ref}`;
			case "found":
				return `[${!e.fromGate || e.fromGate === "??" ? "" : e.fromGate}-> ${e.to} : ${e.call}(${(e.arguments ?? []).join(",")})`;
			case "after":
				return `...after(${e.after})...`;
			case "loop":
				return indent`
					loop ${serLoopCond(e)}
						${e.loopBody.map(serEvent)}
					end
				`;
			case "alt":
				return indent`
					alt ${e.alternatives[0].condition}
						${e.alternatives[0].altBody.map(serEvent)}
					${e.alternatives.slice(1).map(a => indent`
						else ${a.condition}
							${a.altBody.map(serEvent)}
					`)}
					end
				`;
			default:
				throw `Unsupported event type: ${type}`;
		}
	}
	return indent`
		${inter.title ?
			`title ${inter.title}`
		:""}
		${inter.lifelines.map(l =>
			model.getObject(l)?.isActor
			?	`actor ${l}`
			:	`participant ${l}`
		).join("\n")}
		${inter.events.map(serEvent).join("\n")}
	`;
}

// TODO: comments
function translateClasses(classes) {
	if(classes) {
		return Object.entries(classes).map(([clName, cl]) =>
			cl.ends
			?	// association
				(() => {
					function endDeco(end, otherEnd, dir) {
						return `${end.isNavigable ? dir : ""}${otherEnd.isComposite ? "*" : ""}`;
					}
					function mult(end) {
						return end.multiplicity ? `"${end.multiplicity}"` : "";
					}
					const left = cl.ends[0];
					const right = cl.ends[1];
					return `${left.type.name} ${mult(left)} ${endDeco(left, right, "<")}--${endDeco(right, left, ">")} ${mult(right)} ${right.type.name}${cl.label ? ` : ${cl.label}` : ""}`;
				})()
			:cl.literals
			?	// enum
				indent`
					enum ${clName} ${
						(cl.stereotypes ?? []).map(stereotype =>
							`<<${stereotype}>>`
						).join("")
					} {
						${cl.literals.map(literal =>
							literal.name
						).join("\n")}
					}
				`
			:	// class || interface
				indent`
					${cl.isAbstract ? "abstract " : ""}${cl.isInterface ? "interface" : "class"} ${clName} ${
						(cl.stereotypes ?? []).map(stereotype =>
							`<<${stereotype}>>`
						).join("")
					}${
						cl.supertypes?.length > 0
						?	`extends ${cl.supertypes.map(e => e.name).join(", ")} `
						:	""
					}${
						cl.interfaces?.length > 0
						?	`implements ${cl.interfaces.map(e => e.name).join(", ")} `
						:	""
					}{
						${translateFeatures(cl)}
						${cl.states?.length > 0 ? indent`
							behavior
								${translateRegion(cl)}
						` : ""}
					}
				`
		).join("\n");
	} else {
		return classes;
	}
}

function mult(m) {
	if(m) {
		const upper = m.upper === -1 ? "*" : m.upper;
		if(m.lower) {
			return `[${m.lower}-${upper}]`;
		} else {
			return `[${upper}]`;
		}
	} else {
		return "";
	}
}

function translateFeatures(object) {
	return indent`
		${Object.entries(object.propertyByName ?? {}).map(([propName, prop]) =>
			`${prop.private ? "-" : ""}${propName}${
				prop.type
				?	` : ${prop.type}`
				:	""
			}${
				prop.defaultValue !== undefined
				?	` = ${prop.defaultValue}` : ""
			}${escComment(comments(prop))}`
		)}
		${Object.entries(object.operationByName ?? {}).map(([opName, op]) => indent`
			${op.private ? "-" : ""}${opName}(${
				op.parameters?.map(p =>
					typeof(p) === "string"
					?	p
					:	`${p.name}${p.type ? ` : ${p.type}${mult(p.multiplicity)}` : ""}`
				).join(", ")
			})${
				op.returnType
				?	` : ${op.returnType}`
				:	""
			}${
				op.method
				?	` {${escComment(comments(op))}\n` + op.method + "}"
				:	escComment(comments(op))
			}
		`)}
	`;
}

function translateRegion(region) {
	return indent`
		${Object.entries(region.stateByName ?? {}).map(([stateName, state]) => {
			if(state.kind) {
				switch(state.kind) {
					case "junction":
					case "choice":
					case "join":
						return `state "${state.name}" as ${stateId(state)} <<${state.kind}>>`;
					default:
						return "";
				}
			} else {
				return indent`
					state "${stateName}" as ${stateId(state)} {
						${translateRegion(state)}
					}
					${comments(state) ? indent`
						note left of ${stateId(state)}
						${comments(state)}
						end note
					`:""}
					${state.entry ?
						`${stateId(state)} : entry / ${esc(state.entry)}`
					:""}
					${state.doActivity ?
						`${stateId(state)} : do / ${esc(state.doActivity)}`
					:""}
					${state.exit ?
						`${stateId(state)} : exit / ${esc(state.exit)}`
					:""}
					${Object.entries(state.internalTransitions ?? {}).map(([transName, trans]) =>
						`${stateId(state)} ${transCommon(transName, trans)}`
					)}
				`;
			}
		})}
		${Object.entries(region.transitionByName ?? {}).filter(([transName, trans]) =>
			!trans.isInternal
		).map(([transName, trans]) => indent`
			${stateId(trans.source, trans.region)} -> ${stateId(trans.target, trans.region)} ${transCommon(transName, trans)}
			${comments(trans) ? indent`
				note on link
				${comments(trans)}
				end note
			`:""}
		`)}
	`;
}

// transName !== trans.name for internal transitions
function transCommon(transName, trans) {
	return `as "${transName}" : ${trans.trigger ?? ""} ${hasElements(trans.ports) ? `from ${trans.ports}` : ""} ${esc(trans.guard, "[", "]")} / ${esc(trans.effect)}`;
}

function stateId(state, region = state.region) {
	let ret = [];
	let r = state.region;
	while(region !== r) {
//console.log(r.name)
		ret.unshift(stateId(r));
		r = r.region;
	}
	switch(state.kind) {
		case "terminate":
		case "initial":
			ret.push("[*]");
			break;
		case "shallowHistory":
			ret.splice(-1);
			ret.push(`${stateId(state.region)}[H]`);
			break;
		default:
			ret.push(state.name.replace(/ /g, "__SPACE__"));
			break;
	}
	return ret.join(".");
}

function esc(s, begin, end = begin) {
	if(s) {
		const ret = s
			.replace(/\\/g, "\\\\")
			.replace(/\n/g, "\\n")
		;
//console.log(JSON.stringify(s), "=>", JSON.stringify(ret))
//console.log(s, "=>", ret)
		return `${begin ?? ""}${ret}${end ?? ""}`;
	} else {
		return "";
	}
}

const escComment = (s) => esc(s, "\t'' ", "");

function comments(e) {
	return [...e.comment ? [e.comment] : [], ...e.comments ?? []].join("\n");
}
