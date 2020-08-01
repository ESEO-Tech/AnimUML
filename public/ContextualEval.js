// Must be separate from the rest of AnimUML because it cannot "use strict" because of "with"
function contextualEval(code) {
	return eval(`
		with(this) {
			${code};
		}
	`);
}

function addOption(select, name) {
	var opt = document.createElement("option");
	opt.appendChild(document.createTextNode(name));
	select.appendChild(opt);
}


const rnd = Math.random();

async function loadSample(scriptSrc) {
	var last = (await import(`./AnimUML.min.js?nocache=${rnd}`)).last;
	var script = document.createElement('script');
	script.onload = async () => {
		addExample(examples[examples.length-1]);
	};

	script.src = scriptSrc;
	document.head.appendChild(script);
}

async function myImport(f, m) {
	const mod = await import(`./${m}.js?nocache=${rnd}`);
	if(f instanceof Array) {
		for(const ff of f) {
			window[ff] = mod[ff];
		}
	} else {
		window[f] = mod[f];
	}
}

myImport("test", "AnimUML.min");

