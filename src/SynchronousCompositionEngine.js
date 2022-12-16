import {zip, cartesian} from './Utils.js';

const debug = false;

// TODO: update fireables when model is edited?
export class SynchronousCompositionEngine {
	// left must implement STR + APE
	// rights must implement STR + APC
	constructor(left, ...rights) {
		this.name = "SynchronousComposition";

		async function replaceAsync(source, regex, fn) {
			const evaluationPromises = [];
			source.replace(regex, (...args) => evaluationPromises.push(fn(...args)));
			const evaluationResults = Promise.all(evaluationPromises);
			return source.replace(regex, () => evaluationResults.shift());
		}

		// computes the @pre parts
		// must be called on the "before" configuration of a step
		async function preProcess(atom) {
			return replaceAsync(atom, /@([^@]*)@/g, (match, group1, index) => JSON.stringify(left.evaluateAtom(group1)));
		}

		// From the STR interface of our formalization
		this.reset = async () => {
			await left.reset();
			for(const right of rights) {
				await right.reset();
			}
			if(debug) console.log(`Reset config: ${await this.getConfiguration()}`);
		};
		this.getConfiguration = async () => {
			return JSON.stringify({
				left: await left.getConfiguration(),
				rights: await Promise.all(rights.map(right => right.getConfiguration())),
			});
		};
		this.setConfiguration = async (config) => {
			if(debug) console.log(`Set config: ${config}`);
			const c = JSON.parse(config);
			await left.setConfiguration(c.left);
			for(const [right, cright] of zip(rights, c.rights)) {
				await right.setConfiguration(cright);
			}
		};
		// TODO: explore non-stuttering transitions first?
		// but then how to know about stuttering without being observer engine specific?
		// TODO: check right.is{Accept,Error}... and expose is{Accept,Error} as well? + use is{Accept,Error} in Explorer.js?
		this.getFireables = async () => {
			const leftBeforeConfig = await left.getConfiguration();
			const leftFireables = await left.getFireables();

			const rightsFireables = await Promise.all(rights.map(right => right.getFireables()));
			const rightsAtoms = 	await Promise.all(rights.map(async right =>
							await Promise.all((await right.getAtoms()).map(atom =>
								preProcess(atom)	// process the @<beforeAtom>@s
							))
						));

			if(debug) console.log(`Left fireables are: ${leftFireables}`)

			const ret = [];
			for(const leftTrans of leftFireables) {
				// pre-fire the left transition
				await left.fire(leftTrans);
				const leftAfterConfig = await left.getConfiguration();
				if(debug) console.log(`Fired: ${leftTrans}`);
				if(debug) console.log("SENT_MESSAGES:", await left.evaluateAtom("SENT_MESSAGES()"));
				if(debug) console.log("RECEIVED_MESSAGES:", await left.evaluateAtom("RECEIVED_MESSAGES()"));

				const actualRightsFireables = [];
				for(const [rightFireables, rightAtoms] of zip(rightsFireables, rightsAtoms)) {
					const actualRightFireables = [];
					for(const [rightTrans, atom] of zip(rightFireables, rightAtoms)) {
						// evaluateAtom should be given the whole completion step (leftBeforeConfig, leftTrans, leftAfterConfig)
							// this is not necessary here because we assume that the left engine already knows the completion step, which
							// is the case for the current AnimUMLEngine, but will not always be true
						const atomValue = await left.evaluateAtom(atom);
						if(debug) console.log(`Atom evaluation result is ${atomValue} for atom: ${atom}`);
						if(atomValue) {
							actualRightFireables.push(rightTrans);
						}
					}
					actualRightsFireables.push(actualRightFireables);
				}
				if(debug) console.log(`ActualRightsFireables for ${leftTrans}:`, actualRightsFireables);
				if(debug) console.log("\tcartesian:", cartesian(...actualRightsFireables));
				for(const rightsTrans of cartesian(...actualRightsFireables)) {
					if(debug) console.log("\t\tpushing:", leftTrans, rightsTrans)
					ret.push(JSON.stringify({left: leftTrans, rights: rightsTrans}));
				}

				// back to original configuration
				await left.setConfiguration(leftBeforeConfig);
			}
			if(debug) console.log(`Fireables: ${JSON.stringify(ret)}`);
			return ret;
		};
		this.fire = async (fireable) => {
			if(debug) console.log(`Firing ${fireable}`);
			const f = JSON.parse(fireable);
			for(const [right, fright] of zip(rights, f.rights)) {
				await right.fire(fright); 
			}

/*
			// try to see if we can execute more right transitions while stuttering left
			while(true) {
				// THIS does not work because we must ignore messages "consumed" by the first right.fire...
				const rightFireables =	(await this.getFireables()).map(trans =>
								JSON.parse(trans)
							).filter(trans =>
								trans.left === f.left &&
								trans.right >= 0	// ignore right stuttering // implement all stuttering here, not in InteractionEngine? but then who knows when stuttering is possibe?
							).map(trans =>
								trans.right
							);
				// what to do if more than one is returned? throw?
				if(rightFireables.length > 0) {
					console.log(`Firing more right transitions while stuttering left`);
					await right.fire(rightFireables[0]);
				} else {
					break;
				}
			}
*/
			await left.fire(f.left);
			if(debug) console.log(`Reached config: ${await this.getConfiguration()}`);
		};

		// From the P interface of our formalization
		this.parseConfiguration = async (config) => {
			return config;
		};
		this.showConfiguration = async (config) => {
			return JSON.parse(config);
		};
		this.parseTransition = async(transition) => {
			return transition;
		};
		this.showTransition = async(transition) => {
			return transition;
		};


		// From the ACC interface of our formalization
		this.isAccept = async () => {
			return (await Promise.all(rights.map(right => right.isAccept?.()))).some(e => e);
		};
	}
}

