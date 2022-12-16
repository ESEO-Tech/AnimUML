// example inspired from corresponding UPPAAL example, but not really working in UML without synchronous communication
// UPPAAL figures notably available online at: https://msu.edu/~hajishey/uslicer.html
globalThis.examples = globalThis.examples || [];
{
const model =
	{
		"name": "Bridge",
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
		classes: `
			class Soldier {
				delay : int
				behavior {
					[*] -> Unsafe

					' testing invalid transitions
			'		Unsafe --> Unsafe : rgmlsdfmkl[/sdf
			'		Unsafe : [/

					' TODO: test if accessing torch.L works now (but comparing to 1, never to 0)...
					'NO: Unsafe --> CrossingForward : [torch.L == 0] / torch.take()
					'Unsafe --> CrossingForward : [torch.L != 1] / torch.take()
					Unsafe --> CrossingForward : [GET(torch, L) == 0] / torch.take()
					note on link
						y = 0
					end note
					CrossingForward --> Safe : after(delay) / torch.release()
					note on link
						y >= delay
					end note
					'Safe --> CrossingBackward : [torch.L == 1] / torch.take()
					Safe --> CrossingBackward : [GET(torch, L) == 1] / torch.take()
					note on link
						y = 0
					end note
					CrossingBackward --> Unsafe : after(delay) / torch.release()
					note on link
						y >= delay
					end note
				}
			}
		`,
		"objects": [
			{
				"name": 'viking1',
				"class": "Soldier",
/*
				"behavior": `
					[*] --> Unsafe

					' testing invalid transitions
			'		Unsafe --> Unsafe : rgmlsdfmkl[/sdf
			'		Unsafe : [/

					' TODO: test if accessing torch.L works now (but comparing to 1, never to 0)...
					'NO: Unsafe --> CrossingForward : [torch.L == 0] / torch.take()
					'Unsafe --> CrossingForward : [torch.L != 1] / torch.take()
					Unsafe --> CrossingForward : [GET(torch, L) == 0] / torch.take()
					note on link
						y = 0
					end note
					CrossingForward --> Safe : after(delay) / torch.release()
					note on link
						y >= delay
					end note
					'Safe --> CrossingBackward : [torch.L == 1] / torch.take()
					Safe --> CrossingBackward : [GET(torch, L) == 1] / torch.take()
					note on link
						y = 0
					end note
					CrossingBackward --> Unsafe : after(delay) / torch.release()
					note on link
						y >= delay
					end note
				`,
*/
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
/*
				behavior: `
					[*] --> Free : / SET(this, L, 0);
					Free --> One : take
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
			v1Safe: "IS_IN_STATE(viking1, viking1.Safe)",
			v2Safe: "IS_IN_STATE(viking2, viking2.Safe)",
			v3Safe: "IS_IN_STATE(viking3, viking3.Safe)",
			v4Safe: "IS_IN_STATE(viking4, viking4.Safe)",
			allSafe: "v1Safe && v2Safe && v3Safe && v4Safe",
			clockConstraints: "__getDBM__?.()?.toString?.()",
			testQuery: "let globalClockId = 5; __getDBM__?.()?.isClockGreaterOrEqualThan?.(globalClockId, 60)",
		},
		settings: {
			display: {
				hideMethods: true,
			},
			semantics: {
				fireInitialTransitions: true,
				synchronousCommunication: true,
				withDBM: true,
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
		target.behavior = source.classes.replace(/^.*behavior {([^}]*)}.*$/s, "$1");
		target.propertyByName = props;
	}
}
copyBehavior(model, ...model.objects.filter(o => o.name.startsWith("viking")));
/**/
examples.push(
	model
);
}
