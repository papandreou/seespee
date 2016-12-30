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
