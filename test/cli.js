const run = require('./run');
const pathModule = require('path');
const expect = require('unexpected').clone();

expect.addAssertion('<array> to yield output <string>', async (expect, args, expectedOutput) => {
    expect.errorMode = 'nested';
    let stdout;
    let stderr;
    try {
        [stdout, stderr] = await run([
            pathModule.resolve(__dirname, '..', 'lib', 'cli.js'),
            ...args
        ]);
    } catch (err) {
        if (err.stderr) {
            expect.fail(`Child process exited with ${err.code} and stderr ${err.stderr}`);
        } else {
            throw err;
        }
    }

    expect(stderr, 'when decoded as', 'utf-8', 'to equal', '');

    expect(stdout, 'when decoded as', 'utf-8', 'to equal', expectedOutput);
});

expect.addAssertion('<array> to error with <string>', async (expect, args, expectedErrorOutput) => {
    expect.errorMode = 'nested';
    let stdout;
    let stderr;
    let err;
    try {
        [stdout, stderr] = await run([
            pathModule.resolve(__dirname, '..', 'lib', 'cli.js'),
            ...args
        ]);
    } catch (_err) {
        err = _err;
    }

    if (err) {
        expect(err.exitCode, 'to be greater than', 0);
        expect(err.stderr, 'when decoded as', 'utf-8', 'to equal', expectedErrorOutput);
    } else {
        expect.fail(`Command did not fail\nstdout: ${stdout}\nstderr: ${stderr}`);
    }
});

describe('cli', function () {
    it('should generate a Content-Security-Policy from a local HTML file with no CSP meta tag', async function () {
        await expect([
            pathModule.relative(
                process.cwd(),
                pathModule.resolve(
                    __dirname,
                    '..',
                    'testdata',
                    'noExistingCsp',
                    'index.html'
                )
            )
        ], 'to yield output', 'Content-Security-Policy: default-src \'none\'; script-src \'self\'\n');
    });

    describe('in --validate mode', function () {
        it('should succeed when there is a CSP meta tag that covers all the resources that are used', async function () {
            await expect([
                '--validate',
                pathModule.relative(
                    process.cwd(),
                    pathModule.resolve(
                        __dirname,
                        '..',
                        'testdata',
                        'existingCompleteCsp',
                        'index.html'
                    )
                )
            ], 'to yield output', '');
        });

        it('should fail when some resources are not covered by the existing CSP', async function () {
            await expect([
                '--validate',
                pathModule.relative(
                    process.cwd(),
                    pathModule.resolve(
                        __dirname,
                        '..',
                        'testdata',
                        'existingIncompleteCsp',
                        'index.html'
                    )
                )
            ], 'to error with', 'Missing directives:\n  script-src \'self\'\n');
        });

        it('should fail when there is no CSP', async function () {
            await expect([
                '--validate',
                pathModule.relative(
                    process.cwd(),
                    pathModule.resolve(
                        __dirname,
                        '..',
                        'testdata',
                        'noExistingCsp',
                        'index.html'
                    )
                )
            ], 'to error with', 'No existing Content-Security-Policy\n');
        });
    });
});
