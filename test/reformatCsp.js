const reformatCsp = require('../lib/reformatCsp');
const expect = require('unexpected');

describe('reformatCsp', function() {
  it('should make a section for each directive', function() {
    expect(
      reformatCsp('foo bar quux; baz yadda;'),
      'to equal',
      '  foo bar quux;\n' + '  baz yadda;'
    );
  });

  it('should reflow when a line exceeds 80 chars (default maxWidth)', function() {
    expect(
      reformatCsp(
        '12345678 000000000 111111111 222222222 333333333 444444444 555555555 666666666 777777777 888888888 ' +
          '999999999 aaaaaaaaa bbbbbbbbb ccccccccc ddddddddd eeeeeeeee fffffffff'
      ),
      'to equal',
      '  12345678 000000000 111111111 222222222 333333333 444444444 555555555 666666666\n' +
        '    777777777 888888888 999999999 aaaaaaaaa bbbbbbbbb ccccccccc ddddddddd\n' +
        '    eeeeeeeee fffffffff;'
    );
  });

  it('should honor a custom maxWidth', function() {
    expect(
      reformatCsp(
        '000000000 111111111 222222222 333333333 444444444 555555555 666666666 777777777 888888888 999999999 aaaaaaaaa',
        { maxWidth: 42 }
      ),
      'to equal',
      '  000000000 111111111 222222222 333333333\n' +
        '    444444444 555555555 666666666\n' +
        '    777777777 888888888 999999999\n' +
        '    aaaaaaaaa;'
    );
  });
});
