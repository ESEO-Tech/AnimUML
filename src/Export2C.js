import {getTriggers, getEventName, getTriggerContexts} from './ModelUtils.js';
import {createTarEntry} from './ExportUtils.js';
import {unique, hasElements} from './Utils.js';
import {indent} from './TemplateUtils.js';
import {toExplicit} from './TransformStateMachine2Explicit.js';
import {exportModel} from './Export2AnimUML.js';
import {parser as actionsParser, expressionParser} from './JavaScriptActionLanguageParser.js';
import {transform} from './ASTUtils.js';
import {parse} from './Preprocessor.js';


export function toC(model,	{
					controllable = false,
					controlPort = 8091,
					editableModelInREADME = true,
					//animUMLServer = "https://animuml.kher.nl/",
					animUMLServer = "http://localhost:8082/",
					serializeActions = true,
					enableObservers = false,
				} = {}) {
	const comTemplates = controllable ?
/*
		mqTailqComTemplates
/*/
		tailqComTemplates
/**/
	:
		mqComTemplates;
	const context = {model, controllable, serializeActions, comTemplates};
/*
	Remarks:
		- using __ instead of _ between class name and method name for generated methods, to avoid possible collisions with model operations
			- collisions are still possible, but would require the model to have method names starting with a single _
*/
	function properties(obj) {
		return Object.entries(obj.propertyByName || {}).map(([propName, prop]) => indent`
			${prop.type ? toValidIdentifier(prop.type) : "int"} ${toValidIdentifier(propName)};
		`);
	}
	function getTaggedTriggers(obj) {
		const triggerContexts = getTriggerContexts(obj);
		const taggedTransitions =
			Object.entries(triggerContexts).flatMap(([trigger, transitions]) =>
				transitions.filter(t => hasElements(t.ports))
			)
		;
		const taggedTriggers = unique(
			taggedTransitions.map(t => t.trigger)
		);
		//console.log("taggedTransitions of", obj.name, ":", taggedTriggers);
		return taggedTriggers;
	}
	function objectToH(obj, refs) {
		const taggedTriggers = getTaggedTriggers(obj);
		const className = getClassName(obj);
		const classNameU = className.toUpperCase();
		const prefix = controllable ? className : "";
		const prefix_ = prefix ? prefix + "_" : "";
		const region = model.getBehavior(obj) || obj;
		const triggers = getTriggers(obj);
		//console.log(className, triggers)
		return indent`
			#ifndef ${classNameU}_H
			#define ${classNameU}_H

			#include "utils.h"

			typedef struct ${className} ${className};

			${controllable && model.isActive(obj) ? indent`
				${states(region, className)}
				${events(triggers, className)}
				${transitions(region, className)}
			`:""}

			${refs.map(ref => indent`
				#include "${getClassName(ref.type)}.h"
			`)}

			// reference setters
			${refs.map(ref => indent`
				${templates.refSetterSig(className, ref)};
			`)}
			// reference getters
			${refs.map(ref => indent`
				${templates.refGetterSig(className, ref)};
			`)}

			// public property getters
			${Object.entries(obj.propertyByName || {}).filter(([propName, prop]) =>
				!prop.private
			).map(([propName, prop]) =>
				`${prop.type ?? "int"} ${className}_${propName}(${className} * this);`
			)}

			${className} * ${className}_${nonModelOpPrefix}new(char * name);
			void ${className}_${nonModelOpPrefix}free(${className} * this);

			${model.isActive(obj) ? indent`
				${controllable ? templates.activeControlOperations(className, prefix) :indent`
					void ${className}_${nonModelOpPrefix}start(${className} * this);
					void ${className}_${nonModelOpPrefix}stop(${className} * this);
					void ${className}_${nonModelOpPrefix}join(${className} * this);
				`}

				${templates.publicOperations(obj, triggers, taggedTriggers, className)}
			`: // TODO: make it private?
			// But some AnimUML samples use direct access => could be rewritten in processActions
			indent`
				struct ${className} {
					char * name;
					${refs.map(ref => indent`
						${toValidIdentifier(getClassName(ref.type))} * ${toValidIdentifier(ref.name)};
					`)}
					${properties(obj)}
					${getTag(context, obj).decl}
				};

				${templates.passivePublicOperations(obj, triggers)}
			`}

			${controllable ? templates.controlOperations(className) : ""}

			#endif

		`;
	}
	function activeOp(className, name, eventName, obj, withTag = false, classHasTags = false) {
		const op = obj.operationByName[name];
		return templates.activeOperation(context, className, op, name, eventName, obj, withTag, classHasTags);
	}
	function states(region, prefix = "") {
		const prefix_ = prefix ? prefix + "_" : "";
		return templates.statesEnum(context, region, prefix, prefix_);
	}
	function events(triggers, prefix = "") {
		const prefix_ = prefix ? prefix + "_" : "";
		return templates.eventsEnum(triggers, prefix, prefix_);
	}
	function transitions(obj, prefix = "") {
		const prefix_ = prefix ? prefix + "_" : "";
		return templates.transitionTypes(obj, prefix, prefix_);
	}
	function defaultValue(prop, propName, className) {
		switch(String(prop.type)) {
		case "Boolean":
			if("defaultValue" in prop) {
				return prop.defaultValue;
			} else {
				return "FALSE";
			}
			break;
		case "int":
		case "Integer":
			if("defaultValue" in prop) {
				return prop.defaultValue;
			} else {
				return "0";
			}
			break;
		default:
			console.log(`warning: no default value for ${className}::${propName}:`, prop);
			return "0";
			break;
		}
	}
	function objectToC(obj, refs) {
		const taggedTriggers = getTaggedTriggers(obj);
		const classHasTags = hasElements(taggedTriggers);
		const className = getClassName(obj);
		const classNameU = className.toUpperCase();
		const prefix = controllable ? className : "";
		const prefix_ = prefix ? prefix + "_" : "";
		function passiveOp(op) {
			//console.log("HH", model.isPort(obj), obj.type);
			return indent`
				${passiveOpSig(op)} {
					${(serializeActions && processActions(context, obj, op.method, refs, className)) || indent`
						// no method
					`}
				}
			`;
		}
		const setters =	refs.map(ref => templates.refSetter(className, ref));
		const getters =	refs.map(ref => templates.refGetter(className, ref));
		if(model.isActive(obj)) {
			const region = model.getBehavior(obj);
			const hasAfter = allTransitions(region).some(t =>
				//model.isAfter(t)	// can only work before transformation to explicit
				t.effect?.match(/setTimer\(/)
			);
			const objectContext = {className, obj, refs, region, prefix, prefix_};

			const initState = stateName(context, region.states.find(s => s.kind === "initial"));
			const triggers = getTriggers(obj);
			const allParams =	unique(
							(obj.operations ?? []).filter(op =>	// TODO: only if active operation
								hasElements(op.parameters)
							).flatMap(op =>
								op.parameters
							).map(p =>
								typeof p === "string" ? p : p.name
							)
						);
			return indent`
				// This file is part of a project that has been generated by AnimUML from a model.
				// This file can be validated by bisimulation between the original model and this project.

				// for malloc, free
				#include <stdlib.h>
				// for printf:
				#include <stdio.h>
				${comTemplates.dependencies()}
				// for perror:
				#include <errno.h>
				// for strerror:
				#include <string.h>
				// for sleep:
				#include <unistd.h>
				${controllable ? "" :indent`
					// for pthread_*
					#include <pthread.h>
				`}

				#include "main.h"
				#include "${className}.h"
				${obj.isObserver && '#include "observers.h"'}

				#define MQ_MAX_MESSAGES		(5)
				//#define MQ_MAX_MESSAGE_LENGTH	(10)
				#define MQ_MAX_NAME_SIZE	(100)


				${controllable ? "" : states(region)}

				static char * stateNames[] = {
					"S_IGNORE",
					${region.states
//						.map(stateName)
						.map(e => e.name)
						.map(e => `"${e}",`)
					}
				};

				${controllable ? "" : events(triggers)}

				typedef struct {
					union {//__attribute__((__packed__)) {	// must be packed if using a non word-size multiple MQ_MAX_MESSAGE_LENGTH
						struct {
							${prefix}Event event;
/*
							union {
								${(obj.operations ?? []).filter(op =>
									hasElements(op.parameters)
								).map(op => indent`
									struct {	// parameters of ${op.name}
										${op.parameters.map(p =>
											`int ${typeof p === "string" ? p : p.name};`
										)}
									};
								`)}
							};
*/
							${allParams.map(p =>
								`int ${p};`	// TODO: other types
							)}
							${classHasTags ?
								`int __tag__;`
							:""}
						};
						//char chars[MQ_MAX_MESSAGE_LENGTH];
					};
				} Message;

				static char * eventNames[] = {
					"E_${prefix_}COMPLETION",
					"E_${prefix_}STOP_THREAD",
					${triggers.map(t => eventName(prefix, t)).map(e => `"${e}",`)}
				};

				static char * operationNames[] = {
					"E_${prefix_}COMPLETION",
					"E_${prefix_}STOP_THREAD",
					${triggers.map(e => `"${e}",`)}
				};

				${classHasTags ? indent`
					static char * tagNames[] = {
						${getConnectors(context, obj).map(c =>
							c.incomingTag
						).filter(e => e).map(e =>
							JSON.stringify(e)
						).join(",\n")}
					};
				`:""}

				${controllable ? "" : transitions(region)}

				${comTemplates.types("queue", "Message")}

				struct ${className} {
					char * name;
					${comTemplates.fields("queue")}
					${prefix}State currentState;
					${!controllable ? indent`
						pthread_t thread;
					`:""}
					${refs.map(ref => indent`
						${getClassName(ref.type)} * ${ref.name};
					`)}
					${properties(obj)}
				};

				${comTemplates.functions(className)}

				${controllable ? indent`
					static void emptyEventPool(${className} * this) {
						${comTemplates.transfer()}
						struct queueEntry * n1 = TAILQ_FIRST(&this->queue);
						while(n1 != NULL) {
							struct queueEntry * n2 = TAILQ_NEXT(n1, entries);
							free(n1);
							n1 = n2;
						}
						TAILQ_INIT(&this->queue);
						this->queueSize = 0;
					}
				`:""}

				${className} * ${className}_${nonModelOpPrefix}new(char * name) {
					${className} * this = malloc(sizeof(${className}));
					if(!this) {
						printf("error in ${className}_${nonModelOpPrefix}new while trying to allocate memory for %s\\n", name);
					}
					this->name = name;
					${comTemplates.init()}
					this->currentState = ${initState};
					return this;
				}

				void ${className}_${nonModelOpPrefix}free(${className} * this) {
					${comTemplates.deinit()}
					${controllable ? indent`
						emptyEventPool(this);
					`:""}
					free(this);
				}

				// reference setters
				${setters}

				// reference getters
				${getters}

				// public property getters
				${Object.entries(obj.propertyByName || {}).filter(([propName, prop]) =>
					!prop.private
				).map(([propName, prop]) => `
					${prop.type ?? "int"} ${className}_${propName}(${className} * this) {
						return this->${propName};
					}
				`)}

				${hasAfter ? indent`
					// TODO: automate this
					typedef enum {
						TO10min,
						TO1s,
						TOdelay
					} TimerId;
				`:""}

				${controllable ? indent`
					static Boolean isPrivate(${prefix}Event msg) {
						${allTransitions(region).some(t => t.trigger === "TO10min") ? indent`
							return msg == E_${prefix_}TO10MIN;	// TODO: generalize ignoring private events
						`: indent`
							return FALSE;
						`}
					}

					static struct queueEntry * findEntry(${className} * this, ${prefix}Event msg) {
						for(struct queueEntry * np = this->queue.tqh_first ; np != NULL ; np = np->entries.tqe_next) {
							if(np->msg.event == msg) {
								return np;
							}
						}
						return NULL;
					}

					static void removeEntry(${className} * this, ${prefix}Event msg) {
						// remove event
						/* TODO: and predecessors for auto ignore
						while(this->queue.tqh_first != NULL && this->queue.tqh_first->msg != transition.trigger) {
							TAILQ_REMOVE(&this->queue, this->queue.tqh_first, entries);
						}*/
						for(struct queueEntry * np = this->queue.tqh_first ; np != NULL ; np = np->entries.tqe_next) {
							if(np->msg.event == msg) {
								LOG("\t\t\tremoving %s\\n", eventNames[this->queue.tqh_first->msg.event]);
								if(!isPrivate(np->msg.event)) {
									this->queueSize--;
								}
								TAILQ_REMOVE(&this->queue, np, entries);
								free(np);
								break;
							}
						}
					}

					${hasAfter ? indent`
						static void setTimer(${className} * this, TimerId timer, char * time) {
							LOG("setTimer %s\\n", time);
							// TODO: actual timer
							${allTransitions(region).some(t => t.trigger === "TO10min") ? indent`
								struct queueEntry * entry = malloc(sizeof(struct queueEntry));
								entry->msg.event = E_${prefix_}TO10MIN;
								TAILQ_INSERT_HEAD(&this->queue, entry, entries);
								//this->queueSize++;	// should not count because it is a private event
							`: ""}
						}

						static void resetTimer(${className} * this, TimerId timer) {
							LOG("resetTimer\\n");
							${allTransitions(region).some(t => t.trigger === "TO10min") ? indent`
								removeEntry(this, E_${prefix_}TO10MIN);
							`: ""}
						}
					`:""}
				`:indent`
					${hasAfter ? indent`
						static void setTimer(${className} * this, TimerId timer, char * time) {
							LOG("setTimer %s\\n", time);
							// TODO: actual timer
							${allTransitions(region).some(t => t.trigger === "TO10min") ? indent`
								Message msg;
								msg.event  = E_${prefix_}TO10MIN;
								${comTemplates.send("a timer event")}
							`: ""}
						}

						static void resetTimer(${className} * this, TimerId timer) {
							LOG("resetTimer\\n");
						}
					`:""}
				`}

				${templates.performAction(context, objectContext)}

				${templates.evaluateGuard(context, objectContext)}

				${controllable ? indent`
					static Message * getEvent(${className} * this, ${prefix}Event msg) {
						for(struct queueEntry * np = this->queue.tqh_first ; np != NULL ; np = np->entries.tqe_next) {
							if(np->msg.event == msg) {
								return &np->msg;
							}
						}
						return NULL;
					}

					${templates.transitionTypesAndOperations(context, objectContext)}

					int ${className}_${nonModelOpPrefix}isInState(${className} * this, ${prefix}State state) {
						return this->currentState == state;
					}

					int ${className}_${nonModelOpPrefix}epContains(${className} * this, ${prefix}Event event) {
						${comTemplates.transfer()}
						return getEvent(this, event) != NULL;
					}

					int ${className}_${nonModelOpPrefix}epGetFirst(${className} * this) {
						${comTemplates.transfer()}
						int ret = -1;
						if(this->queue.tqh_first) {
							ret = this->queue.tqh_first->msg.event;
							LOG("ep_get_first %s: %d\\n", this->name, ret);
						}
						return ret;
					}

					void ${className}_${nonModelOpPrefix}reset(${className} * this) {
						this->currentState = ${initState};
						emptyEventPool(this);

						${obj.isObserver ? indent`
							// fire initial transition
							${getClassName(obj)}_${nonModelOpPrefix}fire(this, 0);
						`:""}

						// properties
						${Object.entries(obj.propertyByName || {}).map(([propName, prop]) => indent`
							this->${toValidIdentifier(propName)} = ${defaultValue(prop, propName, className)};
						`)}
					}

					int ${className}_${nonModelOpPrefix}writeConfig(${className} * this, char * buffer) {
						${comTemplates.transfer()}
						int * target = (int *)buffer;

						*(target++) = this->currentState;

						// event pool
						for(struct queueEntry * np = this->queue.tqh_first ; np != NULL ; np = np->entries.tqe_next) {
							*(target++) = np->msg.event;
							${"// TODO: only relevant arguments",""}
							${allParams.map(p =>
								`*(target++) = np->msg.${p};`
							)}
							${classHasTags ?
								`*(target++) = np->msg.__tag__;`
							:""}
						}
						*(target++) = 0;	// terminator

						// properties
						${Object.entries(obj.propertyByName || {}).map(([propName, prop]) => indent`
							*(target++) = this->${toValidIdentifier(propName)};
						`)}

						return ((char*)target) - buffer;
					}

					int ${className}_${nonModelOpPrefix}setConfig(${className} * this, char * buffer) {
						int * source = (int *)buffer;

						this->currentState = *(source++);

						emptyEventPool(this);
						int msg;
						while((msg = *(source++))) {
							struct queueEntry * entry = malloc(sizeof(struct queueEntry));
							entry->msg.event = msg;
							${"// TODO: only relevant arguments",""}
							${allParams.map(p =>
								`entry->msg.${p} = *(source++);`
							)}
							${classHasTags ?
								`entry->msg.__tag__ = *(source++);`
							:""}
							TAILQ_INSERT_TAIL(&this->queue, entry, entries);
							if(!isPrivate(entry->msg.event)) {
								this->queueSize++;
							}
						}

						// properties
						${Object.entries(obj.propertyByName || {}).map(([propName, prop]) => indent`
							this->${toValidIdentifier(propName)} = *(source++);
						`)}

						return ((char*)source) - buffer;
					}

					${"// TODO: use given config instead of current one",""}
					char * ${className}_${nonModelOpPrefix}writeParsedConfig(${className} * this, char * buffer) {
						int nbEvents = 0;
						WRITE_OBJECT(
							WRITE_STR_SLOT("name", "inst${obj.isObserver ? 'Obs' : 'Main'}_", this->name)
							WRITE_ARR_SLOT("children",
								buffer = writeSimpleObject(buffer, "cs", stateNames[this->currentState]);
								WRITE_OBJECT(
									WRITE_STR_SLOT("name", "ep")
									WRITE_ARR_SLOT("children",
										WRITE_OBJECT(
											buffer = writeSimpleSlot(buffer, "name", "eventOccurred");
											WRITE_ARR_SLOT("children",


						for(struct queueEntry * np = this->queue.tqh_first ; np != NULL ; np = np->entries.tqe_next) {
							WRITE_OBJECT(
								buffer = writeSlotBegin(buffer, "name");
									buffer = writeStringBegin(buffer, "eventOccurred[");
									ITOA(nbEvents, nbEventsString);
									buffer = writeStringMiddle(buffer, nbEventsString);
									buffer = writeStringEnd(buffer, "]");
								WRITE_ARR_SLOT("children",
									buffer = writeSimpleObject(buffer, "signalEventId", operationNames[np->msg.event]);
									${classHasTags ?
										`buffer = writeSimpleObject(buffer, "portId", np->msg.__tag__ >= 0 ? tagNames[np->msg.__tag__] : "(no port)");`
									:""}
								)
							)
							nbEvents++;
						}

											)
										)
										ITOA(nbEvents, nbEventsString);
										buffer = writeSimpleObject(buffer, "nbEvents", nbEventsString);
									)
								)
						// TODO: arguments
								WRITE_OBJECT(
									WRITE_STR_SLOT("name", "od")
									WRITE_ARR_SLOT("children",
						${Object.entries(obj.propertyByName || {}).map(([propName, prop]) => indent`
										ITOA(this->${propName}, ${propName}ValueString);
										//printf("${obj.name}->${propName} = %s\\n", ${propName}ValueString);
										buffer = writeSimpleObject(buffer, "${propName}", ${propName}ValueString);
						`)}
									)
								)
							)
						)
						${` // commented out
						buffer = writeObjectBegin(buffer);
							buffer = writeSlotBegin(buffer, "name");
								buffer = writeStringBegin(buffer, "instMain_");
								buffer = writeStringEnd(buffer, this->name);
							buffer = writeSlotBegin(buffer, "children");
								buffer = writeArrayBegin(buffer);
									buffer = writeSimpleObject(buffer, "cs", stateNames[this->currentState]);
									buffer = writeObjectBegin(buffer);
										buffer = writeSimpleSlot(buffer, "name", "ep");
										buffer = writeSlotBegin(buffer, "children");
											buffer = writeArrayBegin(buffer);
												buffer = writeObjectBegin(buffer);
													buffer = writeSimpleSlot(buffer, "name", "eventOccurred");
													buffer = writeSlotBegin(buffer, "children");
														buffer = writeArrayBegin(buffer);

						int nbEvents = 0;
						for(struct queueEntry * np = this->queue.tqh_first ; np != NULL ; np = np->entries.tqe_next) {
							buffer = writeObjectBegin(buffer);
								buffer = writeSlotBegin(buffer, "name");
									buffer = writeStringBegin(buffer, "eventOccurred[");
									char nbEventsString[MAX_INT_CHARS];
									snprintf(nbEventsString, sizeof(nbEventsString), "%d", nbEvents);
									buffer = writeStringMiddle(buffer, nbEventsString);
									buffer = writeStringEnd(buffer, "]");
								buffer = writeSlotBegin(buffer, "children");
									buffer = writeArrayBegin(buffer);
										buffer = writeSimpleObject(buffer, "signalEventId", eventNames[np->msg]);
									buffer = writeArrayEnd(buffer);
							buffer = writeObjectEnd(buffer);
							nbEvents++;
						}



														buffer = writeArrayEnd(buffer);
												buffer = writeObjectEnd(buffer);
												// writing the number of events is necessary for the conversion to an AnimUML configuration
												// because this number is necessary to interpret EMI configurations
												char nbEventsString[MAX_INT_CHARS];
												snprintf(nbEventsString, sizeof(nbEventsString), "%d", nbEvents);
												buffer = writeSimpleObject(buffer, "nbEvents", nbEventsString);
											buffer = writeArrayEnd(buffer);
									buffer = writeObjectEnd(buffer);
								buffer = writeArrayEnd(buffer);
						buffer = writeObjectEnd(buffer);
						`,""}
						return buffer;
					}
				`:indent`
					typedef struct {
						State target;
						${prefix}Action action;
					} Transition;

					${"// TODO: only one possible completion transition per state",""}
					static Transition transitions[NB_STATES][NB_EVENTS] = {
						${allTransitions(region)
						.slice(0).reverse()	// reversing for debugging purposes
						.map(trans => indent`
							// ${trans.name}
							[${stateName(context, trans.source)}][${eventName(prefix, trans.trigger)}] = {${stateName(context, trans.target)}, ${actionName(trans)}},
						`)}
					};

					static void * ${className}_${nonModelOpPrefix}run(void * this_) {
						LOG("Running an instance of ${className}\\n");
						${className} * this = (${className}*)this_;
						while(1) {
							Message msg;
							Transition transition;
							LOG("${className} in state %s\\n", stateNames[this->currentState]);
							// firing completion transitions
							while((transition = transitions[this->currentState][E_${prefix_}COMPLETION]).target != S_IGNORE) {
								if(evaluateGuard(this, transition.action, &msg)) {
									LOG("${className} fires a completion transition\\n");
									${className}_${nonModelOpPrefix}performAction(this, transition.action, msg);
									this->currentState = transition.target;
									LOG("${className} in state %s\\n", stateNames[this->currentState]);
								} else {
									//sleep(1);
								}
							}
							// waiting for a message
							${comTemplates.receive()}
							if(msg.event == E_${prefix_}STOP_THREAD) {
								break;
							}
							transition = transitions[this->currentState][msg.event];
							LOG("${className} received %s\\n", eventNames[msg.event]);
							if(transition.action) {
								${className}_${nonModelOpPrefix}performAction(this, transition.action, msg);
								this->currentState = transition.target;
							} else {
								LOG("${className} ignores the event\\n");
							}
						}
					}

					void ${className}_${nonModelOpPrefix}start(${className} * this) {
						int ret = pthread_create(&(this->thread), NULL, &${className}_${nonModelOpPrefix}run, this);
						if(ret) {
							perror("error in ${className}_${nonModelOpPrefix}start while trying to start the pthread");
						}
					}

					void ${className}_${nonModelOpPrefix}stop(${className} * this) {
						Message msg;
						msg.event = E_${prefix_}STOP_THREAD;
						${comTemplates.send(`E_${prefix_}STOP_THREAD`)}
						${className}_${nonModelOpPrefix}join(this);
					}

					void ${className}_${nonModelOpPrefix}join(${className} * this) {
						int ret = pthread_join(this->thread, NULL);
						if(ret) {
							perror("error in ${className}_${nonModelOpPrefix}join while trying to join the pthread");
						}
					}
				`}

				${triggers.map(n => activeOp(className, n, eventName(prefix, n), obj, false, classHasTags))}

				${taggedTriggers.map(n => activeOp(className, n, eventName(prefix, n), obj, true, true))}

				${(obj.operations || []).filter(op => !triggers.includes(op.name)).map(passiveOp)}

			`;
		} else { // passive objects
			return indent`
				// for malloc, free
				#include <stdlib.h>
				// for printf:
				#include <stdio.h>
				
				#include "${className}.h"

				${className} * ${className}_${nonModelOpPrefix}new(char * name) {
					${className} * ret = malloc(sizeof(${className}));
					if(!ret) {
						printf("error in ${className}_${nonModelOpPrefix}new while trying to allocate memory for %s\\n", name);
					}
					ret->name = name;
					return ret;
				}

				${setters}
				${getters}

				void ${className}_${nonModelOpPrefix}free(${className} * this) {
					free(this);
				}

				${controllable ? indent`
					void ${className}_${nonModelOpPrefix}reset(${className} * this) {
						${Object.entries(obj.propertyByName || {}).map(([propName, prop]) => indent`
							this->${toValidIdentifier(propName)} = ${defaultValue(prop, propName, className)};
						`)}
					}

					int ${className}_${nonModelOpPrefix}writeConfig(${className} * this, char * buffer) {
						char * target = buffer;

						${Object.entries(obj.propertyByName || {}).map(([propName, prop]) => indent`
							*((${toValidIdentifier(prop.type)}*)target) = this->${toValidIdentifier(propName)};
							target += sizeof(this->${toValidIdentifier(propName)});
						`)}

						//printf("${obj.name} wrote %ld bytes of config\\n", target - buffer);
						return target - buffer;
					}

					int ${className}_${nonModelOpPrefix}setConfig(${className} * this, char * buffer) {
						char * source = buffer;

						${Object.entries(obj.propertyByName || {}).map(([propName, prop]) => indent`
							this->${toValidIdentifier(propName)} = *((${toValidIdentifier(prop.type)}*)source);
							source += sizeof(this->${toValidIdentifier(propName)});
						`)}

						return source - buffer;
					}

					${"// TODO: use given config instead of current one",""}
					char * ${className}_${nonModelOpPrefix}writeParsedConfig(${className} * this, char * buffer) {
						WRITE_OBJECT(
							WRITE_STR_SLOT("name", "instMain_", this->name)
							WRITE_ARR_SLOT("children",
								WRITE_OBJECT(
									WRITE_STR_SLOT("name", "od")
									WRITE_ARR_SLOT("children",
						${Object.entries(obj.propertyByName || {}).map(([propName, prop]) => indent`
							{
								${"// TODO: proper conversion",""}
								ITOA(this->${toValidIdentifier(propName)}, str);
								buffer = writeSimpleObject(buffer, "${propName}", str);
							}
						`)}
									)
								)
							)
						)


						${` // commented out
						buffer = writeObjectBegin(buffer);
							buffer = writeSlotBegin(buffer, "name");
								buffer = writeStringBegin(buffer, "instMain_");
								buffer = writeStringEnd(buffer, this->name);
							buffer = writeSlotBegin(buffer, "children");
								buffer = writeArrayBegin(buffer);
									buffer = writeObjectBegin(buffer);
										buffer = writeSimpleSlot(buffer, "name", "od");
										buffer = writeSlotBegin(buffer, "children");
											buffer = writeArrayBegin(buffer);

						${Object.entries(obj.propertyByName || {}).map(([propName, prop]) => indent`
							{
								char str[MAX_INT_CHARS];
								snprintf(str, sizeof(str), "%d", this->${propName});	// TODO: proper conversion
								buffer = writeSimpleObject(buffer, "${propName}", str);
							}
						`)}

											buffer = writeArrayEnd(buffer);
									buffer = writeObjectEnd(buffer);
								buffer = writeArrayEnd(buffer);
						buffer = writeObjectEnd(buffer);
						`,""}
						return buffer;
					}

					${(obj.operations || []).map(passiveOp)}
				`:""}
			`;
		}
	}
	var ret = [];
	ret.fill(0, 0, 256);

	const path = `${model.name}/`;
	const objects = model.objects.filter(o => enableObservers || !o.isObserver);
	const activeObjects = objects.filter(obj => model.isActive(obj));
	const observers = model.objects.filter(o => enableObservers && o.isObserver);

	const exportedModel = exportModel(model);
	exportedModel.settings = exportedModel.settings || {};
	exportedModel.settings.tools = exportedModel.settings.tools || {};
	exportedModel.settings.tools.defaultRemoteEngineURL = `ws://localhost:${controlPort}/`;
	//		watchExpressions: undefined,	// because the generated code does not support the EVALUATE_ATOMS command

	return objects.map(obj => {
		const refs = (model.connectors ?? []).filter(c => c.ends.some(e =>
			e == obj
		)).map(c => {
			const idx = c.ends.findIndex(e => e.name !== obj.name);
			const type = c.ends[idx];
			const name = c.endNames?.[idx] ?? type.name;
			return {name, type};
		});
		// TODO: use a version of toExplicit that does not translate guards?
		const sm =
/*
			obj
/*/
			toExplicit(obj, model)
/**/
		;
		return	createTarEntry(`${path}${getClassName(obj)}.c`, objectToC(sm, refs))
		+
			createTarEntry(`${path}${getClassName(obj)}.h`, objectToH(sm, refs));
	}).join("") + createTarEntry(`${path}main.c`, indent`
		#include <stdio.h>

		#include "main.h"
		#include "utils.h"

		${model.name === "UML2AnimUML_CruiseControlv4" ? indent`
			// for the EMI action language
			// TODO: generalize this (currently for CruiseControlv4)
			static struct ENV env = {};
			static struct CCI cci = {};
			static struct ROOT instMain = {.env = &env, .cci = &cci};
			struct ROOT * ROOT_instMain = &instMain;
		`:""}

		${controllable ? indent`
			fireFunctionType fireFunctions[${activeObjects.length}];
			Object * activeObjects[${activeObjects.length}];
			char ** activeObjectTransitionNames[${activeObjects.length}];

			void getFireables(allFireablesCallback callback) {
				LOG("\tListing fireable transitions\\n");
				int objectId = 0;
				fireFunctionType fireFunction;
				void * object;
				void innerCallback(int transId, char * objName, char * transName) {
					callback(objectId, transId, objName, transName, fireFunction, object);
				}
				${activeObjects.filter(o => !o.isObserver).map(obj => indent`
					fireFunction = (fireFunctionType)${getClassName(obj)}_${nonModelOpPrefix}fire;
					object = ${obj.name};
					${getClassName(obj)}_${nonModelOpPrefix}getFireables(${obj.name}, innerCallback);
					objectId++;
				`)}
			}

			typedef enum {
				WAIT_COMMAND,
				WAIT_FIRE,
				SEND_CONFIG,
				WAIT_PARSE_CONFIG,
				WAIT_PARSE_TRANSITION,
				SEND_PARSED_CONFIG,
				SEND_PARSED_TRANSITION,
				SEND_FIREABLES,
				WAIT_SET_CONFIG,
				SEND_ATOMS,
			} State;

			int lws_callback_http_dummy(struct lws *wsi, enum lws_callback_reasons reason, void *__user, void *in, size_t len) {
				${"// TODO: use wsi, or make sure we have at most one client at a given time",""}
				static State state = WAIT_COMMAND;
				static int transitionToParse[2];
				static unsigned char buf[100000];
				// lws_write expects LWS_PRE valid bytes in the buffer before resp!!!
				static unsigned char * bufStart = buf + LWS_PRE;

				switch (reason) {
				case LWS_CALLBACK_GET_THREAD_ID:
					// ignore
					break;
				case LWS_CALLBACK_HTTP:
					lws_serve_http_file( wsi, "README.html", "text/html", NULL, 0 );
					break;
				case LWS_CALLBACK_RECEIVE:
					switch(state) {
					case WAIT_COMMAND:{
						char * c;
						if(strcmp("GET_CONFIGURATION", (char*)in) == 0) {
							state = SEND_CONFIG;
							lws_callback_on_writable_all_protocol(lws_get_context(wsi), lws_get_protocol(wsi));
						} else if(c="EVALUATE_ATOMS:",strncmp(c, (char*)in, strlen(c)) == 0) {
							state = SEND_ATOMS;
							lws_callback_on_writable_all_protocol(lws_get_context(wsi), lws_get_protocol(wsi));
						} else if(strcmp("PARSE_CONFIGURATION", (char*)in) == 0) {
							state = WAIT_PARSE_CONFIG;
						} else if(strcmp("SET_CONFIGURATION", (char*)in) == 0) {
							state = WAIT_SET_CONFIG;
						} else if(strcmp("PARSE_TRANSITION", (char*)in) == 0) {
							state = WAIT_PARSE_TRANSITION;
						} else if(strcmp("RESET", (char*)in) == 0) {
							${objects.map(obj => indent`
								${getClassName(obj)}_${nonModelOpPrefix}reset(${obj.name});
							`)}
						} else if(strcmp("FIRE", (char*)in) == 0) {
							state = WAIT_FIRE;
						} else if(strcmp("GET_FIREABLES", (char*)in) == 0) {
							state = SEND_FIREABLES;
							lws_callback_on_writable_all_protocol(lws_get_context(wsi), lws_get_protocol(wsi));
						} else {
							printf("error: unexpected command %ld:%s\\n", len, (char*)in);
							exit(1);
						}
						}break;
					case WAIT_PARSE_CONFIG:{
						// WARNING: the PARSE_CONFIGURATION command changes the configuration
						int offset = 0;

						${objects.map(obj => indent`
							offset += ${getClassName(obj)}_${nonModelOpPrefix}setConfig(${obj.name}, in + offset);
						`)}
						LOG("set config for parsing: %d bytes, %ld\\n", offset, len);

						${"// TODO: restore configuration for parseConfiguration to have no effect?",""}

						state = SEND_PARSED_CONFIG;
						lws_callback_on_writable_all_protocol(lws_get_context(wsi), lws_get_protocol(wsi));
						break;
					}
					case WAIT_PARSE_TRANSITION:
						transitionToParse[0] = ((int*)in)[0];
						transitionToParse[1] = ((int*)in)[1];
						state = SEND_PARSED_TRANSITION;
						lws_callback_on_writable_all_protocol(lws_get_context(wsi), lws_get_protocol(wsi));
						break;
					case WAIT_SET_CONFIG:{
						int offset = 0;

						${objects.map(obj => indent`
							offset += ${getClassName(obj)}_${nonModelOpPrefix}setConfig(${obj.name}, in + offset);
						`)}
						LOG("set config: %d bytes, %ld\\n", offset, len);

						state = WAIT_COMMAND;
						}break;
					case WAIT_FIRE:{
						int objectId = ((int*)in)[0];
						int transId = ((int*)in)[1];
						LOG("firing %d.%d\\n", objectId, transId);
						fireFunctions[objectId](activeObjects[objectId], transId);

						${templates.stepMonitors(observers)}

						state = WAIT_COMMAND;
						}break;
					default:
						printf("error: received something while in %d: %s\\n", state, (char*)in);
						exit(1);
						break;
					}
					break;
				case LWS_CALLBACK_SERVER_WRITEABLE:
					switch(state) {
					case SEND_PARSED_CONFIG:{
						bufStart[0] = ',';	// to make sure JSON helpers will not insert a comma
						unsigned char * resp = bufStart + 1;
						unsigned char * buffer = resp;
						buffer = writeObjectBegin(buffer);
							buffer = writeSimpleSlot(buffer, "name", "store");
							buffer = writeSlotBegin(buffer, "children");
								buffer = writeArrayBegin(buffer);

									${objects.map(obj => indent`
										buffer = ${getClassName(obj)}_${nonModelOpPrefix}writeParsedConfig(${obj.name}, buffer);
									`)}

								buffer = writeArrayEnd(buffer);
						buffer = writeObjectEnd(buffer);
						*(buffer++) = '\\0';
						LOG("Sending (%ld): %s\\n", buffer - resp, resp);

						if(buffer - resp > sizeof(buf) - LWS_PRE) {
							printf("error while sending too big parsed config of size %ld", buffer - resp);
							exit(1);
						}

						lws_write(wsi, resp, strlen(resp), LWS_WRITE_TEXT);
						state = WAIT_COMMAND;
						}break;
					case SEND_CONFIG:{
						unsigned char * resp = bufStart;
						int offset = 0;

						${objects.map(obj => indent`
							offset += ${getClassName(obj)}_${nonModelOpPrefix}writeConfig(${obj.name}, resp + offset);
						`)}
						LOG("wrote config: %d bytes, %ld\\n", offset, sizeof(int));

						if(offset > sizeof(buf) - LWS_PRE) {
							printf("config larger: %d than expected: %ld\\n", offset, sizeof(buf) - LWS_PRE);
							exit(1);
						}

						lws_write(wsi, resp, offset, LWS_WRITE_BINARY);
						state = WAIT_COMMAND;
						}break;
					case SEND_FIREABLES:{
						int nbFireables = 0;
						void count(int objectId, int transId, char * objName, char * transName, fireFunctionType fireFunction, void * object) {
							nbFireables++;
						}
						getFireables(count);
						unsigned char * resp = bufStart;
						snprintf(resp, sizeof(buf) - LWS_PRE, "%d", nbFireables);
						lws_write(wsi, resp, strlen(resp), LWS_WRITE_TEXT);


						nbFireables = 0;
						void send(int objectId, int transId, char * objName, char * transName, fireFunctionType fireFunction, void * object) {
							int * resp = (int *)bufStart;
							LOG("SENDING_FIREABLE %s.%s as %d.%d\\n", objName, transName, objectId, transId);
							resp[0] = objectId;
							resp[1] = transId;

							// only the first lws_write (above) is guaranteed to be ok, so we must check and wait for the others
							while(lws_send_pipe_choked(wsi));
							lws_write(wsi, bufStart, 2 * sizeof(int), LWS_WRITE_BINARY);
						}
						getFireables(send);

						state = WAIT_COMMAND;
						}break;
					case SEND_PARSED_TRANSITION:{
						int objectId = transitionToParse[0];
						int transId = transitionToParse[1];
						LOG("parsing %d.%d\\n", objectId, transId);
						sprintf(bufStart, "%s.%s", activeObjects[objectId]->name, activeObjectTransitionNames[objectId][transId]);
						lws_write(wsi, bufStart, strlen(bufStart), LWS_WRITE_TEXT);
						state = WAIT_COMMAND;
						}break;
					case SEND_ATOMS:{
						sprintf(bufStart, "[\\"atom evaluation is unsupported by generated code\\"]");
						lws_write(wsi, bufStart, strlen(bufStart), LWS_WRITE_TEXT);
						state = WAIT_COMMAND;
						}break;
					default:
						printf("error: writable while in %d\\n", state);
						break;
					}
					break;
				default:
					//printf("lws_callback reason=%d, len=%ld\\n", reason, len);
					break;
				}
				return 0;
			}

			void printFireable(int objectId, int transId, char * objName, char * transName, fireFunctionType fireFunction, void * object) {
				printf("\t\t%s.%s\\n", objName, transName);
			}

			void listFireables() {
				getFireables(printFireable);
			}
		`:""}

		int main(int argc, char ** argv) {
			${templates.initModel(context, objects)}
			${model.name === "UML2AnimUML_CruiseControlv4" ? indent`
				${"// TODO: generalize this (currently for CruiseControlv4)",""}
				ROOT_instMain->env->engine =
					env_engine;
					//env_Env_engine;
				ROOT_instMain->cci->actuation =
					cci_actuation;
					//cci_CCI_actuation;
			`:""}

			${controllable ? indent`
				${controllable && !false ? indent`
					static struct lws_protocols protocols[] = {
						{ "lws-minimal", lws_callback_http_dummy, 0, 0 },
					//	LWS_PLUGIN_PROTOCOL_MINIMAL,
						{ NULL, NULL, 0, 0 } /* terminator */
					};

					lws_set_log_level(LLL_ERR | LLL_WARN | LLL_NOTICE, NULL);
					struct lws_context_creation_info info;
					memset(&info, 0, sizeof info);
					info.port = ${controlPort};
					info.gid = -1;
					info.uid = -1;
					info.protocols = protocols;
					struct lws_context * context = NULL;
					do {
						context = lws_create_context(&info);
					} while(context == NULL && info.port++ < 30000);
					if(context == NULL) {
						printf("error: libwebsockets init failed\\n");
						return -1;
					}
					int n = 0;
					while(n >= 0) {
						n = lws_service(context, 5000);
					}
				`:""}

/*
				printf("Controlling a simple execution\\n");
				listFireables();
				Button_${nonModelOpPrefix}fire(button, Button_A_TINITIALOFF);
				listFireables();
				//Button_${nonModelOpPrefix}fire(button, Button_A_TINITIALOFF);
				Lamp_${nonModelOpPrefix}fire(lamp, Lamp_A_TINITIALOFF);
				listFireables();
				Button_${nonModelOpPrefix}fire(button, Button_A_T1);

				Button_${nonModelOpPrefix}fire(button, Button_A_T2);
				listFireables();
				listFireables();
				Lamp_${nonModelOpPrefix}fire(lamp, Lamp_A_TOFFON);
				listFireables();
				Button_${nonModelOpPrefix}fire(button, Button_A_T2);
				listFireables();
				listFireables();
*/
			`:indent`
				LOG("Starting\\n");
				${activeObjects.map(obj => indent`
					${getClassName(obj)}_${nonModelOpPrefix}start(${obj.name});
				`)}

				LOG("Joining\\n");
				${activeObjects.map(obj => indent`
					${getClassName(obj)}_${nonModelOpPrefix}join(${obj.name});
				`)}
			`}

			LOG("Deleting\\n");
			${objects.map(obj => indent`
				${getClassName(obj)}_${nonModelOpPrefix}free(${obj.name});
			`)}

			return 0;
		}
	`) + createTarEntry(`${path}utils.c`, indent`
		// for strerror:
		#include <string.h>
		// for perror:
		#include <errno.h>
		// for printf:
		#include <stdio.h>

		#include "utils.h"

		int mq_is_empty(void * object_) {
			Object * object = (Object*)object_;
			${comTemplates.nbMessages("object")}
			LOG("\t\t\tObject %s has %ld events in its event pool\\n", object->name, nbMsgs);
			return nbMsgs == 0;
		}

		int ep_is_empty(void * object_) {
			Object * object = (Object*)object_;
			${controllable ? indent`
				return object->queueSize == 0;
			`:indent`
				return mq_is_empty(object_);
			`}
		}

		${controllable ? indent`
			char * writeComma(char * buffer) {
				*(buffer++) = ',';
				return buffer;
			}
			char * writeObjectBegin(char * buffer) {
				if(*(buffer - 1) != '[' && *(buffer - 1) != ',') {
					buffer = writeComma(buffer);
				}
				*(buffer++) = '{';
				return buffer;
			}
			char * writeObjectEnd(char * buffer) {
				*(buffer++) = '}';
				return buffer;
			}
			char * writeArrayBegin(char * buffer) {
				*(buffer++) = '[';
				return buffer;
			}
			char * writeArrayEnd(char * buffer) {
				*(buffer++) = ']';
				return buffer;
			}
			char * writeString(char * buffer, char * string) {
				*(buffer++) = '"';
				while(*(buffer++) = *(string++));
				*(buffer - 1) = '"';
				return buffer;
			}
			char * writeStringBegin(char * buffer, char * string) {
				*(buffer++) = '"';
				while(*(buffer++) = *(string++));
				return buffer - 1;
			}
			char * writeStringMiddle(char * buffer, char * string) {
				while(*(buffer++) = *(string++));
				return buffer - 1;
			}
			char * writeStringEnd(char * buffer, char * string) {
				while(*(buffer++) = *(string++));
				*(buffer - 1) = '"';
				return buffer;
			}
			char * writeSlotBegin(char * buffer, char * name) {
				if(*(buffer - 1) != '{' && *(buffer - 1) != ',') {
					buffer = writeComma(buffer);
				}
				buffer = writeString(buffer, name);
				*(buffer++) = ':';
				return buffer;
			}
			char * writeSimpleSlot(char * buffer, char * name, char * value) {
				buffer = writeSlotBegin(buffer, name);
				buffer = writeString(buffer, value);
				return buffer;
			}
			char * writeSimpleObject(char * buffer, char * name, char * value) {
				buffer = writeObjectBegin(buffer);
					buffer = writeSimpleSlot(buffer, "name", name);
					buffer = writeComma(buffer);
					buffer = writeSimpleSlot(buffer, "value", value);
				buffer = writeObjectEnd(buffer);
				return buffer;
			}
		`:""}
	`) + createTarEntry(`${path}utils.h`, indent`
		#ifndef UTILS_H
		#define UTILS_H

		#define MAX_INT_CHARS (12)


		//#define LOGGING
		#ifdef LOGGING
			#define LOG(format, ...) printf(format, ##__VA_ARGS__)
		#else
			#define LOG(format, ...) while(0)
		#endif

		${comTemplates.dependencies()}
		${indent`
			// for TAILQ_*
			#include <sys/queue.h>
		`,""}

		${controllable ? indent`
			#include <libwebsockets.h>

			typedef void (*fireablesCallback)(int transId, char * objName, char * transName);
			typedef void (*fireFunctionType)(void*, int);
			typedef void (*allFireablesCallback)(int objectId, int transId, char * objName, char * transName, fireFunctionType fireFunction, void * object);
		`:""}

		// action language
		#define GET(obj, attr) ((obj)->attr)
		#define SET(obj, attr, val) ((obj)->attr = (val))
		#define INC(obj, attr, val) ((obj)->attr += (val))
		#define DEC(obj, attr, val) ((obj)->attr -= (val))

		// introspection extensions
			// for some AnimUML examples
		//#define EP_IS_EMPTY(objName) (ep_is_empty(this->objName))
			// for some EMI examples
		#define EP_IS_EMPTY(objName) (ep_is_empty(objName))

		int ep_is_empty(void * object);

		int mq_is_empty(void * object);

		// some types
		typedef int Boolean;
		#define TRUE (1)
		#define FALSE (0)
		typedef int Integer;

		${controllable ? indent`
			struct GenericMessage {
				int event;
			};

			${comTemplates.types("genericQueue", "struct GenericMessage")}
		`:""}

		// all active objects have the same initial layout starting with their name and event pool
		typedef struct {
			char * name;
			${comTemplates.fields("genericQueue")}
		} Object;

		// JSON helpers
		char * writeSimpleObject(char * buffer, char * name, char * value);
		char * writeObjectBegin(char * buffer);
		char * writeObjectEnd(char * buffer);
		char * writeArrayBegin(char * buffer);
		char * writeArrayEnd(char * buffer);
		char * writeComma(char * buffer);
		char * writeStringBegin(char * buffer, char * string);
		char * writeStringMiddle(char * buffer, char * string);
		char * writeStringEnd(char * buffer, char * string);
		char * writeString(char * buffer, char * string);
		char * writeSlotBegin(char * buffer, char * name);
		char * writeSimpleSlot(char * buffer, char * name, char * value);

		#define WRITE_OBJECT(contents)	{						\\
			buffer = writeObjectBegin(buffer);					\\
			contents								\\
			buffer = writeObjectEnd(buffer);					\\
		}
		#define WRITE_STR_SLOT(name, ...) {						\\
			buffer = writeSlotBegin(buffer, name);					\\
			char * arr[] = {__VA_ARGS__};						\\
			int size = sizeof(arr)/sizeof(*arr);					\\
			for(int i = 0 ; i < size ; i++) {					\\
				if(i == 0 && i == size - 1) {					\\
					buffer = writeString(buffer, arr[i]);			\\
				} else if(i == 0) {						\\
					buffer = writeStringBegin(buffer, arr[i]);		\\
				} else if(i == size - 1) {					\\
					buffer = writeStringEnd(buffer, arr[i]);		\\
				} else {							\\
					buffer = writeStringMiddle(buffer, arr[i]);		\\
				}								\\
			}									\\
		}
		#define WRITE_ARR_SLOT(name, contents)	{					\\
			buffer = writeSlotBegin(buffer, name);					\\
			buffer = writeArrayBegin(buffer);					\\
			contents								\\
			buffer = writeArrayEnd(buffer);						\\
		}

		#define ITOA(v, var) 								\\
			char var[MAX_INT_CHARS];						\\
			snprintf(var, sizeof(var), "%d", v)

		#endif
	`) + createTarEntry(`${path}main.h`, indent`
		${unique(objects.map(obj =>
			getClassName(obj)
		)).map(clName => indent`
			#include "${clName}.h"
		`)}

		${model.name === "UML2AnimUML_CruiseControlv4" ? indent`
			${"// TODO: generalize this (currently for CruiseControlv4)",""}
			struct ENV {
				Engine * engine;
			};

			struct CCI {
				Actuation * actuation;
				CruiseSpeedManager * csm;
			};

			struct ROOT {
				struct ENV * env;
				struct CCI * cci;
			};

			struct ROOT * ROOT_instMain;

		`:""}

		${objects.map(obj => indent`
			${getClassName(obj)} * ${obj.name};
		`)}
	`) + createTarEntry(`${path}observers.h`, indent`
		// EMI-compatible action language observation extensions

		${"// TODO: what about when there are multiple signals with the same name? How does EMI solve this issue?",""}
		${activeObjects.flatMap(o =>
			getTriggers(o).map(t => indent`
				#define SIGNAL_${t} ${eventName(getClassName(o), t)}
			`)
		)}
	`) + createTarEntry(`${path}Makefile`, templates.makefile(context, objects)) + createTarEntry(`${path}README.html`, indent`
		<p>
			This archive was generated by the AnimUML C code generator.
		</p>
		<p>
			To build, use the <code>make</code> command.
			To run, use the <code>make run</code> command.
			${controllable ? indent`
				The main dependency is <a href="https://libwebsockets.org/">libwebsockets</a>, which may be installed with a command similar to: <code>sudo apt install libwebsockets-dev</code> (depending on your operating system and distribution).
			`:""}
		</p>
		<p>
			The contents of this README.html file is better viewed in a web browser.
			${controllable ? indent`
				It can either be opened as a simple file, or by first running the code (<code>make run</code>), and navigating to <a href="http://localhost:${controlPort}">the built-in web server</a>.
				Note that this built-in web server is mostly used to make it possible to control execution of the code from AnimUML over a WebSocket.
			`:""}
		</p>
		<p>
			The model used as source for code generation can be seen below (provided the AnimUML server URL is correctly).
			The AnimUML server URL as well as the model can be modified by editing this README.html file.
			${editableModelInREADME ? indent`
				<script>
					const animUMLServer = "${animUMLServer}";
					const model =
						${JSON.stringify(exportedModel, null, 2)}
					;
					document.write(\`
						<iframe width="100%", height="100%" src="\${animUMLServer}AnimUML.html#\${
							encodeURIComponent(
								JSON.stringify(model)
							)
						}">
					\`);
				</script>
			`:indent`
				<iframe width="100%", height="100%" src="\${animUMLServer}AnimUML.html#${
					encodeURIComponent(
						JSON.stringify({
							...exportedModel,
					//		watchExpressions: undefined,	// because the generated code does not support the EVALUATE_ATOMS command
						})
					)
				}">
				</iframe>
			`}
		</p>
	`);
/*
	TODO: README
		sudo apt install libwebsockets-dev
*/
}

// TODO: use the JavaScript serializer by making it extensible?
function serializeCActions(statements) {
//	console.log("SERi", statements);
	const ret = statements.map(serializeStatement);
//	console.log("SERo", ret.join("\n"));
	return ret.join("\n");
}

function serializeStatement(statement) {
	if(typeof statement === "string") {
		return statement;
	}
	//console.log("SER1", statement)
	switch(String(statement.type)) {
	case "block":
		return indent`
			{
				${serializeCActions(statement.statements)}
			}
		`;
	case "doStat":
		return indent`
			do
				${serializeStatement(statement.statement)}
			while(${serializeCExpression(statement.condition)});
		`;
	case "ifStat":
		return indent`
			if(${serializeCExpression(statement.condition)})
				${serializeStatement(statement.thenStat)}
			${statement.elseStat ? indent`
				else
					${serializeStatement(statement.elseStat)}
			`:""}
		`;
	case "expressionStat":
		return serializeCExpression(statement.expression) + ";";
	default:
		console.log("ERROR: unsupported statement type:", statement.type, statement);
		return `TODO: ${statement.type}`;
	}
}

function serializeCExpression(expression, context) {
	if(typeof expression === "string") {
		return expression;
	}
	//console.log("SERe", expression)
	switch(String(expression.type)) {
	case "assign":
	case "binaryOpExp":
		return `(${serializeCExpression(expression.source ?? expression.left)} ${expression.op} ${serializeCExpression(expression.right)})`;
	case "prefixUnaryExp":
		return `(${expression.op}(${serializeCExpression(expression.expression)}))`;
	case "postfixUnaryExp":
		return `((${serializeCExpression(expression.expression)})${expression.op})`;
	case "thisExp":
		return "this";
	case "variableExp":
		return expression.name;
		break;
	case "booleanExp":
		return expression.value ? "TRUE" : "FALSE";
		break;
	case "stringExp":
	case "numberExp":
		return JSON.stringify(expression.value);
		break;
	case "memberAccessExp":
		return `${serializeCExpression(expression.source ?? expression.left)}.${expression.propertyName}`;
	case "functionCallExp":
		return `${serializeCExpression(expression.source ?? expression.left)}(${(expression.args ?? []).map(serializeCExpression).join(", ")})`;
		break;
	case "computedMemberAccessExp":
		return `${serializeCExpression(expression.source ?? expression.left)}[${serializeCExpression(expression.propertyName)}]`;
		break;
	case "lambdaExp":
		return `(${expression.params.map(p => p.name)}) => ${expression.body}`;
		break;
	default:
		console.log("ERROR: unsupported expression type:", expression.type, expression);
		throw "ERROR"
		return `(TODO: ${expression.type})`
		break;
	}
}

const nonModelOpPrefix = "_";
function getClassName(obj) {
	return obj.class ?? obj.name + "Class";
}
	// TODO: handle expressions (for guards) separately
	function processActions(context, object, actions, refs, className, isExpr) {
		const {model, controllable} = context;
		if(!actions) return actions;
		function getTypeOf(targetName) {
			const ref = refs.find(ref => ref.name === targetName.trim());
			if(ref) {
				return getClassName(ref.type);
			} else {
				return undefined;
			}
		}
		try {
//*
			const debugActions = false;
			if(debugActions) console.log(actions)

			const ast = parse(isExpr ? expressionParser : actionsParser, actions.replace(/::/g, "."), undefined, {});

			if(debugActions) console.log(JSON.stringify(ast, null, 2));

			actions = (isExpr ? serializeCExpression : serializeCActions)(transform(ast, {
				expressionStat(s, trans) {
					if(s.expression.type === "variableExp") {
						// useless + may cause issues if it is a type
						return "";
					} else {
						return {type: s.type, expression: trans(s.expression)};
					}
				},
				variableExp(e) {
					return {...e, name: toValidIdentifier(e.name)};
				},
				memberAccessExp(e) {
					const propertyName = toValidIdentifier(e.propertyName);
					if((e.left ?? e.source).type === "thisExp") {
						return `this->${propertyName}`;
					} else {
						return {...e, propertyName};
					}
				},
				functionCallExp(e, trans) {
					const {type, left, source, args} = e;
					const f = left ?? source;
					if(f.type === "memberAccessExp" && (f.left ?? f.source).type === "variableExp") {
						const targetName = (f.left ?? f.source).name;
						const opName = toValidIdentifier(f.propertyName);
						if(targetName === "console" && (opName === "log" || opName === "error")) {
							return {
								type,
								left: {
									type: "variableExp",
									name: "printf",
								},
								args,
							};
						} else {
							const contextName = toValidIdentifier(getTypeOf(targetName));
							if(contextName) {
								return {
									type,
									left: {
										type: "variableExp",
										name: `${contextName}_${opName}`,
									},
									args: ["this->" + toValidIdentifier(targetName), ...args.map(trans) ?? []],
								};
							} else {
								return e;
							}
						}
					} else if(f.type === "variableExp") {
						switch(String(f.name)) {
						case "SEND":
						case "CALL":{
							// TODO
							let [target, {name: opName}, ...actualArgs] = args;

							let contextName, actualTarget;
							switch(String(target.type)) {
							case "thisExp":
								contextName = className;
								actualTarget = "this";
								break;
							case "functionCallExp":
								// TODO: not assuming it is a GET(this, targetName)
								//console.log(actions)
								//console.log(target)
								const targetName = target.args[1].name;
								//console.log(targetName)
/*
								contextName = getTypeOf(targetName);
								actualTarget = "this->" + targetName;
/*/
								const navResult = model.navigateThroughPorts(object, model.getObjectRelative(object, targetName), false);
								contextName = navResult.target.class;
								actualTarget = "this->" + targetName + navResult.traversedProperties.map(p => `->${p}`).join("");
								// TODO: fix this... the tag cannot be known statically
								// each port must have its tag name... even though navigateThroughPorts returns a tag, this is supposed to be used on objects (in interpreter), not classes (in this generator)
								if(false && hasElements(navResult.traversedProperties)) {
									const lastTraversedObj = navResult.traversedObjects.at(-1);
									const gatedTransitions = lastTraversedObj.transitions
													.filter(t => t.trigger === opName)
													.filter(t => hasElements(t.ports));
									if(hasElements(gatedTransitions)) {
										const prevTraversedObj = navResult.traversedObjects.at(-2);
										if(model.isPort(prevTraversedObj)) {
											console.log("traversed:", prevTraversedObj.name);
											console.log(gatedTransitions.map(t => t.name))
											const incomingTag = navResult.traversedConnectors.at(-1).incomingTag;
											opName = `${opName}_via_${incomingTag}`;
											
										}
									}
								}
								if(debugActions) console.log("HERE:", object.name, contextName, targetName, actualTarget, opName, navResult);
								// => working on a better solution:
								if(navResult.tag) {
									actualArgs.push("this->" + targetName + navResult.traversedProperties.slice(0, -1).map(p => `->${p}`).join("") + "->incomingTag");
									opName += "WithTag";
								}
/**/
								break;
							default:
								throw "Unsupported SEND||CALL target type: " + target.type;
							}
							return {
								type,
								left: {
									type: "variableExp",
									name: escOpName(contextName, opName),//`${contextName}_${opName}`,
								},
								args: [actualTarget, ...actualArgs],
							};
						}
						case "GET_ACTIVE_PEER":
							function getObject(e) {
								switch(String(e.type)) {
									case "functionCallExp":
										if(e.source.type === "variableExp" && e.source.name === "GET" && e.args[1].type === "variableExp") {
											const obj = getObject(e.args[0]);
											const propName = e.args[1].name;
											if(obj) {
												return `${obj}_${propName}`;
											} else {
												return propName;
											}
										}
										break;
									case "variableExp":
										if(e.name === "ROOT_instMain") {
											return "";
										}
										break;
									default:
										break;
								}
								throw "Unsupported expression type in GET_ACTIVE_PEER object expression: " + JSON.stringify(e);
							}
							const obj = model.getObject(getObject(args[0]));
							const targetName = args[1].name;
							const navResult = model.navigateThroughPorts(obj, model.getObjectRelative(obj, targetName), false)
							//console.log("GET_ACTIVE_PEER:", obj.name, targetName, navResult);
							//contextName = navResult.target.class;
							const actualTarget = `${getClassName(obj)}_get_${targetName}(${obj.name})` + navResult.traversedProperties.map(p => `->${p}`).join("");
							const contextName = navResult.target.class;
							//console.log(actualTarget);
							return {name: actualTarget, contextName};
						case "EP_GET_FIRST":{
							const obj = trans(args[0]);
							const className = obj.contextName;

							return `${className}_${nonModelOpPrefix}epGetFirst(${obj.name})`;
							break;
						}
						case "GET":
							// TODO: handle here, or let the macro do its job?
							return e;
						case "IS_IN_STATE":{
							const staten = serializeCExpression(args[1]);
							const state = model.getState(staten);
							const obj = model.getStateObject(state);
							const className = getClassName(obj);

							return `${className}_${nonModelOpPrefix}isInState(${obj.name}, ${stateName(context, state)})`;
							break;
						}
						case "EP_CONTAINS":{
							const obj = model.getObject(args[0].name);
							const className = getClassName(obj);
							const ev = args[1].name;

							return `${className}_${nonModelOpPrefix}epContains(${obj.name}, ${eventName(className, ev)})`;
							break;
						}
						case "EP_IS_EMPTY":
							// TODO: force arg to be a variableExp
							if(args[0].type === "variableExp") {
								return {
									type,
									left: f,
									args: ["this->" + toValidIdentifier(args[0].name)],
								};
							} else {
								return {
									type,
									left: f,
									args: args.map(trans),
								};
							}
						case "setTimer":
						case "resetTimer":
							return {
								type,
								left: f,
								args: ["this", ...args],
							};
						default:
							if(f.name.match(/GUARD_/)) {
								// probably a call to a guard function generated by toExplicit
								return {
									type,
									left: {
										type: "variableExp",
										name: `${className}_${f.name}`,
									},
									args: ["this", ...args?.map(trans) ?? []],
								};
							} else {
								return {
									...e,
									args: args.map(trans),
								};
							}
						}
					} else {
						return e;
					}
				},
			}));
			if(debugActions) console.log(actions)
			return actions;
/*/
			// trying to do something with regexes, but really impossible in the general case
			const ret = actions
				?.replace(/console.(?:log|error)\(((?:[^)]|[)][^;])*)\);/g, 'printf($1"\\n");')
				?.replace(/([A-Za-z_][A-Za-z_0-9]*)\.([A-Za-z_][A-Za-z_0-9]*)\([^)]*\)/g, (all, targetName, opName) => {
					//console.log(all, targetName, opName);
					return `${getTypeOf(targetName)}_${opName}(this->${targetName});`
				})
				?.replace(/(?:SEND|CALL)\(GET\(this,([^,]*)\),([^,)]*)((,[^,)]*)*)\);/g, (all, targetName, opName, params) => {
					//console.log("MATCHED1", all, targetName, opName, params);
					const ret = indent`
						${getClassName(refs.find(ref => ref.name === targetName.trim()).type)}_${opName.trim()}(this->${targetName}${params});
					`;
					//console.log("\t", ret);
					return ret;
				})
				?.replace(/EP_IS_EMPTY\(([A-Za-z_][A-Za-z0-9_]*)\)/, (all, arg) => {
					return `EP_IS_EMPTY(this->${arg})`;
				})
				?.replace(/GET\(([^,]*),([^,]*)\)/, (all, a, b) => {
					a = a.trim();
					b = b.trim();
					if(a !== "this") {
						return `${getTypeOf(a)}_${b}(this->${a})`;
					} else {
						return all;
					}
				})
				?.replace(/(?:SEND|CALL)\(this,([^,]*)(,[)]*)?\);/g, (all, opName, args) => {
					//console.log("MATCHED2", all);
					const ret = indent`
						${className}_${opName.trim()}(this->${targetName}${args});
					`;
					//console.log("\t", ret);
					return ret;
				})
				?.replace(/((?:re)?setTimer)\(([^)]*)\);/g, '$1(this, $2);')
				?.replace(/await /g, '')
			;
			//console.log("REWROTE", actions, "INTO", ret)
			return ret;
/**/
		} catch(e) {
			console.log("Parsing", actions, "from", object.name, "as", isExpr ? "expression" : "statements");
			throw e;
			console.log(e)
			return actions;
		}
	}
	function toValidIdentifier(s) {
		if(s) {
			// TODO: switch to the "normalize" solution from https://stackoverflow.com/a/37511463
			// TODO: check for name collisions after conversion to valid identifiers
			const ret = s
				.replace(/[ÀÂÄ]/g, "A")
				.replace(/[ÉÈÊË]/g, "E")
				.replace(/[Ï]/g, "I")
				.replace(/[ÔÖ]/g, "O")
				.replace(/[ÙÙÜ]/g, "U")
				.replace(/[àâä]/g, "a")
				.replace(/[éèêë]/g, "e")
				.replace(/[ï]/g, "i")
				.replace(/[ôö]/g, "o")
				.replace(/[ùûü]/g, "u")
				.replace(/[.]/g, "__DOT__")
			;
			return ret;
		} else {
			return s;
		}
	}
	function stateName({model, controllable}, state) {
		const stateName =
			//state.name;
			// although state machines are flattened, state names from actions are not, so we do it here
			model.stateFullName(state).split(/\./).slice(1).join(".");
		const name = toValidIdentifier(stateName.toUpperCase());
		if(controllable) {
			return `S_${getClassName(model.getStateObject(state))}_${name}`;
		} else {
			return `S_${name}`;
		}
	}
	function eventName(prefix, trigger) {
		const prefix_ = prefix ? prefix + "_" : "";
		if(trigger) {
			return `E_${prefix_}${toValidIdentifier(getEventName(trigger).toUpperCase())}`;
		} else {
			return `E_${prefix_}COMPLETION`;
		}
	}
	function escOpName(className, name) {
		// TODO: adapt list of identifiers to escape to whether we are in controllable mode or not
		return `${className}_${toValidIdentifier(name.replace(/^start|stop$/, "$&_"))}`;
	}
	function allTransitions(obj) {
		// TODO: support internalTransitions
		//return obj.transitions;
		return obj.states.flatMap(e =>
			e.outgoing
				.concat(Object.values(e.internalTransitions))
		);
	}
	function actionName(trans) {
		const index = trans.region.transitions?.indexOf(trans) ?? Object.values(trans.region.internalTransitions).indexOf(trans);
		return `A_${toValidIdentifier(trans.name.toUpperCase())}_${index}`;
	}
	function getOpParams(op) {
		return	(op?.parameters ?? []).map(p =>
				typeof p === "string"
				?	`, int ${p}`
				:	`, ${p.type ?? "int"} ${p.name}`
			);
	}
	function activeOpSig(className, name, obj, withTag = false) {
		const op = obj.operationByName[name];
		const params = getOpParams(op);
		let opName = escOpName(className, name);
		if(withTag) {
			params.push(", int __tag__");
			opName += "WithTag";
		}
		return `void ${opName}(${className} * this${
			params.join("")
		})`;
	}
	function paramName(p) {
		return typeof p === "string"
		?	p
		:	p.name
		;
	}
	// could be cached in context
	function getTaggingConnectors({model}) {
		return model.connectors?.filter(c => c.incomingTag) ?? [];
	}
	function getConnectors(context, obj) {
		return getTaggingConnectors(context).filter(c => c.ends.some(e => e.name === obj.name));
	}
	function getTagIndex(context, obj, incomingTag) {
		return getConnectors(context, obj).findIndex(c => c.incomingTag === incomingTag);
	}

	function passiveOpSig(op) {
		const className = getClassName(op.class);
		const params = getOpParams(op);
		return `void ${escOpName(className, op.name)}(${className} * this ${
			params.join("")
		})`;
	}
	function getTag(context, obj) {
		const {model} = context;
		if(model.isPort(obj)) {
			const connectors = getConnectors(context, obj);
			if(hasElements(connectors)) {
				const connector = connectors[0];
				if(connector.incomingTag) {
					const otherEnd = model.getOtherEnd(connector, obj);
					//const tag = getConnectors(otherEnd).findIndex(c => c.incomingTag === connector.incomingTag);
					const tag = getTagIndex(context, otherEnd, connector.incomingTag);
//*					// numerical tags
					return {decl: `int incomingTag;`, init: `${obj.name}->incomingTag = ${tag};`};
/*/					// string tags
					return {decl: `char * incomingTag;`, init: `${obj.name}->incomingTag = ${JSON.stringify(connector.incomingTag)};`};
/**/
				}
			}
		}
		return {decl: "", init: ""};
	}

const templates = {
	activeControlOperations: (className, prefix) => indent`
		void ${className}_${nonModelOpPrefix}getFireables(${className} * this, fireablesCallback callback);
		void ${className}_${nonModelOpPrefix}fire(${className} * this, ${prefix}Action action);

		// for observation language
		int ${className}_${nonModelOpPrefix}isInState(${className} * this, ${prefix}State state);
		int ${className}_${nonModelOpPrefix}epContains(${className} * this, ${prefix}Event event);
		int ${className}_${nonModelOpPrefix}epGetFirst(${className} * this);
	`,
	controlOperations: (className) => indent`
		// for execution control
		void ${className}_${nonModelOpPrefix}reset(${className} * this);
		int ${className}_${nonModelOpPrefix}writeConfig(${className} * this, char * buffer);
		int ${className}_${nonModelOpPrefix}setConfig(${className} * this, char * buffer);
		char * ${className}_${nonModelOpPrefix}writeParsedConfig(${className} * this, char * buffer);
	`,
	stepMonitors: (observers) => indent`
		${hasElements(observers) ? indent`
			int nb;
			int id;
			void cb(int transId, char * objName, char * transName) {
				nb++;
				id = transId;
				LOG("Monitor %s should fire %s\\n", objName, transName);
			}
		`:""}
		${observers.map(obj => indent`
			nb = 0;
			${getClassName(obj)}_${nonModelOpPrefix}getFireables(${obj.name}, cb);
			switch(nb) {
				case 0:
					// ${obj.name} stutters
					break;
				case 1:
					${getClassName(obj)}_${nonModelOpPrefix}fire(${obj.name}, id);
					break;
				default:
					printf("error: monitor ${obj.name} has more than one fireable transition\\n");
					exit(1);
					break;
			}
		`)}
	`,
	statesEnum: (context, region, prefix, prefix_) => indent`
		typedef enum {
			S_${prefix_}IGNORE = 0,
			${region.states.map(s => stateName(context, s)).join(",\n")},
			NB_${prefix_}STATES
		} ${prefix}State;
	`,
	eventsEnum: (triggers, prefix, prefix_) => indent`
		typedef enum {
			E_${prefix_}COMPLETION,
			E_${prefix_}STOP_THREAD,
			${triggers.map(t => eventName(prefix, t)).map(e => e + ",")}
			NB_${prefix_}EVENTS
		} ${prefix}Event;
	`,
	// TODO: only declarations here, no array, otherwise they are duplicated in every file including the .h
	transitionTypes: (obj, prefix, prefix_) => indent`
		typedef enum {
			${allTransitions(obj).map(actionName).map(e => `${prefix_}${e},`)}
			${prefix_}NB_ACTIONS
		} ${prefix}Action;

		static char * ${prefix_}actionNames[] = {
			${allTransitions(obj).map(actionName).map(e => `"${e}",`)}
		};

		static char * ${prefix_}transitionNames[] = {
			${allTransitions(obj).map(e => `"${e.name}",`)}
		};
	`,
	publicOperations: (obj, triggers, taggedTriggers, className) => indent`
		// public operations sent to state machine
		${triggers.map(n => activeOpSig(className, n, obj) + ";")}

		// public operations sent to state machine with port tags
		${taggedTriggers.map(n => activeOpSig(className, n, obj, true) + ";")}

		// other public operations
		${templates.passivePublicOperations(obj, triggers)}
	`,
	passivePublicOperations: (obj, triggers) => indent`
		${(obj.operations || []).filter(op => !triggers.includes(op.name)).map(op => passiveOpSig(op) + ";")}
	`,
	activeOperation: ({comTemplates}, className, op, name, eventName, obj, withTag, classHasTags) => indent`
		${activeOpSig(className, name, obj, withTag)} {
			Message msg = {.event = ${eventName}};
			${(op?.parameters ?? []).map(param =>
				`msg.${paramName(param)} = ${paramName(param)};`
			)}
			${classHasTags ?
				`msg.__tag__ = ${withTag ? "__tag__" : "-1"};`
			:""}
			LOG("Sending ${eventName} to an instance of ${className}\\n");
			${comTemplates.send(eventName)}
		}
	`,

	refSetterSig: (className, ref) => `void ${className}_set_${ref.name}(${className} * this, ${getClassName(ref.type)} * ${ref.name})`,
	refGetterSig: (className, ref) => `${getClassName(ref.type)} * ${className}_get_${ref.name}(${className} * this)`,
	refSetter: (className, ref) => indent`
		${templates.refSetterSig(className, ref)} {
			this->${ref.name} = ${ref.name};
		}
	`,
	refGetter: (className, ref) => indent`
		${templates.refGetterSig(className, ref)} {
			return this->${ref.name};
		}
	`,
	performAction: (context, {className, obj, refs, region, prefix, prefix_}) => indent`
		static void ${className}_${nonModelOpPrefix}performAction(${className} * this, ${prefix}Action action, Message params) {
			switch(action) {
			${allTransitions(region).map(trans => indent`
				case ${prefix_}${actionName(trans)}:
					LOG("\t\t${className} performs action ${actionName(trans)}\\n");
					${(context.serializeActions && processActions(context, obj, trans.effect, refs, className)) || indent`
						// nothing to do
						LOG("\t\t\t${className} does nothing\\n");
					`}
					break;
			`)}
			default:
				LOG("ERROR: ${className} has no action %d\\n", action);
				exit(1);
				break;
			}
		}
	`,
	evaluateGuard: (context, {className, obj, refs, region, prefix, prefix_}) => indent`
		// the msg parameter is only intended to access the __tag__, if present
		static int evaluateGuard(${className} * this, ${prefix}Action action, Message * msg) {
			switch(action) {
			${allTransitions(region).map(trans => indent`
				case ${prefix_}${actionName(trans)}: {
					int ret = ${(context.serializeActions && processActions(context, obj, trans.guard, refs, className, true)) || "1"};
					${hasElements(trans.ports) ?
						`ret &= ${trans.ports.map(p =>
							`msg->__tag__ == ${getTagIndex(context, obj, p)}`
						).join(" || ")};`
					:""}
					LOG("${className} evaluate guard ${hasElements(trans.ports) ?
						"and ports " : ""
					}of ${actionName(trans)} to %d\\n", ret);
					return ret;
				}
			`)}
			default:
				LOG("ERROR: ${className} has no action %d\\n", action);
				exit(1);
				break;
			}
		}
	`,
	transitionTypesAndOperations: (context, {className, region, prefix, prefix_}) => indent`
		typedef struct {
			${prefix}State source;
			${prefix}State target;
			${prefix}Event trigger;
			${prefix}Action action;
		} Transition;

		static Transition transitions[${prefix_}NB_ACTIONS] = {
			${allTransitions(region)
			.map(trans => indent`
				// ${trans.name}
				{${
					stateName(context, trans.source)
				}, ${
					stateName(context, trans.target)
				}, ${
					eventName(prefix, trans.trigger)
				}, ${prefix_}${
					actionName(trans)
				}},
			`)}
		};

		static Boolean isFireable(${className} * this, Transition transition) {
			Message * msg = getEvent(this, transition.trigger);
			return
				transition.source == this->currentState
			&&
				(msg != NULL || transition.trigger == E_${prefix_}COMPLETION)
			&&
				evaluateGuard(this, transition.action, msg)
			;
		}

		void ${className}_${nonModelOpPrefix}getFireables(${className} * this, fireablesCallback callback) {
			${context.comTemplates.transfer()}
			for(int i = 0 ; i < ${prefix_}NB_ACTIONS ; i++) {
				Transition transition = transitions[i];
				if(isFireable(this, transition)) {
					callback(i, this->name, ${prefix_}transitionNames[i]);
				}
			}
		}

		void ${className}_${nonModelOpPrefix}fire(${className} * this, ${prefix}Action action) {
			Transition transition = transitions[action];
			if(isFireable(this, transition)) {
				LOG("\tfiring %s.%s\\n", this->name, ${prefix_}transitionNames[action]);

				Message msg;
				if(transition.trigger != E_${prefix_}COMPLETION) {
					msg = findEntry(this, transition.trigger)->msg;
				}

				${className}_${nonModelOpPrefix}performAction(this, transition.action, msg);
				this->currentState = transition.target;
				if(transition.trigger != E_${prefix_}COMPLETION) {
					removeEntry(this, transition.trigger);
				}

			} else {
				LOG("error: trying to fire a non-fireable transition\\n");
			}
		}
	`,
	makefile: ({model, controllable}, objects) => indent`
		# Comment/uncomment to disable/enable sanitizers
		SAN_FLAGS=-fsanitize=undefined -fsanitize=address -fsanitize=bounds

		%.o: %.c
			gcc $(SAN_FLAGS) -g -c -o $@ $<

		${model.name}: ${objects.map(obj => `${getClassName(obj)}.o`).join(" ")} main.o utils.o
			gcc $(SAN_FLAGS) -g -o "${model.name}" $^ -lpthread -lrt ${controllable ? "-lwebsockets" : ""}

		all: ${model.name}

		run: all
			"./${model.name}"

		debug: all
			gdb -ex run "./${model.name}"

		clean:
			-rm *.o
			-rm ${model.name}

	`,
	initModel: (context, objects) => indent`
		LOG("Creating objects\\n");
		int i = 0;
		${objects.map(obj => indent`
			${obj.name} = ${getClassName(obj)}_${nonModelOpPrefix}new("${obj.name}");
			${context.controllable && context.model.isActive(obj) ? indent`
				fireFunctions[i] = (fireFunctionType)${getClassName(obj)}_${nonModelOpPrefix}fire;
				activeObjectTransitionNames[i] = ${getClassName(obj)}_transitionNames;
				activeObjects[i++] = (Object*)${obj.name};
			`:""}
		`)}

		LOG("Connecting objects\\n");
		${context.model.connectors?.map(c => {
			return indent`
				${getClassName(c.ends[0])}_set_${c.endNames?.[1] ?? c.ends[1].name}(${c.ends[0].name}, ${c.ends[1].name});
				${c.incomingTag && getTag(context, c.ends[0]).init}
				${getClassName(c.ends[1])}_set_${c.endNames?.[0] ?? c.ends[0].name}(${c.ends[1].name}, ${c.ends[0].name});
				${c.incomingTag && getTag(context, c.ends[1]).init}
			`;
		})}
	`,
};


/*	// are these old elements useful?
	${`char * ${className}_${nonModelOpPrefix}getCurrentStateName(${className} * this);`,""}

	char * ${className}_getCurrentStateName(${className} * this) {
		return stateNames[this->currentState];
	}

	#define SEND(obj, sig, ...) (_##sig(obj, __VA_ARGS__))
	#define CALL(obj, sig, ...) (_##sig(obj, __VA_ARGS__))

*/

const tailqComTemplates = {
	send: (eventName) => indent`
		struct queueEntry * entry = malloc(sizeof(struct queueEntry));
		entry->msg = msg;
		TAILQ_INSERT_TAIL(&this->queue, entry, entries);
		this->queueSize++;
	`,
	// in controllable mode, reception is more complex, and does not use this template (but is tailq-specific)
	receive: () => indent`
		WONTFIX
	`,
	init: () => indent`
		this->queueSize = 0;
		TAILQ_INIT(&this->queue);
	`,
	deinit: () => indent`
	`,
	dependencies: () => indent`
		// for TAILQ_*
		#include <sys/queue.h>
	`,
	nbMessages: (object) => indent`
		int nbMsgs = ${object}->queueSize;
	`,
	fields: (queueName) => indent`
		int queueSize;
		struct ${queueName}Head queue;
	`,
	types: (queueName, messageType) => indent`
		TAILQ_HEAD(${queueName}Head, ${queueName}Entry);

		struct ${queueName}Entry {
			TAILQ_ENTRY(${queueName}Entry) entries;
			${messageType} msg;
		};
	`,
	functions: (className) => "",
	transfer: () => "",
};

const mqComTemplates = {
	send: (eventName) => indent`
		int ret = mq_send(this->eventPool, (const char*)&msg, sizeof(msg), 0);
		if(ret) {
			fprintf(stderr, "error in %s while trying to place ${eventName} on the event pool: %s\\n", __func__, strerror(errno));
		}
	`,
	receive: () => indent`
		int ret = mq_receive(this->eventPool, (char *)&msg, sizeof(msg), NULL);
		if(ret < 0) {
			fprintf(stderr, "error in %s while receiving: %s\\n", __func__, strerror(errno));
		}
	`,
	init: () => indent`
		char queueName[MQ_MAX_NAME_SIZE];
		buildQueueName(queueName, name);
		int err = mq_unlink(queueName);
		// an error here may simply mean that it did not exist yet, which is normal
		${indent`
			if(err) {
				//perror("error in " __func__ " while trying to unlink the event pool mqueue");
			}
		`,""}
		struct mq_attr attr = {
			.mq_flags = 0,
			.mq_maxmsg = MQ_MAX_MESSAGES,
			.mq_msgsize = sizeof(Message),//MQ_MAX_MESSAGE_LENGTH,
			.mq_curmsgs = 0,
		};
		this->eventPool = mq_open(queueName, O_CREAT | O_RDWR, 0644, &attr);
		if(this->eventPool == -1) {
			fprintf(stderr, "error in %s while trying to open the event pool mqueue: %s\\n", __func__, strerror(errno));
		}
	`,
	deinit: () => indent`
		char queueName[MQ_MAX_NAME_SIZE];
		buildQueueName(queueName, this->name);
		int err = mq_unlink(queueName);
		if(err) {
			fprintf(stderr, "error in %s while trying to unlink the event pool mqueue: %s\\n", __func__, strerror(errno));
		}
	`,
	dependencies: () => indent`
		// for mq*
		#include <mqueue.h>
	`,
	nbMessages: (object) => indent`
		struct mq_attr attrs;
		int ret = mq_getattr(${object}->eventPool, &attrs);
		if(ret) {
			fprintf(stderr, "error in %s while reading event pool size: %s\\n", __func__, strerror(errno));
		}
		int nbMsgs = attrs.mq_curmsgs;
	`,
	fields: (queueName) => indent`
		mqd_t eventPool;
	`,
	types: (queueName, messageType) => "",
	functions: (className) => indent`
		static void buildQueueName(char * queueName, const char * name) {
			snprintf(queueName, MQ_MAX_NAME_SIZE, "/${className}_%s", name);
		}
	`,
	transfer: () => "",
};

// this is how the first controllable version worked, but now tailqComTemplates is better for that purpose
const mqTailqComTemplates = {
	send: mqComTemplates.send,
	// in controllable mode, reception is more complex, and does not use this template
	receive: () => indent`
		WONTFIX
	`,
	init: () => indent`
		${mqComTemplates.init()}
		${tailqComTemplates.init()}
	`,
	deinit: () => indent`
		${tailqComTemplates.deinit()}
		${mqComTemplates.deinit()}
	`,
	dependencies: () => indent`
		${mqComTemplates.dependencies()}
		${tailqComTemplates.dependencies()}
	`,
	nbMessages: (object) => indent`
		${mqComTemplates.nbMessages(object)}
	`,
	fields: (queueName) => indent`
		${mqComTemplates.fields(queueName)}
		${tailqComTemplates.fields(queueName)}
	`,
	types: (queueName, messageType) => indent`
		${mqComTemplates.types(queueName, messageType)}
		${tailqComTemplates.types(queueName, messageType)}
	`,
	functions: (className) => indent`
		${mqComTemplates.functions()}
		static void transferQueue(${className} * this) {
			while(!mq_is_empty(this)) {
				Message msg;

				${mqComTemplates.receive()}

				LOG("\t\t\t\t%s\\n", eventNames[msg.event]);

				${tailqComTemplates.send("an event from the mq")}
			}
			for(struct queueEntry * np = this->queue.tqh_first ; np != NULL ; np = np->entries.tqe_next) {
				LOG("\t\t\t%s's queue: %s\\n", this->name, eventNames[np->msg.event]);
			}
		}
	`,
	transfer: () => `transferQueue(this);`
};

