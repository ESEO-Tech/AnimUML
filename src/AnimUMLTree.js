import {Model as AnimUMLModel} from './Model.js';
import {allObjectsToPlantUML, toPlantUML, operationToPlantUMLActivity} from './Export2PlantUML.js';
import {toPlantUMLURI} from "./PlantUMLURI.js";
import {interaction2TCSVGSequence} from "./Interaction2TCSVGSequence.js";

import {AnimUMLEngine} from "./AnimUMLEngine.js";
import {preprocess} from "./Preprocessor.js";


class Diagram {
}

const dummyEngine = {
	getSlots: () => [],
};

export class ActivityDiagram extends Diagram {
	constructor(model, operation) {
		super();
		this.getURL = function(origin = "") {
			const pu = operationToPlantUMLActivity(operation);
			const puri = toPlantUMLURI(origin + "/plantuml/", pu);
			return puri;
		}
		this.name = `Activity diagram of operation ${operation.name}`;
	}
}

export class ClassDiagram extends Diagram {
	constructor(model) {
		super();
		this.params = {
			classDiagram: true,
		};
		this.getURL = function(origin = "") {
			const pu = allObjectsToPlantUML(model.model, dummyEngine, this.params);
			const puri = toPlantUMLURI(origin + "/plantuml/", pu);
			return puri;
		};
		this.name = `Class diagram`;
	}
}

export class ObjectDiagram extends Diagram {
	constructor(model) {
		super();
		this.params = {
			classDiagram: false,
		};
		this.getURL = function(origin = "", engine = dummyEngine) {
			const pu = allObjectsToPlantUML(model.model, engine, this.params);
			const puri = toPlantUMLURI(origin + "/plantuml/", pu);
			return puri;
		};
		this.name = `Object diagram`;
	}
}

export class StateDiagram extends Diagram {
	constructor(model, object) {
		super();
		this.name = `State diagram of ${object.name}`;
		this.params = {
			displayedObjects: [object],
			classDiagram: false,
			hideClasses: true,
		};
		this.getURL = function(origin = "") {
			const pu = allObjectsToPlantUML(model.model, dummyEngine, this.params);
			const puri = toPlantUMLURI(origin + "/plantuml/", pu);
			return puri;
		};
	}
}

export class InteractionDiagram extends Diagram {
	constructor(model, inter) {
		super();
		this.name = `Sequence diagram of ${inter.name}`;
		this.params = {
			// TODO
		};
		this.getURL = function(origin = "") {
			const svg = interaction2TCSVGSequence(inter, model.model, {origin: origin + "/"});
			const uri = `data:image/svg+xml;utf8,${
				svg.replace(/#/g, "%23")
			}`;
			return uri;
		};
		this.getData = function(origin = "") {
			const svg = interaction2TCSVGSequence(inter, model.model, {origin});
/*
			const uri = `data:image/svg+xml;utf8,${
				svg.replace(/#/g, "%23")
			}`;
			return uri;
*/
			return svg;
		};
	}
}

class TCSVGSequenceDiagram extends Diagram {
}

class PlantUMLSequenceDiagram extends Diagram {
}

class PlantUMLTimingDiagram extends Diagram {
}

class PlantUMLBranchingHistoryDiagram extends Diagram {
}

export class Model {
	constructor(model) {
		if(model instanceof AnimUMLModel) {
			this.model = model;
		} else {
			this.model = new AnimUMLModel(model);
		}
		this.name = model.name;
		this.diagrams = [];
	}
	get objects() {
		return this.model.objects;
	}
	isActive(object) {
		return this.model.isActive(object);
	}
}

class Execution {
	constructor(model) {
		this.name = `Execution of ${model.name}`;
		// maybe only execution-specific diagrams?
		// we could have a mechanism to connect any other diagram to a specific execution
		this.diagrams = [];
		this.engine = new AnimUMLEngine(model.model, model.model.settings?.semantics ?? {});
	}
}

export class TreeBuilder {
	constructor() {
		this.models = [];
		this.executions = [];
	}
	getTree() {
		const treeBuilder = this;
		const tree = {
			actions: {
				"Open built-in model": {
					parameters: {
						modelName: {
							type: "select",
							set: globalThis.examples.map(model => model.name),
						},
					},
					async perform(modelName) {
						// TODO: call preprocess?
						const model = globalThis.examples.find(model =>
							model.name === modelName
						);
						await preprocess(model);
						treeBuilder.models.push(new Model(model));
					},
				},
			},
			models: Object.fromEntries(this.models.map(model =>
				[model.name, {
					actions: {
						"New class diagram": {
							perform() {
								model.diagrams.push(new ClassDiagram(model));
							},
						},
						"New object diagram": {
							options: {
								displayedObjects: {
									type: "subset",
									set: model.objects.map(obj => obj.name),
								},
							},
							perform() {
								const ret = new ObjectDiagram(model);
								model.diagrams.push(ret);
								return ret;
							},
						},
						"New execution": {
							perform() {
								const ret = new Execution(model);
								const od = new ObjectDiagram(model);
								od.executionName = ret.name;
								od.name = `Execution diagram for ${model.name}`;
								treeBuilder.executions.push({
									name: ret.name,
									controller: ret,
									"Execution diagram": od,
								});
								return ret;
							},
						},
						...Object.fromEntries(
							model.objects.filter(obj =>
								model.isActive(obj)
							).map(obj =>
								[`Open state diagram of ${obj.name}`, {
									perform() {
										const ret = new StateDiagram(model, obj);
										model.diagrams.push(ret);
										return ret;
									},
								}]
							)
						),
					},
					diagrams: Object.fromEntries(model.diagrams.map(diagram =>
						[diagram.name, diagram]
					)),
				}],
			)),
			executions: Object.fromEntries(this.executions.map(execution =>
				[execution.name, execution]
			)),
		};
		return tree;
	}
}

