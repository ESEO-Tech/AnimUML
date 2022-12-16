import * as fs from 'fs';
import {makeTCSVGStatic} from "./MakeTCSVGStatic.js";
import {dirname} from "path";
import {fileURLToPath} from 'url';
import {} from './ContextualEval.cjs';

	let tcsvgFile = process.argv[2];
	if(tcsvgFile) {
		const tcsvg = fs.readFileSync(tcsvgFile, "utf8");

		const svg = makeTCSVGStatic(tcsvg, dirname(fileURLToPath(import.meta.url)), {
			inlineStyles: true,
			removeDominantBaseline: true,
		});
		const svgFile = process.argv[3] ?? "/tmp/out.svg";

		fs.writeFile(svgFile, svg, "utf8", (err) => {
			if(err) {
				console.log(err);
			}
		});
		console.log("Saved to", svgFile);
	} else {
		console.log("Expected a file");
	}
