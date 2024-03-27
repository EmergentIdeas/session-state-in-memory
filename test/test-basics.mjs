import mocha from 'mocha'
import {assert} from 'chai'
import SessionStateInMemory from '../index.mjs'

describe("basic tests", function() {
	
	it("add and get", function(done) {
		let state = new SessionStateInMemory()
		
		state.set('a', 'b')
		state.get('a').then(val => {
			assert.equal(val, 'b')
			done()
		})
	})

	it("add and get 2", function(done) {
		let state = new SessionStateInMemory()
		
		state.set('a', {c: 2})
		state.get('a').then(val => {
			assert.equal(val.c, 2)
			done()
		})
	})
	it("add and get 3", function(done) {
		let state = new SessionStateInMemory()
		
		state.set('a', 'b')
		state.delete('a')
		state.get('a').then(val => {
			assert.isFalse(!!val)
			done()
		})
	})

	it("ttl", function(done) {
		let state = new SessionStateInMemory()
		// make sure we can't delete entries
		state._removeExpired = function() {}
		
		state.set('a', 'b', {ttl: 2})
		setTimeout(function() {
			state.get('a').then(val => {
				assert.isOk(val)
			})
		}, 1)
		setTimeout(function() {
			state.get('a').then(val => {
				assert.isNotOk(val)
				done()
			})
		}, 4)
	})
	it("automated delete", function(done) {
		let state = new SessionStateInMemory({ttl: 30})
		
		state.set('a', 'b')
		state.get('a').then(val => {
			assert.equal(val, 'b')
		})
		
		setTimeout(function() {
			try {
				state.get('a').then(val => {
					assert.isTrue(!!val)
				})
			}
			catch(e) {
				done(e)
			}
		}, 20)

		setTimeout(function() {
			try {
				state.get('a').then(val => {
					assert.isFalse(!!val)
				})
				done()
			}
			catch(e) {
				done(e)
			}
		}, 50)
	})

	it("item specific automated delete", function(done) {
		let state = new SessionStateInMemory({ttl: 30})
		
		state.set('a', 'b', {ttl: 10})
		state.get('a').then(val => {
			assert.equal(val, 'b')
		})
		
		setTimeout(function() {
			try {
				state.get('a').then(val => {
					assert.isTrue(!!val)
				})
			}
			catch(e) {
				done(e)
			}
		}, 5)

		setTimeout(function() {
			try {
				state.get('a').then(val => {
					assert.isFalse(!!val)
					done()
				})
			}
			catch(e) {
				done(e)
			}
		}, 15)
	})
	it("remove notification", function(done) {
		let count = 0
		
		// setting the min queue time is important for this test otherwise
		// the last queue won't happen
		let state = new SessionStateInMemory({ttl: 30, minQueueTime: 0})
		state.emitter.on('queueRemove', () => {
			count++
		})
		
		state.set('a', 'b', {ttl: 10})
		
		state._queueRemove()
		state._queueRemove()
		state._queueRemove()
		
		state.emitter.on('removed', (entry) => {
			if(count == 2) {
				done()
			}
			else {
				done('remove queued to many times')
			}
		})
		
		setTimeout(function() {
			state._queueRemove()
		}, 40)
	})
	it("min queue time remove", function(done) {
		let state = new SessionStateInMemory({ttl: 30})
		
		let gotRemoved = false
		state.emitter.on('removed', (entry) => {
			gotRemoved = true
		})
		
		state.set('a', 'b', {ttl: 100})
		state._queueRemove()
		// okay, when that last statement above gets finished, we'll have run the cleanup
		
		setTimeout(function() {
			state._queueRemove()
			assert.equal(state.entries['a'].obj, 'b')
			setTimeout(function() {
				// Now, you'd think our entry should have been cleaned up. However, since our
				// min queue time is 1000 millis, we won't really get the cleanup queued
				
				assert.equal(state.entries['a'].obj, 'b')
				
				// However, we should NOT be able to get a copy of it, since it is expired
				state.get('a').then(val => {
					assert.isFalse(!!val)
				})
				
				setTimeout(function() {
					// queue now that we're beyond the min period
					state._queueRemove()
					
					setTimeout(function() {
						// we shouldn't have the key in the entries any more
						assert.isFalse('a' in state.entries)
						
						// just for kicks, let's make sure our removed listener was work too
						assert.isTrue(gotRemoved)
						done()
					}, 5)
				}, 1000)
			}, 10)
		}, 120)
	})
	it("test max time delete missing", function(done) {
		let state = new SessionStateInMemory({ttl: 30})
		
		state.set('a', 'b', {ttl: 10})
		
		setTimeout(function() {
			try {
				state.get('a').then(val => {
					assert.isTrue(!!val)
				})
			}
			catch(e) {
				done(e)
			}
		}, 5)

		setTimeout(function() {
			try {
				assert.isTrue(!!state.entries['a'].obj)
				done()
			}
			catch(e) {
				done(e)
			}
		}, 150)
	})
	it("test max time delete", function(done) {
		let state = new SessionStateInMemory({ttl: 30, maxQueueTime: 10, minQueueTime: 3})
		
		state.set('a', 'b', {ttl: 10})
		
		setTimeout(function() {
			try {
				state.get('a').then(val => {
					assert.isTrue(!!val)
				})
			}
			catch(e) {
				done(e)
			}
		}, 5)

		setTimeout(function() {
			state.stop()
			try {
				assert.isFalse('a' in state.entries)
				done()
			}
			catch(e) {
				done(e)
			}
		}, 150)
	})
})