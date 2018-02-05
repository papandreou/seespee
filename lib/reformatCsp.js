function indentLines(text, { indent = '  ' } = {}) {
  return text.replace(/^(?!$)/gm, indent);
}

function reformatCsp(text, { maxWidth = 80, indent = '  ' } = {}) {
  let formattedText = '';
  let first = true;
  for (const directiveWithValue of text.split(/\s*;\s*/)) {
    if (/^\s*$/.test(directiveWithValue)) {
      continue;
    }
    if (first) {
      first = false;
    } else {
      formattedText += '\n';
    }
    const tokens = directiveWithValue.split(/\s+/);
    let last = -1;
    while (last < tokens.length - 1) {
      let cursor = last + 1;
      let width = tokens[cursor].length + indent.length;
      if (last !== -1) {
        width += indent.length;
        formattedText += '\n  ';
      }
      while (
        cursor < tokens.length &&
        tokens[cursor].length + width < maxWidth
      ) {
        width += tokens[cursor].length + 1;
        cursor += 1;
      }
      formattedText += tokens.slice(last + 1, cursor + 1).join(' ');
      last = cursor;
    }
    formattedText += ';';
  }
  return `${indentLines(formattedText, { indent })}`;
}

module.exports = reformatCsp;
