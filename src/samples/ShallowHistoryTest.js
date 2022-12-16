globalThis.examples = globalThis.examples || [];
globalThis.examples.push({
	name: "ShallowHistoryTest",
	behavior: `
		[*] --> A : /log("init2A")
		A : entry/log("enterA")
		A : exit/log("exitA")
		A --> B : /log("A2B")
		A --> B[H] : /log("A2BH")
		'A --> B.H : /log("A2BH")
		state B {
			[*] --> C : /log("init2C")
			C : entry/log("enterC")
			C : exit/log("exitC")
			C --> D : /log("C2D")
			D : entry/log("enterD")
			D : exit/log("exitD")
			D --> C : /log("D2C")
			C --> [*] : /log("C2end")
		}
		B : entry/log("enterB")
		B : exit/log("exitB")
		B --> A : /log("B2A")
	`,
	operationByName: {
		// TODO: make the engine automatically call passive operations
		log: {
			method: `
				console.log(arguments);
			`,
		},
	},
});
