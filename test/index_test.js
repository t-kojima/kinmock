/* eslint-disable no-undef */
require('../.');
require('../fixture').load();
require('../schema').load();
const { assert } = require('chai');

describe('kintone関数', () => {
  it('UI Versionが2であること', () => {
    const actual = kintone.getUiVersion();
    assert.equal(actual, 2);
  });

  it('ログインユーザーが取得できること', () => {
    const actual = kintone.getLoginUser();
    assert.equal(actual.name, 'no-name');
  });
});
