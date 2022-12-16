globalThis.examples = globalThis.examples || [];
examples.push(
	{
		name: 'ButtonLampBulbExplicitTargets',
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
						effect: 'lamp.onButton()',
					},
					T2: {
						source: 'Waiting',
						target: 'Waiting',
						effect: 'lamp.offButton()',
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
						effect: 'bulb.turnOff()',
					},
					tOFFON: {
						source: 'Off',
						target: 'On',
						trigger: 'onButton',
						effect: 'bulb.turnOn()',
					},
					T1: {
						source: 'On',
						target: 'Off',
						trigger: 'after(10min)',
						effect: 'bulb.turnOff()',
					},
				},
				operationByName: {
					onButton: {},
					offButton: {},
				},
			},
			{
				name: 'bulb',
				class: 'Bulb',
				operationByName: {
					turnOn: {
					},
					turnOff: {
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
			C2: {
				ends: ["lamp", "bulb"],
				possibleMessages: {
					forward: ["turnOn", "turnOff"],
				},
			},
		},
		interactions: {
			turnOnOff: `
				actor button
				participant lamp
				participant bulb
				'button -> lamp : onButton()
				onb1 : button -? lamp : onButton()
				accept onb1
				ton1 : lamp -? bulb : turnOn()
				accept ton1
				offb1 : button -? lamp : offButton()
				accept offb1
				toff1 : lamp -? bulb : turnOff()
				accept toff1
			`,
		},
	}
);
