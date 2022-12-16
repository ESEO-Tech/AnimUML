import {Tail} from "./Tail.js";

const n = 5;
const tail = new Tail(n);

const ref = [];

function testPush(v) {
	tail.push(v);
	ref.push(v);
	//console.log(tail.size, tail.contents);
	console.log(tail.debug());
	if(JSON.stringify(tail.contents) !== JSON.stringify(ref.slice(-n))) {
		tt
	}
}

for(let i = 0 ; i < 50 ; i++) {
	testPush(i);
}
