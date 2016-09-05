import Rx, { Observable as O } from 'rx'
import { Tail } from 'tail'
import moveDec from 'move-decimal-point'

const tail = path => {
  const t = new Tail(path)

  return O.fromEvent(t, 'line')
    .takeUntil(O.fromEvent(t, 'close'))
}

const doWith = (val, fn) => fn(val)
    , matchRe = re => line => doWith(line.match(re), m => m ? [ { str: line, m } ] : [])
    , formatToken = amount => moveDec(amount, 8)

export default function logstream(path) {
  let line$ = tail(path)

  return O.merge(
    // channelpoint { point }
    line$.flatMap(matchRe(/LNWL: ChannelPoint\(([0-9a-f]+):(\d+)\)/))
         .map(l => ({ name: 'channelpoint', txid: l.m[1], index: +l.m[2] }))

    // balance { ourBalance, theirBalance }
  , line$.flatMap(matchRe(/our_balance=(\S+) BTC, their_balance=(\S+) BTC/))
         .map(l => ({ name: 'balance', ourBalance: formatToken(l.m[1]), theirBalance: formatToken(l.m[2]) }))

  // blockheight { height }
  , line$.flatMap(matchRe(/revoked height (\d+), now at (\d+)/))
         .flatMap(l => ([ { name: 'block' , height: l.m[2] },
                          { name: 'revoked', height: l.m[1] } ]))

    // readmsg { source, msg }
  , line$.flatMap(matchRe(/PEER: readMessage from (\S+): (.*)/))
         .map(l => ({ name: 'readmsg', peer: l.m[1], msg: l.m[2] }))

  // writemsg { dest, msg }
  , line$.flatMap(matchRe(/PEER: writeMessage to (\S+) (.*)/))
         .map(l => ({ name: 'writemsg', peer: l.m[1], msg: l.m[2] }))

  // inconn { source }
  , line$.flatMap(matchRe(/New inbound connection from (\s+)/))
         .map(l => ({ name: 'inconn', peer: l.m[1] }))

  // outconn { dest }
  , line$.flatMap(matchRe(/Connected to peer (\S+)/))
         .map(l => ({ name: 'outconn', dest: l.m[1] }))

  // bench
  , line$.flatMap(matchRe(/HSWC: Sent (\d+) satoshis, received (\d+) satoshi in the last (\d+ \S+) \(([\d.]+) tx\/sec\)/))
         .map(l => ({ name: 'benchmark', sent: l.m[1], recv: l.m[2], timeframe: l.m[3], tps: l.m[4] }))
  )
}

export function asEmitter(path) {
   const emitter = new EventEmitter
  logstream(path).subscribe(ev => emitter.emit(ev.name, ev))
  return emitter
}

