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

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

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
                     return m ? [m] : [];
              });
       };
},
    formatToken = function formatToken(amount) {
       return +(0, _moveDecimalPoint2.default)(amount, 8);
};

function logstream(path) {
       var line$ = tail(path);

       return _rx.Observable.merge(
       // outpoint: { txid, index }
       line$.flatMap(matchRe(/LNWL: ChannelPoint\(([0-9a-f]+):(\d+)\)/)).map(function (m) {
              return ['outpoint', { txid: m[1], index: +m[2] }];
       })

       // balance: { ours, theirs }
       , line$.flatMap(matchRe(/state transition accepted: our_balance=(\S+) BTC, their_balance=(\S+) BTC/)).map(function (m) {
              return ['balance', { ours: formatToken(m[1]), theirs: formatToken(m[2]) }];
       })

       // height: height
       // revoked: height
       , line$.flatMap(matchRe(/revoked height (\d+), now at (\d+)/)).flatMap(function (m) {
              return _rx.Observable.of(['revoked', +m[1]], ['height', +m[2]]);
       })

       // readmsg: { peer, msg }
       , line$.flatMap(matchRe(/PEER: readMessage from (\S+): (.*)/)).map(function (m) {
              return ['readmsg', { peer: m[1], msg: m[2] }];
       })

       // writemsg: { peer, msg }
       , line$.flatMap(matchRe(/PEER: writeMessage to (\S+) (.*)/)).map(function (m) {
              return ['writemsg', { peer: m[1], msg: m[2] }];
       })

       // inconn: source
       , line$.flatMap(matchRe(/New inbound connection from (\s+)/)).map(function (m) {
              return ['inconn', m[1]];
       })

       // outconn: dest
       , line$.flatMap(matchRe(/Connected to peer (\S+)/)).map(function (m) {
              return ['outconn', m[1]];
       })

       // bench: { sent, recv, timeframe, tps  }
       , line$.flatMap(matchRe(/HSWC: Sent (\d+) satoshis, received (\d+) satoshi in the last (\d+ \S+) \(([\d.]+) tx\/sec\)/)).map(function (m) {
              return ['benchmark', { sent: m[1], recv: m[2], timeframe: m[3], tps: m[4] }];
       }));
}

function asEmitter(path) {
       var emitter = new EventEmitter();
       logstream(path).subscribe(function (ev) {
              return emitter.emit.apply(emitter, _toConsumableArray(ev));
       });
       return emitter;
}

