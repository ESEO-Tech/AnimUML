/*	<!-- Remarks:
		- All messages in a block should declare an "in" parameter. However, doing so only for the first and last (+ for nested blocks) may be enough.
			=> now, only blocks and compartments should declare "in", "start" and "last" parameters, messages do not need to declare anything
		- blocks must be placed after objects so that lifelines do not overlap their labels

	     TODO:
		- improve slider "interactors" (e.g., by adding click on line)
		- enlarge space between objects depending on message name lengths
	     DONE:
		=> Ok if using new rule about block.{first,last} instead of message.in
			- fix block overlapping object (when reducing INTER_MESSAGE_MARGIN)
			- make sure messages coming before (it is the case!) or after (not observed) a block do not end up in it when reducing INTER_MESSAGE_MARGIN
		- alt sections in alt blocks => compartments
		- block "parameter" (e.g., [for 0 to n-1]) => desc param
		- message line style => + fixed params fall-through in params.js
		- improve performance by disabling autoSolve during initialization
		- add an upper-bound to arrowHead size => done with clipping
	-->
*/

var times = true;
var debugInlineConstraints = false;
var debugJSConstraints = false;
var debugEvents = false;


function getDef(id) {
//console.log("%s => %o", id, $(id))
	return $($(id).href.baseVal.replace(/^#/, ""));
}

function setDirection(wrapper) {
	var e = wrapper.elem;
	var	x1 = e.getAttribute('x1'),
		y1 = e.getAttribute('y1'),
		x2 = e.getAttribute('x2'),
		y2 = e.getAttribute('y2');
//console.log("%o, %o, %o, %o", x1, y1, x2, y2);
	if(x1 && x2 && x1 === x2) {
		wrapper.isVertical = true;
//console.log("\tvertical");
	} else if(y1 && y2 && y1 === y2) {
		wrapper.isHorizontal = true;
//console.log("\thorizontal");
	}
}

// even if advanced constraints are not used, this is still useful for things like width="20"
function applyInlineConstraints(id) {
	var def = getDef(id);

	if(!def) {
		console.log("ERROR: could not find definition for %o", id);
	}

	function nav(path, v) {
		path.split('.').every(function(pe) {
			if(v) {
				if(typeof v === 'string') {
					if($(v + '.' + pe)) {
						v = getWrapper(v + '.' + pe);
					} else if($(v)) {
						v = getParam(v, pe);
					} else {
						v = undefined;
						return false;
					}
				} else {
					v = v[pe];
				}
			} else {
				var fid = id + '.' + pe;
				if($(fid)) {
if(debugInlineConstraints) console.log(id + '.' + pe);
					v = getWrapper(id + '.' + pe);
				}
				if(!v) {
					v = getParam(id, pe);
if(debugInlineConstraints) console.log('!!! %o.%o => %o', id, pe, v);
				}
				if(!v) return false;
			}
			return true;
		});
		return v;
	}

	var vars = {
//		MARGIN: new Expression(10),
//		ARROW_SIZE: new Expression(20),
//		INTER_MESSAGE_MARGIN: INTER_MESSAGE_MARGIN,
//		INTER_OBJECT_MARGIN: INTER_OBJECT_MARGIN,
		get: function(token, dontCreate) {
//console.log("searching for variable %o", token);
			if(this[token]) return this[token];
			if(token.match(/[.]/)) {
				var ret = nav(token);
if(debugInlineConstraints) console.log("nav %o=%o", token, ret);
				return ret;
			} else {
				var v = window[token];
				if(v) {
					if(!(v instanceof Expression)) {
						v = new Expression(v);
					}
//console.log("got global var %o", v);
					return v;
				}
				v = getParam(id, token);
				if(v) {
if(debugInlineConstraints) console.log("param' %o = %o", token, v);
					if(v.match(/^[0-9]+([.][0-9]*)?$/)) {
						return new Expression(v * 1);
					} else {
if(debugInlineConstraints) console.log("using variable %o", v);
						v = this.get(v, false);
if(debugInlineConstraints) console.log("\t%o", v);
						return v;
					}
				}
				if(dontCreate) {
					throw "ERROR: variable '" + toek + "' not found";
					return undefined;
				}
				var init = getParam(id, token + '_init') * 1;
if(debugInlineConstraints) console.log("%o => %o", id + '.' + token, init);
				var ret = new Variable(token, init);
				if(init) {
if(debugInlineConstraints) console.log("add stay for %o = %o", token, init)
					ret.stay(c.Strength.weak, 1);
				}
				return ret;
			}
		},
	};

	def.children.filter(function(e) {
		return e.id;
	}).flatMap(e =>
		e.tagName === "pattern" ? [...e.children] : [e]
	).forEach(function(e) {
		if(e.tagName === 'clipPath') e = e.children[0];
		var idsuf = e.id;
		var wrapper = getWrapper(id + idsuf);
		//if(!wrapper) return;

if(debugInlineConstraints) console.log("%o wrapped as %o", $(id + idsuf), wrapper);

		//if(idsuf === '.outline') {
			wrapper.noTransform = true;	// all coordinates will therefore be absolute
		//}

		e.attributes.filter(function(a) {
			// TODO: reverse condition (i.e., only supported attributes should be considered instead of ignoring only specific attributes)
		//	return !['class', 'ignoreBounds', 'params', 'stroke', 'fill', 'id', 'content-value', 'style', 'stroke-dasharray', 'font-weight', 'font-size', 'clip-path', 'text-anchor', 'pointer-events', 'display', 'visibility'].includes(e.name)
			// https://www.w3.org/TR/SVG2/geometry.html
			// Unsupported elements: svg, image, foreignObject
			switch(String(e.tagName)) {
			case "text":
				return ["x", "y", "width", "height", "dx", "dy"].includes(a.name);
				break;
			case "rect":
				return ["x", "y", "width", "height", "rx", "ry"].includes(a.name);
				break;
			case "polyline":
			case "polygon":
				return ["points"].includes(a.name);
				break;
			case "ellipse":
				return ["cx", "cy", "rx", "ry"].includes(a.name);
				break;
			case "circle":
				return ["cx", "cy", "r"].includes(a.name);
				break;
			case "line":
				return ["x1", "y1", "x2", "y2"].includes(a.name);
				break;
			}
			return false;
		}).forEach(function(e) {
if(debugInlineConstraints) console.log(e);
			var exp = parse(e.value.split(' '), vars);
if(debugInlineConstraints) console.log('\t%o', exp);

			var aliases = {
				get x1() {return wrapper.p1.x;},
				get y1() {return wrapper.p1.y;},
				get x2() {return wrapper.p2.x;},
				get y2() {return wrapper.p2.y;},
			};
			var v = aliases[e.name];
			if(!v) {
				v = wrapper[e.name];
			}
			v.eq(exp).add();
		});
		e.children.forEach(function(child) {
			var path = child.nodeName.split('.');
			var o = wrapper;
			path.forEach(function(pe) {
				o = o[pe];
			});
if(debugInlineConstraints) console.log("nav %o.%o = %o", wrapper, path, o);

			function doWithExp(prop, action) {
				var src = child.getAttribute(prop);
				if(src) {
					var exp = parse(src.split(' '), vars)
					if(exp) action(exp);
				}
			}
			function doWithRef(prop, action) {
				var path = child.getAttribute(prop);
				if(path) {
					var v = nav(path);
if(debugInlineConstraints) console.log("v=%o", v);
					if(v) action(v);
				}
			}
			function setPrio(constraint) {
				var strength = child.getAttribute('strength');
				if(strength) {
					var weight = child.getAttribute('weight');
					if(!weight) {
						weight = 1;
					}
					constraint.setPriority(c.Strength[strength], weight);
				}
			}
			doWithExp('base', function(v) {
if(debugInlineConstraints) console.log("adding %o = %o", o, v);
				var delta = getDelta();
//console.log("delta of %o: %o", child, delta);
				if(delta.dx || delta.dy) {	// we check both dx and dy because if one is 0, then it is interpreted as false
					o = o.plus(delta.dx, delta.dy);
				}
				var constraint = o.eq(v);
				setPrio(constraint);
				constraint.add();
			});
			doWithExp('ge', function(v) {
if(debugInlineConstraints) console.log("adding %o > %o", o, v);

				var constraint = o.ge(v);
				setPrio(constraint);
				constraint.add();
			});
			doWithExp('le', function(v) {
if(debugInlineConstraints) console.log("adding %o < %o", o, v);

				var constraint = o.le(v);
				setPrio(constraint);
				constraint.add();
			});
			doWithRef('on', function(v) {
				setDirection(v);
				var constraint = o.onSegment(v);
				setPrio(constraint);
				constraint.add();
			});
			function getDelta() {
				var ret = {};
				doWithExp('dx', function(v) {
if(debugInlineConstraints) console.log("dx=%o", v);
					ret.dx = v;
				});
				doWithExp('dy', function(v) {
if(debugInlineConstraints) console.log("dy=%o", v);
					ret.dy = v;
				});
				if(ret.dx && !ret.dy) ret.dy = 0;
				if(ret.dy && !ret.dx) ret.dx = 0;
				return ret;
			}
			doWithRef('in', function(v) {
				var delta = getDelta();
				if(delta.dx) {
					o = o.plus(delta.dx, delta.dy);
				}
				var constraint = o.inRect(v);
				setPrio(constraint);
				constraint.add();
			});

		});
	});
	def.children.filter(function(e) {
		return ['eq', 'ge', 'le'].includes(e.nodeName);
	}).forEach(function(e) {
		var left = parse(e.getAttribute('left').split(' '), vars);
		var right = parse(e.getAttribute('right').split(' '), vars);
		if(left && right) {
if(debugInlineConstraints) console.log("%o %o %o", left, e.nodeName, right);
			left[e.nodeName](right).add();
		}
	});
/*
	for(vn in vars) {
		var v = getParam(id, vn);
		if(v) {
if(debugInlineConstraints) console.log("param %o = %o", vn, v);
			vars[vn].eq(v * 1).add();
		}
	}
*/
}


// TODO: move to Library
function applyConstraints(type, applier) {
	var elems = Array.prototype.filter.call(document.getElementsByTagName("use"),
		function(e) {
			return e.attributes["xlink:href"]?.value === type || e.attributes["href"]?.value === type;
		}
	);
	for(var idx in elems) {
//console.log("[%o] = %o as %o", idx, elems[idx], (elems[idx].id));
		applier(elems[idx].id);
	}
}

var resizeCanvas = !false;
// TODO: detect when this is called by the ResizeObserver when elements are no longer attached to the dom
function move() {
	var ymax = 0, ymin = Infinity;
	var xmax = 0, xmin = Infinity;
	var xmaxElem, ymaxElem, xminElem, yminElem;
	for(var id in idToWrapper) {
		const wrapper = idToWrapper[id];
		if(!wrapper.doNotMove) {
//if(idToWrapper[id] instanceof Rect) console.log(idToWrapper[id])
			wrapper.casso2svg();

			function get(aname) {
				return wrapper.elem.getAttribute(aname) * 1;
			}
			if(wrapper.elem.getAttribute("ignoreBounds")) {
				continue;
			}
			function updateYmax(y) {
				if(y > ymax) {
					ymax = y;
					ymaxElem = wrapper.elem;
				}
				if(y < ymin) {
					ymin = y;
					yminElem = wrapper.elem;
				}
			}
			function updateXmax(x) {
				if(x > xmax) {
					xmax = x;
					xmaxElem = wrapper.elem;
				}
				if(x < xmin) {
					xmin = x;
					xminElem = wrapper.elem;
				}
			}

			switch(wrapper.elem.tagName) {
				case 'rect':
					var y = get('y');
					updateYmax(y);

					var height = get('height');
					updateYmax(y + height);

					var x = get('x');
					updateXmax(x);

					var width = get('width');
					updateXmax(x + width);

//console.log("rect %o, %o, %o %o", x, y, width, height)
					break;
				case 'line':
					updateXmax(get('x1'));
					updateYmax(get('y1'));
					updateXmax(get('x2'));
					updateYmax(get('y2'));
					break;
				case 'circle':
					var r = get('r');
					updateXmax(get('cx') + r);
					updateXmax(get('cx') - r);
					updateYmax(get('cy') + r);
					updateYmax(get('cy') - r);
					break;
				default:
					// TODO: use this generic case for all elements?
					var bbox = wrapper.elem.getBBox();
					updateXmax(bbox.x);
					updateXmax(bbox.x + bbox.width);
					updateYmax(bbox.y);
					updateYmax(bbox.y + bbox.height);
					break;
			}
		}
	}
	// grow:
	xmin--; ymin--;
	xmax++; ymax++

	var width = xmax, height = ymax;
	var x = xmin < 0 ? xmin : 0;
	var y = ymin < 0 ? ymin : 0;
		width = xmin < 0 ? xmax - xmin : xmax;
		height = ymin < 0 ? ymax - ymin : ymax;

//console.log("xmax=%o for %o ; ymax=%o for %o", xmax, xmaxElem, ymax, ymaxElem);
//console.log("xmin=%o for %o ; ymin=%o for %o", xmin, xminElem, ymin, yminElem);
	if(resizeCanvas) {
		if(xmin < 0 || ymin < 0) {
			svg.setAttribute('viewBox', x + ' ' + y + ' ' + width + ' ' + height);
		} else {
			svg.removeAttribute('viewBox');
		}
		svg.setAttribute('width', width);
		svg.setAttribute('height', height);
	}
}

function constrainName(outline, name) {
	outline.width.ge(name.width.plus(MARGIN.times(2))).add();
	name.y.eq(name.height).add();	// does not need to be a constraint
	name.center.x.eq(outline.width.div(2)).add();
}

const navigators = {};
const constraints = {};

/*
window.onload = function() {
	onload1();
	onload2();
};
*/
onload1()
onload2()

function onload1() {
	startTime = new Date().getTime();
	if(debugInlineConstraints) console.log('Initializing...');

	window.solver = new c.SimplexSolver();


// Diagram-specific constraints are in templates, and may use variables such as MARGIN
	window.ZERO = new Expression(0);
	window.MARGIN = new Expression(10);
	window.INTER_OBJECT_MARGIN = new Variable("INTER_OBJECT_MARGIN", 100);
	window.INTER_MESSAGE_MARGIN = new Variable("INTER_MESSAGE_MARGIN", 50);
	window.INTER_OBJECT_MARGIN.stay(c.Strength.medium);
	window.INTER_MESSAGE_MARGIN.stay(c.Strength.medium);

	window.solver.autoSolve = false;	// we disable auto solving while adding all (initial) constraints in order to improve performance of initialization
						// DONE: find why compartments move to top of container when autoSolve=false => missing minimization constraint
						// WARNING: disabling autoSolve here makes the solver behave differently (see DONE above)

	document.getElementsByTagName('globalConstraints').forEach(function(e) {
//console.log("GLOBAL CONSTRAINTS: %o", e.innerHTML);
		eval(e.innerHTML);
	});
}
// order is important (actually all stays should come before)
function applyOwnedConstraints(id, tagName) {
	if(!tagName) tagName = "constraints";

	var def = getDef(id);
	var fs = "[" +
		def.children.filter(function(e) {
			return e.tagName === tagName;
		}).map(e =>
			"(function() {" +
				e.textContent
			+ "})"
		).join(",") + "]";
	fs = eval(fs);

	// constructor
	function Navigator(pid) {
		navigators[pid] = this;
		var nav = this;
		this.___id___ = pid;
		this.___group___ = document.getElementById(pid).nextSibling;	// actually the parent of the group with id=pid
					//document.querySelector(":not(use)#" + CSS.escape(this.___id___));
		let element = $(pid);
		element.children.forEach(function(e) {
			if(e.tagName === "param") {
				var name = e.getAttribute("name");
				var value = e.getAttribute("value");
				if(name !== 'name' && $(value)) {	// name !=== 'name' is to make sure we do not infinitely loop when id=name
if(debugJSConstraints) console.log("creating Navigator for " + value);
					try {
						value = getNavigator(value);
					} catch(e) {
						// if resolution failed, just keep the String value
					}
				} else if(value.match(/,/)) {
					const values = value.split(",");
					if(values.every(e => $(e))) {
						value = values.map(e => getNavigator(e));
					}
				} 
				nav[name] = value;
			}
		});
		element.attributes.forEach(function(e) {
			//if(!('xlink:href' === e.name || 'id' === e.name || 'display' === e.name)) {
			if(!['xlink:href', 'id', 'display'].includes(e.name)) {
			//switch(String(e.name)) {
			//case 'xlink:href': case 'id': case 'display': break;
			//default:
				var name = e.name;
				var value = e.value;
				if($(value)) {
if(debugJSConstraints) console.log("creating Navigator for " + value);
					value = getNavigator(value);
				} else if(value.match(/,/)) {
					const values = value.split(",");
					if(values.every(e => $(e))) {
						value = values.map(e => getNavigator(e));
					}
				}
				nav[name] = value;
			}
		});
		var def = getDef(pid);
		this.___def___ = def.id;
		function registerDefElem(e) {
			if(e.id.startsWith(".")) {
				var name = e.id.substring(1);
				var value = getWrapper(pid + e.id);
				nav[name] = value;
			}
			e.children.forEach(registerDefElem);
		}
		def.children.forEach(registerDefElem);
	}
	function getNavigator(id) {
		let ret = navigators[id];
		if(!ret) {
			ret = new Navigator(id);
		}
		return ret;
	}
	var nav = getNavigator(id)
	for(const f of fs) {
		var ret = f.call(
			nav
		);
		if(ret instanceof Constraints) {
			constraints[id] = ret;
			ret.add();
		}
	}
}
var moving = undefined;
var dx, dy

var movingName = undefined;
function registerMove(elemId, suffix) {
	var partId = elemId + "." + suffix;
	if(!$(partId)) {
		console.log("WARNING:registerMove: could not find part %o", partId);
		suffix = "outline";
	}
	var wrapper = getWrapper(elemId + "." + suffix)
	wrapper.elem.setAttribute("pointer-events", "all");
	wrapper.elem.ontouchstart =
	wrapper.elem.onmousedown = function(ev) {
		if(moving) return;
		moving = wrapper;
		svg.setAttribute('style', 'cursor: move');	// TODO: do better than setting whole attribute
if(debugEvents) console.log("mousedown|touchstart %s at x=%d, y=%d", elemId, moving.x.variable.value, moving.y.variable.value)
		wrapper.startMoving();
	//	dx = ev.x - moving.x.variable.value;
	//	dy = ev.y - moving.y.variable.value;

		var pos = getPosition(ev);

		// TODO: move to a tag-specific method?
		if(wrapper.elem.tagName === 'circle') {
			dx = pos.x - wrapper.x.variable.value;
			dy = pos.y - wrapper.y.variable.value;
		} else {
			// getBoundingClientRect returns coordinates relative to top left visible pixel, which is not the origin when scrolling
			dx = pos.x - wrapper.elem.getBBox().x;
			dy = pos.y - wrapper.elem.getBBox().y;
		}
if(debugEvents) console.log("mousedown|touchstart x=%d, y=%d ev@(%d, %d) dx=%d dy=%d", wrapper.elem.getBoundingClientRect().left, moving.y.variable.value, pos.x, pos.y, dx, dy);
//debug  console.log("dx=%d, dy=%d", dx, dy);
		solver.beginEdit();
		//suggest(ev);
		if(ev.preventDefault) {
			ev.preventDefault();
		} else {
			ev.defaultPrevented = true;
		}
		return true;
	}
//			$(elemId + ".outline").onmouseup = function() {
//				moving = undefined;
//			}
}

function getPosition(ev) {
	if(ev.touches) {
if(debugEvents)			console.log("ev=%o ev.touches=%o", ev, ev.touches);
		//console.log("ev.touches[0]=%o", ev.touches[0]);
		ev = ev.touches.item(0);
	}
	if(ev) {
		return {
			x: ev.pageX,	// used to be ev.x
			y: ev.pageY	//            ev.y
		};
	} else {
		// no item for touchend => use changedTouches?
		return undefined;
	}
}

function onload2() {

/*
	if(false) {
		applyConstraints("#object", applyOwnedConstraints);
		applyConstraints("#message", applyOwnedConstraints);
		applyConstraints("#slider", applyOwnedConstraints);
	} else {
		applyConstraints("#object", applyInlineConstraints);
		applyConstraints("#block", applyInlineConstraints);
		applyConstraints("#compartment", applyInlineConstraints);
		applyConstraints("#message", applyInlineConstraints);
		applyConstraints("#slider", applyInlineConstraints);
		
	}
*/
	var templateIds = {};
	document.getElementsByTagName('use').forEach(function(e) {
		var id = e.href.baseVal.replace(/^#/, '');
		if(!templateIds[id]) {
			templateIds[id] = document.getElementById(id);
if(debugJSConstraints) console.log("template %o: %o", id, templateIds[id]);
		}
	});
	for(var templateId in templateIds) {
		applyConstraints('#' + templateId, applyInlineConstraints);
		if($(templateId).children.some(function(e) {return e.tagName === 'constraints';})) {
			applyConstraints('#' + templateId, applyOwnedConstraints);
		}
		var movableSuffix = $(templateId).getAttribute('movable');
		if(movableSuffix) {
if(debugJSConstraints) console.log("movable: %o",templateId);
			movableSuffix.split(" ").forEach(function(movableSuffix) {
				applyConstraints('#' + templateId, function(id) {
					registerMove(id, movableSuffix);
				});
			});
		}
	}
	for(var templateId in templateIds) {
		if($(templateId).children.some(function(e) {return e.tagName === 'settings';})) {
			applyConstraints('#' + templateId, function(id) {
				applyOwnedConstraints(id, 'settings');
			});
		}
	}



//	applyConstraints("#slider", registerMove);


//	applyConstraints("#part", registerMove);
//	applyConstraints("#port", registerMove);

/*
	// move port labels
	applyConstraints("#port", function(id) {
		var name = $(id + ".name");
		name.ontouchstart =
		name.onmousedown = function(ev) {
			var pos = getPosition(ev);

			movingName = name;
			dx = pos.x - name.getBBox().x;//name.getBoundingClientRect().left;
			dy = pos.y - name.getBBox().y - name.getBBox().height;//name.getBoundingClientRect().top;

			ev.preventDefault();
			return true;
		}
	});
	applyConstraints("#cl", registerMove);
*/
	function props(e) {
		var ret = "{";

		var first = true;
		for(var prop in e) {
			if(first) {
				first = false;
			} else {
				ret += ", ";
			}
			ret += prop + ": " + e[prop];
		}

		ret += "}";
		return ret;
	}
	svg = document.getElementsByTagName('svg')[0];
	//svg.onmouseout =
	svg.ontouchend =
	svg.onmouseup = function(ev) {
		svg.setAttribute('style', 'cursor: default');	// TODO: do better than setting whole attribute
		var pos = getPosition(ev);
		if(moving) {
if(debugEvents) console.log("mouseup|touchend x=%d, y=%d", moving.x.variable.value, moving.y.variable.value)
			//suggest(e);
			solver.endEdit();
			if(moving.onmouseup) {
				moving.onmouseup(ev);
			}
			moving = undefined;

			if(pos) {
				// TODO: why if we do not set the position here, then it moves back to zero?
//				moving.x.variable.value = pos.x - dx;
//				moving.y.variable.value = pos.y - dy;
//debug  console.log("up x=%d, y=%d", moving.x.variable.value, moving.y.variable.value)
			}

//console.log("up %o", moving);
//				console.log("stopped moving because of " + props(e));
		} else if(movingName) {
			movingName = undefined;
		}
		return true;
	};
	function suggest(pos) {
if(debugEvents) console.log("suggesting: %o=%o, %o=%o", moving.x.variable, pos.x - dx, moving.y.variable, pos.y - dy);
		return moving.suggest(pos.x - dx, pos.y - dy);
	}
	svg.ontouchmove =
	svg.onmousemove = function(ev) {
		var pos = getPosition(ev);
		if(moving) {
//debug				console.log("moving " + moving);
//debug  console.log("move %o", moving)
if(debugEvents) console.log("mousemove|touchmove x=%d, dx=%d, pos.x=%d", moving.x.variable.value, dx, pos.x)
			suggest(pos);
			;
//debug  console.log(solver.getDebugInfo())

			applySwitchConstraints();

			move();
			//e.stopPropagation();
//debug		showStatus("pgc-bat.line");
		} else if(movingName) {
//debug				console.log(dx + " " + dy);
//debug				console.log(movingName.getBBox().x + " " + movingName.getBBox().y);
			movingName.setAttribute("x", pos.x - dx);
			movingName.setAttribute("y", pos.y - dy);
//debug				console.log(movingName.getBBox().x + " " + movingName.getBBox().y);
		}
		return true;
	};

	window.showStatus = function showStatus(id) {
		var wrapper = getWrapper(id);
		if(wrapper) {
			console.log(id + ": " + wrapper.toString());
		}
		return;
		if(msg) {
			console.log(msg);
		}
		var con = getWrapper("pgc.cardio-cardio.pgc.line");
		var pgc_cardio_outline = getWrapper("pgc.cardio.outline");
		var cardio_pgc_outline = getWrapper("cardio.pgc.outline");
		console.log("line: " + con.toString());
		console.log("pgc_cardio: " + pgc_cardio_outline.toString());
		console.log("cardio_pgc: " + cardio_pgc_outline.toString());
	}

//		solver.resolve();
//debug		showStatus("pgc-bat.line");


	if(debugInlineConstraints || times) console.log("created constraints in %oms.", new Date().getTime() - startTime);
	window.solver.autoSolve = true;

	solver.addEditVar(INTER_MESSAGE_MARGIN.variable);
	solver.suggestValue(INTER_MESSAGE_MARGIN.variable, 30);
	solver.resolve();
	move();

	if(debugInlineConstraints || times) console.log("Initialization complete in %oms.", new Date().getTime() - startTime);
	return;


	var con = Line("pgc.cardio-cardio.pgc.line");

	var pgc_cardio_outline = Rect("pgc.cardio.outline");
	var cardio_pgc_outline = Rect("cardio.pgc.outline");


//		pgc_cardio_outline.svg2casso();
//		cardio_pgc_outline.svg2casso();

	pgc_cardio_outline.stay();//c.Strength.required);
	cardio_pgc_outline.stay();//c.Strength.required);

	con.p1.inRect(pgc_cardio_outline);
	con.p2.inRect(cardio_pgc_outline);


	solver.resolve();
//debug		console.log(solver);
	resu = [con, pgc_cardio_outline, cardio_pgc_outline];

	con.casso2svg();
//		cardio_pgc_outline.casso2svg();
//		pgc_cardio_outline.casso2svg();

//debug		showStatus();
}

var conditionalConstraints = [];
function addConditionalConstraint(provider) {
	conditionalConstraints.push(provider);
}
function applySwitchConstraints() {
	for(var i = 0 ; i < conditionalConstraints.length ; i++) {
		//console.log(conditionalConstraints[i]);
		var cons = conditionalConstraints[i]();
		//console.log(cons);
		cons.add();
		cons.remove();
	}
}

function placePortOnEdge(port, owner) {
	function get(v) {return v.variable.value;}
	return function() {
		// TODO: make port.center reusable so that we do not have to recompute it here (e.g., by defining a variable for it, or by making Expressions evaluatable)
		var x = get(port.x);
		var w = get(port.width);
		var cx = x + w / 2;
		var ox = get(owner.x);
		var ow = get(owner.width);
		var y = get(port.y);
		var h = get(port.height);
		var cy = y + h / 2;
		var oy = get(owner.y);
		var oh = get(owner.height);

		var constraints = [
			{
				// port.center.isOn(owner.left)
				dist: Math.abs(cx - ox),
				cons: port.center.onSegment(owner.left)
			},
			{
				// port.center.isOn(owner.right)
				dist: Math.abs(cx - (ox + ow)),
				cons: port.center.onSegment(owner.right)
			},
			{
				// port.center.isOn(owner.top)
				dist: Math.abs(cy - oy),
				cons: port.center.onSegment(owner.top)
			},
			{
				// port.center.isOn(owner.bottom)
				dist: Math.abs(cy - (oy + oh)),
				cons: port.center.onSegment(owner.bottom)
			}
		];
		//console.log(constraints);
		constraints = constraints.sort(function(a, b) {return a.dist - b.dist;});
		//console.log(constraints);
		return constraints[0].cons;
	};
}
try {
	document.getElementsByTagName("defs")[0].innerHTML = templates;
} catch(e) {
	//console.log(e)
}

