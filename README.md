seespee
=======

[![NPM version](https://badge.fury.io/js/seespee.svg)](http://badge.fury.io/js/seespee)
[![Build Status](https://travis-ci.org/papandreou/seespee.svg?branch=master)](https://travis-ci.org/papandreou/seespee)
[![Coverage Status](https://img.shields.io/coveralls/papandreou/seespee.svg)](https://coveralls.io/r/papandreou/seespee?branch=master)
[![Dependency Status](https://david-dm.org/papandreou/seespee.svg)](https://david-dm.org/papandreou/seespee)

Generate a `Content-Security-Policy` header for a website. The website is crawled
for scripts, stylesheets, images, fonts, application manifests etc., which will
be listed by their origin. Inline scripts and stylesheets will be hashed so
`'unsafe-inline'` can be avoided.


```
$ seespee https://lodash.com/
$ npm install -g seespee
Content-Security-Policy: default-src 'none'; img-src 'self' data:; manifest-src 'self'; style-src 'self' https://unpkg.com; font-src https://unpkg.com; script-src 'self' 'sha256-85RLtUiAixnqFeQvOtsiq5HBnq4nAgtgmrVVlIrEwyk=' 'sha256-9gJ3aNComH+MFu3rw5sARPpvBPOF0VxLUsw1xjxmVzE=' 'sha256-Df4bY3tGwX4vCpgFJ2b7hL/F9h65FABZRCub2RYYOmU=' 'sha256-euGdatRFmkEGGSWO0jbpFAuN5709ZGDaFjCqNnYocQM=' 'unsafe-inline' https://embed.runkit.com https://unpkg.com
```

```
$ seespee https://github.com/
Content-Security-Policy: default-src 'none'; style-src https://assets-cdn.github.com; img-src 'self' data: https://assets-cdn.github.com; font-src https://assets-cdn.github.com; script-src https://assets-cdn.github.com
```

It also works with a website located in a directory on a file system.
In that case, a `--root` option is supported, determing how root-relative
urls are to be interpreted (if not given, it will be assumed to be the
directory containing the HTML file):

```
$ seespee --root /path/to/my/project /path/to/my/project/main/index.html
```

If the website has an existing `Content-Security-Policy` in a
[meta tag](https://www.w3.org/TR/CSP2/#delivery-html-meta-element)
it will be detected and taken into account so all the existing directives
are supported. This behavior can be disabled with the `--ignoreexisting`
parameter.

You can also specify custom directives to include on the command line via
the `--include` switch. The provided directives will be taken into account
when adding new ones so you won't end up with redundant entries that are
already whitelisted by eg. `*`:

```
$ seespee --include "default-src 'none'; style-src *" https://news.ycombinator.com/
Content-Security-Policy: default-src 'none'; style-src *; img-src 'self'; script-src 'self'
```

CSP level
=========

You can tell seespee to target a specific CSP level by passing the `--level <number>`
switch.

The default is "somewhere in-between" -- to support as many browsers as possible,
utilizing CSP 2 features that are known to fall back gracefully in browsers that
only support CSP 1.

If you target CSP level 1, inline scripts and stylesheets won't be hashed. If any
are present, the dreaded `'unsafe-inline'` directive will be added instead.
This saves a few bytes in the CSP, but sacrifices security with CSP level 2+ compliant
browsers

If you target CSP level 2, the full path of will be used when the most sensitive
directives (`script-src`, `style-src`, `frame-src`, `object-src`, `manifest-src`,
and `child-src`) refer to external hosts, addressing the weakness pointed out by
https://blog.0daylabs.com/2016/09/09/bypassing-csp/
Unfortunately cannot be the default because it breaks in Safari 8, 9, and 9.1,
which don't support the full
[CSP 1 source expression grammar](https://www.w3.org/TR/2012/CR-CSP-20121115/#source-list).
You can use [express-legacy-csp](https://github.com/Munter/express-legacy-csp)
to mitigate this.



Programmatic usage
==================

```js
var seespee = require('seespee');
seespee('https://github.com/').then(function (result) {
    console.log(result.contentSecurityPolicy);
    // default-src \'none\'; style-src https://assets-cdn.github.com; ...
});
```

You can also pass an options object with the `include` and `ignoreMeta`
properties:

```js
var seespee = require('seespee');
seespee('https://github.com/', {
    include: 'report-uri: /tell-what-happened/',
    ignoreMeta: true
}).then(function (result) {
    // ...
});
```

When processing files on disc, the `root` option is supported as well
(see above):

```js
var seespee = require('seespee');
seespee('/path/to/my/website/main/index.html', {
    root: '/path/to/my/website/',
    include: 'report-uri: /tell-what-happened/',
    ignoreMeta: true
}).then(function (result) {
    // ...
});
```

License
=======

Seespee is licensed under a standard 3-clause BSD license -- see the
`LICENSE` file for details.
