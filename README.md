### Overview

This repository contains a runnable version of AnimUML, a web-based UML animation tool.

You can also try AnimUML without downloading or installing anything at: https://animuml.kher.nl/

AnimUML has been presented in the following research paper:
```bibtex
@inproceedings{AnimUML,
	title = {{Designing, Animating, and Verifying Partial UML Models}},
	author = {Fr{\'{e}}d{\'{e}}ric Jouault and Valentin Besnard and Th{\'{e}}o {Le Calvar} and Ciprian Teodorov and Matthias Brun and J{\'{e}}r{\^{o}}me Delatour},
	booktitle = {Proceedings of the 23rd ACM / IEEE International Conference on Model Driven Engineering Languages and Systems (MODELS 2020)},
	address   = {Montreal, Canada},
	month = oct,
	year = 2020,
	note = {To appear},
}
```

Only a few sample models from the paper are currently available.

### Known issues

* Connections to remote engines, such as [EMI](http://www.obpcdl.org/bare-metal-uml/), and to external tools, such as [OBP2](http://www.obpcdl.org/), do not currently work on this version.

### How to use on your machine

- Clone this repository:
```bash
git clone https://github.com/fjouault/AnimUML.git
```
- [optional] Change the listening port in `docker-compose.yml`, for instance to 8080:80 (instead of 80:80) if you want to use port 8080.
	- Port 8080 in this example corresponds to the listening port on your machine, and you can change it to whatever port suits your need.
	- Port 80 corresponds to the listening port inside of the docker container, and you should not change it unless you understand what it implies.
- Launch the server with the following command (run with sudo if you cannot run docker from your user account):
```bash
	docker-compose up
```
- Open `http://localhost:<port>/` in your browser (tested with Chrome and Firefox).
The `:<port>` part is optional if you opted to use the default HTTP port (i.e., 80).

### Dependencies

- `docker-compose`
	- can be installed with apt on Debian-derived distributions.

Other dependencies will be downloaded automatically when running docker-compose for the first time. An internet connection is therefore required for the first launch.

### Included third-party libraries

- https://nodeca.github.io/pako/
- https://github.com/slightlyoff/cassowary.js
- param.js from https://www.w3.org/TR/SVGParamPrimer/

