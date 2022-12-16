import {forEachEntry} from "./Utils.js";


// Modify model tree in-place into a graph
// Should be idempotent (i.e., running multiple times should be equivalent to running once).
export function buildModel(g) {
	g.operations = [];
	Object.entries(g.operationByName || {}).forEach(([opName, op]) => {
		if(op) {
			op.name = opName;
			op.class = g;
			g.operations = g.operations || [];
			g.operations.push(op);
		}
	});
	if(g.objects || g.connectorByName) {
		if(!g.objects) {
			g.objects = [];
		}
		if(typeof g.classes === "object") {	// if it is a string, ignore it
			Object.values(g.classes).forEach?.(cl => {
				buildModel(cl);
			});
		}
		g.objects.forEach(object => {
			buildModel(object);
		});
		g.connectors = [];
		forEachEntry(g.connectorByName, (conName, con) => {
			g.connectors = g.connectors || [];
			g.connectors.push(con);
			con.name = conName;
			if(!con.ends) {
				con.ends = conName.split("2");
			}
			con.ends = con.ends.map(end => {
				var o = end;
				if(typeof(end) == 'string') {
					o = g.objects.find(o => o.name == end);
					if(!o) {
						o = {name: end};
						g.objects.push(o);
					}
				}
				return o;
			});
		});

		return g;
	}
	g.states = [];
	g.transitions = [];
	Object.keys(g.stateByName || {}).forEach(stateName => {
		var state = g.stateByName[stateName];
		state.region = g;
		buildModel(state);
		state.name = stateName;
		function getOrCreateTrans(transName) {
			if(typeof(transName) == 'string') {
				var ret = g.transitionByName[transName];
				if(!ret) {
					ret = {};
					g.transitionByName[transName] = ret;
				}
				return ret;
			} else {
				return transName;
			}
		}
		state.incoming = (state.incoming || []).map(getOrCreateTrans);
		state.incoming.forEach(trans => {
			trans.target = state;
		});
		state.outgoing = (state.outgoing || []).map(getOrCreateTrans);
		state.outgoing.forEach(trans => {
			trans.source = state;
		});
		g.states.push(state);
		Object.entries(state.internalTransitions || {}).forEach(([transName, trans]) => {
			// trying to avoid name collisions with regular transitions
			transName = `__internal__${transName}__`;

			trans.region = state;
			trans.isInternal = true;
			trans.source = state;
			trans.target = state;
			trans.name = transName;
			state.transitionByName = state.transitionByName || {};
			state.transitionByName[transName] = trans;
		});
	});
	Object.keys(g.transitionByName || {}).forEach(transName => {
		var trans = g.transitionByName[transName];
		if(trans.isInternal) {
			// this is a transition that we've added ourselves when handling states (see above)
			return;	
		}
		trans.name = transName;
		g.transitions.push(trans);
		trans.region = g;
		function processEnd(end, opposite) {
			var stateName = trans[end];
			if(!stateName) {
				const regex = /^(.+)2(.+?)(_[0-9]+)?$/;
				if(end === 'source') {
					stateName = transName.replace(regex, "$1");
				} else {
					stateName = transName.replace(regex, "$2");
				}
			}
			if(typeof(stateName) == 'string') {
				let parts = stateName.split('.');
				function getState(stateName) {
					var ret = undefined;
					parts.forEach(part => {
						ret = (ret || g).stateByName[part];
					});
					return ret;
				}
				var state = getState(stateName);
				if(!state) {
					state = {name: stateName, states: [], transitions: [], region: g};
					g.stateByName[stateName] = state; // TODO: generate path when necessary
					g.states.push(state);
				}
				trans[end] = state;
				if(!state[opposite]) {
					state[opposite] = [];
				}
				if(parts.length > 1) {
					// descendant transitions declared in ancestor should come first
					// notably so that the transformation to an explicit state machine can keep them
					// in the same order as they would be considered by the AnimUML engine
					state[opposite].unshift(trans);
				} else {
					state[opposite].push(trans);
				}
			}
		}
		processEnd('source', 'outgoing');
		processEnd('target', 'incoming');
	});
	return g;
}

