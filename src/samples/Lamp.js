globalThis.examples = globalThis.examples || [];
examples.push(
	{
		name: "Lamp",
		objects: [
			{
				name: 'lamp',
				"class": "Lamp",
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
				},
			},
		],
	}
);
