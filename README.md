# seespee

[![NPM version](https://badge.fury.io/js/seespee.svg)](http://badge.fury.io/js/seespee)
[![Build Status](https://travis-ci.org/papandreou/seespee.svg?branch=master)](https://travis-ci.org/papandreou/seespee)
[![Coverage Status](https://img.shields.io/coveralls/papandreou/seespee.svg)](https://coveralls.io/r/papandreou/seespee?branch=master)
[![Dependency Status](https://david-dm.org/papandreou/seespee.svg)](https://david-dm.org/papandreou/seespee)

Generate a `Content-Security-Policy` header for a website. The website is crawled
for scripts, stylesheets, images, fonts, application manifests etc., which will
be listed by their origin. Inline scripts and stylesheets will be hashed so
`'unsafe-inline'` can be avoided.

## Usage

```
seespee [--root <inputRootDirectory>] [--validate] [--level <number>]
[--ignoreexisting] [--include ...] <url|pathToHtml>

Options:
  --help             Show help                                         [boolean]
  --version          Show version number                               [boolean]
  --root             Path to your web root so seespe can resolve root-relative
                     urls correctly (will be deduced from your input files if
                     not specified)                                     [string]
  --ignore-existing  Whether to ignore the existing Content-Security-Policy
                     (<meta> or HTTP header) and start building one from scratch
                                                      [boolean] [default: false]
  --include          CSP directives to include in the policy to be generated,
                     eg. "script-src *.mycdn.com; img-src 'self'"       [string]
  --validate         Turn on validation mode, useful for CI. If non-whitelisted
                     assets are detected, a report will be output, and seespee
                     will return a non-zero status code.               [boolean]
  --level            The CSP level to target. Possible values: 1 or 2. Defaults
                     to somewhere in between so that all browsers are supported.
                                                                        [number]
  --pretty           Whether to reformat the generated CSP in a human friendly
                     way                               [boolean] [default: true]
  --user-agent       Use a specific User-Agent string when retrieving http(s)
                     resources. Useful with servers that are configured to only
                     send a Content-Security-Policy header to browsers known to
                     understand it                                      [string]
```

## Example

```
$ npm install -g seespee
$ seespee https://lodash.com/
Content-Security-Policy: default-src 'none'; img-src 'self' data:; manifest-src 'self'; style-src 'self' https://unpkg.com; font-src https://unpkg.com; script-src 'self' 'sha256-85RLtUiAixnqFeQvOtsiq5HBnq4nAgtgmrVVlIrEwyk=' 'sha256-9gJ3aNComH+MFu3rw5sARPpvBPOF0VxLUsw1xjxmVzE=' 'sha256-Df4bY3tGwX4vCpgFJ2b7hL/F9h65FABZRCub2RYYOmU=' 'sha256-euGdatRFmkEGGSWO0jbpFAuN5709ZGDaFjCqNnYocQM=' 'unsafe-inline' https://embed.runkit.com https://unpkg.com
```

```
$ seespee https://github.com/
Content-Security-Policy:
  default-src 'none';
  base-uri 'self';
  block-all-mixed-content;
  child-src render.githubusercontent.com;
  connect-src 'self' api.github.com collector.githubapp.com github-cloud.s3.amazonaws.com
    github-production-repository-file-5c1aeb.s3.amazonaws.com
    github-production-upload-manifest-file-7fdce7.s3.amazonaws.com
    github-production-user-asset-6210df.s3.amazonaws.com
    status.github.com uploads.github.com wss://live.github.com www.google-analytics.com;
  font-src assets-cdn.github.com;
  form-action 'self' gist.github.com github.com;
  frame-ancestors 'none';
  img-src 'self' *.githubusercontent.com assets-cdn.github.com collector.githubapp.com
    data: github-cloud.s3.amazonaws.com identicons.github.com;
  script-src assets-cdn.github.com;
  style-src 'unsafe-inline' assets-cdn.github.com;
```

It also works with a website located in a directory on a file system.
In that case, a `--root` option is supported, determing how root-relative
urls are to be interpreted (if not given, it will be assumed to be the
directory containing the HTML file):

```
$ seespee --root /path/to/my/project /path/to/my/project/main/index.html
```

If the website has an existing `Content-Security-Policy` header or
a [meta tag](https://www.w3.org/TR/CSP2/#delivery-html-meta-element)
it will be detected and taken into account so all the existing directives
are supported. This behavior can be disabled with the `--ignoreexisting`
parameter.

You can also specify custom directives to include on the command line via
the `--include` switch. The provided directives will be taken into account
when adding new ones so you won't end up with redundant entries that are
already whitelisted by eg. `*`:

```
$ seespee --include "default-src 'none'; style-src *" https://news.ycombinator.com/
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com/ https://www.google.com/recaptcha/
    https://www.gstatic.com/recaptcha/;
  frame-src 'self' https://www.google.com/recaptcha/;
  style-src 'self' 'unsafe-inline';
```

## Validation mode

Using the `--validate` flag you can test that a website has a
Content-Security-Policy that covers all the assets that are used.
`seespee --validate <url>` will exit with a non-zero status code if
a violation is found, so it's easy to integrate with CI systems.

As with the CSP generation mode, remember that `seespee` will only
consider assets that can be detected via a static analysis, so there
could be JavaScript on the page that loads non-whitelisted assets at runtime.

# CSP level

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
[Bypassing path restriction on whitelisted CDNs to circumvent CSP protections -
SECT CTF Web 400 writeup](https://blog.0daylabs.com/2016/09/09/bypassing-csp/).
Unfortunately this cannot be the default because it breaks in Safari 8, 9, and 9.1,
which don't support the full
[CSP 1 source expression grammar](https://www.w3.org/TR/2012/CR-CSP-20121115/#source-list).
You can use [express-legacy-csp](https://github.com/Munter/express-legacy-csp)
to mitigate this.

# Programmatic usage

```js
var seespee = require('seespee');
seespee('https://github.com/').then(function(result) {
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
}).then(function(result) {
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
}).then(function(result) {
  // ...
});
```

# License

Seespee is licensed under a standard 3-clause BSD license -- see the
`LICENSE` file for details.
