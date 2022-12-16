import {} from "./lib/peg-0.10.0.min.js";

// TODO: make the syntax closer to Alf
// TODO: make it possible to keep notes as comments even if they appear before operations or properties
// TODO: move multiplicities to the "right" place... but keep compatibility with the old syntax (after type)?
	// actually, the UML specification has multiplicities after types

// the featuresGrammar is used in both the main (classes) parser of this module, and in the featuresParser, which can be used to parse only the features of an object, for instance
const featuresGrammar = String.raw`
	// TODO: {static}, {abstract} that can be anywhere in PlantUML but will not show up as is, only underline or italicize
	// TODO: stereotypes? apparently PlantUML only replaces << & >> by the corresponding Unicode quote characters
	//		notably the predefined stereotypes such as <<Create>> (for constructors), <<signal>> (for receptions, but not really a stereotype, just a notation keyword)
	//		a priori shown at the beginning of the line in UML
	operation =	_ visibility:visibility?
			_ isStatic:("{" _ "static" _ "}")?
			_ name:ID _ "(" parameters:parameters? ")" _ returnType:(":" _ type:ID _ multiplicity:multiplicity {return {type, multiplicity};})?
			stereotypes:stereotype*
			bodyAndComment:(
				"{" _ comment:comment? NL+ body:(
					//!(_ "}") body:REST NL+ {return body;}
					b:block {return b.flat();} / !(NL* _ "}") [^{}]
				)* NL* _ "}" NL+ {return {body: body.flat().join(""), comment};}
			/	comment:comment?
				NL+ {return {comment};}
			)
												{
													operationByName[name] = {
														name,
														private:	"private" === visibility ?
																	true
																:"public" === visibility ?
																	false
																:	undefined,
														isStatic: isStatic ? true : undefined,
														parameters,
														returnType: returnType?.type,
														multiplicity: returnType?.multiplicity ?? undefined,
														method: bodyAndComment.body,
														comments: bodyAndComment.comment ? [bodyAndComment.comment] : undefined,
														stereotypes,
													};
												}
	block = b:("{" ([^{}] / b:block {return b.flat();})* "}") {return b.flat();}

	parameters = _ head:parameter _ tail:("," _ param:parameter _ {return param;})*	{return [head, ...tail];}
	parameter = direction:parameterDirection? _ name:ID _ type:(":" _ type:ID _ multiplicity:multiplicity {return {type, multiplicity};})?	{
													return {
														name,
														type: type?.type,
														multiplicity: type?.multiplicity ?? undefined,
														direction: direction ?? undefined,
													};
												}

	parameterDirection = d:("in" / "inout" / "out" / "return") !IDPART			{return d;}

	comment = "''" _ c:REST {return c.replace(/\\n/g, "\n").replace(/\\(\[|])/g, "$1");}

	// TODO: {static} (& {abstract} ? supported by PlantUML, but what does it mean in UML for a property to be abstract? only Classifiers and BehavioralFeatures are supposed to be abstract)
	property =	_ visibility:visibility? _ name:ID
			_ type:(":" _ type:ID _ {return type;})?
			multiplicity:multiplicity
			defaultValue:("=" _ v:REST {return v;})?
			comment:comment?
			NL+									{
													propertyByName[name] = {
														type,
														private:	"private" === visibility ?
																	true
																:"public" === visibility ?
																	false
																:	undefined,
														multiplicity,
														comments: comment ? [comment] : undefined,
													};
													if(defaultValue) {
														propertyByName[name].defaultValue = defaultValue;
													}
												}

	multiplicity = m:("[" _
				lower:("1" _ ".." _ {return 1;})?
				upper:("*" {return -1;} / INT)
			_ "]"  _ {return {lower, upper};})?
												{return m;}

	visibility =		"+" {return "public";}
			/	"-" {return "private";}
			/	"#" {return "protected";}
			/	"~" {return "package private";}


	stereotype = "<<" _ name:ID _ ">>" _							{return name};



	INT = v:[0-9]+										{return parseInt(v.join(""));}
	REST = s:[^\n]*										{return s.join("");}
	ID = h:[A-Za-z0-9_.À-ÖØ-öø-ÿ] t:IDPART*							{return h + t.join("");}
	IDPART = [A-Za-z0-9_.À-ÖØ-öø-ÿ]
	// TODO: character escapment (including unescaping backslashes)
	STRING = '"' value:[^"]* '"'								{return value.join("");}


	NL = _ SINGLE_LINE_COMMENT? "\r"? "\n"
	_ = ([ \t] / "\\n" / MULTI_LINE_COMMENT)*
	SINGLE_LINE_COMMENT	=	"'" REST
	MULTI_LINE_COMMENT	=	"/'" ([^'] / !("'/") "'")* "'/"
`;
export const grammar = String.raw`
	{
		const classifiers = {};
		let operationByName;
		let propertyByName;

		function getClassifier(name) {
			//return classifiers[name] ??= {};	??= unsupported in node as of 20201202
			return classifiers[name] = classifiers[name] ?? {name};
		}

		function getInterfaces(c) {
			//return c.interfaces ??= [];
			return c.interfaces = c.interfaces ?? [];
		}
		function getSupertypes(c) {
			//return c.supertypes ??= [];
			return c.supertypes = c.supertypes ?? [];
		}
		function getComments(c) {
			//return c.comments ??= [];
			return c.comments = c.comments ?? [];
		}

		const packagePath = [];

		function enterPackage(name) {
			packagePath.push(name);
		}

		function leavePackage() {
			packagePath.pop();
		}
	}
	start =	NL* title:(_ "title" _ title:REST NL+ {return title;})?
		packageElement* _ NL*
		{return classifiers;}

	package	=	_ "package" _ name:ID _ ("{" {enterPackage(name);}) NL+
				packageElement* NL*
			_ ("}" {leavePackage();}) NL+

	packageElement	=	class / enum / note / edge / package

	class =	_ attrs:(
			ret:(
				isAbstract:("abstract" _ {return true;})? "class"	{return {isAbstract};}
			/	"interface"						{return {isInterface: true};}
			)
			{operationByName = {}; propertyByName = {}; return ret;}
		)
		_ (STRING _ "as" _)? name:ID _ stereotypes:stereotype*
		supertypes:("extends" _ head:ID _ tail:("," _ supertype:ID _ {return supertype;})* {return [head, ...tail];})?
		interfaces:("implements" _ head:ID _ tail:("," _ iface:ID _ {return iface;})* {return [head, ...tail];})?
		"{" NL+ (
			property
		/	operation
		)*
		behavior:(
			_ "behavior" _ b:block NL+ {return b.slice(1, -1).join("");}
		)?
		_ "}" NL+
												{
													const c = getClassifier(
														//[...packagePath, name].join("::")
														name
													);
													Object.assign(c, {
														...attrs,
														name,
														operationByName,
														propertyByName,
														stereotypes,
														behavior,
														packagePath: packagePath.slice(0),
													});
													supertypes && getSupertypes(c).push(...supertypes.map(getClassifier));
													interfaces && getInterfaces(c).push(...interfaces.map(getClassifier));
												}

	enum =	_ "enum" _ name:ID _ stereotypes:stereotype* "{" NL+
			literals:(_ lname:ID _ comment:comment? NL+ {return {name: lname, comments: comment ? [comment] : undefined};})*
		_ "}" NL+
												{
													const e = getClassifier(name);
													e.name = name;
													e.literals = literals;
												}

	edge = realization / generalization / association

	realization = _ left:ID _ left2right:("..|>" {return true;} / "<|.." {return false;}) _ right:ID NL+
												{
													const l = getClassifier(left);
													const r = getClassifier(right);
													if(left2right) {
														getInterfaces(l).push(r);
													} else {
														getInterfaces(r).push(l);
													}
												}

	generalization = _ left:ID _ left2right:("-"+ "|>" {return true;} / "<|" "-"+ {return false;}) _ right:ID NL+
												{
													const l = getClassifier(left);
													const r = getClassifier(right);
													if(left2right) {
														getSupertypes(l).push(r);
													} else {
														getSupertypes(r).push(l);
													}
												}

	// PlantUML does not allow < & * on the same side
	association =		_ left:ID _ leftLabel:(r:STRING _ {return r;})? leftNav:"<"? leftComp:"*"?
			"-"+ (
				direction hidden?
			/	hidden direction?
			)? "-"*
				rightComp:"*"? rightNav:">"? _ rightLabel:(r:STRING _ {return r;})? right:ID
			label:(_ ":" _ r:REST {return r;})? NL+
												{
													const assoc = getClassifier(left + "2" + right + (label ? "_" + label : ""));
													assoc.ends = [
														{
															type: getClassifier(left),
															isNavigable: !!leftNav,
															isComposite: !!rightComp,
															multiplicity: leftLabel,
														},
														{
															type: getClassifier(right),
															isNavigable: !!rightNav,
															isComposite: !!leftComp,
															multiplicity: rightLabel,
														},
													];
													assoc.label = label;
												}

	direction	=	"left" / "right" / "up" / "down"
			/	"l" / "r" / "u" / "d"

	hidden		=	"[hidden]"

	/*
		TODO:
			- keep notes as comments
			- note on property/operation
	*/
	note =	_ "note" _ ("left" / "right" / "top" / "bottom") _ "of" _ target:ID targetTail:(_ "::" _ r:ID {return r;})* _ NL
			note:(!(_ "end" _ "note") note:REST NL {return note;})*
		_ "end" _ "note" _ NL+
												{
													const tgt = getClassifier(target);
													if(targetTail.length) {
														const op = tgt.operationByName[targetTail[0]];
														if(op) {
															getComments(op).push(note.join("\n"));
														} else {
															const prop = tgt.propertyByName[targetTail[0]];
															if(prop) {
																getComments(prop).push(note.join("\n"));
															}
														}
													} else {
														getComments(tgt).push(note.join("\n"));
													}
												}


	${featuresGrammar}
`;

export const featuresParser = peg.generate(String.raw`
	{
		let operationByName = {};
		let propertyByName = {};
	}
	start = NL*
		(	property
		/	operation
		)* _ {return {operationByName, propertyByName};}
	${featuresGrammar}
`);

export const parser = peg.generate(grammar);

