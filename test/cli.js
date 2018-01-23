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
});
