import {getClassOperations, getClassProperties, getTriggerContexts, getEventName, getEventArgs, allTransitions, allVertices} from "./ModelUtils.js";
import {hasElements, groupBy, firstToUpper} from "./Utils.js";
import {toExplicit} from "./TransformStateMachine2Explicit.js";

const msgRegex = /([^(]+)(?:\(([^)]*)\))?/;

function defaultReportWarning(msg) {
	console.warn(`AnimUML static analysis warning: ${msg}`);
}

function defaultReportError(msg) {
	console.error(`AnimUML static analysis error: ${msg}`);
}

export const Warning = {
	associationWithEnum: "associationWithEnum",
	classNotFound: "classNotFound",
	noClass: "noClass",
	unparsableTransitionLabel: "unparsableTransitionLabel",
	noGuardAfterChoice: "noGuardAfterChoice",
	privateOperationAsTrigger: "privateOperationAsTrigger",
	argumentsParametersMismatch: "argumentsParametersMismatch",
	invalidTriggerArgument: "invalidTriggerArgument",
	unfoundTriggerOperation: "unfoundTriggerOperation",
	privateOperationOnConnector: "privateOperationOnConnector",
	unfoundConnectorOperation: "unfoundConnectorOperation",
	unparsableConnectorMessage: "unparsableConnectorMessage",
	privateOperationAsNonSelfMessageInInteraction: "privateOperationAsNonSelfMessageInInteraction",
	unfoundInteractionOperation: "unfoundInteractionOperation",
	unfoundInteractionTargetObject: "unfoundInteractionTargetObject",
	unfoundInteractionSourceObject: "unfoundInteractionSourceObject",
	noConnectorType: "noConnectorType",
	connectorTypeNotFound: "connectorTypeNotFound",
	connectorTypeNotAssociation: "connectorTypeNotAssociation",
	connectorTypeInvalid: "connectorTypeInvalid",
	activeObjectHasNonActiveClass: "activeObjectHasNonActiveClass",
	operationShouldBelongOnlyToClass: "operationShouldBelongOnlyToClass",
	operationShouldBelongToClass: "operationShouldBelongToClass",
	propertyShouldBelongOnlyToClass: "propertyShouldBelongOnlyToClass",
	propertyShouldBelongToClass: "propertyShouldBelongToClass",
	actorObjectHasNonActorClass: "actorObjectHasNonActorClass",
};

export const Error = {
	duplicateObjectNames: "duplicateObjectNames",
};

export function analyze(model, {reportError = defaultReportError, reportWarning = defaultReportWarning, checkActorOperations = true, checkActorClass = true} = {}) {
	const classOperations = new Map();
	function allOperations(className) {
		const c = model.classes?.[className];
		if(c) {
			const ret = classOperations.get(c);
			if(ret) {
				return ret;
			} else {
				const allOps = getClassOperations(c);
				classOperations.set(c, allOps);
				return allOps;
			}
		} else {
			return {};
		}
	}
	function getOperation(target, opName) {
		return target.operationByName?.[opName] ?? allOperations(target.class)[opName];
	}
	function descTrans(trans, obj) {
		return `${model.transFullName(trans)} from ${model.stateFullName(trans.source)} to ${model.stateFullName(trans.target)} in ${obj.name}'s state machine`;
	}

	function isAssociation(cl) {
		return cl.ends;
	}
	function isEnum(cl) {
		return cl.literals;
	}

	for(const [clName, cl] of Object.entries(model.classes ?? {})) {
		if(cl.ends) {	// association
			if(cl.ends.some(end => isEnum(end.type))) {
				reportWarning(
					`Association with enumerations like ${clName} between ${cl.ends.map(e => e.type.name).join(" and ")} should not exist. Declare an attribute instead.`,
					Warning.associationWithEnum, {
						"Remove association."() {
/*
							// causes some issues with code that assumes a named classifier cannot be undefined
							model.classes[clName] = undefined;
/*/
							delete model.classes[clName];
/**/
						},
					}
				);
			}
		}
	}

	for(const obj of model.objects) {
		if(obj.class) {
			const cl = getClass(obj);
			if(cl) {
				// class ok, checking stereotypes & features

				if(obj.isActor && !cl.stereotypes?.includes("actor")) {
					reportWarning(`Class ${obj.class} of actor ${obj.name} does not have the «actor» stereotype.`, Warning.actorObjectHasNonActorClass, {
						"Add «actor» stereotype to class."() {
							(cl.stereotypes ??= []).push("actor");
						},
					});
				}

				const clProps = getClassProperties(cl);
				for(const [propName, prop] of Object.entries(obj.propertyByName ?? {})) {
					const clProp = clProps[propName];
					if(clProp) {
						if("defaultValue" in prop && prop.defaultValue !== clProp.defaultValue) {
							// ok: object-owned property specifies a different defaultValue
						} else {
							// TODO: better distinguish when it is legal (e.g., matching types or no type on object-owned property) or not
							reportWarning(`Property ${propName} of object ${obj.name} is also declared on its class.`, Warning.propertyShouldBelongOnlyToClass, {
								[`Remove property from object.`]() {
									delete obj.propertyByName[propName];
								},
								// TODO: merge both properties?
	//							[`Remove property from class.`]() {	// TODO: only if directly owned
	//								delete cl.propertyByName[propName];
	//							},
							});
						}
					} else {
						reportWarning(`Property ${propName} of object ${obj.name} should rather be defined on its class.`, Warning.propertyShouldBelongToClass, {
							[`Move property to class.`]() {
								(cl.propertyByName ??= {})[propName] = prop;
								delete obj.propertyByName[propName];
							},
						});
					}
				}

				const clOps = getClassOperations(cl);
				for(const [opName, op] of Object.entries(obj.operationByName ?? {})) {
					const clOp = clOps[opName];
					if(clOp) {
						reportWarning(`Operation ${opName} of object ${obj.name} is also declared on its class.`, Warning.operationShouldBelongOnlyToClass, {
							[`Remove operation from object.`]() {
								delete obj.operationByName[opName];
							},
							// TODO: merge both operations?
//							[`Remove operation from class.`]() {	// TODO: only if directly owned
//								delete cl.operationByName[opName];
//							},
						});
					} else {
						reportWarning(`Operation ${opName} of object ${obj.name} should rather be defined on its class.`, Warning.operationShouldBelongToClass, {
							[`Move operation to class.`]() {
								(cl.operationByName ??= {})[opName] = op;
								delete obj.operationByName[opName];
								if(hasElements(op.parameters)) {
									op.parameters = op.parameters.map(p => {
										if(typeof p === "string") {
											return {name: p};
										} else {
											return p;
										}
									});
								}
							},
						});
					}
				}
			} else {
				reportWarning(`Class ${obj.class} of ${obj.isActor ? "actor" : "object"} ${obj.name} not found.`, Warning.classNotFound, {
					[`Create class ${obj.class}.`]() {
						(model.classes ??= {})[obj.class] = {
							name: obj.class,
						};
					},
				});
			}
		} else if(!obj.isActor || checkActorClass) {
			const className = firstToUpper(obj.name);
			reportWarning(`No class is specified for ${obj.isActor ? "actor" : "object"} ${obj.name}.`, Warning.noClass, {
				[`Set class to ${className}.`]() {
					obj.class = className;
				},
			});
		}
	}
	for(const [objName, objects] of Object.entries(groupBy(model.objects, o => o.name))) {
		if(objects.length > 1) {
			reportError(`Found ${objects.length} objects with the same name: "${objName}".`, Error.duplicateObjectNames);
		}
	}
	function getClass(obj) {
		return model.classes?.[obj.class];
	}

	for(const obj of model.objects.filter(o => model.isActive(o))) {
		const cl = getClass(obj);
		if(cl) {
			if(model.isActive(cl)) {
				// ok: class has state machine
			} else if(cl.stereotypes?.some(s => s === "active")) {
				// ok: class as <<active>> stereotype
			} else {
				reportWarning(`Class ${obj.class} of active object ${obj.name} is not active.`, Warning.activeObjectHasNonActiveClass, {
					"Add «active» stereotype to class."() {
						(cl.stereotypes ??= []).push("active");
					},
				});
			}
		}
		for(const trans of allTransitions(obj)) {
			if(trans.label) {
				reportWarning(`Could not parse label "${trans.label}" of transition ${descTrans(trans, obj)}.`, Warning.unparsableTransitionLabel);
			}
		}
		for(const ps of allVertices(obj).filter(v => v.kind === "choice")) {
			for(const trans of ps.outgoing) {
				if(!trans.guard) {
					reportWarning(`No guard after choice on transition ${descTrans(trans, obj)}.`, Warning.noGuardAfterChoice);
				}
			}
		}
		const sm =
			/*
				obj
			/*/
				toExplicit(							// transforming to explicit because getTriggerContexts is not recursive (yet)
					{...obj, operationByName: {...obj.operationByName}},	// copying the parts that may be modified by toExplicit
					model,
				)
			/**/
		;
		for(const [opName, transitions] of Object.entries(getTriggerContexts(sm))) {
			if(opName.startsWith("TO") || opName.startsWith("GUARD_")) continue; // ignoring toExplicit-generated timetout and guard operations

			const op = getOperation(obj, opName);
			if(op) {
				if(op.private) {
					reportWarning(`Operation ${opName} on ${obj.name} is private but appears as trigger in its state machine.`, Warning.privateOperationAsTrigger);
				} else {
					for(const trans of transitions) {
						const nbParams = op.parameters?.length ?? 0;

						const trigger = trans.trigger;
						const args = getEventArgs(trigger);
						const nbArgs = args?.length ?? 0;

						if(nbArgs === nbParams) {
							// TODO: more checks?
							//console.log(args, op.parameters, nbParams, nbArgs)
						} else {
							const cleanedArgs = (args ?? []).map(arg => arg.trim());
							const fixes = nbParams === 0 && (args ?? []).every(argOk)
							?	{
									[`Add trigger arguments (${cleanedArgs.join(", ")}) as parameters.`]() {
										op.parameters = cleanedArgs.map(name => ({name}));
									},
								}
							:	undefined;
							reportWarning(`Operation ${opName} on ${obj.name} has ${nbParams} parameters, but trigger ${trigger} has ${nbArgs} argument(s).`, Warning.argumentsParametersMismatch, fixes);
						}

						function argOk(arg) {
							return arg.trim().match(/^[\p{ID_Start}_$][\p{ID_Continue}_$\u200C\u200D]*$/u);
						}
						for(const arg of args ?? []) {
							if(argOk(arg)) {
								// valid identifier
							} else {
								reportWarning(`Argument "${arg}" of trigger ${trigger} on ${obj.name} is not a valid identifier.`, Warning.invalidTriggerArgument);
							}
						}
					}
				}
			} else if(opName !== "when") {
				const target = obj;
				const targetClass = getClass(target);
				reportWarning(`Could not find operation ${opName} on ${obj.name} that appears as trigger in its state machine.`, Warning.unfoundTriggerOperation, {
					[`Add operation to ${targetClass ? `class ${targetClass.name}` : `object ${target.name}`}.`]() {
						((targetClass ?? target).operationByName ??= {})[opName] = {
							name: opName,
							class: targetClass ?? target,
						};
					},
				});
			}
		}
	}

	for(const [conName, con] of Object.entries(model.connectorByName ?? {})) {
		function checkMessages(messages, target, source) {
			if(messages) {
				for(const msg of messages) {
					const m = msg.trim().match(msgRegex);
					if(m) {
						const [, opName, allParams = ""] = m;
						const op = getOperation(target, opName);
						const params = allParams.split(",").filter(e => e);
						if(op) {
							if(op.private) {
								reportWarning(`Operation ${opName} on ${target.name} is private but appears in message ${msg} sent on connector ${conName} from ${source.name}.`, Warning.privateOperationOnConnector, {
									[`Make operation ${op.class.name}.${op.name} public.`]() {
										op.private = false;
									},
								});
							} else {
								// TODO: check params
								//console.log(conName, "to", target.name, ":", msg, opName, params, op);
							}
						} else {
							const targetClass = getClass(target);
							reportWarning(`Could not find operation ${opName} on ${target.name} corresponding to message ${msg} sent on connector ${conName} from ${source.name}.`, Warning.unfoundConnectorOperation, {
								[`Add operation to ${targetClass ? `class ${targetClass.name}` : `object ${target.name}`}.`]() {
									((targetClass ?? target).operationByName ??= {})[opName] = {
										name: opName,
										class: targetClass ?? target,
									};
								},
							});
						}
					} else {
						reportWarning(`Could not parse message "${msg}" on connector ${conName} from ${source.name} to ${target.name}.`, Warning.unparsableConnectorMessage);
					}
				}
			}
		}
		const {forward, reverse} = con.possibleMessages ?? {};
		const end0 = con.ends[0];
		const end1 = con.ends[1];
		if(!end1.isActor || checkActorOperations) {
			checkMessages(forward, end1, end0);
		}
		if(!end0.isActor || checkActorOperations) {
			checkMessages(reverse, end0, end1);
		}
		const end0Class = getClass(end0);
		const end1Class = getClass(end1);
		function createAssoc(fixes, assocName) {
			fixes[`Create new association.`] = () => {
				const assoc = {
					ends: [
						{
							type: end0Class,
							//isNavigable: true,
						},
						{
							type: end1Class,
							//isNavigable: true,
						},
					],
				};
				if(!assocName) {
					assocName = `${end0Class.name}2${end1Class.name}`;
					if(model.classes?.[assocName]) {
						// making sure name is unique
						let i = 0;
						const baseName = assocName;
						while(model.classes[assocName = `${baseName}_${++i}`]);
					}
				}
				model.classes[assocName] = assoc;
				con.type = assocName;
			};
		}
		if(con.type) {
			const assoc = model.classes?.[con.type];
			if(assoc) {
				if(assoc.ends) {
					if(end0Class && end1Class) {
						const assocEnd0Class = assoc.ends[0].type;
						const assocEnd1Class = assoc.ends[1].type;
						if((	// TODO: inheritance
							assocEnd0Class === end0Class && assocEnd1Class === end1Class
						) || (
							assocEnd0Class === end1Class && assocEnd1Class === end0Class
						)) {
							// ok
						} else {
							const fixes = {};
							createAssoc(fixes);
							reportWarning(`Connector type ${con.type} of connector ${con.name} between ${end0.name} : ${end0.class} and ${end1.name} : ${end1.class} does not connect their respective classes, but ${assocEnd0Class.name} and ${assocEnd1Class.name} instead.`, Warning.connectorTypeInvalid, fixes);
						}
					} else {
						// no way to check
						// TODO: could use this information to set proper classes...
					}
				} else {
					const fixes = {};
					if(end0Class && end1Class) {
						createAssoc(fixes);
					}
					reportWarning(`Connector type ${con.type} of connector ${con.name} between ${end0.name} and ${end1.name} is not an association.`, Warning.connectorTypeNotAssociation, fixes);
				}
			} else {
				const fixes = {};
				if(end0Class && end1Class) {
					createAssoc(fixes, con.type);
				}
				reportWarning(`Association ${con.type} for type of connector ${con.name} between ${end0.name} and ${end1.name} not found.`, Warning.connectorTypeNotFound, fixes);
			}
		} else {
			const fixes = {};
			if(end0Class && end1Class) {
				const assocs = Object.entries(model.classes ?? {}).filter(([clName, cl]) => {
					if(isAssociation(cl)) {
						const assocEnd0Class = cl.ends[0].type;
						const assocEnd1Class = cl.ends[1].type;
						return (	// TODO: inheritance
							assocEnd0Class === end0Class && assocEnd1Class === end1Class
						) || (
							assocEnd0Class === end1Class && assocEnd1Class === end0Class
						);
					} else {
						return false;
					}
				});
				for(const [assocName, assoc] of assocs) {
					fixes[`Set type to existing association${assoc.label ? ` "${assoc.label}"` : ""}.`] = () => {
						con.type = assocName;
					};
				}
				createAssoc(fixes);
			}
			reportWarning(`No type is specified for connector ${conName} between ${end0.name} and ${end1.name}.`, Warning.noConnectorType, fixes);
		}
	}

	function allCalls(events) {
		return events.flatMap(e => {
			switch(e.type) {
				case "call":
				case "autoAcceptCall":
				case "found":
					return [e];
				case "loop":
					return allCalls(e.loopBody);
				case "alt":
					return e.alternatives.flatMap(a => allCalls(a.altBody));
				case "ref":
				case "return":
				case "accept":
				case "after":
					return [];
				default:
					throw `Unknown event type: ${e.type}`;
			}
		});
	}

	const unfoundObjects = new Set();

	for(const [interName, inter] of Object.entries(model.interactions ?? {})) {
		for(const event of allCalls(inter.events)) {
			const target = model.getObject(event.to);

			if(target) {
				if(target.isActor && !checkActorOperations) continue;

				const opName = event.call ?? event.accept;
				const op = getOperation(target, opName);
				if(op) {
					if(op.private && event.from !== event.to) {
						reportWarning(`Operation ${opName} on ${target.name} is private but appears as a non-self message from ${event.from} in interaction "${interName}".`, Warning.privateOperationAsNonSelfMessageInInteraction);
					} else {
						// TODO: more checks, such as params
					}
				} else {
					reportWarning(`Could not find operation ${opName} on ${target.name} that appears as message in interaction "${interName}".`, Warning.unfoundInteractionOperation);
				}
			} else {
				if(!unfoundObjects.has(event.to)) {
					unfoundObjects.add(event.to);
					reportWarning(`Could not find object ${event.to} that first appears as message target in interaction "${interName}".`, Warning.unfoundInteractionTargetObject);
				}
			}
			const source = model.getObject(event.from);
			if(!source) {
				if(!unfoundObjects.has(event.from)) {
					unfoundObjects.add(event.from);
					reportWarning(`Could not find object ${event.from} that first appears as message source in interaction "${interName}".`, Warning.unfoundInteractionSourceObject);
				}
			}
		}
		// TODO: check returns and return values?
	}


	// check keywords: operation named after?
}

export function analyzeToObject(model, keepFixes = false) {
	const errors = [];
	const warnings = [];

	function reporterMaker(target) {
		return function(message, type, fixes) {
			if(keepFixes) {
				target.push({
					message,
					type,
					fixes,
				});
			} else {
				target.push(message);
			}
		};
	}
	analyze(model, {
		reportWarning: reporterMaker(warnings),
		reportError: reporterMaker(errors),
	});

	return {errors, warnings};
}

export function autoFix(model) {
	let issues = analyzeToObject(model, true);
	function stats(msgPrefix, issues) {
		console.log("%s: found %d errors, and %d warnings.", msgPrefix, issues.errors.length, issues.warnings.length);
	}
	stats("Before fixing", issues);
	function allIssues() {
		return [...issues.errors, ...issues.warnings];
	}
	while(true) {
		const issueToFix = allIssues().find(issue => Object.entries(issue.fixes ?? {}).length > 0);
		const msg = issueToFix?.message;
		const fix = Object.entries(issueToFix?.fixes ?? {})[0];
		if(issueToFix) {
			if(fix) {
				console.log('Fixing "%s" with "%s".', msg, fix[0]);
				fix[1]();
			}
		} else {
			break;
		}
		issues = analyzeToObject(model, true);
		if(allIssues().some(issue => issue.message === msg)) {
			throw `Issue auto fix failed for "${msg}" with action "${fix[0]}".`;
		}
	}
	stats("After fixing", issues);
	return issues;
}

