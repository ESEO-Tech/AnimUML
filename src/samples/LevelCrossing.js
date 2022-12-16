globalThis.examples = globalThis.examples || [];
examples.push(
	{
		name: 'LevelCrossing',
		objects: [
			{
				name: "train",
				stateByName: {
					Initial: {
						type: 'Pseudostate',
						kind: 'initial',
					},
				},
				transitionByName: {
					Initial_To_Idle: {
						source: 'Initial',
						target: 'Idle',
					},
					Idle_To_Far: {
						source: 'Idle',
						target: 'Far',
						effect : 'activation0();'
					},
					Far_To_Close: {
						source: 'Far',
						target: 'Close',
						effect : 'activation1();'
					},
					Close_To_Passing: {
						source: 'Close',
						target: 'Passing',
						trigger : 'authorization'
					},
					Passing_To_Idle: {
						source: 'Passing',
						target: 'Idle',
						effect : 'activation2();'
					},
				},
			},
			{
				name: "tcEntrance0",
				stateByName: {
					Initial: {
						type: 'Pseudostate',
						kind: 'initial',
					},
				},
				transitionByName: {
					Initial_To_Detection: {
						source: 'Initial',
						target: 'Detection',
					},
					Detection_To_Detection: {
						source: 'Detection',
						target: 'Detection',
						trigger: 'activation0',
						effect: 'entranceDetection();',
					},
				},
			},
			{
				name: "tcEntrance1",
				stateByName: {
					Initial: {
						type: 'Pseudostate',
						kind: 'initial',
					},
				},
				transitionByName: {
					Initial_To_Detection: {
						source: 'Initial',
						target: 'Detection',
					},
					Detection_To_Detection: {
						source: 'Detection',
						target: 'Detection',
						trigger: 'activation1',
						effect: 'entranceDetection();',
					},
				},
			},
			{
				name: "tcExit",
				stateByName: {
					Initial: {
						type: 'Pseudostate',
						kind: 'initial',
					},
				},
				transitionByName: {
					Initial_To_Detection: {
						source: 'Initial',
						target: 'Detection',
					},
					Detection_To_Detection: {
						source: 'Detection',
						target: 'Detection',
						trigger: 'activation2',
						effect: 'exitDetection();',
					},
				},
			},
			{
				name: "controller",
				stateByName: {
					Initial: {
						type: 'Pseudostate',
						kind: 'initial',
					},
				},
				transitionByName: {
					Initial_To_Idle: {
						source: 'Initial',
						target: 'Idle',
						effect: 'nbEngagedTrains = 0;',
					},
					Idle_To_WaitRoadSignOn: {
						source: 'Idle',
						target: 'WaitRoadSignOn',
						trigger: 'entranceDetection',
						guard : 'nbEngagedTrains == 0',
						effect : 'switchRoadSignOn()'
					},
					WaitRoadSignOn_To_FarDetection: {
						source: 'WaitRoadSignOn',
						target: 'FarDetection',
						trigger: 'roadSignOn',
					},
					FarDetection_To_CloseDetection : {
						source: 'FarDetection',
						target: 'CloseDetection',
						trigger: 'entranceDetection',
						effect: 'close(); nbEngagedTrains++;'
					},
					CloseDetection_To_Idle: {
						source: 'CloseDetection',
						target: 'Idle',
						trigger: 'gateClosed',
						effect: 'switchRailwaySignOff();',
					},
					Idle_To_WaitRailwaySignOn: {
						source: 'Idle',
						target: 'WaitRailwaySignOn',
						trigger: 'exitDetection',
						guard : 'nbEngagedTrains == 1',
						effect: 'switchRailwaySignOn();',
					},
					WaitRailwaySignOn_To_WaitGateOpen: {
						source: 'WaitRailwaySignOn',
						target: 'WaitGateOpen',
						trigger: 'railwaySignOn',
						guard : 'nbEngagedTrains == 1',
						effect: 'open(); nbEngagedTrains--;',
					},
					WaitGateOpen_To_WaitRoadSignOff: {
						source: 'WaitGateOpen',
						target: 'WaitRoadSignOff',
						trigger: 'gateOpen',
						effect: 'switchRoadSignOff();',
					},
					WaitRoadSignOff_To_Idle: {
						source: 'WaitRoadSignOff',
						target: 'Idle',
						trigger: 'roadSignOff',
					},
				},
			},
			{
				name: "railwaySign",
				stateByName: {
					Initial: {
						type: 'Pseudostate',
						kind: 'initial',
					},
				},
				transitionByName: {
					Initial_To_Active: {
						source: 'Initial',
						target: 'Active',
					},
					Active_To_Inactive: {
						source: 'Active',
						target: 'Inactive',
						trigger: 'switchRailwaySignOff',
						effect : 'authorization();'
					},
					Inactive_To_Active: {
						source: 'Inactive',
						target: 'Active',
						trigger: 'switchRailwaySignOn',
						effect : 'railwaySignOn();'
					},
				},
			},
			{
				name: "roadSign",
				stateByName: {
					Initial: {
						type: 'Pseudostate',
						kind: 'initial',
					},
				},
				transitionByName: {
					Initial_To_Inactive: {
						source: 'Initial',
						target: 'Inactive',
					},
					Inactive_To_Active: {
						source: 'Inactive',
						target: 'Active',
						trigger: 'switchRoadSignOn',
						effect : 'roadSignOn();'
					},
					Active_To_Inactive: {
						source: 'Active',
						target: 'Inactive',
						trigger: 'switchRoadSignOff',
						effect : 'roadSignOff();'
					},
				},
			},
			{
				name: "gate",
				stateByName: {
					Initial: {
						type: 'Pseudostate',
						kind: 'initial',
					},
				},
				transitionByName: {
					Initial_To_Open: {
						source: 'Initial',
						target: 'Open',
					},
					Open_To_Closed: {
						source: 'Open',
						target: 'Closed',
						trigger: 'close',
						effect : 'gateClosed();'
					},
					Closed_To_Open: {
						source: 'Closed',
						target: 'Open',
						trigger: 'open',
						effect : 'gateOpen();'
					},
				},
			},
		],
		connectorByName: {
			C1: {
				ends: ["controller", "gate"],
				possibleMessages: {
					forward: ["open", "close"],
					reverse: ["gateOpen", "gateClosed"],
				},
			},
			C2_0: {
				ends: ["controller", "tcEntrance0"],
				possibleMessages: {
					reverse: ["entranceDetection"],
				},
			},
			C2_1: {
				ends: ["controller", "tcEntrance1"],
				possibleMessages: {
					reverse: ["entranceDetection"],
				},
			},
			C3: {
				ends: ["controller", "tcExit"],
				possibleMessages: {
					reverse: ["exitDetection"],
				},
			},
			C4: {
				ends: ["controller", "roadSign"],
				possibleMessages: {
					forward: ["switchRoadSignOn", "switchRoadSignOff"],
					reverse: ["roadSignOn", "roadSignOff"],
				},
			},
			C5_0: {
				ends: ["train", "tcEntrance0"],
				possibleMessages: {
					forward: ["entrance0"],
				},
			},
			C5_1: {
				ends: ["train", "tcEntrance1"],
				possibleMessages: {
					forward: ["entrance1"],
				},
			},
			C6: {
				ends: ["train", "tcExit"],
				possibleMessages: {
					forward: ["entrance2"],
				},
			},
			C7: {
				ends: ["controller", "railwaySign"],
				possibleMessages: {
					forward: ["switchRailwaySignOn", "switchRailwaySignOff"],
					reverse: ["railwaySignOn", "railwaySignOff"],
				},
			},
			C8: {
				ends: ["train", "railwaySign"],
				possibleMessages: {
					reverse: ["authorization"],
				},
			},
		},
	}
);
