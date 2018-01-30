#!/usr/bin/env node

const seespee = require('./seespee');
const outputMessage = require('./outputMessage');
const reformatCsp = require('./reformatCsp');
const MagicPen = require('magicpen');
const magicPen = new MagicPen().use(require('magicpen-prism'));
const {
    include,
    ignoreexisting: ignoreExisting,
    root,
    level,
    pretty,
    validate,
    _: nonSwitchArguments
} = require('yargs')
    .usage('$0 [--root <inputRootDirectory>] [--validate] [--level <number>] [--ignoremeta] [--ignoreheader] [--existingpolicy ...] <url|pathToHtml>')
    .boolean('ignoremeta')
    .boolean('ignoreheader')
    .boolean('validate')
    .string('include')
    .option('level', {
        type: 'number',
        description: 'The CSP level to target. Possible values: 1 or 2. Defaults to somewhere in between so that all browsers are supported.'
    })
    .option('pretty', {
        type: 'boolean',
        default: true,
        description: 'Whether to reformat the generated CSP in a human friendly way'
    })
    .demand(1)
    .argv;

function renderCsp(str, headerName) {
    if (pretty) {
        str = (headerName ? `${headerName}:\n` : '') + reformatCsp(str);
    } else if (headerName) {
        str = `${headerName}: ${str}`;
    }
    return magicPen.clone().code(str, 'csp').toString(MagicPen.defaultFormat);
}

function kebabCase(str) {
    return str.replace(/[A-Z\u00C0-\u00D6\u00D8-\u00DE]/g, function (match) {
        return '-' + match.toLowerCase();
    });
}

(async () => {
    try {
        const {
            url,
            originalUrl,
            contentSecurityPolicy,
            contentSecurityPolicyReportOnly,
            errors,
            warns,
            policies,
            originalPolicies
        } = await seespee(nonSwitchArguments[0], { include, ignoreExisting, root, level });

        if (url !== originalUrl) {
            console.warn('Redirected to', url);
        }
        for (const error of errors) {
            outputMessage(error, 'error');
        }
        for (const warn of warns) {
            outputMessage(warn, 'warn');
        }
        if (validate) {
            if (originalPolicies.length === 0) {
                console.error('No existing Content-Security-Policy');
                process.exit(1);
            }
            for (const { name, value } of originalPolicies) {
                console.log(renderCsp(value, name));
            }
            const policiesWithAdditions = policies.filter(policy => Object.keys(policy.additions).length > 0);
            if (policiesWithAdditions.length > 0) {
                console.error('Missing directives:');
                for (const policy of policiesWithAdditions) {
                    for (const directive of Object.keys(policy.additions)) {
                        console.error(renderCsp(`  ${kebabCase(directive)} ${Object.keys(policy.additions[directive]).join(' ')}`));
                        for (const sourceExpression of Object.keys(policy.additions[directive])) {
                            for (const relation of policy.additions[directive][sourceExpression]) {
                                console.error(`    ${relation.to.urlOrDescription}`);
                            }
                        }
                    }
                }
                process.exit(1);
            }
        } else {
            if (contentSecurityPolicy || !contentSecurityPolicyReportOnly) {
                console.log(renderCsp(contentSecurityPolicy, 'Content-Security-Policy'));
            }
            if (contentSecurityPolicyReportOnly) {
                console.log(renderCsp(contentSecurityPolicyReportOnly, 'Content-Security-Policy-Report-Only'));
            }
        }
        if (errors.length > 0) {
            process.exit(1);
        }
    } catch (err) {
        outputMessage(err, 'error');
        process.exit(1);
    }
})();
