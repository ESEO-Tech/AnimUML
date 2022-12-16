// Compiled from  Sequence2TCSVG.atl (see https://zenodo.org/record/5109454)
export const templates = `
	<script>
		
		var OCLLibrary = {
		    __asArray(x) {
		        if (Array.isArray(x)) {
		            return x;
		        }
		        else {
		            return [x];
		        }
		    },
		
		    size(collection) {
		        return this.__asArray(collection).length;
		    },
		
		    notEmpty(collection) {
		        return this.size(collection) != 0;
		    },
		
		    empty(collection) {
		        return this.size(collection) == 0;
		    },
		
		    union(lhs, rhs) {
		        return lhs.concat(rhs);
		    },
		
		    at(collection, idx) {
		        return this.__asArray(collection)[idx - 1];
		    },
		
		    subSequence(collection, start, end) {
		        return this.__asArray(collection).slice(start - 1, end);
		    },
		
		    sum(collection) {
		        return this.__asArray(collection).reduce((acc, val) => acc + val);
		    },
		
		    iterate(collection, seed, lambda) {
		        return this.__asArray(collection).reduce(lambda, seed);
		    },
		
		    collect(collection, lambda) {
		        return this.__asArray(collection).map(lambda);
		    },
		
		    zipWith(left, right, lambda) {
			const length = Math.min(left.length, right.length);
		        return left.slice(0, length).map((v, idx) => lambda(v, right[idx]));
		    },
		
		    prepend(collection, element) {
		        return [element].concat(collection);
		    },
		
		    includes(collection, element) {
		        return this.__asArray(collection).includes(element);
		    },
		
		    oclIsUndefined(val) {
		        return val ? false : true;
		    },
		
		    oclType(val) {
		        //TODO implement oclType
		    },
		
		    oclIsKindOf(val, type) {
		        //TODO implement oclIsKindOf
		    },
		
		    toString(val) {
		        return val.toString();
		    },
		
		    asOrderedSet(collection) {
		        return new Set(collection);
		    },
		
		    startWiths(str, prefix) {
		        return str.startWiths(prefix);
		    },
		
		    first(collection) {
		        return this.__asArray(collection)[0];
		    },
		
		    last(collection) {
		        let c = this.__asArray(collection);
		        return c[c.length - 1];
		    },
		
		    toInteger(string) {
		        return string * 1;
		    },
		}
		
		

		// 19:1-19:34
		function __attribute__HEAD_R() {
			return 8
			;
		}
		// 20:1-20:40
		function __attribute__BODY_LENGTH() {
			return 27
			;
		}
		// 21:1-21:39
		function __attribute__ARM_LENGTH() {
			return 26
			;
		}
		// 22:1-22:37
		function __attribute__HEAD2ARMS() {
			return 8
			;
		}
		// 23:1-23:39
		function __attribute__LEG_HEIGHT() {
			return 15
			;
		}
		// 25:1-25:48
		function __attribute__INTER_OBJECT_MARGIN() {
			return 100
			;
		}
		// 26:1-26:48
		function __attribute__INTER_MESSAGE_MARGIN() {
			return 50
			;
		}
		// 27:1-27:34
		function __attribute__MARGIN() {
			return 10
			;
		}
		// 29:1-29:32
		function __attribute__scale() {
			return 10.0
			;
		}
		// 34:1-36:35
		function SVG__Rectangle__mustContainX(self, other) {
			return new tcsvg.Constraints().and(		other
				.ge(
					self.x
					, "./Sequence2TCSVG.atl - 35:3-35:18"
				)
			.and(
					other
				.le(
						self.x
					.plus(
						self.width
					)
					, "./Sequence2TCSVG.atl - 36:6-36:34"
				)
			)
			);
		}
		// 39:1-41:37
		function SVG__Rectangle__mustContainX_2(self, other) {
			return new tcsvg.Constraints().and(		other.x
				.ge(
					self.x
					, "./Sequence2TCSVG.atl - 40:3-40:20"
				)
			.and(
					other.x
				.le(
						self.x
					.plus(
						self.width
					)
					, "./Sequence2TCSVG.atl - 41:6-41:36"
				)
			)
			);
		}
		// 44:1-46:38
		function SVG__Rectangle__mustContainY(self, other) {
			return new tcsvg.Constraints().and(		other.y
				.ge(
					self.y
					, "./Sequence2TCSVG.atl - 45:3-45:20"
				)
			.and(
					other.y
				.le(
						self.y
					.plus(
						self.height
					)
					, "./Sequence2TCSVG.atl - 46:6-46:37"
				)
			)
			);
		}
		// 49:1-51:31
		function SVG__Rectangle__mustContain(self, other) {
			return new tcsvg.Constraints().and(	SVG__Rectangle__mustContainX_2(self, other)
			.and(
				SVG__Rectangle__mustContainY(self, other)
			)
			);
		}
		// 54:1-56:42
		function SVG__Rectangle__mustContain_2(self, other) {
			return new tcsvg.Constraints().and(	SVG__Rectangle__mustContain(self, other.topLeft)
			.and(
				SVG__Rectangle__mustContain(self, other.bottomRight)
			)
			);
		}
		// 59:1-62:56
		function textOutline(outline, name) {
			return new tcsvg.Constraints().and(			outline.width
					.ge(
							name.width
						.plus(
								(new tcsvg.Expression(__attribute__MARGIN()))
							.times(
								(new tcsvg.Expression(2))
							)
						)
						, "./Sequence2TCSVG.atl - 60:3-60:54"
					)
				.and(
						name.center
					.eq(
						outline.center
						, "./Sequence2TCSVG.atl - 61:6-61:34"
					)
				)
			.and(
					outline.height
				.ge(
						name.height
					.plus(
						(new tcsvg.Expression(__attribute__MARGIN()))
					)
					, "./Sequence2TCSVG.atl - 62:6-62:55"
				)
			)
			);
		}
		// 65:1-85:45
		function participantConstraints(part) {
			return new tcsvg.Constraints().and(((tgt) => (
				((afterTgt) => (
														((! (OCLLibrary.oclIsUndefined(part.x))) ?
																	tgt.outline.x
																.eq(
																	part.x
																	, "./Sequence2TCSVG.atl - 70:4-70:26"
																)
															.and(
																	tgt.outline.y
																.eq(
																	part.y
																	, "./Sequence2TCSVG.atl - 71:7-71:29"
																)
															)
														: new tcsvg.Constraints())
													.and(
														((! (OCLLibrary.oclIsUndefined(part.after))) ?
																		tgt.outline.bottom.p1.y
																	.eq(
																		afterTgt.outline.bottom.p1.y
																		, "./Sequence2TCSVG.atl - 74:4-74:58"
																	)
																.and(
																		tgt.outline.center.x
																	.ge(
																				afterTgt.outline.center.x
																			.plus(
																						tgt.outline.width
																					.plus(
																						afterTgt.outline.width
																					)
																				.div(
																					(new tcsvg.Expression(2))
																				)
																			)
																		.plus(
																			(new tcsvg.Expression(__attribute__INTER_OBJECT_MARGIN()))
																		)
																		, "./Sequence2TCSVG.atl - 75:7-75:140"
																	)
																)
															.and(
																	tgt.line.p2.y
																.eq(
																	afterTgt.line.p2.y
																	, "./Sequence2TCSVG.atl - 76:7-76:41"
																)
															)
														: new tcsvg.Constraints())
													)
												.and(
														tgt.line.p1
													.eq(
														tgt.outline.bottom.center
														, "./Sequence2TCSVG.atl - 78:6-78:45"
													)
												)
											.and(
													tgt.line.p2.x
												.eq(
													tgt.line.p1.x
													, "./Sequence2TCSVG.atl - 79:6-79:35"
												)
											)
										.and(
												tgt.line.p2.y
											.ge(
													tgt.line.p1.y
												.plus(
													(new tcsvg.Expression(20))
												)
												, "./Sequence2TCSVG.atl - 80:6-80:41"
											)
										)
									.and(
										textOutline(tgt.outline, tgt.name)
									)
								.and(
									textOutline(tgt.outline2, tgt.name2)
								)
							.and(
									tgt.line2.p1
								.eq(
									tgt.line.p2
									, "./Sequence2TCSVG.atl - 83:6-83:32"
								)
							)
						.and(
								tgt.line2.p2
							.eq(
								tgt.line2.p1.dy((new tcsvg.Expression(40)))
								, "./Sequence2TCSVG.atl - 84:6-84:40"
							)
						)
					.and(
							tgt.line2.p2
						.eq(
							tgt.outline2.top.center
							, "./Sequence2TCSVG.atl - 85:6-85:44"
						)
					)
				))(part.after)
			))(part)
			);
		}
		// 120:1-129:85
		function actor(head, body, arms, leftLeg, rightLeg) {
			return new tcsvg.Constraints().and(									head.r
											.eq(
												(new tcsvg.Expression(__attribute__HEAD_R()))
												, "./Sequence2TCSVG.atl - 121:3-121:29"
											)
										.and(
												body.p1
											.eq(
												head.center.dy((new tcsvg.Expression(__attribute__HEAD_R())))
												, "./Sequence2TCSVG.atl - 122:6-122:49"
											)
										)
									.and(
											body.p2
										.eq(
											body.p1.dy((new tcsvg.Expression(__attribute__BODY_LENGTH())))
											, "./Sequence2TCSVG.atl - 123:6-123:50"
										)
									)
								.and(
										arms.p1
									.eq(
										body.p1.plus(	(new tcsvg.Expression(__attribute__ARM_LENGTH())).neg
										.div(
											(new tcsvg.Expression(2))
										), (new tcsvg.Expression(__attribute__HEAD2ARMS())))
										, "./Sequence2TCSVG.atl - 124:6-124:76"
									)
								)
							.and(
									arms.p2
								.eq(
									body.p1.plus(	(new tcsvg.Expression(__attribute__ARM_LENGTH()))
									.div(
										(new tcsvg.Expression(2))
									), (new tcsvg.Expression(__attribute__HEAD2ARMS())))
									, "./Sequence2TCSVG.atl - 125:6-125:75"
								)
							)
						.and(
								leftLeg.p1
							.eq(
								body.p2
								, "./Sequence2TCSVG.atl - 126:6-126:26"
							)
						)
					.and(
							leftLeg.p2
						.eq(
							leftLeg.p1.plus(	(new tcsvg.Expression(__attribute__ARM_LENGTH())).neg
							.div(
								(new tcsvg.Expression(2))
							), (new tcsvg.Expression(__attribute__LEG_HEIGHT())))
							, "./Sequence2TCSVG.atl - 127:6-127:83"
						)
					)
				.and(
						rightLeg.p1
					.eq(
						body.p2
						, "./Sequence2TCSVG.atl - 128:6-128:27"
					)
				)
			.and(
					rightLeg.p2
				.eq(
					rightLeg.p1.plus(	(new tcsvg.Expression(__attribute__ARM_LENGTH()))
					.div(
						(new tcsvg.Expression(2))
					), (new tcsvg.Expression(__attribute__LEG_HEIGHT())))
					, "./Sequence2TCSVG.atl - 129:6-129:84"
				)
			)
			);
		}
		// 169:1-172:52
		function eventConstraints(e, on) {
			return new tcsvg.Constraints().and(((tgt) => (
				eventConstraints2(e, on, tgt.outline)
			))(e)
			);
		}
		// 175:1-179:52
		function eventConstraints2(e, on, outline) {
			return new tcsvg.Constraints().and(((tgt) => (
						outline.center.x
					.eq(
						tgt.line.p1.x
						, "./Sequence2TCSVG.atl - 178:3-178:35"
					)
				.and(
					eventConstraintsY2(e, on, outline)
				)
			))(on)
			);
		}
		// 183:1-186:53
		function eventConstraintsY(e, on) {
			return new tcsvg.Constraints().and(((tgt) => (
				eventConstraintsY2(e, on, tgt.outline)
			))(e)
			);
		}
		// 190:1-210:4
		function eventConstraintsY2(e, on, outline) {
			return new tcsvg.Constraints().and(((scale) => (
				((onTgt) => (
					((afterTgt) => (
						((parentTgt) => (
										onTgt.line.p2.y
									.ge(
										outline.bottomLeft.y
										, "./Sequence2TCSVG.atl - 196:3-196:42"
									)
								.and(
									((! (OCLLibrary.oclIsUndefined(e.after)))) ? (
											outline.y
										.eq(
												afterTgt.outline.bottomLeft.y
											.plus(
												scale
											)
											, "./Sequence2TCSVG.atl - 198:3-198:52"
										)
									) : (
										((! (OCLLibrary.oclIsUndefined(e.parent)))) ? (
											((! (OCLLibrary.oclIsUndefined(parentTgt.label)))) ? (
													outline.y
												.eq(
														parentTgt.label.bottomLeft.y
													.plus(
														scale
													)
													, "./Sequence2TCSVG.atl - 201:4-201:52"
												)
											) : (
													outline.y
												.eq(
														parentTgt.outline.y
													.plus(
														scale
													)
													, "./Sequence2TCSVG.atl - 203:4-203:43"
												)
											)
										) : (
												outline.y
											.eq(
													onTgt.line.p1.y
												.plus(
														scale
													.times(
														(new tcsvg.Expression(2))
													)
												)
												, "./Sequence2TCSVG.atl - 206:3-206:42"
											)
										)
									)
								)
							.and(
								((! (OCLLibrary.oclIsUndefined(e.parent))) ?
									SVG__Rectangle__mustContain_2(parentTgt.outline, outline.enlarge((new tcsvg.Expression(5))))
								: new tcsvg.Constraints())
							)
						))(e.parent)
					))(e.after)
				))(on)
			))((new tcsvg.Expression(__attribute__scale())))
			);
		}
	</script>
	<defs>
		<!-- 95:1-117:2 -->
		<g id="object" >
			<line class="lifeline" id=".line"/>
			<rect class="participant" id=".outline"/>
			<text class="participantName" content-value="param(name)" id=".name">default</text>
			<line class="lifeline" id=".line2"/>
			<rect class="participant" id=".outline2"/>
			<text class="participantName" content-value="param(name)" id=".name2">default</text>
			<!-- constraints -->
			<constraints>
				{
					let s = this;
					return participantConstraints(s);
				}
			</constraints>
		</g>
		<!-- 131:1-166:2 -->
		<g id="actor" class="actor">
			<line class="lifeline" id=".line"/>
			<rect display="none" id=".outline"/>
			<text class="participantName" content-value="param(name)" id=".name">default</text>
			<circle id=".head"/>
			<line id=".body"/>
			<line id=".arms"/>
			<line id=".leftLeg"/>
			<line id=".rightLeg"/>
			<line class="lifeline" id=".line2"/>
			<rect display="none" fill="none" id=".outline2"/>
			<text class="participantName" content-value="param(name)" id=".name2">default</text>
			<circle id=".head2"/>
			<line id=".body2"/>
			<line id=".arms2"/>
			<line id=".leftLeg2"/>
			<line id=".rightLeg2"/>
			<!-- constraints -->
			<constraints name="participant">
				{
					let s = this;
					return participantConstraints(s);
			}
			</constraints>
			<constraints name="actorTop">
				{
					let s = this;
					return 	actor(this.head, this.body, this.arms, this.leftLeg, this.rightLeg)
					.and(
							this.outline.top.center
						.eq(
							this.body.p2.dy((new tcsvg.Expression(__attribute__LEG_HEIGHT())))
							, "./Sequence2TCSVG.atl - 162:10-162:64"
						)
					);
			}
			</constraints>
			<constraints name="actorBot">
				{
					let s = this;
					return 	actor(this.head2, this.body2, this.arms2, this.leftLeg2, this.rightLeg2)
					.and(
							this.outline2.bottom.center
						.eq(
							this.head2.center.dy((new tcsvg.Expression(__attribute__HEAD_R())).neg)
							, "./Sequence2TCSVG.atl - 164:10-164:70"
						)
					);
			}
			</constraints>
		</g>
		<!-- 220:1-232:2 -->
		<g id="call" >
			<rect display="param(cursor) none" height="10" id=".outline" width="10"/>
			<!-- constraints -->
			<constraints name="eventCstr">
				{
					let s = this;
					return eventConstraints(s, s.on);
			}
			</constraints>
		</g>
		<!-- 234:1-254:2 -->
		<g id="accept" >
			<rect display="param(cursor) none" height="10" id=".outline" width="10"/>
			<line class="messageArrow" id=".line"/>
			<text class="messageSignature" content-value="param(signature)" id=".text">default</text>
			<!-- constraints -->
			<constraints name="eventCstr">
				{
					let s = this;
					return eventConstraints(s, s.on);
			}
			</constraints>
			<constraints name="acceptCstr">
				{
					let s = this;
					return ((callTgt) => (
									this.line.p1
								.eq(
									callTgt.outline.center
									, "./Sequence2TCSVG.atl - 250:6-250:38"
								)
							.and(
									this.line.p2
								.eq(
									this.outline.center
									, "./Sequence2TCSVG.atl - 251:9-251:33"
								)
							)
						.and(
								this.text.bottom.center
							.eq(
								this.line.center
								, "./Sequence2TCSVG.atl - 252:9-252:41"
							)
						)
					))(s.call);
			}
			</constraints>
		</g>
		<!-- 256:1-276:2 -->
		<g id="direct" >
			<rect display="param(cursor) none" height="10" id=".outline" width="10"/>
			<rect display="param(cursor) none" fill="none" height="10" id=".source" width="10"/>
			<line class="messageArrow" id=".line"/>
			<text class="messageSignature" content-value="param(signature)" id=".text">default</text>
			<!-- constraints -->
			<constraints name="eventCstrFrom">
				{
					let s = this;
					return eventConstraints2(s, s.from, this.source);
			}
			</constraints>
			<constraints name="eventCstrTo">
				{
					let s = this;
					return eventConstraints2(s, s.to, this.outline);
			}
			</constraints>
			<constraints name="directCstr">
				{
					let s = this;
					return 			this.line.p1
							.eq(
								this.source.center
								, "./Sequence2TCSVG.atl - 272:6-272:29"
							)
						.and(
								this.line.p2
							.eq(
								this.outline.center
								, "./Sequence2TCSVG.atl - 273:9-273:33"
							)
						)
					.and(
							this.text.bottom.center
						.eq(
							this.line.center
							, "./Sequence2TCSVG.atl - 274:9-274:41"
						)
					);
			}
			</constraints>
		</g>
		<!-- 278:1-305:2 -->
		<g id="selfaccept" >
			<rect display="none" height="10" id=".outline" width="10"/>
			<line class="messagePart" id=".line1"/>
			<line class="messagePart" id=".line2"/>
			<line class="messageArrow" id=".line3"/>
			<text class="messageSignature" content-value="param(signature)" id=".text">default</text>
			<!-- constraints -->
			<constraints name="eventCstr">
				{
					let s = this;
					return eventConstraints(s, s.on);
			}
			</constraints>
			<constraints name="selfAcceptCstr">
				{
					let s = this;
					return ((DX) => (
						((callTgt) => (
														this.line1.p1
													.eq(
														callTgt.outline.center
														, "./Sequence2TCSVG.atl - 297:6-297:39"
													)
												.and(
														this.line1.p2
													.eq(
														this.line1.p1.dx(DX)
														, "./Sequence2TCSVG.atl - 298:9-298:35"
													)
												)
											.and(
													this.line2.p1
												.eq(
													this.line1.p2
													, "./Sequence2TCSVG.atl - 299:9-299:28"
												)
											)
										.and(
												this.line3.p1
											.eq(
												this.line2.p2
												, "./Sequence2TCSVG.atl - 300:9-300:28"
											)
										)
									.and(
											this.line3.p2
										.eq(
											this.line3.p1.dx(DX.neg)
											, "./Sequence2TCSVG.atl - 301:9-301:36"
										)
									)
								.and(
										this.line3.p2
									.eq(
										this.outline.center
										, "./Sequence2TCSVG.atl - 302:9-302:34"
									)
								)
							.and(
									this.text.left.center
								.eq(
									this.line2.center.dx((new tcsvg.Expression(5)))
									, "./Sequence2TCSVG.atl - 303:9-303:46"
								)
							)
						))(s.call)
					))((new tcsvg.Expression(20)));
			}
			</constraints>
		</g>
		<!-- 307:1-327:2 -->
		<g id="unaccepted" >
			<line class="messageArrow" id=".line"/>
			<text class="messageSignature" content-value="param(signature)" id=".text">default</text>
			<!-- constraints -->
			<constraints name="unacceptedCstr">
				{
					let s = this;
					return ((callTgt) => (
						((rightmostTgt) => (
											this.line.p1
										.eq(
											callTgt.outline.center
											, "./Sequence2TCSVG.atl - 322:6-322:38"
										)
									.and(
											this.line.p2.y
										.eq(
											this.line.p1.y
											, "./Sequence2TCSVG.atl - 323:9-323:30"
										)
									)
								.and(
										this.line.p2.x
									.eq(
											rightmostTgt.line.p1.x
										.plus(
											(new tcsvg.Expression(150))
										)
										, "./Sequence2TCSVG.atl - 324:9-324:49"
									)
								)
							.and(
									this.text.bottom.center
								.eq(
									this.line.center
									, "./Sequence2TCSVG.atl - 325:9-325:41"
								)
							)
						))(s.rightmost)
					))(s.call);
			}
			</constraints>
		</g>
		<!-- 329:1-353:2 -->
		<g id="found" class="found">
			<rect display="none" height="10" id=".outline" width="10"/>
			<line class="messageArrow" id=".line"/>
			<text class="messageSignature" content-value="param(signature)" id=".text">default</text>
			<circle class="circle" display="param(circle) yes" id=".circle" r="5"/>
			<!-- constraints -->
			<constraints name="eventCstr">
				{
					let s = this;
					return eventConstraints(s, s.on);
			}
			</constraints>
			<constraints name="unacceptedCstr">
				{
					let s = this;
					return ((leftmostTgt) => (
											this.line.p1.x
										.eq(
												leftmostTgt.line.p1.x
											.minus(
												(new tcsvg.Expression(150))
											)
											, "./Sequence2TCSVG.atl - 347:6-347:45"
										)
									.and(
											this.line.p1.y
										.eq(
											this.line.p2.y
											, "./Sequence2TCSVG.atl - 348:9-348:30"
										)
									)
								.and(
										this.line.p2
									.eq(
										this.outline.center
										, "./Sequence2TCSVG.atl - 349:9-349:33"
									)
								)
							.and(
									this.circle.center.dx((new tcsvg.Expression(5)))
								.eq(
									this.line.p1
									, "./Sequence2TCSVG.atl - 350:9-350:38"
								)
							)
						.and(
								this.text.bottom.center
							.eq(
								this.line.center
								, "./Sequence2TCSVG.atl - 351:9-351:41"
							)
						)
					))(s.leftmost);
			}
			</constraints>
		</g>
		<!-- 355:1-383:2 -->
		<g id="set" class="set">
			<rect display="none" height="10" id=".outline" width="10"/>
			<line class="messagePart" id=".line1"/>
			<line class="messagePart" id=".line2"/>
			<line class="messageArrow" id=".line3"/>
			<text class="messageSignature" content-value="param(signature)" id=".text">default</text>
			<!-- constraints -->
			<constraints name="eventCstr">
				{
					let s = this;
					return eventConstraints(s, s.on);
			}
			</constraints>
			<constraints name="selfAcceptCstr">
				{
					let s = this;
					return ((DX) => (
						((DY) => (
														this.line1.p1
													.eq(
														this.outline.center
														, "./Sequence2TCSVG.atl - 375:6-375:31"
													)
												.and(
														this.line1.p2
													.eq(
														this.line1.p1.dx(DX)
														, "./Sequence2TCSVG.atl - 376:9-376:35"
													)
												)
											.and(
													this.line2.p1
												.eq(
													this.line1.p2
													, "./Sequence2TCSVG.atl - 377:9-377:28"
												)
											)
										.and(
												this.line2.p2
											.eq(
												this.line2.p1.dy(DY)
												, "./Sequence2TCSVG.atl - 378:9-378:35"
											)
										)
									.and(
											this.line3.p1
										.eq(
											this.line2.p2
											, "./Sequence2TCSVG.atl - 379:9-379:28"
										)
									)
								.and(
										this.line3.p2
									.eq(
										this.line3.p1.dx(DX.neg)
										, "./Sequence2TCSVG.atl - 380:9-380:36"
									)
								)
							.and(
									this.text.left.center
								.eq(
									this.line2.center.dx((new tcsvg.Expression(5)))
									, "./Sequence2TCSVG.atl - 381:9-381:46"
								)
							)
						))((new tcsvg.Expression(15)))
					))((new tcsvg.Expression(20)));
			}
			</constraints>
		</g>
		<!-- 385:1-408:2 -->
		<g id="after" >
			<rect fill="url(#horizontalWhiteStripes)" id=".outline" stroke="none"/>
			<text class="messageSignature" content-value="param(signature)" id=".text">default</text>
			<!-- constraints -->
			<constraints name="onCstr">
				{
					let s = this;
					return (OCLLibrary.iterate(OCLLibrary.collect(s.on, (o) => ((oTgt) => (
								eventConstraintsY(s, o)
							.and(
									oTgt.outline.center.x
								.ge(
										this.outline.x
									.plus(
										(new tcsvg.Expression(5))
									)
									, "./Sequence2TCSVG.atl - 401:10-401:48"
								)
							)
						.and(
								oTgt.outline.center.x
							.le(
									this.outline.topRight.x
								.minus(
									(new tcsvg.Expression(5))
								)
								, "./Sequence2TCSVG.atl - 402:10-402:57"
							)
						)
					))(o)), (new tcsvg.Constraints()),
						(acc, c) => 	acc
						.and(
							c
						)
					))
					;
			}
			</constraints>
			<constraints name="cstr">
				{
					let s = this;
					return 		this.outline.height
						.ge(
								this.text.height
							.times(
								(new tcsvg.Expression(2))
							)
							, "./Sequence2TCSVG.atl - 405:6-405:39"
						)
					.and(
							this.text.center
						.eq(
							this.outline.center
							, "./Sequence2TCSVG.atl - 406:9-406:37"
						)
					);
			}
			</constraints>
		</g>
		<!-- 410:1-447:2 -->
		<g id="note" >
			<rect class="note" display="none" id=".outline"/>
			<polygon class="note" id=".polygon"/>
			<text content-value="param(note)" id=".text">default<title content-value="param(title)">no title</title></text>
			<!-- constraints -->
			<constraints name="eventCstr">
				{
					let s = this;
					return eventConstraintsY(s, OCLLibrary.first(s.on));
			}
			</constraints>
			<constraints name="outlCstr">
				{
					let s = this;
					return ((first) => (
						((last) => (
									this.outline.center.x
								.eq(
											last.outline.center.x
										.plus(
											first.outline.center.x
										)
									.div(
										(new tcsvg.Expression(2))
									)
									, "./Sequence2TCSVG.atl - 430:6-430:77"
								)
							.and(
									this.text.center
								.eq(
									this.outline.center
									, "./Sequence2TCSVG.atl - 431:9-431:37"
								)
							)
						))(OCLLibrary.last(s.on))
					))(OCLLibrary.first(s.on));
			}
			</constraints>
			<constraints name="polyCstr">
				{
					let s = this;
					return ((DELTA) => (
						((M) => (
																SVG__Rectangle__mustContain_2(this.outline, this.text.enlarge(M, M, 	M
																.plus(
																	DELTA
																), M))
															.and(
																this.polygon.pointEq((new tcsvg.Expression(0)), this.outline.topLeft)
															)
														.and(
															this.polygon.pointEq((new tcsvg.Expression(1)), this.outline.topRight.dx(DELTA.neg))
														)
													.and(
														this.polygon.pointEq((new tcsvg.Expression(2)), this.outline.topRight.plus(DELTA.neg, DELTA))
													)
												.and(
													this.polygon.pointEq((new tcsvg.Expression(3)), this.outline.topRight.dx(DELTA.neg))
												)
											.and(
												this.polygon.pointEq((new tcsvg.Expression(4)), this.outline.topRight.dy(DELTA))
											)
										.and(
											this.polygon.pointEq((new tcsvg.Expression(5)), this.outline.topRight.plus(DELTA.neg, DELTA))
										)
									.and(
										this.polygon.pointEq((new tcsvg.Expression(6)), this.outline.topRight.dy(DELTA))
									)
								.and(
									this.polygon.pointEq((new tcsvg.Expression(7)), this.outline.bottomRight)
								)
							.and(
								this.polygon.pointEq((new tcsvg.Expression(8)), this.outline.bottomLeft)
							)
						))(	(new tcsvg.Expression(__attribute__MARGIN()))
						.div(
							(new tcsvg.Expression(3))
						))
					))((new tcsvg.Expression(10)));
			}
			</constraints>
		</g>
		<!-- 449:1-474:2 -->
		<g id="invariant" >
			<rect display="none" id=".outline" width="10"/>
			<rect display="none" height="10" id=".helpr" width="10"/>
			<polygon class="invariant" id=".polygon"/>
			<a href="param(link) default">
									<text class="invariantText" content-value="param(invariant)" id=".text">default</text>
								</a>
			<!-- constraints -->
			<constraints name="eventCstr">
				{
					let s = this;
					return eventConstraints(s, s.on);
			}
			</constraints>
			<constraints name="invCstr">
				{
					let s = this;
					return ((width) => (
						((height) => (
											this.outline.height
										.eq(
											height
											, "./Sequence2TCSVG.atl - 469:6-469:29"
										)
									.and(
										this.polygon.constrainTEllipse(this.helpr.x, this.helpr.y, 	width
										.plus(
												height
											.div(
												(new tcsvg.Expression(2))
											)
										), width)
									)
								.and(
										this.polygon.center
									.eq(
										this.outline.center
										, "./Sequence2TCSVG.atl - 471:9-471:40"
									)
								)
							.and(
									this.text.center
								.eq(
									this.outline.center
									, "./Sequence2TCSVG.atl - 472:9-472:37"
								)
							)
						))(	this.text.height
						.plus(
								(new tcsvg.Expression(__attribute__MARGIN()))
							.times(
								(new tcsvg.Expression(2))
							)
						))
					))(this.text.width);
			}
			</constraints>
		</g>
		<!-- 476:1-513:2 -->
		<g id="fragment" class="fragment">
			<rect id=".outline"/>
			<polygon id=".polygon"/>
			<text content-value="param(label)" id=".label">default</text>
			<text content-value="param(condition)" id=".condition">default</text>
			<!-- constraints -->
			<constraints name="eventCstr">
				{
					let s = this;
					return eventConstraintsY(s, OCLLibrary.first(s.on));
			}
			</constraints>
			<constraints name="outlCstr">
				{
					let s = this;
					return ((lblOutline) => (
						((first) => (
							((last) => (
																		this.outline.center.x
																	.eq(
																				last.outline.center.x
																			.plus(
																				first.outline.center.x
																			)
																		.div(
																			(new tcsvg.Expression(2))
																		)
																		, "./Sequence2TCSVG.atl - 496:6-496:77"
																	)
																.and(
																	(OCLLibrary.iterate(OCLLibrary.collect(s.on, (o) => ((DX) => (
																		((oTgt) => (
																				this.outline.mustContainX(	oTgt.line.p1.x
																				.plus(
																					DX
																				))
																			.and(
																				this.outline.mustContainX(	oTgt.line.p1.x
																				.minus(
																					DX
																				))
																			)
																		))(o)
																	))((new tcsvg.Expression(5)))), (new tcsvg.Constraints()),
																		(acc, c) => 	acc
																		.and(
																			c
																		)
																	))
																)
															.and(
																	lblOutline.topLeft
																.eq(
																	this.outline.topLeft
																	, "./Sequence2TCSVG.atl - 504:9-504:45"
																)
															)
														.and(
															this.polygon.pointEq((new tcsvg.Expression(0)), lblOutline.topLeft)
														)
													.and(
														this.polygon.pointEq((new tcsvg.Expression(1)), lblOutline.topRight.dx((new tcsvg.Expression(10))))
													)
												.and(
													this.polygon.pointEq((new tcsvg.Expression(2)), lblOutline.topRight.plus((new tcsvg.Expression(10)), (new tcsvg.Expression(10))))
												)
											.and(
												this.polygon.pointEq((new tcsvg.Expression(3)), lblOutline.bottomRight)
											)
										.and(
											this.polygon.pointEq((new tcsvg.Expression(4)), lblOutline.bottomLeft)
										)
									.and(
											this.condition.topLeft
										.eq(
											lblOutline.topRight.dx((new tcsvg.Expression(20)))
											, "./Sequence2TCSVG.atl - 510:9-510:55"
										)
									)
								.and(
									SVG__Rectangle__mustContain_2(this.outline, this.condition)
								)
							))(OCLLibrary.last(s.on))
						))(OCLLibrary.first(s.on))
					))(this.label.enlarge((new tcsvg.Expression(__attribute__MARGIN())), (new tcsvg.Expression(0))));
			}
			</constraints>
		</g>
		<!-- 515:1-544:2 -->
		<g id="compartment" class="compartment">
			<rect display="none" id=".outline"/>
			<line id=".line"/>
			<text content-value="param(condition)" id=".label">default</text>
			<!-- constraints -->
			<constraints name="compCstr">
				{
					let s = this;
					return ((parTgt) => (
						((afterTgt) => (
														this.outline.x
													.eq(
														parTgt.outline.x
														, "./Sequence2TCSVG.atl - 532:6-532:34"
													)
												.and(
														this.outline.width
													.eq(
														parTgt.outline.width
														, "./Sequence2TCSVG.atl - 533:9-533:45"
													)
												)
											.and(
												(OCLLibrary.oclIsUndefined(s.after)) ? (
														this.outline.y
													.eq(
														parTgt.outline.y
														, "./Sequence2TCSVG.atl - 535:7-535:35"
													)
												) : (
														this.outline.y
													.eq(
															afterTgt.outline.bottomLeft.y
														.plus(
															(new tcsvg.Expression(__attribute__scale()))
														)
														, "./Sequence2TCSVG.atl - 537:7-537:67"
													)
												)
											)
										.and(
												this.line
											.eq(
												this.outline.top
												, "./Sequence2TCSVG.atl - 539:9-539:27"
											)
										)
									.and(
											this.label.topLeft.x
										.eq(
												parTgt.label.enlarge((new tcsvg.Expression(__attribute__MARGIN())), (new tcsvg.Expression(0))).topRight.x
											.plus(
												(new tcsvg.Expression(20))
											)
											, "./Sequence2TCSVG.atl - 540:9-540:85"
										)
									)
								.and(
									SVG__Rectangle__mustContain_2(this.outline, this.label)
								)
							.and(
								SVG__Rectangle__mustContain_2(parTgt.outline, this.outline)
							)
						))(s.after)
					))(s.parent);
			}
			</constraints>
		</g>
		<!-- 546:1-568:2 -->
		<g id="textcompartment" class="textcompartment">
			<rect display="none" id=".outline"/>
			<text content-value="param(label)" id=".label">default</text>
			<!-- constraints -->
			<constraints name="compCstr">
				{
					let s = this;
					return ((parTgt) => (
												this.outline.x
											.eq(
												parTgt.outline.x
												, "./Sequence2TCSVG.atl - 561:6-561:34"
											)
										.and(
												this.outline.width
											.eq(
												parTgt.outline.width
												, "./Sequence2TCSVG.atl - 562:9-562:45"
											)
										)
									.and(
											this.outline.y
										.eq(
											parTgt.label.bottomLeft.y
											, "./Sequence2TCSVG.atl - 563:9-563:46"
										)
									)
								.and(
										this.label.center
									.eq(
										this.outline.center
										, "./Sequence2TCSVG.atl - 564:9-564:38"
									)
								)
							.and(
								SVG__Rectangle__mustContain_2(this.outline, this.label.enlarge((new tcsvg.Expression(10))))
							)
						.and(
							SVG__Rectangle__mustContain_2(parTgt.outline, this.outline)
						)
					))(s.parent);
			}
			</constraints>
		</g>
		<!-- 570:1-592:2 -->
		<g id="actualgate">
			<rect display="param(cursor) none" height="10" id=".outline" width="10"/>
			<line class="messageArrow" id=".line"/>
			<text class="messageSignature" content-value="param(signature)" id=".text">default</text>
			<!-- constraints -->
			<constraints name="compCstr">
				{
					let s = this;
					return ((fragTgt) => (
						((callTgt) => (
										this.outline.center.onSegment(fragTgt.outline.left)
									.and(
											this.line.p1
										.eq(
											callTgt.outline.center
											, "./Sequence2TCSVG.atl - 588:9-588:41"
										)
									)
								.and(
										this.line.p2
									.eq(
										this.outline.center
										, "./Sequence2TCSVG.atl - 589:9-589:33"
									)
								)
							.and(
									this.text.bottom.center
								.eq(
									this.line.center
									, "./Sequence2TCSVG.atl - 590:9-590:41"
								)
							)
						))(s.call)
					))(s.fragment);
			}
			</constraints>
		</g>
	</defs>
	<marker id="arrowHead" markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto">
		<polygon class="messageArrowHead" points="0,0,10,4,0,8,6,4"/>
	</marker>
	<pattern id="horizontalWhiteStripes" patternUnits="userSpaceOnUse" width="4" height="4">
		<line x1="-5" y1="0" x2="9" y2="0" style="stroke-width: 4; stroke: white;"/>
	</pattern>
`;

