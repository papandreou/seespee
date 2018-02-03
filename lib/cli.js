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
    .usage('$0 [--root <inputRootDirectory>] [--validate] [--level <number>] [--ignoreexisting] [--include ...] <url|pathToHtml>')
    .option('root', {
        type: 'string',
        description: 'Path to your web root so seespe can resolve root-relative urls correctly (will be deduced from your input files if not specified)'
    })
    .option('ignoreexisting', {
        type: 'boolean',
        description: 'Whether to ignore the existing Content-Security-Policy (<meta> or HTTP header) and start building one from scratch',
        default: false
    })
    .option('include', {
        type: 'string',
        description: 'CSP directives to include in the policy to be generated, eg. "script-src *.mycdn.com; img-src \'self\'"'
    })
    .option('validate', {
        type: 'boolean',
        description: 'Turn on validation mode, useful for CI. If non-whitelisted assets are detected, a report will be output, and seespee will return a non-zero status code.'
    })
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
            warns.push(`Redirected to ${url}`);
        }
        let warnAboutHashedAttributes = false;
        let originalPoliciesUsedUnsafeHashedAttributes = originalPolicies.some(
            originalPolicy => originalPolicy.value.includes('"unsafe-hashed-attributes"')
        );
        let outputs = [];
        if (validate) {
            if (originalPolicies.length === 0) {
                errors.push('Validation failed: No existing Content-Security-Policy');
            }
            for (const { name, value } of originalPolicies) {
                outputs.push(renderCsp(value, name));
            }
            const policiesWithAdditions = policies.filter(policy => Object.keys(policy.additions).length > 0);
            if (policiesWithAdditions.length > 0) {
                let missingDirectivesOutput = '';
                for (const policy of policiesWithAdditions) {
                    for (const directive of Object.keys(policy.additions)) {
                        missingDirectivesOutput += '\n' + renderCsp(`${kebabCase(directive)} ${Object.keys(policy.additions[directive]).join(' ')}`);
                        for (const sourceExpression of Object.keys(policy.additions[directive])) {
                            for (const relation of policy.additions[directive][sourceExpression]) {
                                missingDirectivesOutput += `\n    ${relation.to.urlOrDescription}`;
                            }
                            if (sourceExpression === "'unsafe-hashed-attributes'") {
                                warnAboutHashedAttributes = true;
                            }
                        }
                    }
                }
                errors.push(
                    `Validation failed: The Content-Security-Policy does not whitelist the following resources:${missingDirectivesOutput}`
                );
            }
        } else {
            if (contentSecurityPolicy || !contentSecurityPolicyReportOnly) {
                outputs.push(renderCsp(contentSecurityPolicy, 'Content-Security-Policy'));
                if (contentSecurityPolicy.includes("'unsafe-hashed-attributes'") && !originalPoliciesUsedUnsafeHashedAttributes) {
                    warnAboutHashedAttributes = true;
                }
            }
            if (contentSecurityPolicyReportOnly) {
                outputs.push(renderCsp(contentSecurityPolicyReportOnly, 'Content-Security-Policy-Report-Only'));
                if (contentSecurityPolicyReportOnly.includes("'unsafe-hashed-attributes'") && !originalPoliciesUsedUnsafeHashedAttributes) {
                    warnAboutHashedAttributes = true;
                }
            }
        }
        if (warnAboutHashedAttributes && !(level >= 3)) {
            warns.push(
                `You're using inline event handlers or style attributes, which cannot be whitelisted with CSP level 2.\n` +
                "The 'unsafe-hashed-attributes' CSP3 keyword will allow it, but at the time of writing the spec is not finalized and no browser implements it."
            );
        }
        for (const error of errors) {
            outputMessage(error, 'error');
        }
        for (const warn of warns) {
            outputMessage(warn, 'warn');
        }
        for (const output of outputs) {
            console.log(output);
        }
        if (errors.length > 0) {
            process.exit(1);
        }
    } catch (err) {
        outputMessage(err, 'error');
        process.exit(1);
    }
})();
