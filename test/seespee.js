var expect = require('unexpected').clone();

var seespee = require('../lib/seespee');
var httpception = require('httpception');

describe('seespee', function () {
    beforeEach(function () {
        httpception();
    });

    it('should complain if no HTML asset is found or redirected to', function () {
        httpception({
            request: 'GET http://www.example.com/',
            response: {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8'
                },
                body: 'foobar'
            }
        });

        return expect(
            () => seespee('http://www.example.com/'),
            'to be rejected with',
            new Error('No HTML assets found (http://www.example.com/)')
        );
    });

    it('should populate from an external host', function () {
        httpception([
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
        ]);

        return seespee('http://www.example.com/index.html').then(function (result) {
            expect(
                result.contentSecurityPolicy,
                'to equal',
                "default-src 'none'; style-src 'self'; script-src 'sha256-bAUA9vTw1GbyqKZp5dovTxTQ+VBAw7L9L6c2ULDtcqI=' 'unsafe-inline'"
            );
        });
    });

    it('should follow http redirects to the same origin', function () {
        httpception([
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
        ]);

        return seespee('http://www.example.com/')
        .then(result => expect(result, 'to satisfy', {
            url: 'http://www.example.com/somewhere/',
            contentSecurityPolicy: "default-src 'none'; script-src 'sha256-bAUA9vTw1GbyqKZp5dovTxTQ+VBAw7L9L6c2ULDtcqI=' 'unsafe-inline'"
        }));
    });

    it('should follow http redirects to other origins', function () {
        httpception([
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
        ]);

        return seespee('http://www.example.com/').then(function (result) {
            expect(result, 'to satisfy', {
                url: 'http://www.somewhereelse.com/',
                contentSecurityPolicy: "default-src 'none'; script-src 'sha256-bAUA9vTw1GbyqKZp5dovTxTQ+VBAw7L9L6c2ULDtcqI=' 'unsafe-inline'"
            });
        });
    });

    it('should support an existing policy given as a string', function () {
        httpception([
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
        ]);

        return seespee('http://www.example.com/index.html', {
            include: "script-src foobar.com; object-src 'none'"
        }).then(function (result) {
            expect(result, 'to satisfy', {
                contentSecurityPolicy: "script-src 'sha256-bAUA9vTw1GbyqKZp5dovTxTQ+VBAw7L9L6c2ULDtcqI=' 'unsafe-inline' foobar.com; object-src 'none'; style-src 'self'"
            });
        });
    });

    it('should support an existing policy given as a Content-Security-Policy response header', function () {
        httpception([
            {
                request: 'GET http://www.example.com/index.html',
                response: {
                    headers: {
                        'Content-Type': 'text/html; charset=utf-8',
                        'Content-Security-Policy': "script-src foobar.com; object-src 'none'"
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
        ]);

        return seespee('http://www.example.com/index.html').then(function (result) {
            expect(result, 'to satisfy', {
                contentSecurityPolicy: "script-src 'sha256-bAUA9vTw1GbyqKZp5dovTxTQ+VBAw7L9L6c2ULDtcqI=' 'unsafe-inline' foobar.com; object-src 'none'; style-src 'self'"
            });
        });
    });

    it('should support an existing policy given as a Content-Security-Policy-Report-Only response header', function () {
        httpception([
            {
                request: 'GET http://www.example.com/index.html',
                response: {
                    headers: {
                        'Content-Type': 'text/html; charset=utf-8',
                        'Content-Security-Policy-Report-Only': "script-src foobar.com; object-src 'none'"
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
        ]);

        return seespee('http://www.example.com/index.html').then(function (result) {
            expect(result, 'to satisfy', {
                contentSecurityPolicy: undefined,
                contentSecurityPolicyReportOnly: "script-src 'sha256-bAUA9vTw1GbyqKZp5dovTxTQ+VBAw7L9L6c2ULDtcqI=' 'unsafe-inline' foobar.com; object-src 'none'; style-src 'self'"
            });
        });
    });

    describe('when targetting CSP level 1', function () {
        it('should add \'unsafe-inline\' when there are inline scripts and stylesheets, rather than hashes, which are level 2', function () {
            httpception([
                {
                    request: 'GET http://www.example.com/index.html',
                    response: {
                        headers: {
                            'Content-Type': 'text/html; charset=utf-8'
                        },
                        body:
                            '<!DOCTYPE html>' +
                            '<html>' +
                            '<head><style>body{color:maroon}</style></head>' +
                            '<body><script>alert("foo");</script></body>' +
                            '</html>'
                    }
                }
            ]);

            return seespee('http://www.example.com/index.html', { level: 1 }).then(function (result) {
                expect(result, 'to satisfy', {
                    contentSecurityPolicy: "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'"
                });
            });
        });
    });

    describe('when targetting CSP level 2', function () {
        it('should hash inline stylesheets and scripts', function () {
            httpception([
                {
                    request: 'GET http://www.example.com/index.html',
                    response: {
                        headers: {
                            'Content-Type': 'text/html; charset=utf-8'
                        },
                        body:
                            '<!DOCTYPE html>' +
                            '<html>' +
                            '<head><style>body{color:maroon}</style></head>' +
                            '<body><script>alert("foo");</script></body>' +
                            '</html>'
                    }
                }
            ]);

            return seespee('http://www.example.com/index.html', { level: 2 }).then(function (result) {
                expect(result, 'to satisfy', {
                    contentSecurityPolicy: "default-src 'none'; style-src 'sha256-PxmT6t1HcvKET+AaUXzreq0LE2ftJs0cvaXtDT1sBCo=' 'unsafe-inline'; script-src 'sha256-bAUA9vTw1GbyqKZp5dovTxTQ+VBAw7L9L6c2ULDtcqI=' 'unsafe-inline'"
                });
            });
        });

        it('should include the full path to external JavaScript and CSS assets, but not images', function () {
            httpception([
                {
                    request: 'GET http://www.example.com/index.html',
                    response: {
                        headers: {
                            'Content-Type': 'text/html; charset=utf-8'
                        },
                        body:
                            '<!DOCTYPE html>' +
                            '<html>' +
                            '<head><link rel="stylesheet" href="https://cdn.example.com/styles.css"></head>' +
                            '<body><script src="https://cdn.example.com/script.js"></script></body>' +
                            '<img src="https://cdn.example.com/image.png">' +
                            '</html>'
                    }
                },
                {
                    request: 'GET https://cdn.example.com/styles.css',
                    response: {
                        headers: {
                            'Content-Type': 'text/css'
                        },
                        body: 'body {color: maroon;}'
                    }
                },
                {
                    request: 'GET https://cdn.example.com/script.js',
                    response: {
                        headers: {
                            'Content-Type': 'application/javascript'
                        },
                        body: 'alert("foo");'
                    }
                },
                {
                    request: 'GET https://cdn.example.com/image.png',
                    response: {
                        headers: {
                            'Content-Type': 'image/png'
                        },
                        body: new Buffer([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
                    }
                }
            ]);

            return seespee('http://www.example.com/index.html', { level: 2 }).then(function (result) {
                expect(result, 'to satisfy', {
                    contentSecurityPolicy: "default-src 'none'; style-src https://cdn.example.com/styles.css; script-src https://cdn.example.com/script.js; img-src https://cdn.example.com"
                });
            });
        });
    });

    it('should honor the ignoreHeader option', function () {
        httpception([
            {
                request: 'GET http://www.example.com/index.html',
                response: {
                    headers: {
                        'Content-Type': 'text/html; charset=utf-8',
                        'Content-Security-Policy': 'style-src \'unsafe-inline\''
                    },
                    body:
                        '<!DOCTYPE html>' +
                        '<html>' +
                        '<head><style>body{color:maroon}</style></head>' +
                        '<body></body>' +
                        '</html>'
                }
            }
        ]);

        return seespee('http://www.example.com/index.html', { ignoreHeader: true }).then(function (result) {
            expect(result, 'to satisfy', {
                contentSecurityPolicy: "default-src 'none'; style-src 'sha256-PxmT6t1HcvKET+AaUXzreq0LE2ftJs0cvaXtDT1sBCo=' 'unsafe-inline'"
            });
        });
    });
});
