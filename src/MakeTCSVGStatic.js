import * as fs from 'fs';
import {createSVGWindow} from 'svgdom';
import {inactivateSVG} from "./TCSVGSequenceGenerator.js";
import {resolve/*, dirname*/} from "path";
import {fileURLToPath} from 'url';

// uses an old version of stylis:
import css from 'svgdom-css';

//const __dirname = dirname(fileURLToPath(import.meta.url));

const svgNS = "http://www.w3.org/2000/svg";
const xlinkNS = "http://www.w3.org/1999/xlink";

let patchedSVGDOM = false;

/*
	Known issues:
		- applying makeTCSVGStatic twice removes <a>'s hrefs
		- font metrics are not correct
			probably because svgdom's and browser's default fonts do not match
			could probably be overcome by loading fonts
				https://github.com/svgdotjs/svgdom#fonts
			=> yes, but svgdom's OpenSans default is not widely available
				and even though we can make it work by loading it from fonts.gstatic.com
				some contexts (e.g., raw.githubusercontent.com) do not allow it
			=> try using https://www.npmjs.com/package/@canvas-fonts/arial
				which should be directly supported by most browsers
*/

//import {compile, serialize, stringify} from "stylis";
//import stylis from "stylis";
//console.log(stylis)
export function makeTCSVGStatic(svg, __dirname = ".", settings) {
	if(!patchedSVGDOM) {
		patchSVGDOM();
		patchedSVGDOM = true;
	}
/*
		const window = createSVGWindow();

/*/
		const styleRegexp = /<style>([^<]*)<\/style>/m;
		svg = svg.replace(styleRegexp, `
			<style>
				$1
				/*
					svgdom defaults
						not necessary for svgdom, but necessary for browsers or rsvg to render in the same way
						OpenSans can be install on debian-based distributions with
							sudo apt install fonts-open-sans
				*/
				text {
					font-family: OpenSans;
					font-size: 16;
				}
			</style>
		`);
		const style = svg.match(styleRegexp)[1];
		// adding font-face now but not giving it to svgdom-css which would repeat it on all elements
		svg = svg.replace(styleRegexp, `
			<style>
				/* For browers, who do not know svgdom's default OpenSans font. */
				@font-face {
					font-family: 'OpenSans';
					font-style: normal;
					font-weight: 400;
					src: url('https://fonts.gstatic.com/s/opensans/v28/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTS-muw.woff2') format('woff2');
				}

				$1
			</style>
		`);
		const window = css(
			style
		);
		patchSVGDOM(window);	// sometimes necessary (e.g., when using from tcsvg2svg.js)
					// or not (e.g., when using from AnimUMLUtils.min.js), in which case multiple patching is attempted (which should now work)
		const setComputedStyle = window.setComputedStyle;
/**/

		const document = window.document;
		const root = document.createElement("g");
		document.appendChild(root);

	// add support for searching by "*", this should ideally be in patchSVGDOM
	const getElementsByTagName = window.Document.prototype.getElementsByTagName;
	window.document.documentElement.constructor.prototype.getElementsByTagName = function(name) {
		if(name === "*") {
			return this.querySelectorAll("*");
		} else {
			return getElementsByTagName.call(this, name);
		}
	};
		// required by param.js:
		document.defaultView.location = {href: ""};
		document.defaultView.frameElement = document;
		// required by mycsvg.js:
		globalThis.HTMLCollection = {prototype: {}};
		globalThis.NamedNodeMap = {prototype: {}};
		globalThis.NodeList = {prototype: {}};
		globalThis.document = document;
		globalThis.window = globalThis;
		globalThis.ResizeObserver = function() {
			this.observe = function() {
			};
		};
		globalThis.CSS = {
			// TODO: use the following polyfill? https://github.com/mathiasbynens/CSS.escape
			escape(s) {
				return s;
			},
		};


		root.innerHTML = svg;

		// execute script tags
		for(const script of root.getElementsByTagName("script")) {
			const href = script.getAttributeNS(xlinkNS, "href") || script.getAttribute("href");
			if(href) {
				const actualHREF = href.replace(/^https?:\/\/[^\/]*\//, "");
				const s = fs.readFileSync(resolve(__dirname, actualHREF), "utf8");
				contextualEvalNoWith.call(globalThis, s);
			} else {
				const processed =
					script.innerHTML
						// export all functions & vars
						// TODO: find a better way to do this than this brittle hack
						.replace(/function +([^(]*)\(/g, "globalThis.$1 = function $1(")
						.replace(/var +([^ =]*) *=/g, "globalThis.$1 =")

						// unescape special chars
						.replace(/&lt;/g, "<")
						.replace(/&gt;/g, ">")
						.replace(/&quot;/g, '"')
						.replace(/&amp;/g, "&")
					;
				eval(processed);
			}
		}

		const roots = document.getElementsByTagName("svg");
		function copy(attr) {
			if(!roots[1].getAttribute(attr)) {
				roots[1].setAttribute(attr, roots[0].getAttribute(attr));
			}
		}
		copy("viewBox");
		copy("width");
		copy("height");

		if(settings?.inlineStyles) {
			// for SVG renderers that do not support <style> (e.g., rsvg)
			setComputedStyle(roots[1].parentNode);

			const varRegex = new RegExp(`var\\(([^)]*)\\)`, "g");
			for(const e of roots[1].parentNode.querySelectorAll("*")) {
				const style = e.getAttribute("style")?.replace(varRegex, (m, varName) => window.getComputedStyle(e).getPropertyValue(varName));
				if(style) {
					e.setAttribute("style", style);
				}
			}
		}

		if(settings?.removeDominantBaseline) {
			// for SVG renderers that do not support dominant-baseline (e.g., rsvg)
			for(const e of roots[1].parentNode.querySelectorAll("text")) {
				const propName = "dominant-baseline";
				const propValue = "text-before-edge";
				if(window.getComputedStyle(e).getPropertyValue(propName) === propValue) {
					e.setAttribute("style", e.getAttribute("style").replace(new RegExp(`${propName}: ${propValue};`), ""));
					e.setAttribute("y", window.getComputedStyle(e).getPropertyValue("font-size")*1 + e.getAttribute("y")*1);
				}
			}
		}

		const ret = inactivateSVG(roots[1].parentNode);
		return ret;
}

function patchSVGDOM(window) {
	if(!window) {
		window = createSVGWindow();
	}
	function addAccessor(obj, name, aname, defaultValue) {
		aname = aname || name;
//*
		Object.defineProperty(obj, name, {
			get: function() {
/*/
		// TODO: why does "this" not work with this version?
		Object.assign(obj, {
			get [name]() {
/**/
				const element = this;
				return {
					get baseVal() {
						const ret = element.getAttribute(aname);
						return ret || defaultValue;
					},
					get value() {
						const ret = element.getAttribute(aname);
						return ret || defaultValue;
					},
				};
			},
			configurable: true,	// in case we reconfigure (e.g., multiple calls to patchSVGDOM)
		});
	}
	function addElementAccessor(name, aname, defaultValue) {
		addAccessor(window.Element.prototype, name, aname, defaultValue);
	}
	addElementAccessor("href", "xlink:href");
	addElementAccessor("xlink:href");

	// TODO: remove the necessity for this?
	addElementAccessor("cx", "cx", 0);
	addElementAccessor("cy", "cy", 0);

	const attributes = Object.getOwnPropertyDescriptor(
		window.Element.prototype,
		"attributes"
	);
	const oldGetAttributes = attributes.get;
	attributes.get = function() {
		//return oldGetAttributes.get();
		const ret = oldGetAttributes.call(this);
		const element = this;
		Object.defineProperty(ret, "xlink:href", {
			get: function() {
				return {
					get value() {
						const ret = element.getAttribute("xlink:href");
						return ret;
					},
				};
			},
			configurable: true,	// in case we reconfigure (e.g., multiple calls to patchSVGDOM)
		});
		Object.defineProperty(ret, "name", {
			get: function() {
				return {
					get value() {
						const ret = element.getAttribute("name");
						return ret;
					},
				};
			},
			configurable: true,	// in case we reconfigure (e.g., multiple calls to patchSVGDOM)
		});
		return ret;
	}
	Object.defineProperty(window.Element.prototype, "attributes", {
		get: attributes.get,
		configurable: true,	// in case we reconfigure (e.g., multiple calls to patchSVGDOM)
	});
}

