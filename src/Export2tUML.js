import {indent} from './TemplateUtils.js';
import {getTriggers} from './ModelUtils.js';
import {unique} from './Utils.js';

export function totUML(model) {
	const keywords = ["choice", "class", "opaqueBehavior", "opaqueExpression", "constraint", "state", "behavesAs", "model"];
	function id(s) {
		if(s.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/) && !keywords.includes(s)) {
			return s;
		} else {
			return `"${s}"`;
		}
	}
// some "indent" tag tests:
//			${'a\nb'}
//			${['a', 'b']}
//			${['a\nb', 'c\nd']}
	function methodName(op) {
		return id(`${op.name}_method`);
	}
	function ops(object) {
		return (object.operations || []).map(op =>
			indent`${op.isPrivate ? 'private' : 'public'} operation ${id(op.name)}()${op.method &&
				` behavesAs ${methodName(op)}`
			};`
		);
	}
	function ob(body, name) {
		return `opaqueBehavior ${name && `${name} `}= '${body}' in AnimUML;`
	}
	function methods(object) {
		return (object.operations || []).filter(op => op.method).map(op =>
			ob(op.method, methodName(op))
		);
	}
	return indent`
		model ${id(model.name)} {
			instance instMain of Main {}
			class Main {
				${model.objects.map(object =>
					`public composite ${id(object.name)}[1-1] : ${id(object.name)};`
				)}
				${(model.connectors || []).map(con =>
					`connector ${id(con.name)} : ${id(con.name)} between ${id(con.ends[0].name)} and ${id(con.ends[1].name)};`
				)}
			}
			${unique(model.objects.filter(obj => model.isActive(obj)).flatMap(object =>
				getTriggers(object)
			)).map(signal => indent`
				signal ${id(signal)};
				signalEvent ${id(`${signal}_SE`)} of ${id(signal)};
			`)
			}
			${(model.connectors || []).map(con => indent`
				association ${id(con.name)} {
					${con.ends.map(end =>
						`${id(end.name)}[1-1] : ${id(end.name)} in ${id(con.name)};`
					)}
				}
			`)}
			${model.objects.map(object => 
				model.isActive(object) ? indent`
					class |${id(object.name)}| behavesAs SM receives ${getTriggers(object).map(trigger =>
						`${id(trigger)}(${id(trigger)})`
					).join(", ")} {
						${ops(object)}
						${methods(object)}
						stateMachine SM {
							region R {
								${object.transitions.map(trans =>
									indent`${id(trans.source.name)} -> ${id(trans.target.name)} : ${id(trans.name)} : ${trans.trigger &&
										`${id(`${trans.trigger}_SE`)}`
									}${trans.guard &&
										`[constraint "guard" is opaqueExpression = '${trans.guard}' in AnimUML;]`
									} / ${trans.effect
										&& ob(trans.effect)
									};`
								)}
								${object.states.filter(state =>
									state.kind || state.entry || state.exit || state.doActivity
								).map(state =>
									state.kind ?
										`${state.kind} pseudoState ${id(state.name)};`
									:indent`
										state ${id(state.name)}
											${state.entry &&
												`entry / ${ob(state.entry)}`
											}
										;
									`
								)}
							}
						}
					}
				` : indent`
					class ${id(object.name)} {
						${ops(object)}
						${methods(object)}
					}
				`
			)}
		}
	`;
}
