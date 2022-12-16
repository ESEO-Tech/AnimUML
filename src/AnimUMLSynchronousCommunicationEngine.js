import {msgSigRegex} from "./AnimUMLEngine.js";

export class AnimUMLSynchronousCommunicationEngine {
	constructor(engine, settings) {
		let baseFireables;
		let fireables;

		this.baseEngine = engine;

		const sep = "||";

		// From the STR interface of our formalization
		this.reset = async () => {
			await engine.reset();
			fireables = await this.getFireables();
		};
		this.getConfiguration = async () => {
			return await engine.getConfiguration();
		};
		this.setConfiguration = async (config) => {
			await engine.setConfiguration(config);
			fireables = await this.getFireables();
		};
		// TODO: support synchronous calls through the ether?
		const callRegex = /([^ \t\n(]+)\.([^(]+)\(/g;
		function calls(trans) {
			return (trans.effect?.match(callRegex) || []).map(match =>
				[
					match.replace(callRegex, "$1"),
					match.replace(callRegex, "$2"),
				]
/*
			).filter(([calleeName, opName]) =>
				calleeName !== "console"	// console being considered as a reserved identifier
*/
			);
		}
		this.getFireables = async () => {
			baseFireables = await engine.getFireables();
			const ret = [];

			fireablesLoop : for(const baseFireable of baseFireables) {
				const trans = engine.currentModel.getTransition(baseFireable);

				for(const [calleeName, opName] of calls(trans)) {
					const obj = engine.currentModel.getTransObject(trans);
					const callee = engine.currentModel.getObjectRelative(obj, calleeName);
					const op = callee?.operationByName?.[opName];
					if(op && op.isOperation) {
						const calleeTrans = engine.getFireable(callee, (t) => {
							// guard evaluation should ideally happen after what comes before the synchronous call in trans.effect has been executed
							// but we rather forbid any such effect to impact the callee's guard evaluation
							//const ret = !t.guard || engine.evalGuard(t)
							//return ret;
							if(t.guard) {
								const ret = engine.evalGuard(t);
								//console.log("guardOf", calleeName, ret);
								return ret;
							} else {
								return true;
							}
						}).find(t =>
							getTriggerOperationName(t.trigger) === op.name
						);
						if(calleeTrans) {
							ret.push(`${baseFireable}${sep}${engine.currentModel.transFullName(calleeTrans)}`);
						}
						continue fireablesLoop;
					}
				}
				ret.push(baseFireable);
			}
			return ret;
		};
/*
		(async () => {
			// initialize baseFireables & fireables if engine is already started
			if(engine.configuration) {
				fireables = await this.getFireables();
			}
		})();
*/
		function getTriggerOperationName(trigger) {
			return trigger?.replace(msgSigRegex, "$1");
		}
		this.fire = async (fireable) => {
			let parts = fireable.split(sep);
			if(parts.length == 1) {
				// given a simple transition, the corresponding synchronous transition must be retrieved if it exists
				// this mechanism is useful because some mechanisms (e.g., firing transitions by clicking on the state diagram) may not support synchronous transitions
				fireable =	fireables.includes(fireable)
						?	fireable
						:	fireables.find(t =>
								t.split(sep).includes(fireable)
							)
				;
				parts = fireable.split(sep);
			}
			if(parts.length == 1) {
				await engine.fire(fireable);
			} else {
				engine.extraOperations = engine.extraOperations || {};
				const callerTrans = engine.currentModel.getTransition(parts[0]);
				const caller = engine.currentModel.getTransObject(callerTrans);
				const calleeTrans = engine.currentModel.getTransition(parts[1]);
				const callee = engine.currentModel.getTransObject(calleeTrans);
				const triggerOpName = getTriggerOperationName(calleeTrans.trigger);
				const relativeCalleeName = engine.currentModel.getRelativeName(caller, callee)
				engine.extraOperations[
					relativeCalleeName
				] = {
					// TODO: what happens if other (non synchronous) operations of the same object are called in the same effect before the synchronous call?
					[triggerOpName]: async (...args) => {
						// removing operation, which is no longer necessary since we support only one synchronous call per transition effect
						delete engine.extraOperations[relativeCalleeName];

						engine.registerArguments(callee, calleeTrans.trigger, args);
						const calleeObjectState = engine.configuration.objectState[callee.name];
						calleeObjectState.__EP__ = calleeObjectState.__EP__ || [];
						const msg = {
							signature: `${triggerOpName}(${args.map(arg => JSON.stringify(arg)).join(",")})`,
							source: caller.name,
							get sentAt() {
								return this.receivedAt;
							},
						};
						calleeObjectState.__EP__.push(msg);
//console.log(calleeObjectState.__EP__)
						// actually only needs to be able to return, not necessarily as async
						engine.nextEffectAsFunction = true;
						await engine.fire(
							parts[1],
							true		// trustMe=true necessary because the transition would not be fireable yet in async mode
						);
//console.log("RESULT", engine.effectResult)
						const ret = engine.effectResult;
						msg.returnedValue = ret;
						engine.effectResult = undefined;
						return ret;
					},
				};
				engine.extraOperations[relativeCalleeName].name = callee.name;
				engine.nextEffectAsAsync = true;
				await engine.fire(parts[0]);

				// merging the last two sysHistory steps
				const oldLast = engine.sysHistory.splice(-1)[0];
				const newLast = engine.sysHistory.slice(-1)[0];
				newLast.messages.push(...oldLast.messages);
				newLast.activeObjects = [callee, caller];
				newLast.configuration = oldLast.configuration;
				newLast.cause = `transition:${fireable}`
				newLast.watchExpressions = oldLast.watchExpressions;
			}

			fireables = await this.getFireables();
		};

		// From the P interface of our formalization
		this.parseConfiguration = async (config) => {
			return await engine.parseConfiguration(config);
		};
		this.parseTransition = async (trans) => {
			return await engine.parseTransition(trans);
		};

		// From the APE interface of our formalization
		this.evaluateAtom = async (atom, extraOps) => {
			// TODO?
			return await engine.evaluateAtom(atom, extraOps);
		};

		// misc
		this.setModel = (model) => {
			engine.setModel(model);
		}

		Object.defineProperty(this, 'sysHistory', {get: function() {return engine.sysHistory;}});
		Object.defineProperty(this, 'configuration', {get: function() {return engine.configuration;}});
		this.getSlots = (...args) => {
			return engine.getSlots(...args);
		};
		this.isCurrentState = (...args) => {
			return engine.isCurrentState(...args);
		};
		const that = this;
		this.isFireable = (trans) => {
			const transFQN = engine.currentModel.transFullName(trans);
			return fireables.some(fireable => {
				const parts = fireable.split(sep);
				if(parts.length > 1) {
					return parts.includes(transFQN);
				} else {
					return fireable === transFQN;
				}
			});
		};
		this.isActivable = (...args) => {
			return engine.isActivable(...args);
		};
		this.findMessage = (...args) => {
			return engine.findMessage(...args);
		};
		this.setInitialState = (...args) => {
			return engine.setInitialState(...args);
		};
		this.backToInternal = async (...args) => {
// TODO: backToInternal(0) does not work... actually it does not work for AnimUMLEngine when fireInitialTransitions==true
			await engine.backToInternal(...args);
			fireables = await this.getFireables();
		};
		this.fireInternal = async (trans) => {
			return await this.fire(engine.currentModel.transFullName(trans));
		};
		this.treeifyConfig = (...args) => {
			return engine.treeifyConfig(...args);
		};
		this.eventMatched = (trans) => {
			if(engine.eventMatched(trans)) {
				return true;
			} else {
				// trans necessarily has an event trigger here
				const opName = getTriggerOperationName(trans.trigger);
				const callee = engine.currentModel.getTransObject(trans);
				const op = callee.operationByName?.[opName];
				if(op && op.isOperation) {
					return baseFireables.some(transName => {
						const t = engine.currentModel.getTransition(transName);
						const obj = engine.currentModel.getTransObject(t);
						const relativeCalleeName = engine.currentModel.getRelativeName(obj, callee)
						const ret = calls(t).some(([calleeName, calledOpName]) =>
							calleeName === relativeCalleeName && opName === calledOpName
						);
//console.log(relativeCalleeName, opName, calls(t), ret)
						return ret;
					});
				} else {
					return false;
				}
			}
		};
	}
}

