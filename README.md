seespee
=======

[![NPM version](https://badge.fury.io/js/seespee.svg)](http://badge.fury.io/js/seespee)
[![Build Status](https://travis-ci.org/papandreou/seespee.svg?branch=master)](https://travis-ci.org/papandreou/seespee)
[![Coverage Status](https://img.shields.io/coveralls/papandreou/seespee.svg)](https://coveralls.io/r/papandreou/seespee?branch=master)
[![Dependency Status](https://david-dm.org/papandreou/seespee.svg)](https://david-dm.org/papandreou/seespee)

Generate a `Content-Security-Policy` header for a website. The website is crawled
for scripts, stylesheets, images, fonts, appcache manifests etc., which will
be listed by their origin. Inline scripts and stylesheets with be hashed so
`'unsafe-inline'` can be avoided.


```
$ seespee https://lodash.com/
$ npm install -g seespee
Content-Security-Policy: default-src 'none'; img-src 'self' data:; manifest-src 'self'; style-src 'self' https://unpkg.com; font-src https://unpkg.com; script-src 'self' 'sha256-85RLtUiAixnqFeQvOtsiq5HBnq4nAgtgmrVVlIrEwyk=' 'sha256-9gJ3aNComH+MFu3rw5sARPpvBPOF0VxLUsw1xjxmVzE=' 'sha256-Df4bY3tGwX4vCpgFJ2b7hL/F9h65FABZRCub2RYYOmU=' 'sha256-euGdatRFmkEGGSWO0jbpFAuN5709ZGDaFjCqNnYocQM=' 'unsafe-inline' https://embed.runkit.com https://unpkg.com
```

It also works with a website located in a directory on a file system:

```
$ seespee --root /path/to/my/project /path/to/my/project/index.html
```

If the website has an existing `Content-Security-Policy` in a
[meta tag](https://www.w3.org/TR/CSP2/#delivery-html-meta-element)
it will be detected and taken into account so all the existing directives
are supported. This behavior can be disabled with the `--ignoreexisting`
parameter.

You can also specify custom directives to include on the command line via
the `--include` switch. The provided directives will be taken into account
when adding new ones so you won't end up with redundant entries that are
already whitelisted by eg. `'self'`:

```
$ seespee --include "default-src 'none'; style-src *" https://news.ycombinator.com/
Content-Security-Policy: default-src 'none'; style-src *; img-src 'self'; script-src 'self'
```

License
=======

Seespee is licensed under a standard 3-clause BSD license -- see the
`LICENSE` file for details.
