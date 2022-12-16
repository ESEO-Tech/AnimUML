globalThis.examples = globalThis.examples || [];
examples.push(
	{
		"name": "UML2AnimUML_CruiseControlObservers",
		"objects": [
			{
				"name": "observer1",
				"class": "Observer1",
				"isObserver": true,
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
					"Off": {
						"internalTransitions": {
							"Off2Off_0": {
								"guard": "!(EP_GET_FIRST(GET_ACTIVE_PEER(GET(GET(ROOT_instMain, cci), actuation), cciControlOnOffPort)) == SIGNAL_controlOn) && !(EP_GET_FIRST(GET_ACTIVE_PEER(GET(GET(ROOT_instMain, cci), csm), cciCruiseSpeedPort)) == SIGNAL_updateSetPoint)",
							},
						},
					},
					"Fail": {
						"internalTransitions": {
							"Fail2Fail_1": {
								"guard": "TRUE",
							},
						},
					},
					"On": {
						"internalTransitions": {
							"On2On_2": {
								"guard": "!(EP_GET_FIRST(GET_ACTIVE_PEER(GET(GET(ROOT_instMain, cci), actuation), cciControlOnOffPort)) == SIGNAL_controlOff) || (EP_GET_FIRST(GET_ACTIVE_PEER(GET(GET(ROOT_instMain, cci), csm), cciCruiseSpeedPort)) == SIGNAL_controlOn)",
							},
						},
					},
				},
				"transitionByName": {
					"Initial2Off_3": {
						"source": "Initial",
						"target": "Off",
					},
/*
					"Off2Fail_123": {
						"source": "Off",
						"target": "Fail",
						"guard": "__builtin__.debug(TRUE)",
					},
/**/
					"Off2Fail_4": {
						"source": "Off",
						"target": "Fail",
						//"guard": "!(__builtin__.debug(__builtin__.debug(EP_GET_FIRST(GET_ACTIVE_PEER(GET(GET(ROOT_instMain, cci), actuation), cciControlOnOffPort)), 'left:') == __builtin__.debug(SIGNAL_controlOn, 'right:')), '==') && (EP_GET_FIRST(GET_ACTIVE_PEER(GET(GET(ROOT_instMain, cci), csm), cciCruiseSpeedPort)) == SIGNAL_updateSetPoint)",
						"guard": "!(EP_GET_FIRST(GET_ACTIVE_PEER(GET(GET(ROOT_instMain, cci), actuation), cciControlOnOffPort)) == SIGNAL_controlOn) && (EP_GET_FIRST(GET_ACTIVE_PEER(GET(GET(ROOT_instMain, cci), csm), cciCruiseSpeedPort)) == SIGNAL_updateSetPoint)",
					},
					"On2Fail_5": {
						"source": "On",
						"target": "Fail",
						"guard": "(EP_GET_FIRST(GET_ACTIVE_PEER(GET(GET(ROOT_instMain, cci), actuation), cciControlOnOffPort)) == SIGNAL_controlOff) && (EP_GET_FIRST(GET_ACTIVE_PEER(GET(GET(ROOT_instMain, cci), csm), cciCruiseSpeedPort)) == SIGNAL_updateSetPoint)",
					},
					"Off2On_6": {
						"source": "Off",
						"target": "On",
						"guard": "EP_GET_FIRST(GET_ACTIVE_PEER(GET(GET(ROOT_instMain, cci), actuation), cciControlOnOffPort)) == SIGNAL_controlOn",
					},
					"On2Off_7": {
						"source": "On",
						"target": "Off",
						"guard": "(EP_GET_FIRST(GET_ACTIVE_PEER(GET(GET(ROOT_instMain, cci), actuation), cciControlOnOffPort)) == SIGNAL_controlOff) && !(EP_GET_FIRST(GET_ACTIVE_PEER(GET(GET(ROOT_instMain, cci), csm), cciCruiseSpeedPort)) == SIGNAL_updateSetPoint)",
					},
				},
			},
		],
	}
);
