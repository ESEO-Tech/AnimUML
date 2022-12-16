globalThis.examples = globalThis.examples || [];
examples.push(
    {
        "name": "RobotModel",
        "objects": [
            {
                "name": "user",
                "isActor": true
            },
            {
                "name": "adminUI",
                "class": "AdminUI",
                "isActor": false,
                behavior:`
                    [*] --> mainScreen
                    mainScreen --> manuMode : goManuMode
                    manuMode --> mainScreen : backMainScreen
                    mainScreen --> autoTrip : goAutoMode 
                    autoTrip --> mainScreen : backMainScreen
                    autoTrip --> mainScreen : SignalEndTrip
                    mainScreen --> [*] : quit 
                    mainScreen : ToggleEmergencyStop / toggleES();
                    autoTrip : entry / displayTrips(); goAutoMode();
                    autoTrip : choiceTrip() / trip=IdTrip; setTrip(IdTrip);
                    autoTrip : ToggleEmergencyStop / toggleES();
                    manuMode : newDir() / setVelocity(vel);
                    autoTrip : SignalNewStep/displayScreen(CONNECT_SCREEN);
                    manuMode : ToggleEmergencyStop / toggleES();

                `,
                "operationByName": {
                    "displayScreen": {},
                    "displayTrips":{},
                    "setTrip":{},

                }
            },
            {
                "name": "pilot",
                "class": "Pilot",
                "isActor":false,
                behavior:`
                [*] --> Normal
                Normal --> Emergency : toggleES / signalES(true);
                Emergency : entry/currentVel.dir=STOP
                Emergency : sendMvt(currentVel)
                state Normal {
                    [*] --> Idle : /currentVel.dir=STOP;
                    Idle --> WaitingObsDetect : setVelocity(vel) / currentVel=vel; askdir(currentVel.dir);
                    Idle : entry/sendMvt(currentVel)
                    WaitingObsDetect --> choice : setObs(dist)
                    WaitingObsDetect : setVelocity() / currentVel=vel; sendMvt(currentVel);
                    state choice <<choice>>
                        choice --> Idle : [dist<5] / sendMvt(0); currentVel=0; SignalBlocked();
                        choice --> Running : [else] / sendMvt(currentVel);
                    Running --> choice2 : setVelocity(vel)
                    state choice2 <<choice>>
                        choice2 --> WaitingObsDetect : [else] / sendMvt(0); currentVel=vel; askdir(currentVel.dir);
                        choice2 --> Running : [currentVel=vel]
                    Running --> WaitingObsDetect : after(1s) / askdir(currentVel.dir);
                }
                Emergency --> Normal : toggleES / signalES(false);
                `,
                "operationByName": {
                    "sendMvt": {
                        "private": true
                    },
                    "setObs":{
                        "private":true
                    }
                }
            },
            {
                "name": "robot",
                "class": "Robot",
                behavior :`
                    [*] --> Idle
                    Idle --> Idle : askdir / setObs(dist);
                `,
                "operationByName": {
                        "getRobotSpeed": {},
                        "getSensorState": {},
                        "askdir":{}
                }
            },
            
            {
                "name": "simulateurRobot",
                "isActor": true
            },
            {
                "name": "copilot",
                "isActor": false,
                behavior: `
                    [*] --> Idle 
                    Idle --> Travelling : setTrip(idTrip)/trip=getTrip(idTrip); step=NULL;
                    Travelling : entry / SignalNewStep;
                    Travelling --> Stepping : when(step!=NULL)/setVelocity(step.vel);
                    Travelling --> Idle : when(step==NULL)/SignalEndTrip;
                    Stepping --> Travelling : after(step.time)
                    Stepping --> Travelling : SignalBlocked/ trip=getTrip(obsEscape); step=NULL;
                `,
                "operationByName": {
                    "gotrip": {
                        "private": false,

                    },
                    "getTrip":{
                        "private":true
                    },
                    "getAvoidTrip":{
                        "private":true
                    },
                }
            }
        ],
        "connectorByName": {
            "C1": {
                "ends": [
                    "adminUI",
                    "pilot"
                ],
                "possibleMessages": {
                    "forward": [
                        "toggleES",
                        "setVelocity"
                    ]
                }
            },
            "C2": {
                "ends":[
                    "pilot",
                    "copilot"
                ],
                "possibleMessages": {
                    "forward": [
                        "SignalBlocked",
                        "gotrip()"
                    ],
                    "reverse": [
                        "SetVelocity"
                    ]
                }
            },
            "C3": {
                "ends":[
                    "adminUI",
                    "copilot"
                ],
                "possibleMessages":{
                    "forward":[
                        "setTrip",
                        "goAutoMode"
                    ],
                    "reverse":[
                        "SignalNewStep",
                        "SignalEndTrip"
                    ]
                }
            },
            "C4": {
                "ends": [
                    "pilot",
                    "robot"
                ],
                "possibleMessages": {
                    "forward": [
                        "setVelocity",
                        "getSensorState"
                    ],
                    "reverse":[
                        "setObs(dist)",
                    ]
                }
            },
            
            "C8": {
                "ends": [
                    "user",
                    "adminUI"
                ],
                "possibleMessages": {
                    "forward": [
                        "quit",
                        "goAutoMode",
                        "goManuMode",
                        "backMainScreen",
                        "choiceTrip",
                        "newDir",
                        "ToggleEmergencyStop"
                    ],
                    "reverse": [
                        "displayScreen",
                        "displayTrips"
                    ]
                }
            },
            "C10": {
                "ends": [
                    "robot",
                    "simulateurRobot"
                ]
            }
        }
    }
);
