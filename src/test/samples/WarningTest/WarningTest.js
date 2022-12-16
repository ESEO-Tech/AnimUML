globalThis.examples = globalThis.examples || [];
examples.push(
	{
		name: "WarningTest",
		classes: `
			class A {
				onButton()
				p1 : Integer
			}

			enum E {
			}
			A -- E									' warning: Association A2E between A and E should not exist. Declare an attribute instead.
		`,
		objects: [
			{
				name: "b",
				class: "B",							// warning: Class B of object b not found.
			},
			{
				name: "c",
				//class: "C",							// warning: No class is specified for object c.
			},
			{
				name: "b",							// error: Found 2 objects with the same name: "b".
				class: "A",
			},
			{
				name: "a",
				class: "A",
				behavior: `
					state c <<choice>>

					[*] --> Off as tInitialOFF
					On --> Off as T1 : after(10min) / turnOff()

					On --> c as UNPARSABLE : unparsable label
												' warning: Could not parse label "unparsable label" of transition a.UNPARSABLE from a.On to a.On in a's state machine.

					c --> On as NOGUARD					' warning: No guard after choice on transition a.NOGUARD from a.c to a.On in a's state machine.

					Off --> On as tOFFON : onButton(a) / turnOn()
												' warning: Operation onButton on a has 0 parameters, but trigger onButton(a) has 1 argument(s).
					Off --> On as UNDECLARED_OP : undeclaredOp()
												' warning: Could not find operation undeclaredOp on a that appears as trigger in its state machine.
					On --> Off as tONOFF : offButton / turnOff()
												' warning: Operation offButton on a is private but appears as trigger in its state machine.
					On --> Off as INVALID_ARG : test(a:b) / turnOff()
												' warning: Argument "a:b" of trigger test(a:b) on a is not a valid identifier.
				`,
				features: `
					onButton()
					-offButton()
					test(a)
					p1 : Integer
					p2 : Integer
				`
			},
		],
		connectorByName: {
			C1: {
				ends: ["b", "a"],
				possibleMessages: {
					forward: [
						"onButton",
						"offButton",					// warning: Operation offButton on a is private but appears in message offButton sent on connector C1 from b.
						"nonExistingOp(test)",				// warning: Could not find operation nonExistingOp on a corresponding to message nonExistingOp(test) sent on connector C1 from b.
						"",						// warning: Could not parse message "" on connector C1 from b to a.
					],
				},
			},
		},
		interactions: {
			test: String.raw`
				b -> a : offButton
												' warning: Operation offButton on a is private but appears as a non-self message from b in interaction "test".
				b -> a : undeclaredOp
												' warning: Could not find operation undeclaredOp on a that appears as message in interaction "test".
				b -> z : test
												' warning: Could not find object {event.to} that first appears as message target in interaction "{interName}".
				y -> z : test
												' warning: Could not find object {event.from} that first appears as message source in interaction "{interName}".
			`,
		},
	}
);

