import {forEachEntry, hasElements} from './Utils.js';

export function exportModel(model) {
	var connectedObjects = Object.values(model.connectorByName || {}).flatMap(c => c.ends.map(e => e.name || e));
	var classes;
	if(typeof model.classes === "string") {
		classes = model.classes;
	} else {
		classes = Object.entries(model.classes || {}).map(([className, cl]) => {
			const ret = exportRegion(cl);
			copyFeatures(ret, cl);
			return [className, ret];
		});
		classes = hasElements(classes) ? Object.fromEntries(classes) : undefined;
	}
	var objects = model.objects ? model.objects.map(exportObject).slice(0).filter(e =>
					// exclude connected empty objects
					!(
						JSON.stringify(e).match(/^{"name":"[^"]*"}$/) && connectedObjects.includes(e.name)
					)
				) : undefined;
	var ret = {
		name: model.name,
		classes: classes,
		// TODO: only add objects that have no connector or that have operations
		objects: hasElements(objects) ? objects : undefined,
	};
	Object.entries(model.connectorByName || {}).forEach(([cName, c]) => {
		ret.connectorByName = ret.connectorByName || {};
		var outc = {
			ends: c.ends.map(e => e.name || e),
		};
		copy(outc, "endNames", c);
		copy(outc, "incomingTag", c);
		if(c.possibleMessages) {
			var hasForward = hasElements(c.possibleMessages.forward);
			var hasReverse = hasElements(c.possibleMessages.reverse);
			if(hasForward || hasReverse) {
				outc.possibleMessages = {};
				if(hasForward) {
					outc.possibleMessages.forward = c.possibleMessages.forward.slice();
				}
				if(hasReverse) {
					outc.possibleMessages.reverse = c.possibleMessages.reverse.slice();
				}
			}
		}
		ret.connectorByName[cName] = outc;
	});
	if(model.interactions) {
		ret.interactions = model.interactions;
	}
	if(model.watchExpressions) {
		ret.watchExpressions = model.watchExpressions;
	}
	if(model.LTLProperties) {
		ret.LTLProperties = model.LTLProperties;
	}
	if(model.settings) {
		ret.settings = model.settings;
	}
	return ret;
}

function copy(target, name, source) {
	if(name in source && source[name] != null) {
		target[name] = source[name];
	}
}
export function exportObject(obj) {
	var ret = exportRegion(obj, (ret) => {
		copy(ret, "class", obj);
		copy(ret, "type", obj);	// e.g., Port
		copy(ret, "isActor", obj);
		copy(ret, "isObserver", obj);
	});
	copy(ret, "comment", obj);
	copy(ret, "behavior", obj);	// TODO: we should not serialize both "behavior" and state machine attributes (stateByName, transitionByName) because "behavior" will supersede them
					// Also, if the state machine has been edited, then behavior will be obsolete (until we serialize state machines to "behavior"
	copy(ret, "features", obj);	// similar remark
	copyFeatures(ret, obj);
	return ret;
}

function copyFeatures(ret, obj) {
	forEachEntry(obj.operationByName, (opName, op) => {
		ret.operationByName = ret.operationByName || {};
		var newOp = {};
		copy(newOp, "method", op);
		copy(newOp, "parameters", op);
		copy(newOp, "private", op);
		copy(newOp, "comment", op);
		copy(newOp, "comments", op);
		copy(newOp, "isOperation", op);
		copy(newOp, "returnType", op);
		ret.operationByName[opName] = newOp;
	});
	forEachEntry(obj.propertyByName, (propName, prop) => {
		ret.propertyByName = ret.propertyByName || {};
		var newProp = {};
		copy(newProp, "private", prop);
		copy(newProp, "type", prop);
		copy(newProp, "defaultValue", prop);
		copy(newProp, "comment", prop);
		copy(newProp, "comments", prop);
		ret.propertyByName[propName] = newProp;
	});
}

// Transform graph into tree ready for JSON stringification
// It is only possible to export a pre-buildModel tree if it follows the default notation (e.g., using Transition.{source,target} instead of State.{incoming,outgoing})
function exportRegion(region, fill) {
	function exportRegionInternal(region) {
		var ret = {};
		function getStateByName() {
			return ret.stateByName = ret.stateByName || {};
		}
		function getTransitionByName() {
			return ret.transitionByName = ret.transitionByName || {};
		}
		var emptyStates = {};
		Object.entries(region.stateByName || {}).forEach(([name, state]) => {
			var s = {};
			copy(s, 'entry', state);
			copy(s, 'exit', state);
			copy(s, 'doActivity', state);
			copy(s, 'type', state);
			copy(s, 'kind', state);
			copy(s, 'comment', state);
			Object.assign(s, exportRegionInternal(state));
			function getInternalTransitions() {
				return s.internalTransitions = s.internalTransitions || {};
			}
			Object.entries(state.internalTransitions || {}).forEach(([name, trans]) => {
				const newTrans = {};
				copy(newTrans, "trigger", trans);
				copy(newTrans, "ports", trans);
				copy(newTrans, "guard", trans);
				copy(newTrans, "effect", trans);
				copy(newTrans, "comment", trans);
				getInternalTransitions()[name] = newTrans;
			});
			if(Object.entries(s).length > 0) {
				getStateByName()[name] = s;
			} else {
				emptyStates[name] = s;
			}
		});
		Object.entries(region.transitionByName ||{}).filter(([name, trans]) =>
			!trans.isInternal
		).forEach(([name, trans]) => {
			// Transform a state reference into a String (unless it is already one)
			function deResolve(e) {
				if(typeof(e) == 'string') {
					return e;
				} else {
					var ret = e.name;
					var r = e.region;
					// TODO: handle the case where we also have to go down into another region
					// (e.g., test with a transition from a substate of a composite state to a substate of another composite state)
					if(r.region) {	// in case trans is an internal transition not marked as such (e.g., after TestCases's setup for CruiseControlv4)
						while(r !== trans.region) {
							ret = `${r.name}.${ret}`
							r = r.region;
						}
					}
					return ret;
				}
			}
			var source = deResolve(trans.source);
			var target = deResolve(trans.target);
			delete emptyStates[source];
			delete emptyStates[target];

			const newTrans = {source, target};
			copy(newTrans, "trigger", trans);
			copy(newTrans, "ports", trans);
			copy(newTrans, "guard", trans);
			copy(newTrans, "effect", trans);
			copy(newTrans, "comment", trans);
			getTransitionByName()[name] = newTrans;
		});
		Object.keys(emptyStates).forEach(stateName => {
			getStateByName()[stateName] = {};
		});
		return ret;
	}
	var ret = {name: region.name};
	fill?.(ret);
	return Object.assign(ret, exportRegionInternal(region));
}
