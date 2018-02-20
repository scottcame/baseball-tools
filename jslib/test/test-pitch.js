"use strict";

var assert = require('assert');
var Pitch = require('../src/pitch.js')

describe('Enhanced format tests', function() {
  it('One pitch', function() {
    let o = Pitch.parsePitchSequence("B/88/FA/5");
    assert.equal(1, o.length);
    o = o[0];
    assert.equal(null, o.modifier);
    assert.equal("B", o.outcome);
    assert.equal("88", o.velocity);
    assert.equal("FA", o.type);
    assert.equal("5", o.location);
  });
  it('Two pitches', function() {
    let oo = Pitch.parsePitchSequence("B/88/FA/5;S/90/FA/4");
    assert.equal(2, oo.length);
    let o = oo[0];
    assert.equal(null, o.modifier);
    assert.equal("B", o.outcome);
    assert.equal("88", o.velocity);
    assert.equal("FA", o.type);
    assert.equal("5", o.location);
    o = oo[1];
    assert.equal(null, o.modifier);
    assert.equal("S", o.outcome);
    assert.equal("90", o.velocity);
    assert.equal("FA", o.type);
    assert.equal("4", o.location);
  });
  it('Modifier', function() {
    let oo = Pitch.parsePitchSequence("B/88/FA/5;*S/90/FA/4");
    assert.equal(2, oo.length);
    let o = oo[0];
    assert.equal(null, o.modifier);
    assert.equal("B", o.outcome);
    assert.equal("88", o.velocity);
    assert.equal("FA", o.type);
    assert.equal("5", o.location);
    o = oo[1];
    assert.equal("*", o.modifier);
    assert.equal("S", o.outcome);
    assert.equal("90", o.velocity);
    assert.equal("FA", o.type);
    assert.equal("4", o.location);
  });
  it('Trailing semicolon ok', function() {
    let o = Pitch.parsePitchSequence("B/88/FA/5;");
    assert.equal(1, o.length);
    o = o[0];
    assert.equal(null, o.modifier);
    assert.equal("B", o.outcome);
    assert.equal("88", o.velocity);
    assert.equal("FA", o.type);
    assert.equal("5", o.location);
  });
});

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
