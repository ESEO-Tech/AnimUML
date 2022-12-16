globalThis.examples = globalThis.examples || [];
examples.push(
	{
		"name": "UML2AnimUML_TrafficLight",
		"objects": [
			{
				"name": "controller",
				"class": "Controller",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
					"Off": {
						"entry": "SET(this, id, (GET(this, id) + 1) % 2);",
					},
				},
				"transitionByName": {
					"Initial2Off_0": {
						"source": "Initial",
						"target": "Off",
					},
					"Off2WaitGreen_1": {
						"source": "Off",
						"target": "WaitGreen",
						"effect": "SEND(AT(GET(this, trafficLights), GET(this, id)), green);",
					},
					"WaitGreen2On_2": {
						"source": "WaitGreen",
						"target": "On",
						"trigger": "ackGreen",
					},
					"On2WaitRed_3": {
						"source": "On",
						"target": "WaitRed",
						"effect": "SEND(AT(GET(this, trafficLights), GET(this, id)), red);",
					},
					"WaitRed2Off_4": {
						"source": "WaitRed",
						"target": "Off",
						"trigger": "ackRed",
					},
				},
				"operationByName": {
					"ackGreen": {
					},
					"ackRed": {
					},
				},
				"propertyByName": {
					"id": {
						"private": true,
						"type": "Integer",
					},
				},
			},
			{
				"name": "trafficLights0",
				"class": "TrafficLight",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
				},
				"transitionByName": {
					"Initial2Red_5": {
						"source": "Initial",
						"target": "Red",
					},
					"Red2Green_6": {
						"source": "Red",
						"target": "Green",
						"trigger": "green",
						"effect": "SEND(GET(this, controller), ackGreen);",
					},
					"Green2Red_7": {
						"source": "Green",
						"target": "Red",
						"trigger": "red",
						"effect": "SEND(GET(this, controller), ackRed);",
					},
				},
				"operationByName": {
					"green": {
					},
					"red": {
					},
				},
			},
			{
				"name": "trafficLights1",
				"class": "TrafficLight",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
				},
				"transitionByName": {
					"Initial2Red_8": {
						"source": "Initial",
						"target": "Red",
					},
					"Red2Green_9": {
						"source": "Red",
						"target": "Green",
						"trigger": "green",
						"effect": "SEND(GET(this, controller), ackGreen);",
					},
					"Green2Red_10": {
						"source": "Green",
						"target": "Red",
						"trigger": "red",
						"effect": "SEND(GET(this, controller), ackRed);",
					},
				},
				"operationByName": {
					"green": {
					},
					"red": {
					},
				},
			},
		],
		"connectorByName": {
			"c0": {
				"ends": ["controller", "trafficLights0"],
				"endNames": ["controller", "trafficLights"],
			},
			"c1": {
				"ends": ["controller", "trafficLights1"],
				"endNames": ["controller", "trafficLights"],
			},
		},
	}
);
