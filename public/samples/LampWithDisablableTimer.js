globalThis.examples = globalThis.examples || [];
examples.push(
	{
		name: "LampWithDisablableTimer",
		objects: [
			{
				name: 'lamp',
				"class": "Lamp",
				stateByName: {
					init: {
						type: 'Pseudostate',
						kind: 'initial',
					},
					choice: {
						type: 'Pseudostate',
						kind: 'choice',
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
						target: 'choice',
						trigger: 'after(10min)',
					},
					T2: {
						source: 'choice',
						target: 'Off',
						guard: 'timerDisabled',
						effect: 'turnOff()',
					},
					T3: {
						source: 'choice',
						target: 'On',
						guard: 'else',
					},
				},
				operationByName: {
					onButton: {},
				},
			},
		],
	}
);
