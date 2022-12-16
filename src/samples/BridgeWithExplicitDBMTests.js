// example inspired from corresponding UPPAAL example, but not really working in UML without synchronous communication
// UPPAAL figures notably available online at: https://msu.edu/~hajishey/uslicer.html
globalThis.examples = globalThis.examples || [];
{
const model =
	{
		"name": "BridgeWithExplicitDBM",
/*		// TODO: support classes
		classes: {
			Soldier: {
				"behavior": `
					[*] --> Unsafe
					Unsafe --> CrossingForward : [torch.L == 0] / torch.take()
					CrossingForward --> Safe : after(delay) / torch.release()
					Safe --> CrossingBackward : [torch.L == 1] / torch.take()
					CrossingBackward --> Unsafe : after(delay) / torch.release()
				`,
			}
		},
*/
		"objects": [
			{
				"name": 'viking1',
				"class": "Soldier",
				"behavior": `
					[*] --> Unsafe : /y = dbm.createClock();

					' testing invalid transitions
			'		Unsafe --> Unsafe : rgmlsdfmkl[/sdf
			'		Unsafe : [/

					' TODO: test if accessing torch.L works now (but comparing to 1, never to 0)...
					'NO: Unsafe --> CrossingForward : [torch.L == 0] / torch.take()
					'Unsafe --> CrossingForward : [torch.L != 1] / torch.take()
					Unsafe --> CrossingForward : [GET(torch, L) == 0] / torch.take(); a=dbm.resetClock(y);
					note on link
						y = 0
					end note
					CrossingForward --> Safe : after(delay) /a=dbm.clockGE(y, delay); torch.release()
					note on link
						y >= delay
					end note
					'Safe --> CrossingBackward : [torch.L == 1] / torch.take()
					Safe --> CrossingBackward : [GET(torch, L) == 1] / torch.take(); a=dbm.resetClock(y);
					note on link
						y = 0
					end note
					CrossingBackward --> Unsafe : after(delay) /a=dbm.clockGE(y, delay); torch.release()
					note on link
						y >= delay
					end note
				`,
				propertyByName: {
					"delay": {
						type: "int",
						defaultValue: 5,
					},
				},
			},
//*
			{
				"name": 'viking2',
				"class": "Soldier",
				propertyByName: {
					"delay": {
						type: "int",
						defaultValue: 10,
					},
				},
			},
			{
				"name": 'viking3',
				"class": "Soldier",
				propertyByName: {
					"delay": {
						type: "int",
						defaultValue: 20,
					},
				},
			},
			{
				"name": 'viking4',
				"class": "Soldier",
				propertyByName: {
					"delay": {
						type: "int",
						defaultValue: 25,
					},
				},
			},
/**/
			{
				"name": 'torch',
				"class": "Torch",
				comment: "The torch must be held by\npirates crossing the bridge",
//*
				behavior: `
					[*] --> Free : / SET(this, L, 0);
					Free --> One : take[a=dbm.isEmpty(), a != true]
					One --> Free : release / SET(this, L, 1 - GET(this, L));
					'One --> Free : release / L = 1 - L;
					One --> Two : take
					Two --> One : release
				`,
/*/				// Original UPPAAL version:
				behavior: `
					[*] --> Free : / SET(this, L, 0);
					Free --> UrgentOne : take
					note left of UrgentOne
						Urgent state in original
						UPPAAL model.
					end note
					UrgentOne --> One
					UrgentOne --> Two : take
					Two --> One : release
					'One --> Free : release / L = 1 - L;
					One --> Free : release / SET(this, L, 1 - GET(this, L));
				`,
/**/
/*				// Trying some syntax (but where to put comments?)
				members: `
					take()
					release()
					L : int
				`,
/*/
				operationByName: {
					"take": {
						comment: "Synchronous communication\nin original UPPAAL model",
						isOperation: true,
					},
					"release": {
						comment: "Synchronous communication\nin original UPPAAL model",
						isOperation: true,
					},
				},
				propertyByName: {
					"L": {
						comment: "Indicates whether the torch is\non the unsafe (L==0) or safe\n(L==1) side.",
					},
				},
/**/
			},
			{
				name: "dbm",
//*
				features: `
					nextClock : int = 1
					createClock() : clock {
						return nextClock++;
					}
					resetClock(clock) {
						let dbm;
						if(internalDBM + "" === "false") {
							// nextClock = nbVikings + 1 (for global time)
							dbm = new DBM(nextClock);
							internalDBM = dbm.dbm;
							dbm.set(nextClock, 0);
							
							dbm.xMinusYRelatesToM(nextClock, 0, 60, false);
						} else {
							dbm = new DBM(nextClock, internalDBM);
						}
						dbm.set(clock, 0);
						//console.log(dbm.toString());
					}
					clockGE(clock, upperBound) : bool {
						const dbm = new DBM(nextClock, internalDBM);
					//	console.log("clockGE", clock, upperBound);
						dbm.delay();
						dbm.xMinusYRelatesToM(0, clock, -upperBound, false);
							dbm.xMinusYRelatesToM(nextClock, 0, -1, false);
						//console.log(dbm.toString());
					}
					asString() {
						const dbm = new DBM(nextClock, internalDBM);
						//console.log(dbm.toString());
						return dbm.toString();
					}
					isEmpty() : bool {
						if(internalDBM + "" === "false") {
							return false;
						}
						const dbm = new DBM(nextClock, internalDBM);
						return dbm.isEmpty();
					}
				`,
/*/
				propertyByName: {
					nextClock: {
						type: "int",
						defaultValue: 1,
					},
					internalDBM: {
						type: "DBM",
						defaultValue: new DBM(),
					},
				},
				operationByName: {
					createClock: {
						returnType: "clock",
						method: "return nextClock++;",
					},
					resetClock: {
						parameters: ["clock"],
						method: "",
					},
					clockGE: {
						parameters: ["clock", "upperBound"],
						returnType: "bool",
						method: "",
					},
				},
/**/
			},
		],
		connectorByName: {
			C1: {
				ends: ["viking1", "torch"],
			},
			C2: {
				ends: ["viking2", "torch"],
			},
			C3: {
				ends: ["torch", "viking3"],
			},
			C4: {
				ends: ["torch", "viking4"],
			},
		},
		watchExpressions: {
			dbm: "new DBM(__ROOT__dbm.nextClock, __ROOT__dbm.internalDBM)",
			clockConstraints: "dbm.toString()",
			lessThan60: "dbm.isClockLessThan(5, 60)",
			moreThan5: "dbm.isClockGreaterOrEqualThan(5, 60)",
			v1Safe: "IS_IN_STATE(viking1, viking1.Safe)",
			v2Safe: "IS_IN_STATE(viking2, viking2.Safe)",
			v3Safe: "IS_IN_STATE(viking3, viking3.Safe)",
			v4Safe: "IS_IN_STATE(viking4, viking4.Safe)",
			allSafe: "v1Safe && v2Safe && v3Safe && v4Safe",
		},
		settings: {
			display: {
				hideMethods: true,
			},
			semantics: {
				fireInitialTransitions: true,
				synchronousCommunication: true,
			},
		}
	}
;
/*	// this does not preserve property order required by reexport test
model.objects[1].behavior =
model.objects[2].behavior =
model.objects[3].behavior = model.objects[0].behavior;
/*/
function copyBehavior(source, ...targets) {
	for(const target of targets) {
		const props = target.propertyByName;
		delete target.propertyByName;
		target.behavior = source.behavior;
		target.propertyByName = props;
	}
}
copyBehavior(model.objects[0], ...model.objects.filter(o => o.name.startsWith("viking")));
/**/
examples.push(
	model
);
}

