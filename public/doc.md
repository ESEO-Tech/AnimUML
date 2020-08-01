This documentation explains how to use [AnimUML](AnimUML.html).
It is a work in progress.

# Animation

TODO

## Single Object

<iframe id="ex1" width="100%" height="380" src='AnimUML.html#{
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

<iframe id="ex2" width="100%" height="860" src='AnimUML.html#{
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
	"historyCauses": ["transition:Button.tInitialOFF", "transition:Lamp.tInitialOFF", "transition:Button.T1", "transition:Lamp.tOFFON", "operation:Bulb.turnOn", "transition:Button.T2", "transition:Lamp.tONOFF", "operation:Bulb.turnOff", "transition:Button.T1", "transition:Lamp.tOFFON", "operation:Bulb.turnOn", "transition:Lamp.T1", "operation:Bulb.turnOff"]
}'>
</iframe>

## Sequence Diagram

Remarks:
* There is a display setting to show pseudostates in the sequence diagram as if there were states.
This is not valid according to the UML specification because Pseudostates should not be stayed in.
This is however useful in the sequence diagram nonetheless, notably because of the way it makes it possible to go back in time by clicking on past states.
* Messages are always shown horizontally, even if they are not received immediately after being sent.
This is a limitation of PlantUML.

## Firing transitions

Remarks:
* Transitions without trigger, guard, or effect do not have a label.
This is also true for internal transitions.
When such a transition is fireable, a specific label: "// fire" will appear.
Clicking on this label will fire the transition.
* While AnimUML is designed to follow the UML specification, it is possible to create non-standard executions.
For instance, a state machine should not stay in a Pseudostate, and therefore an outgoing transition should be fired immediately each time a Pseudostate is reached.
However, AnimUML does not enforce this rule by default, which the user is therefore responsible for applying.


# Edition

TODO

Remarks:
* To remove a transition trigger, guard, or effect: edit it to the empty string (i.e., remove all text from input field, then press Ok).

# Import-Export

TODO

# Custom State Machine Creation

The import function can be (ab)used to specify state machines in .html files.
The following HTML code excerpt results in a link that, when clicked, opens the specified state machine.

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

Alternatively, AnimUML can be embedded in an `iframe`:
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

There should be no empty lines between `src='` and the closing quote.
The `iframe` id must be specified as the value of the iframe attribute in interface settings.
Additionally, a `get` function returning the contentWindow of the `iframe` must be specified in the root document.
It may for instance look like the following:
```
<script>
	function get(id) {
		return document.getElementById(id).contentWindow;
	}
</script>
```

Other settings may be specified to change the interface, how diagrams are displayed, or the execution semantics.


You can find state machine examples by following these links:
* [Lamp.js](samples/Lamp.js)
* [ButtonLamp.js](samples/ButtonLamp.js)
* [ButtonLampBulb.js](samples/ButtonLampBulb.js)
* [ButtonLampBulbWithMethods.js](samples/ButtonLampBulbWithMethods.js)


But note that these are written in Javascript, whereas the import mechanism only supports JSON.
This mostly means that property names and String values must be put between double quotes when using this technique, whereas this has not necessarily been done in the Javascript files linked to above (e.g., unquoted property names, or single-quoted Strings).

