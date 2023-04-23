"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LightWalletProvider = void 0;
var http_transport_1 = require("./http-transport");
var websocket_transport_1 = require("./websocket-transport");
var verboseLogging = false;
var LightWalletProvider = /** @class */ (function () {
    // Provide constructor API similar to HDWalletProvider when using private keys
    // https://github.com/trufflesuite/truffle/tree/develop/packages/hdwallet-provider
    function LightWalletProvider(fetch, abortControllerCtor, webSocketCtor, web3AccountsInstance, options, privateKeys, rpcUrl, addressIndex, numAddresses) {
        var _this = this;
        this.connected = false;
        this.chainIdPromise = new Promise(function (resolve, reject) {
            _this.chainIdPromiseResolve = resolve;
            _this.chainIdPromiseReject = reject;
        });
        this.nextId = 0;
        this.requestToExecutor = {};
        if (rpcUrl.startsWith('http')) {
            this.transport = new http_transport_1.HttpTransport(fetch, abortControllerCtor, rpcUrl, options);
        }
        else {
            this.transport = new websocket_transport_1.WebSocketTransport(webSocketCtor, rpcUrl, options);
        }
        this.transport.on('connect', function () { return _this.fetchChainId(); });
        this.transport.on('payload', function (payload) {
            var id = payload.id, method = payload.method, error = payload.error, result = payload.result;
            if (typeof id !== 'undefined') {
                if (_this.requestToExecutor[id]) {
                    if (payload.error) {
                        _this.requestToExecutor[id].reject(error);
                    }
                    else {
                        _this.requestToExecutor[id].resolve(result);
                    }
                    delete _this.requestToExecutor[id];
                }
            }
        });
        var enabledKeys = privateKeys.slice(addressIndex, addressIndex + numAddresses);
        //console.log('LightWalletProvider.ctor: fetch:', fetch, ', abortControllerCtor:', abortControllerCtor, ', web3AccountsInstance:',
        //web3AccountsInstance, ', options:', options, privateKeys, rpcUrl, addressIndex, numAddresses)
        this.accounts = enabledKeys.map(function (sk) { return web3AccountsInstance.privateKeyToAccount(sk); });
        this.account = this.accounts[0];
    }
    LightWalletProvider.prototype.fetchChainId = function () {
        return __awaiter(this, void 0, void 0, function () {
            var chainId, _a, _1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        _a = parseInt;
                        return [4 /*yield*/, this._send('net_version')];
                    case 1:
                        chainId = _a.apply(void 0, [(_b.sent())]);
                        this.chainIdPromiseResolve(chainId);
                        this.connected = true;
                        return [3 /*break*/, 3];
                    case 2:
                        _1 = _b.sent();
                        this.chainIdPromiseReject(chainId);
                        this.connected = false;
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    LightWalletProvider.prototype.isConnected = function () {
        return this.connected;
    };
    LightWalletProvider.prototype.close = function () {
        this.transport.close();
        this.connected = false;
    };
    LightWalletProvider.prototype.enable = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.accounts.map(function (account) { return account.address; })];
            });
        });
    };
    LightWalletProvider.prototype._eth_accounts = function () {
        return this.enable();
    };
    LightWalletProvider.prototype.sendToTransport = function (method, params) {
        var _this = this;
        if (verboseLogging) {
            console.log("LightWalletProvider.sendToTransport: method: \"" + method + "\", params: \"" + JSON.stringify(params) + "\"");
        }
        return new Promise(function (resolve, reject) {
            var payload = { jsonrpc: '2.0', id: _this.nextId++, method: method, params: params };
            _this.requestToExecutor[payload.id] = { resolve: resolve, reject: reject };
            if (!method || typeof method !== 'string') {
                _this.requestToExecutor[payload.id].reject(new Error('Method is not a valid string.'));
                delete _this.requestToExecutor[payload.id];
            }
            else if (!(params instanceof Array)) {
                _this.requestToExecutor[payload.id].reject(new Error('Params is not a valid array.'));
                delete _this.requestToExecutor[payload.id];
            }
            else {
                _this.transport.send(payload);
            }
        });
    };
    LightWalletProvider.prototype._eth_sendTransaction = function (tx) {
        var _this = this;
        return this.chainIdPromise.then(function (chainId) { return __awaiter(_this, void 0, void 0, function () {
            var _a, _b;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        tx['chainId'] = chainId;
                        if (!!tx['nonce']) return [3 /*break*/, 2];
                        _a = tx;
                        _b = 'nonce';
                        return [4 /*yield*/, this.sendToTransport('eth_getTransactionCount', [this.account.address, 'pending'])];
                    case 1:
                        _a[_b] = _c.sent();
                        _c.label = 2;
                    case 2:
                        try {
                            return [2 /*return*/, this.account.signTransaction(tx).then(function (signedTx) {
                                    console.log('signedTx:', signedTx);
                                    var method = 'eth_sendRawTransaction';
                                    var params = [signedTx.rawTransaction];
                                    return (_this.sendToTransport(method, params));
                                })];
                        }
                        catch (err) {
                            return [2 /*return*/, new Promise(function (_, reject) {
                                    reject(err);
                                })];
                        }
                        return [2 /*return*/];
                }
            });
        }); });
    };
    LightWalletProvider.prototype._send = function (method, params) {
        if (params === void 0) { params = []; }
        if (verboseLogging) {
            console.log("LightWalletProvider._send: method: \"" + method + "\", params: \"" + JSON.stringify(params) + "\"");
        }
        if (method === 'eth_sendTransaction') {
            var tx = params[0];
            return this._eth_sendTransaction(tx);
        }
        else if (method == 'eth_accounts') {
            return this._eth_accounts();
        }
        else {
            return this.sendToTransport(method, params);
        }
    };
    LightWalletProvider.prototype.send = function (method, params) {
        if (params === void 0) { params = []; }
        return this._send(method, params);
    };
    LightWalletProvider.prototype._sendBatch = function (requests) {
        var _this = this;
        return Promise.all(requests.map(function (payload) { return _this._send(payload.method, payload.params); }));
    };
    LightWalletProvider.prototype.sendAsyncBatch = function (payloads, callback) {
        return this._sendBatch(payloads).then(function (results) {
            var result = results.map(function (entry, index) {
                return { id: payloads[index].id, jsonrpc: payloads[index].jsonrpc, result: entry };
            });
            callback(null, result);
        }).catch(function (err) {
            callback(err);
        });
    };
    LightWalletProvider.prototype.sendAsync = function (payload, callback) {
        if (verboseLogging) {
            console.log('LightWalletProvider.sendAsync: called');
        }
        if (!callback || typeof callback !== 'function') {
            throw new Error("LightWalletProvider.sendAsync: 2nd argument must be a callback function, not \"" + callback + "\"");
        }
        if (!payload) {
            return callback("LightWalletProvider.sendAsync: invalid payload \"" + payload + "\"");
        }
        if (payload instanceof Array) {
            return this.sendAsyncBatch(payload, callback);
        }
        else {
            return this._send(payload.method, payload.params).then(function (result) {
                callback(null, { id: payload.id, jsonrpc: payload.jsonrpc, result: result });
            }).catch(function (err) {
                callback(err);
            });
        }
    };
    LightWalletProvider.prototype.request = function (payload) {
        return this._send(payload.method, payload.params);
    };
    return LightWalletProvider;
}());
exports.LightWalletProvider = LightWalletProvider;
//# sourceMappingURL=lightwallet-provider.js.map