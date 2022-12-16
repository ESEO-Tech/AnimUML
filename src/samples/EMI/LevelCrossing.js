globalThis.examples = globalThis.examples || [];
examples.push(
	{
		"name": "UML2AnimUML_LevelCrossing",
		"objects": [
			{
				"name": "train",
				"class": "Train",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
				},
				"transitionByName": {
					"Initial2Idle_0": {
						"source": "Initial",
						"target": "Idle",
					},
					"Idle2Far_1": {
						"source": "Idle",
						"target": "Far",
						"effect": "SEND(AT(GET(this, tcEntrance), 0), activation, 0);",
					},
					"far_to_close": {
						"source": "Far",
						"target": "Close",
						"effect": "SEND(AT(GET(this, tcEntrance), 1), activation, 1);",
					},
					"Close2Passing_2": {
						"source": "Close",
						"target": "Passing",
						"trigger": "authorization",
					},
					"Passing2Idle_3": {
						"source": "Passing",
						"target": "Idle",
						"effect": "SEND(GET(this, tcExit), activation, 0);",
					},
				},
				"operationByName": {
					"authorization": {
					},
				},
			},
			{
				"name": "tcEntrance0",
				"class": "EntranceTC",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
					"Detection": {
						"internalTransitions": {
							"t0": {
								"trigger": "activation",
								"effect": "SEND(GET(this, controller), entranceDetection, params.id);",
							},
						},
					},
				},
				"transitionByName": {
					"Initial2Detection_4": {
						"source": "Initial",
						"target": "Detection",
					},
				},
				"operationByName": {
					"activation": {
						"parameters": [{"name": "id", "type": "Integer",}],
					},
					"deactivation": {
					},
				},
				"propertyByName": {
					"id": {
						"private": true,
						"type": "Integer",
						"defaultValue": 1,
					},
				},
			},
			{
				"name": "tcEntrance1",
				"class": "EntranceTC",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
					"Detection": {
						"internalTransitions": {
							"t0": {
								"trigger": "activation",
								"effect": "SEND(GET(this, controller), entranceDetection, params.id);",
							},
						},
					},
				},
				"transitionByName": {
					"Initial2Detection_5": {
						"source": "Initial",
						"target": "Detection",
					},
				},
				"operationByName": {
					"activation": {
						"parameters": [{"name": "id", "type": "Integer",}],
					},
					"deactivation": {
					},
				},
				"propertyByName": {
					"id": {
						"private": true,
						"type": "Integer",
						"defaultValue": 1,
					},
				},
			},
			{
				"name": "tcExit",
				"class": "ExitTC",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
					"Detection": {
						"internalTransitions": {
							"Detection2Detection_6": {
								"trigger": "activation",
								"effect": "SEND(GET(this, controller), exitDetection, GET(this, id));",
							},
						},
					},
				},
				"transitionByName": {
					"Initial2Detection_7": {
						"source": "Initial",
						"target": "Detection",
					},
				},
				"operationByName": {
					"activation": {
						"parameters": [{"name": "id", "type": "Integer",}],
					},
					"deactivation": {
					},
				},
				"propertyByName": {
					"id": {
						"private": true,
						"type": "Integer",
						"defaultValue": 2,
					},
				},
			},
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
					"Initial2Idle_8": {
						"source": "Initial",
						"target": "Idle",
						"effect": "SET(this, nbEngagedTrains, 0);",
					},
					"Idle2WaitRoadSignOn_9": {
						"source": "Idle",
						"target": "WaitRoadSignOn",
						"trigger": "entranceDetection",
						"guard": "GET(this, nbEngagedTrains) == 0",
						"effect": "SEND(GET(this, roadSign), switchOn);",
					},
					"WaitRoadSignOn2FarDetection_10": {
						"source": "WaitRoadSignOn",
						"target": "FarDetection",
						"trigger": "roadSignOn",
					},
					"FarDetection2CloseDetection_11": {
						"source": "FarDetection",
						"target": "CloseDetection",
						"trigger": "entranceDetection",
						"effect": "SEND(GET(this, gate), close); INC(this, nbEngagedTrains, 1);",
					},
					"CloseDetection2Idle_12": {
						"source": "CloseDetection",
						"target": "Idle",
						"trigger": "gateClosed",
						"effect": "SEND(GET(this, railwaySign), switchOff);",
					},
					"Idle2WaitRailwaySignOn_13": {
						"source": "Idle",
						"target": "WaitRailwaySignOn",
						"trigger": "exitDetection",
						"guard": "GET(this, nbEngagedTrains) == 1",
						"effect": "SEND(GET(this, railwaySign), switchOn);",
					},
					"WaitRailwaySignOn2WaitGateOpen_14": {
						"source": "WaitRailwaySignOn",
						"target": "WaitGateOpen",
						"trigger": "railwaySignOn",
						"effect": "SEND(GET(this, gate), open); DEC(this, nbEngagedTrains, 1);",
					},
					"WaitGateOpen2WaitRoadSignOff_15": {
						"source": "WaitGateOpen",
						"target": "WaitRoadSignOff",
						"trigger": "gateOpen",
						"effect": "SEND(GET(this, roadSign), switchOff);",
					},
					"WaitRoadSignOff2Idle_16": {
						"source": "WaitRoadSignOff",
						"target": "Idle",
						"trigger": "roadSignOff",
					},
				},
				"operationByName": {
					"entranceDetection": {
						"parameters": [{"name": "id", "type": "Integer",}],
					},
					"exitDetection": {
						"parameters": [{"name": "id", "type": "Integer",}],
					},
					"roadSignOn": {
					},
					"roadSignOff": {
					},
					"railwaySignOn": {
					},
					"gateOpen": {
					},
					"gateClosed": {
					},
				},
				"propertyByName": {
					"nbEngagedTrains": {
						"private": true,
						"type": "Integer",
					},
				},
			},
			{
				"name": "railwaySign",
				"class": "RailwaySign",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
				},
				"transitionByName": {
					"Initial2Active_17": {
						"source": "Initial",
						"target": "Active",
					},
					"Active2Inactive_18": {
						"source": "Active",
						"target": "Inactive",
						"trigger": "switchOff",
						"effect": "SEND(GET(this, train), authorization);",
					},
					"Inactive2Active_19": {
						"source": "Inactive",
						"target": "Active",
						"trigger": "switchOn",
						"effect": "SEND(GET(this, controller), railwaySignOn);",
					},
				},
				"operationByName": {
					"switchOn": {
					},
					"switchOff": {
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
				"name": "roadSign",
				"class": "RoadSign",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
				},
				"transitionByName": {
					"Initial2Inactive_20": {
						"source": "Initial",
						"target": "Inactive",
					},
					"Inactive2Active_21": {
						"source": "Inactive",
						"target": "Active",
						"trigger": "switchOn",
						"effect": "SEND(GET(this, controller), roadSignOn);",
					},
					"Active2Inactive_22": {
						"source": "Active",
						"target": "Inactive",
						"trigger": "switchOff",
						"effect": "SEND(GET(this, controller), roadSignOff);",
					},
				},
				"operationByName": {
					"switchOn": {
					},
					"switchOff": {
					},
				},
			},
			{
				"name": "gate",
				"class": "Gate",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
				},
				"transitionByName": {
					"Initial2Open_23": {
						"source": "Initial",
						"target": "Open",
					},
					"Open2Closed_24": {
						"source": "Open",
						"target": "Closed",
						"trigger": "close",
						"effect": "SEND(GET(this, controller), gateClosed);",
					},
					"Closed2Open_25": {
						"source": "Closed",
						"target": "Open",
						"trigger": "open",
						"effect": "SEND(GET(this, controller), gateOpen);",
					},
				},
				"operationByName": {
					"open": {
					},
					"close": {
					},
				},
			},
		],
		"connectorByName": {
			"c1": {
				"ends": ["gate", "controller"],
				"endNames": ["gate", "controller"],
			},
			"c20": {
				"ends": ["tcEntrance0", "controller"],
				"endNames": ["tcEntrance", "controller"],
			},
			"c21": {
				"ends": ["tcEntrance1", "controller"],
				"endNames": ["tcEntrance", "controller"],
			},
			"c3": {
				"ends": ["tcExit", "controller"],
				"endNames": ["tcExit", "controller"],
			},
			"c4": {
				"ends": ["roadSign", "controller"],
				"endNames": ["roadSign", "controller"],
			},
			"c50": {
				"ends": ["train", "tcEntrance0"],
				"endNames": ["train", "tcEntrance"],
			},
			"c51": {
				"ends": ["train", "tcEntrance1"],
				"endNames": ["train", "tcEntrance"],
			},
			"c6": {
				"ends": ["train", "tcExit"],
				"endNames": ["train", "tcExit"],
			},
			"c7": {
				"ends": ["railwaySign", "controller"],
				"endNames": ["railwaySign", "controller"],
			},
			"c8": {
				"ends": ["railwaySign", "train"],
				"endNames": ["railwaySign", "train"],
			},
		},
	}
);
