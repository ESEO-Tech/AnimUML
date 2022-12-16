import {indent} from '../TemplateUtils.js';
import {} from "../peg-0.10.0.min.js";
import {grammar as stateGrammar} from '../ImportFromPlantUMLState.js';
import {grammar as classGrammar} from '../ImportFromPlantUMLClass.js';
import {grammar as sequenceGrammar} from '../ImportFromPlantUMLSequence.js';
import grammkit from 'grammkit';
import * as fs from 'fs';

const printingVisitor = {
	processGrammar(grammar, recurses) {
		return recurses.map(recurse => recurse()).join("\n");
	},
	processRule(rule, name, recurse) {
		return `${name} = ${recurse()}`;
	},
	processLabeled(expression, label, recurse) {
		return `${expression.label}:(${recurse()})`;
	},
	processAction(expression, code, recurse) {
		return `${recurse()} {${code}}`;
	},
	processZeroOrMore(expression, recurse) {
		return `(${recurse()})*`;
	},
	processOneOrMore(expression, recurse) {
		return `(${recurse()})+`;
	},
	processOptional(expression, recurse) {
		return `(${recurse()})?`;
	},
	processRuleRef(expression, name) {
		return expression.name;
	},
	processSequence(expression, recurses) {
		return recurses.map(recurse => recurse()).join(" ");
	},
	processChoice(expression, recurses) {
		return recurses.map(recurse => recurse()).join(" / ");
	},
	processClass(expression) {
		return `TODO_CLASS`;
	},
	processGroup(expression, recurse) {
		return `${recurse()}`;
	},
	processSimpleNot(expression, recurse) {
		return `!(${recurse()})`;
	},
	processSimpleAnd(expression, recurse) {
		return `&(${recurse()})`;
	},
	processSemanticAnd(expression, code) {
		return `&{${code}}`;
	},
	processSemanticNot(expression, code) {
		return `!{${code}}`;
	},
	processLiteral(expression, value) {
		return `${JSON.stringify(value)}${expression.ignoreCase ? "i" : ""}`;
	},
	processAny(expression) {
		return ".";
	},
};
function visitGrammar(grammar, visitor) {
	function visit(expression) {
		switch(String(expression.type)) {
		case "labeled":
			if(visitor.processLabeled) {
				return visitor.processLabeled(expression, expression.label, () => visit(expression.expression));
			} else {
				const innerExp = visit(expression.expression);
				if(innerExp) {
					return {
						...expression,
						expression: innerExp,
					};
				} else {
					return undefined;
				}
			}
			break;
		case "class":
			if(visitor.processClass) {
				return visitor.processClass(expression);
			} else {
				return {
					...expression,
				};
			}
			break;
		case "action":
			if(visitor.processAction) {
				return visitor.processAction(expression, expression.code, () => visit(expression.expression));
			} else {
				const innerExp = visit(expression.expression);
				if(innerExp) {
					return {
						...expression,
						expression: innerExp,
					};
				} else {
					return undefined;
				}
			}
			break;
		case "sequence":
			if(visitor.processSequence) {
				return visitor.processSequence(expression, expression.elements.map(e => () => visit(e)));
			} else {
				const elements = expression.elements.map(visit).filter(e => e);
				if(elements.length > 1) {
					return {
						...expression,
						elements,
					};
				} else if(elements.length == 1) {
					return elements[0];
				} else {
					return undefined;
				}
			}
			break;
		case "simple_and":
			if(visitor.processSimpleAnd) {
				return visitor.processSimpleAnd(expression, () => visit(expression.expression));
			} else {
				const innerExp = visit(expression.expression);
				if(innerExp) {
					return {
						...expression,
						expression: innerExp,
					};
				} else {
					return undefined;
				}
			}
			break;
		case "semantic_and":
			if(visitor.processSemanticAnd) {
				return visitor.processSemanticAnd(expression, expression.code);
			} else {
				return {
					...expression,
				};
			}
			break;
		case "simple_not":
			if(visitor.processSimpleNot) {
				return visitor.processSimpleNot(expression, () => visit(expression.expression));
			} else {
				const innerExp = visit(expression.expression);
				if(innerExp) {
					return {
						...expression,
						expression: innerExp,
					};
				} else {
					return undefined;
				}
			}
			break;
		case "semantic_not":
			// TODO: never seen => test
			if(visitor.processSemanticNot) {
				return visitor.processSemanticNot(expression, expression.code);
			} else {
				return {
					...expression,
				};
			}
			break;
		case "group":
			if(visitor.processGroup) {
				return visitor.processGroup(expression, () => visit(expression.expression));
			} else {
				const innerExp = visit(expression.expression);
				if(innerExp) {
					return {
						...expression,
						expression: innerExp,
					};
				} else {
					return undefined;
				}
			}
			break;
		case "rule_ref":
			if(visitor.processRuleRef) {
					return visitor.processRuleRef(expression, expression.name);
			} else {
				return {
					...expression,
				};
			}
			break;
		case "choice":
			if(visitor.processChoice) {
				return visitor.processChoice(expression, expression.alternatives.map(e => () => visit(e)));
			} else {
				const alternatives = expression.alternatives.map(visit).filter(e => e);
				if(alternatives.length > 1) {
					return {
						...expression,
						alternatives,
					};
				} else if(alternatives.length == 1) {
					return alternatives[0];
				} else {
					return undefined;
				}
			}
			break;
		case "optional":
			if(visitor.processOptional) {
				return visitor.processOptional(expression, () => visit(expression.expression));
			} else {
				const innerExp = visit(expression.expression);
				if(innerExp) {
					return {
						...expression,
						expression: innerExp,
					};
				} else {
					return undefined;
				}
			}
			break;
		case "zero_or_more":
			if(visitor.processZeroOrMore) {
				return visitor.processZeroOrMore(expression, () => visit(expression.expression));
			} else {
				const innerExp = visit(expression.expression);
				if(innerExp) {
					return {
						...expression,
						expression: innerExp,
					};
				} else {
					return undefined;
				}
			}
			break;
		case "one_or_more":
			if(visitor.processOneOrMore) {
				return visitor.processOneOrMore(expression, () => visit(expression.expression));
			} else {
				const innerExp = visit(expression.expression);
				if(innerExp) {
					return {
						...expression,
						expression: innerExp,
					};
				} else {
					return undefined;
				}
			}
			break;
		case "literal":
			if(visitor.processLiteral) {
				return visitor.processLiteral(expression, expression.value);
			} else {
				return {
					...expression,
				};
			}
			break;
		case "any":
			if(visitor.processAny) {
				return visitor.processAny(expression);
			} else {
				return expression;
			}
		default:
			console.log("unknown type of expression:", expression);
			break;
		}
	}
	function visitRule(rule) {
		if(visitor.processRule) {
			return visitor.processRule(rule, rule.name, () => visit(rule.expression));
		} else {
			return {
				...rule,
				expression: visit(rule.expression),
			};
		}
	}
	if(visitor.processGrammar) {
		return visitor.processGrammar(grammar, grammar.rules.map(rule => () => visitRule(rule)));
	} else {
		return {
			...grammar,
			rules: grammar.rules.map(visitRule).filter(e => e),
		};
	}
}

const filterWS = {
	toRemove: ["NL", "_"],
	processRule(rule, name, recurse) {
		if(this.toRemove.includes(name)) {
			return undefined;
		} else {
			return {
				...rule,
				expression: recurse(),
			};
		}
	},
	processRuleRef(expression, name) {
		if(this.toRemove.includes(name)) {
			return undefined;
		} else {
			return expression;
		}
	},
};

for(const [name, grammar] of Object.entries({stateGrammar, classGrammar, sequenceGrammar})) {
	console.log("Processing:", name);
	const parsedGrammar = peg.parser.parse(grammar);
	console.assert(
		visitGrammar(parsedGrammar, printingVisitor) == visitGrammar(visitGrammar(parsedGrammar, {}), printingVisitor)
	);
/*	// grammar processing tests:
	//console.log(parsedGrammar.rules[0].expression.expression.elements[0].expression);
	//console.log(visitGrammar(parsedGrammar, filterWS));
	console.log(visitGrammar(visitGrammar(parsedGrammar, filterWS), printingVisitor));
*/
	const processedGrammar =
/*
		parsedGrammar
/*/
		visitGrammar(visitGrammar(parsedGrammar, filterWS), {
			processLiteral(expression, value) {
				return {
					...expression,
					value: JSON.stringify(value),		// this seems to be necessary because grammkit does not show literals any different than ruleRefs
				};
			},
			processSimpleAnd(expression, recurse) {
				return undefined;				// this seems to be necessary because grammkit does not display positive predicates any different than normal expressions
			},
			processSimpleNot(expression, recurse) {
				return expression;
			},
			processSemanticAnd(expression, recurse) {
				return undefined;
			},
		});
/**/
	;

	//console.log(visitGrammar(processedGrammar, printingVisitor));

	const css = fs.readFileSync("node_modules/grammkit/app/diagram.css", "utf8");

	const html = indent`
		<html xmlns="http://www.w3.org/1999/xhtml">
			<head>
				<style>
					${css}
				</style>
			</head>
			<body>
				<table>
					${processedGrammar.rules.map(rule => indent`
						<tr>
							<td>${rule.name}</td>
							<td>=</td>
							<td>
								${grammkit.diagram(rule)
									.replace(/^<svg /, '<svg xmlns="http://www.w3.org/2000/svg" ')
	/*
									.replace(/<g/, indent`
										<style>
											${css}
										</style>
										$&
									`)
	*/
								}
							</td>
						</tr>
					`)}
				</table>
			</body>
		</html>
	`;

	fs.writeFileSync(`doc/${name}.html`, html);
}

