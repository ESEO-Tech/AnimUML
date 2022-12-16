import {msgSigRegex} from "./AnimUMLEngine.js";
import {DBM} from "./DBM.js";
import {allTransitions} from "./ModelUtils.js";

export class AnimUMLTimedEngine {
	constructor(engine, settings) {
		const globalClock = true;

		(engine.extraOperations ??= {}).__getDBM__ = () => {
			return dbm;
		};

		let dbm;
		let clockNames;
		let configuration;
		let timedActiveObjects;
		// From the STR interface of our formalization
		this.reset = async () => {
			timedActiveObjects = engine.currentModel.objects.filter(o => engine.currentModel.isActive(o) && allTransitions(o).some(t => getAfter(t)));
			dbm = new DBM(timedActiveObjects.length + (globalClock ? 1 : 0));
			if(globalClock) {
				// reset global clock
				dbm.set(timedActiveObjects.length + 1, 0);
			}
			dbm.clockNames = ["zero", ...timedActiveObjects.map(o => `${o.name}.timer`), ...(globalClock ? ["globalTime"] : [])];
			await engine.reset();

			await updateConfig();
		};
		this.getConfiguration = async () => {
			return JSON.stringify({
				...JSON.parse(await engine.getConfiguration()),
				dbm: dbm.dbm,
			});
		};
		this.setConfiguration = async (config) => {
		//	configuration =
		//		config = JSON.parse(config);
			await engine.setConfiguration(config);
			configuration = engine.configuration;
			dbm.dbm = JSON.parse(config).dbm;
		};
		this.getFireables = async () => {
			return await engine.getFireables();
		};
		function getAfter(trans) {
			const m = trans.trigger?.match(msgSigRegex);
			if(m) {
				return m[2];
			} else {
				return undefined;
			}
		}
		function showEventPools(config) {
			return Object.fromEntries(Object.entries(config.objectState).filter(([objName, objState]) =>
				objState.__EP__
			).map(([objName, objState]) =>
				[objName, objState.__EP__],
			));
		}
		this.fire = async (fireable, trustMe) => {
			// in case the configuration has been "patched" (e.g., as the AnimUMLSynchronousCommunicationEngine does)
			//engine.configuration = {...configuration, dbm: undefined};
//			console.log("TimedEngineEPs", showEventPools(configuration));
//			console.log("BaseEngineEPs", showEventPools(engine.configuration));

			const trans = engine.currentModel.getTransition(fireable);
			const object = engine.currentModel.getTransObject(trans);
			const clockId = timedActiveObjects.indexOf(object)
						+1	// because clock 0 is reserved
			;
			const after = getAfter(trans);
			// TODO: what about states reached immediately after reset?
			if(after) {
				// delay+constraint
				const bound = engine.evalActions(after, {}, object, engine.extraOperations, engine);
				dbm.delay();
				dbm.xMinusYRelatesToM(0, clockId, -bound, false);
//console.log(dbm.toString());
			}
			if(trans.target.outgoing.some(t => getAfter(t))) {
				// reset clock
				dbm.set(clockId, 0);
//console.log(dbm.toString());
			}
			const ret = await engine.fire(fireable, trustMe);
			await updateConfig();
			return ret;
		};
		async function updateConfig() {
			configuration = engine.configuration;
			// remark: we "pollute" the base configuration, but this should work until we have cleaner modularity
			// if we performed a copy, then whatever a higher-level engine would do would not be reflected on the base engine's configuration
			// and AnimUMLSynchronousCommunication engine performs some low-level changes (i.e., adding a message in an event pool)
			configuration.dbm = dbm.dbm;
		}

		// From the P interface of our formalization
		this.parseConfiguration = async (config) => {
			return config;
		};
		this.parseTransition = async (trans) => {
			return trans;
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
		Object.defineProperty(this, 'configuration', {get: function() {return configuration;}});
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
			return {...engine.treeifyConfig(...args), dbm: dbm.dbm};
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

