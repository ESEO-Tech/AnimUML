import {hasElements, last} from './Utils.js';
import {buildModel} from './ImportFromAnimUML.js';

export class Model {
	constructor(model, handlers) {
const afterRegex = /after\(([^)]*)\)/;
const whenRegex = /when\(([^)]*)\)/;
		model = buildModel(model);
		if(!model.objects) {
			const oldModel = model;
			model = {name: oldModel.name, objects: [model]};
			if(oldModel.settings) {
				model.settings = oldModel.settings;
				delete oldModel.settings;
			}
			if(oldModel.historyCauses) {
				model.historyCauses = oldModel.historyCauses;
				delete oldModel.historyCauses;
			}
		}
		Object.assign(this, model);
		Object.assign(this, {
			// accessors and operations needing access to currentModel
/*
			get name() {
				return model.name;
			},
			get objects() {
				return model.objects;
			},
			get connectors() {
				return model.connectors;
			},
			// a priori only for Editor to delete a connector
			// TODO: provide a deleteConnector operation instead?
			get connectorByName() {
				return model.connectorByName;
			},
*/
			getObject(objectName) {
				return this.objects.find(o => o.name == objectName);
			},

			getObjectClass(object) {
				if(object.class) {
					return model.classes?.[object.class];
				} else {
					return undefined;
				}
			},

			getConnectors(object) {
				return this.connectors?.filter(c => c.ends.includes(object)) || [];
			},
			getBehavior(region) {
				if(hasElements(region.states)) {
					return region;
				} else {
					return this.getObjectClass(region);
				}
			},
			getInitial(region) {
				const ret = this.isActive(region) ? this.getBehavior(region).states.find(state => state.kind == 'initial') : undefined;
				return ret;
			},
			getState(stateName) {
				var parts = stateName.split('.')
				var ret = this.getObject(parts[0]);
				ret = this.getBehavior(ret);
				parts = parts.slice(1);
				function getRegionState(region, name) {
					return region.states.find(state => state.name == name);
				}
				parts.forEach(part => {
					ret = ret.stateByName[part];
				});
				return ret;
			},

			getTransition(transName) {
				var parts = transName.split('.')
				var ret = this.getObject(parts[0]);
//console.log("getTransition", transName, parts, ret.name, Object.keys(ret.transitionByName))
				parts = parts.slice(1);
				parts.slice(0, parts.length - 1).forEach(part => {
					ret = ret.stateByName[part];
//console.log(ret.name, Object.keys(ret.internalTransitions))
				});
				ret = ret?.transitionByName[last(parts).replace(/__DOT__/g, ".")];
				if(!ret) {
					console.log("Could not find transition: ", transName);
				}
				return ret;
			},

			getRelativeName(obj, otherObj) {
				const connector =  (this.connectors || []).find(c =>
					c.ends.includes(obj) && c.ends.includes(otherObj)
				);
				if(connector) {
					if(obj == connector.ends[0]) {
						return connector.endNames?.[1] || otherObj.name;
					} else {
						return connector.endNames?.[0] || otherObj.name;
					}
				} else {
					// return absolute name if there is no relative name
					return otherObj.name;
				}
			},
			getObjectRelative(obj, objName) {
				//console.log(obj.name, ".getObjectRelative(", objName, ")");
											// comparing object names in case one has been translated (e.g., with toExplicit)
				const ret = (this.connectors || []).filter(c => c.ends.some(e => e.name === obj.name)).map(c => {
					const endNames = c.endNames || c.ends.map(o => o.name);
					const selfEndIndex = c.ends.findIndex(o => o.name === obj.name);
					switch(selfEndIndex)  {
						case 0:
							if(objName === endNames[1]) {
								return c.ends[1];
							}
							break;
						case 1:
							if(objName === endNames[0]) {
								return c.ends[0];
							}
							break;
						default:
							return undefined;
							break;
					}
				}).filter(e => e);
/*
				if(debugEvalActions) {
					console.log(obj.name, ".getObjectRelative(", objName, ") : ", ret);
				}
*/
				if(ret.length == 1) {
					return ret[0];
				} else if(ret.length == 0) {
					return undefined;
				} else {
					return ret;
				}
			},

			// operations operating only on their arguments, but still specific to the chosen model representation
			fullState(state) {
				if(state.region) {
					var ret = this.fullState(state.region);
					ret.push(state);
					return ret;
				} else {
					return [];	// do not include the top-level StateMachine
				}
			},

			isAfter(transition) {
				return transition.trigger && transition.trigger.match(afterRegex);
			},
			noEventTrigger(transition) {
				return (!transition.trigger) || this.isAfter(transition) || transition.trigger.match(whenRegex);
			},
			isActive(object) {
				return hasElements(object.states) || hasElements(this.getObjectClass(object)?.states);
			},
			isPort(object) {
				return object.type == "Port";
			},
			stateFullName(state) {
//console.log(`stateFullName(${state})`);
//console.log(`stateFullName(${state.name})`);
				return `${state.region ? `${this.stateFullName(state.region)}.` : ''}${state.name}`;
			},

			transFullName(transition) {
				return `${this.stateFullName(transition.region)}.${transition.name.replace(/\./g, "__DOT__")}`;
			},
			fullStateDisplay(states) {
				if(states) {
					return states.map(state => state.name).join('.');
				} else {
					return states;
				}
			},

			getOtherEnd(connector, object) {
				return connector.ends.find(end => end != object);
			},
			getStateObject(state) {
				var ret = state.region;
				while(ret.region) ret = ret.region;
				return ret;
			},
			getTransObject(trans) {
				var ret = trans.region;
				while(ret.region) ret = ret.region;
				return ret;
			},

			// for engine?
			navigateThroughPorts(source, initialTarget, debug) {
				const traversedConnectors = [];
				const traversedProperties = [];
				const traversedObjects = [];
				var tag;
				var prev = source;
				var targetObj = initialTarget;
				// navigate along connectors between ports
				while(this.isPort(targetObj)) {
					const connectors = this.getConnectors(targetObj);
					// assert connectors.length == 2
					const connector = connectors.find(c => !c.ends.includes(prev));	// TODO: compare object name instead of object identity?
					traversedConnectors.push(connector);
//console.log("HOHO", connector.ends.indexOf(targetObj));
					//traversedProperties.push(connector.endNames ? connector.endNames[1-connector.ends.indexOf(targetObj)] : targetObj.name);
					prev = targetObj;
					targetObj = this.getOtherEnd(connector, targetObj);
					traversedObjects.push(targetObj);
					traversedProperties.push(connector.endNames ? connector.endNames[connector.ends.indexOf(targetObj)] : targetObj.name);
					if(connector.incomingTag && connector.ends[0] == targetObj) {
						tag = connector.incomingTag;
					}
					if(connector.outgoingTag && connector.ends[1] == targetObj) {
						tag = connector.outgoingTag;
					}
					if(debug) {
						console.log("Navigating from ", prev.name, " through ", connector.name, " to ", targetObj.name);
					}
				}
				return {target: targetObj, tag: tag, traversedConnectors, traversedProperties, traversedObjects};
			},
			// a priori only for Editor
			// TODO: should be in configuration & configuration should listen to object changes rather than be notified
			// or this could be considered a callback notification from objects that modify the model
			setInitialState(object) {
				handlers?.onaddobject?.(object);
			},
	// constants
	get afterRegex() {
		return afterRegex;
	},
	get whenRegex() {
		return whenRegex;
	},
		});
		handlers?.onload?.(model);
	}
}
