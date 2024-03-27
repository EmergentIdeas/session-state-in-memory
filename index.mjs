import EventEmitter from '@webhandle/minimal-browser-event-emitter'

export default class SessionStateInMemory {
	
	/**
	 * 
	 * Constructs a map where each entry is alive for a limited time
	 * @param {object} options 
	 * @param {boolean} [options.emitEvents] Set to false to prevent from emitting events
	 * @param {boolean} [options.emitGetEvents] Set to true to get additional events about when somebody gets an entry
	 * @param {int} [options.ttl] Default time to live in milliseconds of any given entry. Default is 30 minutes.
	 * @param {int} [options.minQueueTime] Minimum time that must elapse before a new request to clean up expired entries will be honored. 1000 default.
	 * @param {int} [options.maxQueueTime] If set, it will cause a request to remove expired entries at least every maxQueueTime milliseconds
	 * @param {EventEmitter} [options.emitter] Set an emmitter for events instead of using the created emitter
	 */
	constructor(options = {}) {
		this.emitEvents = true
		this.emitGetEvents = false
		this.ttl = 30 * 60 * 1000
		this.minQueueTime = 1000
		this.lastProcessTime = 0
		this.entries = {}
		this.emitter = new EventEmitter()
		Object.assign(this, options)
		this.queued = false
		
		
		if(this.maxQueueTime) {
			let self = this
			this.queueIntervalTracker = setInterval(function() {
				self._queueRemove()
			}, this.maxQueueTime)
		}
	}
	
	/**
	 * Sets a value to keep
	 * @param {string} key 
	 * @param {Object} obj 
	 * @param {Object} [options]
	 * @param {int} [options.ttl] How long to keep this entry (in milliseconds)
	 */
	set(key, obj, options = {}) {
		let ttl = options.ttl || this.ttl
		let tracker = {
			obj: obj
			, key: key
			, expires: now() + ttl
		}
		this.entries[key] = tracker
		this._queueRemove()
		if(this.emitter && this.emitEvents) {
			this.emitter.emit('set', tracker)
		}
	}
	
	/**
	 * Get a promise which resovles to the stored object
	 * @param {string} key 
	 * @returns 
	 */
	async get(key) {
		let tracker = this.entries[key]
		this._queueRemove()
		if(tracker) {
			if(now() < tracker.expires) {
				if(this.emitter && this.emitEvents && this.emitGetEvents) {
					this.emitter.emit('get', tracker)
				}
				return tracker.obj
			}
		}
	}
	
	/**
	 * Delete an entry
	 * @param {string} key 
	 */
	delete(key) {
		delete this.entries[key]
		this._queueRemove()
		if(this.emitter && this.emitEvents) {
			this.emitter.emit('delete', key)
		}
	}
	
	/**
	 * Turns off all timers and shuts down all connections
	 */
	stop () {
		if(this.queueIntervalTracker) {
			clearInterval(this.queueIntervalTracker)
		}
	}
	
	
	_shouldQueue() {
		if(this.queued) {
			return false
		}
		if(this.lastProcessTime + this.minQueueTime > now()) {
			return false
		}
		return true
	}

	_queueRemove() {
		if(!this._shouldQueue()) {
			return
		}
		let self = this
		this.queued = true
		if(this.emitter && this.emitEvents) {
			this.emitter.emit('queueRemove')
		}
		setTimeout(function() {
			try {
				self._removeExpired()
			}
			catch(e) {
				console.log(e)
			}
			self.queued = false
		}, 1)
	}
	
	_removeExpired() {
		let nowTime = now()
		this.lastProcessTime = nowTime
		if(this.emitter && this.emitEvents) {
			this.emitter.emit('cleanup', nowTime)
		}
		
		let keys = []
		Object.values(this.entries).forEach(entry => {
			if(entry.expires < nowTime) {
				keys.push(entry.key)
			}
		})
		keys.forEach(key => {
			if(this.emitter && this.emitEvents) {
				let obj = this.entries[key]
				this.emitter.emit('removed', obj)
			}
			delete this.entries[key]
		})
	}
}

function now() {
	return new Date().getTime()
}