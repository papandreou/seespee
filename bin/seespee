#!/usr/bin/env node

var seespee = require('../lib/seespee');
var outputMessage = require('../lib/outputMessage');
var commandLineOptions = require('optimist')
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

seespee(commandLineOptions._[0], {
    include: commandLineOptions.include,
    ignoreMeta: commandLineOptions.ignoremeta,
    ignoreHeader: commandLineOptions.ignoreheader,
    root: commandLineOptions.root,
    level: commandLineOptions.level
}).then(function (result) {
    if (result.url !== result.originalUrl) {
        console.warn('Redirected to', result.url);
    }
    ['error', 'warn'].forEach(function (severity) {
        result[severity + 's'].forEach(function (error) {
            outputMessage(error, severity);
        });
    });
    if (result.contentSecurityPolicy || !result.contentSecurityPolicyReportOnly) {
        console.log('Content-Security-Policy: ' + result.contentSecurityPolicy);
    }
    if (result.contentSecurityPolicyReportOnly) {
        console.log('Content-Security-Policy-Report-Only: ' + result.contentSecurityPolicyReportOnly);
    }
    if (result.errors.length > 0) {
        process.exit(1);
    }
}, function (err) {
    throw err;
});
