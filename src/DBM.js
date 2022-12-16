

export class DBM {
	static constrainMask = 1;
	static constrainLess = 1;
	static constrainLessOrEqual = 0
	static infinity = 32767;
	
	static emptyness = DBM.computeInternal(-1, false);
	dbm;
	nbClocks;
	constructor(nbClocks, dbm) {
		this.nbClocks = nbClocks;
		if(dbm) {
			console.assert(dbm.length == (nbClocks+1)**2, "dbm array does not have the right size");
			this.dbm = dbm;
		} else {
			this.dbm = new Array((nbClocks+1) * (nbClocks+1));
			this.dbm.fill(DBM.constrainLessOrEqual);

			for (let i=1; i<=nbClocks; i++) {
				this.dbm[i*(nbClocks+1) + i] = DBM.emptyness;
			}

			for (let i = 1; i<=nbClocks; i++) {
				this.enable(i);
			}
		}
	}

	/**
	 * <p>Adds a constrain to DBM. It has the form: 
	 * <code>x - y {<, <=} m</code>.
	 * In this method, if either x or y is inactive. The resulting DBM is empty.</p>
	 * <p>If the constrain creates a empty DBM, it sets the first encoded value
	 * to {@link #emptyness}.</p>
	 * <p>This operator preserves the canonical form.</p>
	 * @param dbm DBM to modify
	 * @param x clock index for first clock of the constrain
	 * @param y clock index for second clock of the constrain
	 * @param m constant value for the constrain
	 * @param strict if true the constrain is strict '<', '<=' otherwise.
	 */
	xMinusYRelatesToM(x, y, m, strict) {
		const mInternal = DBM.computeInternal(m, strict);
		this.andGuard(x, y, mInternal);
		return this;
	}

	gt(clockIndex, value) {
		const internalValue = DBM.computeInternal(-value, true);
		this.andGuard(0, clockIndex, internalValue);
		return this;
	}

	ge(clockIndex, value) {
		const internalValue = DBM.computeInternal(-value, false);
		this.andGuard(0, clockIndex, internalValue);
		return this;
	}

	lt(clockIndex, value) {
		const internalValue = DBM.computeInternal(value, true);
		this.andGuard(clockIndex, 0, internalValue);
		return this;
	}

	le(clockIndex, value) {
		const internalValue = DBM.computeInternal(value, true);
		this.andGuard(clockIndex, 0, internalValue);
		return this;
	}

	/**
	 * <p>Adds a constrain to DBM. It has the form: 
	 * <code>x - y {<, <=} m</code>.
	 * In this method, if either x or y is inactive. The resulting DBM is empty.</p>
	 * <p>This operator preserves the canonical form.</p>
	 * <p>If the constrain creates a empty DBM, it sets the first encoded value
	 * to {@link #emptyness}.</p>
	 * @param dbm DBM to modify
	 * @param x clock index for first clock of the constrain
	 * @param y clock index for second clock of the constrain
	 * @param mInternal constant value for the constrain and strictness value as internal representation 
	 * 					computed with {@link #computeInternal(int, boolean)}
	 */
	andGuard(x, y, mInternal) {
		if ( this.dbm[x*(this.nbClocks+1) + x] == DBM.emptyness || this.dbm[y*(this.nbClocks+1) + y] == DBM.emptyness ) {
			// Creates a empty DBM, witch is directly detected by emptyness algorithm.
			this.dbm[0] = DBM.emptyness;
			
		} else {
			// applies and
			this.and(x, y, mInternal);
		}
	}

	static computeInternal (value, strict) {
		return  (value << 1 | (strict ? DBM.constrainLess : DBM.constrainLessOrEqual));
	}

	isEmpty() {
		return this.dbm[0] == DBM.emptyness; 
	}

	/**
	 * <p>Adds a constrain to DBM. It has the form: 
	 * <code>x - y {<, <=} m</code>.
	 * <p>This operator preserves the canonical form.</p>
	 * <p>If the constrain creates a empty DBM, it sets the first encoded value
	 * to {@link #emptyness}.</p>
	 * @param nbClocks number of clock.s
	 * @param dbm DBM to modify
	 * @param x clock index for first clock of the constrain
	 * @param y clock index for second clock of the constrain
	 * @param mInternal constant value for the constrain and strictness value as internal representation 
	 * 					computed with {@link #computeInternal(int, boolean)}
	 */
	and(x, y, mInternal) {
		if ( DBM.lessThan(DBM.add(this.dbm[y*(this.nbClocks+1) + x], mInternal), DBM.constrainLessOrEqual) ) {
			// Creates a empty DBM, witch is directly detected by emptyness algorithm.
			this.dbm[0] = DBM.emptyness;
			
		} else if ( DBM.lessThan(mInternal, this.dbm[x*(this.nbClocks+1) + y]) ) {
			// adds the constrain.
			this.dbm[x*(this.nbClocks+1) + y] = mInternal;
			// local normalization to keep the DBM canonical
			for ( let i=0; i<=this.nbClocks; i++ ) {
				// if i is active
				if ( this.dbm[i*(this.nbClocks+1) + i] != DBM.emptyness ) {
					for ( let j=0; j<=this.nbClocks; j++ ) {
						if ( i == j ) continue;
						// and if j is active
						if ( this.dbm[j*(this.nbClocks+1) + j] != DBM.emptyness ) {
							let addIXJ = DBM.add(this.dbm[i*(this.nbClocks+1) +x], this.dbm[x*(this.nbClocks+1) +j]);
							if ( DBM.lessThan(addIXJ, this.dbm[i*(this.nbClocks+1) +j]) ) {
								this.dbm[i*(this.nbClocks+1) +j] = addIXJ;
							}
							let addIYJ = DBM.add(this.dbm[i*(this.nbClocks+1) +y], this.dbm[y*(this.nbClocks+1) +j]);
							if ( DBM.lessThan(addIYJ, this.dbm[i*(this.nbClocks+1) +j]) ) {
								this.dbm[i*(this.nbClocks+1) +j] = addIYJ;
							}
						}
					}
				}
			}
		}

	}
	
	/** 
	 * <p>Compares two encoded values: <code>internal1 < internal1</code>. It
	 * takes the strict state in account.</p>
	 * @param internal1 first encoded value.
	 * @param internal2 second encoded value.
	 * @return true if internal1 is less than internal2.
	 */
	static lessThan(internal1, internal2) {
		if ( internal1 == DBM.infinity ) return false;
		const value1 = DBM.getValue(internal1);
		const value2 = DBM.getValue(internal2);
		if ( value1 == value2 ) {
			// values are equals, internal1 < internal2 if and only if:
			// -> internal1 is strict and internal2 is NOT.
			return DBM.isStrict(internal1) && !DBM.isStrict(internal2);
		}
		return value1 < value2;
	}

	/**
	 * <p>Extracts the constrain value for given internal representation.<p>
	 * @param internal representation to extract constrain value from.
	 * @return the constrain value.
	 */
	static getValue(internal) {
		return internal >> 1;
	}

	/**
	 * <p>Extracts strict state for constrain from given internal representation.</p> 
	 * @param internal representation to extract constrain state from.
	 * @return the strict state.
	 */
	static isStrict(internal) {
		return (internal&DBM.constrainMask) == DBM.constrainLess;
	}

	/**
	 * <p>Adds the two encoded values, taking in account strict states.</p>
	 * @param internal1 first encoded value.
	 * @param internal2 second encoded value.
	 * @return the addition of the two encoded values.
	 */
	static add(internal1, internal2) {
		if ( internal1 == DBM.infinity || internal2 == DBM.infinity ) return DBM.infinity;
		return DBM.computeInternal(
					DBM.getValue(internal1) + DBM.getValue(internal2), 
					DBM.isStrict(internal1) || DBM.isStrict(internal2)
				);
	}

	/**
	 * <p>Sets a clock to a value. It enables the clock if needed.</p>
	 * <p>This operator preserves the canonical form.</p>
	 * @param dbm DBM to modify
	 * @param clockIndex clock to set
	 * @param value value to be set for the clock
	 */
	set(clockIndex, value) {
		for ( let i=0; i<=this.nbClocks; i++ ) {
			if ( i==clockIndex ) {
				this.dbm[i*(this.nbClocks+1) + i] = DBM.constrainLessOrEqual;
			} else {
				// if clock i is active
				if ( this.dbm[i*(this.nbClocks+1) + i] != DBM.emptyness ) {
					this.dbm[clockIndex*(this.nbClocks+1) + i] = DBM.add(DBM.computeInternal(value, false), this.dbm[i]);
					this.dbm[i*(this.nbClocks+1) + clockIndex] = DBM.add(DBM.computeInternal(-value, false), this.dbm[i*(this.nbClocks+1)]);
				}
			}
		}
	}

	/**
	 * <p>Enables a clock and releases all constrains on it.</p>
	 * <p>This operator <b>does NOT</b> preserves the canonical form.</p>
	 * @param dbm DBM to modify
	 * @param clockIndex clock to enable.
	 */
	enable(clockIndex) {
		for ( let i=0; i<=this.nbClocks; i++ ) {
			if ( i==clockIndex ) {
				this.dbm[i*(this.nbClocks+1) + i] = DBM.constrainLessOrEqual;
			} else {
				if ( this.dbm[i*(this.nbClocks+1) + i] != DBM.emptyness ) { 
					this.dbm[clockIndex*(this.nbClocks+1) + i] = DBM.infinity;
					this.dbm[i*(this.nbClocks+1) + clockIndex] = DBM.infinity;
				}
			}
		}
	}

	/**
	 * <p>Applies delay on given DBM.</p>
	 * @param dbm DBM to modify
	 */
	delay() {
		for ( let i=1; i<=this.nbClocks; i++) {
			if ( this.dbm[i*(this.nbClocks+1) + i] != DBM.emptyness ) {	
				this.dbm[i*(this.nbClocks+1)] = DBM.infinity;
			}
		}
	}

	/**
	 * <p>Returns a String that expresses the DBM as constrains over clocks.</p>
	 * @param dbm DBM to print.
	 * @return a String that represent the DBM as constrains expressions.
	 */
	toString(clockNames = this.clockNames) {
		if ( this.dbm == null ) return "oo";
		if ( this.isEmpty(this.dbm) ) return "empty";

		function clockName(i) {
			return clockNames?.[i] ?? "c" + i;
		}
		
		let builder = "";
		for ( let i=1; i<=this.nbClocks; i++) {
			if ( this.dbm[(i*(this.nbClocks+1))+i] != DBM.emptyness ) {
				let constrain = "";
				let atLeastOneBound = false;
				const miniInternal = this.dbm[i];
				if ( miniInternal != DBM.infinity ) {
					atLeastOneBound = true;
					constrain+=(-DBM.getValue(miniInternal));
					constrain+=(DBM.isStrict(miniInternal) ? " < " : " <= ");
				}
				constrain+=clockName(i);
				const maxiInternal = this.dbm[i*(this.nbClocks+1)];
				if ( maxiInternal != DBM.infinity ) {
					atLeastOneBound = true;
					constrain+=(DBM.isStrict(maxiInternal) ? " < " : " <= ");
					constrain +=(DBM.getValue(maxiInternal));
				}
				if ( constrain.length > 4 && atLeastOneBound) {
					if ( builder.length > 0 ) builder+=(" & ");
					builder+=(constrain);
				}
			}
		}
		
		for ( let i=1; i<=this.nbClocks; i++ ) {
			if ( this.dbm[(i*(this.nbClocks+1))+i] != DBM.emptyness ) {
				for ( let j=i+1; j<=this.nbClocks; j++) {
					if ( this.dbm[(j*(this.nbClocks+1))+j] != DBM.emptyness ) {
						let constrain = "";
						let atLeastOneBound = false;
						const miniInternal = this.dbm[(j*(this.nbClocks+1))+i];
						if ( miniInternal != DBM.infinity ) {
							atLeastOneBound = true;
							constrain+=(-DBM.getValue(miniInternal));
							constrain+=(DBM.isStrict(miniInternal) ? " < " : " <= ");
						}
						constrain+=clockName(i);
						constrain+=(" - ");
						constrain+=clockName(j);
						let maxiInternal = this.dbm[(i*(this.nbClocks+1))+j];
						if ( maxiInternal != DBM.infinity ) {
							atLeastOneBound = true;
							constrain+=(DBM.isStrict(maxiInternal) ? " < " : " <= ");
							constrain+=(DBM.getValue(maxiInternal));
						}
						if ( constrain.length > 4 && atLeastOneBound) {
							if ( builder.length > 0 ) builder+=(" & ");
							builder+=(constrain);
						}
					}
				}
			}
		}
		if ( builder.length == 0 ) {
			builder+=("oo");
		}
		return builder;
	}

	// WARNING, the following queries seem to check whether the stored constraint is exactly what is asked, not if it is tighter

	isClockLessThan(clockID, bound) {
		if(this.dbm[(clockID*(this.nbClocks+1))+clockID] == DBM.emptyness) return false;

		const maxiInternal = this.dbm[clockID * (this.nbClocks + 1)];
		const value = DBM.getValue(maxiInternal);
		if (bound == value && DBM.isStrict(maxiInternal)) return true;
		return false;
	}

	isClockLessOrEqualThan(clockID, bound) {
		if(this.dbm[(clockID*(this.nbClocks+1))+clockID] == DBM.emptyness) return false;

		const maxiInternal = this.dbm[clockID * (this.nbClocks + 1)];
		const value = DBM.getValue(maxiInternal);
		if (bound == value && !DBM.isStrict(maxiInternal)) return true;
		return false;
	}

	isClockGreaterOrEqualThan(clockID, bound) {
		if (this.dbm[(clockID*(this.nbClocks+1))+clockID] == DBM.emptyness) return false;

		const miniInternal = this.dbm[clockID];
		const value = DBM.getValue(miniInternal);
		if (-bound == value && !DBM.isStrict(miniInternal)) return true;
		return false;
	}

	getMin(clockID) {
		const miniInternal = this.dbm[clockID];
		const value = -DBM.getValue(miniInternal);
		return value;
	}
}

function test() {
	const aDBM = new DBM(2);
	document.write("test -1 " + JSON.stringify(aDBM.dbm) + "<br>");
	document.write("test 0 " + JSON.stringify(aDBM.isEmpty()) + "<br>");
	document.write("test 1 " + JSON.stringify(aDBM.xMinusYRelatesToM(1,0,3,true).dbm) + "<br>" );
	document.write("test 2 " + JSON.stringify(aDBM.xMinusYRelatesToM(1,0,3,false).dbm) + "<br>" );
	document.write("test 3 " + JSON.stringify(aDBM.xMinusYRelatesToM(0,2,2,true).dbm) + "<br>" );
	document.write("test 4 " + JSON.stringify(aDBM.xMinusYRelatesToM(0,2,2,false).dbm) + "<br>" );
}
