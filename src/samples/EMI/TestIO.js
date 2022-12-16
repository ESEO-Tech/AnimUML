globalThis.examples = globalThis.examples || [];
examples.push(
	{
		"name": "UML2AnimUML_TestIO",
		"objects": [
			{
				"name": "controller",
				"class": "Controller",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
				},
				"transitionByName": {
					"Initial2Inactive_0": {
						"source": "Initial",
						"target": "Inactive",
					},
					"Inactive2Active_1": {
						"source": "Inactive",
						"target": "Active",
						"trigger": "buttonPressed",
						"effect": "SEND(GET(this, led), ledOn);",
					},
					"Active2Inactive_2": {
						"source": "Active",
						"target": "Inactive",
						"trigger": "buttonPressed",
						"effect": "SEND(GET(this, led), ledOff);",
					},
				},
				"operationByName": {
					"buttonPressed": {
					},
				},
			},
			{
				"name": "led",
				"class": "Led",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
				},
				"transitionByName": {
					"Initial2Off_3": {
						"source": "Initial",
						"target": "Off",
					},
					"Off2On_4": {
						"source": "Off",
						"target": "On",
						"trigger": "ledOn",
					},
					"On2Off_5": {
						"source": "On",
						"target": "Off",
						"trigger": "ledOff",
					},
				},
				"operationByName": {
					"ledOn": {
					},
					"ledOff": {
					},
				},
			},
		],
		"connectorByName": {
			"c": {
				"ends": ["controller", "led"],
				"endNames": ["controller", "led"],
			},
		},
	}
);
