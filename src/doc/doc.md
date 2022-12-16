<style>
	.title {
		font-size: 3em;
		font-weight: 600;
		text-align: center;
	}
	.markdown-body {
		counter-reset: h1counter;
	}
	h1 {
		counter-reset: h2counter;
	}
	h1:before {
		content: counter(h1counter) ".\0000a0\0000a0";
		counter-increment: h1counter;
	}
	h2 {
		counter-reset: h3counter;
	}
	h2:before {
		content: counter(h1counter) "." counter(h2counter) ".\0000a0\0000a0";
		counter-increment: h2counter;
	}
	h3 {
		counter-reset: h4counter;
	}
	h3:before {
		content: counter(h1counter) "." counter(h2counter) "." counter(h3counter) ".\0000a0\0000a0";
		counter-increment: h3counter;
	}
	h4 {
		counter-reset: h5counter;
	}
	h4:before {
		content: counter(h1counter) "." counter(h2counter) "." counter(h3counter) "." counter(h4counter) ".\0000a0\0000a0";
		counter-increment: h4counter;
	}
	h5 {
		counter-reset: h6counter;
	}
	h5:before {
		content: counter(h1counter) "." counter(h2counter) "." counter(h3counter) "." counter(h4counter) "." counter(h5counter) ".\0000a0\0000a0";
		counter-increment: h5counter;
	}
	h6:before {
		content: counter(h1counter) "." counter(h2counter) "." counter(h3counter) "." counter(h4counter) "." counter(h5counter) "." counter(h6counter) ".\0000a0\0000a0";
		counter-increment: h6counter;
	}
</style>

<span class="title">AnimUML Documentation</span>

This documentation explains how to use [AnimUML](/AnimUML.html).
It is a work in progress.
A [tutorial](tutorial.html) is also available.

AnimUML can be used to animate partial UML models that other tools would often not be able to execute.
It is described in [a research paper](https://conf.researchr.org/details/models-2020/models-2020-technical-track/35/Designing-Animating-and-Verifying-Partial-UML-Models) published at MODELS 2020.
This paper was presented using an interactive [presentation embedding AnimUML](https:/animuml.kher.nl/slides/MODELS2020.html) (follow the previous link to access the presentation slides).
AnimUML is available [on GitHub](https://github.com/fjouault/AnimUML).

AnimUML can be used in different ways: pre-defined models can be animated from the main user interface, as well as embedded into interactive documents, or presentations.
This document covers the following topics:
* [animation](#animation),
* [model analysis](#model-analysis),
* [model edition](#edition),
* [model exportation](#export),
* [textual creation of models](#defining-models-textually),
* and [keyboard shortcuts](#keyboard-shortcuts).

# Animation


## Single Object

The current state is highlighted (e.g., in green, but this depends on current style).
Currently fireable transitions are highlighted (e.g., as a link, blue and underlined)
Clicking on such a fireable transition makes the state machine perform one execution step:
* receive the message corresponding to the transition's trigger, if defined,
* perform the transition's effect, if defined.
This may include updating object properties, or sending messages.

While the state machine is being executed, a history/trace of this execution is stored, and displayed as the "Execution history/trace" diagram on the right-hand side of the page.

Remarks:
* Current pseudostates are highligthed with a note.
Although pseudostates are not states, and UML state machines are not normally allowed to remain in a pseudostate, AnimUML stops on pseudostates in order to let the user control the execution.

<iframe id="ex1" width="100%" height="380" src='/AnimUML.html#{
	"name": "Test",
	"stateByName": {
		"init": {"kind": "initial"}
	},
	"settings": {
		"interface": {
			"iframe": "ex1",
			"load": "Lamp",
			"disableModelSelection": true,
			"disableObjectSelection": true,
			"disableDoc": true,
			"disableSettings": true,
			"disableEdit": true
		}
	}
}'>
</iframe>

## Multiple Objects

When multiple objects are present in the model, it is possible to make them communicate.
The state machine of each object may be animated in the same way as for [single object models](#single-object), but some transitions may be unfireable because their trigger has not been received yet.
Although it is, by default, always allowed to fire transitions with triggers when there is single object, when there are multiple objects transitions may, by default, only be fired if their trigger match an event that has already been sent by an object.
Transitions that cannot be fired because of an unmatch triggered are not shown as links, and their triggers are shown in <span style="color: red; font-weight: bold; text-decoration: line-through;">crossed-out bold red</span>.

Remarks:
* AnimUML offers multiple "semantics" settings that can change its "by default" behavior.
For instance, it is possible to allow any transition to be fired in multiple object mode, even if its trigger does not match an event that has already been sent.
These settings may be accessed by clicking on the "semantics" link around the top left of the page, unlessed it is disabled as it is in the model below.

<iframe id="ex2" width="100%" height="860" src='/AnimUML.html#{
	"name": "Test",
	"settings": {
		"interface": {
			"iframe": "ex2",
			"load": "ButtonLampBulbWithMethods",
			"disableModelSelection": true,
			"disableObjectSelection": true,
			"disableDoc": true,
			"disableSettings": true,
			"disableEdit": true
		}
	},
	"historyCauses": ["transition:button.tInitialOFF", "transition:lamp.tInitialOFF", "transition:button.T1", "transition:lamp.tOFFON", "operation:bulb.turnOn", "transition:button.T2", "transition:lamp.tONOFF", "operation:bulb.turnOff", "transition:button.T1", "transition:lamp.tOFFON", "operation:bulb.turnOn", "transition:lamp.T1", "operation:bulb.turnOff"]
}'>
</iframe>

## Advanced Execution Control

* The "Reset" button around the top left of the page can be used to reset the execution to its initial state.
* Clicking on state invariants (hexagonal notes on lifelines) on the history/trace state diagram puts the execution back into that previous state.

## Interaction Diagrams

There are two kinds of interaction diagrams:
* history/trace, which shows a trace of the current model execution,
* specification interactions, which define stories that the modeled system should be able to follow, or, on the contrary, is forbidden to follow.
The diagram to display can be selected using the "Select interaction" drop-down list around the top left of the page, or using the "n"/"N" [keyboard shortcuts](#keyboard-shortcuts).

Specification interaction can only be shown as SVG sequence diagrams, but there are three kinds of representations for history/trace, which can be selected using the "Show history as" drop-down list, or using the "s", "p", and "t" [keyboard shortcuts](#keyboard-shortcuts):
* "TCSVG sequence" diagram
* PlantUML "sequence" diagram
* PlantUML "timing" diagram, a kind of chronogram
Some features work better using some diagram representations rather than others.


Remarks:
* Pseudostates may be shown in the history/trace sequence diagram as if there were states.
This is not valid according to the UML specification because pseudostates should not be stayed in.
AnimUML shows them in the history/trace sequence diagram nonetheless, because of the way it makes it possible to go back in time by clicking on past states.
* Messages are always shown horizontally in the PlantUML sequence representation of history/trace, even if they are not received immediately after being sent.
This is a limitation of PlantUML.
There are however shown with a slope when using the "TCSVG sequence" diagram.

## Notes on Firing transitions

Remarks:
* Transitions without trigger, guard, or effect do not have a label.
This is also true for internal transitions.
When such a transition is fireable, a specific label: "// fire" will appear.
Clicking on this label will fire the transition.
* While AnimUML is designed to follow the UML specification, it is possible to create non-standard executions.
For instance, a state machine should not stay in a pseudostate, and therefore an outgoing transition should be fired immediately each time a Pseudostate is reached.
However, AnimUML does not enforce this rule, which the user is therefore responsible for applying.

# Model Analysis

When using AnimUML, model analysis means any of the following activities:
* animation/simulation
* debugging (including [multiverse debugging](https://kar.kent.ac.uk/74328/))
* model checking

The model analysis menu can be opened by clicking on the "analysis" link around the top left corner of the page.

## Watch Expressions

Watch expressions can be used to evaluate any expression at every step of the execution.
They are defined in a table that can be opened by clicking on the "Watch expressions" link that appears after opening the model analysis menu.
Each expression has a name (first column), by which it can be referred to from subsequent watch expressions, as well as LTL properties, and an expression (second column).
When interactively animating a model, the current value of each watch expression is computed and shown in the third column of the table.

Watch expressions are written in JavaScript, and can make use of the following elements:
* `__ROOT__<objectName>` to access an object (e.g., `__ROOT__lamp` to access the `lamp` object)
* there are two available modes to access property values:
	* direct JavaScript mode (e.g., `__ROOT__lamp.isOn` to read the value of the `isOn` property of the `lamp` object)
	* using [EMI](http://www.obpcdl.org/bare-metal-uml/)-compatible macros: `GET(<objectName>, <propertyName>)` to read the value of the `<propertyName>` property of the `<objectName>` object (e.g., `GET(lamp, isOn)` to read the `isOn` property of the `lamp` object)
		* The EMI-compatible mode must be used to read attributes if it is used to set them in the model (e.g., using `SET(lamp, isOn, true)`)
* `IS_IN_STATE(<objectName>, <stateName>)` to check whether given object is in a given state, where `stateName` is the fully qualified name of a state: a dot-separated list composed of the object name followed by the top-level state name, itself followed by lower-level state names (e.g., `IS_IN_STATE(lamp, lamp.On)`)
* `EP_IS_EMPTY(<objectName>)` to check whether the event pool of an object is empty or not
* `EP_CONTAINS(<objectName>, <operationName>)` to check whether the event pool of an object contains a specific message (e.g., `EP_CONTAINS(lamp, onButton)` to check whether the `lamp` object has received the `onButton` message)

Remark:
* Although it is possible to edit watch expressions in the browser, they will not be saved unless the model is exported.
Non-trivial changes should therefore be performed in the [textual syntax](#defining-models-textually).

## In-browser Analysis

A list of available analysis commands appears when clicking on the "In-browser analysis" link of the analysis menu.
TODO

## Remote Analysis Tools

Some analyses, such as LTL property verification, cannot be performed using in-browser analysis.
They require connecting AnimUML to an external analysis tool.
This can be done by clicking on the "Connect to external analysis tool" link of the analysis menu.
It is necessary to enter a WebSocket address to a running analysis tool, and then click on the "Ok" button.
Note that there is no analysis tool running on the public AnimUML server at https://animuml.kher.nl/, even though the WebSocket URL may be pre-filled.
An analysis tool is available on the public AnimUML server at https://animuml.obpcdl.org/.
However, using such a remote analysis tool is typically significantly slower than using a local one.

Once the connection to the external analysis tool is established, a list of available commands will be displayed.
Some commands may take LTL properties as argument.
It is possible to write such properties by opening the LTL properties table.
This can be done by clicking on the "LTL properties" link of the analysis menu.
LTL properties can make use of watch expressions, and are defined in the [GPSL syntax](http://www.obpcdl.org/properties/2019/05/09/buchi/), which also supports the definition of properties as Büchi automata.

Remark:
* Although it is possible to edit watch expressions in the browser, they will not be saved unless the model is exported.
Non-trivial changes should therefore be performed in the [textual syntax](#defining-models-textually).

# Edition

Models can be edited directly in the browser by going to edition mode.
This can be performed by clicking on the "Edit" link around the top left of the page, or by pressing the "e" key (see [the list of keyboard shortcuts](#keyboard-shortcuts)).


Remarks:
* Limitations
	* Not all parts of a model are currently editable.
	* Models are not saved, and will be lost if they are not exported first, notably when closing the tab or window, or when refreshing the page.
	* ⇒  Non trivial edition (including from scratch model creation) should be done [in JSON](#defining-models-textually).
* To remove a transition trigger, guard, or effect: edit it to the empty string (i.e., remove all text from input field, then press Ok).

# Export

Models can be exported into various formats by clicking on the corresponding links in the "export" user interface menu:
* model with or without history
	* "HTML file": clicking on this link will download an HTML file of the current model similar to the templates given in [the next section](#defining-models-textually).
	This is the recommended way to download a model in order to work on it.
	* "AnimUML link": clicking on this link will open a new browser window or tab with the current model passed as URL fragment (i.e., JSON text after a "#" symbol).
	This link can be copied, and pasted into a document for future reference, or into a message (e.g., email, instant message) in order to share it with others.
	* "JSON file": clicking on this link will download a prettified JSON definition of the current model.
* "tUML file": clicking on this link will download a tUML definition of the current model.
This format corresponds to a textual version of the [Eclipse UML](https://projects.eclipse.org/projects/modeling.mdt.uml2) metamodel, and it can be parsed so as to be loaded into Eclipse UML compatible tools such as [Papyrus](https://www.eclipse.org/papyrus/), or [EMI](http://www.obpcdl.org/bare-metal-uml/).
* PlantUML diagrams:
	* "main": clicking on this link will open the PlantUML online editor with the currently shown diagram without annotations (e.g., links to fire transitions, current state coloration).
	If the "with annotations" checkbox is checked before clicking on the "PlantUML" link, then the currently displayed diagram with all annotations will be open in the PlantUML online editor.
	* "interaction": clicking on this link will export the currently displayed interaction diagram (e.g., sequence diagram, or timing diagram).
	If this diagram is a PlantUML diagram, then the PlantUML online editor will open in a new tab or window.
	The "with annotations" checkbox also impacts how PlantUML interaction diagrams are exported.
	If this diagram is an SVG diagram, then an SVG file will be downloaded.

<!--
	* Other links may appear, for instance if specific code generators are enabled.
* In the top right of the page (interaction view):
	* "model with history": clicking on this link will open a new browser window or tab with the current model, including current history/trace and some settings, passed as URL fragment.
	This link can be used in the same way as described above for the "AnimUML" link.
	The main advantage of this link over the "PlantUML" link is that it can be used to share the model's current execution, as well as (some) current settings.
	* "(pretty)": clicking on this link will download a prettified JSON definition of the current model, including current history/trace and some settings.
-->

# Defining Models Textually

## Syntax

All parts of a model can be defined in JSON, and this notation can be used as URL fragment.
Rather than using the JSON notation, the standard JavaScript notation may be used in some contexts (e.g., when loading a model programmatically).
Examples are listed below in the [examples section](#examples).

Some model parts can also be defined more concisely using a [PlantUML](https://plantuml.com/)-like syntax:
* state machines (see [grammar](stateGrammar.html)), which basically follow [the PlantUML syntax for state diagrams](https://plantuml.com/fr/state-diagram) with:
	* some extensions
	* some limitations:
		* only valid transition labels may be used, such as:
			* `trigger[guard]/effect`
			* `trigger[guard]`
			* `trigger/effect`
			* `trigger`
			* `[guard]/effect`
			* `[guard]`
			* `/effect`
			* nothing for transitions with neither a trigger, nor a guard, or an effect.
* interactions (see [grammar](sequenceGrammar.html)), which basically follow [the PlantUML syntax for sequence diagrams](https://plantuml.com/fr/sequence-diagram) with:
	* some extensions
	* some limitations:
		* This PlantUML-like syntax is strongly recommended over the JSON syntax for interactions.
* classes (see [grammar](classGrammar.html)), which basically follow [the PlantUML syntax for class diagrams](https://plantuml.com/fr/class-diagram) with:
	* some extensions
	* some limitations

If there is a syntax error in such PlantUML-like model parts, it will be shown on the page in place of the main diagram (to the left-hand side of the page).

<!--
The import function can be (ab)used to specify state machines in .html files.
The following HTML code excerpt results in a link that, when clicked, opens the specified state machine.
-->
Remarks:
* You can use any installation of AnimUML by using the appropriate host and port in the URL, but the public server will be used in the examples below.
	* Some techniques shown below may not work with the public server as of writing this documentation.
	If that is still the case when reading it, then it will ne necessary to change the server URL to another installation.


## How to Load A Custom Model

### [Preferered] `<iframe>`s With Externally Defined Model

This method is the preferred way, although slightly more complex than others, for two reasons:
* It is not restricted to JSON, which means that the full JavaScript notation may be used, including multine strings (using backquotes), which are extremely useful for PlantUML blocks of code.
* It does not require clicking on a link after refreshing the page.

#### Example of a model with a single object

```
<script>
const model = {
	"name": "MyExample",
	"stateByName": {
		"init": {
			"name": "init",
			"type": "Pseudostate",
			"kind": "initial"
		}
	},
	"transitionByName": {
		"T1": {
			"source": "init",
			"target": "WaitingIndefinitely"
		}
	},
	"settings": {
		"interface": {
			"iframe": "iframeEx",
			"disableModelSelection": true,
			"disableObjectSelection": true,
			"disableDoc": true,
			"disableSettings": true,
			"disableEdit": true
		}
	}
};
document.write(`
	<iframe width="100%" height="100%" src='https://animuml.kher.nl/AnimUML.html#${encodeURIComponent(JSON.stringify(model)).replace(/'/g, '%27')}'></iframe>
`);
</script>
```

#### Example of a model with multiple objects

This model uses the PlantUML-like notation for state machines, and also has watch expressions, LTL properties, and custom settings.

```
<script>
const model = {
	name: 'ButtonLamp',
	objects: [
		{
			name: 'button',
			class: 'Button',
			isActor: true,
			behavior: `
				[*] --> Waiting
				Waiting --> Waiting : /onButton();
				Waiting --> Waiting : /offButton();
			`,
		},
		{
			name: 'lamp',
			class: 'Lamp',
			behavior: `
				[*] --> Off
				On --> Off : offButton/turnOff();
				Off --> On : onButton/turnOn();
				On --> Off : after(10min)/turnOff();
			`,
		},
	],
	connectorByName: {
		C1: {
			// the names of the objects connected by this connector
			ends: ["button", "lamp"],
			// the names of the objects as seen from each other (can be the same name as the object's names, or different)
			endNames: ["button", "lamp"],
			possibleMessages: {
				forward: ["onButton", "offButton"],
			},
		},
	},
	watchExpressions: {
		lampOn:		"IS_IN_STATE(lamp, lamp.On)",
	},
	LTLProperties: {
		lampTurnsOn:	"[] (|EP_CONTAINS(lamp, onButton)| -> (<>lampOn))",
	},
	settings: {
		display: {
			// these settings are described in the "display" menu of the user interface where they appear in the same order

			hideLinks: false,

			// structural diagram
			hideClasses: false,
			hideOperations: false,
			hideMethods: false,
			showPorts: false,
			showEndNames: false,

			// state diagram
			hideStateMachines: false,
			hideOuterSMBoxes: false,
			showExplicitSM: false,

			// history/trace interaction diagram
			hideStates: false,
			showPseudostateInvariants: false,
			hideSets: false,
			showTransitions: false,
		},
		semantics: {
			// these settings are described in the "semantics" menu of the user interface where they appear in the same order

			fireInitialTransitions: true,
			autoFireAfterChoice: true,
			autoReceiveDisabled: false,
			considerGuardsTrue: false,
			checkEvents: true,
			keepOneMessagePerTrigger: true,
			enableEventPools: true,
			matchFirst: true,
			symbolicValues: false,
			reactiveSystem: true,
		},
		interface: {
			hideEmptyHistory: false,
			disableInteractionSelection: false,
			disableModelSelection: false,
			disableObjectSelection: false,
			disableDoc: false,
			disableSettings: false,
			disableHistorySettings: false,
			disableReset: false,
			disableSwitchDiagram: false,
			onlyInteraction: false,
			hideInteraction: false,
			disableExports: false,
			hideHistory: false,
			disableEdit: false,
			historyType: "TCSVG sequence",
			interaction: undefined,
//			styleMode: "dark",
//			displayedObjects: [],
		},
		tools: {
			// uncomment to use a specific analysis tool (make sure to use the right URL)
//			defaultRemoteAnalysisToolURL: "ws://localhost:8090/obp2",
			// uncomment to use a specific remote engine (make sure to use the right URL)
//			defaultRemoteEngineURL: "ws://localhost:8090/SomeModel",
		},
	},
};
document.write(`
	<iframe width="100%" height="100%" src='https://animuml.kher.nl/AnimUML.html#${encodeURIComponent(JSON.stringify(model)).replace(/'/g, '%27')}'></iframe>
`);
</script>
```

This example also shows how watch expressions and LTL properties can be embedded in a model.

Remark:
* Other possibilities than programmatically creating the `<iframe>`'s `src` attribute value exist, such as using the "load" attribute in interface settings.

### As URL Fragment of a Link
The simplest way to load a JSON-defined AnimUML model consists in using the JSON code as the fragment (i.e., the part after the "#" symbol) of a link to AnimUML:

```
<a href='https://animuml.kher.nl/AnimUML.html#{
	"name": "MyExample",
	"stateByName": {
		"init": {
			"name": "init",
			"type": "Pseudostate",
			"kind": "initial"
		}
	},
	"transitionByName": {
		"T1": {
			"source": "init",
			"target": "WaitingIndefinitely"
		}
	}
}'>my example</a>
```

You can try it here: [my example](https://animuml.kher.nl/AnimUML.html#{"name":"MyExample","stateByName":{"init":{"name":"init","type":"Pseudostate","kind":"initial"}},"transitionByName":{"T1":{"source":"init","target":"WaitingIndefinitely"}}}).

Remarks:
* You may change the host part of the URL, for instance to make it point to a local installation of AnimUML.
* In file formats that do not support links with whitespaces (e.g., in Markdown), every space and newline must be removed, such as in the following code:
> `[my example](https://animuml.kher.nl/AnimUML.html#{"name":"MyExample","stateByName":{"init":{"name":"init","type":"Pseudostate","kind":"initial"}},"transitionByName":{"T1":{"source":"init","target":"WaitingIndefinitely"}}})`

### As URL Fragment of an `<iframe>`'s `src`
Alternatively, AnimUML can be embedded in an `<iframe>`, as was done above in the [animation section](#animation):
```
<iframe id="iframeEx" width="100%" height="270" src='AnimUML.html#{
	"name": "MyExample",
	"stateByName": {
		"init": {
			"name": "init",
			"type": "Pseudostate",
			"kind": "initial"
		}
	},
	"transitionByName": {
		"T1": {
			"source": "init",
			"target": "WaitingIndefinitely"
		}
	},
	"settings": {
		"interface": {
			"iframe": "iframeEx",
			"disableModelSelection": true,
			"disableObjectSelection": true,
			"disableDoc": true,
			"disableSettings": true,
			"disableEdit": true
		}
	}
}'>
</iframe>
```

Remarks:
* There should be no empty lines between `src='` and the closing quote.
* The `iframe` id can be specified as the value of the iframe attribute in interface settings to help AnimUML, but is often not necessary.

### As JSON Defined in a `<script>` tag

```HTML
<script id="model" type="application/x.animuml">
{
	"name": "MyExample",
	"stateByName": {
		"init": {
			"name": "init",
			"type": "Pseudostate",
			"kind": "initial"
		}
	},
	"transitionByName": {
		"T1": {
			"source": "init",
			"target": "WaitingIndefinitely"
		}
	},
	"settings": {
		"interface": {
			"iframe": "iframeEx",
			"disableModelSelection": true,
			"disableObjectSelection": true,
			"disableDoc": true,
			"disableSettings": true,
			"disableEdit": true
		}
	}
}
</script>
```

### General Remarks

Remarks:
* A `get` function returning the contentWindow of the `iframe` can be specified in the root document to help AnimUML, but is often not necessary.
It may for instance look like the following:
```
<script>
	function get(id) {
		return document.getElementById(id).contentWindow;
	}
</script>
```

Other settings may be specified to change the interface, how diagrams are displayed, or the execution semantics.


## Examples

All models available from the user interface can be [exported](#export).
The best way to learn how to write your own AnimUML models from them is probably to export them as HTML files and review their code.

Alternatively, you can also get the source of some examples by following these links:
* [LampeV1.js](../samples/LampeV1.js)
* [LampeV1_2.js](../samples/LampeV1_2.js)
* [LampeV2.js](../samples/LampeV2.js)
* [PubliphoneV1.js](../samples/PubliphoneV1.js)
* [PubliphoneV2.js](../samples/PubliphoneV2.js)
* [PubliphoneV3.js](../samples/PubliphoneV3.js)
* [PubliphoneV4.js](../samples/PubliphoneV4.js)
* [PubliphoneV5.js](../samples/PubliphoneV5.js)
* [PubliphoneV6.js](../samples/PubliphoneV6.js)
* [ThermostatV1.js](../samples/ThermostatV1.js)
* [ThermostatV2.js](../samples/ThermostatV2.js)
* [LecteurK7V1.js](../samples/LecteurK7V1.js)
* [LecteurK7V2.js](../samples/LecteurK7V2.js)
* [LecteurK7V3.js](../samples/LecteurK7V3.js)
* [LecteurK7V4.js](../samples/LecteurK7V4.js)
* [LecteurK7V5.js](../samples/LecteurK7V5.js)


Note that these are written in JavaScript, whereas some of the import mechanisms, which use JSON code as URL fragment, only supports JSON.
JSON imposes further restriction on the JavaScript notation, such as:
* property names and String values must be put between double quotes, whereas this is not necessary for the JavaScript-defined models such as in the files linked to above (e.g., unquoted property names, or single-quoted Strings).
* not all value types are supported
* multiline strings are not supported

Moreover, these examples do not use all available features (e.g., PlantUML-like syntaxes).

## Modeling Quick Start Guide

There are multiple ways to create AnimUML models.
They can notably either be directly modeled for AnimUML, or be created in another tool like [Papyrus](https://www.eclipse.org/papyrus/) before being imported into AnimUML.
This section presents one possible approach to directly create models for AnimUML:
1. create an HTML file (e.g., `YourModel.html`) from one of the given templates
	* use [this recommended template](#example-of-a-model-with-multiple-objects) by default
		* remember to modify the server URL (towards the end of the template) if you are not using the default one
2. load this file in a web browser
3. if there is a syntax error, go directly to step 5 in order to fix it, otherwise continue with step 4
	* Remark: some syntax error messages are directly displayed in the browser tab, but others may only appear in the JavaScript console of your browser's [web development tools](https://en.wikipedia.org/wiki/Web_development_tools). You should therefore open this console.
4. evaluate if the model diplayed in your browser corresponds to what you wanted to model
	* if that is the case, you are done
5. open your HTML file into a text editor (or switch back to an already opened editor window), and modify it
6. use your brower's refresh button to reload the model
7. Go back to step 3

This approach is represented below as a state machine:

<iframe id="modeling" width="100%" height="600" src='/AnimUML.html#{
	"name": "Test",
	"behavior": "
		state choice %3C%3Cchoice>>							\n
		state choice2 %3C%3Cchoice>>							\n
		[*] --> choice : /htmlFile = copyHTMLTemplate()\\ntab = browser.load(htmlFile)	\n
		choice --> EvaluateModel : [else]						\n
		choice --> ModifyModel : [syntaxError()]					\n
		EvaluateModel : do/animateModel()						\n
		EvaluateModel --> choice2							\n
		choice2 --> [*] : [modelFinished()]						\n
		choice2 --> ModifyModel : [else]						\n
		ModifyModel : entry/editor.open(htmlFile)					\n
		ModifyModel : do/addToOrFixModel()						\n
		ModifyModel --> choice : /browser.refresh(tab)					\n
	",
	"settings": {
		"display": {
			"hideClasses": true
		},
		"semantics": {
			"considerGuardsTrue": true,
			"autoFireAfterChoice": true,
			"fireInitialTransitions": true
		},
		"interface": {
			"mode": "structuralDiagramOnly",
			"disableModelSelection": true,
			"disableObjectSelection": true,
			"disableDoc": true,
			"disableSettings": true,
			"disableEdit": true,
			"hideInteraction": true,
			"historyType": "TCSVG sequence"
		}
	},
	"historyCauses": ["transition:Test.choice2EvaluateModel_1"]
}'>
</iframe>

# Keyboard Shortcuts

* Interactions
	* "s": switch history/trace to an SVG sequence diagram (can also be done by using the "Show history as" drop-down list)
	* "p": switch history/trace to a PlantUML sequence diagram (can also be done by using the "Show history as" drop-down list)
	* "t": switch history/trace to a PlantUML timing diagram (can also be done by using the "Show history as" drop-down list)
	* "l": lift the current history into a new interaction
	* "n"/"N": switch to next/previous interaction (can also be done by using the interaction drop-down list)
* Main diagram (objects, state machines)
	* "b": toggle hiding/showing state machines (can also be done by clicking on the corresponding checkbox in the display menu when it is visible)
	* "c": toggle hiding/showing objects (can also be done by clicking on the corresponding checkbox in the display menu when it is visible)
	* "e": start model edition (same as clicking on the "Edit" link when it is visible)
* Execution control
	* "r": reset the current execution (can also be done by clicking on the "Reset" link when it is visible)
* Miscellaneous
	* arrows: control the parent [remark](https://github.com/gnab/remark) or [revealjs](https://revealjs.com/) presentation when embedded in one
