import {msgSigRegex} from "./AnimUMLEngine.js";

export class AnimUMLWrappingEngineTemplate {
	constructor(engine, settings) {
		// From the STR interface of our formalization
		this.reset = async () => {
			await engine.reset();
		};
		this.getConfiguration = async () => {
			return await engine.getConfiguration();
		};
		this.setConfiguration = async (config) => {
			await engine.setConfiguration(config);
		};
		this.getFireables = async () => {
			return await engine.getFireables();
		};
		this.fire = async (fireable) => {
			await engine.fire(fireable);
		};

		// From the P interface of our formalization
		this.parseConfiguration = async (config) => {
			return await engine.parseConfiguration(config);
		};
		this.parseTransition = async (trans) => {
			return await engine.parseTransition(trans);
		};

		// From the APE interface of our formalization
		this.evaluateAtom = async (atom, extraOps) => {
			return await engine.evaluateAtom(atom, extraOps);
		};

		// misc
		this.setModel = (model) => {
			engine.setModel(model);
		}

		Object.defineProperty(this, 'sysHistory', {get: function() {return engine.sysHistory;}});
		Object.defineProperty(this, 'configuration', {get: function() {return engine.configuration;}});
		Object.defineProperty(this, 'currentModel', {get: function() {return engine.currentModel;}});
		Object.defineProperty(this, 'extraOperations', {
			get: function() {return engine.extraOperations;},
			set: function(v) {engine.extraOperations = v;},
		});
		Object.defineProperty(this, 'nextEffectAsFunction', {
			get: function() {return engine.nextEffectAsFunction;},
			set: function(v) {engine.nextEffectAsFunction = v;},
		});
		Object.defineProperty(this, 'nextEffectAsAsync', {
			get: function() {return engine.nextEffectAsAsync;},
			set: function(v) {engine.nextEffectAsAsync = v;},
		});
		Object.defineProperty(this, 'effectResult', {
			get: function() {return engine.effectResult;},
			set: function(v) {engine.effectResult = v;},
		});
		this.getSlots = (...args) => {
			return engine.getSlots(...args);
		};
		this.isCurrentState = (...args) => {
			return engine.isCurrentState(...args);
		};
		this.isFireable = (...args) => {
			return engine.isFireable(...args);
		};
		this.isActivable = (...args) => {
			return engine.isActivable(...args);
		};
		this.findMessage = (...args) => {
			return engine.findMessage(...args);
		};
		this.setInitialState = (...args) => {
			return engine.setInitialState(...args);
		};
		this.backToInternal = async (...args) => {
			await engine.backToInternal(...args);
		};
		this.fireInternal = async (...args) => {
			return await engine.fireInternal(...args);
		};
		this.treeifyConfig = (...args) => {
			return engine.treeifyConfig(...args);
		};
		this.eventMatched = (...args) => {
			return engine.eventMatched(...args);
		};
		this.getFireable = (...args) => {
			return engine.getFireable(...args);
		};
		this.registerArguments = (...args) => {
			return engine.registerArguments(...args);
		};
		this.evalGuard = (...args) => {
			return engine.evalGuard(...args);
		};
	}
}


