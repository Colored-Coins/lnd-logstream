'use strict';

Object.defineProperty(exports, "__esModule", {
       value: true
});
exports.default = logstream;
exports.asEmitter = asEmitter;

var _rx = require('rx');

var _rx2 = _interopRequireDefault(_rx);

var _tail = require('tail');

var _moveDecimalPoint = require('move-decimal-point');

var _moveDecimalPoint2 = _interopRequireDefault(_moveDecimalPoint);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var tail = function tail(path) {
       var t = new _tail.Tail(path);

       return _rx.Observable.fromEvent(t, 'line').takeUntil(_rx.Observable.fromEvent(t, 'close'));
};

var doWith = function doWith(val, fn) {
       return fn(val);
},
    matchRe = function matchRe(re) {
       return function (line) {
              return doWith(line.match(re), function (m) {
                     return m ? [{ str: line, m: m }] : [];
              });
       };
},
    formatToken = function formatToken(amount) {
       return (0, _moveDecimalPoint2.default)(amount, 8);
};

function logstream(path) {
       var line$ = tail(path);

       return _rx.Observable.merge(
       // channelpoint { point }
       line$.flatMap(matchRe(/LNWL: ChannelPoint\(([0-9a-f]+):(\d+)\)/)).map(function (l) {
              return { name: 'channelpoint', txid: l.m[1], index: +l.m[2] };
       })

       // balance { ourBalance, theirBalance }
       , line$.flatMap(matchRe(/state transition accepted: our_balance=(\S+) BTC, their_balance=(\S+) BTC/)).map(function (l) {
              return { name: 'balance', ourBalance: formatToken(l.m[1]), theirBalance: formatToken(l.m[2]), str: l.str };
       })

       // blockheight { height }
       , line$.flatMap(matchRe(/revoked height (\d+), now at (\d+)/)).flatMap(function (l) {
              return [{ name: 'block', height: l.m[2] }, { name: 'revoked', height: l.m[1] }];
       })

       // readmsg { source, msg }
       , line$.flatMap(matchRe(/PEER: readMessage from (\S+): (.*)/)).map(function (l) {
              return { name: 'readmsg', peer: l.m[1], msg: l.m[2] };
       })

       // writemsg { dest, msg }
       , line$.flatMap(matchRe(/PEER: writeMessage to (\S+) (.*)/)).map(function (l) {
              return { name: 'writemsg', peer: l.m[1], msg: l.m[2] };
       })

       // inconn { source }
       , line$.flatMap(matchRe(/New inbound connection from (\s+)/)).map(function (l) {
              return { name: 'inconn', peer: l.m[1] };
       })

       // outconn { dest }
       , line$.flatMap(matchRe(/Connected to peer (\S+)/)).map(function (l) {
              return { name: 'outconn', dest: l.m[1] };
       })

       // bench
       , line$.flatMap(matchRe(/HSWC: Sent (\d+) satoshis, received (\d+) satoshi in the last (\d+ \S+) \(([\d.]+) tx\/sec\)/)).map(function (l) {
              return { name: 'benchmark', sent: l.m[1], recv: l.m[2], timeframe: l.m[3], tps: l.m[4] };
       }));
}

function asEmitter(path) {
       var emitter = new EventEmitter();
       logstream(path).subscribe(function (ev) {
              return emitter.emit(ev.name, ev);
       });
       return emitter;
}

