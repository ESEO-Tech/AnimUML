const webpack = require("webpack");
module.exports = {
	mode: "production",
//	devtool: 'sourcemap',
	plugins: [
		new webpack.ProgressPlugin({activeModules: true}),
	],
	module: {
		rules: [
			{
				test: /\.m?js$/,
				exclude: /(node_modules|bower_components)/,
//*
				use: {
					loader: 'babel-loader',
					options: {
						presets: [['@babel/preset-env', {
							debug: true,
							targets: {
								"node": "v16.14.2",
								"chrome": 80,
								"firefox": 80,
								//"node": "v14.19.1",
								//"node": "v12.22.11",	// bug pegjs does not work

								// not possible for Ubuntu 16.04's node version
								// mainly because it does not support modules, but even setting output.module to false does not work
								//"node": "v4.2.6",
							},
						}]],
						// adding individual "compatibility" transform plugins can be used for testing purposes
						// but preset-env should be preferred
						plugins: [
//							"@babel/plugin-proposal-optional-chaining",
//							"@babel/plugin-proposal-class-properties",
//							"@babel/plugin-syntax-top-level-await",

							// for node lts/fermium: v14.19.1
//							"@babel/plugin-proposal-logical-assignment-operators",
						],
					}
				}
/**/
			}
		]
	},
	output: {
		libraryTarget: 'global',
		library: 'AnimUMLUtils',
		globalObject: 'globalThis',
	},
	externals: {
		'./peg-0.10.0.min.js': './peg-0.10.0.min.js',	// not really working
		'./pako.min.js': './pako.min.js',
		'fs': "FS",
		'node-fetch': "NODE_FETCH",
		'svgdom': "SVGDOM",
		'svgdom-css': "SVGDOM_CSS",
		'path': "PATH",
		'url': "URL",
		'./ContextualEval.cjs': './ContextualEval.cjs',
	},
/*
	externals: {
		svgdom: 'svgdom',
		"svgdom-css": 'svgdom-css',
		"node-fetch": 'node-fetch',
		"fs": 'fs',
		"path": 'path',
		"url": 'url',
		'./peg-0.10.0.min.js': './peg-0.10.0.min.js',
		'./ContextualEval.cjs': './ContextualEval.cjs',
	},
	experiments: {
		topLevelAwait: true,
		outputModule: true,
	},
*/
};
