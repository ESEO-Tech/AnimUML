globalThis.examples = globalThis.examples || [];
examples.push(
	{
		"name": "UML2AnimUML_CruiseControlSystem",
		"objects": [
			{
				"name": "driverComposite",
				"class": "Driver",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
					"Idle": {
						"internalTransitions": {
							"Start": {
								"guard": "EP_IS_EMPTY(GET(this, controller)) && GET(this, nb) < 10",
								"effect": "SEND(GET(this, controller), start); INC(this, nb, 1);",
							},
							"Stop": {
								"guard": "EP_IS_EMPTY(GET(this, controller)) && GET(this, nb) < 10",
								"effect": "SEND(GET(this, controller), stop); INC(this, nb, 1);",
							},
							"Set": {
								"guard": "EP_IS_EMPTY(GET(this, controller)) && GET(this, nb) < 10",
								"effect": "SEND(GET(this, controller), set); INC(this, nb, 1);",
							},
							"Resume": {
								"guard": "EP_IS_EMPTY(GET(this, controller)) && GET(this, nb) < 10",
								"effect": "SEND(GET(this, controller), resume); INC(this, nb, 1);",
							},
							"Pause": {
								"guard": "EP_IS_EMPTY(GET(this, controller)) && GET(this, nb) < 10",
								"effect": "SEND(GET(this, controller), pause); INC(this, nb, 1);",
							},
							"Inc": {
								"guard": "EP_IS_EMPTY(GET(this, controller)) && GET(this, nb) < 10",
								"effect": "SEND(GET(this, controller), inc); INC(this, nb, 1);",
							},
							"Dec": {
								"guard": "EP_IS_EMPTY(GET(this, controller)) && GET(this, nb) < 10",
								"effect": "SEND(GET(this, controller), dec); INC(this, nb, 1);",
							},
						},
					},
				},
				"transitionByName": {
					"Init": {
						"source": "Initial",
						"target": "Idle",
					},
				},
				"propertyByName": {
					"nb": {
						"private": true,
						"type": "Integer",
					},
				},
			},
			{
				"name": "speedManagerComposite",
				"class": "SpeedManager",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
					"On": {
						"internalTransitions": {
							"DetectSpeedChanged": {
								"guard": "GET(GET(this, dataManager), cruiseSpeed) != GET(GET(this, dataManager), speed) && GET(GET(this, dataManager), flag) == 0",
								"effect": "int delta = GET(GET(this, dataManager), cruiseSpeed) - GET(GET(this, dataManager), speed); SET(GET(this, dataManager), flag, 1); SEND(GET(this, car), changeSpeed, delta);",
							},
						},
					},
				},
				"transitionByName": {
					"Init": {
						"source": "Initial",
						"target": "Off",
					},
					"Engage": {
						"source": "Off",
						"target": "On",
						"trigger": "engage",
					},
					"Disengage": {
						"source": "On",
						"target": "Off",
						"trigger": "disengage",
					},
				},
				"operationByName": {
					"engage": {
					},
					"disengage": {
					},
				},
			},
			{
				"name": "cruiseSpeedManagerComposite",
				"class": "CruiseSpeedManager",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
					"Idle": {
						"internalTransitions": {
							"Set": {
								"trigger": "setCS",
								"effect": "SET(GET(this, dataManager), cruiseSpeed, GET(GET(this, dataManager), speed)); SEND(GET(this, controller), updateSpeed);",
							},
							"Inc": {
								"trigger": "incCS",
								"guard": "GET(GET(this, dataManager), cruiseSpeed) < 3",
								"effect": "INC(GET(this, dataManager), cruiseSpeed, 1);",
							},
							"Dec": {
								"trigger": "decCS",
								"guard": "GET(GET(this, dataManager), cruiseSpeed) > 0",
								"effect": "DEC(GET(this, dataManager), cruiseSpeed, 1);",
							},
						},
					},
				},
				"transitionByName": {
					"Init": {
						"source": "Initial",
						"target": "Idle",
					},
				},
				"operationByName": {
					"incCS": {
					},
					"decCS": {
					},
					"setCS": {
					},
				},
			},
			{
				"name": "carComposite",
				"class": "Car",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
					"Idle": {
						"internalTransitions": {
							"ChangeSpeed": {
								"trigger": "changeSpeed",
								"effect": "SET(GET(this, dataManager), speed, (GET(GET(this, dataManager), speed) + params.delta) % (3 + 1)); SET(GET(this, dataManager), flag, 0);",
							},
						},
					},
				},
				"transitionByName": {
					"Init": {
						"source": "Initial",
						"target": "Idle",
					},
				},
				"operationByName": {
					"changeSpeed": {
						"parameters": [{"name": "delta", "type": "Integer",}],
					},
				},
			},
			{
				"name": "controllerComposite",
				"class": "Controller",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
					"Off": {
						"internalTransitions": {
							"Off_consume_stop": {
								"trigger": "stop",
							},
							"Off_consume_resume": {
								"trigger": "resume",
							},
							"Off_consume_pause": {
								"trigger": "pause",
							},
							"Off_consume_set": {
								"trigger": "set",
							},
							"Off_consume_inc": {
								"trigger": "inc",
							},
							"Off_consume_dec": {
								"trigger": "dec",
							},
							"Off_consume_update": {
								"trigger": "updateSpeed",
							},
						},
					},
					"On_Disengaged": {
						"internalTransitions": {
							"SetFromDisengaged": {
								"trigger": "set",
								"effect": "SEND(GET(this, cruiseSpeedManager), setCS);",
							},
							"On_Disengaged_consume_stop": {
								"trigger": "start",
							},
							"On_Disengaged_consume_pause": {
								"trigger": "pause",
							},
							"On_Disengaged_consume_inc": {
								"trigger": "inc",
							},
							"On_Disengaged_consume_dec": {
								"trigger": "dec",
							},
						},
					},
					"On_Engaged": {
						"internalTransitions": {
							"Inc": {
								"trigger": "inc",
								"effect": "SEND(GET(this, cruiseSpeedManager), incCS);",
							},
							"Dec": {
								"trigger": "dec",
								"effect": "SEND(GET(this, cruiseSpeedManager), decCS);",
							},
							"On_Engaged_consume_start": {
								"trigger": "start",
							},
							"On_Engaged_consume_resume": {
								"trigger": "resume",
							},
							"On_Engaged_consume_update": {
								"trigger": "updateSpeed",
							},
						},
					},
				},
				"transitionByName": {
					"Init": {
						"source": "Initial",
						"target": "Off",
					},
					"Start": {
						"source": "Off",
						"target": "On_Disengaged",
						"trigger": "start",
					},
					"Stop": {
						"source": "On_Disengaged",
						"target": "Off",
						"trigger": "stop",
					},
					"UpdateSpeed": {
						"source": "On_Disengaged",
						"target": "On_Engaged",
						"trigger": "updateSpeed",
						"effect": "SEND(GET(this, speedManager), engage);",
					},
					"Resume": {
						"source": "On_Disengaged",
						"target": "On_Engaged",
						"trigger": "resume",
						"effect": "SEND(GET(this, speedManager), engage);",
					},
					"StopFromEngaged": {
						"source": "On_Engaged",
						"target": "Off",
						"trigger": "stop",
						"effect": "SEND(GET(this, speedManager), disengage);",
					},
					"SetFromEngaged": {
						"source": "On_Engaged",
						"target": "On_Disengaged",
						"trigger": "set",
						"effect": "SEND(GET(this, cruiseSpeedManager), setCS); SEND(GET(this, speedManager), disengage);",
					},
					"Pause": {
						"source": "On_Engaged",
						"target": "On_Disengaged",
						"trigger": "pause",
						"effect": "SEND(GET(this, speedManager), disengage);",
					},
				},
				"operationByName": {
					"start": {
					},
					"stop": {
					},
					"set": {
						"parameters": [{"name": "speed", "type": "Integer",}],
					},
					"updateSpeed": {
					},
					"pause": {
					},
					"resume": {
					},
					"inc": {
					},
					"dec": {
					},
				},
			},
			{
				"name": "dataManagerComposite",
				"class": "DataManager",
				"propertyByName": {
					"speed": {
						"private": true,
						"type": "Integer",
					},
					"cruiseSpeed": {
						"private": true,
						"type": "Integer",
					},
					"flag": {
						"private": true,
						"type": "Boolean",
					},
				},
			},
		],
		"connectorByName": {
			"c1": {
				"ends": ["controllerComposite", "speedManagerComposite"],
				"endNames": ["controller", "speedManager"],
			},
			"c2": {
				"ends": ["controllerComposite", "cruiseSpeedManagerComposite"],
				"endNames": ["controller", "cruiseSpeedManager"],
			},
			"c3": {
				"ends": ["driverComposite", "controllerComposite"],
				"endNames": ["driver", "controller"],
			},
			"c4": {
				"ends": ["carComposite", "speedManagerComposite"],
				"endNames": ["car", "speedManager"],
			},
			"c5": {
				"ends": ["carComposite", "cruiseSpeedManagerComposite"],
				"endNames": ["car", "cruiseSpeedManager"],
			},
			"c6": {
				"ends": ["carComposite", "dataManagerComposite"],
				"endNames": ["car", "dataManager"],
			},
			"c7": {
				"ends": ["speedManagerComposite", "dataManagerComposite"],
				"endNames": ["speedManager", "dataManager"],
			},
			"c8": {
				"ends": ["cruiseSpeedManagerComposite", "dataManagerComposite"],
				"endNames": ["cruiseSpeedManager", "dataManager"],
			},
		},
	}
);
