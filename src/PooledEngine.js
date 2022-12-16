import {ResourcePool} from './ResourcePool.js';

// TODO: separate StatefulEngine to StatelessEngine in a different module?
export const PooledEngine = {
	async create(poolSize, engineProvider) {
		const enginePool = await ResourcePool.create(poolSize, engineProvider);
		let closed = false;

		// a pooled engine that has a different API (closer to our formalization) to support using an engine from the pool
		return {
			// STR interface
				// initial
			async reset() {
				return await enginePool.work(async engine => {
					await engine.reset();
					if(closed) return;
					return await engine.getConfiguration();
				}, true);
			},
				// actions
			async getFireables(configuration) {
				return await enginePool.work(async engine => {
					await engine.setConfiguration(configuration);
					if(closed) return;
					return await engine.getFireables();
				}, true);
			},
				// execute
			async fire(configuration, transition) {
				return await enginePool.work(async engine => {
					await engine.setConfiguration(configuration);
					if(closed) return;
					await engine.fire(transition);
					if(closed) return;
					return await engine.getConfiguration();
				}, false);
			},
			// P interface
			async parseTransition(transition) {
				return await enginePool.work(async engine =>
					await engine.parseTransition(transition)
				, true);
			},
			async parseConfiguration(configuration) {
				return await enginePool.work(async engine =>
					await engine.parseConfiguration(configuration)
				, true);
			},
			close() {
				closed = true;
				enginePool.close();
			},
			get closed() {
				return closed;
			},
		};
	},
};

