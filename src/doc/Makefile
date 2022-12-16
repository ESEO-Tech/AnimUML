BUILDER=buildRailroadDiagrams.js
SRC_DIR=..

classGrammar.html sequenceGrammar.html  stateGrammar.html : $(SRC_DIR)/ImportFromPlantUMLClass.js $(SRC_DIR)/ImportFromPlantUMLSequence.js $(SRC_DIR)/ImportFromPlantUMLState.js $(BUILDER) Makefile
	cd ..; node doc/$(BUILDER)

