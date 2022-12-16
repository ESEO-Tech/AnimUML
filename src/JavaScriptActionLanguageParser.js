import {} from "./lib/peg-0.10.0.min.js";
import {indent} from "./TemplateUtils.js";

// Get some inspiration from
// https://github.com/pegjs/pegjs/blob/master/examples/javascript.pegjs
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence

// TODO:
//	- switch to a more robust JavaScript parser/serializer (e.g., babel)?
//	- semicolon insertion (e.g., so that _sl is not longer necessary like in returnStat)
//	- identifiers should be allowed to contain unicode escape sequences

// Remarks:
// - Unicode property escapes are not supported by pegjs (https://github.com/pegjs/pegjs/issues/648) but can be used with semantic predicates (see IDSTART and IDPART)

const grammar = (start) => String.raw`

	{

		const self = this;

		function stringParse(s) {
/*			// problem with JSON.parse: "\0" is not valid JSON, it should be "\u0000"
			return JSON.parse(s);
/*/
			return eval(s);
/**/
		}

		function binOp(left, right, leftName = "left", type = "binaryOpExp") {
			if(right.length > 0) {
				let ret = {[leftName]: left, type, ...right[0]};
				if(ret.type === "templateExp") {
					ret = {...ret, tag: ret.source};
				}
				for(const part of right.slice(1)) {
					if(part.type === "templateExp") {
						ret = {...part, tag: ret};
					} else {
						ret = {[leftName]: ret, type, ...part};
					}
				}
				return ret;
			} else {
				return left;
			}
		}

		function w(node) {
			return self.keepLocation
			?
				{...node, __location__: location()}
			:	node
			;
		}
	}

	${start}

	statement	=	_ e:(	expression:functionExp		{return {type: "expressionStat", expression};}
				/	expression:classExp		{return {type: "expressionStat", expression};}
				)					{return e;}
			/	_ labels:label* s:(
					ifStat
				/	blockStat
				/	forStat
				/	forOfStat
				/	forInStat
				/	whileStat
				/	switchStat
				/	tryStat
				)					{return {...s, labels};}
			/
				_ labels:label* stat:(
					doStat
				/	returnStat
				/	continueStat
				/	breakStat
				/	variableStat
				/	importStat
				/	expressionStat
				) _ ";"?	{return {...stat, labels};}
				/ _ ";"	{return {type: "emptyStat",}}

	label		=	l:ID _ ":" _ {return l;}

	breakStat	=	"break" !IDPART _sl name:(!("case" !IDPART) n:ID {return n;})?			{return {type: "breakStat", name};}

	continueStat	=	"continue" !IDPART _sl name:ID?			{return {type: "continueStat", name};}

	tryStat		=	"try" _
				tryBlock:blockStat
				cb:(_ "catch" varName:(_ "(" _ v:ID _ ")" {return v;})? _ catchBlock:blockStat {return {catchBlock, varName};})?
				finallyBlock:(_ "finally" _ b:blockStat {return b;})?
										{return {type: "tryStat", tryBlock, ...cb, finallyBlock};}

	importStat	=
				"export" _ "default" !IDPART _
					value:expression
												{return {type: "defaultExportStat", value};}
			/	"export" _ "*" _ "from" _ from:STRING				{return {type: "exportAllStat", from};}
			/	kind:("import" / "export") !IDPART _
				!(("function" / "const" / "let" / "var" / "async" / "class") !IDPART)
				contents:(
					"{" _ names:names?  "}" {return {names};}
				/	"*" _ "as" _ as:ID {return {as};}
				/	!"default" defaultExport:ID {return {defaultExport};}
				) _ from:("from" _ f:STRING {return f;})?
										{return {type: "importStat", ...contents, from, kind};}

	switchStat	=	"switch" !IDPART _ "(" _ selector:expression _ ")" _ "{"
					clauses:clause*
				_ "}"
										{return {type: "switchStat", selector, clauses};}

	clause		=	_ "case" !IDPART _ value:expression _ ":" statements:(_ !("default" / "case") s:statement {return s;})*	{return {value, statements, isDefault: false};}
			/	_ "default" !IDPART _ ":" statements:(_ !("default" / "case") s:statement {return s;})* _		{return {statements, isDefault: true};}


	names 		=	head:name _ tail:("," _ name:name _ {return name;})* lastComma 		{return [head, ...tail];}

	name		=	name:ID as:(_ "as" _ as:ID {return as;})?	{return {name, as};}

	ifStat		=	_ "if" !IDPART _ "(" _ condition:expression _ ")" _
					_ thenStat:statement _
				elseStat:("else"
					_ elseStat:statement _ {return elseStat;})?
										{return w({type: "ifStat", condition, thenStat, elseStat});}

	doStat		=	_ "do" !IDPART _ statement:statement _ "while" _ "(" _ condition:expression _ ")"
										{return {type: "doStat", condition, statement};}

	whileStat	=	_ "while" !IDPART _ "(" _ condition:expression _ ")" _ statement:statement _	{return {type: "whileStat", condition, statement};}

	forOfStat	=	_ "for" !IDPART _ isAwait:"await"? _ "(" _ variable:(variableStat / name:ID) _ "of" _ expression:expression _ ")"
				statement:statement
										{return {type: "forOfStat", variable, expression, statement, isAwait: isAwait ? true : false};}
	forInStat	=	_ "for" !IDPART _ "(" _ variable:(variableStat / name:ID) _ "in" _ expression:expression _ ")"
					statement:statement
										{return {type: "forInStat", variable, expression, statement};}
	forStat		=	_ "for" !IDPART _ "(" _
					init:(variableStat / expression)? _
				";" _
					condition:expression? _
				";" _
					update:expression? _
				")" statement:statement				{return {type: "forStat", init, condition, update, statement};}

	variableStat	=	_ isExport:export _ type:("var" / "let" / "const") !IDPART _ head:variableDef _ tail:("," _ name:variableDef _ {return name;})*
										{return {type, variables: [head, ...tail], isExport};}

	returnStat	=	_ "return" !IDPART returnedValue:(_sl
						v:expression
					{return v;})?
										{return {type: "returnStat", returnedValue};}

	variableDef	=	pattern:simplePattern _ init:("=" _ init:priority2 {return init;})?
										{return {pattern, init};}

	expressionStat	=	_ expression:expression _				{return w({type: "expressionStat", expression});}

	blockStat	=	_ "{" statements:statement* _ "}"				{return {type: "block", statements};}

	pattern		=	isSpread:"..."? pattern:simplePattern				{return {...pattern, isSpread: isSpread ? true : false};}

	simplePattern	=	name:ID		// TODO: should actually be any lvalue, not just an ID
					defaultValue:(_ "=" _ e:priority2 {return e;})?
											{return {type: "namePat", name, defaultValue};}
			/	"[" _ elements:patterns? "]"				{return {type: "arrayPat", elements};}
			/	"{" _ elements:slotPatterns? "}"				{return {type: "objectPat", elements};}

	patterns	=	head:pattern? _ tail:("," _ pattern:pattern? _{return pattern;})* ","? _	{return [head, ...tail];}

	slotPatterns	=	head:slotPattern _ tail:("," _ p:slotPattern _{return p;})* ","? _	{return [head, ...tail];}

	slotPattern	=	isSpread:"..."? _ name:(ID / numberExp) _ newName:(":" _ n:simplePattern {return n;})? _ defaultValue:("=" _ v:priority2 {return v;})? 	{return {type: "slotPat", name, newName, defaultValue, isSpread: isSpread ? "true" : false};}

	paramPatterns	=	head:paramPattern _ tail:("," _ p:paramPattern _ {return p;})* ","? _	{return [head, ...tail];}

	paramPattern	=	pattern:pattern _ defaultValue:("=" _ v:priority2 _ {return v;})? {return {type: "paramPat", pattern, defaultValue};}

	expression	=	exp:priority1						{return exp;}

	priority1	=	head:priority2 tail:(_ "," _ exp:priority2 {return exp;})*
										{if(tail.length) return {type: "expressionListExp", expressions: [head, ...tail]}; else return head;};

/*
	priority2	= op:("yield*" / "yield") _ expression:priority2	{return {type: "yieldExp", op, expression};}
			/ exp:priority3						{return exp;}
*/
	priority2	=
				priority3

	priority3	=
				op:("yield" _ "*" {return "yield*";}/ "yield" !IDPART {return "yield";}) _sl expression:priority3?	{return {type: "yieldExp", op, expression};}
			/	left:simplePattern _ op:"=" _ right:priority3	{return {type: "destructuringAssign", left, op, right};}
			/	left:priority4
				right:( _ op:("=" / "+=" / "-=" / "**=" / "*=" / "/=" / "%=" / "<<=" / ">>>=" / ">>=" / "&=" / "^=" / "|=" / "&&=" / "||=" / "??=") _ right:priority3 {return {op, right};})?
										{if(right) return {type: "assign", left, ...right}; else return left;}

	priority4	=	left:priority5 right:(_ "?" _ thenExp:priority2 _ ":" _ elseExp:priority2 {return {thenExp, elseExp};})?
										{if(right) return {type: "conditionalExp", condition: left, ...right}; else return left;}

	priority5	=	left:priority6 right:(_ op:"??" _ right:priority6 {return {op, right};})*
										{return binOp(left, right);}

	priority6	=	left:priority7 right:(_ op:"||" _ right:priority7 {return {op, right};})*
										{return binOp(left, right);}

	priority7	=	left:priority8 right:(_ op:"&&" _ right:priority8 {return {op, right};})*
										{return binOp(left, right);}

	priority8	=	left:priority9 right:(_ !("||") op:"|" _ right:priority9 {return {op, right};})*
										{return binOp(left, right);}

	priority9	=	left:priority10 right:(_ op:"^" _ right:priority10 {return {op, right};})*
										{return binOp(left, right);}

	priority10	=	left:priority11 right:(_ op:"&" _ right:priority11 {return {op, right};})*
										{return binOp(left, right);}

	priority11	=	left:priority12 right:(_ op:("===" / "==" / "!==" / "!=") _ right:priority12 {return {op, right};})*
										{return binOp(left, right);}

	priority12	=	left:priority13 right:(_ op:("<=" / "<" / ">=" / ">" / k:("instanceof" / "in") !IDPART {return k;}) _ right:priority13 {return {op, right};})*
										{return binOp(left, right);}

	priority13	=	left:priority14 right:(_ op:("<<" / ">>>" / ">>") _ right:priority14 {return {op, right};})*
										{return binOp(left, right);}

	priority14	=	left:priority15 right:(_ op:("+" !"+" {return "+"}/ "-" !"-" {return "-"}) _ right:priority15 {return {op, right};})*
										{return binOp(left, right);}

	priority15	=	left:priority16 right:(_ op:("*" !"*" {return "*";}/ "/" / "%") _ right:priority16 {return {op, right};})*
										{return binOp(left, right);}

	priority16	=	left:priority17 right:(_ op:"**" _ right:priority16 {return {op, right};})?
										{if(right) return binOp(left, [right]); else return left;}

	priority17	=	op:("!" / "~" / "++" / "--" / "+" / "-" /
					c:("typeof" / "void" / "delete" / "await") !IDPART {return c;}
				) _ expression:priority17
										{return {type: "prefixUnaryExp", op, expression};}
			/	exp:priority18					{return exp;}

	priority18	=	expression:priority19 op:(_sl op:"++" {return op;} / _sl op:"--" {return op;})?
										{if(op) return {type: "postfixUnaryExp", expression, op}; else return expression;}

	memberExpRight	=	r:memberAccessExp
			/	computedMemberAccessExp
			/	optionalChainingExp

	priority19	=	priority20
			/	"new" !IDPART _ expression:priority19
										{return {type: "newExp", expression};}

	newWithArgsExp	=	"new" !IDPART _ expression:memberExp _ args:functionCallExp
										{return {...args, type: "newWithArgsExp", expression};}

	memberExp	=	source:priority21 rest:memberExpRight*		{return binOp(source, rest, "source");}

	priority20	=
				source:(newWithArgsExp / priority21) rest:(
					(	memberExpRight
					/	r:functionCallExp
					/	TEMPLATE
					)*
				)
										{return binOp(source, rest, "source");}

	priority21	=
				isAsync:"async"? _ params:(
					"(" _ params:paramPatterns? ")" {return params ? params : [];}
				/	name:ID {return [{type: "paramPat", pattern: {type: "namePat", name, isSpread: false, defaultValue: null}, defaultValue: null,}];}
				) _ "=>" _ body:(blockStat / priority2)		{return {type: "lambdaExp", params, body, isAsync: isAsync ? true : false};}
			/	"(" _ exp:expression _ ")"			{return exp;}
			/	exp:primaryExp					{return exp};

	functionExp	=
				isExport:export isAsync:("async" _)? "function" _ isGenerator:"*"? _ name:(n:ID _ {return n;})? "(" _ params:paramPatterns? ")" _ body:blockStat	{return w({type: "functionExp", name, params: params, body, isExport, isAsync: isAsync ? true : false, isGenerator: isGenerator ? true : false});}

	classExp	=
				isExport:export "class" _ name:(!"extends" n:ID {return n;})? _ superClass:("extends" _ n:expression _ {return n;})? "{" _ members:(classMember / ";" _ )* "}"	{return {type: "classExp", name, superClass, members: members?.filter(e => e[0]!==";"), isExport};}

	primaryExp	=	a:numberExp						{return a;}
			/	stringExp
			/	TEMPLATE
			/	"this" !IDPART						{return {type: "thisExp"};}
			/	"true" !IDPART						{return {type: "booleanExp", value: true};}
			/	"false"	!IDPART						{return {type: "booleanExp", value: false};}
			/	"throw" !IDPART _ value:expression				{return {type: "throwExp", value};}
			/	classExp
			/	functionExp
			/	!("new" !IDPART) a:variableExp						{return a;}
			/	arrayExp
			/	objectExp
			/	regex:REGEX						{return {type: "regexExp", regex};}

	export		=	e:("export" _ d:"default"? _ {return {isDefault: d ? true : false};})? {return e ? e : false;}

	classMember	=	isStatic:"static"? _ kind:("get" !(IDPART / _ "(")/ "set" !(IDPART / _ "(")/ "async" !IDPART)? _ isGenerator:"*"? _ name:slotName _ "(" _ params:paramPatterns? ")" _ body:blockStat _	{kind = kind?.[0]; return {type: "method", kind, name, params, body, isStatic: isStatic ? true : false, isGenerator: isGenerator ? true : false};}
			/	isStatic:"static"? _ name:ID _ defaultValue:("=" _ v:expression {return v;})? _ ";"? _		{return {type: "field", name, isStatic: isStatic ? true : false, defaultValue};}

	numberExp	=	sign:"-"? "0" ("x" / "X") digits:[0-9a-fA-F]+			{return w({type: "numberExp", value: parseInt(digits.join(""), 16)});}
			/	"0" ("b" / "B") d:[0-1_]+						{return w({type: "numberExp", value: parseInt(d.filter(e => e !== "_").join(""), 2)});}
			/	"0" ("o" / "O")  d:[0-7]+						{return w({type: "numberExp", value: parseInt(d.join(""), 8)});}
			/	"0" d:[0-7]+						{return w({type: "numberExp", value: parseInt(d.join(""), 8)});}	// legacy octal
			/	sign:"-"? num:[0-9]+ dec:("." dec:[0-9]* {return dec;})? e:(("e" / "E") esign:("-"/"+")? d:[0-9]+ {return [...esign ? [esign] : [], ...d]})?
										{return w({type: "numberExp", value: parseFloat(num.join("") + "." + ([...dec ?? [], 0]).join("") + (e ? "e" + e.join("") : "")) * (sign === "-" ? -1 : 1)});}
			/	sign:"-"? "." dec:[0-9]+				{return {type: "numberExp", value: JSON.parse(("0." + dec.join("")) * (sign === "-" ? -1 : 1))};}

	stringExp	=	value:STRING						{return {type: "stringExp", ...value};}
	memberAccessExp	=	_ "." _ propertyName:ID				{return {type: "memberAccessExp", propertyName};}
	computedMemberAccessExp	=
				_ "[" _ propertyName:expression _ "]"		{return {type: "computedMemberAccessExp", propertyName};}
	variableExp	=	name:ID !{name==="function"}							{return w({type: "variableExp", name});}
	functionCallExp =	_ "(" _ args:args?
				  ")"						{return w({type: "functionCallExp", args: args ? args : []});}
	args		=	head:arg _ tail:("," _ arg:arg _ {return arg;})* lastComma	{return [head, ...tail];}
	arg		=	isSpread:"..."? _ expression:priority2			{return isSpread ? {type: "spreadExp", expression} : expression;}
	optionalChainingExp	=
				_ "?." _ propertyName:ID			{return {type: "optionalMemberAccessExp", propertyName};}
			/	_ "?." f:functionCallExp			{return {...f, type: "optionalFunctionCallExp"};}
			/	_ "?." c:computedMemberAccessExp		{return {...c, type: "optionalComputedMemberAccessExp"};}
	arrayExp	=	"[" _ elements:(h:arrayElement? _ t:("," _ e:arrayElement? _ {return e;})* lastComma {return [h, ...t];})? "]"	{return {type: "arrayExp", elements};}

	arrayElement	=	isSpread:"..."? e:priority2	{return {...e, isSpread: isSpread ? true : false};}

	objectExp	=	"{" _ slots:(head:slot _ tail:("," _ slot:slot _ {return slot;})* lastComma {return [head, ...tail];})? "}"
										{return w({type: "objectExp", slots});}

	slot		=	key:slotName _ ":" _ value:priority2				{return {type: "keyValueSlot", key, value};}
			/	kind:("get" !IDPART/ "set" !IDPART/ "async" !IDPART)? _ isGenerator:"*"? _ key:slotName? _ "(" _ params:paramPatterns? ")" _ body:blockStat
										{kind = kind?.[0]; if(kind && !key) {key = {type: "identKey", name: kind}; kind = undefined;} return {type: "functionSlot", kind, key, params, body, isGenerator: isGenerator ? true : false};}
			/	"..." expression:priority2					{return {type: "spreadSlot", expression};}
			/	key:ID							{return {type: "varSlot", key};}

	slotName	= 	name:ID							{return w({type: "identKey", name});}
			/	n:numberExp						{return {type: "numberKey", name: n};}
			//	n:[0-9]+						{return {type: "intKey", name: n.join("")};}
			/	name:STRING						{return w({type: "stringKey", ...name});}
			/	"[" _ expression:expression _ "]"			{return {type: "exprKey", expression};}

	lastComma	=	("," _)?

	IDSTART		=	a:. &{return a.match(/[\p{ID_Start}_$]/u)}			{return a;}
				//[A-Za-z_À-ÖØ-öø-ÿśćę$ॐ]
	IDPART		=	a:. &{return a.match(/[\p{ID_Continue}_$\u200C\u200D]/u)}		{return a;}
				//IDSTART / [0-9]
	ID		=	h:IDSTART t:IDPART*				{return h + t.join("");}
	STRING		=	'"' v:([^"\\] / "\\" a:. {return "\\" + a;})* '"'		{return {value: stringParse('"' + v.join("") + '"'), kind: '"'};}
			/	"'" v:([^'\\] / "\\" a:. {return "\\" + a;})* "'"		{return {value: stringParse('"' + v.map(e => e === '"' ? '\\"' : e).join("") + '"'), kind: "'"};}

	TEMPLATE	=	` + `"\`"	v:(
							s:(
								s:[^\`\\\\$]+	{return s.join("");}
							/	"\\\\" a:. {return "\\\\" + a;}
							)+	{return s.join("");}
						/	"$" "{" _ expression:expression _  "}"	{return expression;}
						/	"$"					{return "$";}
						)* "\`"` + String.raw`		{return {type: "templateExp", value: v};}


	NL		=	_ COMMENT? "\r"? "\n"
	BLANK		=	[ \t\r\n] / COMMENT
	// same line blanks
	_sl		=	(SINGLE_LINE_COMMENT / SINGLE_MULTI_LINE_COMMENT / [ \t])*
	_		=	BLANK*
	__		=	BLANK+
	SINGLE_LINE_COMMENT	=	"//" REST
	MULTI_LINE_COMMENT	=	"/*" ([^*] / !("*/") "*")* "*/"
	SINGLE_MULTI_LINE_COMMENT	=	"/*" ([^*\n] / !("*/") "*")* "*/"
	COMMENT		=	SINGLE_LINE_COMMENT
			/	MULTI_LINE_COMMENT
	REST		=	s:[^\n]*								{return s.join("");}
	REGEX		=	"/" c:([^/\\[] / "\\" a:. {return "\\" + a;} / "[" c:([^\\\]] / "\\" a:. {return "\\" + a;})* "]" {return "[" + c.join("") + "]";})* "/" mod:[dgimsuy]*				{return "/" + c.join("") + "/" + mod.join("");}
`;

export const expressionParser = peg.generate(String.raw`
	${grammar(`
		start	=	e:expression _		{return e;}
	`)}
`, {trace: !true});

export const parser = peg.generate(String.raw`
	${grammar(`
		start	=	stats:statement* _	{return stats;}
	`)}
`, {trace: !true});

export function stringify(ast, isExpressionStat = false) {
//console.log("stringify", ast);
	function addSemi(s, ast) {
		//if(ast && ast.type === "expressionStat" && ["functionExp", "classExp"].includes(ast.expression.type)) return s;
		if(s.startsWith("return")) return s + ";";
		return s.match(/(?:;|})[ \t\n\r]*$/) && !s.match(/^(?:const|var|let)/) ? s : s + ';'
	}
	if(ast instanceof Array) {
		return ast.map(e =>
			addSemi(stringify(e), e)
		).join("\n");
	}
	function wrap(s) {
		// TODO: smart parentheses
		return `(${s})`;
	}
	function serPat(p) {
		switch(p.type) {
			case "namePat": return `${p.isSpread ? "..." : ""}${p.name}${p.defaultValue ? "=" + stringify(p.defaultValue) : ""}`;
			case "slotPat": return `${p.isSpread ? "..." : ""}${typeof p.name === "string" ? p.name : p.name.value}${p.newName ? ":" + serPat(p.newName) : ""}${p.defaultValue ? "=" + stringify(p.defaultValue) : ""}`;
			case "paramPat": return `${p.isSpread ? "..." : ""}${serPat(p.pattern)}${p.defaultValue ? "=" + stringify(p.defaultValue) : ""}`;
			case "objectPat": return `{${p.elements?.map(serPat) ?? ""}}`;
			case "arrayPat": return `[${p.elements.map(e => e ? serPat(e) : "")}]`;
			default: throw `Unsupported pattern type: ${p.type} for ${JSON.stringify(p)}`;
		}
	}
	function stringifyOpt(ast) {
		return ast ? stringify(ast) : "";
	}
	function label(ast) {
		return ast.labels ? ast.labels.map(e => e + ":").join("") : "";
	}
	function isExport(ast, t = "export ", e = "") {
		return ast.isExport ? t + (t && ast.isExport.isDefault ? "default " : ""): e;
	}
	function string(s) {
//console.log(s, ast)
		const ret = JSON.stringify(s.value);
		if(s.kind === "'") {
			return ret.replace(/'/g, "\\'").replace(/^"/, "'").replace(/"$/, "'");
		} else {
			return ret;
		}
	}
	function paren(s, cond) {
		return cond
		?	`(${s})`
		:	s;
	}
	switch(String(ast.type)) {
		case "templateExp":
			return (ast.tag ? stringify(ast.tag) : "") + "`" + ast.value.map(e => {
				return (typeof e === "string") ? e : "${" + stringify(e) + "}"
			}).join("") + "`";
		case "expressionStat":
			return `${stringify(ast.expression, true)}`;
		case "breakStat":
			return `break${ast.name ? ` ${ast.name}` : ""}`;
		case "continueStat":
			return `continue${ast.name ? ` ${ast.name}` : ""}`;
		case "tryStat":
			return `
				${label(ast)}try
					${stringify(ast.tryBlock)}
				${ast.catchBlock ? `catch${ast.varName ? `(${ast.varName})` : ""} ${stringify(ast.catchBlock)}` : ""}
				${ast.finallyBlock ? `finally ${stringify(ast.finallyBlock)}` : ""}
			`;
		case "ifStat":
			return `${label(ast)}if(${stringify(ast.condition)}) ${addSemi(stringify(ast.thenStat))}${ast.elseStat ? ` else ${stringify(ast.elseStat)}` : ""}`;
		case "doStat":
			return `${label(ast)}do ${addSemi(stringify(ast.statement))} while(${stringify(ast.condition)})`;
		case "whileStat":
			return `${label(ast)}while(${stringify(ast.condition)})${stringify(ast.statement)}`;
		case "forOfStat":
			return `${label(ast)}for${ast.isAwait ? " await" : ""}(${typeof ast.variable === "string" ? ast.variable : stringify(ast.variable)} of ${stringify(ast.expression)}) ${stringify(ast.statement)}`;
		case "forInStat":
			return `${label(ast)}for(${typeof ast.variable === "string" ? ast.variable : stringify(ast.variable)} in ${stringify(ast.expression)}) ${stringify(ast.statement)}`;
		case "forStat":
			return `${label(ast)}for(${stringifyOpt(ast.init)} ; ${stringifyOpt(ast.condition)} ; ${stringifyOpt(ast.update)} ) ${stringify(ast.statement)}`;
		case "returnStat":
			return `return${ast.returnedValue ? ` ${stringify(ast.returnedValue)}` : ""}`;
		case "defaultExportStat":
			return `export default ${stringify(ast.value)}`;
		case "exportAllStat":
			return `export * from ${string(ast.from)}`;
		case "importStat":
			if(ast.as) {
				return `${ast.kind} * as ${ast.as} from ${string(ast.from)}`;
			} else if(ast.defaultExport) {
				return `${ast.kind} ${ast.defaultExport} from ${string(ast.from)}`;
			} else {
				return `${ast.kind} {${ast.names?.map(n => `${n.name}${n.as ? " as " + n.as : ""}`) ?? ""}}${ast.from ? ` from ${string(ast.from)}` : ""}`;
			}

		case "switchStat":
			return `${label(ast)}switch(${stringify(ast.selector)}) {
				${(ast.clauses ?? []).map(c => 
					c.isDefault
					?	`
						default:
							${stringify(c.statements)}
					`:	`
						case ${stringify(c.value)}:
							${stringify(c.statements)}
					`
				).join("")}
			}`;
		case "emptyStat":
			return ";";

		case "block":
			return `${label(ast)}{
				${stringify(ast.statements)}
			}`;
		case "let":
		case "const":
		case "var":
			return `${isExport(ast)}${ast.type} ${ast.variables.map(v =>
					`${serPat(v.pattern)}${v.init ? ` = ${stringify(v.init)}` : ""}`
				).join(", ")}`;

		case "functionCallExp":
			return `${
				"left" in ast
				?	stringify(ast.left)
				:	stringify(ast.source)
			}(${
				(ast.args ?? []).map(stringify).join(", ")
			})`;
		case "optionalFunctionCallExp":
			return `${
				"left" in ast
				?	stringify(ast.left)
				:	stringify(ast.source)
			}?.(${
				(ast.args ?? []).map(stringify).join(", ")
			})`;
		case "thisExp":
			return "this";
		case "throwExp":
			return `throw ${stringify(ast.value)}`;
		case "variableExp":
			return `${ast.name}`;
		case "conditionalExp":
			return wrap(`${stringify(ast.condition)} ? ${stringify(ast.thenExp)} : ${stringify(ast.elseExp)}`);
		case "numberExp":
			return `(${ast.value})`;
		case "memberAccessExp":
			return `${stringify(ast.source)}.${ast.propertyName}`;
		case "optionalMemberAccessExp":
			return `${stringify(ast.source)}?.${ast.propertyName}`;
		case "computedMemberAccessExp":
			return `${stringify(ast.source ?? ast.left)}[${stringify(ast.propertyName)}]`;
		case "optionalComputedMemberAccessExp":
			return `${stringify(ast.source ?? ast.left)}?.[${stringify(ast.propertyName)}]`;
		case "postfixUnaryExp":
			return wrap(`${stringify(ast.expression)}${ast.op}`);
		case "prefixUnaryExp":
			return wrap(`${ast.op} ${stringify(ast.expression)}`);
		case "newWithArgsExp":
			return `(new (${stringify(ast.expression)})(${
				(ast.args ?? []).map(stringify).join(", ")
			}))`;
		case "newExp":
			return `(new (${stringify(ast.expression)}))`;
		case "destructuringAssign":
			return wrap(`${serPat(ast.left)} ${ast.op} ${stringify(ast.right)}`);
		case "binaryOpExp":
		case "assign":
			return wrap(`${stringify(ast.left)} ${ast.op} ${stringify(ast.right)}`);
		case "expressionListExp":
			return "(" + ast.expressions.map(stringify).join(", ") + ")";
		case "yieldExp":
			return `(${ast.op} ${stringify(ast.expression)})`;
		case "stringExp":
			return string(ast);
		case "booleanExp":
			return JSON.stringify(ast.value);
		case "lambdaExp":
			return `(${ast.isAsync ? "async" : ""}(${ast.params.map(serPat)}) => ${paren(stringify(ast.body), ast.body.type === "objectExp")})`;
		case "functionExp":
			return `${isExport(ast, undefined, isExpressionStat ? "" : "(")}${ast.isAsync ? "async " : ""}function${ast.isGenerator ? "*" : ""}${ast.name ? " " + ast.name : ""}(${(ast.params ?? []).map(serPat)}) ${stringify(ast.body)}${isExport(ast, "", isExpressionStat ? "" : ")")}`;
		case "arrayExp":
			return `[${(ast.elements ?? []).map(e => e ? `${e.isSpread ? "..." : ""}${stringify(e)}` : "").join(",")}]`;
		case "objectExp":
			return `({${(ast.slots ?? []).map(stringify).join(",")}})`;
		case "keyValueSlot":
			return `${stringify(ast.key)}:${stringify(ast.value)}`;
		case "functionSlot":
			return `${ast.kind ? ast.kind + " " : ""}${ast.isGenerator ? "*" : ""}${stringify(ast.key)}(${(ast.params ?? []).map(serPat)}) ${stringify(ast.body)}`;
		case "varSlot":
			return `${ast.key}`;
		case "spreadSlot":
			return `...${stringify(ast.expression)}`;
		case "identKey":
			return ast.name;
		case "numberKey":
			return ast.name.value + "";
		case "stringKey":
			return string(ast);
		case "exprKey":
			return `[${stringify(ast.expression)}]`;
		case "spreadExp":
			return `...${stringify(ast.expression)}`;
		case "regexExp":
			return ast.regex;
		case "classExp":
			return `${isExport(ast)}class ${ast.name ?? ""} ${ast.superClass ? "extends " + stringify(ast.superClass) : ""} {${ast.members.map(stringify).join("")}}`;
		case "method":
			return `${ast.isStatic ? "static " : ""}${ast.kind ? ast.kind + " " : ""}${ast.isGenerator ? "*" : ""}${stringify(ast.name)}(${(ast.params ?? []).map(serPat)}) ${stringify(ast.body)}`;
		case "field":
			return `${ast.isStatic ? "static " : ""}${ast.name}${ast.defaultValue ? `=${stringify(ast.defaultValue)}` : ""};`;
		default:
			throw `Unsupported JavaScript AST node: ${JSON.stringify(ast)}`;
	}
}

