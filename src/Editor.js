import {remove, exportSymbols, hasElements, getSelected} from "./Utils.js";
import {buildModel} from "./ImportFromAnimUML.js";

var model;
export class Editor {
	constructor() {
	}
	setModel(model_) {
		model = model_;
	}
}

export function initEditor(model_) {
	model = model_;
	editBlock.innerHTML = `
					<ul>
						<li id="addToState">add one of the following in <select id="contextState"></select>:
							<ul>
								<li>a <a href="javascript:addState()">state</a></li>
								<li>a
									<a href="javascript:addPseudostate()">pseudostate</a>(<select id="pseudostate">
										<option>initial</option>
										<option>deepHistory</option>
										<option>shallowHistory</option>
										<option>join</option>
										<option>fork</option>
						<!--	TODO
										<option>junction</option>
						-->
										<option>choice</option>
										<option>entrypoint</option>
										<option>exitpoint</option>
										<option>terminate</option>
									</select>)</li>
								<li id="internalTransition">an <a href="javascript:addInternalTransition()">internal transition</a></li>
								<li id="entryOrExit">an <a href="javascript:addEntry()">entry</a>, <a href="javascript:addDoActivity()">doActivity</a>, or <a href="javascript:addExit()">exit</a></li>
							</ul>
						</li>
						<li id="addATransition">add a
							<a top href="javascript:addTransition()">transition</a>(<select id="sourceState"></select>-><select id="targetState"></select>)
						</li>
						<li>add a
							<a top href="javascript:addObject(false)">passive</a>
							or an
							<a top href="javascript:addObject(true)">active</a>
							object
						</li>
						<li id="inputBlock" style="display: none">edit the clicked element:
							<input id="textInput"/>
							<button id="inputOk">Ok</button>
							<button onclick="javascript:hide(inputBlock)">Cancel</button>
						</li>
					</ul>
	`;
	document.getElementById('inputOk').onclick = okListener;
	textInput = document.getElementById('textInput');
	textInput.onkeypress = (e) => {
		if(e.keyCode === 13) {
			okListener(e);
		}
	};
	contextStates = document.getElementById("contextState");
	contextStates.onchange = () => {
		const s = getSelected(contextStates);
		if(s) {
			[internalTransition, entryOrExit].forEach((e) => {
				if(s.split(".").length < 2) {
					hide(e);
				} else {
					show(e);
				}
			});
		}
	};
	sourceStates = document.getElementById("sourceState");
	sourceStates.onchange = () => {
		var on = getSelected(sourceStates)?.split(".")[0];
		Array.prototype.forEach.call(targetStates.options, (o) => {
			o.disabled = !o.innerText.startsWith(on);
		});
		targetStates.selectedIndex = Array.prototype.findIndex.call(targetStates.options, o => !o.disabled);
	};
	targetStates = document.getElementById("targetState");
	pseudostateSelect = document.getElementById("pseudostate");
	inputBlock = document.getElementById('inputBlock');
}
var contextStates;
var sourceStates;
var targetStates;
var pseudostateSelect;
var textInput;
var inputBlock;

// Update the lists of states used for edition
export function updateStates() {
	const contextStatesSel = getSelected(contextStates);
	const sourceStatesSel = getSelected(sourceStates);
	const targetStatesSel = getSelected(targetStates);
	contextStates.innerHTML = '';
	sourceStates.innerHTML = '';
	targetStates.innerHTML = '';
	function process(region) {
		(region.states || []).forEach(state => {
			if(state.kind != 'terminate') {
				addOption(sourceStates, model.stateFullName(state));
			}
			if(state.kind != 'initial') {
				addOption(targetStates, model.stateFullName(state));
			}
			if(!state.kind) {
				addOption(contextStates, model.stateFullName(state));
			}
			process(state);
		});
	}
	var activeObjects = displayedObjects.filter(obj => model.isActive(obj));
	activeObjects.forEach(o => {
		addOption(contextStates, o.name);
		process(o);
	});
	if(hasElements(activeObjects)) {
		show(addToState);
	} else {
		hide(addToState);
	}
	if(hasElements(targetStates)) {
		show(addATransition);
	} else {
		hide(addATransition);
	}
	function setSel(select, value) {
		const index = Array.prototype.map.call(select.options, (e,i) => ({i: i, e: e})).find(o => o.e.innerText == value)?.i;
		select.selectedIndex = index;
	}
	// restore selection when possible
	setSel(contextStates, contextStatesSel);
	setSel(sourceStates, sourceStatesSel);
	setSel(targetStates, targetStatesSel);
	contextStates.onchange();
	sourceStates.onchange();
	updateExport(model);
}

function esc(s) {
	return s
		.replace(/\\/g, "\\\\")
		.replace(/\n/g, "\\n")
	;
}
function unesc(s) {
	return s
		.replace(/\\n/g, '\n')
		.replace(/\\\\/g, '\\')
	;
}

// Begin edition
var editedElement = undefined;
var editedProperty = undefined;
var update = undefined;
var okListener = (e) => {
	editedProperty && (editedElement[editedProperty] = unesc(textInput.value));
	editedProperty = undefined;
	update && update(textInput.value);
	update = undefined;
	hide(inputBlock);
	updateFig();
	updateStates();	// TODO: only if editing states or objects?
};

function editTransition(transition, part) {
	transition = model.getTransition(transition);
	var value = transition[part] || '';
	textInput.value = esc(value);
	editedElement = transition;
	editedProperty = part;
	update = undefined;
	showInputBlock();
//	updateExport();
}

function showInputBlock() {
	inputBlock.style = '';//display: inline';
	textInput.focus();
}

// editStateProperty
function editProperty(stateName, propertyName) {
	var state = model.getState(stateName);
	editedElement = state;
	editedProperty = propertyName;
	textInput.value = esc(state[propertyName] || '');
	update = undefined;
	showInputBlock();
}

function addEntry(stateFQN) {
	editProperty(stateFQN || getSelected(contextStates), 'entry');
}

function addExit(stateFQN) {
	editProperty(stateFQN || getSelected(contextStates), 'exit');
}

function addDoActivity(stateFQN) {
	editProperty(stateFQN || getSelected(contextStates), 'doActivity');
}

// TODO: check that there is no name collision?
function editState(stateName) {
	var state = model.getState(stateName);
	textInput.value = state.name;
	editedElement = state;
	editedProperty = 'name';
	var oldName = state.name;
	update = function(newName) {
		if(newName) {
			delete state.region.stateByName[oldName];
			state.region.stateByName[newName] = state;
		} else {
			console.log("Warning: cancelling state name change because it cannot be empty or undefined");
			state.name = oldName;
		}
	}
	showInputBlock();
}

function getOperation(opName) {
	var parts = opName.split('.');
	var obj = model.getObject(parts[0]);
	var opName = parts[1];
	return obj.operationByName[opName];
}
function editOperation(opName) {
	var op = getOperation(opName);
	textInput.value = op.name;
	editedElement = op;
	editedProperty = 'name';
	var oldName = op.name;
	update = function(newName) {
		if(newName) {
			delete op.class.operationByName[oldName];
			op.class.operationByName[newName] = op;
		} else {
			console.log("Warning: cancelling operation name change because it cannot be empty or undefined");
			op.name = oldName;
		}
	};
	showInputBlock();
}
function editOperationPart(opName, part) {
	var op = getOperation(opName);
	textInput.value = esc(op[part] || '');
	editedElement = op;
	editedProperty = part;
	update = undefined;
	showInputBlock();
}
function editParameters(opName) {
	var op = getOperation(opName);
	textInput.value = (op.parameters || []).map(param =>
		typeof param === "string" ?
			param
		:	`${param.name} : ${param.type}`
	).join(", ");
	update = function(newValue) {
		op.parameters = newValue.split(",").map(param => {
			const parts = param.split(":").map(e => e.trim());
			if(parts.length >= 2) {
				return {name: parts[0], type: parts[1]}
			} else {
				return parts[0];
			}
		});
	};
	showInputBlock();
}
function editPropertyPart(objName, propName, part) {
	const obj = model.getObject(objName);
	const prop = obj.propertyByName[propName];
	textInput.value = esc(prop[part] || '');
	editedElement = prop;
	editedProperty = part;
	update = undefined;
	showInputBlock();
}
function editPropertyName(objName, propName) {
	const obj = model.getObject(objName);
	const prop = obj.propertyByName[propName];
	textInput.value = propName;
	editedElement = prop;
	editedProperty = 'name';
	update = function(newName) {
		if(newName) {
			delete obj.propertyByName[propName];
			obj.propertyByName[newName] = prop;
		} else {
			console.log("Warning: cancelling property name change because it cannot be empty or undefined");
			prop.name = propName;
		}
	};
	showInputBlock();
}
function editMethod(opName) {
	var op = getOperation(opName);
	textInput.value = op.method || '';
	editedElement = op;
	editedProperty = 'method';
	update = undefined;
	showInputBlock();
}

// TODO: check that there is no name collision
function editObject(objectName) {
	var obj = model.getObject(objectName);
	textInput.value = obj.name;
	editedElement = obj;
	editedProperty = 'name';
	var oldName = obj.name;
	update = (newName) => {
		function updateConfig(config) {
			config.currentState[newName] = config.currentState[oldName];
			delete config.currentState[oldName];
		}
		if(newName) {
			if(newName !== oldName) {
				updateConfig(builtInEngine.configuration);
				sysHistory.forEach(step => {
					updateConfig(step.configuration);
					step.messages.forEach(msg => {
						if(msg.source == oldName) {
							msg.source = newName;
						}
						if(msg.target == oldName) {
							msg.target = newName;
						}
					});
				});
				updateObjects();
			}
		} else {
			console.log("Warning: cancelling object name change because it cannot be empty or undefined");
			obj.name = oldName;
		}
	}
	showInputBlock();
}
function editObjectProperty(objectName, propName) {
	var obj = model.getObject(objectName);
	textInput.value = esc(obj[propName] || '');
	editedElement = obj;
	editedProperty = propName;
	update = undefined;
	showInputBlock();
}

function addVertex(vertex, regionName) {
	var region = regionName ? model.getState(regionName) : model.getState(getSelected(contextStates));
	var newName;
	region.stateByName = region.stateByName || {};
	while(region.stateByName[newName = `S${stateCounter++}`]);
	vertex.name = newName;
	vertex.region = region;
	region.states = region.states || [];
	region.states.push(vertex);
	region.stateByName[vertex.name] = vertex;
}

var stateCounter = 0;
function addState(regionFQN) {
	addVertex({
		incoming: [],
		outgoing: [],
	}, regionFQN);
	updateFig();
	updateStates();
}
function addPseudostate(regionFQN, kind) {
	kind = kind || getSelected(pseudostateSelect);
	addVertex({
		type: 'Pseudostate',
		kind: kind,
		incoming: [],
		outgoing: [],
	}, regionFQN);
	updateStates();
	updateFig();
}

var objectCounter = 1;
function addObject(isActive) {
	var newName;
	while(model.getObject(newName = `NewObject${objectCounter++}`));
	var object = isActive ?
		buildModel({
			name: newName,
			stateByName: {
				init: {
					type: 'Pseudostate',
					kind: 'initial',
				},
			},
			transitionByName: {},
		}) : {name: newName};
	model.objects.push(object);
	if(isActive) {
		model.setInitialState(object);
	}
	if(getSelected(objectSelect) == ALL_OBJECTS) {
		displayedObjects.push(object);
		updateFig();
	} else {
		switchToObject(newName);
	}
	updateObjects();
	updateStates();
}
function setActor(objectName, isActor) {
	model.getObject(objectName).isActor = isActor;
	updateFig();
}
function makePassive(objectName) {
	var object = model.getObject(objectName);
	delete object.stateByName;
	delete object.transitionByName;
	delete object.states;
	delete object.transitions;
	delete builtInEngine.configuration.currentState[object.name];
	updateStates();
	updateFig();
}
export function makeObserver(objectName) {
	const object = model.getObject(objectName);
	object.isObserver = true;
	updateFig();
}
export function makeNonObserver(objectName) {
	const object = model.getObject(objectName);
	object.isObserver = false;
	updateFig();
}
export function makeActive(objectName) {
	var object = model.getObject(objectName);
	object.stateByName = {
		init: {
			name: 'init',
			type: 'Pseudostate',
			kind: 'initial',
			region: object,
			outgoing: [],
		},
	};
	object.transitionByName = {};
	object.states = [object.stateByName.init];
	object.transitions = [];
	builtInEngine.configuration.currentState[object.name] = [model.getInitial(object)];
	updateStates();
	updateFig();
}
function newName(base, isOk) {
	var index = 1;
	var ret;
	while(!isOk(ret = base + index)) index++;
	return ret;
}
function addOperation(objectName) {
	var object = model.getObject(objectName);
	object.operations = object.operations || [];
	object.operationByName = object.operationByName || {};
	var opName = newName("newOperation", n => !object.operations.find(o => o.name == n));
	var op = {
		name: opName,
		class: object,
	};
	object.operations.push(op);
	object.operationByName[op.name] = op;
	updateFig();
	updateExport(model);
}
function addProperty(objectName) {
	var object = model.getObject(objectName);
	object.propertyByName = object.propertyByName || {};
	var propName = newName("newProperty", n => !object.propertyByName[n]);
	var prop = {
		name: propName,
		class: object,
	};
	object.propertyByName[prop.name] = prop;
	updateFig();
	updateExport(model);
}
function removeObject(objectName) {
	if(model.objects.length === 1) {
		alert("Cannot remove an object when there is only one left in a model.");
	} else {
		var obj = model.getObject(objectName);
		remove(model.objects, obj);
		model.connectors.filter(c => c.ends.includes(obj)).forEach(c => {
			remove(model.connectors, c);
			delete model.connectorByName[c.name];
		});
		if(displayedObjects.includes(obj)) {
			remove(displayedObjects, obj);
			if(displayedObjects.length == 0) {
				if(defaultsToAllObjects) {
					displayedObjects = model.objects.slice();
				} else {
					displayedObjects = [model.objects[0]];
				}
			}
			updateFig();
		}
		updateObjects();
		updateStates();
		updateExport(model);
	}
}
function removeTransition(transition) {
	transition = model.getTransition(transition);
	removeTransitionInternal(transition);
	updateFig();
	updateExport(model);
}
function removeTransitionInternal(transition) {
	remove(transition.region.transitions, transition);
	delete transition.region.transitionByName[transition.name];
	if(transition.isInternal) {
		delete transition.region.internalTransitions[transition.name.replace(/^__internal__/, '').replace(/__$/, '')];
	}
	remove(transition.source.outgoing, transition);
	remove(transition.target.incoming, transition);
}
function removeState(stateName) {
	var state = model.getState(stateName);
	// slice(0) is there to make a copy, so that we do not directly iterate on the array we are modifying
	(state.incoming || []).slice(0).forEach(trans => {
		removeTransitionInternal(trans);
	});
	(state.outgoing || []).slice(0).forEach(trans => {
		removeTransitionInternal(trans);
	});
	remove(state.region.states, state);
	delete state.region.stateByName[state.name];
	updateFig();
	updateStates();
}
function removeOperation(opName) {
	var op = getOperation(opName);
	remove(op.class.operations, op);
	delete op.class.operationByName[op.name];
	updateFig();
	updateExport(model);
}
function removeProperty(objName, propName) {
	const obj = model.getObject(objName);
	delete obj.propertyByName[propName];
	updateFig();
	updateExport(model);
}


var transitionCounter = 0;
function nextTransName() {
	return `T${transitionCounter++}`;
}
function addTransition() {
	if(targetStates.selectedIndex < 0) return;
	function getSelectedState(select) {
		return model.getState(getSelected(select));
	}
	const src = getSelectedState(sourceStates);
	const tgt = getSelectedState(targetStates);
	//console.log(src);
	createTransition(src, tgt);
}
function createTransition(src, tgt) {
	var region = src.region;
	var newName;
	region.transitionByName = region.transitionByName || {};
	while(region.transitionByName[newName = nextTransName()]);
	var ret = {name: newName, source: src, target: tgt, region: region};
	region.transitions = region.transitions || [];
	region.transitions.push(ret);
	region.transitionByName[ret.name] = ret;
	src.outgoing = src.outgoing || [];
	src.incoming = src.incoming || [];
	src.outgoing.push(ret);
	tgt.incoming.push(ret);
	updateFig();
	updateExport(model);
}
let transitionSourceState;
function transitionFrom(stateFQN) {
	transitionSourceState = stateFQN;
}
function transitionTo(stateFQN) {
	const src = model.getState(transitionSourceState);
	const tgt = model.getState(stateFQN);
	if(src.region == tgt.region || (tgt.kind === "shallowHistory" && tgt.region.region == src.region)) {
		createTransition(src, tgt);
	} else {
		alert("Cannot create this transition: source and target states are not in the same region.");
	}
}
function addInternalTransition(stateFQN) {
	const state = model.getState(stateFQN || getSelected(contextStates));
	var newName;
	state.transitionByName = state.transitionByName || {};
	while(state.transitionByName[newName = nextTransName()]);
	var ret = {name: newName, source: state, target: state, region: state, isInternal: true};

	//state.transitions = state.transitions || [];
	//state.transitions.push(ret)

	state.transitionByName[ret.name] = ret;

	state.internalTransitions = state.internalTransitions || {};
	state.internalTransitions[ret.name] = ret;
	updateFig();
}

exportSymbols(
	(symbol) => eval(symbol),

	// for actions
	// TODO: register them as listeners instead of exporting them globally?
	"addState",
	"addPseudostate",
	"addTransition",
	"addInternalTransition",
	"addObject",
	"addEntry",
	"addExit",
	"addDoActivity",
	"editState",
	"editTransition",
	"removeTransition",
	"removeState",
	"removeObject",
	"makeObserver",
	"makeNonObserver",
	"makeActive",
	"makePassive",
	"setActor",
	"addOperation",
	"addProperty",
	"removeProperty",
	"removeOperation",
	"editMethod",
	"editOperation",
	"editParameters",
	"editOperationPart",
	"editProperty",
	"editPropertyName",
	"editPropertyPart",
	"editObject",
	"editObjectProperty",
	"transitionTo",
	"transitionFrom",
);
