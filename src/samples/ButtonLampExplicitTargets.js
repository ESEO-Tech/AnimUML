globalThis.examples = globalThis.examples || [];
examples.push(
	{
		name: 'ButtonLampExplicitTargets',
		objects: [
			{
				name: 'button',
				class: 'Button',
				isActor: true,
				stateByName: {
					init: {
						type: 'Pseudostate',
						kind: 'initial',
					},
				},
				transitionByName: {
					tInitialOFF: {
						source: 'init',
						target: 'Waiting',
					},
					T1: {
						source: 'Waiting',
						target: 'Waiting',
						guard: 'EP_IS_EMPTY(lamp)',
						effect: 'lamp.onButton();',
					},
					T2: {
						source: 'Waiting',
						target: 'Waiting',
						guard: 'EP_IS_EMPTY(lamp)',
						effect: 'lamp.offButton();',
					},
				},
			},
			{
				name: 'lamp',
				class: 'Lamp',
				stateByName: {
					init: {
						type: 'Pseudostate',
						kind: 'initial',
					},
				},
				transitionByName: {
					tInitialOFF: {
						source: 'init',
						target: 'Off',
					},
					tONOFF: {
						source: 'On',
						target: 'Off',
						trigger: 'offButton',
						effect: 'console.log("turnOff");',
					},
					tOFFON: {
						source: 'Off',
						target: 'On',
						trigger: 'onButton',
						effect: 'console.log("turnOn");',
					},
					T1: {
						source: 'On',
						target: 'Off',
						trigger: 'after(10min)',
						effect: 'console.log("turnOff");',
					},
				},
			},
		],
		connectorByName: {
			C1: {
				ends: ["button", "lamp"],
				possibleMessages: {
					forward: ["onButton", "offButton"],
				},
			},
		},
		watchExpressions: {
			lampOn:		"IS_IN_STATE(lamp, lamp.On)"
		},
		LTLProperties: {
			lampTurnsOn:		"[] (|EP_CONTAINS(lamp, onButton)| -> (<>lampOn))",
		},
	}
);

