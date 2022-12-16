import {parser, getEventType} from './ImportFromPlantUMLSequence.js';
import {parser as smParser} from './ImportFromPlantUMLState.js';
import {parser as classParser, featuresParser} from './ImportFromPlantUMLClass.js';
import {forEachEntryAsync} from "./Utils.js";
import {indent} from "./TemplateUtils.js";

export function parse(parser, s, humanLocation = "", settings) {
	try {
		// parsing s with an additional newline, in case the file terminates without one, because some parsers only parse lines that end with newlines
		parser.humanLocation = humanLocation;
		const parsed = parser.parse(s + "\n", {
/*
			tracer: {trace(e) {
console.log(e)
			}},
/**/
			...settings,
		});
		return parsed;
	} catch(e) {
		function esc(s) {
			if(settings?.noHTMLEsc) {
				return s;
			} else {
				return s.replace(/</g, "&lt;");
			}
		}
		if(e.constructor.name === "peg$SyntaxError") {
			if(e.location) {
				const start = e.location.start;
				const end = e.location.end;
				if(end.offset == start.offset) {
					if(end.offset == s.length) {
						start.offset--;
					} else {
						end.offset++;
					}
				}
				const code = `${
						esc(s.slice(0, start.offset))
					}<span class="syntaxError" title="${e.message.replace(/"/g, "&quot;")}">${
						esc(s.slice(start.offset, end.offset))
					}</span>${
						esc(s.slice(end.offset))
					}`;
				if(globalThis.stateFigo) {
					globalThis.stateFigo.innerHTML = `
						<style>
							.syntaxError {
								color: white;
								background-color: red;
								font-weight: bold;
								text-decoration-line: underline;
								text-decoration-style: wavy;
								text-decoration-color: red;
							}
						</style>
						<blockquote>
						There is a syntax error in the following code block${humanLocation ? ` (${humanLocation})` : ""}:
						<pre>

							${code}

						</pre>
						line ${e.location.start.line}, column ${e.location.start.column}: ${e.message}
						</blockquote>
					`
				} else {
/*
					let lineNumber = 1;
					console.log(code
						.replaceAll(/\r?\n/g, "\n")
						.replaceAll(/^/gm, function() {
							return (""+lineNumber++).padStart(5, " ") + "  ";
						})
					);
/*/
					const TAB_SIZE = 8;
					const LINE_NUMBER_SEP = "  ";
					const LINE_NUMBER_LENGTH = TAB_SIZE - LINE_NUMBER_SEP.length;
					function columnToLineOffset(l, col) {
						return [...l.slice(0, col)].map(e => e === "\t" ? TAB_SIZE : 1).reduce((a, b) => a + b);
					}
					const maxNbBefore = 2;
					const nbBefore = Math.min(maxNbBefore, start.line);
					const nbAfter = 2;
					const nbLines = end.line - start.line + 1;
					console.log(
						s.split(/\r?\n/).slice(start.line - 1 - nbBefore, end.line + nbAfter).flatMap((l, i) => {
							const ln = (start.line + i - nbBefore + "").padStart(LINE_NUMBER_LENGTH, " ") + LINE_NUMBER_SEP;
							// TODO: correctly compute startOffset when ln.length !== TAB_SIZE
							if(i >= nbBefore && i < nbBefore + nbLines) {
								const startOffset = (i === nbBefore ? columnToLineOffset(l, start.column) : 0) + ln.length;
								//const endOffset = columnToLineOffset(l, start.column);
								const length = 1;
								return [
									ln + l,
									"".padStart(length, "^").padStart(startOffset + length - 1, " "),
								];
							} else {
								return ln + l;
							}
						}).join("\n")
					);
					console.log(`\nerror:${humanLocation ? " " : ""}${humanLocation} line ${start.line}, column ${start.column}: ${e.message}`);
/**/
				}
			}
		}
		throw e;
	}
}
export async function preprocess(model, loadFromParent) {
	if(typeof model.classes === "string") {
		let classes = model.classes;
		if(classes.match(/^#/)) {
			classes = await loadFromParent(classes);
		}
		const parsed = parse(classParser, classes, "classes");
		model.classes = parsed;
	}
	await forEachEntryAsync(model.interactions, async (interName, inter) => {
		const humanLocation = `interaction ${interName}`;
		if(typeof inter === "string") {
			// inline extended PlantUML
			const parsed = parse(parser, inter, humanLocation);
			model.interactions[interName] = parsed;
		} else if(inter.loadFrom) {
			// external extended PlantUML
			await loadFromParent(inter.loadFrom).then(s => {
				const parsed = parse(parser, s, humanLocation);
				inter.lifelines = parsed.lifelines;
				inter.events = parsed.events;
			});
			inter.loadFrom = undefined;
		}
		validate(model.interactions[interName], humanLocation);
	});
	function processBehavior(obj) {
		if(obj.behavior) {
			const sm = parse(smParser, obj.behavior, `behavior of object ${obj.name}`);
			obj.stateByName = sm.stateByName;
			obj.transitionByName = sm.transitionByName;
			obj.behavior = undefined;
		}
	}
	function processFeatures(obj) {	// obj may be an object or a class
		if(obj.features) {
			const parsed = parse(featuresParser, obj.features, `features of object ${obj.name}`);
			obj.operationByName = parsed.operationByName;
			obj.propertyByName = parsed.propertyByName;
			obj.features = undefined;
		}
	}
	if(model.objects) {
		for(const obj of model.objects) {
			processBehavior(obj);
			processFeatures(obj);
		}
	} else {
		processBehavior(model);
		processFeatures(model);
	}
	if(model.classes) {
		for(const cl of Object.values(model.classes)) {
			processBehavior(cl);
		}
	}
}

import {transform, defaultRule} from "./ASTUtils.js";

function validate(inter, humanLocation) {
	//console.log("Validating", humanLocation);
	transform(inter.events, {
		[defaultRule](e, trans) {
			e.type ??= getEventType(e);
			trans(e);
		},
	});
	function check(event, lifeline) {
		if(!inter.lifelines?.includes(lifeline)) {
			console.log(`${humanLocation}: warning: participant ${lifeline} not found`);
		}
	}
	transform(inter.events, {
		autoAcceptCall(e, trans) {
			check(e, e.from);
			check(e, e.to);
		},
		call(e, trans) {
			check(e, e.from);
			check(e, e.to);
		},
		found(e, trans) {
			check(e, e.to);
		},
/*
		[defaultRule](e, trans) {
			console.log("Unsupported event type:", e.type)
			trans(e);
		},
/**/
	});
}

