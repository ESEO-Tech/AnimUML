### Overview

This repository contains a runnable version of AnimUML, a web-based UML animation tool.

You can also try the latest AnimUML version (v20221216) without downloading or installing anything using the following link: https://animumlv20221216.kher.nl/.
Note that this server does not host any remote engine or external tool.
Other AnimUML versions are listed on the [Deployed Installations](https://github.com/ESEO-Tech/AnimUML/wiki/Deployed-Installations) wiki page.

AnimUML has been presented at MODELS 2020 ([interactive slides](https://animuml.kher.nl/slides/MODELS2020.html)):

<p align="center">
  <a href="https://www.youtube.com/watch?v=7pzbaWWFpcM"><img width="70%" alt="AnimUML MODELS 2020 presentation video thumbnail" src="https://user-images.githubusercontent.com/10452457/208882911-12b4d87e-f770-4619-ba6a-12a693eee5b8.png"/></a>
</p>

And here is the corresponding [research paper](https://doi.org/10.1145/3365438.3410967):
```bibtex
@inproceedings{AnimUML,
	title = {{Designing, Animating, and Verifying Partial UML Models}},
	author = {Fr{\'{e}}d{\'{e}}ric Jouault and Valentin Besnard and Th{\'{e}}o {Le Calvar} and Ciprian Teodorov and Matthias Brun and J{\'{e}}r{\^{o}}me Delatour},
	booktitle = {Proceedings of the 23rd ACM / IEEE International Conference on Model Driven Engineering Languages and Systems (MODELS 2020)},
	address   = {Montreal, Canada},
	month = oct,
	year = 2020,
	isbn = {9781450370196},
	publisher = {Association for Computing Machinery},
	address = {New York, NY, USA},
	doi = {10.1145/3365438.3410967},
	pages = {211–217},
	numpages = {7},
	location = {Virtual Event, Canada},
	series = {MODELS '20}
}
```
Only a few sample models are currently built-in AnimUML, but other models can be found in separate locations (see [Finding Models](https://github.com/ESEO-Tech/AnimUML/wiki/Finding-Models) on this project's wiki).


### How to use on your machine

- Clone this repository:
```bash
git clone https://github.com/ESEO-Tech/AnimUML.git
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

A complete list of dependencies is available on the [Dependencies](https://github.com/ESEO-Tech/AnimUML/wiki/Dependencies) wiki page.
However, deploying a server only requires `docker-compose` and its dependencies.
`docker-compose` can, for instance, be installed with apt on Debian-derived distributions.
Docker image dependencies will be downloaded automatically when running `docker-compose` for the first time. An internet connection is therefore required for the first launch.



