import {hasElements} from './Utils.js';

// for legacy analysis
import {explore, buildTrace} from './Explorer.js';

// for z2mc-based analysis
import {engineToSTR} from "./EngineToSTR.js";
import {STR2TR} from "./z2mc-javascript/src/operators/str/str2tr.js";
import {PingPongCircularBuffer} from "./z2mc-javascript/src/datastructures/pingpong_unbounded_circular_buffer.js";
import {dataless_bfs_traversal} from "./z2mc-javascript/src/algorithms/z_dataless_bfs.js";
import {dataless_dfs_traversal} from "./z2mc-javascript/src/algorithms/z_dataless_dfs.js";
import {StateEventAsymmetricSynchronousProductSemantics} from"./z2mc-javascript/src/operators/str/synchronous_product_semantics.js";
import {UnboundedStack} from "./z2mc-javascript/src/datastructures/unbounded_stack.js";




// TODO: move to common module imported by AnimUML.js to avoid duplication of this setting
const debugWorker = false;

if(debugWorker) {
	console.log("Analysis worker created");
}

const queue = [];
var stop = false;
const progressInterval = 2000;
var nextProgress = 0;
let heatMap;
onmessage = (msg) => {
	if(debugWorker) {
		console.log("Message to worker: ", msg);
	}
	function returnValue() {
		return new Promise((resolve, reject) => {
			queue.push(resolve);
		});
	}
	switch(String(msg.data.action)) {
		case 'exploreStateSpace':
			if(debugWorker) {
				console.log("Exploring state space");
			}
			function sendMsg(action) {
				return (nbConfigs, nbTrans, nbDeadlocks, trace) => {
					if(action === "progress") {
						if(nextProgress > performance.now()) {
							return;
						} else {
							nextProgress += progressInterval;
						}
					}
					postMessage({action, value: `${nbConfigs} configurations; ${nbTrans} transitions; ${performance.now() - startTime}ms; ${nbDeadlocks} deadlocks${
						Array.isArray(trace) ?(
							hasElements(trace) ?
								`; <a href="javascript:replay('${trace.join(",").replace(/"/g, "&quot;").replace(/'/g, "&apos;")}')">show trace</a>`
							:	"; stopping condition was already true"
						):	""
					}`});
				};
			}
			stop = false;
			queue.splice(0);
			const startTime = performance.now();
			nextProgress = startTime;
			const engine = {
				reset() {
					postMessage({action: "reset"});
					return returnValue();
				},
				async getConfiguration() {
					postMessage({action: "getConfiguration"});
					return returnValue();
				},
				async setConfiguration(config) {
					postMessage({action: "setConfiguration", config});
					// only for the synchronization, not for the value
					return returnValue();
				},
				async parseConfiguration(config) {
					postMessage({action: "parseConfiguration", config});
					return returnValue();
				},
				async getFireables() {
					postMessage({action: "getFireables"});
					return returnValue();
				},
				async fire(trans) {
					postMessage({action: "fire", trans});
					// only for the synchronization, not for the value
					return returnValue();
				},
				async isAccept() {
					postMessage({action: "isAccept"});
					return returnValue();
				},
				async parseTransition(trans) {
					postMessage({action: "parseTransition", trans});
					return returnValue();
				},
			};
			heatMap = {};
			const analyze =
				msg.data.useZ2mc
				?	z2mcAnalyze
				:	legacyAnalyze
			;

			analyze(engine, sendMsg, () => stop, heatMap, msg.data.withBFS,
				msg.data.withCustomConfigKey
				?	(config) => {
						postMessage({action: "getConfigKey", config});
						return returnValue();
					}
				:	undefined,
				msg.data.stepBreakpoint,
			);
			break;
		case "stop":
			stop = true;
			break;
		case "askHeatMap":
			postMessage({action: "setHeatMap", value: heatMap,});
			break;
		case "return":
			queue.shift()(msg.data.value);
			break;
		default:
			throw "Unsupported action to worker " + msg.data.action;
			break;
	}
};


// TODO:
//	trace
//		how Cip does it: store only parent configs, no transition, and recompute the transitions when constructing the trace
//			it is more expensive to reconstruct the trace this way
//			but
//				this saves memory because no useless information if stored
//				for non deterministic engines, a list of transitions is not enough
//			in BFS, parent configs are stored in a Map
//			in DFS, no need to store it in a Map: the stack already has this information
//		how it could be done differently (but less optimally): wrapping the engine
//	withBFS === false
//		use dataless_dfs_traversal, which has a different signature than dataless_bfs_traversal

// AnimUML.js leverages the engine's onfired callback to create a heatMap, which is not really useful here anymore
//	=> the heatMap parameter can probably be ignored
async function z2mcAnalyze(engine, sendMsg, stopRequested, heatMap, withBFS, getConfigKey, stepBreakpoint) {
	const progress = sendMsg("progress");

	let nbDeadlocks = 0;
	let nbTrans = 0;

	let accept = false;
	await engine.reset();

	// TODO:	if breakpoint is on a single config => compose with StateSynchronousProduct
	//		if breakpoint is on a step => compose with StepSynchronousProduct (old name: StateEventAsymmetricSynrhonousProductSemantics)
	//	this could be determined by static analysis of the breakpoint expression
	const baseSTR = engineToSTR(engine);
	const breakpointISTR = {
		initial() {
			return [false];
		},
		async actions({s: srcConfig, a: trans, t: tgtConfig}, config) {
			if(config) {
//*
				return [];	// same Fig. 4 from paper (as of 20220322), which is ok for AnimUML because we unplug the observer when we give back control to the user
/*/
				return [true];	// let the observer continue
/**/
			} else {
				// TODO: change to baseSTR.isAccepting?
				await engine.setConfiguration(srcConfig);	// for isAccept
				const isAccept = await engine.isAccept();
				return [isAccept];
			}
		},
		execute(action, {s: srcConfig, a: trans, t: tgtConfig}, config) {
			return [action];
		},
		isAccepting(config) {
			return config;
		},
	};

	const productSTR = new StateEventAsymmetricSynchronousProductSemantics(
		{
			...baseSTR,
			isAccepting: () => true,	// must be always true so that the breakpointISTR can decide when to stop
		},
		breakpointISTR,
	);
	const str_ = stepBreakpoint ? productSTR : baseSTR;


	function asString(s) {
		return typeof s === "string" ? s : JSON.stringify(s);
	}

	// TODO: use a hash map that does not require stringifying everything
	// wrapping str_ to save the trace (of concrete configurations)
	const parents = new Map();
	const str = {
		...str_,
		async initial() {
			return str_.initial();
		},
		async actions(config) {
			return str_.actions(config);
		},
		async execute(trans, config) {
			const ret = await str_.execute(trans, config);
			const parent = asString(config);
			for(const child_ of ret) {
				const child = asString(child_);
				if(!parents.has(child)) {	// remember the first one
					parents.set(child, parent);
				}
			}
			return ret;
		},
		async isAccepting(config) {
			return str_.isAccepting(config);
		},
	};
	const initials = (await str.initial()).map(asString);
	const tr = new STR2TR(str);
	// will store configurations returned by canonize (concrete or abstract)
	const known = {
		set: new Set(),
		addIfAbsent(e) {
			const hasnt = !this.set.has(e);
			if(hasnt) {
				this.set.add(e);
			}
			return hasnt;
		},
	};

	async function traversal(initial, next, on_entry, known, canonize) {
		const mem = undefined;
		const on_known = () => {};
		const on_exit = () => {};
		const addIfAbsent = (_, e) => known.addIfAbsent(e);
		if(withBFS) {
			const frontier = new PingPongCircularBuffer(5000);
			return await dataless_bfs_traversal(initial, next, canonize, on_entry, on_known, on_exit, mem, addIfAbsent, frontier);
		} else {
			const stack = new UnboundedStack(1024, 2);
			return await dataless_dfs_traversal(initial, next, canonize, on_entry, on_known, on_exit, mem, addIfAbsent, stack);
		}
	}

	traversal(
		await tr.initial(),		// list C
		async c => {
			const ret = await tr.next(c);		// c -> list C	 (supposed to be set C according to doc, but str2tr does not make sure it is a set)
			if(ret.length === 0) {
				nbDeadlocks++;
			}
			nbTrans += ret.length;		// WARNING: this also includes execute returning multiple configs, which is not possible with the current AnimUML engine
			return ret;
		},
		async (source, neighbour, canonical_neighbour, layer, memory) => {			// onentry
			const nbConfigs = known.set.size;
			progress(nbConfigs, nbTrans, nbDeadlocks);

			if(!accept) {	// remember the first one
				accept = await tr.isAccepting(neighbour) && neighbour;
			}
			return accept || stopRequested();
		},
		known,				// hash set of C
		getConfigKey						// canonize
		?	async (config) => config.kc ? JSON.stringify({bc: config.bc, kc: await getConfigKey(config.kc)}) : await getConfigKey(config)
		:	n => JSON.stringify(n)				// stringify is necessary here because synchronous composition configs are objects, which are all different for JavaScript's Set
	).then(async () => {
		let trace = undefined
		if(accept) {
			trace = [];
			const shouldParse = typeof accept !== "string";
			let target = asString(accept);
			let source;
			while(!initials.includes(target) && (source = parents.get(target))) {
				const actions = await str.actions(shouldParse ? JSON.parse(source) : source);
				let found = false;
				for(const action of actions) {
					const tgts = (await str.execute(action, source)).map(asString);
					if(tgts.includes(target)) {
						trace.unshift(action.ko?.a ?? action);
						found = true;
						break;
					}
				}
				if(!found) {
					break;
				}


				target = source;
			}
			if(!initials.includes(target)) {
				console.log("Error: failed to reconstruct complete trace.");
			}
		}
		sendMsg(stopRequested() && !accept ? "stopped" : "results")(known.set.size, nbTrans, nbDeadlocks, trace);
	});
}

// TODO: stepBreakpoint?
function legacyAnalyze(engine, sendMsg, stopRequested, heatMap, withBFS, getConfigKey, stepBreakpoint) {
	let accept = false;
	explore(engine, sendMsg("progress"), async (config, nbConfigurations) => {
		if(stopRequested()) {
			return true;
		}
		accept = await engine.isAccept();
		return accept;
	}, {
		onfired(trans, config) {
			for(const t of trans.split("||")) {	// spliting in case we have a synchronous transition
				heatMap[t]??=0;
				heatMap[t]++;
			}
		},
		withBFS,
		getConfigKey,
	}).then(async (ret) => {
		let trace;
		if(accept) {
			trace = await buildTrace(engine, ret.configs);
			// if synchronous composition, keep only the left engine
			if(trace?.[0]?.startsWith('{') && JSON.parse(trace[0]).left) {
				// TODO: this should probably not be done here
				trace = trace.map(e => JSON.parse(e).left);
			}
		}
		sendMsg(ret.stoppingConditionReached && !accept ? "stopped" : "results")(ret.nbConfigurations, ret.nbTransitions, ret.nbDeadlocks, trace);
	});
}

