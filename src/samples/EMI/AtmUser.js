globalThis.examples = globalThis.examples || [];
examples.push(
	{
		"name": "UML2AnimUML_AtmUser",
		"objects": [
			{
				"name": "bank",
				"class": "Bank",
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
						"effect": "SET(this, numIncorrect, 0); SET(this, maxNumIncorrect, 2); SET(this, cardValid, 1);",
					},
					"Idle2VerifyingCard_1": {
						"source": "Idle",
						"target": "VerifyingCard",
						"trigger": "verifyPIN",
						"effect": "SET(this, enteredPIN, params.enteredPIN); SET(this, cardPIN, params.cardPIN);",
					},
					"VerifyingCard2Idle_2": {
						"source": "VerifyingCard",
						"target": "Idle",
						"guard": "!GET(this, cardValid)",
						"effect": "SEND(GET(this, atm), abort);",
					},
					"VerifyingCard2CardValid_3": {
						"source": "VerifyingCard",
						"target": "CardValid",
						"guard": "GET(this, cardValid)",
					},
					"CardValid2VerifyPIN_4": {
						"source": "CardValid",
						"target": "VerifyPIN",
					},
					"VerifyPIN2PINCorrect_5": {
						"source": "VerifyPIN",
						"target": "PINCorrect",
						"guard": "GET(this, enteredPIN) == GET(this, cardPIN)",
						"effect": "SET(this, numIncorrect, 0);",
					},
					"VerifyPIN2PINIncorrect_6": {
						"source": "VerifyPIN",
						"target": "PINIncorrect",
						"guard": "GET(this, enteredPIN) != GET(this, cardPIN)",
					},
					"PINCorrect2Idle_7": {
						"source": "PINCorrect",
						"target": "Idle",
						"effect": "SEND(GET(this, atm), PINVerified);",
					},
					"PINIncorrect2Idle_8": {
						"source": "PINIncorrect",
						"target": "Idle",
						"guard": "GET(this, numIncorrect) < GET(this, maxNumIncorrect)",
						"effect": "INC(this, numIncorrect, 1); SEND(GET(this, atm), reenterPIN);",
					},
					"PINIncorrect2Idle_9": {
						"source": "PINIncorrect",
						"target": "Idle",
						"guard": "GET(this, numIncorrect) >= GET(this, maxNumIncorrect)",
						"effect": "SET(this, cardValid, 0); SEND(GET(this, atm), abort);",
					},
				},
				"operationByName": {
					"verifyPIN": {
						"parameters": [{"name": "enteredPIN", "type": "Integer",}, {"name": "cardPIN", "type": "Integer",}],
					},
				},
				"propertyByName": {
					"enteredPIN": {
						"private": true,
						"type": "Integer",
					},
					"cardPIN": {
						"private": true,
						"type": "Integer",
					},
					"cardValid": {
						"private": true,
						"type": "Boolean",
					},
					"numIncorrect": {
						"private": true,
						"type": "Integer",
					},
					"maxNumIncorrect": {
						"private": true,
						"type": "Integer",
					},
				},
			},
			{
				"name": "atm",
				"class": "ATM",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
				},
				"transitionByName": {
					"Initial2Idle_10": {
						"source": "Initial",
						"target": "Idle",
					},
					"Idle2CardEntry_11": {
						"source": "Idle",
						"target": "CardEntry",
						"trigger": "enterCard",
						"effect": "SET(this, cardPIN, params.cardPIN);",
					},
					"CardEntry2PINEntry_12": {
						"source": "CardEntry",
						"target": "PINEntry",
						"effect": "SEND(GET(this, user), tryPIN);",
					},
					"PINEntry2Verification_13": {
						"source": "PINEntry",
						"target": "Verification",
						"trigger": "enterPIN",
						"effect": "int localEnteredPIN = params.enteredPIN; SEND(GET(this, bank), verifyPIN, localEnteredPIN, GET(this, cardPIN)); SEND(GET(this, user), wait);",
					},
					"Verification2PINEntry_14": {
						"source": "Verification",
						"target": "PINEntry",
						"trigger": "reenterPIN",
						"effect": "SEND(GET(this, user), tryPIN);",
					},
					"Verification2ReturningCard_15": {
						"source": "Verification",
						"target": "ReturningCard",
						"trigger": "abort",
					},
					"Verification2AmountEntry_16": {
						"source": "Verification",
						"target": "AmountEntry",
						"trigger": "PINVerified",
					},
					"AmountEntry2GivingMoney_17": {
						"source": "AmountEntry",
						"target": "GivingMoney",
					},
					"GivingMoney2ReturningCard_18": {
						"source": "GivingMoney",
						"target": "ReturningCard",
					},
					"ReturningCard2Idle_19": {
						"source": "ReturningCard",
						"target": "Idle",
						"effect": "SEND(GET(this, user), finish);",
					},
				},
				"operationByName": {
					"reenterPIN": {
					},
					"abort": {
					},
					"PINVerified": {
					},
					"enterPIN": {
						"parameters": [{"name": "enteredPIN", "type": "Integer",}],
					},
					"enterCard": {
						"parameters": [{"name": "cardPIN", "type": "Integer",}],
					},
				},
				"propertyByName": {
					"cardPIN": {
						"private": true,
						"type": "Integer",
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
							"Idle2Idle_20": {
								"guard": "GET(this, triedPIN) < 99",
								"effect": "INC(this, triedPIN, 1);",
							},
							"Idle2Idle_21": {
								"guard": "GET(this, triedPIN) > 0",
								"effect": "DEC(this, triedPIN, 1);",
							},
						},
					},
				},
				"transitionByName": {
					"Initial2Idle_22": {
						"source": "Initial",
						"target": "Idle",
					},
					"Idle2EnteringCard_23": {
						"source": "Idle",
						"target": "EnteringCard",
						"effect": "SEND(GET(this, atm), enterCard, GET(this, cardPIN));",
					},
					"EnteringCard2EnterPIN_24": {
						"source": "EnteringCard",
						"target": "EnterPIN",
						"trigger": "tryPIN",
						"effect": "SEND(GET(this, atm), enterPIN, GET(this, triedPIN));",
					},
					"Wait2EnterPIN_25": {
						"source": "Wait",
						"target": "EnterPIN",
						"trigger": "tryPIN",
						"effect": "SEND(GET(this, atm), enterPIN, GET(this, triedPIN));",
					},
					"EnterPIN2Wait_26": {
						"source": "EnterPIN",
						"target": "Wait",
						"trigger": "wait",
					},
					"Wait2Idle_27": {
						"source": "Wait",
						"target": "Idle",
						"trigger": "finish",
					},
				},
				"operationByName": {
					"tryPIN": {
					},
					"finish": {
					},
					"wait": {
					},
				},
				"propertyByName": {
					"cardPIN": {
						"private": true,
						"type": "Integer",
						"defaultValue": 53,
					},
					"triedPIN": {
						"private": true,
						"type": "Integer",
						"defaultValue": 0,
					},
				},
			},
		],
		"connectorByName": {
			"connector_bank_atm": {
				"ends": ["bank", "atm"],
				"endNames": ["bank", "atm"],
			},
			"connector_user_atm": {
				"ends": ["atm", "user"],
				"endNames": ["atm", "user"],
			},
		},
	}
);
