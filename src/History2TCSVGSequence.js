import {indent} from './TemplateUtils.js';
import {remove,last} from './Utils.js';
import {generateTCSVGSequence} from './TCSVGSequenceGenerator.js';

/*
	TODO:
		- if msg.ignored -> show it is ignored
		- show the Ether
		- show unreceived messages differently from ignored messages but still show their target
		- make all lifelines the same length (+ bottom boxes?)
 */
export function history2TCSVGSequence(hist, model, {origin, scale, hideSets, hideStates, showPseudostateInvariants, hideLinks, participants = [], styleMode, showTransitions}) {
	const parts = participants;	// TODO: find participants missing from this list, otherwise the generated SVG will have references to missing objects or actors
		//model.objects.filter(o => !model.isPort(o));
	let msgId = -1;
	function after() {
		const ret = msgId > 0 && !skipAfter ? `after="msg[${msgId - 1}]"` : "";
		skipAfter = false;
		return ret;
	}
	function escAttrVal(value) {
		return (value + "").replace(/"/g,
			//"&amp;quot;"
			"&quot;"
		);
	}
	function partId(obj) {
		return `participant.${typeof obj === "string" ? obj : obj.name}`;
	}
	function sig(msg) {
		return msg.displaySignature ?? msg.signature;
	}
	const prevState = {};
	const unacceptedCalls = [];
	const signatures = {};
	let skipAfter = false;
	let parent = "";
	return generateTCSVGSequence(indent`
		${parts.map((obj, i) =>
			indent`
				<use id="${partId(obj)}" xlink:href="#${obj.isActor ? 'actor' : 'object'}" ${i == 0 ? `x="100" y="0"` : `after="${partId(parts[i-1])}"`}>
					<param name="name" value="${obj.name} : ${obj.class || ""}"/>
				</use>
			`
		)}


		${hist.flatMap((step, stepIndex) => {
			//const stepId = `step[${stepIndex}]`;
			const pre = [];
			if(showTransitions && step.cause.match(/^transition:/)) {
				msgId++;
				pre.push(indent`
					<use	id="msg[${msgId}]"
						xlink:href="#note"
						${after()}
						${parent}
					>
						<param name="on" value="${partId(step.activeObject)}"/>
						<param name="note" value="${step.cause}"/>
						<param name="title" value='
Watch expressions after:
							${JSON.stringify(step.watchExpressions, null, 2)}
Configuration before:
							${JSON.stringify(engine.treeifyConfig(step.configuration), null, 2)}'/>
					</use>
				`);
			}
			if(step.cause === "PlantUML:loop") {
				msgId++;
				pre.push(indent`
					<use	id="msg[${msgId}]"
						xlink:href="#fragment"
						${after()}
					>
						<param name="on" value="${parts.map(partId).join(",")}"/>
						<param name="label" value="loop"/>
						<param name="condition" value=" "/>
					</use>
				`);
				parent = `parent="msg[${msgId}]"`;
				skipAfter = true;
			}
			const ret = pre.concat((step.messages || []).map((msg, msgIndex) => {
				//const msgId = `${stepId}.msg[${msgIndex}]`;
				let ret = ""
				if(sig(msg).match(/^after\(/)) {
					msgId++;
					ret += indent`
						<use	id="msg[${msgId}]"
							xlink:href="#after"
							${after()}
							${parent}
						>
							<param name="on" value="${parts.map(partId).join(",")}"/>
							<param name="signature" value="${sig(msg)}"/>
						</use>
					`;
					return ret;
				}
				if(msg.type === "set") {
					if(hideSets) {
						return ret;
					} else if(msg.source === msg.target) {
						msgId++;
						ret += indent`
							<use	id="msg[${msgId}]"
								xlink:href="#set"
								${after()}
								${parent}
							>
								<param name="on" value="${partId(msg.source)}"/>
								<param name="signature" value="${escAttrVal(sig(msg))}"/>
							</use>
						`;
					} else {
						msgId++;
						ret += indent`
							<use	id="msg[${msgId}]"
								xlink:href="#direct"
								${after()}
								${parent}
								from="${partId(msg.source)}"
								to="${partId(msg.target)}"
							>
								<param name="signature" value="${escAttrVal(sig(msg))}"/>
							</use>
						`;
					}
					return ret;
				} else {
					if(msg.sentAt == step && msg.source !== '[') {
						msgId++;
						msg.callId = msgId;
						ret += indent`
							<use	id="msg[${msgId}]"
								xlink:href="#call"
								${after()}
								${parent}
							>
								<param name="on" value="${partId(msg.source)}"/>
							</use>
						`;
						unacceptedCalls.push(msgId);
						signatures[msgId] = sig(msg);

					}
					if(msg.receivedAt == step) {
						if("callId" in msg) {
							msgId++;
							ret += indent`
								<use	id="msg[${msgId}]"
									xlink:href="#${msg.source === msg.target ? "self" : ""}accept"
									${after()}
									call="msg[${msg.callId}]"
									${parent}
								>
									<param name="on" value="${partId(msg.target)}"/>
									<param name="signature" value="${escAttrVal(sig(msg))}"/>
								</use>
							`;
							remove(unacceptedCalls, msg.callId);

							if(msg.returnedValue) {
								msgId++;
								ret += indent`
									<use	id="msg[${msgId}]"
										xlink:href="#direct"
										${after()}
										${parent}
										from="${partId(msg.target)}"
										to="${partId(msg.source)}"
										class="dashed"
									>
										<param name="signature" value="${escAttrVal(msg.returnedValue)}"/>
									</use>
								`;
							}
						} else {
							// found message
							msgId++;
							ret += indent`
								<use	id="msg[${msgId}]"
									xlink:href="#found"
									${after()}
									leftmost="${partId(parts[0].name)}"
									${parent}
								>
									<param name="on" value="${partId(msg.target)}"/>
									<param name="signature" value="${escAttrVal(sig(msg))}"/>
								</use>
							`;
						}
					}
				}
				return ret;
			}));
			if(step.activeObject) {
				const activeObjects = step.activeObjects || [step.activeObject];
				for(const ao of activeObjects) {
					const aoName = ao.name;
					function stateIn(step) {
						// prevStateIn:
						//return step.configuration.currentState[aoName].map(s => s.name).join(".");
						if(model.isActive(ao)) {
							const states = step.configurationAfter.currentState[aoName];
							if(!last(states).kind || showPseudostateInvariants) {
								return states.map(s =>
									s.name
								).join(".");
							}
						}
/*						// not working correctly with synchronous transitions
						if(step.cause.startsWith("transition:")) {
							const transName = step.cause.replace(/^transition:/, "");
							const trans = model.getTransition(transName);
							const target = trans.target;
							if(!target.kind || showPseudostateInvariants) {
								return model.fullState(target).map(s => s.name).join(".");
							}
						}
*/
						return undefined;
					}
					if(!hideStates) {
						const state = stateIn(step);
						// TODO: not after but aligned if multiple state invariants on the same step
						if(state && (stepIndex == 0 || state !== prevState[aoName])) {
							msgId++;
							ret.push(indent`
								<use	id="msg[${msgId}]"
									xlink:href="#invariant"
									${after()}
									${parent}
								>
									<param name="on" value="${partId(aoName)}"/>
									<param name="invariant" value="${escAttrVal(state)}"/>
									<param name="link" value="javascript:backTo(${stepIndex + 1});"/>
								</use>
							`);
							prevState[aoName] = state;
						}
					}
				}
			}
			return ret;
		}).join("\n")}
		${unacceptedCalls.map((callId) => {
			msgId++;
			return indent`
				<use	id="msg[${msgId}]"
					xlink:href="#unaccepted"
					${after()}
					call="msg[${callId}]"
					rightmost="${partId(last(parts))}"
					${parent}
				>
					<param name="signature" value="${escAttrVal(signatures[callId])}"/>
				</use>
			`;
		}).join("\n")}
	`, {origin, scale, hideLinks, styleMode});
	// TODO: unreceived/lost messages
}

