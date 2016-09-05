## lnd-logstream

lnd log parser and streamer.

Continuously tail the [lnd](https://github.com/lightningnetwork/lnd) log files for new events.

### Install

    npm install lnd-logstream

### Use

    import logstream from 'lnd-logstream'

    // returns an RxJS event stream by default
    let log$ = logstream('/home/.lnd/logs/lnd.log')
    log$.subscribe(ev => console.log(ev))

    // can also be used as an EventEmitter
    let emitter = logstream.asEmitter('/home/.lnd/logs/lnd.log')
    emitter.on('balance', d => console.log('ourBalance', d.ourBalance))

### License

https://github.com/Colu-platform/colu-nodejs/blob/master/LICENSE
