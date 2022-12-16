globalThis.examples = globalThis.examples || [];
examples.push(
	{
		"name": "UML2AnimUML_AliceBob2",
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
					"I2W_1": {
						"source": "I",
						"target": "W",
						"effect": "SET(GET(this, dataManager), flagAlice, 1);",
					},
					"W2CS_2": {
						"source": "W",
						"target": "CS",
						"guard": "GET(GET(this, dataManager), flagBob) == 0",
					},
					"CS2I_3": {
						"source": "CS",
						"target": "I",
						"effect": "SET(GET(this, dataManager), flagAlice, 0);",
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
					"Initial2I_4": {
						"source": "Initial",
						"target": "I",
					},
					"I2W_5": {
						"source": "I",
						"target": "W",
						"effect": "SET(GET(this, dataManager), flagBob, 1);",
					},
					"W2CS_6": {
						"source": "W",
						"target": "CS",
						"guard": "GET(GET(this, dataManager), flagAlice) == 0",
					},
					"CS2I_7": {
						"source": "CS",
						"target": "I",
						"effect": "SET(GET(this, dataManager), flagBob, 0);",
					},
				},
			},
			{
				"name": "dataManager",
				"class": "DataManager",
				"propertyByName": {
					"flagAlice": {
						"private": true,
						"type": "Boolean",
					},
					"flagBob": {
						"private": true,
						"type": "Boolean",
					},
				},
			},
		],
		"connectorByName": {
			"c1": {
				"ends": ["bob", "alice"],
				"endNames": ["bob", "alice"],
			},
			"c2": {
				"ends": ["dataManager", "alice"],
				"endNames": ["dataManager", "alice"],
			},
			"c3": {
				"ends": ["dataManager", "bob"],
				"endNames": ["dataManager", "bob"],
			},
		},
	}
);
