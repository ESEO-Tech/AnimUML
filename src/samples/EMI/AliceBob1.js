globalThis.examples = globalThis.examples || [];
examples.push(
	{
		"name": "UML2AnimUML_AliceBob1",
		"objects": [
			{
				"name": "alice",
				"class": "Alice",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
				},
				"transitionByName": {
					"Initial2I_0": {
						"source": "Initial",
						"target": "I",
					},
					"I2CS_1": {
						"source": "I",
						"target": "CS",
					},
					"CS2I_2": {
						"source": "CS",
						"target": "I",
					},
				},
			},
			{
				"name": "bob",
				"class": "Bob",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
				},
				"transitionByName": {
					"Initial2I_3": {
						"source": "Initial",
						"target": "I",
					},
					"I2CS_4": {
						"source": "I",
						"target": "CS",
					},
					"CS2I_5": {
						"source": "CS",
						"target": "I",
					},
				},
			},
		],
		"connectorByName": {
			"c": {
				"ends": ["bob", "alice"],
				"endNames": ["bob", "alice"],
			},
		},
	}
);
