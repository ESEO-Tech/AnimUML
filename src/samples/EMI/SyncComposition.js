globalThis.examples = globalThis.examples || [];
examples.push(
	{
		"name": "UML2AnimUML_SyncComposition",
		"objects": [
			{
				"name": "object",
				"class": "Object",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
					"ChoicePS": {
						"type": "Pseudostate",
						"kind": "choice",
					},
				},
				"transitionByName": {
					"Initial2State_0": {
						"source": "Initial",
						"target": "State",
						"effect": "SET(this, id, 3);",
					},
					"State2ChoicePS_1": {
						"source": "State",
						"target": "ChoicePS",
						"trigger": "activation",
						"effect": "INC(this, id, 1);",
					},
					"ChoicePS2State_2": {
						"source": "ChoicePS",
						"target": "State",
						"guard": "GET(this, id) > 5",
						"effect": "SET(this, id, 0);",
					},
					"ChoicePS2State_3": {
						"source": "ChoicePS",
						"target": "State",
						"guard": "else",
					},
				},
				"operationByName": {
					"activation": {
					},
				},
				"propertyByName": {
					"id": {
						"private": true,
						"type": "Integer",
						"defaultValue": 0,
					},
				},
			},
			{
				"name": "clock",
				"class": "Clock",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
					"Idle": {
						"internalTransitions": {
							"Idle2Idle_4": {
								"effect": "SEND(GET(this, object), activation);",
							},
						},
					},
				},
				"transitionByName": {
					"Initial2Idle_5": {
						"source": "Initial",
						"target": "Idle",
					},
				},
			},
		],
		"connectorByName": {
			"c": {
				"ends": ["object", "clock"],
				"endNames": ["object", "clock"],
			},
		},
	}
);
