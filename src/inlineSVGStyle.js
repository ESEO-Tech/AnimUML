import {default as toolbox} from 'svg-icon-toolbox';

	let srcFile = process.argv[2];
	if(srcFile) {
		toolbox.load(srcFile, (err, loaded) => {
			if(err) {
				console.error(err);
				return;
			}
			loaded.inline({}, (err, loaded) => {
				if(err) {
					console.error(err);
					return;
				}
				const svgFile = process.argv[3] ?? "/tmp/out.svg";
				loaded.write(svgFile, err => {
					if(err) {
						console.error(err);
						return;
					}
					//console.log("Saved to", svgFile);
				});
			});
		});
	} else {
		console.log("Expected a file");
	}
