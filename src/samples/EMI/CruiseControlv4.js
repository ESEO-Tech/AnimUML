globalThis.examples = globalThis.examples || [];
const {symbolicSpeed} = globalThis.MODEL_ARGS ?? {
	symbolicSpeed: false,
};
examples.push(
	{
		"name": "UML2AnimUML_CruiseControlv4",
		"objects": [
			{
				"name": "cci_controller",
				"class": "Controller",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
					"WaitCS": {
						"entry": "SEND(GET(this, csm), setCS);",
						"internalTransitions": {
							"WaitCS2WaitCS_0": {
								"trigger": "start",
							},
							"WaitCS2WaitCS_1": {
								"trigger": "inc",
							},
							"WaitCS2WaitCS_2": {
								"trigger": "dec",
							},
							"WaitCS2WaitCS_3": {
								"trigger": "set",
							},
							"WaitCS2WaitCS_4": {
								"trigger": "pause",
							},
							"WaitCS2WaitCS_5": {
								"trigger": "resume",
							},
							"WaitCS2WaitCS_6": {
								"trigger": "lock",
							},
							"WaitCS2WaitCS_7": {
								"trigger": "unlock",
							},
							"WaitCS2WaitCS_8": {
								"trigger": "disengaged",
							},
						},
					},
					"WaitPM": {
						"entry": "SEND(GET(this, pm), requestPedals);",
					},
					"Off": {
						"entry": "SEND(GET(this, csm), resetCS);",
						"internalTransitions": {
							"Off2Off_9": {
								"trigger": "stop",
							},
							"Off2Off_10": {
								"trigger": "set",
							},
							"Off2Off_11": {
								"trigger": "inc",
							},
							"Off2Off_12": {
								"trigger": "dec",
							},
							"Off2Off_13": {
								"trigger": "pause",
							},
							"Off2Off_14": {
								"trigger": "resume",
							},
							"Off2Off_15": {
								"trigger": "lock",
							},
							"Off2Off_16": {
								"trigger": "unlock",
							},
						},
					},
					"On": {
						"internalTransitions": {
							"On2On_17": {
								"trigger": "start",
							},
							"On2On_18": {
								"trigger": "inc",
							},
							"On2On_19": {
								"trigger": "dec",
							},
							"On2On_20": {
								"trigger": "pause",
							},
							"On2On_21": {
								"trigger": "resume",
							},
							"On2On_22": {
								"trigger": "lock",
							},
							"On2On_23": {
								"trigger": "unlock",
							},
						},
					},
					"Pause": {
						"internalTransitions": {
							"Pause2Pause_24": {
								"trigger": "inc",
								"effect": "SEND(GET(this, csm), incCS);",
							},
							"Pause2Pause_25": {
								"trigger": "dec",
								"effect": "SEND(GET(this, csm), decCS);",
							},
							"Pause2Pause_26": {
								"trigger": "start",
							},
							"Pause2Pause_27": {
								"trigger": "pause",
							},
							"Pause2Pause_28": {
								"trigger": "disengaged",
							},
						},
					},
					"Engaged": {
						"internalTransitions": {
							"Engaged2Engaged_29": {
								"trigger": "inc",
								"effect": "SEND(GET(this, csm), incCS);",
							},
							"Engaged2Engaged_30": {
								"trigger": "dec",
								"effect": "SEND(GET(this, csm), decCS);",
							},
							"Engaged2Engaged_31": {
								"trigger": "start",
							},
							"Engaged2Engaged_32": {
								"trigger": "resume",
							},
						},
					},
					"Lock": {
						"internalTransitions": {
							"Lock2Lock_33": {
								"trigger": "start",
							},
							"Lock2Lock_34": {
								"trigger": "inc",
							},
							"Lock2Lock_35": {
								"trigger": "dec",
							},
							"Lock2Lock_36": {
								"trigger": "set",
							},
							"Lock2Lock_37": {
								"trigger": "pause",
							},
							"Lock2Lock_38": {
								"trigger": "resume",
							},
							"Lock2Lock_39": {
								"trigger": "disengaged",
							},
						},
					},
				},
				"transitionByName": {
					"Initial2Off_40": {
						"source": "Initial",
						"target": "Off",
					},
					"Off2On_41": {
						"source": "Off",
						"target": "On",
						"trigger": "start",
					},
					"On2Off_42": {
						"source": "On",
						"target": "Off",
						"trigger": "stop",
					},
					"On2WaitCS_43": {
						"source": "On",
						"target": "WaitCS",
						"trigger": "set",
					},
					"Pause2WaitCS_44": {
						"source": "Pause",
						"target": "WaitCS",
						"trigger": "set",
					},
					"Engaged2WaitCS_45": {
						"source": "Engaged",
						"target": "WaitCS",
						"trigger": "set",
						"effect": "SEND(GET(this, actuation), disengage);",
					},
					"WaitCS2WaitPM_46": {
						"source": "WaitCS",
						"target": "WaitPM",
						"trigger": "ackCS",
					},
					"WaitCS2On_47": {
						"source": "WaitCS",
						"target": "On",
						"trigger": "nackCS",
					},
					"WaitPM2Engaged_48": {
						"source": "WaitPM",
						"target": "Engaged",
						"trigger": "ackPedals",
						"effect": "SEND(GET(this, actuation), engage);",
					},
					"WaitPM2On_49": {
						"source": "WaitPM",
						"target": "On",
						"trigger": "nackPedals",
					},
					"Engaged2Pause_50": {
						"source": "Engaged",
						"target": "Pause",
						"trigger": "pause",
						"effect": "SEND(GET(this, actuation), disengage);",
					},
					"Pause2Engaged_51": {
						"source": "Pause",
						"target": "Engaged",
						"trigger": "resume",
						"effect": "SEND(GET(this, actuation), engage);",
					},
					"Engaged2Lock_52": {
						"source": "Engaged",
						"target": "Lock",
						"trigger": "lock",
						"effect": "SEND(GET(this, actuation), disengage);",
					},
					"Pause2Lock_53": {
						"source": "Pause",
						"target": "Lock",
						"trigger": "lock",
					},
					"Lock2Pause_54": {
						"source": "Lock",
						"target": "Pause",
						"trigger": "unlock",
					},
					"WaitCS2Off_55": {
						"source": "WaitCS",
						"target": "Off",
						"trigger": "stop",
					},
					"Pause2Off_56": {
						"source": "Pause",
						"target": "Off",
						"trigger": "stop",
					},
					"Lock2Off_57": {
						"source": "Lock",
						"target": "Off",
						"trigger": "stop",
					},
					"Engaged2WaitDisengaged_58": {
						"source": "Engaged",
						"target": "WaitDisengaged",
						"trigger": "stop",
						"effect": "SEND(GET(this, actuation), disengage);",
					},
					"WaitDisengaged2Off_59": {
						"source": "WaitDisengaged",
						"target": "Off",
						"trigger": "disengaged",
					},
				},
				"operationByName": {
					"ackCS": {
					},
					"nackCS": {
					},
					"ackPedals": {
					},
					"nackPedals": {
					},
					"lock": {
					},
					"unlock": {
					},
					"disengaged": {
					},
					"start": {
					},
					"stop": {
					},
					"set": {
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
				"name": "cci_actuation",
				"class": "Actuation",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
					"ChoiceEngagedCaptureSpeed": {
						"type": "Pseudostate",
						"kind": "choice",
					},
					"ChoiceDisengagedCaptureSpeed": {
						"type": "Pseudostate",
						"kind": "choice",
					},
				},
				"transitionByName": {
					"Init": {
						"source": "Initial",
						"target": "Disengaged",
					},
					"Engage": {
						"source": "Disengaged",
						"target": "Engaged",
						"trigger": "engage",
						"effect": "SEND(GET(this, cciControlOnOffPort), controlOn);",
					},
					"Disengage": {
						"source": "Engaged",
						"target": "Disengaged",
						"trigger": "disengage",
						"effect": "SEND(GET(this, cciControlOnOffPort), controlOff); SEND(GET(this, controller), disengaged);",
					},
					"updateSpeedWhenEngaged": {
						"source": "Engaged",
						"target": "ChoiceEngagedCaptureSpeed",
						"trigger": "updateSpeed",
					},
					"ChoiceEngagedCaptureSpeed2Engaged_60": {
						"source": "ChoiceEngagedCaptureSpeed",
						"target": "Engaged",
						"guard": "params.speed >= 1 && params.speed <= 2",
						"effect": "SEND(GET(this, csm), speedCaptured, params.speed); SEND(GET(this, csm), requestSetPoint);",
					},
					"ChoiceEngagedCaptureSpeed2Engaged_61": {
						"source": "ChoiceEngagedCaptureSpeed",
						"target": "Engaged",
						"guard": "else",
						"effect": "SEND(GET(this, csm), speedNotCaptured); SEND(GET(this, controller), pause);",
					},
					"updateSpeedWhenDisengaged": {
						"source": "Disengaged",
						"target": "ChoiceDisengagedCaptureSpeed",
						"trigger": "updateSpeed",
					},
					"ChoiceDisengagedCaptureSpeed2Disengaged_62": {
						"source": "ChoiceDisengagedCaptureSpeed",
						"target": "Disengaged",
						"guard": "params.speed >= 1 && params.speed <= 2",
						"effect": "SEND(GET(this, csm), speedCaptured, params.speed);",
					},
					"ChoiceDisengagedCaptureSpeed2Disengaged_63": {
						"source": "ChoiceDisengagedCaptureSpeed",
						"target": "Disengaged",
						"guard": "else",
						"effect": "SEND(GET(this, csm), speedNotCaptured);",
					},
				},
				"operationByName": {
					"engage": {
					},
					"disengage": {
					},
					"updateSpeed": {
						"parameters": [{"name": "speed", "type": "Integer",}],
					},
				},
			},
			{
				"name": "cci_csm",
				"class": "CruiseSpeedManager",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
					"ChoiceIncCS": {
						"type": "Pseudostate",
						"kind": "choice",
					},
					"ChoiceDecCS": {
						"type": "Pseudostate",
						"kind": "choice",
					},
					"Idle": {
						"internalTransitions": {
							"ResetCS": {
								"trigger": "resetCS",
								"effect": "SET(this, cruiseSpeed, -1);",
							},
							"RequestSetPoint": {
								"trigger": "requestSetPoint",
								"effect": "SEND(GET(this, cciCruiseSpeedPort), updateSetPoint, GET(this, cruiseSpeed));",
							},
							"IgnoreSpeedCaptured": {
								"trigger": "speedCaptured",
							},
							"IgnoreSpeedNotCaptured": {
								"trigger": "speedNotCaptured",
							},
						},
					},
					"WaitSpeed": {
						"internalTransitions": {
							"IgnoreSetCS": {
								"trigger": "setCS",
							},
							"IgnoreIncCS": {
								"trigger": "incCS",
							},
							"IgnoreDecCS": {
								"trigger": "decCS",
							},
						},
					},
				},
				"transitionByName": {
					"Init": {
						"source": "Initial",
						"target": "Idle",
						"effect": "SET(this, cruiseSpeed, -1);",
					},
					"SetCS": {
						"source": "Idle",
						"target": "WaitSpeed",
						"trigger": "setCS",
					},
					"SpeedCaptured": {
						"source": "WaitSpeed",
						"target": "Idle",
						"trigger": "speedCaptured",
						"effect": "SET(this, cruiseSpeed, params.speed); SEND(GET(this, controller), ackCS);",
					},
					"SpeedNotCaptured": {
						"source": "WaitSpeed",
						"target": "Idle",
						"trigger": "speedNotCaptured",
						"effect": "SET(this, cruiseSpeed, -1); SEND(GET(this, controller), nackCS);",
					},
					"SpeedReset": {
						"source": "WaitSpeed",
						"target": "Idle",
						"trigger": "resetCS",
						"effect": "SET(this, cruiseSpeed, -1);",
					},
					"Inc": {
						"source": "Idle",
						"target": "ChoiceIncCS",
						"trigger": "incCS",
					},
					"ChoiceIncCS2Idle_64": {
						"source": "ChoiceIncCS",
						"target": "Idle",
						"guard": "GET(this, cruiseSpeed) < 2",
						"effect": "INC(this, cruiseSpeed, 1);",
					},
					"ChoiceIncCS2Idle_65": {
						"source": "ChoiceIncCS",
						"target": "Idle",
						"guard": "else",
					},
					"Dec": {
						"source": "Idle",
						"target": "ChoiceDecCS",
						"trigger": "decCS",
					},
					"ChoiceDecCS2Idle_66": {
						"source": "ChoiceDecCS",
						"target": "Idle",
						"guard": "GET(this, cruiseSpeed) > 1",
						"effect": "DEC(this, cruiseSpeed, 1);",
					},
					"ChoiceDecCS2Idle_67": {
						"source": "ChoiceDecCS",
						"target": "Idle",
						"guard": "else",
					},
				},
				"operationByName": {
					"incCS": {
					},
					"decCS": {
					},
					"setCS": {
					},
					"resetCS": {
					},
					"speedCaptured": {
						"parameters": [{"name": "speed", "type": "Integer",}],
					},
					"speedNotCaptured": {
					},
					"requestSetPoint": {
					},
				},
				"propertyByName": {
					"cruiseSpeed": {
						"private": true,
						"type": "Integer",
					},
				},
			},
			{
				"name": "cci_pm",
				"class": "PedalsManager",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
					"ChoiceLock": {
						"type": "Pseudostate",
						"kind": "choice",
					},
					"ChoiceResume": {
						"type": "Pseudostate",
						"kind": "choice",
					},
					"Idle": {
						"internalTransitions": {
							"Idle2Idle_68": {
								"trigger": "pedalPressed",
								"ports": ["pmThrottlePedalPort"],
								"effect": "SEND(GET(this, controller), pause); SET(this, canResume, TRUE);",
							},
							"Idle2Idle_69": {
								"trigger": "requestPedals",
								"effect": "SEND(GET(this, controller), ackPedals);",
							},
						},
					},
					"Lock": {
						"internalTransitions": {
							"Lock2Lock_70": {
								"trigger": "pedalPressed",
								"ports": ["pmClutchPedalPort", "pmBreakPedalPort"],
								"effect": "INC(this, nbLocks, 1);",
							},
							"Lock2Lock_71": {
								"trigger": "requestPedals",
								"effect": "SEND(GET(this, controller), nackPedals);",
							},
							"IgnoreThrottlePressed": {
								"trigger": "pedalPressed",
								"ports": ["pmThrottlePedalPort"],
							},
							"IgnoreThrottleReleased": {
								"trigger": "pedalReleased",
								"ports": ["pmThrottlePedalPort"],
							},
						},
					},
				},
				"transitionByName": {
					"Init": {
						"source": "Initial",
						"target": "Idle",
					},
					"Idle2ChoiceResume_72": {
						"source": "Idle",
						"target": "ChoiceResume",
						"trigger": "pedalReleased",
						"ports": ["pmThrottlePedalPort"],
					},
					"ChoiceResume2Idle_73": {
						"source": "ChoiceResume",
						"target": "Idle",
						"guard": "GET(this, canResume) == TRUE",
						"effect": "SEND(GET(this, controller), resume);",
					},
					"ChoiceResume2Idle_74": {
						"source": "ChoiceResume",
						"target": "Idle",
						"guard": "else",
					},
					"Idle2Lock_75": {
						"source": "Idle",
						"target": "Lock",
						"trigger": "pedalPressed",
						"ports": ["pmClutchPedalPort", "pmBreakPedalPort"],
						"effect": "INC(this, nbLocks, 1); SET(this, canResume, FALSE); SEND(GET(this, controller), lock);",
					},
					"Lock2ChoiceLock_76": {
						"source": "Lock",
						"target": "ChoiceLock",
						"trigger": "pedalReleased",
						"ports": ["pmClutchPedalPort", "pmBreakPedalPort"],
						"effect": "DEC(this, nbLocks, 1);",
					},
					"ChoiceLock2Lock_77": {
						"source": "ChoiceLock",
						"target": "Lock",
						"guard": "GET(this, nbLocks) > 0",
					},
					"ChoiceLock2Idle_78": {
						"source": "ChoiceLock",
						"target": "Idle",
						"guard": "else",
						"effect": "SEND(GET(this, controller), unlock);",
					},
				},
				"operationByName": {
					"requestPedals": {
					},
					"pedalPressed": {
					},
					"pedalReleased": {
					},
				},
				"propertyByName": {
					"nbLocks": {
						"private": true,
						"type": "Integer",
					},
					"canResume": {
						"private": true,
						"type": "Boolean",
					},
				},
			},
			{
				"name": "cci_buttonsPort",
				"class": "CCIButtonsPort",
				"type": "Port",
				"operationByName": {
					"start": {
					},
					"stop": {
					},
					"set": {
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
				"name": "cci_clutchPedalPort",
				"class": "CCIPedalPort",
				"type": "Port",
				"operationByName": {
					"pedalPressed": {
					},
					"pedalReleased": {
					},
				},
			},
			{
				"name": "cci_breakPedalPort",
				"class": "CCIPedalPort",
				"type": "Port",
				"operationByName": {
					"pedalPressed": {
					},
					"pedalReleased": {
					},
				},
			},
			{
				"name": "cci_throttlePedalPort",
				"class": "CCIPedalPort",
				"type": "Port",
				"operationByName": {
					"pedalPressed": {
					},
					"pedalReleased": {
					},
				},
			},
			{
				"name": "cci_controlOnOffPort",
				"class": "CCIControlOnOffPort",
				"type": "Port",
			},
			{
				"name": "cci_speedPort",
				"class": "CCISpeedPort",
				"type": "Port",
				"operationByName": {
					"updateSpeed": {
						"parameters": [{"name": "speed", "type": "Integer",}],
					},
				},
			},
			{
				"name": "cci_cruiseSpeedPort",
				"class": "CCICruiseSpeedPort",
				"type": "Port",
			},
			{
				"name": "env_buttons",
				"class": "Buttons",
				"isActor": true,
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
					"Idle": {
						"internalTransitions": {
							"Start": {
								"guard": "EP_IS_EMPTY(GET(GET(ROOT_instMain, env), engine))",
								"effect": "SEND(GET(this, envButtonsPort), start);",
							},
							"Set": {
								"guard": "EP_IS_EMPTY(GET(GET(ROOT_instMain, env), engine))",
								"effect": "SEND(GET(this, envButtonsPort), set);",
							},
							"Pause": {
								"guard": "EP_IS_EMPTY(GET(GET(ROOT_instMain, env), engine))",
								"effect": "SEND(GET(this, envButtonsPort), pause);",
							},
							"Resume": {
								"guard": "EP_IS_EMPTY(GET(GET(ROOT_instMain, env), engine))",
								"effect": "SEND(GET(this, envButtonsPort), resume);",
							},
							"Inc": {
								"guard": "EP_IS_EMPTY(GET(GET(ROOT_instMain, env), engine))",
								"effect": "SEND(GET(this, envButtonsPort), inc);",
							},
							"Dec": {
								"guard": "EP_IS_EMPTY(GET(GET(ROOT_instMain, env), engine))",
								"effect": "SEND(GET(this, envButtonsPort), dec);",
							},
							"Stop": {
								"guard": "EP_IS_EMPTY(GET(GET(ROOT_instMain, env), engine))",
								"effect": "SEND(GET(this, envButtonsPort), stop);",
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
			},
			{
				"name": "env_clutchPedal",
				"class": "Pedal",
				"isActor": true,
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
				},
				"transitionByName": {
					"Init": {
						"source": "Initial",
						"target": "Released",
					},
					"PressPedal": {
						"source": "Released",
						"target": "Pressed",
						"guard": "EP_IS_EMPTY(GET(GET(ROOT_instMain, env), engine))",
						"effect": "SEND(GET(this, envPedalPort), pedalPressed);",
					},
					"ReleasePedal": {
						"source": "Pressed",
						"target": "Released",
						"guard": "EP_IS_EMPTY(GET(GET(ROOT_instMain, env), engine))",
						"effect": "SEND(GET(this, envPedalPort), pedalReleased);",
					},
				},
			},
			{
				"name": "env_breakPedal",
				"class": "Pedal",
				"isActor": true,
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
				},
				"transitionByName": {
					"Init": {
						"source": "Initial",
						"target": "Released",
					},
					"PressPedal": {
						"source": "Released",
						"target": "Pressed",
						"guard": "EP_IS_EMPTY(GET(GET(ROOT_instMain, env), engine))",
						"effect": "SEND(GET(this, envPedalPort), pedalPressed);",
					},
					"ReleasePedal": {
						"source": "Pressed",
						"target": "Released",
						"guard": "EP_IS_EMPTY(GET(GET(ROOT_instMain, env), engine))",
						"effect": "SEND(GET(this, envPedalPort), pedalReleased);",
					},
				},
			},
			{
				"name": "env_throttlePedal",
				"class": "Pedal",
				"isActor": true,
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
				},
				"transitionByName": {
					"Init": {
						"source": "Initial",
						"target": "Released",
					},
					"PressPedal": {
						"source": "Released",
						"target": "Pressed",
						"guard": "EP_IS_EMPTY(GET(GET(ROOT_instMain, env), engine))",
						"effect": "SEND(GET(this, envPedalPort), pedalPressed);",
					},
					"ReleasePedal": {
						"source": "Pressed",
						"target": "Released",
						"guard": "EP_IS_EMPTY(GET(GET(ROOT_instMain, env), engine))",
						"effect": "SEND(GET(this, envPedalPort), pedalReleased);",
					},
				},
			},
			{
				"name": "env_engine",
				"class": "Engine",
				"isActor": true,
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
					"Idle": {
						"internalTransitions": {
							...symbolicSpeed
							?	{
									"Tick": {
										"guard": "EP_IS_EMPTY(GET(GET(ROOT_instMain, env), engine))",
										"effect": "SEND(GET(this, envSpeedPort), updateSpeed, SymbolicInt(0, 3));",
									},
								}
							:	{
									"Tick": {
										"guard": "EP_IS_EMPTY(GET(GET(ROOT_instMain, env), engine))",
										"effect": "SEND(GET(this, envSpeedPort), updateSpeed, GET(this, speed));",
									},
									"IncSpeed": {
										"guard": "EP_IS_EMPTY(GET(GET(ROOT_instMain, env), engine)) && GET(this, speed) < 3",
										"effect": "INC(this, speed, 1);",
									},
									"DecSpeed": {
										"guard": "EP_IS_EMPTY(GET(GET(ROOT_instMain, env), engine)) && GET(this, speed) > 0",
										"effect": "DEC(this, speed, 1);",
									},
								}
							,
							"UpdateSetPoint": {
								"trigger": "updateSetPoint",
							},
							"ControlOn": {
								"trigger": "controlOn",
								"effect": "SET(this, on, TRUE);",
							},
							"ControlOff": {
								"trigger": "controlOff",
								"effect": "SET(this, on, FALSE);",
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
					"controlOn": {
					},
					"controlOff": {
					},
					"updateSetPoint": {
						"parameters": [{"name": "setPoint", "type": "Integer",}],
					},
				},
				"propertyByName": {
					"speed": {
						"private": true,
						"type": "Integer",
						"defaultValue": 1,
					},
					"on": {
						"private": true,
						"type": "Boolean",
					},
				},
			},
			{
				"name": "env_envButtonsPort",
				"class": "EnvButtonsPort",
				"type": "Port",
			},
			{
				"name": "env_envClutchPedalPort",
				"class": "EnvPedalPort",
				"type": "Port",
			},
			{
				"name": "env_envBreakPedalPort",
				"class": "EnvPedalPort",
				"type": "Port",
			},
			{
				"name": "env_envThrottlePedalPort",
				"class": "EnvPedalPort",
				"type": "Port",
			},
			{
				"name": "env_envControlOnOffPort",
				"class": "EnvControlOnOffPort",
				"type": "Port",
				"operationByName": {
					"controlOn": {
					},
					"controlOff": {
					},
				},
			},
			{
				"name": "env_envSpeedPort",
				"class": "EnvSpeedPort",
				"type": "Port",
			},
			{
				"name": "env_envCruiseSpeedPort",
				"class": "EnvCruiseSpeedPort",
				"type": "Port",
				"operationByName": {
					"updateSetPoint": {
						"parameters": [{"name": "setPoint", "type": "Integer",}],
					},
				},
			},
			{
				"name": "cci_pm_pmClutchPedalPort",
				"type": "Port",
			},
			{
				"name": "cci_pm_pmBreakPedalPort",
				"type": "Port",
			},
			{
				"name": "cci_pm_pmThrottlePedalPort",
				"type": "Port",
			},
		],
		"connectorByName": {
			"c_cciButtonsPort_envButtonsPort": {
				"ends": ["cci_buttonsPort", "env_envButtonsPort"],
				"endNames": ["cciButtonsPort", "envButtonsPort"],
			},
			"c_cciClutchPedalPort_envClutchPedalPort": {
				"ends": ["cci_clutchPedalPort", "env_envClutchPedalPort"],
				"endNames": ["cciPedalPort", "envPedalPort"],
			},
			"c_cciBreakPedalPort_envBreakPedalPort": {
				"ends": ["cci_breakPedalPort", "env_envBreakPedalPort"],
				"endNames": ["cciPedalPort", "envPedalPort"],
			},
			"c_cciThrottlePedalPort_envThrottlePedalPort": {
				"ends": ["cci_throttlePedalPort", "env_envThrottlePedalPort"],
				"endNames": ["cciPedalPort", "envPedalPort"],
			},
			"c_cciControlOnOffPort_envControlOnOffPort": {
				"ends": ["cci_controlOnOffPort", "env_envControlOnOffPort"],
				"endNames": ["cciControlOnOffPort", "envControlOnOffPort"],
			},
			"c_cciSpeedPort_envSpeedPort": {
				"ends": ["cci_speedPort", "env_envSpeedPort"],
				"endNames": ["cciSpeedPort", "envSpeedPort"],
			},
			"c_cciCruiseSpeedPort_envCruiseSpeedPort": {
				"ends": ["cci_cruiseSpeedPort", "env_envCruiseSpeedPort"],
				"endNames": ["cciCruiseSpeedPort", "envCruiseSpeedPort"],
			},
			"cci_c_buttonsPort_controller": {
				"ends": ["cci_buttonsPort", "cci_controller"],
				"endNames": ["cciButtonsPort", "controller"],
			},
			"cci_c_clutchPedalPort_pmClutchPedalPort": {
				"ends": ["cci_clutchPedalPort", "cci_pm_pmClutchPedalPort"],
				"endNames": ["cciPedalPort", "pmPedalPort"],
			},
			"cci_c_breakPedalPort_pmBreakPedalPort": {
				"ends": ["cci_breakPedalPort", "cci_pm_pmBreakPedalPort"],
				"endNames": ["cciPedalPort", "pmPedalPort"],
			},
			"cci_c_throttlePedalPort_pmThrottlePedalPort": {
				"ends": ["cci_throttlePedalPort", "cci_pm_pmThrottlePedalPort"],
				"endNames": ["cciPedalPort", "pmPedalPort"],
			},
			"cci_c_controlOnOffPort_actuation": {
				"ends": ["cci_controlOnOffPort", "cci_actuation"],
				"endNames": ["cciControlOnOffPort", "actuation"],
			},
			"cci_c_speedPort_actuation": {
				"ends": ["cci_speedPort", "cci_actuation"],
				"endNames": ["cciSpeedPort", "actuation"],
			},
			"cci_c_cruiseSpeedPort_csm": {
				"ends": ["cci_cruiseSpeedPort", "cci_csm"],
				"endNames": ["cciCruiseSpeedPort", "csm"],
			},
			"cci_c_pm_controller": {
				"ends": ["cci_pm", "cci_controller"],
				"endNames": ["pm", "controller"],
			},
			"cci_c_actuation_controller": {
				"ends": ["cci_actuation", "cci_controller"],
				"endNames": ["actuation", "controller"],
			},
			"cci_c_csm_controller": {
				"ends": ["cci_csm", "cci_controller"],
				"endNames": ["csm", "controller"],
			},
			"cci_c_actuation_csm": {
				"ends": ["cci_actuation", "cci_csm"],
				"endNames": ["actuation", "csm"],
			},
			"env_c_buttonsPort_buttons": {
				"ends": ["env_envButtonsPort", "env_buttons"],
				"endNames": ["envButtonsPort", "buttons"],
			},
			"env_c_clutchPedalPort_clutchPedal": {
				"ends": ["env_envClutchPedalPort", "env_clutchPedal"],
				"endNames": ["envPedalPort", "pedal"],
			},
			"env_c_breakPedalPort_breakPedal": {
				"ends": ["env_envBreakPedalPort", "env_breakPedal"],
				"endNames": ["envPedalPort", "pedal"],
			},
			"env_c_throttlePedalPort_throttlePedal": {
				"ends": ["env_envThrottlePedalPort", "env_throttlePedal"],
				"endNames": ["envPedalPort", "pedal"],
			},
			"env_c_controlOnOffPort_engine": {
				"ends": ["env_envControlOnOffPort", "env_engine"],
				"endNames": ["envControlOnOffPort", "engine"],
			},
			"env_c_speedPort_engine": {
				"ends": ["env_envSpeedPort", "env_engine"],
				"endNames": ["envSpeedPort", "engine"],
			},
			"env_c_cruiseSpeedPort_engine": {
				"ends": ["env_envCruiseSpeedPort", "env_engine"],
				"endNames": ["envCruiseSpeedPort", "engine"],
			},
			"cci_pm_owns_cci_pm_pmClutchPedalPort": {
				"ends": ["cci_pm", "cci_pm_pmClutchPedalPort"],
				"endNames": ["cci_pm", "pmClutchPedalPort"],
				"incomingTag": "pmClutchPedalPort",
			},
			"cci_pm_owns_cci_pm_pmBreakPedalPort": {
				"ends": ["cci_pm", "cci_pm_pmBreakPedalPort"],
				"endNames": ["cci_pm", "pmBreakPedalPort"],
				"incomingTag": "pmBreakPedalPort",
			},
			"cci_pm_owns_cci_pm_pmThrottlePedalPort": {
				"ends": ["cci_pm", "cci_pm_pmThrottlePedalPort"],
				"endNames": ["cci_pm", "pmThrottlePedalPort"],
				"incomingTag": "pmThrottlePedalPort",
			},
		},
	}
);
