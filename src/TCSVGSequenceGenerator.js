import {indent} from './TemplateUtils.js';
import {templates} from './TCSVGSequenceTemplates.js';

// Explanation for a[*|href] CSS selector: https://stackoverflow.com/a/23047888
// TODO:
//	- replace xlink:href by href?
//	- better use outline boxes to accommodate items of various heights
//	- try to improve constraints so that accepts which could be horizontal are made so (possibly optionally)
//		- this would require knowing the previous element per lifeline, not just globally (like "after" does)
export function generateTCSVGSequence(uses, {origin, scale, hideLinks, styleMode}) {
	scale = scale / 1.7 || 10;
	return indent`
		<svg xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" xmlns:c="http://myconstraints">
			<style>
				${(styleMode === "dark") ?
					`svg {
						--main-fill: #070707;
						--note-fill: #131313;
						--main-stroke: #C7C7C7;
						--text-fill: #FFFFFF;
						--fragment-stroke: #FFFFFF;
						--polygon-fill: #111111;
					}`
				:
					`svg {
						--main-fill: #FEFECE;
						--note-fill: #FBFB77;
						--main-stroke: #A80036;
						--text-fill: #000000;
						--fragment-stroke: #000000;
						--polygon-fill: #EEEEEE;
					}`
				}
				.participant {
					fill: var(--main-fill);
					stroke: var(--main-stroke);
					stroke-width: 1.5;
				}
				.participantName {
					stroke-width: 0;
				}
				.actor {
					fill: var(--main-fill);
					stroke: var(--main-stroke);
					stroke-width: 2;
				}
				.invariant {
					stroke: var(--main-stroke);
					fill: var(--note-fill);
				}
				.note {
					stroke: var(--main-stroke);
					fill: var(--note-fill);
				}
				.note polygon {
					fill: none;
				}
				.lifeline {
					stroke: var(--main-stroke);
					stroke-width: 1.0;
				}
				.messagePart {
					stroke: var(--main-stroke);
					stroke-width: 1.0;
				}
				.messageArrow {
					stroke: var(--main-stroke);
					stroke-width: 1.0;
					marker-end: url(#arrowHead);
				}
				.messageArrowHead {
					fill: var(--main-stroke);
					stroke: var(--main-stroke);
					stroke-width: 1.0;
				}
				.circle {
					stroke: var(--main-stroke);
				}
				.found circle {
					fill: none;
				}
				.set rect {
					fill: none;
				}
				.fragment rect {
					stroke: var(--fragment-stroke);
					stroke-width: 2.0;
					fill: none;
				}
				.fragment polygon {
					fill: var(--polygon-fill);
					stroke: var(--fragment-stroke);
					stroke-width: 1.0;
				}
				text {
					fill: var(--text-fill);
				}
				.fragment text, .compartment text {
					font-weight: bold;
				}
				.compartment line {
					stroke: black;
					stroke-dasharray: 2.0,2.0;
				}
				${hideLinks ? "" : indent`
					a[*|href] > text {
					fill: blue; text-decoration: underline;
				}`}
				.dashed {
					stroke-dasharray: 2.0,2.0;
				}
			</style>
			${templates}

			${uses}

			<script>
				function __attribute__scale() {
					return ${scale ?? 10.0};
				}
			</script>

			<script xlink:href="${origin}tcsvg/c.js"/>
			<script xlink:href="${origin}tcsvg/TCSVG.min.js"/>
		</svg>
	`
		.replace(/([^:])\/\/[^\n]*/g, "$1\n")	// for Firefox when using data URI, otherwise innerHTML (and textContent) return a string without newlines, which cannot therefore be evaled if there are end of line comments
		.replace(/\t/g, " ")			// for Firefox when using data URI, otherwise tabs just get dropped
	;
}

/*
		Non minified scripts:
			<script xlink:href="${origin}tcsvg/param.js"/>
			<script xlink:href="${origin}tcsvg/mycsvg.js"/>
			<script xlink:href="${origin}tcsvg/inlineConstraints.js"/>

*/


/*
				// TODO: improve CSS (notably factorize common elements)

				// TODO: for incrementality, <constraints> should return a conjunction of constraints
					// idea to deal with incremental param changes
					ev.after.addOnChange(after =>
						after ?
							ev.outline.center.y.eq(ev.after.outline.center.y.plus(${scale}))
						:
							ev.outline.center.y.eq(on.line.p1.y.plus(${scale}))
					);
				// TODO: in after template: move eventConstraintsY out of forEach and only apply on first?
*/

export function inactivateSVG(seqFigs) {
	// inactivate SVG (without visible changes)

	// Remark: it would be more difficult to inactivate the contents of svg => better to inactivate displayed diagram then serialize it with innerHTML
	seqFigs.querySelectorAll("use,defs>g,script,constraints,[display=none]").forEach(e => e.remove());
	seqFigs.querySelectorAll("[params]").forEach(e => e.removeAttribute("params"));
	seqFigs.querySelectorAll("[content-value]").forEach(e => e.removeAttribute("content-value"));
	seqFigs.querySelectorAll("text").filter(text => text.innerHTML === " ").forEach(e => e.remove());
	// TODO: remove other useless items like useless attributes (g attributes)

	// Removing links:
		//Would only work from the SVG doc, not from the embedded one: seqFigs.querySelectorAll("a").forEach(e => e.removeAttribute("xlink:href"))
		//Would work but also modify the displayed diagram: seqFigs.querySelectorAll("a").forEach(e => e.removeAttribute("href"))
		// => see how we do it below with a regex on the serialized SVG
	const svgc = seqFigs.innerHTML		// saves the displayed SVG, and loading it will attempt to rerun the solver if scripts were kept and had href attributes (see loadScripts above)
	return svgc.replace(/(<a .*?)(xlink:)?href="[^"]*"/g, "$1");
}

