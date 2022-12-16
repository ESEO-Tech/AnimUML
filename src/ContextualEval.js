// Must be separate from the rest of AnimUML because it cannot "use strict" because of "with"
function contextualEval(code, asAsync = false, asFunction = false) {
	const wrappedCode = `
		${asFunction || asAsync ? `(${asAsync ? "async " : ""}() => {` : ""}
		with(this) {
			${code};
		}
		${asFunction || asAsync ? "})()" : ""}
	`;
	return eval(wrappedCode);
}

function addOption(select, name) {
	var opt = document.createElement("option");
	opt.appendChild(document.createTextNode(name));
	select.appendChild(opt);
}


const rnd = Math.random();

// https://stackoverflow.com/a/14521482
async function loadSample(scriptSrc) {
	//var last = (await import(`./Utils.js?nocache=${rnd}`)).last;
/*
	var last = (await import(`./AnimUML.min.js?nocache=${rnd}`)).last;
/*/
	var last = (await import(`./AnimUML.js?nocache=${rnd}`)).last;
/**/
	var script = document.createElement('script');
	// now that AnimUML is loaded asynchronously, these examples are already added
	script.onload = async () => {
//		addExample(last(examples));	// cannot get last when minified
		addExample(examples[examples.length-1]);
	};

	script.src = scriptSrc;
	document.head.appendChild(script);
}

async function myImport(f, m) {
	// nocache is apparently necessary to make sure modules are reloaded from the server (ctrl-shift-r in the browser is not enough for modules)
	const mod = await import(`./${m}.js?nocache=${rnd}`);
	if(f instanceof Array) {
		for(const ff of f) {
			window[ff] = mod[ff];
		}
	} else {
		window[f] = mod[f];
	}
}

//myImport("test", "AnimUML.min");
