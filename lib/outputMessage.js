// Copied from the logEvents transform:
const chalk = require('chalk');
const colorBySeverity = { info: 'cyan', warn: 'yellow', error: 'red' };
const symbolBySeverity = { info: 'ℹ', warn: '⚠', error: '✘' };

function indentSubsequentLines(str, level) {
  return str.replace(/\n/g, `\n${new Array(level + 1).join(' ')}`);
}

module.exports = function outputMessage(messageOrError, severity) {
  severity = severity || 'info';
  let message;
  if (Object.prototype.toString.call(messageOrError) === '[object Error]') {
    if (severity === 'error') {
      message = messageOrError.stack;
    } else {
      message =
        messageOrError.message || messageOrError.name || messageOrError.code;
    }
    if (messageOrError.asset) {
      message = `${messageOrError.asset.urlOrDescription}: ${message}`;
    }
  } else {
    if (typeof messageOrError === 'string') {
      message = messageOrError;
    } else if (typeof messageOrError.message === 'string') {
      message = messageOrError.message;
    } else {
      // Give up guessing. This is probably an error on the next lines...
      message = messageOrError;
    }
  }
  const caption = ` ${symbolBySeverity[severity]} ${severity.toUpperCase()}: `;

  console[severity](
    chalk[colorBySeverity[severity]](caption) +
      indentSubsequentLines(message, caption.length)
  );
};
