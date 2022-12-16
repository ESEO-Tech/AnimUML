import {getTriggers, getEventName, getEventArgs, getTriggerContexts} from './ModelUtils.js';
//import {createTarEntry} from './ExportUtils.js';
import {firstToUpper, unique, hasElements} from './Utils.js';
import {indent} from './TemplateUtils.js';
import {toExplicit} from './TransformStateMachine2Explicit.js';
//import {exportModel} from './Export2AnimUML.js';
import {parser as actionsParser, expressionParser} from './JavaScriptActionLanguageParser.js';
import {transform} from './ASTUtils.js';

export function toCeptre(model, {serializeActions = true} = {}) {
	function stateName(object, state) {
		return `${object.name}_${state.name}`;
	}
	function stateType(object) {
		return `${object.name}_State`;
	}
	function currentStatePred(object) {
		return `${object.name}_CurrentState`;
	}
	function objectStatePred(object) {
		return `${object.name}_objectState`;
	}
	function eventPoolPred(object) {
		return `${object.name}_EventPool`;
	}
	function transGuard(trans) {
		if(serializeActions && trans.guard) {
			const ast = expressionParser.parse(trans.guard);
			const ret = transform(ast, {
				binaryOpExp(exp, trans) {
					switch(String(exp.op)) {
						case "&&":
							return [...trans(exp.left), ...trans(exp.right)];
						case "<":
						case ">":
						case "<=":
						case ">=":
							const ops = {
								"<": "le",
								">": "ge",
								"<=": "leq",
								">=": "geq",
							};
							const nt = {
								variableExp(exp, trans) {
									return `Old_${exp.name}`;
								},
								numberExp(exp, trans) {
									return `${exp.value}`;
								},
							};
							const left = transform(exp.left, nt);
							const right = transform(exp.right, nt);
							return [`* ${ops[exp.op]} ${left} ${right}`];
						default:
							console.log(JSON.stringify(ast, undefined, 2));
							const msg = `error: unsupported binary operator ${exp.op}`;
							console.log(msg);
							throw msg;
					}
				},
				variableExp(exp, ast) {
					console.assert(exp.name === "else");
					// TODO: negation of other guards
					return [];
				},
			});
			return ["% guard: " + trans.guard, ...ret];
		} else {
			return "";
		}
	}
	function transEffect(trans, updatedProperties, setNewEP) {
		if(serializeActions && trans.effect) {
			const ast = actionsParser.parse(trans.effect);
			const ret = transform(ast, {
				expressionStat(stat, transform) {
					const exp = stat.expression;
					switch(String(exp.type)) {
						case "assign":
							const {left, right} = exp;
							console.assert(left.type === "memberAccessExp" && left.source.type === "thisExp");
							console.assert(right.type === "memberAccessExp" && right.source.type === "variableExp" && right.source.name === "params");

							updatedProperties.add(left.propertyName);

							return `* eq New_${left.propertyName} ${firstToUpper(right.propertyName)}`;
							// TODO: and remove old value?
						case "postfixUnaryExp":
							console.assert(exp.expression.type === "variableExp");
							const name = exp.expression.name;

							updatedProperties.add(name);

							switch(String(exp.op)) {
								case "--":
									return `* eq (succ New_${name}) Old_${name}`;
								case "++":
									return `* eq New_${name} (succ Old_${name})`;
								default:
									console.log(JSON.stringify(ast, undefined, 2));
									const msg = `error: unsupported unary postfix operator ${exp.op}`;
									console.log(msg);
									throw msg;
							}
						case "functionCallExp":
							setNewEP(indent`(cons (${exp.source.propertyName}${exp.args.map(arg => ` Old_${arg.name}`)}) OldEP2)`);
							//return indent`* remove (${exp.source.propertyName}${exp.args.map(arg => ` Old_${arg.name}_`)}) OldEP OldEP2`;
							return `* remove_${exp.source.propertyName} OldEP OldEP2`;
						default:
							console.log(JSON.stringify(ast, undefined, 2));
							const msg = `error: unsupported expression statement ${exp.type}`;
							console.log(msg);
							throw msg;
					}
				},
			});
			return ["% effect: " + trans.effect, ...ret];
		} else {
			return "";
		}
	}
	function withShortcuts(object, f) {
		const st = stateType(object);
		const cs = currentStatePred(object);
		const sn = (state) => stateName(object, state);
		const ep = eventPoolPred(object);
		const os = objectStatePred(object);
		return f(st, cs, sn, ep, os);
	}
	function objectToCeptre(object) {
		if(model.isActive(object)) {
			//object = toExplicit(object, model);
			return withShortcuts(object, (st, cs, sn, ep, os) => indent`
				${st} : type.
				${cs} ${st} : pred.
				${os} ${Object.values(object.propertyByName ?? {}).map(p => translateType(p.type))}: pred.
				${ep} list_msgType : pred.

				${object.states.map(state => indent`
					${sn(state)} : ${st}.
				`)}
			`);

		} else {
			return "% TODO: passive object ${object.name}";
		}
	}
	function transitions2Ceptre(object) {
		const allTransitions = [
			...object.transitions,
			...object.states.flatMap(s => Object.values(s.internalTransitions ?? [])) ?? [],
		];
		return withShortcuts(object, (st, cs, sn, ep, os) => indent`
			${allTransitions.map(trans => {
				const updatedProperties = new Set();
				function isNew(p) {
					return updatedProperties.has(p);
				}
				let newEP = "OldEP";
				function setNewEP(n, sent) {
					newEP = n;
				}
				let effect = [];
				if(trans.effect) {
					effect = transEffect(trans, updatedProperties, setNewEP);
				}
				return indent`
					${object.name}_${trans.name}
					  : ${cs} ${sn(trans.source)}
					  * ${os}${Object.keys(object.propertyByName ?? {}).map(p => ` Old_${p}`)}
					  ${trans.trigger ?
						//`* ether (cons (${getEventName(trans.trigger)}${getEventArgs(trans.trigger).map(a => ` ${firstToUpper(a)}`)}) OldEP)`
						[`* ether EP`,
						`* contains (${getEventName(trans.trigger)}${getEventArgs(trans.trigger).map(a => ` ${firstToUpper(a)}`)}) OldEP EP`,
						]
					  :	`* ether OldEP`
					  }
					  ${trans.guard ?
						transGuard(trans)
					  :""}
					  ${effect}
					 -o ${cs} ${sn(trans.target)}
					  * ${os}${Object.keys(object.propertyByName ?? {}).map(p => ` ${isNew(p) ? "New" : "Old"}_${p}`)}
					  ${`* ${ep} ${newEP}`,`* ether ${newEP}`}
					  .
				`
			})}
		`);
	}
	function translateType(type) {
		switch(String(type)) {
			case "int":
			case "Integer":
				return "nat";
			default:
				return type;
		}
	}
	function params(object, trigger) {
		return object.operationByName?.[trigger]?.parameters?.map(p => `${translateType(p.type)} `) ?? "";
	}
	const objects = model.objects;
	//console.log(objects.find(o => o.name === "speedSensor").states.find(s => s.name === "Waiting"))
	return indent`
		nat : type.
		zero : nat.
		succ nat : nat.
		
		#builtin NAT nat.
		#builtin NAT_ZERO zero.
		#builtin NAT_SUCC succ.

		le nat nat : bwd.
		le zero (succ X).
		le (succ X) (succ Y) <- le X Y.

		leq nat nat : bwd.
		leq zero X.
		leq (succ X) (succ Y) <- leq X Y.

		ge nat nat : bwd.
		ge X Y <- leq Y X.

		geq nat nat : bwd.
		geq X Y <- le Y X.

		eq nat nat : bwd.
		eq X X.

		msgType : type.
		${objects.flatMap(o => getTriggers(o).map(trigger =>
			`${trigger} ${params(o, trigger)}: msgType.`
		))}

		list_msgType : type.
		nil : list_msgType.
		cons msgType list_msgType : list_msgType.

		ether list_msgType : pred.

		contains msgType list_msgType list_msgType : bwd.
		contains X Rest (cons X Rest).
		contains X (cons Y Rest) (cons Y Tail)
			<- X <> Y
			<-  contains X Rest Tail
			.

		remove msgType list_msgType list_msgType : bwd.
		remove X nil nil.
		remove X (cons X T1) T2
			<- remove X T1 T2
			.
		remove X (cons Y T1) (cons Y T2)
			<- X <> Y
			<- remove X T1 T2
			.

		remove_onButton list_msgType list_msgType : bwd.
		remove_onButton nil nil.
		remove_onButton (cons onButton T1) T2
			<- remove_onButton T1 T2
			.
		remove_onButton (cons X T1) (cons X T2)
			<- X <> onButton
			<- remove_onButton T1 T2
			.

		remove_offButton list_msgType list_msgType : bwd.
		remove_offButton nil nil.
		remove_offButton (cons offButton T1) T2
			<- remove_offButton T1 T2
			.
		remove_offButton (cons X T1) (cons X T2)
			<- X <> offButton
			<- remove_offButton T1 T2
			.


		remove_setSpeed list_msgType list_msgType : bwd.
		remove_setSpeed nil nil.
		remove_setSpeed (cons (setSpeed X) T1) T2
			<- remove_setSpeed T1 T2
			.
		remove_setSpeed (cons X T1) (cons X T2)
			<- X <> setSpeed Y
			<- remove_setSpeed T1 T2
			.
		%replace msgType list_msgType list_msgType : bwd.
		%replace X .

		${objects.map(objectToCeptre)}

		stage main = {
			${objects.map(transitions2Ceptre)}
		}.
		#interactive main.

		context init = {
			ether nil,
			${objects.filter(o => model.isActive(o)).flatMap(o => [
				`${currentStatePred(o)} ${stateName(o, model.getInitial(o))}`,
				`${objectStatePred(o)}${Object.values(o.propertyByName ?? {}).map(p => " 0")}`,
				//`${eventPoolPred(o)} nil`,
			]).join(",\n")}
		}.
		
		${indent`
			init
			  : stage init
			 -o stage main
			  * ether nil
			  ${objects.filter(o => model.isActive(o)).flatMap(o => [
				`* ${currentStatePred(o)} ${stateName(o, model.getInitial(o))}`,
				`* ${objectStatePred(o)}${Object.values(o.propertyByName ?? {}).map(p => " 0")}`,
				//`* ${eventPoolPred(o)} nil`,
			  ])}
			  .
		`}

		test
		  : stage init
		 -o stage main
		  * ether (cons (setSpeed 130) (cons (onButton) (cons (setSpeed 50) nil)))
		  %* ether (cons (onButton) (cons (setSpeed 130) nil))
		  * controller_CurrentState controller_Disengaged
		  * controller_objectState 120
		  .

		test2
		  : stage init
		 -o stage main
		  * ether (cons (setSpeed 130) nil)
		  * speedSensor_CurrentState (speedSensor_Waiting)
		  * speedSensor_objectState 200
		  .

		test22
		  : stage init
		 -o stage main
		  * ether (cons (setSpeed 150) (cons (setSpeed 130) nil))
		  * speedSensor_CurrentState (speedSensor_Waiting)
		  * speedSensor_objectState 200
		  .

		test3
		  : stage init
		 -o stage main
		  * ether nil
		  * speedSensor_CurrentState (speedSensor_Waiting)
		  * speedSensor_objectState 200
		  .

		#trace _ main init.
	`;
}

