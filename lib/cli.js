#!/usr/bin/env node

const seespee = require('../lib/seespee');
const outputMessage = require('../lib/outputMessage');
const {
    include,
    ignoremeta: ignoreMeta,
    ignoreheader: ignoreHeader,
    root,
    level,
    _: nonSwitchArguments
} = require('optimist')
    .usage('$0 [--root <inputRootDirectory>] [--level <number>] [--ignoremeta] [--ignoreheader] [--existingpolicy ...] <url|pathToHtml>')
    .boolean('ignoremeta')
    .boolean('ignoreheader')
    .string('include')
    .option({
        name: 'level',
        type: 'number',
        description: 'The CSP level to target. Possible values: 1 or 2. Defaults to somewhere in between so that all browsers are supported.'
    })
    .demand(1)
    .argv;

(async () => {
    const {
        url,
        originalUrl,
        contentSecurityPolicy,
        contentSecurityPolicyReportOnly,
        errors,
        warns
    } = await seespee(nonSwitchArguments[0], { include, ignoreMeta, ignoreHeader, root, level });

    if (url !== originalUrl) {
        console.warn('Redirected to', url);
    }
    for (const error of errors) {
        outputMessage(error, 'error');
    }
    for (const warn of warns) {
        outputMessage(warn, 'warn');
    }
    if (contentSecurityPolicy || !contentSecurityPolicyReportOnly) {
        console.log('Content-Security-Policy: ' + contentSecurityPolicy);
    }
    if (contentSecurityPolicyReportOnly) {
        console.log('Content-Security-Policy-Report-Only: ' + contentSecurityPolicyReportOnly);
    }
    if (errors.length > 0) {
        process.exit(1);
    }
})();
