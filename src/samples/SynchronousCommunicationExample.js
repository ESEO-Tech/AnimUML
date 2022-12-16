globalThis.examples = globalThis.examples || [];
examples.push({
	name: "SynchronousCommunicationExample",
	objects: [
		{
			name: "caller",
			behavior: `
				[*] --> A
				A --> B
				B --> C : /console.log("Caller received:", await callee.synchronousOperation("callerString"))
				B --> A : after(1s)
				note on link
					In fUML/PSSM, this transition would
					never be fireable because the state
					machine would have committed to the
					synchronous call by firing the B to
					C transition.
				end note
			`,
		},
		{
			name: "callee",
			behavior: String.raw`
				[*] --> A
				A --> B
				B --> C : synchronousOperation(a)[false]/{
					console.error("transition with false guard fired with argument:", a);
					return "ERROR";
				}
				B --> C : synchronousOperation(a)/{
					console.log("Callee called with:", a);
					return "calleeString";
				}
			`,
			operationByName: {
				synchronousOperation: {
					parameters: ["a"],
					isOperation: true,	// fUML operations are necessarily called synchonously, isOperation=false would mean that it is in fact a reception
								// operations with methods are also called synchronously, but they cannot be "intercepted" by the classifier behavior
								// so isSynchronous(op) = op.isOperation||op.method
				},
			},
		},
	],
	connectorByName: {
		C1: {
			ends: ["caller", "callee"],
			//endNames: ["caller", "callee"],
		},
	},
	watchExpressions: {
		callerC: "IS_IN_STATE(caller, caller.C)",
		calleeB: "IS_IN_STATE(callee, callee.B)",
		calleeC: "IS_IN_STATE(callee, callee.C)",
		callerCAndCalleeB: "callerC && calleeB",
		callerCAndCalleeC: "callerC && calleeC",
	},
	settings: {
		semantics: {
			fireInitialTransitions: true,
			synchronousCommunication: true,
		},
	},
});
