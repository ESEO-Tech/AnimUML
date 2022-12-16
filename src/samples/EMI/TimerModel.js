globalThis.examples = globalThis.examples || [];
examples.push(
	{
		"name": "UML2AnimUML_TimerModel",
		"objects": [
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
							"T_sendTick": {
								"effect": "SEND(GET(this, timer), tick);",
							},
						},
					},
				},
				"transitionByName": {
					"Initial2Idle_0": {
						"source": "Initial",
						"target": "Idle",
					},
				},
			},
			{
				"name": "timer",
				"class": "Timer",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
					"ChoiceRun": {
						"type": "Pseudostate",
						"kind": "choice",
					},
					"Idle": {
						"internalTransitions": {
							"T_ignoreStop": {
								"trigger": "stop",
							},
							"T_ignoreTick": {
								"trigger": "tick",
							},
						},
					},
					"Run": {
						"internalTransitions": {
							"T_ignoreStart": {
								"trigger": "start",
							},
						},
					},
				},
				"transitionByName": {
					"Initial2Idle_1": {
						"source": "Initial",
						"target": "Idle",
					},
					"Idle2Run_2": {
						"source": "Idle",
						"target": "Run",
						"trigger": "start",
						"guard": "GET(this, active) == FALSE",
						"effect": "SET(this, active, TRUE);\nSET(this, counter, 0);",
					},
					"Run2Idle_3": {
						"source": "Run",
						"target": "Idle",
						"trigger": "stop",
						"guard": "GET(this, active) == TRUE",
						"effect": "SET(this, active, FALSE);\nSET(this, counter, 0);",
					},
					"Run2ChoiceRun_4": {
						"source": "Run",
						"target": "ChoiceRun",
						"trigger": "tick",
						"effect": "INC(this, counter, 1);",
					},
					"ChoiceRun2Run_5": {
						"source": "ChoiceRun",
						"target": "Run",
						"guard": "GET(this, counter) < GET(this, prescaler)",
					},
					"ChoiceRun2Run_6": {
						"source": "ChoiceRun",
						"target": "Run",
						"guard": "else",
						"effect": "CALL(this, setOutput, !GET(this, output));\nSET(this, counter, 0);",
					},
				},
				"operationByName": {
					"setOutput": {
						"method": "SET(this, output, params.value); printf(\"Output is now %d\\n\", GET(this, output));",
						"parameters": [{"name": "value", "type": "Boolean",}],
					},
					"start": {
					},
					"stop": {
					},
					"tick": {
					},
				},
				"propertyByName": {
					"prescaler": {
						"private": true,
						"type": "Integer",
						"defaultValue": 10,
					},
					"counter": {
						"private": true,
						"type": "Integer",
					},
					"output": {
						"private": true,
						"type": "Boolean",
					},
					"active": {
						"private": true,
						"type": "Boolean",
					},
				},
			},
			{
				"name": "user",
				"class": "User",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
					"Idle": {
						"internalTransitions": {
							"T_sendStart": {
								"effect": "printf(\"Send start\\n\");\nSEND(GET(this, timer), start);",
							},
							"T_sendStop": {
								"effect": "printf(\"Send stop\\n\");\nSEND(GET(this, timer), stop);",
							},
						},
					},
				},
				"transitionByName": {
					"Initial2Idle_7": {
						"source": "Initial",
						"target": "Idle",
					},
				},
			},
		],
		"connectorByName": {
			"c1": {
				"ends": ["clock", "timer"],
				"endNames": ["clock", "timer"],
			},
			"c2": {
				"ends": ["timer", "user"],
				"endNames": ["timer", "user"],
			},
		},
	}
);
