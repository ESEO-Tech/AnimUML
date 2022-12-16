import {} from "./lib/peg-0.10.0.min.js";

export const grammar = `
	{
		const refSpans = new Map();
		const map = new Map();
		let index = 0;
		const stack = [];
		const toResolve = new Map();
		const activations = [];
		let parts;
		function store(id, to) {
			if(id) {
				map.set(id, {index, to});
/*
				if(toResolve.has(id)) {
					const objs = toResolve.get(id);
					for(const obj of objs) {
						obj.obj[obj.idrefAttr] = index;
					}
				}
*/
			}
		}
		// for forward references
		function resolveLater(id, to) {
			if(!parts.has(to)) {
				let c = toResolve.get(to);
				if(!c) {
					c = [];
					toResolve.set(to, c);
				}
				c.push(index);
			}
		}
		function enter() {
			stack.push(index);
			index = 0;
		}
		function leave() {
			index = stack.pop();
		}
		function gates(id) {
			const calls = toResolve.get(id);
			return calls?.map(i => ({name: "??", accept: i}));
		}
		const self = this;
		function unsupportedItem(item, message) {
			const loc = location();
			console.log(\`\${self.humanLocation ? \`\${self.humanLocation}: \` : ""}Line \${loc.start.line}, column \${loc.start.column}: \${message}\`)
/*
			index++;
			return item;
/*/
			return undefined;
/**/
		}
	}
	start =	NL* title:(_ "title" _ title:REST NL+ {return title;})?
		lifelines:(lifelines:lifeline* {parts = new Set(lifelines); return lifelines;})
		events:event* _
		{return {title, lifelines: lifelines.map(e => e.name), events: events.filter(e => e),
			//toResolve,

			// used by CLILoadModel.js/createDummyModel
			objects: self.keepObjects ? lifelines : undefined,
			refSpans: self.keepRefSpans ? refSpans : undefined,
		};}

	lifeline = _ isActor:("actor" {return true;} / "participant" {return false;}) _ (STRING _ "as" _)? name:ID _ NL+ {return {isActor, name};}

	event =
			_ id:(id:ID _ ":" _ {return id;})?
			from:ID _ "-" mode:(">" / "?") _ to:ID _
			action:(e:("++" / "--" / "**" / "!!") _ {return e;})?
			":" _ call:(sig / call:REST {return {call};}) NL+
			activate:(_ "activate" _ act:ID &{
				return mode === ">" && act === to;
			} _ NL+)?								{
													store(id, to); resolveLater(id, to);
													if(activate || action === "++") {
														activations.push(index);
													}
													index++;
													const ret = {arguments: call.args || undefined, target: call.target || undefined, from, to: to};
													if(mode === "?") {
														ret.call = call.call;
														ret.type = "call";
													} else {
														ret.accept = call.call;
														ret.type = "autoAcceptCall";
													}
													return ret;
												}
		/	_ from:ID _ "-->" _ to:ID _ ":" _ returnValue:REST NL+			{return unsupportedItem({returnValue, from, to}, \`warning: ignoring return from \${from} to \${to}; try using PlantUML's return syntax or AnimUML's returning syntax.\`);}
				// TODO: recognize this dotted arrow right after deactivation
		/	_ "returning" _ returningCall:ID _ ":" _ returnValue:REST NL+		{index++; return {type: "return", returningCall: map.get(returningCall).index, return: returnValue};}
		/	_ fromGate:("[" _ e:ID? _ {return e ?? "??";})? "->" _ to:ID _ ":" _ call:(sig / call:REST {return {call};}) NL+
			activate:(_ "activate" _ act:ID &{
				return act === to;
			} _ NL+)?								{
													index++;
													if(activate) {
														activations.push(index);
													}
													return {type: "found", arguments: call.args || undefined, call: call.call, fromGate, to};
												}
		/	_ "activate" _ activate:ID _ NL+					{activations.push("UNKNOWN"); return unsupportedItem({activate}, \`warning: ignoring activation of \${activate}, which does not immediately follow a call message.\`);}
		/	_ "deactivate" _ deactivate:ID _ NL+					{activations.pop(); return unsupportedItem({deactivate}, \`warning: ignoring deactivation of \${deactivate}; try returning the call instead.\`);}
		/	_ id:(id:ID _ ":"_ {return id;})?
			"ref" _ "over" _ h:ID t:(_ "," _ e:ID {return e;})* _
			accepting:("accepting" _ gh:gate gt:("," _ e:gate {return e;})* {return [gh, ...gt]})?
			":" _ ref:REST NL+
												{store(id); index++; refSpans.set(ref, [h, ...t]); return {type: "ref", ref, gates: [...accepting ?? [], ...gates(id) ?? []]};}
		/	_ "loop" _ condition:loopCondition (NL+ {enter()}) loopBody:event* _ "end" _ NL+	{leave(); index++; return {type: "loop", ...condition, loopBody: loopBody.filter(e => e)};}
		/	_ type:("alt" / "par") _ h:(condition:REST (NL+ {enter()}) altBody:event*		{leave(); return {type: "alternative", condition: condition ? condition : undefined, altBody: altBody.filter(e => e)};})
			t:(_ "else" _ condition:REST (NL+ {enter()}) altBody:event*		{leave(); return {type: "alternative", condition, altBody: altBody.filter(e => e)};})*
			_ "end" _ NL+								{index++; return {type, alternatives: [h, ...t]};}
		/	_ "create" _ create:ID _ NL+						{index++; return {create};}
		/	_ "..." _ "after" _ "(" _ after:[^\\n)]* ")" _ "..." "."* NL+		{index++; return {type: "after", after: after.join("")};}
		/	_ "accept" _ accept:ID _ NL+
			activate:(_ "activate" _ to:ID &{
				return to === map.get(accept).to;
			} _ NL+)?								{
													index++;
													const call = map.get(accept).index;
													if(activate) {
														activations.push(call);
													}
													return {type: "accept", accept: call};
												}
		/	_ "return" _ returnValue:REST NL+					{index++; return {type: "return", returningCall: activations.pop(), return: returnValue};}

	gate	=	accept:ID _ "from" _ name:ID _						{return {name, accept: map.get(accept).index};}

	loopCondition	=	upper:INT _ "times" _						{return {lower: upper, upper};}
			/	condition:REST							{return {condition};}

	REST = s:[^\\n]*									{return s.join("");}
	ID = h:[A-Za-z_]t:[A-Za-z0-9_]*								{return h + t.join("");}
	STRING = '"' [^"]* '"'
	sig =	target:(e:[^(\\n=]+ _ "=" _ {return e.join("");})? call:[^(\\n]* _ "("
			args:(_ args:(h:arg t:(_ "," _ arg:arg {return arg;})* {return [h, ...t];}) {return args;})?
		")"										{return {call: call.join(""), args: args ?? [], target};}
	arg = arg:[^,)]+ {return arg.join("");}
	NL = _ COMMENT? "\\r"? "\\n"
	_ = [ \\t]*
	COMMENT = "'" REST / "/'" (!"'/" .)* "'/"
	INT	= d:[0-9]+										{return Number.parseInt(d.join(""));}
`;

export const parser = peg.generate(grammar);

export function getEventType(e) {
	if("lifelines" in e) {
		return "interaction";
	} else if("fromGate" in e) {
		return "found";
	} else if("call" in e) {
		return "call";
	} else if("call" in e) {
		return "call";
	} else if("accept" in e) {
		if(typeof e.accept === "string") {
			return "autoAcceptCall";
		} else {
			return "accept";
		}
	} else if("returningCall" in e) {
		return "return";
	} else if("state" in e) {
		return "state";
	} else if("after" in e) {
		return "after";
	} else if("ref" in e) {
		return "ref";
	} else if("alternatives" in e) {
		return "alt";
	} else if("loopBody" in e) {
		return "loop";
	} else if("altBody" in e) {
		return "alternative";
	} else {
//		throw `Unknown event type: ${JSON.stringify(e)}`;
	}
}

