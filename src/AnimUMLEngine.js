import {forEachAsync, zip, debug, hasElements, remove, entryNameComparator, last, sortBy} from "./Utils.js";
import {DBM} from './DBM.js';
import {parser, stringify} from './JavaScriptActionLanguageParser.js';
import {Webots} from './Webots.js';

var debugAdditionalOperations = false;
var debugEvalActions = false;

const uninitValRegex = /^uninitializedValue\((.*)\)$/;

// Also add ignored={true,false} to Ether messages
//	ignored=false means a lost message that is still in the Ether, and can still be received
//	ignored=true means a lost message that is no longer in the Ether, and can no longer be received
// TODO: use the "ignored" attribute in sequence diagram, and possibly make messages explicitly ignorable

// TODO: add ^ and $?
export const msgSigRegex = /([^]*)\(([^)]*)\)/;
export class AnimUMLEngine {
	constructor(model, settings_) {
		this.name = "AnimUML";
		this.setModel(model);
		this.settings = settings_;
		//console.trace(settings_)
		const currentModel = model;

		// number of messages to keep in ether before adding a new one
		// TODO: consider making this the number of messages to keep in ether
		this.nbMessagesToKeepInEther = settings_?.nbMessagesToKeepInEther || 0;

		const self = this;
		this.extraOperations = {};
		this.extraOperations.__builtin__ = {
			Webots,
			DBM,
			plugin(name) {
				let ret = self.currentModel.settings?.plugins?.[name];
				if(ret) {
					if(typeof ret === "string") {
						ret = eval(ret);
					}
					//ret.init?.(self);
					return ret;
				} else {
					console.error("Plugin not found:", name);
				}
			},
			debug(v, ...args) {
				console.log("DEBUG:", ...args, v);
				return v;
			},
			get config() {
				return self.treeifyConfig(self.configuration);
			},
			get jsonConfig() {
				return JSON.stringify(self.treeifyConfig(self.configuration));
			},
			JSON: {
				stringify: JSON.stringify,
				parse: JSON.parse,
			},
			async digest(name, s, n = 32) {
				const h = await crypto.subtle.digest({name}, new TextEncoder().encode(s));
				const ret = [...new Uint8Array(h)].map(e => e.toString(16).padStart(2, "0")).join("");
				if(typeof n === "number") {
					return BigInt.asUintN(n, BigInt("0x0" + ret));
				} else {
					return ret;
				}
			},
		};
		// the following statement is necessary to be able to use this engine without calling reset first (i.e., by first calling setConfiguration),
		// which can for instance happen if it is part of a pool
		this.sysHistory = [];
	}

	close() {
		this.extraOperations.__builtin__.Webots.close?.();
	}
	setModel(model) {
		this.currentModel = model;

		for(const [name, def] of Object.entries(model?.settings?.plugins ?? {})) {
			console.log("Loading plugin:", name);
			const plugin = typeof def === "string" ?
				eval(def)
			:
				def
			;
			// remembering potentially evaluated plugin to avoid re-evaluating it each time it is used
			model.settings.plugins[name] = plugin;
			plugin.init?.(this);
		}

		// TODO: make this unnecessary, then remove
		globalThis.currentModel = model;
		let engine = this;
		this.EMIOperations = {
			FALSE: 0,
			TRUE: 1,
			getters: {
				params(obj) {
					if(debugAdditionalOperations) {
						console.log("params of ", obj);
					}
					var os = engine.configuration.objectState[obj.name];
					var opName = os.__OP_NAME__;
					var args = os.__ARGS__;
					// DONE:
					// - make params work even when no choice (e.g., when storing param value into attribute)
					// - find parameter names from receptions => operations (no receptions in AnimUML yet)
					// - translate args as params attribute only for EMI
					var ret = {};
					const op = obj.operationByName?.[opName];
					//console.log(opName, " => ", op);
					//console.log(obj, obj.operationByName)

					// make operation paramerter names accessible if available:
					if(op && op.parameters) {
						op.parameters.forEach((param, i) => {
							if(typeof param !== "string") {
								param = param.name;
							}
							ret[param] = args[i]
										* 1;	// assuming it is an integer
						});
					}
					// but they can be overriden by trigger parameter names
					Object.assign(ret, os.__NAMED_ARGS__);
					//console.log(configuration.objectState[obj.name].params)
					return ret;
				},
			},
			SEND(target, signal) {
				//Array.prototype.forEach.call(arguments, console.log);
				if(debugAdditionalOperations) {
					console.log("SEND(%s, %s, ...)", target == this ? "this" : target, signal.valueOfProperty);
				}
				target[signal.valueOfProperty].apply(this, Array.prototype.slice.call(arguments, 2));
			},
			GET_ACTIVE_PEER(target, propertyName) {
				if(debugAdditionalOperations) {
					console.log("GET_ACTIVE_PEER(%s, %s, ...)", target == this ? "this" : target, propertyName.valueOfProperty);
				}
				let objName = unescEMI(target.valueOfProperty);

				if(objName.startsWith("ROOT_")) {
					// TODO: make this more robust
					objName = objName.replace(/^ROOT_instMain\./, "").replace(/\./g, "_");
				}
				const obj = currentModel.getObject(objName);
				const navRet = currentModel.navigateThroughPorts(obj, currentModel.getObjectRelative(obj, propertyName.valueOfProperty), debugEvalActions);
				return navRet.target;
/*
				const rel = currentModel.getObjectRelative(target.__actualTargetObject__, objName);
				if(rel) {
					objName = rel.name;
				}
*/
				console.log(objName)
			},
			GET(target, propertyName) {
				var ret;
				var actualTarget = target;
				if(target.name && currentModel.getObject(target.name)) {
					actualTarget = engine.configuration.objectState[target.name];
				} else
/*
				if(propertyName == getObject(propertyName.name)) {
					// for the case of peer navigation
					ret = {valueOfProperty: propertyName.name};
				} else if(propertyName instanceof Array && propertyName.every(e => e == getObject(e.name))) {
					// for the case of multivalued peer navigation
					ret = propertyName.map(e => {valueOfProperty: e.name});
				} else {
				}
*/
				if(target != this && propertyName.valueOfProperty) {
					const n = unescEMI(target.valueOfProperty);
					// TODO: getObjectRelative, but we cannot do it here... maybe once we have refactored the whole evalActions system
					if(n == currentModel.getObject(n)?.name) {
						actualTarget = engine.configuration.objectState[n];
					}
				}
				if(ret == undefined) {
					ret = actualTarget[escAttr(propertyName.valueOfProperty)];
				}
				if(ret == undefined) {
					// TODO: this should probably be in evalActions
					ret = false;
				}
				if(debugAdditionalOperations) {
					console.log("GET(%s, %s) => ", target == this ? "this" : target, propertyName.valueOfProperty, ret);
				}
				return ret;
			},
			SET(target, propertyName, value) {
				if(debugAdditionalOperations) {
					console.log("SET(%s, %s, %s)", target == this ? "this" : target, propertyName.valueOfProperty, value);
				}
				if(target.name && currentModel.getObject(target.name)) {
					target = engine.configuration.objectState[target.name];
				}
				// setting the value in all cases (even if deleting afterwards), so that a message is stored in sysHistory
				target[escAttr(propertyName.valueOfProperty)] = value;
				if(!value) {
					// going back to default value, for models that assume default values
					// this should not be a problem for others
					delete target[escAttr(propertyName.valueOfProperty)];
				}
			},
			AT(target, index) {
				if(debugAdditionalOperations) {
					console.log("AT(%s, %s)", target, index);
				}
				return target[index];
			},
			CALL(target, operationName) {
				if(debugAdditionalOperations) {
					console.log("CALL(%s, %s, ...)", target == this ? "this" : target, signal.valueOfProperty);
				}
				return target[operationName.valueOfProperty].apply(this, Array.prototype.slice(arguments, 2));
			},
			INC(target, propertyName, value) {
				if(debugAdditionalOperations) {
					console.log("INC(%s, %s, %s)", target == this ? "this" : target, propertyName.valueOfProperty, value);
				}
				const propName = escAttr(propertyName.valueOfProperty);
				if(target[propName] + "" !== "undefined") {
					target[propName] += value;
				} else {
					target[propName] = value;
				}
				if(!target[propName]) {
					// going back to default value, for models that assume default values
					// this should not be a problem for others
					delete target[propName];
				}
			},
			DEC(target, propertyName, value) {
				if(debugAdditionalOperations) {
					console.log("DEC(%s, %s, %s)", target == this ? "this" : target, propertyName.valueOfProperty, value);
				}
				const propName = escAttr(propertyName.valueOfProperty);
				if(target[propName] + "" !== "undefined") {
					target[propName] -= value;
				} else {
					target[propName] = -value;
				}
				if(!target[propName]) {
					// going back to default value, for models that assume default values
					// this should not be a problem for others
					delete target[propName];
				}
			},
			IS_IN_STATE(target, state) {
				const ret = engine.configuration.currentState[unescEMI(target.valueOfProperty)].includes(currentModel.getState(unescEMI(state.valueOfProperty)));
				if(debugAdditionalOperations) {
					console.log("IS_IN_STATE('%o', '%o') : %o", target, state, ret);
				}
				return ret;
			},

			// @begin Only on completion steps
			// Remark: with the current AnimUMLEngine, there is almost always a completion step available (the last step)
			MESSAGES() {
				return engine.lastSteps().flatMap(step => step.messages);
			},
			SENT_MESSAGES() {
				return engine.lastSteps().flatMap(step => step.messages.filter(msg => msg.sentAt == step));
			},
			RECEIVED_MESSAGES() {
				return engine.lastSteps().flatMap(step => step.messages.filter(msg => msg.receivedAt == step));
			},
			IS_TRANSITION(trans) {
				return engine.lastSteps()[0]?.cause === "transition:" + trans.valueOfProperty;
			},
			// @end Only on completion steps

			EP_GET_FIRST(target) {
				if(debugAdditionalOperations) {
					console.log("EP_GET_FIRST('%o')", target);
				}
				// TODO: we currently suppose target is already an object, not a symbolic value
				const objName = target.name;
				let ret = engine.configuration.objectState[objName].__EP__?.[0];
				if(ret) {
					const sigName = ret.signature.replace(msgSigRegex, '$1');
					ret = `SIGNAL_${sigName}`;
					// TODO: return symbolic value?
					// actually, symbolic values are not comparable
				}
				return ret;
			},
			EP_IS_EMPTY(target) {
				if(debugAdditionalOperations) {
					console.log("EP_IS_EMPTY('%o')", target);
				}
				let objName;
				if(target == this) {
					objName = target.__actualTargetObject__.name;
				} else {
					objName = unescEMI(target.valueOfProperty);
					if(objName.startsWith("ROOT_")) {
						// TODO: make this more robust
						objName = objName.replace(/^ROOT_instMain\./, "").replace(/\./g, "_");
					}
					const rel = currentModel.getObjectRelative(target.__actualTargetObject__, objName);
					if(rel) {
						objName = rel.name;
					}
				}
//*
				var etherTargets = Object.values(engine.configuration.ether).flatMap(e => e.map(e => e.target));
				var hasEtherMessage = etherTargets.includes(objName);
/**/
				return !hasElements(engine.configuration.objectState[objName].__EP__) && !hasEtherMessage;
			},
/*			// not really computable without an event pool size cap
			EP_IS_FULL(target) {
				if(debugAdditionalOperations) {
					console.log("EP_IS_FULL('%o')", target);
				}
				var objName = unescEMI(target.valueOfProperty);
				var etherTargets = Object.values(configuration.ether).flatMap(e => e.map(e => e.target));
				//TODO: compute isFull instead of isEmpty?
				var ret = !etherTargets.includes(objName);
				return ret;
			},
*/
			EP_CONTAINS(target, signalName) {
				if(debugAdditionalOperations) {
					console.log("EP_CONTAINS(%s, %s)", target.valueOfProperty, signalName.valueOfProperty);
				}
				const objName = unescEMI(target.valueOfProperty);
				let obj = engine.configuration.objectState[objName];
				if(!obj) {
					// attempt relative resolution
					obj = currentModel.getObjectRelative(target.__actualTargetObject__, objName);
				}
				const sigName = signalName.valueOfProperty.replace(/^SIGNAL_/, "");

				const sigRegex = new RegExp(String.raw`^${sigName}\(`);

				const inEther = engine.configuration.ether[sigName.replace(/^SIGNAL_/, "")]?.length > 0;
				return inEther || obj.__EP__?.some(msg =>
					msg.signature.match(sigRegex)
				) == true;
			},
			printf(fmt) {
				console.log.apply(console, arguments);
			},
		};
	}

	// AnimUML-specific operations
	copyConfig(conf) {
		var ret = Object.assign({}, conf);
		ret.currentState = {};
		Object.entries(conf.currentState).forEach(([objectName, currentState]) => {
			ret.currentState[objectName] = currentState.slice(0);
		});
		ret.histories = {};
		Object.entries(conf.histories).forEach(([fullStateName, history]) => {
			ret.histories[fullStateName] = history.slice(0);
		});
		ret.objectState = {};
		Object.entries(conf.objectState).forEach(([objectName, objectState]) => {
			ret.objectState[objectName] = {...objectState};
			if(objectState.__EP__) {
				ret.objectState[objectName].__EP__ = objectState.__EP__.slice(0);
			}
		});
		ret.ether = {...ret.ether};
		return ret;
	}

/*
	get configuration() {
		return this.configuration;
	}
	get sysHistory() {
		return this.sysHistory;
	}
	set sysHistory(value) {
		this.sysHistory = value;
	}
*/

	isActive(o) {
		return this.currentModel.isActive(o) && !o.isObserver;
	}
	serializeConfig(config) {
		try {
			return JSON.stringify(this.treeifyConfig(config));
		} catch(e) {
			console.log("Problem serializing configuration:",
				config
			);
			throw e;
		}
	}
	treeifyConfig(config, keepMessageSources) {
		function treeifyMessage(msg) {
			return {
				source: keepMessageSources ? msg.source : "[",	// keepMessageSources should be false to be equivalent to EMI, which does not keep message sources
				target: msg.target,
				signature: msg.signature,
				tag: msg.tag,
			};
		}
		var ret  = {
			currentState: {},
			histories: {},
			objectState:	Object.fromEntries(Object.entries(config.objectState).map(([objName, objState]) =>
						// make sure attributes are always in the same order
						[
							objName,
							Object.fromEntries(Object.entries(objState)
								.sort(entryNameComparator)
								.map(([propertyName, value]) =>
									propertyName === "__EP__" ?
										[propertyName, value.map(treeifyMessage)]
									:
										[propertyName, value]
								)
							)
						]
					).sort(
						// this sort is not necessary for AnimUML because objectState ordering is consistent
						// but it is useful when comparing with configurations produced with different engines (e.g., EMI)
						entryNameComparator
					)),
			ether: Object.fromEntries(
				Object.entries(config.ether).map(([trigger, msgs]) =>
					[
						trigger,
						msgs.map(treeifyMessage)
					]
				).sort(entryNameComparator)
			),
		};
		this.currentModel.objects.filter(o => this.isActive(o)).forEach(object => {
			ret.currentState[object.name] = config.currentState[object.name]?.map(s => this.currentModel.stateFullName(s));
		});
		Object.entries(config.histories || {}).forEach(([stateFQN, history]) => {
			ret.histories[stateFQN] = history.map(s => this.currentModel.stateFullName(s));
		});
		return ret;
	}
	addToEther(message) {
		if(this.settings?.disableEther) {return;}
		//console.trace("enableEventPools:", this.settings?.enableEventPools, ", message.target:", message.target);
		if(message.target && message.target !== "]" && this.settings?.enableEventPools) {
			const os = this.configuration.objectState[message.target];
			os.__EP__ = os.__EP__ || [];
			os.__EP__.push(message);
		} else {
			var trigger = message.signature.replace(msgSigRegex, '$1');
			//console.log(trigger);
			var msgs = this.configuration.ether[trigger] || [];
			if(this.settings?.keepOneMessagePerTrigger) {
				const limit = this.nbMessagesToKeepInEther == 0 ? msgs.length : -this.nbMessagesToKeepInEther;
				msgs.slice(0, limit).forEach(msg => {
					msg.ignored = true;
				});
				// TODO: use splice for in-place update instead?
				msgs = msgs.slice(limit);
			}
			message.ignored = false;
			msgs.push(message);
			this.configuration.ether[trigger] = msgs;
			//configuration.ether = [];	// for some tests, like state space exploration of ExemplesExplicites without ether
							// doing this here is now mostly obsolete, see how the ExemplesExplicites testCase overrides addToEther to 
							// this hack here might still be useful for interactive execution though
		}
	}
	removeFromEther(message) {
		var trigger = message.signature.replace(msgSigRegex, '$1');

		const ep = this.getEP(message.target);
		if(ep.some(msg => msg == message)) {
			if(ep.length === 1) {
				delete this.getObjectState(message.target).__EP__;
			} else if(this.settings?.autoIgnore) {
				TODO
			} else {
				// auto defer
				remove(ep, message);
			}
		} else {
			//console.log(trigger);
			var msgs = this.configuration.ether[trigger];
			if(msgs.length === 1) {
				delete this.configuration.ether[trigger];
			} else {
				remove(msgs, message);
			}
		}
	}
	getObjectState(objectName) {
		return this.configuration.objectState[objectName];
	}
	getEP(target) {
		return this.getObjectState(target).__EP__ || [];
	}
	findMessageInEP(event, target, ports) {
		const ret = this.getEP(target).find(msg => msg.signature.replace(msgSigRegex, "$1") === event && (!ports || ports.includes(msg.tag)));
		return ret;
	}
	findMessage(event, target, ports) {
		event = event.replace(msgSigRegex, "$1");
/*
		var ret = sysHistory.flatMap(s => s.messages).find(msg =>
			msg.signature == event && msg.target == ']' //&& !msg.receivedAt, but redundant
		);
		return ret;
*/
		var ret = this.findMessageInEP(event, target, ports);
		if(ret) {
			return ret;
		} else {
			// TODO: use ports in ether too
			var msgs = this.configuration.ether[event];
			if(msgs && msgs.length > 0) {
				if(target) {
					return msgs.find(msg => msg.target === ']' || msg.target === target && (!ports || ports.includes(msg.tag)));
				} else {
					return msgs[0];
				}
			} else {
				return undefined;
			}
		}
	}
	async backToInternal(index) {
		index = index + "";
		const parts = index.split(",");

		const prevl = last(sysHistory);

		const newSysHistory = [];
		let steps = this.sysHistory;
		while(parts.length > 1) {
			const stepIdx = parts.shift() * 1;
			newSysHistory.push(...steps.slice(0, stepIdx));
			const altIdx = parts.shift() * 1;
			const node =	stepIdx == 0	// only possible for the very first stepIdx
					?	steps
					:	steps[stepIdx - 1];
			const [oldMainIdx, alts] = [node.mainIdx, node.alts];
			const rest = steps.slice(stepIdx);
			node.mainIdx = oldMainIdx <= altIdx && hasElements(rest) ? altIdx + 1 : altIdx;
			steps = alts[altIdx];
			if(stepIdx == 0) {
				steps.alts = node.alts;
				steps.mainIdx = node.mainIdx;
			}
			// remove this alt because it is now in main history
			alts.splice(altIdx, 1);
			if(hasElements(rest)) {
				const idx = altIdx < oldMainIdx ? oldMainIdx - 1 : oldMainIdx;
				alts.splice(idx, 0, rest);
			}
		}
		index = parts[0];
		const alt = steps.splice(index);
		newSysHistory.push(...steps);
		const lastStep = last(steps);
		if(lastStep) {
			lastStep.alts = lastStep.alts || [];
			const oldMainIdx = lastStep.mainIdx;
			lastStep.mainIdx = 0;
			if(hasElements(alt)) {
				lastStep.alts.splice(oldMainIdx, 0, alt);
			}
		} else {
			// only possible for the very first index part
			console.assert(steps == this.sysHistory);
			steps.alts = steps.alts || [];
			const oldMainIdx = steps.mainIdx;
			steps.mainIdx = 0;
			if(hasElements(alt)) {
				steps.alts.splice(oldMainIdx, 0, alt);
			}
		}

		newSysHistory.alts = this.sysHistory.alts;
		newSysHistory.mainIdx = this.sysHistory.mainIdx;
		this.sysHistory = newSysHistory;

		const l = last(this.sysHistory);
		if(l) {
			this.configuration = this.copyConfig(l.configurationAfter);
			await this.settings?.onconfigchanged?.();
		} else {
			await this.reset();
			this.sysHistory = newSysHistory;
		}
	}
	isActivable(transition) {
		//return configuration.currentState[getTransObject(transition).name].includes(transition.source);
		// comparing full names to support execution while showing explicit state machines
		const obj = this.currentModel.getTransObject(transition);
		if(obj.isObserver) {
			return false;
		}
		var cs = this.configuration.currentState[obj.name];
		if(cs) {
			var lcs = last(cs);
			if(lcs.kind) {
				// If in a pseudostate, only direct outgoing transitions are activable, since normmally we should not stay there
				return this.currentModel.stateFullName(transition.source) === this.currentModel.stateFullName(lcs);
			} else {
				return cs.map(s => this.currentModel.stateFullName(s)).includes(this.currentModel.stateFullName(transition.source));
			}
		}
	}
	eventMatched(transition) {
		var msg;
		return this.currentModel.noEventTrigger(transition) || (!this.settings?.checkEvents && !this.settings?.isCheckedEvent?.(transition.trigger)) || this.findMessage(transition.trigger, this.currentModel.getTransObject(transition).name, transition.ports);
	}
	isCurrentState(state) {
		var ret = this.configuration.currentState[this.currentModel.getStateObject(state).name]?.map(s => this.currentModel.stateFullName(s)).includes(this.currentModel.stateFullName(state));
		//console.log(ret);
		return ret;
	}

	setInitialState(object) {
		//console.log("setInitialState(", object, ") = ", this.currentModel.getInitial(object))
		this.configuration.currentState[object.name] = [this.currentModel.getInitial(object)];
	}
	getFireable(object, filter) {
		filter = filter || ((t) => this.isFireable(t));
		const ret = this.configuration.currentState[object.name].flatMap(state => {
			return (state.outgoing || []).concat(Object.values(state.internalTransitions || {})).filter(filter)
		});
		return ret;
	}

	callOperation(opFullName, sourceName, sender) {
		// the operation might not exist as such, so getOperation is not usable here
		var parts = opFullName.split('.');
		var obj = currentModel.getObject(parts[0]);
		var opName = parts[1];
		var step = {
			cause: `operation:${opFullName}${sourceName ? `:${sourceName}` : (sender ? `:${sender.name}` : '')}`,
			activeObject: obj,	// not really
			configuration: this.copyConfig(this.configuration),
			messages: [],
		};
		var message = this.findMessage(opName, obj.name);
		var op = obj.operationByName && obj.operationByName[opName];
		// TODO: improve this. Currently, we consider that if there is a sourceName we should not match, but actually there are other cases...
		if(message && !sourceName && !sender) {
			message.receivedAt = step;
			message.target = obj.name;
			step.messages.push(message);
			this.removeFromEther(message);
		} else {
			message = {
				source: sourceName ? sourceName : (sender ? sender.name : '['),
				target: autoReceiveDisabled.checked ? "]" : obj.name,
				signature: `${opName}`,
				receivedAt: autoReceiveDisabled.checked ? undefined : step,
				sentAt: step,
			};
			step.messages.push(message);
			if(this.isActive(obj) && (!op || !op.method)) {
				// TODO: or use event pool?
				this.addToEther(message);
			}
		}
		let ret;
		if(op && op.method) {
			ret = this.evalActions(op.method, step, obj, this.extraOperations, this, false, true);
			//console.log("CALLOP", ret)
		}
		step.configurationAfter = this.copyConfig(this.configuration);
		this.sysHistory.push(step);
		return ret;
	}

	registerArguments(obj, trigger, args) {
		if(trigger.match(msgSigRegex)) {
			// the trigger specifies some argument names
			const paramString = trigger.replace(msgSigRegex, "$2").trim();
			if(paramString) {
				const params = paramString.split(",").map(e =>
					e.trim()
				);
				this.configuration.objectState[obj.name].__NAMED_ARGS__ = Object.fromEntries(
					zip(params, args.map(e =>
						e
						//*1	// to cast into a number... no longer necessary now that we use JSON.parse
							// TODO: keep actual values instead of serializing them in this way
					))
				);
			}
		}
	}
	// returns trigger message if any
	async fireInternal(trans, trustMe = false) {
		if(!this.isFireable(trans) && !trustMe) {
			console.error("Fired a non-fireable transition: ", this.currentModel.transFullName(trans));
			return;
		}
		this.configuration.histories = this.configuration.histories || {};
		this.configuration.objectState = this.configuration.objectState || {};
		var sm = this.currentModel.getTransObject(trans);
		this.configuration.objectState[sm.name] = this.configuration.objectState[sm.name] || {};
		var step = {
			cause: `transition:${this.currentModel.transFullName(trans)}`,
			activeObject: sm,
			configuration: this.copyConfig(this.configuration),
			messages: [],
		};
		var previousState = this.configuration.currentState[sm.name];
		if(trans.target.kind == 'shallowHistory') {
			var history = this.configuration.histories[this.currentModel.stateFullName(trans.target.region)];
			if(history) {
				//console.log(`HISTORY EXISTS FOR ${trans.target.region.name}`);
				this.configuration.currentState[sm.name] = history;
			} else {
				//console.log(`HISTORY DOES NOT EXIST FOR ${trans.target.region.name}`);
				this.configuration.currentState[sm.name] = this.currentModel.fullState(trans.target.region);
			}
		} else if(trans.isInternal) {
			// nothing to do
		} else {
			this.configuration.currentState[sm.name] = this.currentModel.fullState(trans.target);
		}
		// start substates by making their initial Pseudostate part of the current state
		while((last(this.configuration.currentState[sm.name]).states || []).length > 0) {
			this.configuration.currentState[sm.name].push(this.currentModel.getInitial(last(this.configuration.currentState[sm.name])));
		}


		var currentPathId = this.currentModel.stateFullName(this.configuration.currentState[sm.name][0]);
		var currentPath = [this.configuration.currentState[sm.name][0]];
		this.configuration.currentState[sm.name].slice(1).forEach(state => {
			const hasHistory = last(currentPath).states.some(s => s.kind === 'shallowHistory');
			currentPath.push(state);
			if(hasHistory) {
				this.configuration.histories[currentPathId] = currentPath.slice(0);
			}
			currentPathId += '.' + state.name;
		});

		var message;
		if(trans.trigger) {
			message = this.findMessage(trans.trigger, sm.name, trans.ports);
			if(message) {
				message.receivedAt = step;
				message.target = sm.name;
				step.messages.push(message);
				this.removeFromEther(message);
			} else {
				step.messages.push(
					{
						source: '[',
						target: sm.name,
						signature: trans.trigger,
						receivedAt: step,
					}
				);
			}
		}
		var currentState = this.configuration.currentState[sm.name].slice();
		// remove common states so that
		// - we do not exit states that we haven't actually left
		// - we do not enter states that we haven't actually left
		var i = 0;
		for(; i < currentState.length && i < previousState.length ; i++) {
			if(currentState[i] !== previousState[i]) {
				break;
			} else if(trans.source == currentState[i] && !trans.isInternal) {
				// external self-transitions must trigger exit and entry
				break;
			}
		}
		previousState = previousState.slice(i);
		currentState = currentState.slice(i);

		await forEachAsync(previousState.slice(0).reverse(), async state => {
			if(state.exit) {
				await this.evalActions(state.exit, step, sm, this.extraOperations, this);
			}
		});
		if(message) {
			// TODO: store actual arguments in message to keep types, rather than storing them only in the signature
			const parts = message.signature.match(msgSigRegex);
			if(parts) {
				this.configuration.objectState[sm.name].__OP_NAME__ = parts[1];
				// TODO: fix problem when a string argument contains a comma
				const args = parts[2].trim() ? parts[2].split(",").map(arg => {
					return JSON.parse(arg.trim())
				}) : [];
				this.configuration.objectState[sm.name].__ARGS__ = args;
				this.registerArguments(sm, trans.trigger, args);
				//console.log("namedArgs(" + trans.region.name + "." + trans.name + "): ", this.configuration.objectState[sm.name].__NAMED_ARGS__);
			}
		}
		if(trans.effect) {
			//console.log("Executing transition (",  currentModel.transFullName(trans), ") effect:", trans.effect);
			const asAsync = this.nextEffectAsAsync == true;
			const asFunction = this.nextEffectAsFunction == true;
			this.nextEffectAsFunction = this.nextEffectAsAsync = false;
			const result = this.evalActions(trans.effect, step, sm, this.extraOperations, this, asAsync, asFunction);
			this.effectResult = result instanceof Promise ? await result : result;
			//console.log(this.currentModel.transFullName(trans), "result", this.effectResult)
		}
		var target = last(this.configuration.currentState[sm.name]);
		if(!target.kind) {
			// removing arguments (possibly set by a previous call to fire) unless we have reached a Pseudostate, in which case following transitions may use them
			this.configuration.objectState[sm.name].__OP_NAME__ = undefined;
			this.configuration.objectState[sm.name].__ARGS__ = undefined;
			this.configuration.objectState[sm.name].__NAMED_ARGS__ = undefined;
		}
		await forEachAsync(currentState, async state => {
			if(state.entry) {
				const result = this.evalActions(state.entry, step, sm, this.extraOperations, this);
				if(result instanceof Promise) {
					await result;
				}
			}
		});
		step.configurationAfter = this.copyConfig(this.configuration);
		this.sysHistory.push(step);

		if(this.settings?.fireInitialTransitions && target.kind == 'initial') {
			var nextInitialTransition = target.outgoing[0];
			await this.fireInternal(nextInitialTransition);
		}

		await this.settings?.onconfigchanged?.();
		await this.settings?.onfired?.(trans);
		return message;
	}
	evalGuard(transition) {
		if(this.settings?.considerGuardsTrue) {
			return true;
		} else if(transition.guard == "else") {
/*
			return true;	// TODO: check all other guards? But it then becomes necessary to handle undefined values as neither true nor false so that 'else' can be fired
/*/
			const obj = this.currentModel.getTransObject(transition);
			return	!transition.source.outgoing.filter(t =>
					transition !== t
				).map(t => {
					const ret = this.evalActions(t.guard, step, obj, this.extraOperations, this)
					//console.log("evaluating:", t.guard, "TO", ret);
					return ret;
				}).some(e => e);
/**/
		} else {
/*
			var __trans__ = transition;
			var __eval__ = eval;
			var proxy = new Proxy(configuration.objectState[getTransObject(transition).name], {
				get: (t,n) => {
					if(t.hasOwnProperty(n)) {
						return t[n];
					} else {
						return null;
					}
				},
				has: (t,n) => !['__trans__', '__eval__','console'].includes(n)
			});
			var ret = contextualEval.call(proxy, `${transition.guard}`);
			return ret;
/*/
			// TODO: include this in sysHistory? but then, only once, whereas guards may currently be evaluated more times than necessary
			var step = {
				messages: [],
			};
			const ret = this.evalActions(transition.guard, step, this.currentModel.getTransObject(transition), this.extraOperations, this);
			//console.log("Evaluated", transition.guard, "and got", ret, this.extraOperations);
			return ret;
/**/
		}
	}
	// TODO: reduce the number of times the guard is evaluated per redraw, e.g., by caching isFireable's result until a change occurs
	isFireable(transition) {
		const ret = this.isActivable(transition) && this.eventMatched(transition) && ((!transition.guard) || this.evalGuard(transition));
/*
		const obj = currentModel.getTransObject(transition);
		if(obj.name === 'controller') {
			console.log(currentModel.transFullName(transition), ": isFireable=", ret, ", isActivable=", this.isActivable(transition), ", eventMatched=", !!this.eventMatched(transition))
		}
*/
		return ret;
	}
	getFireableTransitions() {
		// TODO: handle is in isFireable so that it also works when using the UI?
		// TODO: this also enforces an order on ether messages, which is not necessarily relevant
		var ret = this.currentModel.objects.filter(o => this.isActive(o)).flatMap(o => {
			var ret = this.getFireable(o);
			if(this.settings?.checkEvents && this.settings?.matchFirst) {
			//if(this.settings?.matchFirst) {
				const msgs = (this.configuration.objectState[o.name].__EP__ || []).map(msg => msg.signature.replace(msgSigRegex, "$1"))
				const firstEvent = sortBy(ret.filter(t => !this.currentModel.noEventTrigger(t)), t =>
					msgs.indexOf(t.trigger.replace(msgSigRegex, "$1")),
				)[0]?.trigger;
				if(firstEvent) {
					ret = ret.filter(t => this.currentModel.noEventTrigger(t) || t.trigger === firstEvent);
				}
			}
			return ret;
		});
		// TODO: actually handle this in isFireable so that it also works when using the UI? otherwise remove the checkbox
		// but if it moves to isFireable, then toPlantUML will need to be changed to show why some transitions cannot fire
		// currently it will show them as non-fireable
		if(this.settings?.reactiveSystem) {
			const currentModel = this.currentModel;
			function isEnv(trans) {
				return currentModel.getTransObject(trans).isActor || currentModel.isAfter(trans);
			}
			if(ret.some(t => !isEnv(t))) {
				// if there is at least one non-environement transition, remove all environment transitions
				ret = ret.filter(t => !isEnv(t));
			}
		}
		return ret;
	}





	// "standard" operations
	async getFireables() {
		return this.getFireableTransitions().map(t => this.currentModel.transFullName(t));
	}
	async getConfiguration() {
		return this.serializeConfig(this.configuration, false);
	}
	async setConfiguration(ncj) {
		//this.sysHistory2.push(...this.sysHistory);
		this.sysHistory.splice(0);
		var nc = JSON.parse(ncj);
		this.configuration = {
			currentState: Object.fromEntries(
				Object.entries(nc.currentState).map(([objectName, currentState]) =>
					[objectName, currentState.map(s => this.currentModel.getState(s))]
				)
			),
			histories: Object.fromEntries(
				Object.entries(nc.histories).map(([parentState,state]) =>
					[parentState, state.map(sn => this.currentModel.getState(sn))]
				)
			),
			objectState: nc.objectState,//Object.entries(nc.objectState).map(([objectName, objectState])),
			ether: nc.ether,
		};
		await this.settings?.onconfigchanged?.();
	}

	// TODO: make all STR operations async, because even if we are not async, someone might want to "then" on return value (e.g., RemoteTool.Tool)
	async fire(transName, trustMe = false) {
		var trans = this.currentModel.getTransition(transName);
		await this.fireInternal(trans, trustMe);

		const obj = this.currentModel.getTransObject(trans);
		const currentState = () => last(this.configuration.currentState[obj.name]);
		while(this.settings?.autoFireAfterChoice && currentState().kind === "choice") {
			// we've reached a Pseudostate, and we need to proceed
			var fireables = this.getFireable(obj);
			if(fireables.length != 1) {// && trans.target.kind === "choice") {
				// we should remove else transitions, which AnimUML keeps
				fireables = fireables.filter(t => t.guard !== "else");
			}
			if(fireables.length != 1) {
				throw "There should be exactly one fireable transition";
			}
			trans = fireables[0];
			await this.fireInternal(trans);
		}
	}
	async reset() {
		this.sysHistory = [];
//		this.sysHistory2 = [];

		function prefixForEMI(propName) {
			if(currentModel.name.startsWith("UML2AnimUML_")) {
				return escAttr(propName);
			} else {
				return propName;
			}
		}
		this.configuration = {
			currentState: {},
			histories: {},
			objectState: Object.fromEntries(this.currentModel.objects.map(o => [
				o.name,
				Object.fromEntries(
					Object.entries(o.propertyByName || {}).filter(([propName, prop]) =>
						prop.defaultValue
					).map(([propName, prop]) =>
						[prefixForEMI(propName), prop.defaultValue]
					)
				),
			])),
			ether: {},
		};
		for(const o of this.currentModel.objects.filter(o => this.isActive(o))) {
			this.setInitialState(o);
		}

		await this.settings?.onconfigchanged?.();

		// TODO: should be done for every Pseudostate, but not so easy
		// (e.g., choice's outgoing transitions should not be fired automatically, but complex transitions should be handled)
		// This currently executes only one initialization order, assuming that all execution orders will end up in the same configuration.
		// TODO: it could be useful to play all permutations, and "return" a list of initial configurations (i.e., with a non-deterministic STR)
		if(this.settings?.fireInitialTransitions) {
			for(const o of this.currentModel.objects.filter(o => this.isActive(o))) {
				const ts = this.getFireable(o);
				if(ts.length !== 1) {
					alert("Expected only one initial transition");
				}
				if(ts[0].source.kind !== 'initial') {
					alert("Expected source of initial transition to be an initial Pseudostate");
				}
				await this.fireInternal(ts[0]);
				last(this.sysHistory).isAuto = true;
			}
		}
	}
	get modelName() {
		return this.currentModel?.name;
	}
/*
	get name() {
		return "AnimUML";
	}
*/
	async parseTransition(transName) {
		return transName;
/*		.then(transName => {
			const trans = getTransition(transName);
			return {object: getTransObject(trans).name, source: trans.source.name, target: trans.target.name};
		});
*/
	}
	async parseConfiguration(config) {
		return config;
	}
	async showTransition(transName) {
		const trans = this.currentModel.getTransition(transName);
		return {object: this.currentModel.getTransObject(trans).name, fqn: transName, name: trans.name, source: trans.source.name, target: trans.target.name};
	}
	async showConfiguration(config) {
		return JSON.parse(config);
	}
	// extraOperations is an optional parameter
	async evaluateAtom(atom, extraOperations) {
		return this.evalActions(atom, {}, {}, Object.assign(
				// make all objects directly available
				Object.fromEntries(this.currentModel.objects.map(obj => [`__ROOT__${obj.name}`, this.configuration.objectState[obj.name]])),
				{...this.extraOperations, ...extraOperations}
				// TODO: ...this.extraOperations?
			),
			this
		);
	}
	// TODO: not giving the underlying object to the proxy would make it possible to capture all "gets" as both symbolic and actual value (if available)
	// then depending on the context (e.g., second argument of GET or SET), the symbolic value could be used instead of any avaiable actual value
	// returns the steps of the last (possibly composite) transition
	lastSteps() {
		const sysHistory = this.sysHistory;
		var i = sysHistory.length - 1;
		if(i < 0) {
			return [];
		} else {
			function step() {
				return sysHistory[i];
			}
			// getting the last step
			const steps = [step()];
			if(this.settings?.autoFireAfterChoice) {
				// also take previous steps of composite transition (i.e., traversing choices) into account
				while(step().cause.startsWith("transition:") && currentModel.getTransition(step().cause.replace(/^transition:/, "")).source.kind === "choice") {
					steps.unshift(sysHistory[--i]);
				}
			}
			return steps;
		}
	}

	evalActions(actions, step, sm, extraOperations, engine, asAsync = false, asFunction = false) {
		actions = actions.replace(/::/g, ".");
		//console.trace("EVAL ACTIONS", actions, sm.name)
		const legacy = this.evalActionsLegacy(actions, step, sm, extraOperations, engine, asAsync, asFunction);
/*
		const interp = this.interpretActions(actions, step, sm, extraOperations, engine, asAsync, asFunction);
		if(legacy != interp) {
			console.log(`error: different action evaluation result: legacy:${legacy} != interpreter:${interp} for ${actions}`);
			throw "error";
		}
/**/
		return legacy;
	}

	interpretActions(actionString, step, self, extraOperations, engine, asAsync, asFunction) {
		function log(...args) {
			//console.log(...args);
		}
		function wrapPropertyName(name) {
			return '__EMI__' + name;
		}
		let additionalOperations = {
			FALSE: 0,
			TRUE: 1,
			SET(object, property, value) {
				log("SET(", object, property, value, ")");
				const objectState = engine.configuration.objectState[object.object.name];
				if(value) {
					objectState[wrapPropertyName(property.name)] = value;
				} else {
					delete objectState[wrapPropertyName(property.name)];
				}
			},
			GET(object, property) {
				log("GET(", object, property, ")")
				if(object instanceof SymbolicValue) {
					//if(object.name = 'ROOT_instMain') {
						// TODO: only for root symbolic values, not symbolic property values
						//console.log(engine.currentModel.objects.map(e => e.name))
//						return new UMLObject(engine.currentModel.getObject(property.name));
//					} else {
						return new SymbolicPropertyValue(object, property.name);
//					}
				} else {
					const objectState = engine.configuration.objectState[object.object.name];
					if(wrapPropertyName(property.name) in objectState) {
						return objectState[wrapPropertyName(property.name)];
					} else if(object.object == self) {
						let ret = engine.currentModel.getObjectRelative(self, property.name);
						if(!ret) {
							ret = engine.currentModel.getObject();
						}
						if(ret) {
							ret = new UMLObject(ret);
						}
						if(ret == undefined) {
							ret = false;
						}
						return ret;
					} else {
						return false;
					}
				}
			},
			SEND(object, signalName, ...args) {
				log("SEND(", object, signalName, args, ")");
			},
			AT(array, index) {
				log("AT(", array, index, ")");
				return array[index];
			},
			INC(target, propertyName, value) {
				log("INC(%s, %s, %s)", target, propertyName, value);
				target[wrapPropertyName(propertyName)] += value;
			},
			DEC(target, propertyName, value) {
				log("DEC(%s, %s, %s)", target, propertyName, value);
				target[wrapPropertyName(propertyName)] -= value;
			},
			EP_IS_EMPTY(target) {
				log("EP_IS_EMPTY(", target, ")");
				// TODO: other cases than symbolic property value
				const path = target.path();
				if(path[0] === "ROOT_instMain") {
					path.splice(0, 1);
				}
				const objectName = path.join("_");
				// TODO: ether
				//console.log(engine.configuration.objectState[objectName])
				return (engine.configuration.objectState[objectName].__EP__?.length ?? 0) == 0
			},
		};

		// this cache significantly improves performance
		// but it should at least be emptied upon model change
		this.parsedActionsCache = this.parsedActionsCache ?? {};
		const parsed = this.parsedActionsCache[actionString] ?? parser.parse(actionString);
		this.parsedActionsCache[actionString] = parsed;

		log(parsed)
		let pc = 0;
		class SymbolicValue {
			constructor(name) {
				this.name = name;
				// for the current implementation of EMIOperations
				//this.valueOfProperty = name;
			}
		}
		class RootSymbolicValue extends SymbolicValue {
			constructor(name) {
				super(name);
			}
		}
		class SymbolicPropertyValue extends SymbolicValue {
			constructor(source, name) {
				super(name);
				this.source = source;
			}
			path() {
				return [...this.source instanceof SymbolicPropertyValue ? this.source.path() : [this.source.name], this.name];
			}
		}
		class UMLObject {
			constructor(object) {
				this.object = object;
			}
		}
		const binaryOperators = {
			"=="(left, right) {
				return left == right;
			},
			"&&"(left, right) {
				return left && right;
			},
			"||"(left, right) {
				return left || right;
			},
			"<"(left, right) {
				return left < right;
			},
			"<="(left, right) {
				return left <= right;
			},
			">"(left, right) {
				return left > right;
			},
			">="(left, right) {
				return left >= right;
			},
		};
		const prefixOperators = {
			"-"(value) {
				return -value;
			},
		};
		function evaluate(expr) {
			let ret;
			switch(String(expr.type)) {
				case 'memberAccessExp':
					const target = evaluate(expr.left);
					ret = target[expr.propertyName];
					break;
				case 'numberExp':
					ret = expr.value;
					break;
				case 'variableExp':
					if(expr.name === "params") {
						ret = engine.EMIOperations.getters.params(self);
					} else
					if(expr.name === "this") {
						ret = new UMLObject(self);
					} else if(expr.name in extraOperations) {
						ret = additionalOperations[expr.name];
					} else if(expr.name in additionalOperations) {
						ret = additionalOperations[expr.name];
					} else if(expr.name in engine.configuration.objectState[self.name]) {
						log("TODO: read objectState");
					} else {
						ret = new RootSymbolicValue(expr.name);
					}
					break;
				case 'binaryOpExp':{
					const f = binaryOperators[expr.op];
					if(typeof f !== "function") {
						console.log("error: binary operator", expr.op, "not found");
					}
					ret = f(evaluate(expr.left), evaluate(expr.right));
					}break;
				case 'prefixUnaryExp':{
					const f = prefixOperators[expr.op];
					if(typeof f !== "function") {
						console.log("error: unary prefix operator", expr.op, "not found");
					}
					ret = f(evaluate(expr.expression));
					}break;
				case 'functionCallExp':
					const f = evaluate(expr.left);
					if(typeof f !== "function") {
						console.log("error: expression did not evaluate to a function: ", stringify(expr.left));
					}
					const args = expr.args.map(arg => evaluate(arg));
					log("call", f, args);
					ret = f(...args);
					break;
				default:
					console.log("error: cannot interpret", expr.type, ":", expr);
					break;
			}
			log("evaluate", stringify(expr), "=>", ret);
			return ret;
		}
		let lastValue;
		while(pc < parsed.length) {
			const stat = parsed[pc];
			log("execute", stringify(stat));
			switch(String(stat.type)) {
				case 'expressionStat':
					lastValue = evaluate(stat.expression);
					break;
				default:
					console.log("error: cannot interpret", stat.type, ":", stat);
					break;
			}
			pc++;
		}
		return lastValue;
	}

	evalActionsLegacy(actions, step, sm, extraOperations, engine, asAsync = false, asFunction = false) {
		//const currentModel = engine.currentModel;	// TODO?
		let additionalOperations = this.EMIOperations;
		function evalPath(self, path) {
			const parts = path.split(".");
			let ret;
			let ok = false;
			if(parts[0] in self) {
				ret = self[parts[0]];
				ok = true;
			} else {
				const obj = currentModel.getObjectRelative(sm, parts[0]);
				if(obj) {
					ret = engine.configuration.objectState[obj.name];
					ok = true;
				}
			}
			if(ok) {
				//console.log("=>", ret)
				for(const part of parts.slice(1)) {
					if(!ret) {
						ok = false;
						break;
					}
					//console.log(ret, part)
					ret = ret[part];
				}
				//console.log(ret)
				if(ok) {
					return {hasValue: true, value:ret};
				}
			}
			return {hasValue: false};
		}
		function display(value) {
			var ret =	typeof(value) == "function" && value.valueOfProperty
				?	value.valueOfProperty
				:	typeof(value) == "object" && value.returnValueOf ?
					value.returnValueOf.signature
				:	JSON.stringify(value);
			return unescEMI(ret);
		}
		function getValue(value) {
			var ret;
			if(value == proxy) {
				ret = "this";
			} else if(typeof(value) == "object" && value.returnValueOf) {
				ret = `${value.returnValueOf.signature}`;
			} else if(value.valueOfProperty && !engine.settings?.symbolicValues) {
				ret = 0;
			} else {
				ret = display(value);
			}
			if(debugEvalActions) {
				console.log("getValue => " + ret)
			}
			return ret;
		}
		function doSet(self, propertyName, value) {
			if(debugEvalActions) {
				console.log("doSet(%o, %o, %o)", self, propertyName, value)
			}
/*
			if(propertyName === "storedParams") {
				console.log("doSet(%o, %o, %o)", self, propertyName, value)
				console.log("while eval:", actions)
			}
*/
			const originalSelf = self;
			if(self.valueOfProperty) {
				const obj = currentModel.getObjectRelative(sm, unescEMI(self.valueOfProperty));
				if(obj && obj == currentModel.getObject(obj.name)) {
					self = engine.configuration.objectState[obj.name];
					propertyName = propertyName.split(".")[1];
				}
			}

			if(typeof(value) == "object" && value.returnValueOf) {
				var msg = value.returnValueOf;
				let target;
				if(msg.target === "]") {
					msg.target = sm.name;
					target = sm;
				} else {
					target = engine.currentModel.getObject(msg.target);
				}

				// TODO: evaluate methods not just when setting?
				var opName = msg.signature.replace(msgSigRegex, '$1');
				var op = target?.operationByName?.[opName];
				var returnValue;
				if(op && op.method) {
					msg.receivedAt = step;

					const argsString = msg.signature.replace(msgSigRegex, "$2").trim();
					const args = argsString ? argsString.split(",").map(arg => JSON.parse(arg)) : [];
					let extraOp = {...Object.fromEntries(
						zip(op.parameters?.map(param => typeof param === "string" ? param : param.name) || [], args)
					), ...extraOperations};
					returnValue = engine.evalActions(op.method, step, target, extraOp, engine,
						false,
						true
					);
					msg.returnedValue = returnValue;
					if(debugEvalActions) {
						console.log("evaled method of %s to %o", opName, returnValue)
					}
				}
				value.returnValueOf.signature = `${unescEMI(propertyName)} = ${unescEMI(value.returnValueOf.signature)}`;
					//${returnValue ? ` : ${display(returnValue)}` : ''}`;
				if(typeof returnValue == "function" && returnValue.valueOfProperty) {
					returnValue = `uninitializedValue(${returnValue.valueOfProperty})`;
				}
				if(returnValue) {
					self[propertyName] = returnValue;
				} else {
					delete self[propertyName];	// make sure we won't read the old value
					// read as symbolic value is actually unnecessary because this is the default
					//self[propertyName] = proxy[propertyName];
				}
			} else {
				if(value) {
					self[propertyName] = value;
				} else {
					delete self[propertyName];
				}
				const msg = {
					source: sm.name,
					target: originalSelf.valueOfProperty ? unescEMI(originalSelf.valueOfProperty) : sm.name,
					signature: `${originalSelf.valueOfProperty ? `${unescEMI(originalSelf.valueOfProperty)}.` : ""}${unescEMI(propertyName)} = ${
						display(value)
					}`,
					sentAt: step,
					receivedAt: step,
					type: 'set',
				};
				step.messages.push(msg);
				//addToEther(msg);// no because already consumed
			}
			return true;	// indicates success, which is necessary in strict mode, otherwise there is an exeption
		}
		const objectState = sm.name ? engine.configuration.objectState[sm.name] : sm;
		const proxy = new Proxy(objectState, {
			get(self, propertyName) {
				if(propertyName == '__actualTargetObject__') {return sm;}
				if(propertyName == 'console') return console;

				if(debugEvalActions) {
					console.log("get(%s)", String(propertyName))
				}

				const namedArgs = objectState.__NAMED_ARGS__;
				if(namedArgs?.hasOwnProperty(propertyName)) {
					return namedArgs[propertyName];
				}

				if(extraOperations && extraOperations.hasOwnProperty(propertyName)) {
					const ret = extraOperations[propertyName];
					if(ret.bind) {
						ret.bind(proxy);
					}
					return ret;
				} else if(additionalOperations.hasOwnProperty(propertyName)) {
					const ret = additionalOperations[propertyName];
					if(ret.bind) {
						ret.bind(proxy);
					}
					return ret;
				} else if(additionalOperations.getters?.hasOwnProperty(propertyName)) {
					const ret = additionalOperations.getters[propertyName].bind(proxy)(sm);
					return ret;
				}
				if(propertyName in self || typeof propertyName === "symbol") return self[propertyName];

				// for EMI-style signal comparison
				if(propertyName.match(/^SIGNAL_/)) {
					return propertyName;
				}

/*
				const targetObj = getObjectRelative(sm, propertyName);
				if(targetObj) {
					//console.log("PEER ACCESSED ", targetObj)
					return targetObj;
				}
*/

/*
				var ret = function() {
					var msg = {
						source: sm.name,
						target: ']',
						signature: `${propertyName.toString()}(${Array.prototype.map.call(arguments, getValue).join(", ")})`,
						sentAt: step,
					};
					if(debugEvalActions) {
						console.log("call %s", msg.signature)
					}
					step.messages.push(
						msg
					);
					addToEther(msg);
					return {
						returnValueOf: msg,
					};
				};
				// in case we are not calling a function, but getting a default value for a variable
				ret.toString = () => null;
				ret.valueOfProperty = propertyName;
/*/
				function nav(expr) {
					var ret = function() {};
					ret.toString = () => false;	// false == 0 == ""
					ret.valueOfProperty = expr;
					if(debugEvalActions) {
						console.log("nav PROP:" + expr);
					}
					function navProp(propertyName) {
						return `${expr}${
							propertyName.match(/^[0-9]*$/) ?
								`[${propertyName}]`
							:propertyName.match(uninitValRegex) ?
								`[${propertyName.replace(uninitValRegex, '$1')}]`
							:
								"." + propertyName
						}`;
					}
					function getNestedObject(objName) {
						const ret = currentModel.objects.filter(obj => obj.name.endsWith('_' + objName));
						return ret.length == 1 ? ret[0] : undefined;
					}
					return new Proxy(ret, {
/*
						construct(self, args) {
							console.log("construct", self.valueOfProperty, args[0], extraOperations)
						},
*/
						apply(self, thisArg, args) {
							if(debugEvalActions) {
								console.log(`apply²`);
							}
							var sig = unescEMI(expr.toString());
							var target = ']';

							var sigParts = sig.split(/\./);
							var targetObj;
							var targeted = false;
							//console.log("HERE getObjectRelative(", sm.name, sigParts[0], ") =>", currentModel.getObjectRelative(sm, sigParts[0]))
							if(sigParts.length == 2 &&	(
												(targetObj = currentModel.getObject(sigParts[0]))
											||	(targetObj = currentModel.getObject(sigParts[0].replace(/\[([0-9]+)\]$/, "$1")))
											||	(targetObj = currentModel.getObjectRelative(sm, sigParts[0]))
											//||	(targetObj = getNestedObject(sigParts[0]))
											)) {
								if(debugEvalActions) {
									console.log("Initial target: ", targetObj.name);
								}
								var tag;
								({target: targetObj, tag: tag} = currentModel.navigateThroughPorts(sm, targetObj, debugEvalActions));
								if(debugEvalActions) {
									console.log("Final target: ", targetObj);
								}
								target = targetObj.name;
								sig = sigParts[1];
								targeted = true;
							}
							var msg = {
								source: sm.name,
								target: target,
								// signature for display purposes
								displaySignature: `${sig}(${Array.prototype.map.call(args, display).join(", ")})`,
								// signature for interpretation purposes
								signature: `${sig}(${Array.prototype.map.call(args, getValue).join(", ")})`,
								sentAt: step,
							};
							if(tag) {
								msg.tag = tag;
							}
							if(targeted) {
								msg.targeted = true;
							}
							if(debugEvalActions) {
								console.log("call %s", msg.signature)
							}
							step?.messages?.push(
								msg,
							);



/*
							// evaluate methods not just when setting?
							var opName = msg.signature.replace(msgSigRegex, '$1');
							var op = targetObj?.operationByName?.[opName];
							if(op && op.method) {
								return engine.callOperation(targetObj.name + "." + opName, sm.name)
							} else {
*/

							engine.addToEther(msg);
							return {
								returnValueOf: msg,
							};
//							}
						},
						get(self, propertyName) {
							if(debugEvalActions) {
								console.log(`get²(${String(propertyName)})`);
							}
							if(propertyName == '__actualTargetObject__') {return sm;}
//*
							// this makes it possible to keep symbolic names (e.g., used as array index), but prevents default values (typically 0) for attributes
							if(propertyName == Symbol.toPrimitive) {
								if(engine.settings?.symbolicValues) {
									// TODO use this information to know we should display as [] and not .
									// we do not want conversion because we want to keep the symbolic name (if it was resolvable it would already have been)
									return () => {
										//console.trace()
										return `uninitializedValue(${expr})`;
									};
								} else if(self.valueOfProperty) {
										//const targetObj = currentModel.getObject(sigParts[0]))
										//const targetObj = currentModel.getObject(sigParts[0].replace(/\[([0-9]+)\]$/, "$1")))
										//const targetObj = currentModel.getObjectRelative(sm, sigParts[0]))
									const ret = evalPath(self, self.valueOfProperty);
									if(ret.hasValue) {
										return () => ret.value;
									}
								}
							}
/**/
							if(propertyName in self || typeof propertyName === "symbol") {
								return self[propertyName];
							} else {
								return nav(navProp(propertyName));
							}
						},
						has(self, propertyName) {
							if(debugEvalActions) {
								console.log(`has²(${String(propertyName)})`);
							}
							return true;
						},
						set(self, propertyName, value) {
							if(debugEvalActions) {
								console.log(`set²(${String(propertyName)}, ${value})`);
							}
							return doSet(self, navProp(propertyName), value);
						},
/*
						getPrototypeOf(target) {
							if(debugEvalActions) {
								console.log(`getPrototypeOf`);
							}
						},
						ownKeys(target) {
							if(debugEvalActions) {
								console.log(`ownKeys`);
							}
						},
						getOwnPropertyDescriptor(target, propertyName) {
							if(debugEvalActions) {
								console.log(`getOwnPropertyDescriptor(${String(propertyName)})`);
							}
						},
*/
					});
				}
				var ret = nav(propertyName);
/**/
				return ret;
			},
			has(self, propertyName) {
				if(debugEvalActions) {
					console.log("has(self, %s)", propertyName)
				}
				// return true so that we can behave as if the property existed
				return ![
/*
					'__trans__',
					'__eval__',
*/
					'console',	// let's not try to claim we have a "console" property, so that console.log is still usable
					'alert',
				].includes(propertyName);
			},
			set(self, propertyName, value) {
				if(debugEvalActions) {
					console.log("set %s to %s", propertyName, value)
				}
				return doSet(self, propertyName, value);
			},
		});
		try {
			const ret = contextualEval.call(proxy, actions, asAsync, asFunction);
/*
			if(ret.valueOfProperty) {
				const val = evalPath(ret.valueOfProperty);
				if(val.hasValue) {
					return val;
				}
			}
*/
			return ret;
		} catch(e) {
			console.log("error evaluating", actions, e.stack);
			throw e;
		}
	}
}

function escAttr(propertyName) {
	return `__EMI__${propertyName}`
}
function unescEMI(s) {
	return s?.replace(/__EMI__/g, '');
}

