var debugSVGConstraints = !true;
var debugArith = false;
// @begin JavaScript library extensions

	// set non enumerable property
	function setNE(o, p, v) {
		if(o[p]) return;	// TODO: allow override

		Object.defineProperty(o, p, {
			value: v
		});
	}
/*
	setNE(Array.prototype, 'contains', function(e) {
		return this.some(function(f) {
			return e === f;
		});
	});
*/
	setNE(Array.prototype, 'peek', function() {
		return this[this.length - 1];
	});

	setNE(Array.prototype, 'find', function(predicate) {
		var ret = this.filter(predicate);
		return ret[0];
	});


	// Extend Array-like types (e.g., from DOM) to support some Array functions:
	var arrayLikeTypes = [HTMLCollection, NamedNodeMap, NodeList];	// NodeList required for JavaFX WebView but not for Chrome... why?
	var arrayFunctions = ['forEach', 'filter', 'find', 'some'];
	arrayLikeTypes.forEach(function(t) {
		arrayFunctions.forEach(function(f) {
			//t.prototype[f] = Array.prototype[f]
			setNE(t.prototype, f, Array.prototype[f]);
		});
	});

/*
	// innerHTML does not exist with JavaFX WebView
	Element.prototype.__defineGetter__('innerHTML', function() {
console.log(JSON.stringify(this.textContent))
		return this.textContent;	// TODO: fix this to return actual HTML content instead of text?
						// but we now need unescaped textCOntent anyway
	});
	// children does not exist with JavaFX WebView
	Element.prototype.__defineGetter__('children', function() {
		return this.childNodes.filter(function(e) {
			return e instanceof Element;
		});
	});

		// http://webfx.eae.net/dhtml/mozInnerHTML/mozInnerHtml.html
	Element.prototype.__defineSetter__('innerHTML', function(str) {
		var r = this.ownerDocument.createRange();
		r.selectNodeContents(this);
		r.deleteContents();
		//var df = r.createContextualFragment(str);
		var df = new DOMParser().parseFromString('<foo xmlns="' + this.namespaceURI + '">' + str + '</foo>', 'text/xml').documentElement;
		var self = this;
		window.df = df;
		window.self = self;
		df.childNodes.filter(function() {
			return true;	// we filter as a means to copy the array (otherwise, it gets modified when appendChild is called)
		}).forEach(function(e) {
			self.appendChild(e);
		});
	});
*/

// @end JavaScript library extensions

	function extend(child, parent) {
		function c() {}
		c.prototype = parent.prototype;
		child.prototype = new c();
	}


	// Library
	//var svg = document.documentElement;
	// Moved to inlineConstraints after document loaded
	//var svg = document.getElementsByTagName('svg')[0];
	var idToWrapper = new Object();

		function asConstraint(e) {
//			console.log("asConstraint(" + e + ")");
			if(e.constraint) {
				return e.constraint;
			} else {
				return c.Expression.fromConstant(e);
			}
		}

// @begin Arithmetic constraints library: Variables, Expressions, and Constraints
// This library wraps the Cassowary solver. Switching to a different solver would mostly require changes in this part (ideally).

	function Expression(constraint) {
		var exp = arguments;
		if(typeof(constraint) === "number") {
			constraint = c.Expression.fromConstant(constraint);
		}
		this.__defineGetter__("constraint", function() {
			return constraint;
		});
		this.__defineGetter__("exp", function() {	// TODO: private?
			return exp;
		});
		this.__defineGetter__("neg", function() {
			return new Expression(0).minus(this);
		});
/*	// should we need to get the value of arbitrary expressions: (same could also be done to be able to suggest a value for arbitrary expressions
		this.__defineGetter__("value", function() {
			if(this.variable) {
				return this.variable.value;
			} else {
				if(!this._valueVariable) {
					this._valueVariable = new Variable("valueVariable");
					this._valueVariable.eq(this.exp).add();
				}
				return this._valueVariable.value;
			}
		});
*/
	}
	/*
	 * @param {Expression} an other Expression
	 * @return {Expression} an expression representing the sum of this Expression, and the other Expression
	 */
	Expression.prototype.plus = function(o) {
		return new Expression(this.constraint.plus(asConstraint(o)), this, "+", o);
	};
	/*
	 * @param {Expression} an other Expression
	 * @return {Expression} an expression representing the difference of this Expression, and the other Expression
	 */
	Expression.prototype.minus = function(o) {
		return new Expression(this.constraint.minus(asConstraint(o)), this, "-", o);
	};
	/*
	 * @param {Expression} an other Expression
	 * @return {Expression} an expression representing the product of this Expression, and the other Expression
	 */
	Expression.prototype.mult =	// Loa's name for times
	Expression.prototype.times = function(o) {
		return new Expression(this.constraint.times(asConstraint(o)), this, "*", o);
	};
	/*
	 * @param {Expression} an other Expression
	 * @return {Expression} an expression representing the quotient of this Expression, and the other Expression
	 */
	Expression.prototype.div = function(o) {
		return new Expression(this.constraint.divide(asConstraint(o)), this, "/", o);
	};

	function trace(e, location) {
		// this is useful to find where a specific constraint was created
		//e.trace = Error().stack;
		if(location) {
			e.location = location;
		}
	}
	/*
	 * @param {Expression} an other Expression
	 * @return {Constraints} a list of constraints enforcing that this Expression equals the other Expression
	 */
	Expression.prototype.eq = function(o, location) {
//debug		console.log(this.toString() + "  =  " + o.toString());
		if(o === undefined) throw "ERROR: cannot force an Expression to equal undefined";
		const equa = new c.Equation(this.constraint, asConstraint(o));
		trace(equa, location);
		return new Constraints(equa);
	};
	/*
	 * @param {Expression} an other Expression
	 * @return {Constraints} a list of constraints enforcing that this Expression is greater than or equal to the other Expression
	 */
	Expression.prototype.ge = function(o, location) {
		var ineq = new c.Inequality(this.constraint, c.GEQ, asConstraint(o));
//debug  console.log("GEQ");
//debug  console.log(this.constraint);
//debug  console.log(o);
		trace(ineq, location);
		return new Constraints(ineq);
	};
	/*
	 * @param {Expression} an other Expression
	 * @return {Constraints} a list of constraints enforcing that this Expression is lower than or equal to the other Expression
	 */
	Expression.prototype.le = function(o, location) {
		var ineq = new c.Inequality(this.constraint, c.LEQ, asConstraint(o));
		trace(ineq, location);
		return new Constraints(ineq);
	};
	/*
	 * @param {Expression} an other Expression
	 * @return {Constraints} a list of constraints enforcing that this Expression is between this and the other Expression
	 */
	Expression.prototype.between = function(a, b, location) {
//				if(this.isVar) {
//debug			console.log("this = " + this.constraint);
//debug			console.log("a = " + a.constraint);
//debug			console.log("b = " + b.constraint);
			var ineq1 = new c.Inequality(asConstraint(a), c.LEQ, this.constraint);
//debug			console.log("INEQ1 " + ineq1);
//debug  console.log(this.constraint);
//debug  console.log(a);
//debug  console.log(b);
//debug  console.log(ineq1);
//					solver.addConstraint(ineq);
			var ineq2 = new c.Inequality(asConstraint(b), c.GEQ, this.constraint);
//debug			console.log("INEQ2 " + ineq2);
//					solver.addConstraint(ineq);
//debug			console.log("end between");
			trace(ineq1, location);
			trace(ineq2, location);
			return new Constraints(ineq1, ineq2);
//				} else {
//					throw "fail";
//				}
		return new Expression(this, "between", a, "and", b);
	};
//			or: function(o) {
//				return Expression(this, "or", o);
//			},
	Expression.prototype.toString = function() {
		return Array.prototype.map.call(this.exp, function(e) {
			if(e) return "(" + e.toString() + ")"; else "undef";
		}).join();
	};
	Expression.prototype.st = function(strength, weight) {
		var v = new Variable('stay constraint variable');
		return (
			this.eq(v)
		).and(
			v.st(strength, weight)
		);
	};
	Expression.prototype.stay = function(strength, weight) {
//		var autoSolve = solver.autoSolve;
//		solver.autoSolve = true;

//console.log("stay %o %o", strength, weight);
		var v = new Variable('stay constraints');
		this.eq(v).add();
//if(!solver.autoSolve) solver.resolve();
//solver.resolve();
//console.log("stay variable = %o", v.variable.value);
		solver.addStay(v.variable, strength, weight);

//		solver.autoSolve = autoSolve;

		// should a caller need to observe the value of this expression:
		return v;
	};
	Expression.prototype.intervalTo = function (to) {
		return new Interval(this.minus(to));
	}


	function Interval(v) {
		/* 
		 * Constructor for interval objects. Conceptually, an interval has two scalar bounds and its length
		 * (i.e., the absolute value of the difference between its bounds) can be constrained. Note, however,
		 * that no absolute value computation can actually take place with linear arithmetic.
		 * @param
		 */

		if(v.length) {	// isArray
			this.bounds = v;
		} else {
			this.bounds = [v, v.neg];
		}
	}
	Interval.prototype.le = function (o, location) {
		var c
		this.bounds.forEach(function(e) {
			var nc = e.le(o, location);
			if(c) {
				c = c.and(nc);
			} else {
				c = nc;
			}
		});
		return c;
	};
	Interval.prototype.plus = function (o) {
		var sumBounds = [];
		this.bounds.forEach(function(e) {
			o.bounds.forEach(function(f) {
				// TODO: do we really need both e+f & f+e ?
				sumBounds.push(e.plus(f));
				sumBounds.push(f.plus(e));
			});
		});
		return new Interval(sumBounds);
	};
	Interval.prototype.mult =	// Loa's name for times
	Interval.prototype.times = function(o) {
		return new Interval(this.bounds.map(function(e) {
			return e.times(o);
		}));
	};
	Interval.prototype.minimize = function(strength, weight, location) {
		if(!strength) {
			strength = c.Strength.weak;
		}
		if(!weight) {
			weight = 1;
		}
		return this.le(1, location).setPriority(strength, weight).add();
	};
	Interval.prototype.debug = function() {
		console.log(this.bounds);
		return this;
	};

	/*
	 * Constructor
	 * @param {Constraint} vararg list of constraints
	 */
	function Constraints() {
		var constraints = [];
		for(var i = 0 ; i < arguments.length ; i++) {
			constraints = constraints.concat(arguments[i]);
		}
//debug  console.log("NEW");
//debug  console.log(arguments);
//debug  console.log(constraints);
		this.__defineGetter__("constraints",
			function() {
				return constraints;
			}
		);
	}
	Constraints.prototype.add = function() {
//debug  console.log("ADD");
//debug  console.log(this.constraints);
		for(var i = 0 ; i < this.constraints.length ; i++) {
			const cstr = this.constraints[i];
/*
			if(cstr instanceof c.StayConstraint) {
console.log("adding stay:", cstr, cstr.variable.value);
			}
*/
			solver.addConstraint(cstr);
//debug  console.log("added: " + this.constraints[i]);
		}
		return this;
	};
	Constraints.prototype.remove = function() {
		for(var i = 0 ; i < this.constraints.length ; i++) {
			solver.removeConstraint(this.constraints[i]);
		}
		return this;
	};
	/*
	 * @param {Constraints} an other list of Constraints
	 * @return {Constraints} a list of constraints enforcing the conjunction of this and the other list of Constraints
	 */
	Constraints.prototype.and = function(o) {
//		console.log(constraint.toString());
//		console.log(asConstraint(o).toString());
//		solver.addConstraint(this.constraint);
//		solver.addConstraint(asConstraint(o));
//		return Expression(this, "and", o);
		var ret = [];
//debug  console.log("AND");
//debug  console.log(this.constraints);
//debug  console.log(o.constraints);
		ret = Array.prototype.concat.call(ret, this.constraints);
//debug  console.log(ret);
		ret = Array.prototype.concat.call(ret, o.constraints);
//debug  console.log(ret);
		return new Constraints(ret);
	};
	Constraints.prototype.setPriority = function(strength, weight) {
		if(!strength) {
			strength = c.Strength.weak;
		}
		if(!weight) {
			weight = 1;
		}
		for(var i = 0 ; i < this.constraints.length ; i++) {
			this.constraints[i].strength = strength;
			this.constraints[i].weight = weight;
		}
		return this;	// to allow chaining
	};

	/*
	 * Constructor
	 * @param {String} name
	 * @param {Number} initial value defaulting to 0
	 */
	function Variable(name, value) {	// extends Expression
		var v = new c.Variable({
			name: name,
			value: value ? value : 0
		});
		Expression.call(this, c.Expression.fromVariable(v), name);
		this.isVar = true;
		this.variable = v;
		this.name = name;
	}
	extend(Variable, Expression);
	Variable.prototype.st = function(strength = c.Strength.weak, weight = 1) {
		return new Constraints(new c.StayConstraint(this.variable, strength, weight));
	};
	Variable.prototype.stay = function(strength, weight) {
		if(!strength) {
			strength = c.Strength.weak;
		}
		if(!weight) {
			weight = 1;
		}
		solver.addStay(this.variable, strength, weight);
		return this;
	};
	/*
	 * Suggests a new value for this Variable.
	 * Main usage scenario: to set a value while building constraints.
	 * When interacting (e.g., moving things around), this method should not be used.
	 * @param {Number} a new value for this variable
	 */
	Variable.prototype.suggest = function(value) {
if(debugArith) console.log("suggesting %o = %o", this, value);
		//var autoSolve = solver.autoSolve;
		//solver.autoSolve = false;

		solver.addEditVar(this.variable);
		solver.beginEdit();
		solver.suggestValue(this.variable, value);
		solver.endEdit();

		//solver.autoSolve = autoSolve;
	};
	Variable.prototype.inspect = function(msg) {
		this.variable.inspectMessage = msg;
	};
	c.SimplexSolver.prototype.onsolved = function(changes) {
		// TODO: "changes" only supported in more recent versions of cassowary js... which change the behavior of the solver too
		if(changes) {
//console.log(changes);
			changes.forEach(function(change) {
				if(change.variable.inspectMessage) {
					console.log("%s=%d (was %d)", change.variable.inspectMessage, change.variable.value, change.oldValue);
				}
			});
		}
	}

// @end Arithmetic constraints library


// @begin Geometric constraints library: Points, Segment, and Rectangles
	/*
	 * Constructor
	 * @param {Variable} x coordinate
	 * @param {Variable} y coordinate
	 */
	function Point(x, y) {
		this.__defineGetter__("x",
			function() {
				return x;
			}
		);
		this.__defineGetter__("y",
			function() {
				return y;
			}
		);
	}
	/*
	 *
	 * @param {Expression} dx
	 * @param {Expression} dy
	 * @return {Point} a new Point at coordinates x+dx, y+dy 
	 */
	Point.prototype.plus = function(dx, dy) {
		return new Point(this.x.plus(dx), this.y.plus(dy));
	};
	Point.prototype.dx = function(dx) {
		return new Point(this.x.plus(dx), this.y);
	};
	Point.prototype.dy = function(dy) {
		return new Point(this.x, this.y.plus(dy));
	};
	/*
	 *
	 * @param {Expression} dx
	 * @param {Expression} dy
	 * @return {Point} a new Point at coordinates x-dx, y-dy 
	 * OR
	 * @param {Point} o
	 * @return {Point} a vector
	 */
	Point.prototype.minus = function(dx, dy) {
		if(dx instanceof Point) {
			var o = dx;
			return new Point(this.x.minus(o.x), this.y.minus(o.y));
		} else {
			return new Point(this.x.minus(dx), this.y.minus(dy));
		}
	};
	Point.prototype.st = function(strength, weight) {
		return (
			this.x.st(strength, weight)
		).and(
			this.y.st(strength, weight)
		);
	};
	Point.prototype.stay = function(strength, weight) {
		return {x: this.x.stay(strength, weight), y: this.y.stay(strength, weight)};
	};
	Point.prototype.eq = function(o, location) {
		return (
			this.x.eq(o.x, location)
		).and(
			this.y.eq(o.y, location)
		);
	};
	/*
	 * @param {Rectangle} rectangle
	 * @return {Constraints} a list of constraints that enforce this point to be
	 * inside the rectangle
	 */
	Point.prototype.inRect = function(r, location) {
		return r.mustContain(this, location);
	};
	/*
	 * @param {Segment} segment that must be either always horizontal or always
	 * vertical
	 * @return {Constraints} a list of constraints that enforce this point to be
	 * on the segment
	 */
	Point.prototype.onSegment = function(s, position, location) {
		if(s.isHorizontal) {
//debug			console.log("horiz " + this.y);

			return (
				this.y.eq(s.p1.y, location)
			).and(
				this.x.between(s.p1.x, s.p2.x, location)
			);
		} else if(s.isVertical) {
//debug			console.log("vert " + this.x);

			return (
				this.x.eq(s.p1.x, location)
			).and(
				this.y.between(s.p1.y, s.p2.y, location)
			);
		} else {
			console.log("ERROR: neither horiz, nor vert");
		}
	};
	Point.prototype.distTo = function(o) {
		/*
		 * @param {Point} an other point
		 * @return {Interval} an interval representing the rectilinear (or taxicab) distance between
		 * this point and the point passed as parameter.
		 */
		return (
			this.x.intervalTo(o.x)
		).plus(
			this.y.intervalTo(o.y)
		);
	};

	/*
	 * Constructor
	 * @param {Point} first extremity
	 * @param {Point} second extremity
	 */
	function Segment(p1, p2) {
		this.__defineGetter__("p1",
			function() {
				return p1;
			}
		);
		this.__defineGetter__("p2",
			function() {
				return p2;
			}
		);
		this.__defineGetter__("x1",
			function() {
				return p1.x;
			}
		);
		this.__defineGetter__("y1",
			function() {
				return p1.y;
			}
		);
		this.__defineGetter__("x2",
			function() {
				return p2.x;
			}
		);
		this.__defineGetter__("y2",
			function() {
				return p2.y;
			}
		);
	}
	/*
	 * @return {Point} a point that is constrained to be at the center of the segment
	 */
	Segment.prototype.__defineGetter__("center", function() {
		return new Point(
			this.p1.x.plus(this.p2.x.minus(this.p1.x).div(2)),
			this.p1.y.plus(this.p2.y.minus(this.p1.y).div(2))
		);
	});
	Segment.prototype.toString = function() {
		return "x1=" + this.p1.x.variable.value + ", y1=" + this.p1.y.variable.value +
		     ", x2=" + this.p2.x.variable.value + ", y2=" + this.p2.y.variable.value +
			(this.dx ? ", dx=" + this.dx:"") +
			(this.dy ? ", dy=" + this.dy:"") +
			", dx'=" + (this.p2.x.variable.value - this.p1.x.variable.value) +
			", dy'=" + (this.p2.y.variable.value - this.p1.y.variable.value)
		;
	};
	Segment.prototype.length = function() {
		/*
		 * @return {Interval} an interval representing the rectilinear (or taxicab) length of this segment.
		 * as an Interval, an upper bound may notably be applied to the returned value (using Interval.le), 
		 * but not a lower bound.
		 */
		return (
			this.x1.intervalTo(this.x2)
		).plus(
			this.y1.intervalTo(this.y2)
		);
	};

	/*
	 * Constructor
	 * @param {Expression} x coordinate of top left corner
	 * @param {Expression} y coordinate of top left corner
	 * @param {Expression} width
	 * @param {Expression} height
	 */
	function Rectangle(x, y, width, height) {
		this.__defineGetter__("x",
			function() {
				return x;
			}
		);
		this.__defineGetter__("y",
			function() {
				return y;
			}
		);
		this.__defineGetter__("width",
			function() {
				return width;
			}
		);
		this.__defineGetter__("height",
			function() {
				return height;
			}
		);
		this.__defineGetter__("center",
			function() {
				return new Point(
					x.plus(width.div(2)),
					y.plus(height.div(2))
				);
			}
		);
		this.__defineGetter__("topLeft",
			function() {
				return new Point(
					x,
					y
				);
			}
		);
		this.__defineGetter__("topRight",
			function() {
				return new Point(
					x.plus(width),
					y
				);
			}
		);
		this.__defineGetter__("bottomLeft",
			function() {
				return new Point(
					x,
					y.plus(height)
				);
			}
		);
		this.__defineGetter__("bottomRight",
			function() {
				return new Point(
					x.plus(width),
					y.plus(height)
				);
			}
		);
		this.__defineGetter__("top",
			function() {
				var ret = new Segment(
					new Point(x, y),
					new Point(x.plus(width), y)
				);
				ret.isHorizontal = true;
				return ret;
			}
		);
		this.__defineGetter__("bottom",
			function() {
				var ret = new Segment(
					new Point(x, y.plus(height)),
					new Point(x.plus(width), y.plus(height))
				);
				ret.isHorizontal = true;
				return ret;
			}
		);
		this.__defineGetter__("left",
			function() {
				var ret = new Segment(
					new Point(x, y),
					new Point(x, y.plus(height))
				);
				ret.isVertical = true;
				return ret;
			}
		);
		this.__defineGetter__("right",
			function() {
				var ret = new Segment(
					new Point(x.plus(width), y),
					new Point(x.plus(width), y.plus(height))
				);
				ret.isVertical = true;
				return ret;
			}
		);
	}
	Rectangle.prototype.st = function(strength, weight) {
		return (
			this.x.st(strength, weight)
		).and(
			this.y.st(strength, weight)
		).and(
			this.width.st(strength, weight)
		).and(
			this.height.st(strength, weight)
		);
	};
	Rectangle.prototype.stay = function(strength, weight) {
		if(!strength) {
			strength = c.Strength.weak;
		}
		if(!weight) {
			weight = 2;
		}
		if(this.x.variable) {
			solver.addStay(this.x.variable, strength, weight);
		}
		if(this.y.variable) {
			solver.addStay(this.y.variable, strength, weight);
		}
		if(this.width.variable) {
			solver.addStay(this.width.variable, strength, weight+1);
		}
		if(this.height.variable) {
			solver.addStay(this.height.variable, strength, weight+1);
		}
	};
	Rectangle.prototype.mustContainX = function(x, location) {
		return x.between(this.x, this.x.plus(this.width), location);
	};
	Rectangle.prototype.mustContainY = function(y, location) {
		return y.between(this.y, this.y.plus(this.height), location);
	};
	Rectangle.prototype.mustContain = function(p, location) {	// TODO: return COnstraints instead of adding?
		if(p instanceof Point) {
			return (
				this.mustContainX(p.x, location)
			).and(
				this.mustContainY(p.y, location)
			);
		} else if(p instanceof Rectangle) {
			return this.mustContain(p.topLeft, location).and(
				this.mustContain(p.bottomRight, location)
			);
		} else {
			throw "Rectangle.mustContain does not support parameter " + p;
		}
	};
	Rectangle.prototype.enlarge = Rectangle.prototype.enlarge || function(...args) {	// left top right bottom || w h || all
		let left, top, right, bottom;
		switch(args.length) {
		case 4:
			left = args[0]
			top = args[1]
			right = args[2]
			bottom = args[3]
			break;
		case 2:
			left = right = args[0]
			top = bottom = args[1]
			break;
		case 1:
			left = top = right = bottom = args[0]
			break;
		}
		return new Rectangle(this.x.minus(left), this.y.minus(top), this.width.plus(left).plus(right), this.height.plus(top).plus(bottom));
	};
	Rectangle.prototype.toString = function() {
		if(this.x.variable)
		return	"x=" + this.x.variable.value +
				", y=" + this.y.variable.value +
				", width=" + this.width.variable.value +
				", height=" + this.height.variable.value;
	};
	/*
	 * @param {Rectangle} rectangle
	 * @return {Constraints} a list of constraints that enforce this Rectangle to be
	 * inside the given rectangle
	 */
	Rectangle.prototype.inRect = function(r, location) {
		return r.mustContain(this, location);
	};
// @begin Geometric constraints library


// @begin SVGConstraints Library (extends Geometric constraints library): Line, Text, Rect, Polygon, and Circle
	/*
	 * Constructor
	 * @param {String}
	 */
	function Line(elemId) {	// extends Segment
		var elem = $(elemId);

		var x1 = new Variable(elemId + ".x1", elem.getAttribute("x1"));
		var y1 = new Variable(elemId + ".y1", elem.getAttribute("y1"));
		var x2 = new Variable(elemId + ".x2", elem.getAttribute("x2"));
		var y2 = new Variable(elemId + ".y2", elem.getAttribute("y2"));
		Segment.call(this, new Point(x1, y1), new Point(x2, y2));

		this.__defineGetter__("elem", function() {
			return elem;
		});
	}
	extend(Line, Segment);
	Line.prototype.casso2svg = function() {
		this.elem.setAttribute("x1", this.p1.x.variable.value);
		this.elem.setAttribute("x2", this.p2.x.variable.value);
		this.elem.setAttribute("y1", this.p1.y.variable.value);
		this.elem.setAttribute("y2", this.p2.y.variable.value);
	};
	Line.prototype.eq = function(o, location) {
		return (
			this.p1.eq(o.p1, location)
		).and(
			this.p2.eq(o.p2, location)
		);
	};


	const textDimUpdater = new ResizeObserver(entries => {
//console.log("HERE", entries);
		for(const entry of entries) {
			const wrapper = getWrapper(entry.target.id);
			wrapper.updateDimensions(entry.target.id, entry.target.getBBox());
		}
		solver.resolve();
		move();
	});

	// TODO: resizable text?
	globalThis.tcsvg = {};
	tcsvg.Text = function Text(elemId) {	// extends Rectangle
		var elem = $(elemId);


		var bbox = elem.getBBox();
		// using -1 as width & height value so that updateDimensions, on its first call from this constructor, will detect a change and add constraints
		var width = new Variable(elemId + ".bboxWidth", -1);//, bbox.width);
		var height = new Variable(elemId + ".bboxHeight", -1);//bbox.height);
		var bboxX = new Variable(elemId + ".bboxX", bbox.x);
		var bboxY = new Variable(elemId + ".bboxY", bbox.y);
	// DONE: use correct value instead of a guess (based on getBBox().y?)
//console.log("BBox.y of %o is %o", elem, bbox.y);
//console.log("BBox.x of %o is %o", elem, bbox.x);

/*		// trying to compensate for dominantBaseline != "text-before-edge"
		// problem: the offset should be updated in updateDimensions for this solution to work on resizing
		var x = new Variable(elemId + ".x", 0);
		var y = new Variable(elemId + ".y", 0);
		this.additionalConstraints = (
			y.eq(bboxY.minus(bbox.y))
		).and(
			x.eq(bboxX.minus(bbox.x))
		).add();
/*/
		var x = bboxX;
		var y = bboxY
		elem.style.dominantBaseline = "text-before-edge";
/**/

		Rectangle.call(this, bboxX, bboxY, width, height);
//console.log("TEST" ,height.variable.value, bbox.height)
		this.updateDimensions(elemId, bbox);

		this.__defineGetter__("elem", function() {
			return elem;
		});
		this.casso2svg = function() {
//			elem.parentNode.setAttribute('transform', 'translate(' + x.variable.value + ', ' + y.variable.value + ')');
			this.elem.setAttribute("x", x.variable.value);
			this.elem.setAttribute("y", y.variable.value);
		};

		textDimUpdater.observe(elem, {characterData: true, attributes: true});
	}
	extend(tcsvg.Text, Rectangle);
	tcsvg.Text.prototype.startMoving = function() {
		solver.addEditVar(this.x.variable);
		solver.addEditVar(this.y.variable);
		return this;
	};
	tcsvg.Text.prototype.remove = function() {
		this.dimStays?.remove?.();
		//this.additionalConstraints.remove();
	};
	const EPSILON = 0.1;
	tcsvg.Text.prototype.updateDimensions = function(elemId, bbox) {
		if(Math.abs(this.height.variable.value - bbox.height) <= EPSILON && Math.abs(this.width.variable.value - bbox.width) <= EPSILON) {
//console.log(elemId, "unchanged")
			return;
		}
//console.log("updateDimensions", elemId, "width:", this.width.variable.value, "->", bbox.width, ", height:", this.height.variable.value, "->", bbox.height)
		this.dimStays?.remove?.();
		this.width.variable.value = bbox.width;
		this.height.variable.value = bbox.height;
		// remark: cannot re-add existing stay constraints because their values have not been updated
		this.dimStays = (
			this.width.st(c.Strength.required)
		).and(
			this.height.st(c.Strength.required)
		).add();
	};
	tcsvg.Text.prototype.suggest = function(x, y) {
		solver
			.suggestValue(this.x.variable, x)
			.suggestValue(this.y.variable, y)
			.resolve();
		return this;
	};

	function Rect(elemId) {	// extends Rectangle
		var elem = $(elemId);

		var ownerId = elemId.replace(/[.].*$/,'');
//debug		console.log($(ownerId));
		var position = {
			x: getParam(ownerId, 'x') * 1,
			y: getParam(ownerId, 'y') * 1
		};
if(debugSVGConstraints) console.log(position);
		var x = new Variable(elemId + ".x");//, position.x);
		var y = new Variable(elemId + ".y")//, position.y);
		var width = new Variable(elemId + ".width", elem.getBBox().width);
		var height = new Variable(elemId + ".height", elem.getBBox().height);
		Rectangle.call(this, x, y, width, height);

		this.__defineGetter__("elem", function() {
			return elem;
		});
		this.svg2casso = function() {
var matrix = elem.getCTM();

// transform a point using the transformed matrix
var position = svg.createSVGPoint();
position.x = elem.getBBox().x;
position.y = elem.getBBox().y;
//debug  console.log('new pos: ' + position.x + ", " + position.y);
position = position.matrixTransform(matrix);
//console.log(position);
//				solver.addEditVar(x.variable).addEditVar(y.variable).addEditVar(width.variable).addEditVar(height.variable).beginEdit();

				x.variable.value = position.x;
				y.variable.value = position.y;
				width.variable.value = elem.getBBox().width;
				height.variable.value = elem.getBBox().height;

//				solver.suggestValue(x.variable, position.x);
//				solver.suggestValue(y.variable, position.y);

//				solver.endEdit();
		};
		this.casso2svg = function() {
			var x = this.x.variable.value;
			var y = this.y.variable.value;
			var width = this.width.variable.value;
			var height = this.height.variable.value;

			if(width < 0) {
				x = x + width;
			}
			if(height < 0) {
				y = y + height;
			}

			if(this.noTransform) {
				elem.setAttribute("x", x);
				elem.setAttribute("y", y);
			} else {
				this.elem.parentNode.setAttribute('transform', 'translate(' + this.x.variable.value + ', ' + this.y.variable.value + ')');
			}
				this.elem.setAttribute("width", Math.abs(width));
				this.elem.setAttribute("height", Math.abs(height));
		};
//		ret.svg2casso();
	}
	extend(Rect, Rectangle);
	Rect.prototype.startMoving = function() {
		solver.addEditVar(this.x.variable);
		solver.addEditVar(this.y.variable);
		return this;
	};
	Rect.prototype.suggest = function(x, y) {
		solver
			.suggestValue(this.x.variable, x)
			.suggestValue(this.y.variable, y)
			.resolve();
		return this;
	};

	function Polygon(elemId) {
		var elem = $(elemId);

		this.__defineGetter__("elem", function() {
			return elem;
		});

		var points = [];
		points.eq = function(o, location) {
			var ret = new Constraints(); 

			for(var i = 0 ; i < o.length ; i += 2) {
				var x = o[i], y = o[i + 1];

				if(!points[i / 2]) {
					points[i / 2] = new Point(new Variable('poly[' + i / 2 + '].x'), new Variable('poly[' + i / 2 + '].y'));
				}

				ret = ret.and(
					points[i / 2].x.eq(x, location)
				).and(
					points[i / 2].y.eq(y, location)
				);
			}

			return ret;
		};
		this.__defineGetter__('points', function() {
			return points;
		});
	}
	//extend(Polygon, );
	Polygon.prototype.casso2svg = function() {
		var points = '';
		for(var i = 0 ; i < this.points.length ; i++) {
			points += this.points[i].x.variable.value + ',' + this.points[i].y.variable.value + ' ';
		}
		this.elem.setAttribute('points', points);
	};
	function asExp(v) {
		if(typeof(v) === "number") {
			v = new Expression(v);
		}
		return v;
	}
	Polygon.prototype.mustContain = function(p, location) {
		if(this.isTEllipse) {
			if(this._f1) {	// and this._f2
				return (
					this._f1.distTo(p)
				).plus(
					this._f2.distTo(p)
				).le(this._size, location);
			} else {
				return p.distTo(this._center).le(this._size.div(2), location);
			}
		} else {
			throw "unsupported: arbitraryPolygon.mustContain(Point)";
		}
	};
	Polygon.prototype.addPoint = function(x, y) {
		if(x instanceof Point) {
			y = x.y;
			x = x.x;
		}
		var xv = new Variable("point.x");
		var yv = new Variable("point.y");
		xv.eq(x).add();
		yv.eq(y).add();
		this.points.push(new Point(xv, yv));
	};
	Polygon.prototype.pointEq = function(pointIndex, x, y, location) {
		if(x instanceof Point) {
			y = x.y;
			x = x.x;
		}
		if("constant" in (pointIndex.constraint ?? {})) {
			pointIndex = pointIndex.constraint.constant;
		}
		while(this.points.length < pointIndex + 1) {
			const xv = new Variable("point.x");
			const yv = new Variable("point.y");
			this.points.push(new Point(xv, yv));
		}
		return (
			this.points[pointIndex].x.eq(x, location)
		).and(
			this.points[pointIndex].y.eq(y, location)
		);
	};
	// http://www.mathematische-basteleien.de/taxicabgeometry.htm#T-Ellipse
	Polygon.prototype.constrainTEllipse = function(x, y, size, interFociX, interFociY) {
		if(!interFociX) {
			interFociX = 0;
		}
		if(!interFociY) {
			interFociY = 0;
		}
		let width
		let height;
		size = asExp(size);

		let ret;

		let centerX;
		let centerY;
		let rightX;
		let bottomY;

		function initPoints() {
			centerX = x.plus(width.div(2));
			centerY = y.plus(height.div(2));
			rightX = x.plus(width);
			bottomY = y.plus(height);
		}

		// TODO:
		//	- switch from addPoint to pointEq
		//	- simplify all code by leveraging f1 and f2 as in last branch
		//	- is it really necessary to have all these cases to avoid a few segments when at least one interFociD is null?
		if(interFociX === 0 && interFociY === 0) {
			// TCircle
			height = width = size;
			initPoints();
			ret =	(
					this.pointEq(0, centerX, y)
				).and(
					this.pointEq(1, rightX, centerY)
				).and(
					this.pointEq(2, centerX, bottomY)
				).and(
					this.pointEq(3, x, centerY)
				);
		} else if(interFociY === 0) {
			var interFoci = asExp(interFociX);
			width = size;
			height = size.minus(interFoci);
			initPoints();
			let halfInterFoci = interFoci.div(2);
			let f1X = centerX.minus(halfInterFoci);
			let f2X = centerX.plus(halfInterFoci);
			ret =	(
					this.pointEq(0, x, centerY)
				).and(
					this.pointEq(1, f1X, y)
				).and(
					this.pointEq(2, f2X, y)
				).and(
					this.pointEq(3, rightX, centerY)
				).and(
					this.pointEq(4, f2X, bottomY)
				).and(
					this.pointEq(5, f1X, bottomY)
				);
			this._f1 = new Point(f1X, centerY);
			this._f2 = new Point(f2X, centerY);
		} else if(interFociX === 0) {
			var interFoci = asExp(interFociY);
			height = size;
			width = size.minus(interFoci);
			initPoints();
			let halfInterFoci = interFoci.div(2);
			var f1 = this._f1 = new Point(centerX, centerY.minus(halfInterFoci));
			var f2 = this._f2 = new Point(centerX, centerY.plus(halfInterFoci));
			ret =	(
					this.pointEq(0, f1.x, y)
				).and(
					this.pointEq(1, rightX, f1.y)
				).and(
					this.pointEq(2, rightX, f2.y)
				).and(
					this.pointEq(3, f1.x, bottomY)
				).and(
					this.pointEq(4, x, f2.y)
				).and(
					this.pointEq(5, x, f1.y)
				);
		} else {	// interFociX !=== 0 && interFociY !=== 0
			var interFociX = asExp(interFociX);
			var interFociY = asExp(interFociY);
			height = size.minus(interFociX);
			width = size.minus(interFociY);
			initPoints();
			let halfInterFociX = interFociX.div(2);
			let halfInterFociY = interFociY.div(2);
			var f1 = this._f1 = new Point(centerX.minus(halfInterFociX), centerY.minus(halfInterFociY));
			var f2 = this._f2 = new Point(centerX.plus(halfInterFociX), centerY.plus(halfInterFociY));
			ret =	(
					this.pointEq(0, f1.x, y)
				).and(
					this.pointEq(1, f2.x, y)
				).and(
					this.pointEq(2, rightX, f1.y)
				).and(
					this.pointEq(3, rightX, f2.y)
				).and(
					this.pointEq(4, f2.x, bottomY)
				).and(
					this.pointEq(5, f1.x, bottomY)
				).and(
					this.pointEq(6, x, f2.y)
				).and(
					this.pointEq(7, x, f1.y)
				);
		}
		this.isTEllipse = true;
		this._size = size;
		this._width = width;
		this._height = height;
		this._center = new Point(centerX, centerY);
		this.center = this._center;
		return ret;
	};
	Polygon.prototype.makeTEllipse = function(x, y, size, interFociX, interFociY) {
		if(!interFociX) {
			interFociX = 0;
		}
		if(!interFociY) {
			interFociY = 0;
		}
		var width
		var height;
		size = asExp(size);

		// TODO:
		//	- simplify all code by leveraging f1 and f2 as in last branch
		//	- is it really necessary to have all these cases to avoid a few segments when at least one interFociD is null?
		if(interFociX === 0 && interFociY === 0) {
			height = width = size;
			this.addPoint(x.plus(width.div(2)), y);
			this.addPoint(x.plus(width), y.plus(height.div(2)));
			this.addPoint(x.plus(width.div(2)), y.plus(height));
			this.addPoint(x, y.plus(height.div(2)));
		} else if(interFociY === 0) {
			var interFoci = asExp(interFociX);
			width = size;
			height = size.minus(interFoci);
			this.addPoint(x, y.plus(height.div(2)));
			this.addPoint(x.plus(width.div(2)).minus(interFoci.div(2)), y);
			this.addPoint(x.plus(width.div(2)).plus(interFoci.div(2)), y);
			this.addPoint(x.plus(width), y.plus(height.div(2)));
			this.addPoint(x.plus(width.div(2)).plus(interFoci.div(2)), y.plus(height));
			this.addPoint(x.plus(width.div(2)).minus(interFoci.div(2)), y.plus(height));
			this._f1 = new Point(x.plus(width.div(2)).minus(interFoci.div(2)), y.plus(height.div(2)));
			this._f2 = new Point(x.plus(width.div(2)).plus(interFoci.div(2)), y.plus(height.div(2)));
		} else if(interFociX === 0) {
			var interFoci = asExp(interFociY);
			height = size;
			width = size.minus(interFoci);
			var f1 = this._f1 = new Point(x.plus(width.div(2)), y.plus(height.div(2).minus(interFoci.div(2))));
			var f2 = this._f2 = new Point(x.plus(width.div(2)), y.plus(height.div(2)).plus(interFoci.div(2)));
			this.addPoint(f1.x, y);
			this.addPoint(x.plus(width), f1.y);
			this.addPoint(x.plus(width), f2.y);
			this.addPoint(f1.x, y.plus(height));
			this.addPoint(x, f2.y);
			this.addPoint(x, f1.y);
		} else {	// interFociX !=== 0 && interFociY !=== 0
			var interFociX = asExp(interFociX);
			var interFociY = asExp(interFociY);
			height = size.minus(interFociX);
			width = size.minus(interFociY);
			var f1 = this._f1 = new Point(x.plus(width.div(2)).minus(interFociX.div(2)), y.plus(height.div(2).minus(interFociY.div(2))));
			var f2 = this._f2 = new Point(x.plus(width.div(2)).plus(interFociX.div(2)), y.plus(height.div(2).plus(interFociY.div(2))));
			this.addPoint(f1.x, y);
			this.addPoint(f2.x, y);
			this.addPoint(x.plus(width), f1.y);
			this.addPoint(x.plus(width), f2.y);
			this.addPoint(f2.x, y.plus(height));
			this.addPoint(f1.x, y.plus(height));
			this.addPoint(x, f2.y);
			this.addPoint(x, f1.y);
		}
		this.isTEllipse = true;
		this._size = size;
		this._width = width;
		this._height = height;
		this._center = new Point(x.plus(width.div(2)), y.plus(height.div(2)));
		this.center = this._center;
	};

	function Circle(elemId) {
		var elem = $(elemId);

		this.__defineGetter__("elem", function() {
			return elem;
		});

		var cx = new Variable(elemId + ".cx", elem.cx.baseVal.value);
		var cy = new Variable(elemId + ".cy", elem.cy.baseVal.value);
		var r = new Variable(elemId + ".r");

		this.__defineGetter__('cx', function() {
			return cx;
		});
		this.__defineGetter__('cy', function() {
			return cy;
		});
		// used for moving (instead of startMoving and suggest?)
		this.__defineGetter__('x', function() {
			return cx;
		});
		this.__defineGetter__('y', function() {
			return cy;
		});
		this.__defineGetter__('r', function() {
			return r;
		});
		const sin45 = Math.sqrt(2) / 2;
		this.__defineGetter__("topLeft",
			function() {
				return new Point(
					cx.plus(r.neg.times(sin45)),
					cy.plus(r.neg.times(sin45))
				);
			}
		);
		this.__defineGetter__("top",
			function() {
				return new Point(
					cx,
					cy.plus(r.neg)
				);
			}
		);
		this.__defineGetter__("topRight",
			function() {
				return new Point(
					cx.plus(r.times(sin45)),
					cy.plus(r.neg.times(sin45))
				);
			}
		);
		this.__defineGetter__("right",
			function() {
				return new Point(
					cx.plus(r),
					cy
				);
			}
		);
		this.__defineGetter__("bottomRight",
			function() {
				return new Point(
					cx.plus(r.times(sin45)),
					cy.plus(r.times(sin45))
				);
			}
		);
		this.__defineGetter__("bottom",
			function() {
				return new Point(
					cx,
					cy.plus(r)
				);
			}
		);
		this.__defineGetter__("left",
			function() {
				return new Point(
					cx.plus(r.neg),
					cy
				);
			}
		);
		this.__defineGetter__("bottomLeft",
			function() {
				return new Point(
					cx.plus(r.neg.times(sin45)),
					cy.plus(r.times(sin45))
				);
			}
		);
	}
	Circle.prototype.casso2svg = function() {
		this.elem.setAttribute('cx', this.cx.variable.value);
		this.elem.setAttribute('cy', this.cy.variable.value);
		this.elem.setAttribute('r', this.r.variable.value);
	};
	Circle.prototype.boundingRect = function() {
		return new Rectangle(this.cx.minus(this.r), this.cy.minus(this.r), this.r.times(2), this.r.times(2));
	};
	Circle.prototype.st = function(strength, weight) {
		return (
			this.cx.st(strength, weight)
		).and(
			this.cy.st(strength, weight)
		).and(
			this.r.st(strength, weight)
		);
	};
	Circle.prototype.stay = function(strength, weight) {
		if(!strength) {
			strength = c.Strength.weak;
		}
		if(!weight) {
			weight = 2;
		}
		solver.addStay(this.cx.variable, strength, weight);
		solver.addStay(this.cy.variable, strength, weight);
		solver.addStay(this.r.variable, strength, weight+1);
	};
	/*
	 * @return {Point} a point that is constrained to be at the center of the circle.
	 */
	Circle.prototype.__defineGetter__("center", function() {
		return new Point(
			this.cx,
			this.cy
		);
	});
	Circle.prototype.startMoving = function() {
		solver.addEditVar(this.cx.variable);
		solver.addEditVar(this.cy.variable);
		return this;
	};
	Circle.prototype.suggest = function(x, y) {
		solver
			.suggestValue(this.cx.variable, x)
			.suggestValue(this.cy.variable, y)
			.resolve();
//console.log("Circle.suggest: %o, %o => %o, %o", x, y, this.cx.variable.value, this.cy.variable.value);
		return this;
	};
	Circle.prototype.inRect = function(r, location) {
		if(r) {
console.log("%o inRect %o (%o)", this, r, r.toString());
			return	(
					r.mustContain(this.center.minus(this.r, this.r), location)
				).and(
					r.mustContain(this.center.plus(this.r, this.r), location)
				);
		} else {
			return new Constraints();	// TODO: generalize ignoring undefined parameters, or remove it from here
		}
	};



	function $(id) {
		return document.getElementById(id);
	}

globalThis.getWrapper=getWrapper
globalThis.move=move
	function getWrapper(id) {
		var ret = idToWrapper[id];
		if(!ret) {
//debug			console.log("wrapping " + id + " " + $(id));
			const elem = $(id);
if(!elem) {
	console.log("ERROR: could not find element with id=%o", id);
}
			var tagName = elem.tagName;
			if(tagName === "line") {
				ret = new Line(id);
			} else if(tagName === "rect") {
				ret = new Rect(id);
				ret.noTransform = true;
			} else if(tagName === "text") {
				ret = new tcsvg.Text(id);
			} else if(tagName === "polygon") {
				ret = new Polygon(id);
			} else if(tagName === "polyline") {
				ret = new Polygon(id);	// TODO: specialize for polyline?
			} else if(tagName === "circle") {
				ret = new Circle(id);
			} else if(tagName === "pattern") {
				// nothing to do
			} else if(tagName === "clipPath") {
				// nothing to do
			} else {
				console.log('ERROR: could not wrap ' + tagName);
			}

			// TODO: do this somewhere else, where it will only be done once
			function replaceThis(attrName) {
				const attrVal =
					//elem.attributes[attrName]?.value;
					elem.getAttribute(attrName);
				if(attrVal?.match(/%this%/)) {
//console.log(attrName, '==', attrVal)
					//elem.attributes[attrName].value = attrVal.replace(/%this%/g, id.replace(/\..*$/, ""));
					elem.setAttribute(attrName, attrVal.replace(/%this%/g, id.replace(/\..*$/, "")));
				}
			}
			replaceThis("clip-path");
			replaceThis("fill");

			if(ret) {
				idToWrapper[id] = ret;
			}
		}
		return ret;
	}

	function getParam(elemId, paramName) {
		if(!$(elemId)) return undefined;
		var ret = $(elemId).attributes[paramName];
//console.log('getParam %o as attribute: %o', paramName, ret);
		if(!ret) {
			ret = $(elemId).children.find(function(e) {
				return e.attributes.name.value === paramName;
			});
			if(ret) ret = ret.attributes.value;
//console.log('getParam %o as child: %o', paramName, ret);
		}
		if(ret) {
			return ret.value;
		} else {
			return undefined;
		}
	}

// Parser

var debugParser = false;

var opPrio = {
	",": 0,
	"+": 1,
	"-": 1,
	"*": 2,
	"/": 2,
};

function getVal(token, vars) {
	if(token.match(/^[0-9]+(\.[0-9]*)?$/)) {
		var ret = new Expression(token * 1);
if(debugParser) console.log("NUMBER=%o", ret);
		return ret;
	} else {
		var val = vars[token];
		if(!val) {
			if(vars.get) {
				val = vars.get(token);
			} else {
				val = new Variable(token);
			}
			vars[token] = val;
if(debugParser) console.log("new var %s", token)
		}
		return val;
	}
}

function apply(op, left, right) {
	return left + " " + op + " " + right;
}

function parse(tokens, vars) {
	var opcodes = [];
	var curOp;
	var prevOps = [];
	for(var i = 0 ; i < tokens.length ; i++) {
		opcodes.push(getVal(tokens[i], vars));

if(debugParser) console.log("getVal(%s)=%o", tokens[i], opcodes.peek());
if(debugParser) console.log(opcodes);
		i++;
		if(i < tokens.length) {
			curOp = tokens[i];
if(debugParser) console.log("curOp=%s prevOps=%o", curOp, prevOps);
			while(prevOps.peek() && (opPrio[prevOps.peek()] >= opPrio[curOp])) {
if(debugParser) console.log("pushing prevOp");
				opcodes.push(prevOps.pop());
			}
			prevOps.push(curOp);
		}
if(debugParser) console.log("opcodes=%o", opcodes);
	}
if(debugParser) console.log("remaining ops: %o", prevOps);
	while(prevOps.peek()) {
		opcodes.push(prevOps.pop());
	}
if(debugParser) console.log("tokens=%o", tokens);
if(debugParser) console.log("opcodes=%o", opcodes);


	// evaluate
	var stack = [];
	for(var i = 0 ; i < opcodes.length ; i++) {
		var opcode = opcodes[i];
//console.log("stack=%o opcode=%o", stack, opcode)
		if(typeof(opcode) === "string") {
			var right = stack.pop();
			var left = stack.pop();
			if(right === undefined || left === undefined) {
				stack.push(undefined);
				break;
			}
if(debugParser) console.log("computing: %o %s %o", left, opcode, right);
			var result;
			if(left) {
				switch(opcode) {
					case "+":
						result = left.plus(right);
						break;
					case "-":
						result = left.minus(right);
						break;
					case "*":
						result = left.times(right);
						break;
					case "/":
						result = left.div(right);
						break;
					case ",":
						if(!left.length) {	// not Array
							left = [left];
						}
						result = left.concat(right);
						break;
					default:
						throw "unsupported opcode " + opcode;
						break;
				}
			} else {
				result = left;
			}
if(debugParser) console.log("\t=> %o", result);
			stack.push(result);
		} else {
			stack.push(opcode)
		}
	}

	return stack.pop();
}

tcsvg.Expression = Expression;
tcsvg.Constraints = Constraints;
tcsvg.addedUse = function(use) {
	//console.log("adding", use);

	let shadow = EmulateShadowTree(use, {}, []);
        if(shadow.parentNode) {
		// already in the DOM, this is an update
		constraints[use.id].remove();

		// in case a Text has changed size
		for(const el of shadow.getElementsByTagName("*")) {
			if(el.id) {
				const wrapper = idToWrapper[el.id];
				if(wrapper instanceof tcsvg.Text) {
					const bbox = el.getBBox();
					wrapper.updateDimensions(el.id, bbox);
				}
			}
		}
	} else {
		use.setAttribute("display", "none");
		if(use.nextSibling) {
			use.parentNode.insertBefore(shadow, use.nextSibling);
		} else {
			use.parentNode.appendChild(shadow);
		}
		for(const movableSuffix of getDef(use.id).attributes.movable?.value?.split(" ") ?? []) {
			registerMove(use.id, movableSuffix);
		}
	}

	applyOwnedConstraints(use.id);

	//solver.resolve();	autosolve makes this unnecessary

	move();	// copy solver variables to shape attributes
};
tcsvg.removedUse = function(use) {
	//console.log("removing", use);
	const wrapper =
		//use.nextSibling;				// cannot work if <use> element has already been removed from the DOM
		document.getElementById(use.id).parentNode;	// cannot work if <use> element is still in the DOM
	// assert wrapper.children[0].id = use.id
	wrapper.parentNode.removeChild(wrapper);
	for(const key of Object.keys(idToWrapper)) {
		if(key.startsWith(use.id + ".")) {
			const wrapper = idToWrapper[key];
			wrapper?.remove?.();
			delete idToWrapper[key];
		}
	}
	constraints[use.id].remove();
};

