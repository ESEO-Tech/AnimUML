

/*
	Simplified semantics wrt. AnimUMLEngine (at least as of now):
	- no composite states
	- simple action language
		- basic effects
			mostly for console.log
		- no properties
			- no property default values
		- no message to other objects
		=> make effect execute in system interpreter?
			not for observers/passive monitors... and active monitors would have to be part of the system
	- no choice

	Other limitations (at least as of now):
	- only one observer

 */

const STUTTER = "STUTTER";

export class ObserverAnimUMLEngine {
	constructor(model, observer, settings) {
		this.setModel(model, observer);
	}

	setModel(model, observer) {
		this.name = "Observer " + observer.name;
		this.currentModel = model;
		this.observer = observer;
		this.reset();
	}

	// private methods
	observers() {
/*
		return this.currentModel.objects.filter(obj =>
			obj.isObserver
		);
*/
		return [this.observer];
	}

	fireables() {
		return this.observers().flatMap(obj => {
			const currentState = this.configuration.currentState[obj.name];
			return obj.stateByName[currentState].outgoing ?? [];
		});
	}

	// From the STR interface
	async reset() {
		const observers = this.observers();
		this.configuration = {
			currentState:	Object.fromEntries(
						observers.map(obj =>
							[obj.name, this.currentModel.getInitial(obj).name]
						)
					),
		};

/*
		for(const observer of observers) {
			
		}
*/
		// Fire all initial transitions
		// assuming there is only one outgoing transition per initial pseudostate, and that it has no guard, as per the UML semantics
		for(const trans of (await this.getFireables()).filter(t => t !== STUTTER)) {
			this.fire(trans);
		}
	}

	async getConfiguration() {
		return JSON.stringify(this.configuration);
	}

	async setConfiguration(config) {
		this.configuration = JSON.parse(config);
	}

	async getFireables() {
		return [
			...this.fireables().map(trans =>
				this.currentModel.transFullName(trans)
			),
			STUTTER,	 // TODO: each observer should stutter independently
		];
	}

	async fire(fireable) {
		if(fireable === STUTTER) {
			// nothing to do
		} else {
			const trans = this.currentModel.getTransition(fireable);
			const obj = this.currentModel.getTransObject(trans);

			contextualEval(trans.effect);

			this.configuration.currentState[obj.name] = trans.target.name;
		}
	}


	// From the P interface
	async parseConfiguration(config) {
		return config;
	}


	// From the APC interface
	getAtoms() {
		const atoms = this.fireables().map(e =>
			e.guard ?? "true"
		);
		return [
			...atoms,
			atoms.length == 0 ? "true" : `!(${atoms.join("||")})`	// TODO: each observer should stutter independently
		];
	}

	// From the ACC interface
	isAccept() {
		return Object.entries(this.configuration.currentState).some(([objName, state]) => {
			return	state.toUpperCase() === "ACCEPT"
			||	state.toUpperCase() === "REJECT"
			||	state.toUpperCase() === 'FAIL'	// for EMI
			;
		});
	}
}

