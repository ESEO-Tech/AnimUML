globalThis.examples = globalThis.examples || [];
examples.push(
	{
		name: 'ButtonLamp',
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
						effect: 'onButton()',
					},
					T2: {
						source: 'Waiting',
						target: 'Waiting',
						effect: 'offButton()',
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
						effect: 'turnOff()',
					},
					tOFFON: {
						source: 'Off',
						target: 'On',
						trigger: 'onButton',
						effect: 'turnOn()',
					},
					T1: {
						source: 'On',
						target: 'Off',
						trigger: 'after(10min)',
						effect: 'turnOff()',
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
		interactions: {
			turnOnOff: `
				actor button
				participant lamp
				ref over button, lamp : turnOn
				ref over button, lamp : turnOff
			`,
			turnOn: `
				actor button
				participant lamp
				onb1 : button -? lamp : onButton()
				accept onb1
			`,
			turnOff: `
				actor button
				participant lamp
				offb1 : button -? lamp : offButton()
				accept offb1
			`,
		},
		watchExpressions: {
			lampOn:		"IS_IN_STATE(lamp, lamp.On)"
		},
		LTLProperties: {
			lampTurnsOn:		"[] (|EP_CONTAINS(lamp, onButton)| -> (<>lampOn))",
		},
	}
);
