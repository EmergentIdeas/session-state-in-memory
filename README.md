# Webhandle / Session State in Memory

Basic map which takes a key, a value, and an optional time to live (ttl). The map holds the key and value until the entry expires.

It works just fine as session storage as it is, but it gets cleared on process reload and is only in one process. For stateless
operations where there are multiple nodes, that would be a problem.

However, for a lot of the single process stuff I do, this works and is a nice placeholder which will let me change it out later
if I need one that depends on Redis, or something.


## Install

```bash
npm install @webhandle/session-state-in-memory
```

## Usage 

```js
import SessionStateInMemory from '@webhandle/session-state-in-memory'
let state = new SessionStateInMemory()

state.set('a', 'b')
state.get('a').then(val => {
	console.log(val) // should print 'b'
})

state.set('c', {msg: 'hello'})

state.set('d', {msg: 'hello'}, {ttl: 30000})
state.delete('d')

```


## Options
```js
/**
 * @param {object} options 
 * @param {boolean} [options.emitEvents] Set to false to prevent from emitting events
 * @param {boolean} [options.emitGetEvents] Set to true to get additional events about when somebody gets an entry
 * @param {int} [options.ttl] Default time to live in milliseconds of any given entry. Default is 30 minutes.
 * @param {int} [options.minQueueTime] Minimum time that must elapse before a new request to clean up expired entries will be honored. 1000 default.
 * @param {int} [options.maxQueueTime] If set, it will cause a request to remove expired entries at least every maxQueueTime milliseconds
 * @param {EventEmitter} [options.emitter] Set an emmitter for events instead of using the created emitter
 * /
```



## Notes

Cleanup is scheduled whenever an call takes place(set, delete, or get). However, there's a configurable minQueueTime that
will prevent cleanup from being queued more than once every however millis (1000 millis by default). This should prevent high use
from churning as entries are purged over and over again.

Optionally, and not set by default, there's a maxQueue time which starts an interval to periodically try to enqueue a cleanup.
This is probably not necessary for most usage.

## Events 

```js
set - ({key, obj, expires})
get - ({key, obj, expires})
delete - (key)
queueRemove - ()
cleanup - ()
removed - ({key, obj, expires})
```