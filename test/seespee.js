var expect = require('unexpected')
    .use(require('unexpected-mitm'));

var seespee = require('../lib/seespee');

describe('seespee', function () {
    it('should complain if no HTML asset is found or redirected to', function () {
        return expect(function () {
            return seespee('http://www.example.com/');
        }, 'with http mocked out', [
            {
                request: 'GET http://www.example.com/',
                response: {
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8'
                    },
                    body: 'foobar'
                }
            }
        ], 'to be rejected with', new Error('checkAssets transform: No HTML assets found (http://www.example.com/)'));
    });

    it('should populate from an external host', function () {
        return expect(function () {
            return seespee('http://www.example.com/index.html');
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
        ], 'not to error').then(function (result) {
            expect(
                result.contentSecurityPolicy,
                'to equal',
                "default-src 'none'; style-src 'self'; script-src 'sha256-bAUA9vTw1GbyqKZp5dovTxTQ+VBAw7L9L6c2ULDtcqI=' 'unsafe-inline'"
            );
        });
    });

    it('should follow http redirects to the same origin', function () {
        return expect(function () {
            return seespee('http://www.example.com/');
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
        ], 'not to error').then(function (result) {
            expect(result, 'to satisfy', {
                url: 'http://www.example.com/somewhere/',
                contentSecurityPolicy: "default-src 'none'; script-src 'sha256-bAUA9vTw1GbyqKZp5dovTxTQ+VBAw7L9L6c2ULDtcqI=' 'unsafe-inline'"
            });
        });
    });

    it('should follow http redirects to other origins', function () {
        return expect(function () {
            return seespee('http://www.example.com/');
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
        ], 'not to error').then(function (result) {
            expect(result, 'to satisfy', {
                url: 'http://www.somewhereelse.com/',
                contentSecurityPolicy: "default-src 'none'; script-src 'sha256-bAUA9vTw1GbyqKZp5dovTxTQ+VBAw7L9L6c2ULDtcqI=' 'unsafe-inline'"
            });
        });
    });

    it('should support an existing policy given as a string', function () {
        return expect(function () {
            return seespee('http://www.example.com/index.html', {
                include: "script-src foobar.com; object-src 'none'"
            });
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
        ], 'not to error').then(function (result) {
            expect(result, 'to satisfy', {
                contentSecurityPolicy: "script-src 'sha256-bAUA9vTw1GbyqKZp5dovTxTQ+VBAw7L9L6c2ULDtcqI=' 'unsafe-inline' foobar.com; object-src 'none'; style-src 'self'"
            });
        });
    });
});
