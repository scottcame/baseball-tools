"use strict";

var assert = require('assert');
var rl = require('readline');
var fs = require('fs');

var Event = require('../src/event.js')

let lines = fs.readFileSync('test/retrosheet-plays-1517.txt', 'utf-8').split('\n');

describe('Test validation against ' + lines.length + ' Retrosheet plays from 2015-2017', function() {
  it('basic plays', function() {
    lines.forEach(function(line) {
      let rawEvent = Event.parseRawEvent(line);
      if (rawEvent != null) {
        let error = rawEvent.basicPlayError;
        if (error != null) {
          console.log("Invalid: '" + line + "'");
        }
        assert.ok(error == null);
      }
    });
  });
  it('advances', function() {
    lines.forEach(function(line) {
      let rawEvent = Event.parseRawEvent(line);
      if (rawEvent != null) {
        let rawEvent = Event.parseRawEvent(line);
        let error = rawEvent.advancesParseErrors;
        if (error != null && error.length > 0) {
          console.log("Invalid: '" + line + "'");
          console.log(rawEvent.advances);
          console.log(rawEvent.advancesParseErrors);
        }
        assert.ok(error.length == 0);
      }
    });
  });
  it('modifiers', function() {
    lines.forEach(function(line) {
      let rawEvent = Event.parseRawEvent(line);
      if (rawEvent != null) {
        let rawEvent = Event.parseRawEvent(line);
        let error = rawEvent.modifiersParseErrors;
        if (error != null && error.length > 0) {
          console.log("Invalid: '" + line + "'");
          console.log(rawEvent.modifiers);
          console.log(rawEvent.modifiersParseErrors);
        }
        assert.ok(error.length == 0);
      }
    });
  });
});

describe('Basic Play validation of invalid plays', function() {
  let makeAndAssertError = function(basicPlay) {
    it(basicPlay, function() {
      let error = Event.validateBasicPlay(basicPlay);
      assert.ok(error != null);
    });
  };
  makeAndAssertError("bleh");
  makeAndAssertError("SZ");
  makeAndAssertError("3[B]35(2)");
  makeAndAssertError("K+S");
  makeAndAssertError("S%3");
});

describe('Advances validation of invalid advances', function() {
  let makeAndAssertError = function(advances, length) {
    it("[" + advances.toString() + "] -> " + length, function() {
      let error = Event.validateAdvances(advances);
      assert.ok(error.length == length);
    });
  };
  makeAndAssertError(["bleh"], 1);
  makeAndAssertError(["bleh", "blek"], 2);
  makeAndAssertError(["bleh", "1X2"], 1);
  makeAndAssertError(["2XH(S7)"], 1);
  makeAndAssertError(["2XH(.)"], 1);
  makeAndAssertError(["2XH(./TH)"], 1);
  makeAndAssertError(["1-5"], 1);
});

describe('Modifiers validation of invalid modifiers', function() {
  let makeAndAssertError = function(modifiers, length) {
    it("[" + modifiers.toString() + "] -> " + length, function() {
      let error = Event.validateModifiers(modifiers);
      assert.ok(error.length == length);
    });
  };
  makeAndAssertError(["bleh"], 1);
  makeAndAssertError(["bleh", "78XD"], 1);
  makeAndAssertError(["FO2"], 1);
  makeAndAssertError(["bleh", "blek"], 2);
  makeAndAssertError(["Q", "QQ"], 2);
});
