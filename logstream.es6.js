import Rx, { Observable as O } from 'rx'
import { Tail } from 'tail'
import moveDec from 'move-decimal-point'

const tail = path => {
  const t = new Tail(path)

  return O.fromEvent(t, 'line')
    .takeUntil(O.fromEvent(t, 'close'))
}

const doWith = (val, fn) => fn(val)
    , matchRe = re => line => doWith(line.match(re), m => m ? [ m ] : [])
    , formatToken = amount => +moveDec(amount, 8)

export default function logstream(path) {
  let line$ = tail(path)

  return O.merge(
    // outpoint: { txid, index }
    line$.flatMap(matchRe(/LNWL: ChannelPoint\(([0-9a-f]+):(\d+)\)/))
         .map(m => ['outpoint', { txid: m[1], index: +m[2] }])

    // balance: { ours, theirs }
  , line$.flatMap(matchRe(/state transition accepted: our_balance=(\S+) BTC, their_balance=(\S+) BTC/))
         .map(m => [ 'balance', { ours: formatToken(m[1]), theirs: formatToken(m[2]) }])

  // height: height
  // revoked: height
  , line$.flatMap(matchRe(/revoked height (\d+), now at (\d+)/))
         .flatMap(m => O.of([ 'revoked', +m[1] ], [ 'height', +m[2] ]))

    // readmsg: { peer, msg }
  , line$.flatMap(matchRe(/PEER: readMessage from (\S+): (.*)/))
         .map(m => [ 'readmsg', { peer: m[1], msg: m[2] }])

  // writemsg: { peer, msg }
  , line$.flatMap(matchRe(/PEER: writeMessage to (\S+) (.*)/))
         .map(m => [ 'writemsg', { peer: m[1], msg: m[2] }])

  // inconn: source
  , line$.flatMap(matchRe(/New inbound connection from (\s+)/))
         .map(m => [ 'inconn', m[1] ])

  // outconn: dest
  , line$.flatMap(matchRe(/Connected to peer (\S+)/))
         .map(m => [ 'outconn', m[1] ])

  // bench: { sent, recv, timeframe, tps  }
  , line$.flatMap(matchRe(/HSWC: Sent (\d+) satoshis, received (\d+) satoshi in the last (\d+ \S+) \(([\d.]+) tx\/sec\)/))
         .map(m => [ 'benchmark', { sent: m[1], recv: m[2], timeframe: m[3], tps: m[4] }])
  )
}

export function asEmitter(path) {
  const emitter = new EventEmitter
  logstream(path).subscribe(ev => emitter.emit(...ev))
  return emitter
}
