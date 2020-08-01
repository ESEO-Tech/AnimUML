var examples = examples || [];
examples.push(
	{
		name: 'ButtonLampBulbWithMethods',
		objects: [
			{
				name : 'Button',
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
				name: 'Lamp',
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
			{
				name: 'Bulb',
				operationByName: {
					turnOn: {
						method: 'console.log("Bulb is on!")'
					},
					turnOff: {
						method: 'console.log("Bulb is off!")'
					},
				},
			},
		],
		connectorByName: {
			C1: {
				ends: ["Button", "Lamp"],
				possibleMessages: {
					forward: ["onButton", "offButton"],
				},
			},
			C2: {
				ends: ["Lamp", "Bulb"],
				possibleMessages: {
					forward: ["turnOn", "turnOff"],
				},
			},
		},
	}
);
