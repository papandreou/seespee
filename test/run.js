const childProcess = require('child_process');

function consumeStream(stream) {
  return new Promise((resolve, reject) => {
    const buffers = [];
    stream
      .on('data', buffer => buffers.push(buffer))
      .on('end', () => resolve(Buffer.concat(buffers)))
      .on('error', reject);
  });
}

async function run(commandAndArgs, stdin) {
  if (typeof commandAndArgs !== 'undefined' && !Array.isArray(commandAndArgs)) {
    commandAndArgs = [commandAndArgs];
  }

  const proc = childProcess.spawn(commandAndArgs[0], commandAndArgs.slice(1));

  const promises = {
    exit: new Promise((resolve, reject) => {
      proc.on('error', reject).on('exit', exitCode => {
        if (exitCode === 0) {
          resolve();
        } else {
          reject(new Error(`Child process exited with ${exitCode}`));
        }
      });
    }),
    stdin: new Promise((resolve, reject) => {
      proc.stdin.on('error', reject).on('close', resolve);
    }),
    stdout: consumeStream(proc.stdout),
    stderr: consumeStream(proc.stderr)
  };

  if (typeof stdin === 'undefined') {
    proc.stdin.end();
  } else {
    proc.stdin.end(stdin);
  }

  try {
    await Promise.all(Object.values(promises));
    return [await promises.stdout, await promises.stderr];
  } catch (err) {
    err.stdout = await promises.stdout;
    err.stderr = await promises.stderr;
    throw err;
  }
}

module.exports = run;
