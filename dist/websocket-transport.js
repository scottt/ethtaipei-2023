"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketTransport = void 0;
var event_emitter_1 = require("./event-emitter");
var verboseLogging = true;
var WebSocketParser = /** @class */ (function (_super) {
    __extends(WebSocketParser, _super);
    function WebSocketParser() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    WebSocketParser.prototype.onMessage = function (data) {
        var e_1, _a;
        console.log("WebSocketParser.onMessage(\"" + data + "\")");
        var values = [];
        var chunks = data.replace(/\}[\n\r]?\{/g, '}|--|{') // }{
            .replace(/\}\][\n\r]?\[\{/g, '}]|--|[{') // }][{
            .replace(/\}[\n\r]?\[\{/g, '}|--|[{') // }[{
            .replace(/\}\][\n\r]?\{/g, '}]|--|{') // }]{
            .split('|--|');
        try {
            for (var chunks_1 = __values(chunks), chunks_1_1 = chunks_1.next(); !chunks_1_1.done; chunks_1_1 = chunks_1.next()) {
                var chunk = chunks_1_1.value;
                var input = chunk;
                if (this.accumulatedInput) {
                    input = this.accumulatedInput + chunk;
                }
                var result = void 0;
                try {
                    result = JSON.parse(input);
                }
                catch (err) {
                    this.accumulatedInput = input;
                    continue;
                }
                this.accumulatedInput = null;
                if (result) {
                    values.push(result);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (chunks_1_1 && !chunks_1_1.done && (_a = chunks_1.return)) _a.call(chunks_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        this.emit('parsed', values);
    };
    ;
    return WebSocketParser;
}(event_emitter_1.EventEmitter));
var WebSocketTransport = /** @class */ (function (_super) {
    __extends(WebSocketTransport, _super);
    function WebSocketTransport(webSocketCtor, url, options) {
        var _this = _super.call(this) || this;
        _this.closed = false;
        _this.webSocketCtor = webSocketCtor;
        _this.url = url;
        _this.wsOpenPromise = new Promise(function (resolve, reject) {
            _this.wsOpenResolve = resolve;
            _this.wsOpenReject = reject;
        });
        _this.wsParser = new WebSocketParser();
        _this.wsParser.on('parsed', function (payloads) {
            var e_2, _a, e_3, _b;
            try {
                for (var payloads_1 = __values(payloads), payloads_1_1 = payloads_1.next(); !payloads_1_1.done; payloads_1_1 = payloads_1.next()) {
                    var p = payloads_1_1.value;
                    if (!Array.isArray(p)) {
                        _this.emit('payload', p);
                        continue;
                    }
                    try {
                        for (var p_1 = (e_3 = void 0, __values(p)), p_1_1 = p_1.next(); !p_1_1.done; p_1_1 = p_1.next()) {
                            var i = p_1_1.value;
                            _this.emit('payload', i);
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (p_1_1 && !p_1_1.done && (_b = p_1.return)) _b.call(p_1);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (payloads_1_1 && !payloads_1_1.done && (_a = payloads_1.return)) _a.call(payloads_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
        });
        setTimeout(function () { _this.create(); }, 0);
        return _this;
    }
    WebSocketTransport.prototype.create = function () {
        var _this = this;
        try {
            this.ws = new this.webSocketCtor(this.url, []);
        }
        catch (err) {
            this.emit('error', err);
        }
        this.ws.addEventListener('error', function (err) {
            if (_this.wsOpenReject) {
                _this.wsOpenReject(err);
                _this.wsOpenReject = null;
            }
            _this.emit('error', err);
        });
        this.ws.addEventListener('open', function () {
            if (verboseLogging) {
                console.log('WebSocket.openEventHandler: called');
            }
            _this.wsOpenReject = null;
            _this.wsOpenResolve();
            _this.emit('connect');
        });
        this.ws.addEventListener('message', function (message) {
            _this.onMessage(message);
        });
        this.ws.addEventListener('close', function () {
            _this.onClose();
        });
    };
    WebSocketTransport.prototype.onMessage = function (message) {
        var data = '';
        if (typeof (message.data) === 'string') {
            data = message.data;
        }
        this.wsParser.onMessage(data);
    };
    WebSocketTransport.prototype.onClose = function () {
        if (verboseLogging) {
            console.log('WebSocketTransport.onClose: called');
        }
        if (this.wsOpenReject) {
            this.wsOpenReject(new Error('WebSocket closed before open event'));
            this.wsOpenReject = null;
        }
        this.ws = null;
        this.closed = true;
        this.emit('close');
        this.removeAllListeners();
    };
    WebSocketTransport.prototype.close = function () {
        this.ws.close();
    };
    WebSocketTransport.prototype.send = function (payload) {
        var _this = this;
        this.wsOpenPromise.then(function () {
            _this.ws.send(JSON.stringify(payload));
        });
    };
    return WebSocketTransport;
}(event_emitter_1.EventEmitter));
exports.WebSocketTransport = WebSocketTransport;
//# sourceMappingURL=websocket-transport.js.map