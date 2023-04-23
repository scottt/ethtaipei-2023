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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpTransport = void 0;
var event_emitter_1 = require("./event-emitter");
var verboseLogging = true;
var HttpTransport = /** @class */ (function (_super) {
    __extends(HttpTransport, _super);
    function HttpTransport(fetchFunc, abortControllerCtor, url, options) {
        var _this = _super.call(this) || this;
        _this.fetch = fetchFunc;
        _this.abortControllerCtor = abortControllerCtor;
        _this.closed = false;
        _this.connected = false;
        _this.status = 'loading';
        _this.url = url;
        _this.options = options;
        setTimeout(function () { return _this.create(); }, 0);
        return _this;
    }
    HttpTransport.prototype.init = function () {
        var _this = this;
        this._send({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }, function (err, _) {
            if (err) {
                return _this.emit('error', err);
            }
            _this.connected = true;
            _this.emit('connect');
        });
    };
    HttpTransport.prototype.create = function () {
        var _this = this;
        this.on('error', function () { if (_this.connected) {
            _this.close();
        } });
        this.init();
    };
    HttpTransport.prototype.close = function () {
        if (verboseLogging) {
            console.log('HttpTransport: closing');
        }
        this.closed = true;
        this.emit('close');
        this.removeAllListeners();
    };
    HttpTransport.prototype.error = function (payload, message, code) {
        if (code === void 0) { code = -1; }
        this.emit('payload', { id: payload.id, jsonrpc: payload.jsonrpc, error: { message: message, code: code } });
    };
    HttpTransport.prototype._send = function (payload, internalCallback) {
        var _this = this;
        if (this.closed) {
            return this.error(payload, 'Not connected');
        }
        if (payload.method === 'eth_subscribe') {
            return this.error(payload, 'Subscriptions are not supported by this Http endpoint');
        }
        var fetchAbort = new this.abortControllerCtor();
        var sendCallProcessed = false;
        var sendCallback = function (err, result) {
            if (sendCallProcessed) {
                return;
            }
            sendCallProcessed = true;
            fetchAbort.abort();
            if (internalCallback) {
                internalCallback(err, result);
                return;
            }
            var outPayload = { id: payload.id, jsonrpc: payload.jsonrpc, error: undefined, result: undefined };
            if (err) {
                outPayload.error = { message: err.message, code: err.code };
            }
            else {
                outPayload.result = result;
            }
            _this.emit('payload', outPayload);
        };
        var requestBody;
        try {
            requestBody = JSON.stringify(payload);
        }
        catch (err) {
            sendCallback(err, undefined);
        }
        var fetch = this.fetch;
        var fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: fetchAbort.signal,
            body: requestBody,
        };
        if (this.options['httpAcceptCookies']) {
            fetchOptions['credentials'] = 'include';
        }
        fetch(this.url, fetchOptions).then(function (response) {
            response.json().then(function (responseJson) {
                sendCallback(responseJson.error, responseJson.result);
            }).catch(function (err) {
                sendCallback(err, undefined);
            });
        }).catch(function (err) {
            sendCallback(err, undefined);
        });
    };
    HttpTransport.prototype.send = function (payload) {
        this._send(payload, undefined);
    };
    return HttpTransport;
}(event_emitter_1.EventEmitter));
exports.HttpTransport = HttpTransport;
//# sourceMappingURL=http-transport.js.map