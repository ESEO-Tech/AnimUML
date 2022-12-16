import {unique} from './Utils.js';

// TODO: improve (e.g., using the code in Interaction2TCSVGSequence
export function interactionLifelines(interaction) {
	return unique(
		interaction.events.flatMap(msg =>
			[msg.from, msg.to, msg.object].filter(e => e)
		)
	).sort();
}

