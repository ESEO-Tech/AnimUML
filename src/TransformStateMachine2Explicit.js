import {sortBy} from './Utils.js';
import {getEventName} from './ModelUtils.js';

export function toExplicit(sm, model, forTransparentExecution = true) {
		const storedParams = !true;	// to remember arguments after a pseudostate
						// but does not work yet, notably because the code generator does not support let statements
						// -> see moveAfterChoiceEffectsUp
		const moveAfterChoiceEffectsUp = !true;	// to be able to use arguments in choice pseudostate downstream transition effects
						// but does not work because the effect might trigger another object's transition before it should
						// -> see copyArgsToGuards
		const copyArgsToGuards = true;	// to be able to use arguments in choice pseudostate downstream transition effects
		var trace = {
			states: {},
			transitions: {},
		};
		let needsHistory = false;
		/*
			TODO URGENT:
				- fix entry of super state when directly entering substate (e.g., on waterPump example)
			TODO LATER:
				- rewrite in a more modular/chainable way
					- possibly by making each module lazy (using getters)
				- test:
					- that it is idempotent
						DONE, but fails for models with shallowHistory (until the generated choice is gotten rid of)
					- possible regressions
					- (ideally) compared execution
						DONE
					- PSSM
				- features:
					- doActivity
						https://campus.eseo.fr/pluginfile.php/128442/mod_resource/content/2/Codage_objets_actifs_2020.pdf#page=10
					- (when supported) at
						https://campus.eseo.fr/pluginfile.php/128442/mod_resource/content/2/Codage_objets_actifs_2020.pdf#page=11
					- when
						https://campus.eseo.fr/pluginfile.php/128442/mod_resource/content/2/Codage_objets_actifs_2020.pdf#page=13
					- history (shallowHistory more or less done, but still needs to get rid of generated choice)
						https://campus.eseo.fr/pluginfile.php/128442/mod_resource/content/2/Codage_objets_actifs_2020.pdf#page=18
					- (when supported) orthogonal regions
						https://campus.eseo.fr/pluginfile.php/128442/mod_resource/content/2/Codage_objets_actifs_2020.pdf#page=20
						https://campus.eseo.fr/pluginfile.php/128442/mod_resource/content/2/Codage_objets_actifs_2020.pdf#page=21
				- terminate in composite state
				- not necessary for display, but would be useful if we wanted to execute actual explicit state machines
					- stateByName
					- transitionByName
			DONE:
				- fix
					- exiting parent state
						- identified by looking at the console trace of ShallowHistoryTest
				- features:
					- entry & exit
						https://campus.eseo.fr/pluginfile.php/128442/mod_resource/content/2/Codage_objets_actifs_2020.pdf#page=10
					- after
						https://campus.eseo.fr/pluginfile.php/128442/mod_resource/content/2/Codage_objets_actifs_2020.pdf#page=11
					- choice
						https://campus.eseo.fr/pluginfile.php/128442/mod_resource/content/2/Codage_objets_actifs_2020.pdf#page=14
						https://campus.eseo.fr/pluginfile.php/128442/mod_resource/content/2/Codage_objets_actifs_2020.pdf#page=15
						https://campus.eseo.fr/pluginfile.php/128442/mod_resource/content/2/Codage_objets_actifs_2020.pdf#page=16
					- composite states
						always: https://campus.eseo.fr/pluginfile.php/128442/mod_resource/content/2/Codage_objets_actifs_2020.pdf#page=17
						never: https://campus.eseo.fr/pluginfile.php/128442/mod_resource/content/2/Codage_objets_actifs_2020.pdf#page=19
				- transition and state names: must keep original fully qualified name for execution
					=> using '.' as separator in flattened names
					Alternative: separating display name & technical name (equal by default, but not necessarily in the output of the transformation)
				- make executable
					- e.g., by comparing FQNs instead of objects in toPlantUML && functions called from toPlantUML
						- fix state name, so that FQNs stay the same
						- compare FQNs in isActivable
						- autotrigger composed initial transitions
							- TODO: but not supported yet if switching to explicit when on child initial pseudostate
						- compare FQNs in isCurrent
							- only to display current {,Pseudo}state, not necessary for execution
		*/
		function getTime(t) {
			return t.trigger.replace(model.afterRegex, '$1');
		}
		function getEvName(time) {
			// TODO: fix transition not fireable when checkEvents=true because not an after() anymore => maybe by having currentEngine.isFireable ask the actual engine?
			return `TO${time}`;
		}
		function isComplexHistory(s) {
			return s.kind === "shallowHistory" && s.incoming.some(t =>
				t.source != s.region	// otherwise this translates as a simple self loop on every substate of the region (handled in getTransitions)
			);
		}
		function getOutgoing(s) {
		//	return s.outgoing;
			const ret = allTransitions.filter(t => t.source == s);
			if(isComplexHistory(s)) {
				// TODO: get rid of history state because it is not in the original state space
				const region = s.region;
				const initTrans = model.getInitial(region).outgoing[0];
				const init = initTrans.target;
				return [
					// ret should be empty, but we keep it anyway
					...ret,
					...region.states.filter(st =>
						// pseudostates cannot be part of history
						!st.kind
					).map(st => ({
						name: `__${s.name}2${st.name}__`,
						region: sm,
						source: s,
						target: st,
						// TODO: transform guard into trigger
						guard: `_histories_['${model.stateFullName(region)}'] == '${st.name}'`,
						//trigger: ``,
					})),
					{
						name: `__${s.name}else__`,
						region: sm,
						source: s,
						target: init,
						guard: "else",
						effect: initTrans.effect,
					},
				];
			} else {
				return ret;
			}
		}
		function getIncoming(s) {
		//	return s.incoming;
			return allTransitions.filter(t => t.target == s);
		}
		function expr2id(expr) {
			const ret = expr
				.replace(/[ .]/g, "_")
				.replace(/</g, "LT")
				.replace(/>/g, "GT")
				.replace(/=/g, "EQ")
				.replace(/&/g, "AMP")
				.replace(/[|]/g, "PIPE")
				.replace(/[(]/g, "LPAREN")
				.replace(/[)]/g, "RPAREN")
				.replace(/,/g, "COMMA")
				.replace(/!/g, "QMARK")
				.replace(/==/g, "EQ")
				.replace(/\+/g, "PLUS")
				.replace(/-/g, "MINUS")
			;
			return ret === "else" ? "GUARD_else" : "GUARD_" + ret;
		}
		function getEntry(s) {
			var ret = s.entry || '';

			function nl() {
				if(ret) {
					ret += '\n';
				}
			}

			const hasHistory = s.region.states.some(s =>
				// we do not really need to store histories when we are in the trivial case,
				// but we do it nonetheless to have the same state space shape, which makes testing much easier
				s.kind === "shallowHistory"
				//isComplexHistory(s)
			);
			if(hasHistory && s.kind !== "shallowHistory") {
				nl();
				needsHistory = true;
				// TODO: avoid doing this for pseudostates, but may need fixing AnimUMLEngine as well to have the same state space
				//ret += `updateHistory('${model.stateFullName(s.region)}', '${s.name}');`;
				ret += `_histories_['${model.stateFullName(s.region)}'] = '${s.name}';`;
			}
			getOutgoing(s).filter(t => (t.trigger || '').match(model.afterRegex)).forEach(t => {
				var time = getTime(t);
				var evName = getEvName(time);
				nl();
				ret += `setTimer(${evName}, "${time}");`;
			});

			if(s.kind === "choice") {
				nl();
				let first = true;
				for(const t of sortBy(s.outgoing, t => t.guard === "else")) {
					if(first) {
						first = false;
					} else {
						ret += " else ";
					}
					if(t.guard !== "else") {
						ret += `if(${t.guard ?? false}) `;
					}
					const plus = moveAfterChoiceEffectsUp ? getEffect(t) : "";
					let args = "";
					if(copyArgsToGuards && t.guard) {
						const trigger = s.incoming[0].trigger;	// assuming there is only one
						if(trigger) {
							const opName = getEventName(trigger);
							const op = sm.operationByName?.[opName];
							if(op) {
								args = op.parameters?.map(e => `params.${e.name}`).join(",") ?? "";
								sm.operationByName[expr2id(t.guard)] = {parameters: op.parameters};	// assuming the same guard expression is always used with the same operation (or at least with an operation having the same parameters)
							}
						}
					}
					if(t.guard) {
						ret += `{${plus}${expr2id(t.guard)}(${args});}`;
					}
				}
				if(storedParams) {
					ret += "storedParams = params;";
				}
			}
			return ret;
		}
		function getExit(s) {
			var ret = s.exit || '';
			if(storedParams && s.kind === "choice") {
				ret += "let params = storedParams;";
			}
			return ret;
		}
		function isComposite(s) {
			return s.states && s.states.length > 0;
		}
		function getStates(r, dropInit, keepComposites) {	// r : State | Region
			var ret = (r.states || []).filter(e =>
				!(dropInit && e.kind == 'initial')
// TODO: only filter shallowHistory out if it is trivial && !(e.kind == 'shallowHistory')
			).flatMap(e => {
				var ret = getStates(e, true, keepComposites);
				return ret.length == 0 ? [e] : keepComposites ? [e].concat(ret) : ret;
			});
			return ret;
		}
		function getTransitions(r, actualRegion) {	// r : State | Region

			var ret = (r.transitions || []).flatMap(t => {
				var tgt =	 isComposite(t.target) ?
							model.getInitial(t.target).outgoing[0].target	// there must be only one
						:
							t.target
						;
/*				// a priori, now done by getEffect
				let effect = isComposite(t.target) ? concatEffects(concatEffects(t.effect, t.target.entry), model.getInitial(t.target).outgoing[0].effect) : t.effect;
				const lastEffect = undefined;
/*/
				let effect = t.effect;
				const lastEffect = isComposite(t.target) ? model.getInitial(t.target).outgoing[0].effect : undefined;
/**/
/* no longer necessary
				if(tgt.kind === "shallowHistory" && tgt.region !== t.source) {
					effect = concatEffects(effect, tgt.region.entry);
				}
*/
				if(t.source.kind === 'initial') {
					if((!actualRegion) || r != actualRegion) {
						return [];
					} else {
						let src = t.source;
						return [{
							region: actualRegion || r,
							name: fullName(t),	// TRANSITION NAME
							source: src,
							target: tgt,
							trigger: t.trigger,
							ports: t.ports,
							guard: t.guard,
							effect: effect,
							lastEffect,
						}];
					}
				} else if(isComposite(t.source)) {
// no longer necessary					effect = concatEffects(t.source.exit, effect);
					var sources = getStates(t.source, true).filter(e =>
						!e.kind	// exclude Pseudostates
					);
					return sources.map((src, idx) => ({
						region: actualRegion || r,
						name: `${fullName(t)}${forTransparentExecution ? '' : `_${idx}`}`,	// TRANSITION NAME
						source: src,
						target: (tgt.kind == 'shallowHistory')
							?	(tgt.region == src.region)
								?	src	// simple case
								:	tgt	// restoreHistoryChoice
							:	tgt,
						trigger: t.trigger,
						ports: t.ports,
						guard: t.guard,
						effect: effect,
						lastEffect,
					}));
				} else {
					let src = t.source;
					return [{
						region: actualRegion || r,
						name: fullName(t),	// TRANSITION NAME
						source: src,
						target: tgt,
						trigger: t.trigger,
						ports: t.ports,
						guard: t.guard,
						effect: effect,
						lastEffect,
					}];
				}
			});
			return ret;
		}
		function isSM(s) {
			return !s.region;
		}
		function fullName(s) {	// s : State
			return isSM(s.region) ? s.name : `${fullName(s.region)}${
				forTransparentExecution ?
					"."	// using a '.' as separator to make execution of original possible while displaying explicit
				:
					"_"
			}${s.name}`;
		}
		function transformState(s) {
			if(s) {
				var fn = model.stateFullName(s);
				var ret = trace.states[fn];
				if(!ret) {
					ret = {};
					trace.states[fn] = ret;

		//			ret.region = transformState(s.region);
					ret.region = transformState(sm);
					ret.name = fullName(s);
		//			ret.incoming = (s.incoming || []).map(transformTransition);
					ret.incoming = getIncoming(s).map(transformTransition);
		//			ret.outgoing = (s.outgoing || []).map(transformTransition);
					ret.outgoing = getOutgoing(s).map(transformTransition);
					//ret.type = s.type;
					if(s.kind === "choice") {
						ret.kind = undefined;
					} else if(s.kind === "shallowHistory") {
						if(isComplexHistory(s)) {
							// TODO: get rid of that choice, because there should not be any choice in explicit state machines
							ret.kind = "choice";
						} else {
							ret.kind = undefined;
						}
					} else {
						ret.kind = s.kind;
					}
		//			ret.entry = s.entry;
		//			ret.exit = s.exit;
					ret.doActivity = s.doActivity;
		//			ret.states = s.states.map(transformState);
		//			ret.transitions = s.transitions.map(transformTransition);
					ret.internalTransitions = {};
					const internalTransitions = [
						// TODO: handle more levels
						...Object.entries(s.region.internalTransitions || {}).map(([n, t]) => [`${s.region.name}_${n}`, t]),
						...Object.entries(s.internalTransitions || {}),
					];
//console.trace(fn, internalTransitions.map(([n,t]) => `${n} : ${t.trigger}`))
					internalTransitions.map(([n,t]) => {
						const trans =  transformTransition(t);
						ret.internalTransitions[n] = trans;
						ret.internalTransitions[n].isInternal = true;
						//const name = `__internal__${n}__`;	// keep this for transparent execution?
						const name = `__internal__${s.name}__${n}__`;
						ret.internalTransitions[n].name = name;

						ret.internalTransitions[n].source = ret;
						ret.internalTransitions[n].target = ret;
						ret.internalTransitions[n].region = ret;

						ret.transitionByName = ret.transitionByName || {};
						ret.transitionByName[name] = trans;
					});
				}
				return ret;
			} else {
				return undefined;
			}
		}
		function resetTimers(trans) {
			var ret = '';
			(getOutgoing(trans.source) || []).filter(t =>
				trans != t && (t.trigger || '').match(model.afterRegex)
			).forEach(t => {
				var time = getTime(t);
				var evName = getEvName(time);
				ret = `resetTimer(${evName}); ${ret}`;
			});
			return ret;
		}
		function getTrigger(t) {
			var ret = (t.source.kind === 'choice' && t.guard) ?
				`${expr2id(t.guard)}`//`when(${t.guard})`	// TODO: make GUARD_ operations private
			: t.trigger || '';
			if(ret.match(model.afterRegex)) {
				var time = getTime(t);
				var evName = getEvName(time);
				ret = evName;
			} else if(ret.match(model.whenRegex)) {
				// TODO: enable when we have implemented test evaluation ret = ret.replace(whenRegex, '"event $1"');
			}
			return ret == '' ? undefined : ret;
		}
		function concatEffects(a, b) {
			if(a && a != '') {
				if(b && b != '') {
					return `${a}\n${b}`;
				} else {
					return a;
				}
			} else {
				if(b && b != '') {
					return b;
				} else {
					return undefined;
				}
			}
		}
		function getEffect(t) {
			var ret;
			function append(p) {
/*
				if(p != '') {
					if(ret != '') {
						ret += ' ' + p;
					} else {
						ret = p;
					}
				}
*/
				ret = concatEffects(ret, p == '' ? undefined : p);
			}

			// find all the exited and entered states
			// remark: this algorithm is also in AnimUMLEngine.fire. it should probably be abstracted into a model operation
			const source = model.fullState(t.source);
			const target = model.fullState(t.target);
			let i = 0;
			for(; i < source.length && i < target.length ; i++) {
				if(source[i] !== target[i]) {
					break;
				} else if(t.source == source[i] && !t.isInternal) {
					break;
				}
			}
			source.splice(0, i);
			target.splice(0, i);

			if(!t.isInternal) {
				append(resetTimers(t));
				for(const src of source.slice(0).reverse()) {
					append(getExit(src));
				}
			}
			append(t.effect || '');

			if(storedParams && t.trigger?.startsWith("GUARD_")) { // not working because already not a choice any more: t.source.kind === "choice" && t.target.kind !== "choice") {
				ret = "storedParams = undefined;" + ret;
			}
			if(!t.isInternal) {
				const effects = target.map(tgt => getEntry(tgt));
				if(t.lastEffect) {
					// TODO: probably more complex in the general case, but we would have to rewrite this transformation in a modular way to fix this
					effects.splice(-1, 0, t.lastEffect);
				}
				for(const effect of effects) {
					append(effect);
				}
			}

			return ret == '' ? undefined : ret;
		}
		function transformTransition(t) {
			const effect = (moveAfterChoiceEffectsUp && getTrigger(t)?.startsWith("GUARD_")) ? "" : getEffect(t);
			return {
				region: transformState(t.region),
				name: t.name,
				source: transformState(t.source),
				target: transformState(t.target),
				trigger: getTrigger(t),
				ports: t.ports,
				guard: (t.source.kind == 'choice') ? undefined : t.guard,
				effect: effect,
			};
		}
//*
//		console.log(trace);
//		console.log(ret);
		var ret = {};
		trace.states[model.stateFullName(sm)] = ret;

		//var allTransitions = [sm].concat(getStates(sm, true, true)).flatMap(s => getTransitions(s, sm));
		// [TRANS-ORDER] we must put the transitions in the order in which the AnimUMLEngine would have considered them in the original model
		var allTransitions = [sm, ...getStates(sm, true, true)].flatMap(s => getTransitions(s, sm));

		ret.name = sm.name;
		ret.type = sm.type;
		ret.isActor = sm.isActor;
		ret.isObserver = sm.isObserver;
		ret.class = sm.class;
		ret.states = getStates(sm).map(transformState);
		//ret.transitions = allTransitions.map(transformTransition);
		// [TRANS-ORDER] continued
		ret.transitions = ret.states.flatMap(e =>
			e.outgoing
				//.concat(Object.values(e.internalTransitions))
		);

		ret.operationByName = {...sm.operationByName};
		ret.operations = Object.values(ret.operationByName);
		for(const [opName, op] of Object.entries(ret.operationByName)) {
			op.name = opName;
		}
		ret.propertyByName = {...sm.propertyByName};
		if(needsHistory) {
			ret.propertyByName["_histories_"] = {
				defaultValue: {},
				type: 'Map<String,String>',
			};
		}

		if(forTransparentExecution) {
			// not necessary + there may be several transitions with the same name, only one of which would end up in transitionByName
		} else {
			ret.stateByName = Object.fromEntries(ret.states.map(state => [state.name, state]));
			ret.transitionByName = Object.fromEntries(ret.transitions.map(trans => [trans.name, trans]));
		}
		return ret;
/*/
		return {
			name: name,
			states: sm.states.map(transformState),
			transitions: sm.transitions.map(transformTransition),
		};
/**/
}

