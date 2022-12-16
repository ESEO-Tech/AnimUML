import {} from "./lib/peg-0.10.0.min.js";

/*
	TODO:
		- add support for missing pseudostates?
		- PlantUML has a single namespace, which means that states are where they first appeared
			- e.g., a nested state can have an entry defined outside its owner state
			- our approach is simpler, but a simple copy paste to PlantUML does not create the same diagram
				- it is still possible to ask AnimUML to export to PlantUML
			==> for the time being it seems preferable to keep our way
		- unesc comments?
*/


export const grammar = String.raw`
	{
		const regions = [];
		let region;
		function newRegion() {
			region = {stateByName: {}, transitionByName: {}};
		}
		newRegion();
		function enter(name) {
			regions.push(region);
/*
			if(name in region.stateByName) {
console.log("region already existing", name)
				region = region[name];
			} else {
				newRegion();
			}
*/
			region = getState(name);
		}
		function leave(state) {
			const nestedRegion = region;
			region = regions.pop();
			//Object.assign(getState(state), nestedRegion);
		}
		function addTransition(trans, name) {
			simplifyTrans(trans);
			if(!name) {
				const baseName = trans.source + "2" + trans.target + "_";
				let i = 1;
				while((baseName + i) in region.transitionByName) i++;
				name = baseName + i;
			}
			region.transitionByName[name] = trans;
		}
		function addInternalTransition(state, trans, name) {
			simplifyTrans(trans);
			const st = getState(state);
			st.internalTransitions = st.internalTransitions || {};
			if(!name) {
				let i = 1;
				while(st.internalTransitions["T" + i]) i++;
				name = "T" + i;
			}
			st.internalTransitions[name] = trans;
		}
		function simplifyTrans(trans) {
			if(trans.trigger) {
				trans.trigger = trans.trigger.call + "(" + (trans.trigger.args || []).join(", ") + ")";
			} else {
				trans.trigger = undefined;
			}
			if(trans.guard) {
				trans.guard = unesc(trans.guard);
			} else {
				trans.guard = undefined;
			}
			if(trans.effect) {
				trans.effect = unesc(trans.effect);
			} else {
				trans.effect = undefined;
			}
			if(trans.label) {
				trans.label = unesc(trans.label);
			} else {
				trans.label = undefined;
			}
			if(trans.comment) {
				trans.comment = unesc(trans.comment);
			} else {
				trans.comment = undefined;
			}
		}
		function unesc(s) {
			const ret = s
				.replace(/\\(.)/g, (m, c) => {
					switch(c) {
						case "\\": return "\\";
						case "n": return "\n";
						case "t": return "\t";
						default: return c;
					}
				})
			;
			return ret;
		}
		// could be generalized to addStatePropertyValue, because it is notably used with action={type: "kind", action: "choice"}
		function addStateAction(state, action) {
			const oldAction = getState(state)[action.type];
			if(oldAction) {
				console.log("warning:", action.type, "already defined for", state, "(old action:", oldAction, "; new action:", action.action, ")");
			}
			getState(state)[action.type] = unesc(action.action);
		}
		function getState(state) {
			return region.stateByName[state] = region.stateByName[state] || {stateByName: {}, transitionByName: {}};
		}
		function addInit() {
			region.stateByName.init = {type: "Pseudostate", kind: "initial"};
		}
		function addTerminate() {
			region.stateByName.__end__ = {type: "Pseudostate", kind: "terminate"};
		}
		function addShallowHistory(st) {
			const parent = getState(st);
			parent.stateByName = parent.stateByName || {};
			parent.stateByName._hist_ = {type: "Pseudostate", kind: "shallowHistory"};
		}
	}
	start =	NL* title:(_ "title" _ title:REST NL+ {return title;})?
		(transition / state / note)* _
		{return region;}

	transition = internalTransition / externalTransition
	externalTransition =	_ source:("[*]" {addInit(); return "init";} / source:ID)
				transitionArrow
				_ target:(
					"[*]" {addTerminate(); return "__end__";}
				/	st:ID _ "[H]" {addShallowHistory(st); return st + "._hist_";}
				/	h:ID t:(_ "." _ i:ID {return i;})* {return [h, ...t ?? []].join(".");}
				)
				name:transitionName?
				_ label:(
					":" _ label:(
						&(transitionLabel NL) label:transitionLabel {return label;}
					/	label:REST {return {label};}
					) {return label;}
				)? NL+
				note:transitionComment
																{addTransition(Object.assign({source, target, comment: note}, label), name);}

	transitionName =	_ "as" _ name:(ID / STRING)									{return name;}
	transitionComment =	// TODO: support note on link anywhere after a link, like PlantUML?
				note:(
					_ "note" _ "on" _ "link" _ NL+
						note:(!(_ "end" _ "note") note:REST NL {return note;})*
					_ "end" _ "note" _ NL+ {return note.join("\n");}
				)?
																{return note;}
	transitionArrow = _ "-"+ (
				direction hidden?
			/	hidden direction?
			)? "-"* ">"

	direction	=	"left" / "right" / "up" / "down"
			/	"l" / "r" / "u" / "d"

	hidden		=	"[hidden]"

	internalTransition = _ state:ID name:transitionName? _ ":" _ (		// WARNING: name allowed for stateAction although not used
					&(stateAction NL) action:stateAction							{addStateAction(state, action);}
				/	&(transitionLabel NL) label:transitionLabel						{addInternalTransition(state, label, name);}
				/	label:REST										{addInternalTransition(state, {label}, name);}
				) NL+
	state =	_ "state" _ (STRING _ "as" _ )? name:ID _ (
			"<<" _ action:("choice" / "junction" / "join") _ ">>" {addStateAction(name, {type: "kind", action});}
		/	("{" {enter(name);}) _ NL+
				(transition / state)*
			_ ("}" {leave(name);})
		)? _ NL+

	transitionLabel =	trigger:sig? _ ports:("from" _ h:ID _ t:("," _ i:ID _ {return i;})* {return [h, ...t];})? guard:("[" _ guard:[^\]\n]* _ "]" _ {return guard.join("");})? effect:(
					"/" _
					effect:(
						effect:block {return effect.flat().slice(1, -1).join("");}
					/	effect:REST {return effect;}
					) {return effect;}
				)?
				{return {trigger, ports, guard, effect};}

	block = b:("{" ([^{}] / b:block {return b.flat();})* "}") {return b.flat();}

	stateAction = type:("entry" / "exit" / "do" {return "doActivity";}) _ "/" _ action:REST {return {type, action};}
	note =	_ "note" _ ("left" / "right" / "top" / "bottom") _ "of" _ state:ID _ NL
			note:(!(_ "end" _ "note") note:REST NL {return note;})*
		_ "end" _ "note" _ NL+												{getState(state).comment = note.join("\n");}



	REST = s:[^\n]*										{return s.join("");}
	ID = h:[A-Za-z_.À-ÖØ-öø-ÿ]t:[A-Za-z0-9_.À-ÖØ-öø-ÿ]*
												{return h + t.join("");}
	STRING = '"' s:[^"]* '"'								{return s.join("");}
	sig =	call:ID _ args:("("
			args:(_ args:(h:arg t:(_ "," _ arg:arg {return arg;})* {return [h].concat(t);}) {return args;})?
		")" {return args;})?								{return {call, args};}
	arg = arg:[^,)]+ {return arg.join("");}


	NL = _ COMMENT? "\r"? "\n"
	_ = ([ \t] / "\\n")*
	COMMENT = "'" REST / "/'" (!"'/" .)* "'/"
`;

export const parser = peg.generate(grammar);
