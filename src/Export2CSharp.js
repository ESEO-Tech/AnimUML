import {getTriggers} from './ModelUtils.js';
import {indent} from './TemplateUtils.js';

// TODO: finish this code generator
export function toCSharp(model) {
	function objectToCSharp(obj) {
		if(model.isActive(obj)) {
			return indent`
				public class ${obj.name} {
					private enum State {
						${obj.states.map(e => e.name)}
					}
					public ${obj.name}() {
					}
				}
			`;
		} else {
			return indent`
				public class ${obj.name} {
					public ${obj.name}() {
					}
				}
			`;
		}
	}
	return model.objects.map(objectToCSharp).join('\n');
}
