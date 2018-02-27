"use strict";

var assert = require('assert');
var Pitch = require('../src/pitch.js')

describe('Retrosheet format tests', function() {
  it('One pitch', function() {
    let o = Pitch.parsePitchSequence("B");
    assert.equal(1, o.length);
    o = o[0];
    assert.equal(null, o.modifier);
    assert.equal("B", o.outcome);
  });
  it('Two pitches', function() {
    let oo = Pitch.parsePitchSequence("BS");
    assert.equal(2, oo.length);
    let o = oo[0];
    assert.equal(null, o.modifier);
    assert.equal("B", o.outcome);
    o = oo[1];
    assert.equal(null, o.modifier);
    assert.equal("S", o.outcome);
  });
  it('Modifier', function() {
    let o = Pitch.parsePitchSequence("*B");
    assert.equal(1, o.length);
    o = o[0];
    assert.equal("*", o.modifier);
    assert.equal("B", o.outcome);
  });
});
