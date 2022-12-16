import {unique} from "./Utils.js";

// remark: JSON visualization requires a relatively recent version of PlantUML
function showConfig(config, data, prefix = "", diffs = []) {
	return String.raw`
		state "${data.id}" as ${prefix}${data.id}
		${prefix}${data.id} : {{json\n${
			diffs.map(diff =>
				`#highlight ${diff.map(s => `"${s}"`).join(" / ")}`
			).join("\\n")
		}\n${config}\n}}
	`;
}
function targets(data) {
	return	Object.entries(data).filter(([n, _]) =>
			n !== "id"
		);
}
function esc(s, start = "", end = "") {
	if(s) {
		return `${start}${
			s.replace(/\n/g, "\\n")
		}${end}`;
	} else {
		return "";
	}
}
function showOutgoing(model, stateSpace, data, prefix = "") {
	function transLabel(trans) {
		const t = model.getTransition(trans);
		const label = `${t.trigger ?? ""}${esc(t.guard, "[", "]")}${esc(t.effect, "/")}`;
		if(label) {
			return `${prefix}${data.id}_${trans} : ${label}`;
		} else {
			return "";
		}
	}
	return	targets(data).map(([trans, configs]) => `
			state "${trans.replace(/_/g, "~_")}" as ${prefix}${data.id}_${trans}
			${prefix}${data.id} --> ${prefix}${data.id}_${trans}
			${transLabel(trans)}
			${configs.map(config => `
				${prefix}${data.id}_${trans} --> ${prefix}${stateSpace[config].id}
			`).join("")}
		`).join("");
}

export function diff(prev, next) {
/*
	return [
		["currentState", "controller"],
	];
/*/
	function comp(lv, rv, path) {
		const ret = [];
		if(lv === null && rv === null) {
			// nothing to report
		} else if(lv === null || rv === null) {
			ret.push(path);
		} else if(Array.isArray(lv) && Array.isArray(rv)) {
			if(lv.length === rv.length) {
				ret.push(...lv.flatMap((e, i) =>
					comp(lv[i], rv[i], [...path, i])
				));
			} else {
				if(lv.length < rv.length) {
					ret.push(...lv.flatMap((e, i) =>
						comp(lv[i], rv[i], [...path, i])
					));
					for(let i = lv.length ; i < rv.length ; i++) {
						ret.push([...path, i]);
					}
				} else {
					ret.push(...rv.flatMap((e, i) =>
						comp(lv[i], rv[i], [...path, i])
					));
					ret.push(path);
				}
			}
		} else if(Array.isArray(lv) || Array.isArray(rv)) {
			ret.push(path);
		} else if(typeof lv === "object" && typeof rv === "object") {
			for(const k of Object.keys(rv)) {
				const newPath = [...path, k];
				const l = lv[k];
				const r = rv[k];
//console.log(newPath, l, r)
				ret.push(...comp(l, r, newPath));
			}
			for(const k of Object.keys(lv)) {
				if(k in rv) {
					// nothing to report
				} else {
					ret.push(path);
					break;
				}
			}
		} else if(lv === rv) {
			// nothing to report
		} else {
			ret.push(path);
		}
		return ret;
	}
	const ret = comp(prev, next, []);
//console.log("ret", ret);
	return ret;
/**/
}

export function stateSpace2PlantUML(model, stateSpace, fanOutMode) {
	const ret = Object.entries(stateSpace)
	//.slice(start+1, start+2)	// to keep config_start only
	//.slice(26, 27)
	.map(([config, data]) => {
		if(config === "start") {
			return data.map(target =>
				`[*] --> ${stateSpace[target].id}`
			);
		} else {
			if(fanOutMode) {
				// one fan-out subgraph per source config
				return `
					state "${data.id} fan-out" as ${data.id} {
						${showConfig(config, data, data.id)}
						${unique(targets(data).flatMap(([_, configs]) =>
							configs
						)).map(targetConfig =>
							showConfig(targetConfig, stateSpace[targetConfig], data.id, diff(JSON.parse(config), JSON.parse(targetConfig)))
						).join("")}
						${showOutgoing(model, stateSpace, data, data.id)}
					}
				`;
			} {
				// single graph
				return `
					${showConfig(config, data)}
					${showOutgoing(model, stateSpace, data)}
				`;
			}
		}
		
	}).join("\n");
	if(fanOutMode) {
		return "left to right direction\n" + ret;
	} else {
		return ret;
	}
}

