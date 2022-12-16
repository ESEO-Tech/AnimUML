import {RemoteEngine} from "./RemoteEngine.js";
import {hasElements, entryNameComparator} from "./Utils.js";
export const EMIRemoteEngine = {
	async connect(url, handlers) {
		const remoteEngine = await RemoteEngine.connect(url, handlers);
		return {
			isFireable(trans) {
				throw "unsupported";
			},
			async getFireables() {
				var ret = await remoteEngine.getFireables();
				return ret;
			},
			async getConfiguration() {
				var ret = await remoteEngine.getConfiguration();
				return ret;
			},
			async setConfiguration(config) {
				await remoteEngine.setConfiguration(config);
			},
			async fire(transition) {
				await remoteEngine.fire(transition);
			},
			async reset() {
				await remoteEngine.reset();
			},
			get modelName() {
				return remoteEngine.modelName;
			},
/*
			get name() {
				return "EMI";
			},
*/
			name: "EMI",
			async parseTransition(transition) {
				var ret = await remoteEngine.parseTransition(transition);
				return ret;
			},
			async parseConfiguration(config) {
				var parsedConfig = await remoteEngine.parseConfiguration(config);
				parsedConfig = parseEMIConfiguration(parsedConfig);
				parsedConfig = convertEMI2AnimUML(parsedConfig);
				return JSON.stringify(parsedConfig);
			},
			async showConfiguration(config) {
				var ret = await this.parseConfiguration(config);
				return JSON.parse(ret);
			},
			async showTransition(transition) {
				var ret = (await remoteEngine.showTransition(transition));
				if(typeof ret === "array") {
					ret = ret[0];
					return {
						object: ret.activeObject.replace(/^instMain_/, ""),
						name: ret.transitions[0],
						source: ret.source,
						target: ret.target
					};
				} else {
					return ret;
				}
			},
			async evaluateAtom(atom) {
				return remoteEngine.evaluateAtom(atom);
			},
			close() {
				remoteEngine.close();
			},
		};
	}
};
function parseEMIConfiguration(config) {
	var pc = JSON.parse(config);
	function conv(src, tgt) {
		if(src.hasOwnProperty("value")) {
			tgt[src.name] = src.value;
		} else if(src.children) {
			var value = {};
			tgt[src.name] = value;
			src.children.forEach(c => {
				conv(c, value);
			});
		} else {
			console.log("Cannot convert EMI configuration node (it has neither value nor children):", src);
			throw "Cannot convert EMI configuration node"
		}
		return tgt;
	}
	return conv(pc, {});
}
function convertEMI2AnimUML(parsedConfig) {
	function selectObjects(filter) {
		return Object.entries(parsedConfig.store).filter(filter);
	}
	const mainObjects =
		selectObjects(([name, value]) =>
			name.startsWith("instMain_")
// - [TI] composite objects appear in EMI's configuration
// TODO: but relying on same names is not ideal (e.g., when diffExploring LevelCrossing)
			&& currentModel.getObject(name.replace(/^instMain_/, ""))
		);
	let model = {
		currentState:	Object.fromEntries(mainObjects.filter(([name, value]) =>
					value.cs
				).map(([name, value]) => {
					name = name.replace(/^instMain_/, "");
					return [name, [`${name}.${value.cs}`]];
				})),
		histories: {},
// Translation Issues (TI):
		objectState:	Object.fromEntries(mainObjects.map(([name, value]) => {
					name = name.replace(/^instMain_/, "");
					return [name, Object.fromEntries(Object.entries(
// - [TI] EMI uses an empty string for undefined (e.g., no objectState)
						value.od || {}
					).filter(([name, value]) =>
// - [TI] default values appear in config, whereas they do not in AnimUML
						JSON.parse(value) != 0
					).map(([name, value]) =>
						[
							`__EMI__${name}`,
// - [TI] booleans are represented as ints => with model-specific workaround	=> possibly better workaround: define TRUE and FALSE as 1 and 0 in the EMI-specific additionalOperations
//									name === "canResume" ?
//										JSON.parse(value) && true
//									:
// - [TI] EMI uses strings for all values (ints, booleans)
								JSON.parse(value)
						]
					).concat(
						value.ep?.nbEvents * 1 ?
							[[
								'__EP__',
								Object.values(value.ep.eventOccurred).slice(0, value.ep.nbEvents).map((e, i) => (
									{
										source: "[",
										target: name,
										signature: `${e.signalEventId.replace(/_SE$/, "")}(${
											value.ep_params ?
												Object.values(
// warning: some versions of pahole add a 0 before the size of union members, and EMI does not parse this correctly
														Object.values(value.ep_params.eventOccurred)[i]
															.union[`${e.signalEventId.replace(/_SE$/, "")}_params`]
													||
														{}
												).join(", ")
											:
												""
										})`,
										tag: e.portId === "(no port)" ? undefined : e.portId,
									}
								))
							]]
						:
							[]
					).sort(entryNameComparator))];
				}).sort(entryNameComparator)),
//Object.fromEntries(currentModel.objects.map(o => [o.name, {}])),
		ether: {},
	};

	const observerObjects =
		selectObjects(([name, value]) =>
			name.startsWith("instObs_")
		);
	if(hasElements(observerObjects)) {
		// TODO: convert additional state such as attributes?
		model = {
			left: JSON.stringify(model),
			rights: observerObjects.map(([name, value]) => JSON.stringify({
				currentState: {
					[name.replace(/^instObs_/, "")]: value.cs,
				},
			})),
		};
	}
//console.log(JSON.stringify(parsedConfig, undefined, 2))
	return model;
}

