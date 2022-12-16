// TODO: add a notion of task priority?
// For instance, for engine resources, fire should have more priority than getFireables.
export const ResourcePool = {
	async create(poolSize, resourceProvider) {
		const resourcePool = [];
		let closed = false;

		// adding resources asynchronously so that we can start working as soon as one is available
		// Kind of works for EMIRemoteEngine
		//	++ some tasks start as soon as one engine is available
		//	-- it seems to only start to go fast once all engines are created
		//		maybe because the WebSocket server does not serve requests (i.e., WebSocket messages) while creating engines?
		new Array(poolSize).fill().forEach(async (e, index) => {
			if(!closed) {
				const resource = await resourceProvider();
//console.log(resource, index)
				if(closed || !resource) {
//console.log(tasks.length + urgentTasks.length)
					resource?.close?.();
				} else {
					resourcePool.push({index, resource});
					runNext();
				}
			}
		});

		let taskCounter = 0;
		const tasks = [];
		const urgentTasks = [];

		let maxTasks = 0;
		let maxUrgentTasks = 0;
		let maxTotalTasks = 0;
		function runNext() {
			if(closed) return;

			if(tasks.length > maxTasks) {
				maxTasks = tasks.length;
			}
			if(urgentTasks.length > maxUrgentTasks) {
				maxUrgentTasks = urgentTasks.length;
			}
			const nbTasks = tasks.length + urgentTasks.length;
			if(nbTasks > maxTotalTasks) {
				maxTotalTasks = nbTasks;
			}
//console.log(resourcePool.length, tasks.length)
			if(resourcePool.length == 0 || nbTasks == 0) {
				return;
			}
			const indexedResource = resourcePool.pop();
			const {index, resource} = indexedResource;

			// popping is more efficient than shifting on arrays + it seems to keep the task list much shorter
			// even though it means we execute more recently submitted tasks before older ones
			const {index: taskNb, task, orig} = urgentTasks.pop() ?? tasks.pop();

			//console.log("STARTING task", taskNb, "on resource", index, orig.toString());
			task(resource).then(() => {
				//console.log("FINISHED task", taskNb, "on resource", index);
				resourcePool.push(indexedResource);
				try {
					runNext();
				} catch(e) {
					// TODO: improve catching so that it is done only once
					console.error(e)
				}
			})
				.catch(console.error)
			;

			runNext();
		}

		return {
			async work(task, urgent) {
				return new Promise((resolve, reject) => {
					const queue = urgent ? urgentTasks : tasks;
					queue.push({index: taskCounter++, async task(resource) {
						try {
							resolve(await task(resource));
						} catch(e) {
							console.log(e)
						}
					}, orig: task, reject, resolve});
					try {
						runNext();
					} catch(e) {
						console.error(e)
					}
				});
			},
			close() {
				closed = true;
				const nbTasks = tasks.length + urgentTasks.length;
				if(nbTasks > 0) {
					console.log("Resource pool still has", tasks.length + urgentTasks.length, "queued tasks (", tasks.length, "non urgent, and", urgentTasks.length, "urgent)");
				}
				tasks.forEach(task => task.resolve());
				urgentTasks.forEach(task => task.resolve());
				console.log("Resource pool had", maxTotalTasks, "queued tasks at maximum (", maxTasks, "non urgent, and", maxUrgentTasks, "urgent)");
			},
		};
	},
};

