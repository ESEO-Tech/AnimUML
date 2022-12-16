globalThis.examples = globalThis.examples || [];
examples.push(
	{
		name: 'AnimUMLEngine',
		classes: `
			' stateful STR interface
			interface StatefulEngine {
				reset()
				getConfiguration() : Configuration
				setConfiguration(config : Configuration)
				getFireables() : Transition[*]
				fire(trans : Transition)
			}
			' STR interface
			interface StatelessEngine {
				reset() : Configuration
				getFireables(config : Configuration) : Transition[*]
				fire(config : Configuration, trans : Transition) : Configuration
			}
			class AnimUMLEngine implements StatefulEngine {
			}
			class AnalysisTool {
			}
			class ResourcePool {
				{static} create(poolSize : int, resourceProvider : ResSupplier) : ResourcePool <<create>>
				work(task : Res2RetFunction) : Ret
			}
			class PooledEngine implements StatelessEngine {
				{static} create(poolSize : int, statefulEngineProvider : StatefulEngineSupplier) : PooledEngine <<create>>
			}

			interface P {
				parseConfiguration(config : Configuration) : JSONString
				showConfiguration(config : Configuration) : Object
				parseTransition(trans : Transition) : String
				showConfiguration(trans : Transition) : Object
			}
			interface ACC {
				isAccept() : Boolean
			}
			interface APE {
				evaluateAtom(atom : Atom) : Boolean
			}
			class SynchronousCompositionEngine implements StatefulEngine, P, ACC {
				{static} constructor(left : STR_APE, rights : STR_APC[*]) : SynchronousCompositionEngine <<create>>
			}

			class AnimUMLSmallerStepsEngine implements StatefulEngine, APE {
				{static} constructor(engine : AnimUMLEngine) : AnimUMLSmallerStepsEngine <<create>>
			}
			class AnimUMLSynchronousCommunicationEngine implements StatefulEngine, APE, P {
				{static} constructor(engine : AnimUMLEngine) : AnimUMLSynchronousCommunicationEngine <<create>>
			}
			class AnimUMLTimedEngine implements StatefulEngine, APE, P {
				{static} constructor(engine : AnimUMLEngine) : AnimUMLTimedEngine <<create>>
			}
		`,
		objects: [
			{
				name: 'engine',
				class: 'AnimUMLEngine',
			},
			{
				name: 'tool',
				class: 'AnalysisTool',
			},
		],
		connectorByName: {
			C1: {
				ends: ["engine", "tool"],
				possibleMessages: {
					reverse: ["reset", "getConfiguration", "setConfiguration", "getFireables", "fire(trans)"],
				},
			},
		},
		settings: {
			display: {
				showClassDiagram: true,
			},
		},
	}
);
