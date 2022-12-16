globalThis.examples = globalThis.examples || [];
examples.push(
	{
		name: 'ButtonLampBulb',
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
	}
);
