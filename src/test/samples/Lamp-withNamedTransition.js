globalThis.examples = globalThis.examples || [];
examples.push(
	{
		name: "Lamp",
		objects: [
			{
				name: 'lamp',
				"class": "Lamp",
				behavior: `
					[*] --> Off as tInitialOFF
					On --> Off as tONOFF : offButton / turnOff()
					Off --> On as tOFFON : onButton / turnOn()
					On --> Off as T1 : after(10min) / turnOff()
				`,
				features: `
					onButton()
				`
			},
		],
	}
);
