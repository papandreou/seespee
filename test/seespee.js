var expect = require('unexpected')
    .use(require('unexpected-mitm'))
    .use(require('unexpected-sinon'));

var seespee = require('../lib/seespee');

var AssetGraph = require('assetgraph');
var sinon = require('sinon');

describe('seespee', function () {
    var config;
    var fakeConsole;
    beforeEach(function () {
        config = {};
        config.console = fakeConsole = {
            log: sinon.spy().named('fakeConsole.log'),
            warn: sinon.spy().named('fakeConsole.warn')
        };
    });

    it('should populate from an external host', function () {
        return expect(function () {
            return new AssetGraph()
                .loadAssets('http://www.example.com/index.html')
                .queue(seespee(config));
        }, 'with http mocked out', [
            {
                request: 'GET http://www.example.com/index.html',
                response: {
                    headers: {
                        'Content-Type': 'text/html; charset=utf-8'
                    },
                    body:
                        '<!DOCTYPE html>' +
                        '<html>' +
                        '<head><link rel="stylesheet" href="styles.css"></head>' +
                        '<body><script>alert("foo");</script></body>' +
                        '</html>'
                }
            },
            {
                request: 'GET http://www.example.com/styles.css',
                response: {
                    headers: {
                        'Content-Type': 'text/css'
                    },
                    body: 'body {color: maroon;}'
                }
            }
        ], 'not to error').then(function () {
            expect([fakeConsole.log, fakeConsole.warn], 'to have calls satisfying', function () {
                fakeConsole.log("Content-Security-Policy: default-src 'none'; style-src http://www.example.com; script-src 'sha256-bAUA9vTw1GbyqKZp5dovTxTQ+VBAw7L9L6c2ULDtcqI='");
            });
        });
    });

    it('should follow http redirects to the same origin', function () {
        return expect(function () {
            return new AssetGraph()
                .loadAssets('http://www.example.com/')
                .queue(seespee(config));
        }, 'with http mocked out', [
            {
                request: 'GET http://www.example.com/',
                response: {
                    statusCode: 302,
                    headers: {
                        Location: 'http://www.example.com/somewhere/'
                    }
                }
            },
            {
                request: 'GET http://www.example.com/somewhere/',
                response: {
                    headers: {
                        'Content-Type': 'text/html; charset=utf-8'
                    },
                    body: '<!DOCTYPE html><html><head></head><body><script>alert("foo");</script></body></html>'
                }
            }
        ], 'not to error').then(function () {
            expect([fakeConsole.log, fakeConsole.warn], 'to have calls satisfying', function () {
                fakeConsole.warn('Redirected to', 'http://www.example.com/somewhere/');
                fakeConsole.log("Content-Security-Policy: default-src 'none'; script-src 'sha256-bAUA9vTw1GbyqKZp5dovTxTQ+VBAw7L9L6c2ULDtcqI='");
            });
        });
    });

    it('should follow http redirects to other origins', function () {
        return expect(function () {
            return new AssetGraph()
                .loadAssets('http://www.example.com/')
                .queue(seespee(config));
        }, 'with http mocked out', [
            {
                request: 'GET http://www.example.com/',
                response: {
                    statusCode: 302,
                    headers: {
                        Location: 'http://www.somewhereelse.com/'
                    }
                }
            },
            {
                request: 'GET http://www.somewhereelse.com/',
                response: {
                    headers: {
                        'Content-Type': 'text/html; charset=utf-8'
                    },
                    body: '<!DOCTYPE html><html><head></head><body><script>alert("foo");</script></body></html>'
                }
            }
        ], 'not to error').then(function () {
            expect([fakeConsole.log, fakeConsole.warn], 'to have calls satisfying', function () {
                fakeConsole.warn('Redirected to', 'http://www.somewhereelse.com/');
                fakeConsole.log("Content-Security-Policy: default-src 'none'; script-src 'sha256-bAUA9vTw1GbyqKZp5dovTxTQ+VBAw7L9L6c2ULDtcqI='");
            });
        });
    });

    it('should support an existing policy given as a string', function () {
        config.include = "script-src 'self'; object-src 'none'";
        return expect(function () {
            return new AssetGraph()
                .loadAssets('http://www.example.com/index.html')
                .queue(seespee(config));
        }, 'with http mocked out', [
            {
                request: 'GET http://www.example.com/index.html',
                response: {
                    headers: {
                        'Content-Type': 'text/html; charset=utf-8'
                    },
                    body:
                        '<!DOCTYPE html>' +
                        '<html>' +
                        '<head><link rel="stylesheet" href="styles.css"></head>' +
                        '<body><script>alert("foo");</script></body>' +
                        '</html>'
                }
            },
            {
                request: 'GET http://www.example.com/styles.css',
                response: {
                    headers: {
                        'Content-Type': 'text/css'
                    },
                    body: 'body {color: maroon;}'
                }
            }
        ], 'not to error').then(function () {
            expect([fakeConsole.log, fakeConsole.warn], 'to have calls satisfying', function () {
                fakeConsole.log("Content-Security-Policy: script-src 'self' 'sha256-bAUA9vTw1GbyqKZp5dovTxTQ+VBAw7L9L6c2ULDtcqI='; object-src 'none'; style-src http://www.example.com");
            });
        });
    });
});
