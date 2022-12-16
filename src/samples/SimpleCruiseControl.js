const SpeedSensorMode = {
	"Variable": "Variable",		// use a variable that will be incremented and decremented
	"Range": "Range",		// use an abstract value (as a range) instead of a concrete one
	"Transitions": "Transitions",	// use one transition per value
};
const {enabledEventPools, speedSensorMode} = globalThis.MODEL_ARGS ?? {
	enabledEventPools: true,
	speedSensorMode: SpeedSensorMode.Variable,
};

globalThis.examples = globalThis.examples || [];
examples.push(
	{
		name: "SimpleCruiseControl",
		objects: [
			{
				name: "speedSensor",
				isActor: true,
				behavior: `
					[*] --> Waiting

					${{
						[SpeedSensorMode.Variable]: `
							Waiting : [this.speed > 0] / this.speed--
							Waiting : [this.speed < 200] / this.speed++
							Waiting : / controller.setSpeed(this.speed)
						`,
						[SpeedSensorMode.Range]: `Waiting : / controller.setSpeed(SymbolicInt(0, 200))`,
						[SpeedSensorMode.Transitions]: `
							${[...Array(201).keys()].map(i => `
								Waiting : / controller.setSpeed(${i})
							`).join("")}
						`,
					}[speedSensorMode]}

					'Waiting : / controller.setSpeed(SymbolicInt(29, 31))
					'Waiting : / controller.setSpeed(29)
					'Waiting : / controller.setSpeed(30)
					'Waiting : / controller.setSpeed(31)
				`,
				features: `
					${speedSensorMode === SpeedSensorMode.Variable ?
						`speed : Integer`
					:""}
				`,
			},
			{
				name: "user",
				isActor: true,
				behavior: `
					[*] --> Waiting
					'Waiting : [IS_IN_STATE(controller, controller.Disengaged)]/ controller.onButton()
					'Waiting : [IS_IN_STATE(controller, controller.Engaged)]/ controller.offButton()
					Waiting : ${enabledEventPools
					?	"[!EP_CONTAINS(controller, onButton)]"	// only necessary with event pools, has a small impact on state space size with ether
					:	""} / controller.onButton()
					Waiting : ${enabledEventPools
					?	"[!EP_CONTAINS(controller, offButton)]"
					:	""} / controller.offButton()
				`,
			},
			{
				name: 'controller',
				behavior: `
					state choice <<choice>>

					[*] --> Disengaged
					${enabledEventPools ? "Disengaged : offButton" : ""}
					Disengaged : setSpeed(speed) / this.speed = params.speed
					' TODO: add a choice to consume onButton even if speed is not correct
					Disengaged --> Engaged : onButton[this.speed >= 30 && this.speed <= 150]

					${enabledEventPools ? "Engaged : onButton" : ""}
					Engaged --> Disengaged : offButton
					Engaged --> choice : setSpeed(speed) / this.speed = params.speed
					choice --> Engaged : [this.speed >= 30 && this.speed <= 150]
					choice --> Disengaged : [else]
				`,
/*
				operationByName: {
					onButton: {
					},
					offButton: {
					},
					setSpeed: {
						parameters: [{"name": "speed", "type": "Integer",}],
					},
				},
*/
				features: `
					onButton()
					offButton()
					setSpeed(speed : Integer)
					speed : Integer
				`,
			},
		],
		connectorByName: {
			speedSensor2controller: {
				ends: ["speedSensor", "controller"],
			},
			user2controller: {
				ends: ["user", "controller"],
			},
		},
		watchExpressions: {
			hasOn: "EP_CONTAINS(controller, onButton)",
			speedSensorSpeed: "__ROOT__speedSensor.speed",
			controllerSpeed: "__ROOT__controller.speed",
			speedSensorSpeedOk: "__ROOT__speedSensor.speed >= 30 && __ROOT__speedSensor.speed <= 150",
			controllerSpeedOk: "__ROOT__controller.speed >= 30 && __ROOT__controller.speed <= 150",
			testConfig: "__builtin__.config",
			testJSONConfig: "__builtin__.jsonConfig",
			testJSONConfig2: "__builtin__.jsonConfig === __builtin__.JSON.stringify(__builtin__.config)",
			testHash: "__builtin__.digest('SHA-256', __builtin__.jsonConfig, 1).then(n => n.toString())",
		},
		settings: {
			semantics: {
				fireInitialTransitions: true,
				autoFireAfterChoice: true,
				checkEvents: true,
				keepOneMessagePerTrigger: true,
				enableEventPools: enabledEventPools,
				matchFirst: true,
				reactiveSystem: true,
			},
		},
	}
);

