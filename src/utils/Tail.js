export class Tail {
	constructor(n) {
		this.n = n;
		this.buffer = [];
		this.start = 0;
		this.end = 0;
		this.size = 0;
	}

	get contents() {
		//if(this.start > this.end) {
		if(this.size === this.n && this.end !== this.n) {
			return [...this.buffer.slice(this.start), ...this.buffer.slice(0, this.end)];
		} else {
			return this.buffer.slice(this.start, this.end);
		}
	}

	push(v) {
		if(this.end === this.n) {
			this.end = 0;
		}
		this.buffer[this.end] = v;
		this.end++;
		if(this.size === this.n) {
			this.start++;
			if(this.start === this.n) {
				this.start = 0;
			}
		} else {
			this.size++;
		}
	}

	debug() {
		return {
			n: this.n,
			buffer: this.buffer,
			start: this.start,
			end: this.end,
			size: this.size,
			contents: this.contents,
		};
	}
}
