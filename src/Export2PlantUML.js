import {indentEsc} from './Utils.js';
import {escapeId, mult} from './ExportUtils.js';
import {trash,linkStyle} from './PlantUMLUtils.js';
import {last, hasElements} from './Utils.js';
import {toExplicit} from './TransformStateMachine2Explicit.js';
import {indent} from './TemplateUtils.js';
import {stringify, parser} from './JavaScriptActionLanguageParser.js';
import {getClassOperations} from './ModelUtils.js';

/*
const guardOpen = '［';
const guardClose = '］';
/*/
const guardOpen = '[';
const guardClose = ']';
/**/

// Serialize state machine to PlantUML, with support for execution and edition annotations
// Set raw to true in order to serialize plain PlantUML without annotation
export function toPlantUML(sm, model, engine, params) {
	const	{
			raw = true,
			callPrefix = "",
			forAnimation = false,
			editing = false,
			colors = defaultColors,
			hideLinks = false,
			styleMode,
			showExplicitSM,
			hideOuterSMBoxes,
			stateCommentLocation = "left",
			transitionCommentLocation = "bottom",
			showSelfTransitionsAsInternal,
			heatMap,
			foldedStateFQNs = [],
			onlyStateFQN,
			narrow = false,
			longTransitionFQNs = [],
			nonRankingTransitionFQNs = [],
		} = params;
	function isStateFolded(state) {
		return foldedStateFQNs.includes(model.stateFullName(state));
	}
	function isLong(trans) {
		return longTransitionFQNs.includes(model.transFullName(trans));
	}
	function isNorank(trans) {
		return nonRankingTransitionFQNs.includes(model.transFullName(trans));
	}
	function def(v) {
		return v ? v : '';
	}
	// TODO: unify get{State,Transition}URI
	function getStateURI(op, state, part) {
		return `javascript:${callPrefix}${op}('${encodeURIComponent(model.stateFullName(state))}'${part ? `,'${part}'` : ""})`;
	}
	function getEditURI(transition, part) {
		return `[[${engine.getTransURI(`editTransition`, transition, part)} ${indentEsc(transition[part]) || `<add ${part}>`}]]`;
	}
	function process(transition, alwaysColon) {
		function ports(spaceAfter) {
			if(transition.ports) {
				return ` from ${transition.ports.join(", ")}${spaceAfter ? " " : ""}`;
			} else {
				return "";
			}
		}
		var ret = '';
		if(editing && !raw) {
			// &#8203; is the zero-width space that can be inserted before the first and second '[' when putting a link between '[]'
			ret = `${getEditURI(transition, 'trigger')}${ports(true)}${guardOpen}&#8203;${getEditURI(transition, 'guard')}${guardClose}/${getEditURI(transition, 'effect')} [[${engine.getTransURI('removeTransition', transition)} ${trash}]]`;
			if(transition.label && !(transition.trigger || transition.guard || transition.effect)) {
				ret = `<i><back:#FFDEDE>${indentEsc(transition.label)}</back></i>\\n${ret}`
			}
		} else {
			let uninterpreted = false;
			if(transition.trigger || transition.guard || transition.effect) {
				function wrapTrigger() {
					var ret = transition.trigger;
					if(!raw && (engine.isActivable(transition) && !engine.eventMatched(transition) || (ret && forAnimation))) {
						ret = `<color:${colors.noEventColor}><s>${ret}</s></color>`;
					}
					return ret;
				}
				function wrapGuard() {
					var ret = indentEsc(transition.guard);
					// TODO: forAnimation?
					if(!(raw || engine.isFireable(transition)) && engine.isActivable(transition) && engine.eventMatched(transition)) {
						ret = `<color:${colors.falseGuardColor}><s>${ret}</s></color>`;
					}
					return ret;
				}
				const indentText = "    ";
				ret = `${def(wrapTrigger())}${ports(transition.guard)}${transition.guard ?
					`${
						narrow && transition.trigger ? '\\n' + indentText : ''
					}${guardOpen}${wrapGuard()}${guardClose}`
				:''}${transition.effect ? `/${
					narrow && (transition.trigger || transition.guard) ? '\\n' + indentText : ''
				}${indentEsc(transition.effect, indentText)}` : ''}`;
			} else if(transition.label) {
				ret = `${indentEsc(transition.label)}`
				uninterpreted = true;
			}
			if(!raw && (forAnimation || engine.isFireable(transition))) {
				if(ret == '') {
					ret = '// fire';
				}
				ret = `[[${engine.getFireURI(transition)} ${ret}&#8203;]]`;
			}
			if(uninterpreted) {
				ret = `<i><back:#FFDEDE>${ret}</back></i>`;
			}
		}
		ret = heatMapColor(transition) + ret;
		if(ret != '') {
			return `: ${ret}`;
		} else {
			return (alwaysColon ? ':' : '') + ret;
		}
	}
	function editableVertex(vertex) {
		return `[[javascript:${callPrefix}transitionTo('${model.stateFullName(vertex)}') →]] [[${getStateURI('editState', vertex)} ${vertex.name}]] [[${getStateURI('removeState', vertex)} ${trash}]] [[javascript:${callPrefix}transitionFrom('${model.stateFullName(vertex)}') →]]`;
	}
	function editableState(state) {
		if(editing && !raw) {
			return `"${editableVertex(state)}" as ${stateId(state)}`;
		} else {
			return `"${state.name}" as ${stateId(state)}`;
		}
	}
	function currentPseudostateNote(state) {
		return stateNote(state, "Current pseudostate", colors.currentStateColor);
	}
	function stateNote(state, note, color) {
		var noteName = `${model.stateFullName(state)}Note`;
		return `
			note "${note}" as ${noteName} ${color ? `#${color}` : ''}
			${
				(state.kind == 'initial') ?
					`[*] --> ${noteName}`	// TODO: try -[norank]-> with newer versions of PlantUML to prevent layout from changing when notes are displayed
				:
					`${noteName} --> ${stateId(state)}`	// idem
			}`;
	}
	function wrapProp(state, propertyName, prefix) {
		var ret = `${prefix ? prefix : ''}${indentEsc(state[propertyName])}`;
		if(editing && !raw) {
			ret = `[[${getStateURI('editProperty', state, propertyName)} ${ret}]]`;
		}
		return ret;
	}
	function isCurrent(state) {
		if(forAnimation) {
			return state.kind && true;	// force showing notes for pseudo-states
		} else {
			//var ret = configuration.currentState[sm.name].includes(state);
			// comparing full names to support execution while showing explicit state machines
			return engine.isCurrent(state);
		}
	}
	function wrapEditableTransitionProperty(trans, propName) {
		return wrapEditableElementProperty("editTransition", model.transFullName(trans), propName, trans[propName], raw, editing);
	}
	function wrapEditableStateProperty(state, propName) {
		return wrapEditableElementProperty("editProperty", model.stateFullName(state), propName, state[propName], raw, editing);
	}
	function heatMapColor(trans) {
		if(heatMap?.max) {
			function map(a) {
				return Math.log(a + 1);
				//return a;
			}
			const transFQN = model.transFullName(trans);
			let v = 0;
			let h = "00";
			function toHex(v) {
				const h = v.toString(16);
				return (h.length == 1 ? "0" : "") + h;
			}
			if(transFQN in heatMap) {
				v = Math.round(0xFF * map(heatMap[transFQN]) / map(heatMap.max));
				h = toHex(v);
//console.log(heatMap.max, heatMap[transFQN], v, h)
			}
//*			// transparent to red: works in PNG, but not in SVG (PlantUML bug?) => fixed
//			return `<color:FF0000${h}>⬤</color>`;
			// red for unfired, then transparent to opaque green
			return `<color:${v == 0 ? "FF" : "00"}${v == 0 ? "00" : "FF"}00${v == 0 ? "FF" : h}>⬤</color>`;
/*/
			// black to red
//			return `<color:${h}0000>⬤</color>`;
			// red for unfired, then dark to light green
			return `<color:${v == 0 ? "FF" : "00"}${h}00>⬤</color>`;
/**/
		}
		return "";
	}
	function processRegion(region, toAppend) {
//console.log("processRegion", model.stateFullName(region), toAppend)
		return `
			${!raw && editing ? `
				state "[[javascript:${callPrefix}addState('${model.stateFullName(region)}') Add state]]" as __ADD_STATE_TO_${stateId(region)}__
				state "[[javascript:${callPrefix}addPseudostate('${model.stateFullName(region)}','choice') Add choice]]" as __ADD_CHOICE_TO_${stateId(region)}__
			`:""}
			${(region.states || []).map(state => {
				var stereo = state.kind;
				var toAppendFromChildren = [];
				const subRegion = processRegion(state, toAppendFromChildren);
				const isFolded = isStateFolded(state);
				switch (state.kind) {
				case 'junction':
					// TODO: support these
					console.log('Unsupported "%s" Pseudostate: %s', state.kind, state);
					break;
				case 'deepHistory':
				case 'shallowHistory':
					// the note corresponding to a shallowHistory Pseudostate must be placed in the parent region, otherwise strange things happen
					if(editing && !raw) {
						toAppend.push(stateNote(state, `&#171;${state.kind}&#187; ${editableVertex(state)}`));
					}
					break;
				case 'initial':
				//case 'terminate':	// see alternative representation below
					if(editing && !raw) {
						return stateNote(state, `&#171;${state.kind}&#187; ${editableVertex(state)}`) + (isCurrent(state) ? `#${colors.currentStateColor}` : '');
					} else if(!raw) {
						return `
							${currentPseudostateNote(state)}
							${isCurrent(state) ? "" : `hide ${model.stateFullName(state)}Note`}
						`;
					}
					break;
				case 'terminate':
					stereo = 'end';
				case 'join':
				case 'fork':
				case 'choice':
				case 'entrypoint':
				case 'exitpoint':
					return `
						state ${stateId(state)} <<${stereo}>>
						${(editing && !raw) ?
							`note left of ${stateId(state)} ${isCurrent(state) ? `#${colors.currentStateColor}` : ''} : &#171;${state.kind}&#187; ${editableVertex(state)}`
						:!raw ?
							// It seems that simply changing the color of choice, entrypoint & exitpoint does not work (tested on 2017 version of plantuml.war)
							`${currentPseudostateNote(state)}
							${isCurrent(state) ? "" : `hide ${model.stateFullName(state)}Note`}
						` : ''
						}`
				default:
					return `
						${state.entry ? `${stateId(state)} : ${wrapProp(state, 'entry', 'entry/')}` : ''}
						${state.exit ? `${stateId(state)} : ${wrapProp(state, 'exit', 'exit/')}` : ""}
						${state.doActivity ? `${stateId(state)} : ${wrapProp(state, 'doActivity', 'do/')}` : ''}
						${Object.values(state.internalTransitions || {}).map(trans => `
							${stateId(state)} ${process(trans, true)}`
						).join('')}
						${!raw && editing ?
							`${stateId(state)} : Add [[javascript:addInternalTransition('${model.stateFullName(state)}') transition]]${
								state.entry ? "" : `, [[javascript:addEntry('${model.stateFullName(state)}') entry]]`
							}${
								state.doActivity ? "" : `, [[javascript:addDoActivity('${model.stateFullName(state)}') do]]`
							}${
								state.exit ? "" : `, [[javascript:addExit('${model.stateFullName(state)}') exit]]`
							}${
								state.comment ? "" : `, [[javascript:editProperty('${model.stateFullName(state)}','comment') comment]]`
							}`
						:""}
						state ${editableState(state)} ${isFolded ? "<<o-o>> " : ""}${(!raw && (isCurrent(state))) ? 	`#${colors.currentStateColor}` : ''} ${subRegion.trim() ? `{
							${isFolded ? "" : subRegion}
						}` : ""}
						${toAppendFromChildren.join('')}
						${stateCommentLocation && state.comment ? `
							note ${stateCommentLocation} of ${stateId(state)}\n${wrapEditableStateProperty(state, "comment")}
							end note
						` : ""}
					`;
				}
			}).join('')}
			${(region.transitions || []).map(transition =>
				showSelfTransitionsAsInternal && transition.source == transition.target
				?	`
						${stateId(transition.source)} ${process(transition)}
					`
				:
					`
						${stateId(transition.source)} -${
							(args =>
								hasElements(args) ? `[${args}]` : ""
							)([
								...!raw && engine.isFireable(transition) && !forAnimation ? [`#${colors.fireableTransitionColor}`] : [],
								...isNorank(transition) ? ["norank"] : [],
							])
						}-${isLong(transition) ? "--" : ""}> ${stateId(transition.target)} ${process(transition)}
						${transitionCommentLocation && (transition.comment || (!raw && editing)) ? `
							note ${transitionCommentLocation} on link\n${wrapEditableTransitionProperty(transition, "comment")}
							end note
						`
						: ""}`
			).join('')}
		`;
	}
	function stateId(state) {
		switch(String(state.kind)) {
		case 'shallowHistory':
			return `${stateId(state.region)}[H]`;
		case 'deepHistory':
			return `${stateId(state.region)}[H*]`;
		case 'initial':
		//case 'terminate':
			return '[*]';
		default:
			return escapeId(model.stateFullName(state));
		}
	}
	function editableObject(name) {
		if(editing && !raw) {
			var n = encodeURIComponent(sm.name);
			return `[[javascript:${callPrefix}editObject('${n}') ${name}]] [[javascript:${callPrefix}removeObject('${n}') ${trash}]]`;
		} else {
			return name;
		}
	}
	// Only for general background, not for state background:
	//	skinparam backgroundColor transparent
	// Only for states defined without curly braces (whether there is something or not between them)
	//	hide empty description
	const target = onlyStateFQN ? model.getState(onlyStateFQN) : sm;
	const region = processRegion(transform(target, model, editing, showExplicitSM));
	return `
		@startuml
		'left to right direction
		${styleMode === "dark" ? "skinparam monochrome reverse" : ""}
		hide empty description
		${linkStyle(hideLinks)}
		${(showExplicitSM && !editing) && !raw ?
			'left header Warning, showing as explicit state machine,\\nbut execution actually proceeds on the original state machine.\\nExplicit-specific function calls will not appear in history.\\nIf an history node or any other error is visible, then your state\\nmachine is not supported yet.'
		:
			''
		}

		${hideOuterSMBoxes ? region : `
			state "${editableObject(target.name)}" as ${escapeId(target.name)} {
				${region}
			}
		`}
		@enduml
	`;
}

function wrapEditableElementProperty(op, fqn, propName, value, raw, editing) {
	if(!raw && editing) {
		// we need to keep the indentation of the first line so that PlantUML can remove common prefix indentation
		// alternatively we could try to do it ourselves
		// TODO: this is only valid for comments
		const edit = `[[javascript:${op}('${fqn}','${propName}') edit]]`;
		if(value) {
			return value.replace(/[^ \t\n]/, `${edit} $&`);
		} else {
			return edit;
		}
	} else {
		return value;
	}
}

/*
	After explicit transformation, composite state transitions cannot be fired when on internal pseudo-state, whereas they can on original state machine (because we consider pseudo states as states)
*/
function transform(sm, model, editing, showExplicitSM) {
	if(showExplicitSM && !editing) {
		return toExplicit(sm, model);
	} else {
		return sm;
	}
}

const defaultColors = {
	currentStateColor: "lightgreen",
	fireableTransitionColor: "green",
	noEventColor: "red",
	falseGuardColor: "red",
};

/*
To make most things black but not the heat map, so that it better stands out:
skinparam classBorderColor black
skinparam stateBorderColor black
skinparam noteBorderColor black
skinparam classBackgroundColor white
skinparam stateBackgroundColor white
skinparam noteBackgroundColor white
skinparam arrowColor black
*/

export function allObjectsToPlantUML(model, engine, params = {}) {
	const	{
			// for both this function & toPlantUML
			raw = true,
			forAnimation = false,
			editing = false,
			callPrefix = "",
			hideLinks = false,
			styleMode,

			// only for toPlantUML (i.e., state diagram), commented out here because there are not needed here
			hideOuterSMBoxes,
/*
			colors = defaultColors,
			stateCommentLocation = "left",
			transitionCommentLocation = "bottom",
*/
			// only for this function
			displayedObjects = model.objects,
			displayedClasses = Object.values(model.classes || {}),
			objectCommentLocation = "left",
			operationCommentLocation = "left",
			propertyCommentLocation = "left",
			showMethodsAsActivities = false,
			showActorsAsObjects = false,

			// TODO: add in settings
			showProperties = true,
			showDataTypes = true,
			showNonDataTypes = true,
			showEventPools = true,


			// unsorted
			showPorts,
			hideClasses,
			checkEvents,
			hideMethods,
			hideStateMachines,
			showEndNames,
			hideOperations,
			classDiagram,
		} = params;
	const objectsToDisplay = displayedObjects.filter(o => showPorts || !model.isPort(o));
	if(classDiagram) {
		const classesToDisplay = Object.fromEntries(Object.entries(model.classes || {}).filter(([name, cl]) =>
			displayedClasses.includes(cl) || cl.ends?.every(e => displayedClasses.includes(e.type))
		));
		const elements = {};
		if(displayedClasses.length === 1) {
			Object.assign(elements, classesToDisplay);
		} else {
			for(const [name, element] of Object.entries(classesToDisplay)) {
				const type = getType(element);
				function add(element) {
					if(hasElements(element.packagePath)) {
//console.log(element.packagePath)
						let cur = elements;
						for(const p of element.packagePath) {
							cur[p] ??= {
								isPackage: true,
								name: p,
								elements: {},
							};
							cur = cur[p].elements;
						}
						cur[element.name] = element;
					} else {
						elements[name] = element;
					}
				}
//console.log(type, name, element)
				switch(type) {
					case "Class":
					case "Interface":
						if(showNonDataTypes) {
							add(element);
						}
						break;
					case "Enumeration":
						if(showDataTypes) {
							add(element);
						}
						break;
					case "Association":
						if(showNonDataTypes) {
							elements[name] = element;
						}
						break;
				}
			}
		}
		return processPackageElements(elements);
		function getType(element) {
			return	element.ends
				?	"Association"
				:element.literals
				?	"Enumeration"
				:element.isInterface
				?	"Interface"
				:	"Class"
			;
		}
		function processPackageElements(classesToDisplay) {
			return`
				${styleMode === "dark" ? "skinparam monochrome reverse" : ""}
				'left to right direction
				skinparam classAttributeIconSize 0
				skinparam shadowing false
				hide circle
				hide empty members
				'hide fields
				${linkStyle(hideLinks)}

				${Object.entries(classesToDisplay).map(([className, cl]) => 
						cl.ends
					?	// association
						showNonDataTypes ? (() => {
							function endDeco(end, otherEnd, dir) {
								return `${end.isNavigable ? dir : ""}${otherEnd.isComposite ? "*" : ""}`;
							}
							function mult(end) {
								return end.multiplicity ? `"${end.multiplicity}"` : "";
							}
							const left = cl.ends[0];
							const right = cl.ends[1];
							return `${left.type.name} ${mult(left)} ${endDeco(left, right, "<")}--${endDeco(right, left, ">")} ${mult(right)} ${right.type.name}${cl.label ? ` : ${cl.label}` : ""}`;
						})() : ""
					:	cl.literals
					?	// enum
						// TODO: enum literal comments?
						showDataTypes ? `
							enum ${cl.name} <<enumeration>> {
								${cl.literals.map(literal => literal.name).join("\n")}
							}
						` : ""
					:	cl.isPackage
					?	 `
							package ${className} {
								${processPackageElements(cl.elements)}
							}
						`
					:	// class || interface		TODO: parameter & returnType multiplicities
						showNonDataTypes ? `
							${cl.isAbstract ? "abstract" : ""} ${cl.isInterface ? "interface" : "class"} ${className}${
								cl.isInterface ? " <<interface>>" : ""
							}${
								hasElements(cl.supertypes)
								?	` extends ${cl.supertypes.map(e => e.name).join(", ")}`
								:	""
							}${
								hasElements(cl.interfaces)
								?	` implements ${cl.interfaces.map(e => e.name).join(", ")}`
								:	""
							}${
								cl.stereotypes?.map(s => `<<${s}>>`).join("") ?? ""
							} {
								${showProperties ? Object.entries(cl.propertyByName ?? {}).map(([propName, prop]) =>
									// TODO: multiplicity edition
									`${prop.private ? "-" : "+"}${propName}${prop.type ? ` : ${prop.type}${mult(prop)}` : ""}`
								).join("\n") : ""}
								${hideOperations ? "" : Object.entries(cl.operationByName ?? {}).map(([opName, op]) => {
									const hasDir = op.parameters?.some(p => p.direction);
									return `${op.private ? "-" : "+"}${op.isStatic ? "{static}": ""}${opName}(${
										(op.parameters || []).map(p =>
											// TODO: multiplicity edition
											`${hasDir ?
												p.direction ? `**${p.direction}** ` : "**in** "
											:""}${p.name}${p.type ? ` : ${p.type}${mult(p)}` : ""}`
										).join(", ")
									})${op.returnType ? ` : ${op.returnType}${mult(op)}` : ""}${
										hasElements(op.stereotypes)
										?	" " + op.stereotypes.map(s => `<<${s}>>`).join("")
										:""
									}`;
								}).join("\n")}
							}

							${cl.comments && objectCommentLocation
							?	`
								note ${objectCommentLocation} of ${className}
									${cl.comments.join("\n")}
								end note
							`:	""
							}
							${propertyCommentLocation ? Object.entries(cl.propertyByName || {}).filter(([propName, prop]) =>
								hasElements(prop.comments)
							).map(([propName, prop]) => `
								note ${propertyCommentLocation} of ${className}::${propName}
									${prop.comments.join("\n")}
								end note
							`).join("\n") : ""}
							${operationCommentLocation ? Object.entries(cl.operationByName || {}).filter(([opName, op]) =>
								hasElements(op.comments)
							).map(([opName, op]) => `
								note ${operationCommentLocation} of ${className}::${opName}
									${op.comments.join("\n")}
								end note
							`).join("\n") : ""}
						` : ""
				).join("\n")}
			`;
		}
	} else if(hideClasses) {
		var activeObjects = objectsToDisplay.filter(obj => model.isActive(obj));
		var ret = activeObjects.map(o => toPlantUML(o, model, engine, {
			...params,
			// if several objects are shown then outer state machines boxes cannot be hidden, otherwise conflicts will occur (notably, initial pseudostates will merge)
			// but let user decide to show it anyway when there is only one object
			hideOuterSMBoxes: hideOuterSMBoxes === false ? false : displayedObjects.length == 1
		})).join('');
		var prev;
		activeObjects.forEach(object => {
			if(prev) {
				ret += `${escapeId(prev.name)} -[hidden]-> ${escapeId(object.name)}\n`;
			}
			prev = object;
		});
		if(ret.trim() === "") {
			ret = 'note "Nothing to show on this diagram. You could try adding state machines to your model." as emptyNote';
		}
		return ret;
	} else {
		function isCallable(op) {
			return (!checkEvents) || engine.findMessage(op.name, op.class.name);
		}
		function opId(op) {
			return encodeURIComponent(`${op.class.name}.${op.name}`);
		}
		function editableReturnType(obj, op) {
			let ret = op.returnType ? ` : ${op.returnType}${mult(op)}` : "";	// TODO: multiplicity edition
			if(!raw && editingOp(obj, op)) {
				ret = ` [[javascript:${callPrefix}editOperationPart('${opId(op)}','returnType') ${ret || ': <returnType>'}]]`;
			}
			return ret;
		}
		function editableParameters(obj, op) {
			const hasDir = op.parameters?.some(p => p.direction);
			let ret = (op.parameters || []).map(param => {
				if(typeof param === "string") {
					return param;
				} else {
					return `${hasDir ?
						param.direction ? `**${param.direction}** ` : "**in** "
					:""}${param.name}${param.type ? ` : ${param.type}${mult(param)}` : ""}`;
				}
			}).join(", ");
			if(!raw && editingOp(obj, op)) {
				ret = `[[javascript:${callPrefix}editParameters('${opId(op)}') ${ret || '<params>'}]]`;	// TODO: direction & multiplicity edition
			}
			return ret;
		}
		function hyperTitleEsc(s) {
			return s
/*
				.replaceAll(/ /g, "&32;")
				.replaceAll(/\t/g, "\\t")
				.replaceAll(/{/g, "&#2983;")
				.replaceAll(/}/g, "&#2984;")
*/
			;
		}
		function wrapOperation(obj, op) {
			let params = editableParameters(obj, op);
			let returnType = editableReturnType(obj, op);
			let ret = `(${params})${returnType}`;
			if(editingOp(obj, op) && !raw) {
				ret = `[[javascript:${callPrefix}editOperation('${opId(op)}') ${op.name}]]${ret} [[javascript:${callPrefix}removeOperation('${opId(op)}') ${trash}]]`;
			} else if(isCallable(op) && !raw) {
				ret = `[[javascript:${callPrefix}callOperation('${opId(op)}')${op.method ? `{${hyperTitleEsc(indentEsc(op.method))
					.replace(/<U\+007B>/g, "{")	// works except in tooltip
				}}` : ''} ${op.name}]]${ret}`;
			} else {
				ret = `${op.name}${ret}`;
			}
			ret = `${op.private ? "-" : "+"}${ret}`;
			return ret;
		}
		function escId(id) {
			return escapeId(id).replace(/\./, "__");
		}
		function wrapObjectNameAndClass(o) {
			const remove = !raw && editing ?
				` [[javascript:${callPrefix}removeObject('${o.name}') ${trash}]]`
			:	""
			;
			const showClass = o.class && !(o.isActor && o.class === o.name);
			return showClass || editing ?
				`"${wrapObjectName(o.name)} : ${wrapClassName(o)}${remove}" as ${escId(o.name)}`
			:
				`"${wrapObjectName(o.name)}${remove}" as ${escId(o.name)}`
			;
		}
		function wrapClassName(o) {
			if(!raw && editing) {
				return `[[javascript:${callPrefix}editObjectProperty('${o.name}','class') ${o.class || "<class>"}]]`;
			} else {
				return o.class;
			}
		}
		function wrapObjectName(objName) {
			if(!raw) {
				if(editing) {
					return `[[javascript:${callPrefix}editObject('${objName}') ${objName}]]`;
				} else {
					return `[[javascript:${callPrefix}setSender('${encodeURIComponent(objName)}') ${objName}]]`;
				}
			} else {
				return objName;
			}
		}
		function wrapMsg(source, target) {
			return (msg) => {
				var ret = msg;
				if(!raw) {
					if(editing) {
						// TODO
					} else if(checkEvents && (model.isActive(source) || !source.isActor)) {
						// nothing to do
					} else {
						// TODO: encodeURIComponent (as in wrapOperation)
						ret = `[[javascript:${callPrefix}callOperation('${target.name}.${ret.replace(/ /g, "%20")}','${source.name}') ${ret}]]`;
					}
				}
				return ret;
			};
		}
		function stereo(o) {
			const setActor = `<<[[javascript:${callPrefix}setActor('${o.name}',${o.isActor ? false : true}) make${o.isActor ? "Object" : "Actor"}]]>>`;
			let ret = '';
			if(o.isActor & showActorsAsObjects) {
				ret += "<<actor>>";
			}
			if(model.isActive(o)) {
				if(editing && !raw) {
					ret += `<<[[javascript:${callPrefix}makePassive('${o.name}') makePassive]]>>${setActor}`;
				} else {
					ret += o.isActor && !showActorsAsObjects ?
						""			// not showing <<active>> on actors
					:	'<<active>>';
				}
			} else {
				if(editing && !raw) {
					ret += `<<[[javascript:${callPrefix}makeActive('${o.name}') makeActive]]>>${setActor}`;
				}
			}
			if(o.isObserver) {
				if(editing && !raw) {
					ret += `<<[[javascript:${callPrefix}makeNonObserver('${o.name}') makeNonObserver]]>>`;
				} else {
					ret += o.isActor && !showActorsAsObjects ?
						""			// not showing <<observer>> on actors
					:	'<<observer>>';
				}
			} else {
				if(editing && !raw) {
					ret += `<<[[javascript:${callPrefix}makeObserver('${o.name}') makeObserver]]>>`;
				}
			}
			return ret;
		}
		function wrapMethod(obj, op) {
			if(hideOperations || hideMethods) {
				return '';
			} else {
				var ret = op.method;
				if(editingOp(obj, op) && !raw) {
					ret = `[[javascript:${callPrefix}editMethod('${opId(op)}') ${ret ? indentEsc(ret) : '<add method>'}]]`;
				} else if(ret && showMethodsAsActivities) {
					const ast = parser.parse(ret);
					ret = `
						{{
							${js2PlantUMLActivity(ast)}
						}}
					`;
				} else if(ret) {
					ret = ret.replace(/__/g, "~__");
				}
				if(ret) {
					ret = `
						note right of ${escId(op.class.name)}::${op.name}\n${ret}
						end note`;
				}
				return ret;
			}
		}
		function getVirtualConnectors() {
			// to detect duplicates:
			const handledConnectors = [];
			return objectsToDisplay.flatMap(o =>
				model.getConnectors(o).filter(c => !handledConnectors.includes(c) && model.isPort(model.getOtherEnd(c, o))).map(c => {
					const navResult = model.navigateThroughPorts(o, model.getOtherEnd(c, o));
					Array.prototype.push.apply(handledConnectors, navResult.traversedConnectors);
					const lastConnector = last(navResult.traversedConnectors);
					const endNames = [
						c.endNames ? c.endNames[c.ends.indexOf(o)] : " ",
						lastConnector.endNames ? lastConnector.endNames[lastConnector.ends.indexOf(navResult.target)] : " "
					];
					return ({
						name: "VIRTUAL CONNECTOR",	// in case this shows up in, e.g., an error message
						ends: [o, navResult.target],
						endNames: endNames,
					});
				})
			);
		}
		function isVisible(connector) {
			return connector.ends.every(e => objectsToDisplay.includes(e));
		}
		function editablePropName(obj, propName) {
			if(!raw && editingProp(obj, propName)) {
				return `[[javascript:${callPrefix}editPropertyName('${obj.name}','${propName}') ${propName}]]`;
			} else {
				return propName;
			}
		}
		function editablePropType(obj, prop, propName) {
			if(!raw && editingProp(obj, propName)) {
				// TODO: multiplicity edition
				return ` : [[javascript:${callPrefix}editPropertyPart('${obj.name}','${propName}','type') ${prop.type ? prop.type : "<type>"}]]`;
			} else {
				return prop.type ? ` : ${prop.type}${mult(prop)}` : "";
			}
		}
		function removableProp(obj, propName) {
			if(!raw && editingProp(obj, propName)) {
				return ` [[javascript:${callPrefix}removeProperty('${obj.name}','${propName}') ${trash}]]`;
			} else {
				return "";
			}
		}
		function editingProp(obj, propName) {
			return editing && obj.propertyByName?.[propName]
		}
		function editingOp(obj, op) {
			return editing && obj.operationByName?.[op.name]
		}
		function processSignature(sig) {
			if(!sig.match(/\(.*\)/)) {
				return sig + "()";
			} else {
				return sig;
			}
		}
		var ret = 'allowmixing\n' + objectsToDisplay.map(o => {
			function stateMachine() {
				return	model.isActive(o) && !hideStateMachines ? indent`
						note right of ${escId(o.name)}
						{{
							${toPlantUML(o, model, engine, params)}
						}}
						end note
					` : '';
			}
			function objectComment(o) {
				return objectCommentLocation && (o.comment || (!raw && editing)) ? indent`
					note ${objectCommentLocation} of ${escId(o.name)}
						${
							wrapEditableElementProperty("editObjectProperty", o.name, "comment", o.comment, raw ,editing)
						}
					end note
				`: "";
			}
			if(o.isActor && !showActorsAsObjects) {
				return indent`
					actor ${wrapObjectNameAndClass(o)} ${stereo(o)}
					${stateMachine()}
					${objectComment(o)}
				`;
			} else {
				function unescEMI(propName) {
					return propName.replace(/^__EMI__/, "");
				}
				function displayValue(value) {
					try {
						if(value.valueOfProperty) {
							return value.valueOfProperty;
						} else {
							return JSON.stringify(value);
						}
					} catch(e) {
						return "<error>";
					}
				}
				function getClass(obj) {
					if((typeof obj.class) === "string") {
						return model.classes?.[obj.class];
					} else {
						return obj.class;
					}
				}
				function getClassProperties(c) {
					function get(c) {
						return [
							...Object.entries(c?.propertyByName ?? {}),
							...c?.supertypes?.flatMap(get) ?? [],
						];
					}
					return c && Object.fromEntries(get(c));
				}
				const slots = Object.fromEntries(
					Object.entries(engine.getSlots(o) || {}).map(([propName, value]) =>
						[unescEMI(propName), value]
					)
				);
				const props = showProperties ? {...getClassProperties(getClass(o)), ...o.propertyByName} : {};
				const operations =	Object.values({
								...getClassOperations(getClass(o)),
								...o.operationByName
							}).map(e => ({
								...e,
								class: o
							}));

				let eventPool = undefined;
				let matchingEther = undefined;
				if(showEventPools) {
					eventPool = engine.getEventPool?.(o);
					matchingEther = engine.getMatchingEtherMessages?.(o);
					matchingEther = hasElements(matchingEther) ? matchingEther : undefined;
				}
				// TODO: property defaultValues
				const hasOperations = editing || (hasElements(operations) && !hideOperations);
				const hasProperties = editing || (Object.keys(props).length + Object.keys(slots).filter(e => !e.match(/__.*__/)).length > 0);
				const hasMembers = hasOperations || hasProperties;
				return indent`
					class ${wrapObjectNameAndClass(o)} ${stereo(o)} {
						${
							Object.entries(props).map(([propName, prop]) => indent`
								${prop.private ? "-" : "+"} ${editablePropName(o, propName)}${editablePropType(o, prop, propName)}${
									propName in slots ?
										` = ${displayValue(slots[propName])}`
									:	''
								}${removableProp(o, propName)}
							`)
						}
						${
							Object.entries(slots).filter(([propName, value]) => !(propName in props)).map(([propName, value]) => {
								if(propName.match(/__.*__/)) {
									return "";
								} else {
									return `${propName} = ${displayValue(value)}`;
								}
							}).filter(e => e)
						}
						${editing && !raw ?
							`[[javascript:${callPrefix}addProperty('${o.name}') ADD]] a property`
						:	""
						}
						${hasProperties && hasOperations ? "---":""}
						${hideOperations ?
							""
						:	operations.map(op =>
								`${wrapOperation(o, op)}`
							)
						}
						${editing && !raw ?
							`[[javascript:${callPrefix}addOperation('${o.name}') ADD]] an operation()`
						:	''
						}
						${hasMembers && (eventPool || matchingEther) ? "---":""}
						${eventPool ? indent`
							**Event pool:** {method}
							${eventPool.map(msg =>
								`• ${processSignature(msg.signature)}`
							)}
						`:""}
						${matchingEther ? indent`
							**Ether:** {method}
							${matchingEther.map(msg =>
								`• ${processSignature(msg.signature)}`
							)}
						`:""}
					}
					${operations.map(op => wrapMethod(o, op)).join('')}
					${objectComment(o)}
					${propertyCommentLocation ? Object.entries(props).filter(([propName, prop]) =>
						prop.comments || (!raw && editingProp(o, propName))
					).map(([propName, prop]) => indent`
						note ${propertyCommentLocation} of ${escId(o.name)}::${propName}
							${							// TODO: editing more than one comment, and putting it back in comments, not comment
								wrapEditableElementProperty("editPropertyPart", `${o.name}','${propName}`, "comment", prop.comments?.[0], raw, editing)
							}
						end note
					`) : ""}
					${operationCommentLocation ? operations.filter(op =>
						op.comments || (!raw && editingOp(o, op))
					).map(op => indent`
						note ${operationCommentLocation} of ${escId(o.name)}::${op.name}
							${							// TODO: editing more than one comment, and putting it back in comments, not comment
								wrapEditableElementProperty("editOperationPart", opId(op), "comment", op.comments?.[0], raw, editing)
							}
						end note
					`) : ""}
					${stateMachine()}
				`;
			}
		}).join('\n') + "\n" + (model.connectors || []).filter(
			isVisible
		).concat(
			showPorts ? [] : getVirtualConnectors().filter(isVisible)
		).map(c => {
			var ret = '';
			var forward = c.possibleMessages?.forward;
			var reverse = c.possibleMessages?.reverse;
			var hasReverse = hasElements(reverse);
			var ret = '';
			const end0 = showEndNames && c.endNames ? `"${c.endNames[0]}" ` : "";
			const end1 = showEndNames && c.endNames ? ` "${c.endNames[1]}"` : "";
			let deco0 = "", deco1 = "", label = "";

			if(c.type) {
				const assoc = model.classes?.[c.type];
				if(assoc) {
					const left = assoc.ends[0];
					const right = assoc.ends[1];
					let end0Prop, end1Prop;
					if(c.ends[0].class === left.type.name || c.ends[1].class === right.type.name) {	// TODO: supertypes
						end0Prop = left;
						end1Prop = right;
					} else {
						end0Prop = right;
						end1Prop = left;
					}
					if(end0Prop.isComposite) {
						deco1 += "*";
					} else if(end1Prop.isNavigable) {
						deco1 += ">";
					}
					if(end1Prop.isComposite) {
						deco0 += "*";
					} else if(end0Prop.isNavigable) {
						deco0 += "<";
					}
					label = assoc.label ? ` : ${assoc.label}` : "";
				}
			}

			if(hasElements(forward)) {
				// PlantUML Server 20201206-2207 / version 1202022 displays #transparent as white... (with style="stroke: #FFFFFF; [...]")
				ret += indent`
					${escId(c.ends[0].name)} ${end0}${deco0}-${
						hasReverse ? '[#transparent]' : ''
					}-${deco1}${end1} ${escId(c.ends[1].name)} : > ${forward.map(wrapMsg(c.ends[0], c.ends[1])).join('\\n')}${label}
				`;
			}
			if(hasReverse) {
				ret = ret ? ret + "\n" : "";
				ret += indent`
					${escId(c.ends[0].name)} ${end0}${deco0}--${deco1}${end1} ${escId(c.ends[1].name)} : < ${reverse.map(wrapMsg(c.ends[1], c.ends[0])).join('\\n')}${label}
				`;
			}
			if(ret == '') {
				ret += indent`
					${escId(c.ends[0].name)} ${end0}${deco0}--${deco1}${end1} ${escId(c.ends[1].name)}${label}
				`;
			}
			return ret;
		}).join('\n');
		if((!model.connectors) || model.connectors.length == 0) {
			// no connector => add some hidden arrows to force vertical layout
			var prev;
			objectsToDisplay.forEach(object => {
				if(prev) {
					ret += `${escId(prev.name)} -[hidden]-> ${escId(object.name)}\n`;
				}
				prev = object;
			});
		}
		// The following code makes PlantUML crash for some diagrams:	${hideOperations ? "hide methods" : ""}
		// There is apparently a bug in PlantUML triggered when both "hide empty members" and "hide methods" are enabled & there is a note to an operation
		return indent`
			${styleMode === "dark" ? "skinparam monochrome reverse" : ""}
			'left to right direction
			skinparam classAttributeIconSize 0
			skinparam shadowing false
			hide circle
			hide empty members
			'hide fields
			${linkStyle(hideLinks)}
			${ret}
		`;
	}
}

function js2PlantUMLActivity(ast) {
	function process(s) {
		switch(String(s.type)) {
			case 'block':
				return indent`
					${s.statements.map(process)}
				`;
			case 'ifStat':
				return	indent`
						if (${stringify(s.condition)}) then (true)
							${process(s.thenStat)}
						else (false)
							${s.elseStat ? process(s.elseStat) : ""}
						endif
					`;
			case 'doStat':
				return	indent`
						repeat\\
							${process(s.statement)}
						repeat while (${stringify(s.condition)}) is (true)
						-> false;
					`;
			case 'whileStat':
				return	indent`
						while (${stringify(s.condition)}) is (true)
							${process(s.statement)}
						endwhile (false)
					`;
			default:
				return	indent`:${
						stringify(s)
							.replace(/\\n/g, "\\\\n")
							.replace(/\n/g, "\\n")
							.replace(/__/g, "~__")
					};`;
		}
	}
	return indent`
		start
		${ast.map(process)}
		stop
	`;
}

export function operationToPlantUMLActivity(op) {
	const ast = parser.parse(op.method);
	const ret = js2PlantUMLActivity(ast);
	return ret;
}

