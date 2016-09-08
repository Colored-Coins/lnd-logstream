## lnd-logstream

lnd log parser and streamer.

Continuously tail the [lnd](https://github.com/lightningnetwork/lnd) log files for new events.

### Install

    $ npm install lnd-logstream

### Use

```js
import logstream from 'lnd-logstream'

// by default, returns an RxJS event stream of [name, data] tuples
let ourBalance$ = logstream('/home/.lnd/logs/simnet/lnd.log')
    .filter(([ name, data ]) => name == 'balance')
    .map(([ name, data ]) => data.ours)

ourBalance$.subscribe(b => console.log('ourBalance', b))

// can also be used as an EventEmitter
let emitter = logstream.asEmitter('/home/.lnd/logs/simnet/lnd.log')
emitter.on('balance', data => console.log('ourBalance', d.ours))
```

### License

https://github.com/Colu-platform/colu-nodejs/blob/master/LICENSE
