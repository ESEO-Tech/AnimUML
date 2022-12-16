#!/bin/sh

# AnimUML
node ./node_modules/webpack-cli/bin/cli.js --config webpack.config.cjs --entry regenerator-runtime/runtime --entry ./AnimUML.js  --output-path AnimUML.min.js --display-max-modules 501 --stats verbose

# AnimUMLUtils library
node ./node_modules/webpack-cli/bin/cli.js --config webpack.config.library.cjs --entry regenerator-runtime/runtime --entry ./AnimUMLUtils.js  --output-path . --output-filename AnimUMLUtils.min.js --stats verbose

# AnalysisWorker
node ./node_modules/webpack-cli/bin/cli.js --config webpack.config.cjs --entry regenerator-runtime/runtime --entry ./AnalysisWorker.js  --output-path . --output-filename AnalysisWorker.min.js --stats verbose

# TCSVG
cat ./tcsvg/param.js ./tcsvg/mycsvg.js ./tcsvg/inlineConstraints.js > ./tcsvg/TCSVG.cat.js
node ./node_modules/webpack-cli/bin/cli.js --config webpack.config.cjs --entry regenerator-runtime/runtime --entry ./tcsvg/TCSVG.cat.js --output ./tcsvg/TCSVG.min.js --display-max-modules 501
