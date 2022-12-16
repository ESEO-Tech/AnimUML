import * as fs from 'fs';
import {interaction2TCSVGSequence} from "./Interaction2TCSVGSequence.js";
import {makeTCSVGStatic} from "./MakeTCSVGStatic.js";
import {} from './ContextualEval.cjs';


export function exportInteraction2SVG(inter, model, exportStaticSVG = true, settings) {
	const svg = interaction2TCSVGSequence(inter, model, {});
//console.log(svg)

	if(exportStaticSVG) {

		return makeTCSVGStatic(svg, undefined, settings);
	} else {
		return svg;
	}
}

