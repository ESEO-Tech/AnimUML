globalThis.examples = globalThis.examples || [];
examples.push(
	{
		"name": "UML2AnimUML_ChallengeMain",
		"objects": [
			{
				"name": "system_System_controller",
				"class": "Controller",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
					"IdleJunction": {
						"type": "Pseudostate",
						"kind": "junction",
					},
				},
				"transitionByName": {
					"Initial2WaitConnection_0": {
						"source": "Initial",
						"target": "WaitConnection",
					},
					"WaitConnection2IdleJunction_1": {
						"source": "WaitConnection",
						"target": "IdleJunction",
						"trigger": "connected",
					},
					"IdleJunction2GoToBall_2": {
						"source": "IdleJunction",
						"target": "GoToBall",
						"effect": "SEND(GET(this, trajectoryManager), goPos, TRUE, 0, 0);",
					},
					"GoToBall2GoToGoal_3": {
						"source": "GoToBall",
						"target": "GoToGoal",
						"trigger": "finish",
						"effect": "SEND(GET(this, trajectoryManager), goPos, FALSE, -20, 0);",
					},
					"GoToGoal2Turn_4": {
						"source": "GoToGoal",
						"target": "Turn",
						"trigger": "finish",
						"effect": "SEND(GET(this, trajectoryManager), goAngle, FALSE, -50, 0);",
					},
					"Turn2Shoot_5": {
						"source": "Turn",
						"target": "Shoot",
						"trigger": "finish",
						"effect": "SEND(GET(this, player), setSuction, 100);",
					},
					"Shoot2IdleJunction_6": {
						"source": "Shoot",
						"target": "IdleJunction",
						"effect": "usleep(500000);",
					},
					"GoToBall2ListenReferee_7": {
						"source": "GoToBall",
						"target": "ListenReferee",
						"trigger": "error",
					},
					"GoToGoal2ListenReferee_8": {
						"source": "GoToGoal",
						"target": "ListenReferee",
						"trigger": "error",
					},
					"Turn2ListenReferee_9": {
						"source": "Turn",
						"target": "ListenReferee",
						"trigger": "error",
					},
					"ListenReferee2End_10": {
						"source": "ListenReferee",
						"target": "End",
						"trigger": "done",
					},
					"ListenReferee2IdleJunction_11": {
						"source": "ListenReferee",
						"target": "IdleJunction",
						"trigger": "opponentScored",
					},
					"ListenReferee2IdleJunction_12": {
						"source": "ListenReferee",
						"target": "IdleJunction",
						"trigger": "timeout",
					},
				},
				"operationByName": {
					"connected": {
					},
					"finish": {
					},
					"error": {
					},
					"done": {
					},
					"opponentScored": {
					},
					"timeout": {
					},
				},
			},
			{
				"name": "system_System_trajectoryManager",
				"class": "TrajectoryManager",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
					"SendSignalsJunction": {
						"type": "Pseudostate",
						"kind": "junction",
					},
					"WaitSignalsChoice": {
						"type": "Pseudostate",
						"kind": "choice",
					},
					"ComputeTraj": {
						"type": "Pseudostate",
						"kind": "choice",
					},
					"TrajGoPos": {
						"type": "Pseudostate",
						"kind": "choice",
					},
					"TrajGoAngle": {
						"type": "Pseudostate",
						"kind": "choice",
					},
					"Idle": {
						"entry": "SET(this, needTurn, FALSE);\nSET(this, ballInRobot, FALSE);\nSET(this, xArrived, 0);\nSET(this, zArrived, 0);\nSET(this, aArrived, 0);",
					},
					"WaitConnection": {
						"internalTransitions": {
							"WaitConnection2WaitConnection_13": {
								"trigger": "playerConnected",
								"effect": "SET(this, playerConnected, TRUE);",
							},
							"WaitConnection2WaitConnection_14": {
								"trigger": "refereeConnected",
								"effect": "SET(this, refereeConnected, TRUE);",
							},
						},
					},
				},
				"transitionByName": {
					"Initial2WaitConnection_15": {
						"source": "Initial",
						"target": "WaitConnection",
					},
					"WaitConnection2Idle_16": {
						"source": "WaitConnection",
						"target": "Idle",
						"guard": "GET(this, refereeConnected) && GET(this, playerConnected)",
						"effect": "SEND(GET(this, controller), connected);",
					},
					"Idle2SendSignalsJunction_17": {
						"source": "Idle",
						"target": "SendSignalsJunction",
						"trigger": "goPos",
						"effect": "SET(this, trajectory, 0);\nSET(this, ballTarget, params.ball);\nSET(this, xTarget, params.x);\nSET(this, zTarget, params.z);",
					},
					"Idle2SendSignalsJunction_18": {
						"source": "Idle",
						"target": "SendSignalsJunction",
						"trigger": "goAngle",
						"effect": "SET(this, trajectory, 1);\nSET(this, ballTarget, params.ball);\nSET(this, xTarget, params.x);\nSET(this, zTarget, params.z);",
					},
					"SendSignalsJunction2WaitSignals_19": {
						"source": "SendSignalsJunction",
						"target": "WaitSignals",
						"effect": "SEND(GET(this, player), getPlayerGPS);\nSEND(GET(this, player), getBallGPS);\nSEND(GET(this, player), getCompass);\nSEND(GET(this, referee), checkReferee);\nSET(this, receivedPlayer, 0);\nSET(this, receivedBall, 0);\nSET(this, receivedCompass, 0);\nSET(this, ack, FALSE);",
					},
					"WaitSignals2WaitSignalsChoice_20": {
						"source": "WaitSignals",
						"target": "WaitSignalsChoice",
						"trigger": "rspPlayerGPS",
						"effect": "SET(this, xPlayer, params.x);\nSET(this, zPlayer, params.z);\nSET(this, receivedPlayer, 1);",
					},
					"WaitSignals2WaitSignalsChoice_21": {
						"source": "WaitSignals",
						"target": "WaitSignalsChoice",
						"trigger": "rspBallGPS",
						"effect": "SET(this, xBall, params.x);\nSET(this, zBall, params.z);\nSET(this, receivedBall, 1);",
					},
					"WaitSignals2WaitSignalsChoice_22": {
						"source": "WaitSignals",
						"target": "WaitSignalsChoice",
						"trigger": "rspCompass",
						"effect": "SET(this, aPlayer, params.direction);\nSET(this, receivedCompass, 1);",
					},
					"WaitSignals2WaitSignalsChoice_23": {
						"source": "WaitSignals",
						"target": "WaitSignalsChoice",
						"trigger": "possession",
						"effect": "SET(this, ballInRobot, TRUE);",
					},
					"WaitSignals2WaitSignalsChoice_24": {
						"source": "WaitSignals",
						"target": "WaitSignalsChoice",
						"trigger": "abort",
						"effect": "SET(this, error, TRUE);",
					},
					"WaitSignals2WaitSignalsChoice_25": {
						"source": "WaitSignals",
						"target": "WaitSignalsChoice",
						"trigger": "refereeAck",
						"effect": "SET(this, ack, TRUE);",
					},
					"WaitSignalsChoice2Idle_26": {
						"source": "WaitSignalsChoice",
						"target": "Idle",
						"guard": "GET(this, ack) && GET(this, error) && GET(this, receivedBall) && GET(this, receivedPlayer) && GET(this, receivedCompass)",
						"effect": "SEND(GET(this, controller), error);\nSET(this, error, FALSE);",
					},
					"WaitSignalsChoice2ComputeTraj_27": {
						"source": "WaitSignalsChoice",
						"target": "ComputeTraj",
						"guard": "GET(this, ack) && !GET(this, error) && GET(this, receivedBall) && GET(this, receivedPlayer) && GET(this, receivedCompass)",
					},
					"WaitSignalsChoice2WaitSignals_28": {
						"source": "WaitSignalsChoice",
						"target": "WaitSignals",
						"guard": "else",
					},
					"ComputeTraj2TrajGoPos_29": {
						"source": "ComputeTraj",
						"target": "TrajGoPos",
						"guard": "GET(this, trajectory) == 0 && GET(this, needTurn) == 0",
						"effect": "SET(this, xArrived, 0);\nSET(this, zArrived, 0);\nint32_t xDest = 0, zDest = 0;\nif(GET(this, ballTarget)) {\nxDest = GET(this, xBall);\nzDest = GET(this, zBall);\n} else {\nxDest = GET(this, xTarget);\nzDest = GET(this, zTarget);\n}\nint32_t xDiff = xDest - GET(this, xPlayer);\nint32_t zDiff = zDest - GET(this, zPlayer);\ndouble aPlayerRad = (M_PI * GET(this, aPlayer)) / 180.0;\nint32_t xRobot = xDiff * cos(aPlayerRad) - zDiff * sin(aPlayerRad);\nint32_t zRobot = - xDiff * sin(aPlayerRad) - zDiff * cos(aPlayerRad);\nint32_t aRobot = - (atan2(zDiff, xDiff) * 180) / M_PI - GET(this, aPlayer);\nwhile(aRobot > 180)\naRobot -= 360;\nwhile(aRobot < -180)\naRobot += 360;\nif(GET(this, ballTarget) && (aRobot > 6 || aRobot < -6)) {\nSET(this, needTurn, TRUE);\n}\nif(abs(xDiff) + abs(zDiff) < 20) {\nSEND(GET(this, player), setSuction, -100);\n}\nint32_t dmf = GET(this, kp) * xRobot;\nint32_t dmr = GET(this, kp) * zRobot;\nif(dmf > 100) {\ndmf = 100;\n} else if(dmf < -100) {\ndmf = -100;\n}\nif(dmr > 100) {\ndmr = 100;\n} else if(dmr < -100) {\ndmr = -100;\n}\nif(GET(this, ballInRobot) && GET(this, ballTarget)) {\n// The ball has been taken\nSET(this, zArrived, 1);\nSET(this, xArrived, 1);\nSEND(GET(this, player), moveForward, 0);\nSEND(GET(this, player), moveRight, 0);\n} else {\nif(abs(xRobot) > 2) {\nSEND(GET(this, player), moveForward, dmf);\n} else {\nSEND(GET(this, player), moveForward, 0);\nSET(this, xArrived, 1);\n}\nif(abs(zRobot) > 2) {\nSEND(GET(this, player), moveRight, -dmr);\n} else {\nSEND(GET(this, player), moveRight, 0);\nSET(this, zArrived, 1);\n}\n}",
					},
					"TrajGoPos2Idle_30": {
						"source": "TrajGoPos",
						"target": "Idle",
						"guard": "GET(this, xArrived) && GET(this, zArrived)",
						"effect": "SEND(GET(this, controller), finish);",
					},
					"TrajGoPos2SendSignalsJunction_31": {
						"source": "TrajGoPos",
						"target": "SendSignalsJunction",
						"guard": "else",
					},
					"ComputeTraj2TrajGoAngle_32": {
						"source": "ComputeTraj",
						"target": "TrajGoAngle",
						"guard": "else",
						"effect": "SET(this, aArrived, 0);\nint32_t xDest = 0, zDest = 0;\nif(GET(this, ballTarget)) {\nxDest = GET(this, xBall);\nzDest = GET(this, zBall);\n} else {\nxDest = GET(this, xTarget);\nzDest = GET(this, zTarget);\n}\nint32_t xDiff = xDest - GET(this, xPlayer);\nint32_t zDiff = zDest - GET(this, zPlayer);\nint32_t aRobot = - (atan2(zDiff, xDiff) * 180) / M_PI - GET(this, aPlayer);\nwhile(aRobot > 180)\naRobot -= 360;\nwhile(aRobot < -180)\naRobot += 360;\nif(abs(aRobot) > 30) {\nSEND(GET(this, player), stop);\n}\nbool stopAfter = FALSE;\nif(abs(aRobot) < 30) {\nstopAfter = TRUE;\n}\nif(GET(this, ballInRobot) && GET(this, ballTarget)) {\n// The ball has been taken\nSET(this, aArrived, 1);\nSEND(GET(this, player), spin, 0, FALSE);\n} else {\nif(aRobot > 3 || aRobot < -3) {\nSEND(GET(this, player), spin, ((aRobot > 0) ? 85:-85), stopAfter);\n} else {\nSEND(GET(this, player), spin, 0, FALSE);\nSET(this, aArrived, 1);\n}\n}",
					},
					"TrajGoAngle2Idle_33": {
						"source": "TrajGoAngle",
						"target": "Idle",
						"guard": "GET(this, trajectory) == 1 && GET(this, aArrived)",
						"effect": "SEND(GET(this, controller), finish);",
					},
					"TrajGoAngle2SendSignalsJunction_34": {
						"source": "TrajGoAngle",
						"target": "SendSignalsJunction",
						"guard": "GET(this, trajectory) == 0 && GET(this, aArrived)",
						"effect": "SET(this, needTurn, FALSE);",
					},
					"TrajGoAngle2SendSignalsJunction_35": {
						"source": "TrajGoAngle",
						"target": "SendSignalsJunction",
						"guard": "else",
					},
				},
				"operationByName": {
					"goPos": {
						"parameters": [{"name": "ball", "type": "Boolean",}, {"name": "x", "type": "Integer",}, {"name": "z", "type": "Integer",}],
					},
					"goAngle": {
						"parameters": [{"name": "ball", "type": "Boolean",}, {"name": "x", "type": "Integer",}, {"name": "z", "type": "Integer",}],
					},
					"playerConnected": {
					},
					"rspPlayerGPS": {
						"parameters": [{"name": "x", "type": "Integer",}, {"name": "z", "type": "Integer",}],
					},
					"rspBallGPS": {
						"parameters": [{"name": "x", "type": "Integer",}, {"name": "z", "type": "Integer",}],
					},
					"rspCompass": {
						"parameters": [{"name": "direction", "type": "Integer",}],
					},
					"refereeConnected": {
					},
					"possession": {
					},
					"abort": {
					},
					"refereeAck": {
					},
				},
				"propertyByName": {
					"xPlayer": {
						"private": true,
						"type": "Integer",
					},
					"zPlayer": {
						"private": true,
						"type": "Integer",
					},
					"aPlayer": {
						"private": true,
						"type": "Integer",
					},
					"xBall": {
						"private": true,
						"type": "Integer",
					},
					"zBall": {
						"private": true,
						"type": "Integer",
					},
					"xArrived": {
						"private": true,
						"type": "Boolean",
					},
					"zArrived": {
						"private": true,
						"type": "Boolean",
					},
					"aArrived": {
						"private": true,
						"type": "Boolean",
					},
					"trajectory": {
						"private": true,
						"type": "Integer",
					},
					"xTarget": {
						"private": true,
						"type": "Integer",
					},
					"zTarget": {
						"private": true,
						"type": "Integer",
					},
					"ballTarget": {
						"private": true,
						"type": "Boolean",
					},
					"receivedBall": {
						"private": true,
						"type": "Boolean",
					},
					"receivedPlayer": {
						"private": true,
						"type": "Boolean",
					},
					"receivedCompass": {
						"private": true,
						"type": "Boolean",
					},
					"needTurn": {
						"private": true,
						"type": "Boolean",
					},
					"ballInRobot": {
						"private": true,
						"type": "Boolean",
					},
					"playerConnected": {
						"private": true,
						"type": "Boolean",
					},
					"refereeConnected": {
						"private": true,
						"type": "Boolean",
					},
					"error": {
						"private": true,
						"type": "Boolean",
					},
					"ack": {
						"private": true,
						"type": "Boolean",
					},
					"kp": {
						"private": true,
						"type": "Integer",
						"defaultValue": 20,
					},
				},
			},
			{
				"name": "system_System_controllerToPlayerPortSys",
				"class": "ControllerToPlayerPortSys",
				"type": "Port",
			},
			{
				"name": "system_System_controllerToRefereePortSys",
				"class": "ControllerToRefereePortSys",
				"type": "Port",
				"operationByName": {
					"done": {
					},
					"opponentScored": {
					},
					"timeout": {
					},
				},
			},
			{
				"name": "system_System_trajToPlayerPortSys",
				"class": "TrajToPlayerPortSys",
				"type": "Port",
				"operationByName": {
					"playerConnected": {
					},
					"rspPlayerGPS": {
						"parameters": [{"name": "x", "type": "Integer",}, {"name": "z", "type": "Integer",}],
					},
					"rspBallGPS": {
						"parameters": [{"name": "x", "type": "Integer",}, {"name": "z", "type": "Integer",}],
					},
					"rspCompass": {
						"parameters": [{"name": "direction", "type": "Integer",}],
					},
				},
			},
			{
				"name": "system_System_trajToRefereePortSys",
				"class": "TrajToRefereePortSys",
				"type": "Port",
				"operationByName": {
					"refereeConnected": {
					},
					"possession": {
					},
					"abort": {
					},
					"refereeAck": {
					},
				},
			},
			{
				"name": "environment_Environment_player",
				"class": "CommunicationPlayer",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
					"Connected": {
						"internalTransitions": {
							"MoveForward": {
								"trigger": "moveForward",
							},
							"MoveRight": {
								"trigger": "moveRight",
							},
							"Spin": {
								"trigger": "spin",
							},
							"Stop": {
								"trigger": "stop",
							},
							"SetSuction": {
								"trigger": "setSuction",
							},
							"GetSuction": {
								"trigger": "getSuction",
								"effect": "SEND(GET(this, trajectoryManager), rspSuction, 0);",
							},
							"GetPlayerGPSBallPos": {
								"trigger": "getPlayerGPS",
								"effect": "SEND(GET(this, trajectoryManager), rspPlayerGPS, -20, 0);",
							},
							"GetPlayerGPSRandomPos": {
								"trigger": "getPlayerGPS",
								"effect": "SEND(GET(this, trajectoryManager), rspPlayerGPS, 10, 20);",
							},
							"GetBallGPS": {
								"trigger": "getBallGPS",
								"effect": "SEND(GET(this, trajectoryManager), rspBallGPS, 0, 0);",
							},
							"GetCompassShootDir": {
								"trigger": "getCompass",
								"effect": "SEND(GET(this, trajectoryManager), rspCompass, 180);",
							},
							"GetCompasRandomDir": {
								"trigger": "getCompass",
								"effect": "SEND(GET(this, trajectoryManager), rspCompass, 90);",
							},
						},
					},
				},
				"transitionByName": {
					"Initial2Connected_36": {
						"source": "Initial",
						"target": "Connected",
						"effect": "SET(this, connected, TRUE); SEND(GET(this, trajectoryManager), playerConnected);",
					},
				},
				"operationByName": {
					"moveForward": {
						"parameters": [{"name": "speed", "type": "Integer",}],
					},
					"moveRight": {
						"parameters": [{"name": "speed", "type": "Integer",}],
					},
					"spin": {
						"parameters": [{"name": "speed", "type": "Integer",}, {"name": "stopAfter", "type": "Boolean",}],
					},
					"stop": {
					},
					"setSuction": {
						"parameters": [{"name": "power", "type": "Integer",}],
					},
					"getSuction": {
					},
					"getPlayerGPS": {
					},
					"getBallGPS": {
					},
					"getCompass": {
					},
				},
				"propertyByName": {
					"tcpPort": {
						"private": true,
						"type": "Integer",
						"defaultValue": 9003,
					},
					"connected": {
						"private": true,
						"type": "Integer",
					},
				},
			},
			{
				"name": "environment_Environment_referee",
				"class": "CommunicationReferee",
				"stateByName": {
					"Initial": {
						"type": "Pseudostate",
						"kind": "initial",
					},
					"AckJoin": {
						"type": "Pseudostate",
						"kind": "join",
					},
				},
				"transitionByName": {
					"Initial2Connected_37": {
						"source": "Initial",
						"target": "Connected",
						"effect": "SET(this, connected, TRUE); SEND(GET(this, trajectoryManager), refereeConnected);",
					},
					"Nothing": {
						"source": "Connected",
						"target": "AckJoin",
						"trigger": "checkReferee",
					},
					"SendPossesion": {
						"source": "Connected",
						"target": "AckJoin",
						"trigger": "checkReferee",
						"effect": "SEND(GET(this, trajectoryManager), possession);",
					},
					"SendDone": {
						"source": "Connected",
						"target": "AckJoin",
						"trigger": "checkReferee",
						"effect": "SEND(GET(this, trajectoryManager), abort); SEND(GET(this, controller), done);",
					},
					"SendTimeout": {
						"source": "Connected",
						"target": "AckJoin",
						"trigger": "checkReferee",
						"effect": "SEND(GET(this, trajectoryManager), abort); SEND(GET(this, controller), timeout);",
					},
					"SendOpponentScored": {
						"source": "Connected",
						"target": "AckJoin",
						"trigger": "checkReferee",
						"effect": "SEND(GET(this, trajectoryManager), abort); SEND(GET(this, controller), opponentScored);",
					},
					"SendAck": {
						"source": "AckJoin",
						"target": "Connected",
						"effect": "SEND(GET(this, trajectoryManager), refereeAck);",
					},
				},
				"operationByName": {
					"checkReferee": {
					},
				},
				"propertyByName": {
					"tcpPort": {
						"private": true,
						"type": "Integer",
						"defaultValue": 9007,
					},
					"connected": {
						"private": true,
						"type": "Integer",
					},
				},
			},
			{
				"name": "environment_Environment_controllerToPlayerPortEnv",
				"class": "ControllerToPlayerPortEnv",
				"type": "Port",
				"operationByName": {
					"moveForward": {
						"parameters": [{"name": "speed", "type": "Integer",}],
					},
					"moveRight": {
						"parameters": [{"name": "speed", "type": "Integer",}],
					},
					"spin": {
						"parameters": [{"name": "speed", "type": "Integer",}, {"name": "stopAfter", "type": "Boolean",}],
					},
					"stop": {
					},
					"setSuction": {
						"parameters": [{"name": "power", "type": "Integer",}],
					},
					"getSuction": {
					},
					"getPlayerGPS": {
					},
					"getBallGPS": {
					},
					"getCompass": {
					},
				},
			},
			{
				"name": "environment_Environment_controllerToRefereePortEnv",
				"class": "ControllerToRefereePortEnv",
				"type": "Port",
			},
			{
				"name": "environment_Environment_trajToPlayerPortEnv",
				"class": "TrajToPlayerPortEnv",
				"type": "Port",
				"operationByName": {
					"moveForward": {
						"parameters": [{"name": "speed", "type": "Integer",}],
					},
					"moveRight": {
						"parameters": [{"name": "speed", "type": "Integer",}],
					},
					"spin": {
						"parameters": [{"name": "speed", "type": "Integer",}, {"name": "stopAfter", "type": "Boolean",}],
					},
					"stop": {
					},
					"setSuction": {
						"parameters": [{"name": "power", "type": "Integer",}],
					},
					"getSuction": {
					},
					"getPlayerGPS": {
					},
					"getBallGPS": {
					},
					"getCompass": {
					},
				},
			},
			{
				"name": "environment_Environment_trajToRefereePortEnv",
				"class": "TrajToRefereePortEnv",
				"type": "Port",
				"operationByName": {
					"checkReferee": {
					},
				},
			},
		],
		"connectorByName": {
			"c1": {
				"ends": ["system_controllerToPlayerPortSys", "environment_controllerToPlayerPortEnv"],
				"endNames": ["controllerToPlayerPortSys", "controllerToPlayerPortEnv"],
			},
			"c2": {
				"ends": ["system_controllerToRefereePortSys", "environment_controllerToRefereePortEnv"],
				"endNames": ["controllerToRefereePortSys", "controllerToRefereePortEnv"],
			},
			"c3": {
				"ends": ["system_trajToPlayerPortSys", "environment_trajToPlayerPortEnv"],
				"endNames": ["trajToPlayerPortSys", "trajToPlayerPortEnv"],
			},
			"c4": {
				"ends": ["system_trajToRefereePortSys", "environment_trajToRefereePortEnv"],
				"endNames": ["trajToRefereePortSys", "trajToRefereePortEnv"],
			},
			"system_c1": {
				"ends": ["system_controller", "system_trajectoryManager"],
				"endNames": ["controller", "trajectoryManager"],
			},
			"system_c2": {
				"ends": ["system_controller", "system_controllerToPlayerPortSys"],
				"endNames": ["controller", "player"],
			},
			"system_c3": {
				"ends": ["system_controller", "system_controllerToRefereePortSys"],
				"endNames": ["controller", "referee"],
			},
			"system_c4": {
				"ends": ["system_trajectoryManager", "system_trajToPlayerPortSys"],
				"endNames": ["trajectoryManager", "player"],
			},
			"system_c5": {
				"ends": ["system_trajectoryManager", "system_trajToRefereePortSys"],
				"endNames": ["trajectoryManager", "referee"],
			},
			"environment_c1": {
				"ends": ["environment_player", "environment_controllerToPlayerPortEnv"],
				"endNames": ["player", "controller"],
			},
			"environment_c2": {
				"ends": ["environment_referee", "environment_controllerToRefereePortEnv"],
				"endNames": ["referee", "controller"],
			},
			"environment_c3": {
				"ends": ["environment_player", "environment_trajToPlayerPortEnv"],
				"endNames": ["player", "trajectoryManager"],
			},
			"environment_c4": {
				"ends": ["environment_referee", "environment_trajToRefereePortEnv"],
				"endNames": ["referee", "trajectoryManager"],
			},
		},
	}
);
