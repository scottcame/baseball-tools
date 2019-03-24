"use strict";

var assert = require('assert');
var Event = require('../src/event.js')

describe('rawText', function() {
  it('should return input as rawText property', function() {
    let o = Event.parseRawEvent("S7");
    assert.equal("S7", o.rawText);
  });
});

describe('Event.parseRawEvent (No Modifiers or Advances) ', function() {
  it('should parse S7', function() {
    let o = Event.parseRawEvent("S7");
    assert.equal("S7", o.basicPlay);
    assert.deepEqual([], o.modifiers);
    assert.deepEqual([], o.advances);
  });
  it('should parse 9', function() {
    let o = Event.parseRawEvent("9");
    assert.equal("9", o.basicPlay);
    assert.deepEqual([], o.modifiers);
    assert.deepEqual([], o.advances);
  });
});

describe('Event.parseRawEvent (with modifiers)', function() {
  it('should parse D7/G5', function() {
    let o = Event.parseRawEvent("D7/G5");
    assert.equal("D7", o.basicPlay);
    assert.equal("G5", o.modifiers);
  });
  it('should parse D7/E7/TH', function() {
    let o = Event.parseRawEvent("D7/E7/TH");
    assert.equal("D7", o.basicPlay);
    assert.deepEqual(["E7", "TH"], o.modifiers);
  });
});

describe('Event.parseRawEvent (with advances)', function() {
  it('should parse D7.2-H', function() {
    let o = Event.parseRawEvent("D7.2-H");
    assert.equal("D7", o.basicPlay);
    assert.equal(1, o.advances.length);
    assert.equal("2", o.advances[0].startingBase);
    assert.equal("H", o.advances[0].endingBase);
    assert.equal("advance", o.advances[0].type);
  });
  it('should parse D7.2-H;3-H', function() {
    let o = Event.parseRawEvent("D7.2-H;3-H");
    assert.equal("D7", o.basicPlay);
    assert.equal(2, o.advances.length);
    assert.equal("2", o.advances[0].startingBase);
    assert.equal("H", o.advances[0].endingBase);
    assert.equal("advance", o.advances[0].type);
    assert.equal("3", o.advances[1].startingBase);
    assert.equal("H", o.advances[1].endingBase);
    assert.equal("advance", o.advances[1].type);
  });
  it('should parse D7/L.2-H;3-H', function() {
    let o = Event.parseRawEvent("D7/L.2-H;3-H");
    assert.equal("D7", o.basicPlay);
    assert.equal("L", o.modifiers);
    assert.equal(2, o.advances.length);
  });
  it('should parse D7.2-H;3-H', function() {
    let o = Event.parseRawEvent("FC5/G5.3XH(52)");
    assert.equal("FC5", o.basicPlay);
    assert.equal("G5", o.modifiers);
    assert.equal(1, o.advances.length);
    assert.equal("3", o.advances[0].startingBase);
    assert.equal("H", o.advances[0].endingBase);
    assert.equal("out", o.advances[0].type);
    assert.equal(1, o.advances[0].parameters.length);
    assert.equal("52", o.advances[0].parameters[0].parameter);
  });
});

describe('Event.getPlayCode', function() {
  it('S7 -> S', function() {
    let o = Event.parseRawEvent("S7");
    assert.equal("S", Event.getPlayCode(o));
  });
  it('S7.1-2 -> S', function() {
    let o = Event.parseRawEvent("S7.1-2");
    assert.equal("S", Event.getPlayCode(o));
  });
  it('S7/L7LD -> S', function() {
    let o = Event.parseRawEvent("S7/L7LD");
    assert.equal("S", Event.getPlayCode(o));
  });
  it('9 -> 9', function() {
    let o = Event.parseRawEvent("9");
    assert.equal("9", Event.getPlayCode(o));
  });
  it('9/L -> 9', function() {
    let o = Event.parseRawEvent("9/L");
    assert.equal("9", Event.getPlayCode(o));
  });
  it('SB2.1-2 -> SB', function() {
    let o = Event.parseRawEvent("SB2.1-2");
    assert.equal("SB", Event.getPlayCode(o));
  });
  it('HR -> HR', function() {
    let o = Event.parseRawEvent("HR");
    assert.equal("HR", Event.getPlayCode(o));
  });
  it('E1/TH/BG15.1-3 -> E', function() {
    let o = Event.parseRawEvent("E1/TH/BG15.1-3");
    assert.equal("E", Event.getPlayCode(o));
  });
  it('K23 -> K', function() {
    let o = Event.parseRawEvent("K23");
    assert.equal("K", Event.getPlayCode(o));
  });
  it('K+WP.1-2 -> K', function() {
    let o = Event.parseRawEvent("K+WP.1-2");
    assert.equal("K", Event.getPlayCode(o));
  });
  it('W+PB.3-H(NR);1-3 -> W', function() {
    let o = Event.parseRawEvent("W+PB.3-H(NR);1-3");
    assert.equal("W", Event.getPlayCode(o));
  });
});

describe('sacFly', function() {
  it('9/SF.3-H -> true', function() {
    let o = Event.parseRawEvent("9/SF.3-H");
    assert.equal(true, Event.getIsSacFly(o));
  });
  it('9 -> false', function() {
    let o = Event.parseRawEvent("9");
    assert.equal(false, Event.getIsSacFly(o));
  });
});

describe('sacBunt', function() {
  it('23/SH.1-2 -> true', function() {
    let o = Event.parseRawEvent("23/SH.1-2");
    assert.equal(true, Event.getIsSacBunt(o));
  });
  it('23 -> false', function() {
    let o = Event.parseRawEvent("23");
    assert.equal(false, Event.getIsSacBunt(o));
  });
});

describe('Event.determineOuts (Batter)', function() {
  let defense = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
  it('9', function() {
    let o = Event.parseRawEvent("9");
    let outs = Event.determineOuts(o, ["batter", null, null, null], defense);
    assert.equal(1, outs.length);
    assert.equal(1, Event.determineOutsRecorded(outs));
    let out = outs[0];
    assert.equal("9", out.play);
    assert.equal("B", out.runnerStartingBase);
    assert.equal("batter", out.runnerId);
    assert.equal("9", out.putoutFielderPosition);
    assert.equal("RF", out.putoutFielderId);
    assert.deepEqual([], out.assistFielders);
  });
  it('4(1)', function() {
    let o = Event.parseRawEvent("4(1)");
    let outs = Event.determineOuts(o, ["batter", "first", null, null], defense);
    assert.equal(1, outs.length);
    assert.equal(1, Event.determineOutsRecorded(outs));
    let out = outs[0];
    assert.equal("4", out.play);
    assert.equal("1", out.runnerStartingBase);
    assert.equal("first", out.runnerId);
    assert.equal("4", out.putoutFielderPosition);
    assert.equal("2B", out.putoutFielderId);
    assert.deepEqual([], out.assistFielders);
  });

  it('54(1)3', function() {
    let o = Event.parseRawEvent('54(1)3');
    let outs = Event.determineOuts(o, ["batter", "first", null, null], defense);
    assert.equal(2, outs.length);
    assert.equal(2, Event.determineOutsRecorded(outs));
    let out = outs[0];
    assert.equal("54", out.play);
    assert.equal("1", out.runnerStartingBase);
    assert.equal("first", out.runnerId);
    assert.equal("4", out.putoutFielderPosition);
    assert.equal("2B", out.putoutFielderId);
    assert.equal(1, out.assistFielders.length);
    assert.equal("5", out.assistFielders[0].fielderPosition);
    assert.equal("3B", out.assistFielders[0].fielderId);
    out = outs[1];
    assert.equal("43", out.play);
    assert.equal("B", out.runnerStartingBase);
    assert.equal("batter", out.runnerId);
    assert.equal("3", out.putoutFielderPosition);
    assert.equal("1B", out.putoutFielderId);
    assert.equal(1, out.assistFielders.length);
    assert.equal("4", out.assistFielders[0].fielderPosition);
    assert.equal("2B", out.assistFielders[0].fielderId);
  });

  it('54(1)3/GDP', function() {
    let o = Event.parseRawEvent('54(1)3/GDP');
    let outs = Event.determineOuts(o, ["batter", "first", null, null], defense);
    assert.equal(2, outs.length);
    assert.equal(2, Event.determineOutsRecorded(outs));
    let out = outs[0];
    assert.equal("54", out.play);
    assert.equal("1", out.runnerStartingBase);
    assert.equal("first", out.runnerId);
    assert.equal("4", out.putoutFielderPosition);
    assert.equal("2B", out.putoutFielderId);
    assert.equal(1, out.assistFielders.length);
    assert.equal("5", out.assistFielders[0].fielderPosition);
    assert.equal("3B", out.assistFielders[0].fielderId);
    out = outs[1];
    assert.equal("43", out.play);
    assert.equal("B", out.runnerStartingBase);
    assert.equal("batter", out.runnerId);
    assert.equal("3", out.putoutFielderPosition);
    assert.equal("1B", out.putoutFielderId);
    assert.equal(1, out.assistFielders.length);
    assert.equal("4", out.assistFielders[0].fielderPosition);
    assert.equal("2B", out.assistFielders[0].fielderId);
  });


  it('5(B)53(1)', function() {
    let o = Event.parseRawEvent('5(B)53(1)');
    let outs = Event.determineOuts(o, ["batter", "first", null, null], defense);
    assert.equal(2, outs.length);
    assert.equal(2, Event.determineOutsRecorded(outs));
    let out = outs[0];
    assert.equal("5", out.play);
    assert.equal("B", out.runnerStartingBase);
    assert.equal("batter", out.runnerId);
    assert.equal("5", out.putoutFielderPosition);
    assert.equal("3B", out.putoutFielderId);
    assert.equal(0, out.assistFielders.length);
    out = outs[1];
    assert.equal("53", out.play);
    assert.equal("1", out.runnerStartingBase);
    assert.equal("first", out.runnerId);
    assert.equal("3", out.putoutFielderPosition);
    assert.equal("1B", out.putoutFielderId);
    assert.equal(1, out.assistFielders.length);
    assert.equal("5", out.assistFielders[0].fielderPosition);
    assert.equal("3B", out.assistFielders[0].fielderId);
  });
  it('5(B)53(1)/LDP', function() {
    let o = Event.parseRawEvent('5(B)53(1)/LDP');
    let outs = Event.determineOuts(o, ["batter", "first", null, null], defense);
    assert.equal(2, outs.length);
    assert.equal(2, Event.determineOutsRecorded(outs));
    let out = outs[0];
    assert.equal("5", out.play);
    assert.equal("B", out.runnerStartingBase);
    assert.equal("batter", out.runnerId);
    assert.equal("5", out.putoutFielderPosition);
    assert.equal("3B", out.putoutFielderId);
    assert.equal(0, out.assistFielders.length);
    out = outs[1];
    assert.equal("53", out.play);
    assert.equal("1", out.runnerStartingBase);
    assert.equal("first", out.runnerId);
    assert.equal("3", out.putoutFielderPosition);
    assert.equal("1B", out.putoutFielderId);
    assert.equal(1, out.assistFielders.length);
    assert.equal("5", out.assistFielders[0].fielderPosition);
    assert.equal("3B", out.assistFielders[0].fielderId);
  });

  it('54(B)/BG+/SH.1-2', function() {
    let o = Event.parseRawEvent("54(B)/BG+/SH.1-2");
    let outs = Event.determineOuts(o, ["batter", "first", null, null], defense);
    assert.equal(1, outs.length);
    assert.equal(1, Event.determineOutsRecorded(outs));
    let out = outs[0];
    assert.equal("54", out.play);
    assert.equal("B", out.runnerStartingBase);
    assert.equal("batter", out.runnerId);
    assert.equal("4", out.putoutFielderPosition);
    assert.equal("2B", out.putoutFielderId);
    assert.equal(1, out.assistFielders.length);
    assert.equal("5", out.assistFielders[0].fielderPosition);
    assert.equal("3B", out.assistFielders[0].fielderId);
  });

  it('1(B)16(2)63(1)/LTP', function() {
    let o = Event.parseRawEvent("1(B)16(2)63(1)/LTP");
    let outs = Event.determineOuts(o, ["batter", "first", "second", null], defense);
    assert.equal(3, outs.length);
    assert.equal(3, Event.determineOutsRecorded(outs));
    let out = outs[0];
    assert.equal("1", out.play);
    assert.equal("B", out.runnerStartingBase);
    assert.equal("batter", out.runnerId);
    assert.equal("1", out.putoutFielderPosition);
    assert.equal("P", out.putoutFielderId);
    assert.equal(0, out.assistFielders.length);
    out = outs[1];
    assert.equal("16", out.play);
    assert.equal("2", out.runnerStartingBase);
    assert.equal("second", out.runnerId);
    assert.equal("6", out.putoutFielderPosition);
    assert.equal("SS", out.putoutFielderId);
    assert.equal(1, out.assistFielders.length);
    assert.equal("1", out.assistFielders[0].fielderPosition);
    assert.equal("P", out.assistFielders[0].fielderId);
    out = outs[2];
    assert.equal("63", out.play);
    assert.equal("1", out.runnerStartingBase);
    assert.equal("first", out.runnerId);
    assert.equal("3", out.putoutFielderPosition);
    assert.equal("1B", out.putoutFielderId);
    assert.equal(1, out.assistFielders.length);
    assert.equal("6", out.assistFielders[0].fielderPosition);
    assert.equal("SS", out.assistFielders[0].fielderId);
  });

  it('Unknown out', function() {
    let o = Event.parseRawEvent("2/UNK");
    let outs = Event.determineOuts(o, ["batter", "first", "second", null], defense);
    assert.equal(1, outs.length);
    let out = outs[0];
    assert.equal("2", out.play);
    assert.equal("B", out.runnerStartingBase);
    assert.equal("batter", out.runnerId);
    assert.equal("2", out.putoutFielderPosition);
    assert.equal("C", out.putoutFielderId);
    assert.equal(0, out.assistFielders.length);
  });

});

describe('Event.determineOuts (baserunning)', function() {
  let defense = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
  it('S9.1X3(95)', function() {
    let o = Event.parseRawEvent("S9.1X3(95)");
    let outs = Event.determineOuts(o, ["batter", "first", null, null], defense);
    assert.equal(1, outs.length);
    assert.equal(1, Event.determineOutsRecorded(outs));
    let out = outs[0];
    assert.equal("95", out.play);
    assert.equal("1", out.runnerStartingBase);
    assert.equal("first", out.runnerId);
    assert.equal("5", out.putoutFielderPosition);
    assert.equal("3B", out.putoutFielderId);
    assert.equal(1, out.assistFielders.length);
    assert.equal("9", out.assistFielders[0].fielderPosition);
    assert.equal("RF", out.assistFielders[0].fielderId);
  });
  it('S9.2XH(92);1X3(25)', function() {
    let o = Event.parseRawEvent("S9.2XH(92);1X3(25)");
    let outs = Event.determineOuts(o, ["batter", "first", "second", null], defense);
    assert.equal(2, outs.length);
    assert.equal(2, Event.determineOutsRecorded(outs));
    let out = outs[0];
    assert.equal("92", out.play);
    assert.equal("2", out.runnerStartingBase);
    assert.equal("second", out.runnerId);
    assert.equal("2", out.putoutFielderPosition);
    assert.equal("C", out.putoutFielderId);
    assert.equal(1, out.assistFielders.length);
    assert.equal("9", out.assistFielders[0].fielderPosition);
    assert.equal("RF", out.assistFielders[0].fielderId);
    out = outs[1];
    assert.equal("25", out.play);
    assert.equal("1", out.runnerStartingBase);
    assert.equal("first", out.runnerId);
    assert.equal("5", out.putoutFielderPosition);
    assert.equal("3B", out.putoutFielderId);
    assert.equal(1, out.assistFielders.length);
    assert.equal("2", out.assistFielders[0].fielderPosition);
    assert.equal("C", out.assistFielders[0].fielderId);
  });
  it('FC5/G5.3XH(52)', function() {
    let o = Event.parseRawEvent("FC5/G5.3XH(52)");
    let outs = Event.determineOuts(o, ["batter", null, null, "third"], defense);
    assert.equal(1, outs.length);
    assert.equal(1, Event.determineOutsRecorded(outs));
    let out = outs[0];
    assert.equal("52", out.play);
    assert.equal("3", out.runnerStartingBase);
    assert.equal("third", out.runnerId);
    assert.equal("2", out.putoutFielderPosition);
    assert.equal("C", out.putoutFielderId);
    assert.equal(1, out.assistFielders.length);
    assert.equal("5", out.assistFielders[0].fielderPosition);
    assert.equal("3B", out.assistFielders[0].fielderId);
  });
  it('Rundown: FC5/G5.3XH(5261526)', function() {
    let o = Event.parseRawEvent("FC5/G5.3XH(5261526)");
    let outs = Event.determineOuts(o, ["batter", null, null, "third"], defense);
    assert.equal(1, outs.length);
    assert.equal(1, Event.determineOutsRecorded(outs));
    let out = outs[0];
    assert.equal("5261526", out.play);
    assert.equal("3", out.runnerStartingBase);
    assert.equal("third", out.runnerId);
    assert.equal("6", out.putoutFielderPosition);
    assert.equal("SS", out.putoutFielderId);
    assert.equal(4, out.assistFielders.length);
    assert.equal("5", out.assistFielders[0].fielderPosition);
    assert.equal("3B", out.assistFielders[0].fielderId);
    assert.equal("2", out.assistFielders[1].fielderPosition);
    assert.equal("6", out.assistFielders[2].fielderPosition);
    assert.equal("1", out.assistFielders[3].fielderPosition);
  });
  it('CS2(26)', function() {
    let o = Event.parseRawEvent("CS2(26)");
    let outs = Event.determineOuts(o, ["batter", "first", null, "third"], defense);
    assert.equal(1, outs.length);
    assert.equal(1, Event.determineOutsRecorded(outs));
    let out = outs[0];
    assert.equal("26", out.play);
    assert.equal("1", out.runnerStartingBase);
    assert.equal("first", out.runnerId);
    assert.equal("6", out.putoutFielderPosition);
    assert.equal("SS", out.putoutFielderId);
    assert.equal(1, out.assistFielders.length);
    assert.equal("2", out.assistFielders[0].fielderPosition);
    assert.equal("C", out.assistFielders[0].fielderId);
  });
  it('PO2(14)', function() {
    let o = Event.parseRawEvent("PO2(14)");
    let outs = Event.determineOuts(o, ["batter", null, "second", null], defense);
    assert.equal(1, outs.length);
    assert.equal(1, Event.determineOutsRecorded(outs));
    let out = outs[0];
    assert.equal("14", out.play);
    assert.equal("2", out.runnerStartingBase);
    assert.equal("second", out.runnerId);
    assert.equal("4", out.putoutFielderPosition);
    assert.equal("2B", out.putoutFielderId);
    assert.equal(1, out.assistFielders.length);
    assert.equal("1", out.assistFielders[0].fielderPosition);
    assert.equal("P", out.assistFielders[0].fielderId);
  });
  it('S9/L9S.3-H;2X3(5/INT);1-2', function() {
    let o = Event.parseRawEvent("S9/L9S.3-H;2X3(5/INT);1-2");
    let outs = Event.determineOuts(o, ["batter", "first", "second", "third"], defense);
    assert.equal(1, outs.length);
    assert.equal(1, Event.determineOutsRecorded(outs));
    let out = outs[0];
    assert.equal("5", out.play);
    assert.equal("2", out.runnerStartingBase);
    assert.equal("second", out.runnerId);
    assert.equal("5", out.putoutFielderPosition);
    assert.equal("3B", out.putoutFielderId);
    assert.equal(0, out.assistFielders.length);
  });
  it('K', function() {
    let o = Event.parseRawEvent("K");
    let outs = Event.determineOuts(o, ["batter", null, null, null], defense);
    assert.equal(1, outs.length);
    assert.equal(1, Event.determineOutsRecorded(outs));
    let out = outs[0];
    assert.equal("K", out.play);
    assert.equal("B", out.runnerStartingBase);
    assert.equal("batter", out.runnerId);
    assert.equal("2", out.putoutFielderPosition);
    assert.equal("C", out.putoutFielderId);
    assert.equal(0, out.assistFielders.length);
  });
  it('K23', function() {
    let o = Event.parseRawEvent("K23");
    let outs = Event.determineOuts(o, ["batter", null, null, null], defense);
    assert.equal(1, outs.length);
    assert.equal(1, Event.determineOutsRecorded(outs));
    let out = outs[0];
    assert.equal("K23", out.play);
    assert.equal("B", out.runnerStartingBase);
    assert.equal("batter", out.runnerId);
    assert.equal("3", out.putoutFielderPosition);
    assert.equal("1B", out.putoutFielderId);
    assert.equal(1, out.assistFielders.length);
    assert.equal("2", out.assistFielders[0].fielderPosition);
    assert.equal("C", out.assistFielders[0].fielderId);
  });
});

describe('Event.determineOuts (no outs)', function() {
  let defense = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
  it('FC3/G3S.3-H;1-2 -> 0', function() {
    let o = Event.parseRawEvent("FC3/G3S.3-H;1-2");
    let outs = Event.determineOuts(o, ["batter", "first", null, "third"], defense);
    assert.equal(0, outs.length);
    assert.equal(0, Event.determineOutsRecorded(outs));
  });
  it('S7 -> 0', function() {
    let o = Event.parseRawEvent("S7");
    let outs = Event.determineOuts(o, ["batter", null, null, null], defense);
    assert.equal(0, outs.length);
    assert.equal(0, Event.determineOutsRecorded(outs));
  });
  it('S7.2-H -> 0', function() {
    let o = Event.parseRawEvent("S7.2-H");
    let outs = Event.determineOuts(o, ["batter", null, "second", null], defense);
    assert.equal(0, outs.length);
    assert.equal(0, Event.determineOutsRecorded(outs));
  });
  it('S7/L7LD.3-H;2-H;BX2(7E4) -> 0', function() {
    let o = Event.parseRawEvent("S7/L7LD.3-H;2-H;BX2(7E4)");
    let outs = Event.determineOuts(o, ["batter", null, "second", "third"], defense);
    assert.equal(1, outs.length);
    assert.equal(0, Event.determineOutsRecorded(outs));
    let out = outs[0];
    assert.equal("7E4", out.play);
    assert.equal("B", out.runnerStartingBase);
    assert.equal("batter", out.runnerId);
    assert.equal(null, out.putoutFielderPosition);
    assert.equal(null, out.putoutFielderId);
    assert.equal(1, out.assistFielders.length);
    assert.equal("7", out.assistFielders[0].fielderPosition);
    assert.equal("LF", out.assistFielders[0].fielderId);
  });
  it('CS2(2E6) -> 0', function() {
    let o = Event.parseRawEvent("CS2(2E6)");
    let outs = Event.determineOuts(o, ["batter", "first", null, null], defense);
    assert.equal(1, outs.length);
    assert.equal(0, Event.determineOutsRecorded(outs));
    let out = outs[0];
    assert.equal("2E6", out.play);
    assert.equal("1", out.runnerStartingBase);
    assert.equal("first", out.runnerId);
    assert.equal(null, out.putoutFielderPosition);
    assert.equal(null, out.putoutFielderId);
    assert.equal(1, out.assistFielders.length);
    assert.equal("2", out.assistFielders[0].fielderPosition);
    assert.equal("C", out.assistFielders[0].fielderId);
  });
  it('K+WP.B-1 -> 0', function() {
    let o = Event.parseRawEvent("K+WP.B-1");
    let outs = Event.determineOuts(o, ["batter", null, null, null], defense);
    assert.equal(0, outs.length);
    assert.equal(0, Event.determineOutsRecorded(outs));
  });
});

describe('determineRunsScoredBy', function() {
  let assertRunnerScored = function(rsby, runners) {
    assert.equal(runners.length, rsby.length);
    runners.forEach(function(rv, index) {
      assert.ok(rsby.reduce(function(accumulator, currentValue) { return accumulator |= rsby.includes(currentValue); }, false));
      assert.equal(false, rsby[index].unearnedIndicated);
      assert.equal(false, rsby[index].noRbiIndicated);
    });
  };
  it('[batter,null,null,null] + HR -> [batter]', function() {
    let o = Event.parseRawEvent("HR");
    let rsby = Event.determineRunsScoredBy(o, ["batter", null, null, null]);
    assertRunnerScored(rsby, ["batter"]);
  });
  it('[batter,null,null,null] + HR/F78XD -> [batter]', function() {
    let o = Event.parseRawEvent("HR/F78XD");
    let rsby = Event.determineRunsScoredBy(o, ["batter", null, null, null]);
    assertRunnerScored(rsby, ["batter"]);
  });
  it('[batter,first,2d,3d] + HR/F78XD.3-H;2-H;1-H -> [batter,first,2d,3d]', function() {
    let o = Event.parseRawEvent("HR/F78XD.3-H;2-H;1-H");
    let baseStateBeforePlay = ["batter", "first", "2d", "3d"];
    let rsby = Event.determineRunsScoredBy(o, baseStateBeforePlay);
    assertRunnerScored(rsby, baseStateBeforePlay);
  });
  it('[batter,null,null,null] + H -> [batter]', function() {
    let o = Event.parseRawEvent("H");
    let rsby = Event.determineRunsScoredBy(o, ["batter", null, null, null]);
    assertRunnerScored(rsby, ["batter"]);
  });
  it('[batter,null,null,null] + H7 -> [batter]', function() {
    let o = Event.parseRawEvent("H7");
    let rsby = Event.determineRunsScoredBy(o, ["batter", null, null, null]);
    assertRunnerScored(rsby, ["batter"]);
  });
  it('[batter,null,null,null] + HP -> []', function() {
    let o = Event.parseRawEvent("HP");
    let rsby = Event.determineRunsScoredBy(o, ["batter", null, null, null]);
    assert.equal(0, rsby.length);
  });
  it('[batter,1st,null,null] + HR.1-H -> [batter,1st]', function() {
    let o = Event.parseRawEvent("HR.1-H");
    let rsby = Event.determineRunsScoredBy(o, ["batter", null, null, null]);
    assertRunnerScored(rsby, ["batter", "1st"]);
  });
  it('[batter,null,null,3d] + S7.3-H -> [3d]', function() {
    let o = Event.parseRawEvent("S7.3-H");
    let rsby = Event.determineRunsScoredBy(o, ["batter", null, null, null]);
    assertRunnerScored(rsby, ["3d"]);
  });
  it('[batter,1st,null,3d] + S7.1-3;3-H -> [3d]', function() {
    let o = Event.parseRawEvent("S7.1-3;3-H");
    let rsby = Event.determineRunsScoredBy(o, ["batter", null, null, null]);
    assertRunnerScored(rsby, ["3d"]);
  });
  it('[batter,1st,null,3d] + S7.3-H;1-3 -> [3d]', function() {
    let o = Event.parseRawEvent("S7.3-H;1-3");
    let rsby = Event.determineRunsScoredBy(o, ["batter", null, null, null]);
    assertRunnerScored(rsby, ["3d"]);
  });
  it('[batter,null,2d,3d] + D9.2-H;3-H -> [2d,3d]', function() {
    let o = Event.parseRawEvent("D9.2-H;3-H");
    let rsby = Event.determineRunsScoredBy(o, ["batter", null, null, null]);
    assertRunnerScored(rsby, ["2d","3d"]);
  });
  it('[batter,null,2d,3d] + D9.2XH;3-H -> [3d]', function() {
    let o = Event.parseRawEvent("D9.2XH;3-H");
    let rsby = Event.determineRunsScoredBy(o, ["batter", null, null, null]);
    assertRunnerScored(rsby, ["3d"]);
  });
  it('[batter,null,2d,3d] + D9.2XH(9E2);3-H -> [2d,3d]', function() {
    let o = Event.parseRawEvent("D9.2XH(9E2);3-H");
    let rsby = Event.determineRunsScoredBy(o, ["batter", null, null, null]);
    assertRunnerScored(rsby, ["2d","3d"]);
  });
  it('[batter,null,null,3d] + E1/TH/BG15.3-H -> [3d]', function() {
    let o = Event.parseRawEvent("E1/TH/BG15.3-H");
    let rsby = Event.determineRunsScoredBy(o, ["batter", null, null, null]);
    assertRunnerScored(rsby, ["3d"]);
  });
  it('Unearned indicated', function() {
    let o = Event.parseRawEvent("S3/G-.3-H(UR)");
    let rsby = Event.determineRunsScoredBy(o, ["batter", null, null, "3d"]);
    assert.equal(1, rsby.length);
    assert.equal("3d", rsby[0].runner);
    assert.equal(true, rsby[0].unearnedIndicated);
    assert.equal(false, rsby[0].noRbiIndicated);
  });
  it('Unearned / no rbi indicated', function() {
    let o = Event.parseRawEvent("E9/F.1-H(UR)(NR);B-3");
    let rsby = Event.determineRunsScoredBy(o, ["batter", "1st", null, null]);
    assert.equal(1, rsby.length);
    assert.equal("1st", rsby[0].runner);
    assert.equal(true, rsby[0].unearnedIndicated);
    assert.equal(true, rsby[0].noRbiIndicated);
  });
});

describe('Event.determineBasesOccupiedAfterPlay (implicits, nobody on)', function() {
  it('S7 -> [batter,null,null]', function() {
    let o = Event.parseRawEvent("S7");
    assert.deepEqual(["batter", null, null], Event.determineBasesOccupiedAfterPlay(o, ["batter", null, null, null]).basesOccupiedAfterPlay);
  });
  it('S -> [batter,null,null]', function() {
    let o = Event.parseRawEvent("S");
    assert.deepEqual(["batter", null, null], Event.determineBasesOccupiedAfterPlay(o, ["batter", null, null, null]).basesOccupiedAfterPlay);
  });
  it('D7 -> [null,batter,null]', function() {
    let o = Event.parseRawEvent("D7");
    assert.deepEqual([null, "batter", null], Event.determineBasesOccupiedAfterPlay(o, ["batter", null, null, null]).basesOccupiedAfterPlay);
  });
  it('D -> [null,batter,null]', function() {
    let o = Event.parseRawEvent("D");
    assert.deepEqual([null, "batter", null], Event.determineBasesOccupiedAfterPlay(o, ["batter", null, null, null]).basesOccupiedAfterPlay);
  });
  it('T7 -> [null,null,batter]', function() {
    let o = Event.parseRawEvent("T7");
    assert.deepEqual([null, null, "batter"], Event.determineBasesOccupiedAfterPlay(o, ["batter", null, null, null]).basesOccupiedAfterPlay);
  });
  it('T -> [null,null,batter]', function() {
    let o = Event.parseRawEvent("T");
    assert.deepEqual([null, null, "batter"], Event.determineBasesOccupiedAfterPlay(o, ["batter", null, null, null]).basesOccupiedAfterPlay);
  });
  it('W -> [batter,null,null]', function() {
    let o = Event.parseRawEvent("W");
    assert.deepEqual(["batter", null, null], Event.determineBasesOccupiedAfterPlay(o, ["batter", null, null, null]).basesOccupiedAfterPlay);
  });
  it('IW -> [batter,null,null]', function() {
    let o = Event.parseRawEvent("IW");
    assert.deepEqual(["batter", null, null], Event.determineBasesOccupiedAfterPlay(o, ["batter", null, null, null]).basesOccupiedAfterPlay);
  });
  it('I -> [batter,null,null]', function() {
    let o = Event.parseRawEvent("I");
    assert.deepEqual(["batter", null, null], Event.determineBasesOccupiedAfterPlay(o, ["batter", null, null, null]).basesOccupiedAfterPlay);
  });
  it('E6 -> [batter,null,null]', function() {
    let o = Event.parseRawEvent("E6");
    assert.deepEqual(["batter", null, null], Event.determineBasesOccupiedAfterPlay(o, ["batter", null, null, null]).basesOccupiedAfterPlay);
  });
});

describe('Event.determineBasesOccupiedAfterPlay (explicits, nobody on)', function() {
  it('K+WP.B-1 -> [batter,null,null]', function() {
    let o = Event.parseRawEvent("K+WP.B-1");
    assert.deepEqual(["batter", null, null], Event.determineBasesOccupiedAfterPlay(o, ["batter", null, null, null]).basesOccupiedAfterPlay);
  });
});

describe('Event.determineBasesOccupiedAfterPlay (implicit no advance, runners on)', function() {
  it('[batter,first,null,null] + 9 -> [first,null,null]', function() {
    let o = Event.parseRawEvent("9");
    assert.deepEqual(["first", null, null], Event.determineBasesOccupiedAfterPlay(o, ["batter", "first", null, null]).basesOccupiedAfterPlay);
  });
  it('[null,null,third] + 63/G -> [null,null,third]', function() {
    let o = Event.parseRawEvent("63/G");
    assert.deepEqual([null, null, "third"], Event.determineBasesOccupiedAfterPlay(o, ["batter", null, null, "third"]).basesOccupiedAfterPlay);
  });
});

describe('Event.determineBasesOccupiedAfterPlay (baserunning plays)', function() {
  it('[batter,first,null,null] + PO1(13) -> [null,null,null]', function() {
    let o = Event.parseRawEvent("PO1(13)");
    assert.deepEqual([null, null, null], Event.determineBasesOccupiedAfterPlay(o, ["batter", "first", null, null]).basesOccupiedAfterPlay);
  });
  it('[batter,first,null,null] + CS2(26) -> [null,null,null]', function() {
    let o = Event.parseRawEvent("CS2(26)");
    assert.deepEqual([null, null, null], Event.determineBasesOccupiedAfterPlay(o, ["batter", "first", null, null]).basesOccupiedAfterPlay);
  });
  it('[batter,first,null,null] + K+CS2(26) -> [null,null,null]', function() {
    let o = Event.parseRawEvent("K+CS2(26)");
    assert.deepEqual([null, null, null], Event.determineBasesOccupiedAfterPlay(o, ["batter", "first", null, null]).basesOccupiedAfterPlay);
  });
  it('[batter,first,null,null] + POCS2(1361) -> [null,null,null]', function() {
    let o = Event.parseRawEvent("POCS2(1361)");
    assert.deepEqual([null, null, null], Event.determineBasesOccupiedAfterPlay(o, ["batter", "first", null, null]).basesOccupiedAfterPlay);
  });
  it('[batter,first,null,third] + POCS2(1361) -> [null,null,third]', function() {
    let o = Event.parseRawEvent("POCS2(1361)");
    assert.deepEqual([null, null, "third"], Event.determineBasesOccupiedAfterPlay(o, ["batter", "first", null, "third"]).basesOccupiedAfterPlay);
  });
  it('[batter,first,null,null] + SB2 -> [null,first,null]', function() {
    let o = Event.parseRawEvent("SB2");
    assert.deepEqual([null, "first", null], Event.determineBasesOccupiedAfterPlay(o, ["batter", "first", null, null]).basesOccupiedAfterPlay);
  });
  it('[batter,null,null,third] + SBH -> [null,null,null]', function() {
    let o = Event.parseRawEvent("SBH");
    assert.deepEqual([null, null, null], Event.determineBasesOccupiedAfterPlay(o, ["batter", null, null, "third"]).basesOccupiedAfterPlay);
  });
  it('[batter,null,second,null] + E3/TH/G.2-H(NR);B-2 -> [null,batter,null]', function() {
    let o = Event.parseRawEvent("E3/TH/G.2-H(NR);B-2");
    assert.deepEqual([null, "batter", null], Event.determineBasesOccupiedAfterPlay(o, ["batter", null, "second", null]).basesOccupiedAfterPlay);
    let rsby = Event.determineRunsScoredBy(o, ["batter", null, "second", null]);
    assert.equal(1, rsby.length);
    assert.equal(rsby[0].runner, "second");
  });
  it('[batter,first,second,null] + 46(1)/FO/G.2-3 -> [batter,null,second]', function() {
    let o = Event.parseRawEvent("46(1)/FO/G.2-3");
    assert.deepEqual(["batter",null,"second"], Event.determineBasesOccupiedAfterPlay(o, ["batter","first","second",null]).basesOccupiedAfterPlay);
    let defense = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
    let outs = Event.determineOuts(o, ["batter","first","second",null], defense);
    assert.equal(1, outs.length);
    assert.equal(outs[0].runnerId, "first");
  });
});

describe('Event.determineBasesOccupiedAfterPlay (explicits, runners on)', function() {
  it('[batter,null,second,third] + D9.2-H;3-H -> [null,batter,null]', function() {
    let o = Event.parseRawEvent("D9.2-H;3-H");
    assert.deepEqual([null,"batter",null], Event.determineBasesOccupiedAfterPlay(o, ["batter", null, "second", "third"]).basesOccupiedAfterPlay);
  });
  it('[batter,first,null,null] + S7.1-3 -> [batter,null,first]', function() {
    let o = Event.parseRawEvent("S7.1-3");
    assert.deepEqual(["batter",null,"first"], Event.determineBasesOccupiedAfterPlay(o, ["batter", "first", null, null]).basesOccupiedAfterPlay);
  });
  it('[batter,first,null,null] + E1/TH/BG15.1-3 -> [batter,null,first]', function() {
    let o = Event.parseRawEvent("E1/TH/BG15.1-3");
    assert.deepEqual(["batter",null,"first"], Event.determineBasesOccupiedAfterPlay(o, ["batter", "first", null, null]).basesOccupiedAfterPlay);
  });
  it('[batter,first,second,null] + S7.1-2;2XH -> [batter,first,null]', function() {
    let o = Event.parseRawEvent("S7.1-2;2XH");
    assert.deepEqual(["batter","first",null], Event.determineBasesOccupiedAfterPlay(o, ["batter", "first", "second", null]).basesOccupiedAfterPlay);
  });
  it('[batter,first,null,null] + SH.1-2 -> [null,first,null]', function() {
    let o = Event.parseRawEvent("SH.1-2");
    assert.deepEqual([null,"first",null], Event.determineBasesOccupiedAfterPlay(o, ["batter", "first", null, null]).basesOccupiedAfterPlay);
  });
  it('54(B)/BG+/SH.1-2', function() {
    let o = Event.parseRawEvent("54(B)/BG+/SH.1-2");
    assert.deepEqual([null,"first",null], Event.determineBasesOccupiedAfterPlay(o, ["batter", "first", null, null]).basesOccupiedAfterPlay);
  });
});

describe('Ball In Play location tests', function() {
  it('7/F7 -> fly ball, left field', function() {
    let o = Event.parseRawEvent("7/F7");
    let bip = Event.getBallInPlay(o);
    assert.equal(true, bip.flyBall);
    assert.equal("7", bip.location);
    assert.equal(false, bip.bunt);
  });
  it('53/BG-/SH.1-2 -> bunt, null location', function() {
    let o = Event.parseRawEvent("53/BG-/SH.1-2");
    assert.equal(true, Event.getIsSacBunt(o));
    let bip = Event.getBallInPlay(o);
    assert.equal(true, bip.bunt);
    assert.equal(null, bip.location);
    assert.equal(true, bip.soft);
  });
  it('7/F7/G8 -> error', function() {
    assert.throws(() => {
      let o = Event.parseRawEvent("7/F7/G8");
      Event.getBallInPlay(o);
    }, /Duplicate.+modifiers/);
  });
  it('S4/P4MS', function() {
    let o = Event.parseRawEvent("S4/P4MS");
    let bip = Event.getBallInPlay(o);
    assert.equal(true, bip.popup);
    assert.equal("4MS", bip.location);
  });
  it('Multiple BIP: HR/8/L.3-H', function() {
    let o = Event.parseRawEvent("HR/8/L.3-H");
    let bip = Event.getBallInPlay(o);
    assert.equal(true, bip.lineDrive);
    assert.equal("8", bip.location);
  });
});

describe('Recorded outs', function() {
  it('no outs at all', function() {
    assert.equal(0, Event.determineOutsRecorded([]));
  });
  it('1 normal out', function() {
    assert.equal(1, Event.determineOutsRecorded([{ "recorded": true}]));
  });
  it('1 normal out, 1 non-recorded out', function() {
    assert.equal(1, Event.determineOutsRecorded([{ "recorded": true}, { "recorded": false}]));
  });
});

describe('determineOuts: double plays in various forms', function() {
  let defense = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
  it('7/L+/DP.1X1(763)', function() {
    let o = Event.parseRawEvent("7/L+/DP.1X1(763)");
    let outs = Event.determineOuts(o, ["batter", "first", null, null], defense);
    let bip = Event.getBallInPlay(o);
    assert.equal(2, outs.length);
    assert.equal(2, Event.determineOutsRecorded(outs));
    assert.equal(true, bip.lineDrive);
    let out = outs[0];
    assert.equal("7", out.play);
    assert.equal("B", out.runnerStartingBase);
    assert.equal("batter", out.runnerId);
    assert.equal("7", out.putoutFielderPosition);
    assert.equal("LF", out.putoutFielderId);
    assert.equal(0, out.assistFielders.length);
    out = outs[1];
    assert.equal("763", out.play);
    assert.equal("1", out.runnerStartingBase);
    assert.equal("first", out.runnerId);
    assert.equal("3", out.putoutFielderPosition);
    assert.equal("1B", out.putoutFielderId);
    assert.equal(2, out.assistFielders.length);
    assert.equal("7", out.assistFielders[0].fielderPosition);
    assert.equal("LF", out.assistFielders[0].fielderId);
    assert.equal("6", out.assistFielders[1].fielderPosition);
    assert.equal("SS", out.assistFielders[1].fielderId);
    assert.ok(Event.isDoublePlay(o));
  });
  it('7/LDP.1X1(763)', function() {
    let o = Event.parseRawEvent("7/LDP.1X1(763)");
    let outs = Event.determineOuts(o, ["batter", "first", null, null], defense);
    let bip = Event.getBallInPlay(o);
    assert.equal(true, bip.lineDrive);
    assert.equal(2, outs.length);
    assert.equal(2, Event.determineOutsRecorded(outs));
    let out = outs[0];
    assert.equal("7", out.play);
    assert.equal("B", out.runnerStartingBase);
    assert.equal("batter", out.runnerId);
    assert.equal("7", out.putoutFielderPosition);
    assert.equal("LF", out.putoutFielderId);
    assert.equal(0, out.assistFielders.length);
    out = outs[1];
    assert.equal("763", out.play);
    assert.equal("1", out.runnerStartingBase);
    assert.equal("first", out.runnerId);
    assert.equal("3", out.putoutFielderPosition);
    assert.equal("1B", out.putoutFielderId);
    assert.equal(2, out.assistFielders.length);
    assert.equal("7", out.assistFielders[0].fielderPosition);
    assert.equal("LF", out.assistFielders[0].fielderId);
    assert.equal("6", out.assistFielders[1].fielderPosition);
    assert.equal("SS", out.assistFielders[1].fielderId);
    assert.ok(Event.isDoublePlay(o));
  });
});

describe('Pickoff error', function() {
  it('PO2(E2/TH).2-3;1-2', function() {
    let o = Event.parseRawEvent("PO2(E2/TH).2-3;1-2");
    assert.equal("PO2(E2/TH)", o.basicPlay);
    assert.equal(0, o.modifiers.length);
    assert.equal(2, o.advances.length);
  });
  it('PO2(E2/TH)/UREV.2-3;1-2', function() {
    let o = Event.parseRawEvent("PO2(E2/TH)/UREV.2-3;1-2");
    assert.equal("PO2(E2/TH)", o.basicPlay);
    assert.equal("UREV", o.modifiers[0]);
    assert.equal(2, o.advances.length);
  });
});

describe('Advances detail', function() {
  it('[1-2]', function() {
    let o = Event.parseAdvancesDetail(["1-2"]);
    assert.equal(1, o.length);
    assert.equal("1", o[0].startingBase);
    assert.equal("advance", o[0].type);
    assert.equal("2", o[0].endingBase);
    assert.equal(0, o[0].parameters.length);
  });
  it('[1-2], [2-3]', function() {
    let o = Event.parseAdvancesDetail(["1-2", "2-3"]);
    assert.equal(2, o.length);
  });
  it('[1-2], [2X3]', function() {
    let o = Event.parseAdvancesDetail(["1-2", "2X3"]);
    assert.equal(2, o.length);
    assert.equal(true, o[0].runnerSafe);
    assert.equal("advance", o[0].type);
    assert.equal("out", o[1].type);
  });
  it('XFOO [3-H(UR)]', function() {
    let o = Event.parseAdvancesDetail(["3-H(UR)"]);
    console.log(JSON.stringify(o));
    assert.equal(1, o.length);
    assert.equal("3", o[0].startingBase);
    assert.equal(true, o[0].runnerSafe);
    assert.equal("advance", o[0].type);
    assert.equal("H", o[0].endingBase);
    assert.equal(1, o[0].parameters.length);
    assert.equal("UR", o[0].parameters[0].parameter);
    assert.equal(0, o[0].parameters[0].modifiers.length);
  });
  it('[3-H(UR)(NR)]', function() {
    let o = Event.parseAdvancesDetail(["3-H(UR)(NR)"]);
    assert.equal(1, o.length);
    assert.equal("3", o[0].startingBase);
    assert.equal(true, o[0].runnerSafe);
    assert.equal("advance", o[0].type);
    assert.equal("H", o[0].endingBase);
    assert.equal(2, o[0].parameters.length);
    assert.equal("UR", o[0].parameters[0].parameter);
    assert.equal("NR", o[0].parameters[1].parameter);
  });
  it('[3XH(E7/TH)]', function() {
    let o = Event.parseAdvancesDetail(["3XH(E7/TH)"]);
    assert.equal(1, o.length);
    assert.equal("3", o[0].startingBase);
    assert.equal(true, o[0].runnerSafe);
    assert.equal("safe-on-error", o[0].type);
    assert.equal("H", o[0].endingBase);
    assert.equal(1, o[0].parameters.length);
    assert.equal("E7", o[0].parameters[0].parameter);
    assert.equal(1, o[0].parameters[0].modifiers.length);
    assert.equal("TH", o[0].parameters[0].modifiers[0]);
  });
  it('[2X3(5/INT)]', function() {
    let o = Event.parseAdvancesDetail(["2X3(5/INT)"]);
    assert.equal(1, o.length);
    assert.equal(false, o[0].runnerSafe);
    assert.equal("out", o[0].type);
  });
});

describe('RBI calculations', function() {
  it('No RBI on single', function() {
    let e = Event.parseEvent("S7/G78", ["batter", null, null, null], 0, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.equal(0, e.rbi);
  });
  it('No RBI on single with 2-3 advance', function() {
    let e = Event.parseEvent("S7/G78.2-3", ["batter", null, "2d", null], 0, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.equal(0, e.rbi);
  });
  it('Solo HR', function() {
    let e = Event.parseEvent("HR", ["batter", null, null, null], 0, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.equal(1, e.rbi);
  });
  it('Grand slam', function() {
    let e = Event.parseEvent("HR/7D.3-H;2-H;1-H", ["batter", "1st", "2d", "3d"], 2, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.equal(4, e.rbi);
  });
  it('Solo HR (H)', function() {
    let e = Event.parseEvent("H", ["batter", null, null, null], 0, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.equal(1, e.rbi);
  });
  it('ITP HR', function() {
    let e = Event.parseEvent("HR7", ["batter", null, null, null], 0, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.equal(1, e.rbi);
  });
  it('Single with 2-H advance', function() {
    let e = Event.parseEvent("S7/G78.2-H", ["batter", null, "2d", null], 0, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.equal(1, e.rbi);
  });
  it('Single with 2-H+3-H advance', function() {
    let e = Event.parseEvent("S7/G78.3-H;2-H", ["batter", null, "2d", "3d"], 0, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.equal(2, e.rbi);
  });
  it('Single with 2-H+3-H advance but error allowing 2-H', function() {
    let e = Event.parseEvent("S7/G78.3-H;2XH(E7/TH)", ["batter", null, "2d", "3d"], 0, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.equal(1, e.rbi);
  });
  it('Fielders Choice', function() {
    let e = Event.parseEvent("FC5/G5-.3-H;2-2", ["batter", null, "2d", "3d"], 0, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.equal(1, e.rbi);
  });
  it('Sac Fly', function() {
    let e = Event.parseEvent("SF9/F9D.3-H;2-3", ["batter", null, "2d", "3d"], 0, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.equal(1, e.rbi);
  });
  it('No RBI on GDP', function() {
    let e = Event.parseEvent("64(1)3/GDP.3-H", ["batter", "1st", null, "3d"], 0, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.equal(0, e.rbi);
  });
  it('No RBI on K', function() {
    let e = Event.parseEvent("K23.3-H(TH)", ["batter", null, null, "3d"], 0, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.equal(0, e.rbi);
  });
  it('No RBI on E with runner at 2B', function() {
    let e = Event.parseEvent("E7/F7S.2-H", ["batter", null, "2d", null], 0, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.equal(0, e.rbi);
  });
  it('RBI on E with runner at 3B and < 2 out', function() {
    let e = Event.parseEvent("E6/G6+.3-H", ["batter", null, null, "3d"], 1, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.equal(1, e.rbi);
  });
  it('No RBI on E with runner at 3B and 2 out', function() {
    let e = Event.parseEvent("E6/G6+.3-H", ["batter", null, null, "3d"], 2, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.equal(0, e.rbi);
  });
  it('RBI on E with runner at 3B and < 2 out *negated* by NR parameter', function() {
    let e = Event.parseEvent("E6/G6+.3-H(NR)", ["batter", null, null, "3d"], 1, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.equal(0, e.rbi);
  });
});

describe('Error determinations', function() {
  it('No errors', function() {
    let errors = Event.determineErrors(Event.parseRawEvent("S7/G78"), ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.deepEqual([], errors);
  });
  it('Basic fielding error', function() {
    let errors = Event.determineErrors(Event.parseRawEvent("E7/G78"), ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.deepEqual(["7"], errors);
  });
  it('Throwing error allowing advance', function() {
    let errors = Event.determineErrors(Event.parseRawEvent("S7/G78.1-3(E7/TH)"), ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.deepEqual(["7"], errors);
  });
  it('Fielding error compounded by infielder error allowing advance', function() {
    let errors = Event.determineErrors(Event.parseRawEvent("E7/G78.2XH(E2)"), ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.deepEqual(["7","2"], errors);
  });
  it('Interference error', function() {
    let errors = Event.determineErrors(Event.parseRawEvent("C/E2"), ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.deepEqual(["2"], errors);
  });
  it('Pickoff error', function() {
    let errors = Event.determineErrors(Event.parseRawEvent("PO1(E3)"), ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.deepEqual(["3"], errors);
  });
});

describe('Double steal', function() {
  it('SB2;SB3', function() {
    let enhancedEvent = Event.parseEvent("SB2;SB3", ["b", "1", "2", null], 1, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.deepEqual([null, "1", "2"], enhancedEvent.basesOccupiedAfterPlay);
  });
  it('K+SB2;SB3', function() {
    let enhancedEvent = Event.parseEvent("SB2;SB3", ["b", "1", "2", null], 1, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.deepEqual([null, "1", "2"], enhancedEvent.basesOccupiedAfterPlay);
  });
});

describe('Inferred bip trajectory', function() {
  it('63', function() {
    let enhancedEvent = Event.parseEvent("63", ["b", null, null, null], 1, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    let bip = enhancedEvent.ballInPlay;
    assert.ok(bip.groundBall);
    assert.ok(!bip.flyBall);
  });
  it('3', function() {
    let enhancedEvent = Event.parseEvent("3", ["b", null, null, null], 1, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    let bip = enhancedEvent.ballInPlay;
    assert.ok(!bip.groundBall);
    assert.ok(bip.flyBall);
  });
  it('3/G', function() {
    let enhancedEvent = Event.parseEvent("3/G", ["b", null, null, null], 1, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    let bip = enhancedEvent.ballInPlay;
    assert.ok(bip.groundBall);
    assert.ok(!bip.flyBall);
  });
  it('3/BG', function() {
    let enhancedEvent = Event.parseEvent("3/BG", ["b", null, null, null], 1, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    let bip = enhancedEvent.ballInPlay;
    assert.ok(bip.groundBall);
    assert.ok(bip.bunt);
    assert.ok(!bip.flyBall);
  });
  it('7', function() {
    let enhancedEvent = Event.parseEvent("7", ["b", null, null, null], 1, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    let bip = enhancedEvent.ballInPlay;
    assert.ok(!bip.groundBall);
    assert.ok(bip.flyBall);
  });
});

describe('Random bugfixes', function() {
  it('Error allowing runner advance', function() {
    let enhancedEvent = Event.parseEvent("S1/BG/56S.2-H(E1/TH)(UR)(NR);1-3;B-2", ["batter", "first", "second", null], 1, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    console.log(JSON.stringify(enhancedEvent, null, 2));
  });
  it('2017 WS Game 7 LAN 5th Turner single to third', function() {
    let enhancedEvent = Event.parseEvent("S57/G.1-2", ["turner", "seager", null, null], 1, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.deepEqual(["turner", "seager", null], enhancedEvent.basesOccupiedAfterPlay);
  });
  it('Empty outs array on S5/G.B-2(E5/TH)', function() {
    let enhancedEvent = Event.parseEvent("S5/G.B-2(E5/TH)", ["batter", null, null, null], 1, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.deepEqual([], enhancedEvent.outs);
  });
  it('FC not properly handled', function() {
    let enhancedEvent = Event.parseEvent("FC1/BG.2X3(15)", ["batter", null, "second", null], 1, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.deepEqual(["batter", null, null], enhancedEvent.basesOccupiedAfterPlay);
  });
  it('POCS (2017 WS Game 5)', function() {

    let runners = [
      {
        "batting_player_id": "puig",
        "responsible_pitcher_player_id": "keucd001"
      },
      {
        "batting_player_id": "forsl001",
        "responsible_pitcher_player_id": "keucd001"
      },
      null,
      {
        "batting_player_id": "herne001",
        "responsible_pitcher_player_id": "keucd001"
      }
    ];

    let enhancedEvent = Event.parseEvent("POCS2(1E3).3-H(UR)", runners, 0, ["keucd001", '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.deepEqual([null, { "batting_player_id": "forsl001", "responsible_pitcher_player_id": "keucd001" }, null], enhancedEvent.basesOccupiedAfterPlay);
    assert.deepEqual([
      {
        "runner": {
          "batting_player_id": "herne001",
          "responsible_pitcher_player_id": "keucd001"
        },
        "scoredFrom": "3",
        "unearnedIndicated": 1,
        "noRbiIndicated": 0
      }
    ], enhancedEvent.runsScoredBy);
    assert.deepEqual([
      {
        "recorded": false,
        "play": "1E3",
        "runnerStartingBase": "1",
        "runnerId": {
          "batting_player_id": "forsl001",
          "responsible_pitcher_player_id": "keucd001"
        },
        "putoutFielderPosition": null,
        "putoutFielderId": null,
        "assistFielders": [
          {
            "fielderPosition": "1",
            "fielderId": "keucd001"
          }
        ]
      }
    ], enhancedEvent.outs);
    assert.equal(0, enhancedEvent.outsRecorded);
    assert.equal("POCS", enhancedEvent.playCode);
  });

  it('Failed double-steal, one runner caught, the other advances', function() {
    let enhancedEvent = Event.parseEvent("CS3(25).1-2(TH)", ["batter", "first", "second", null], 1, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.deepEqual([null, "first", null], enhancedEvent.basesOccupiedAfterPlay);
  });

  it('Successful double-steal', function() {
    let enhancedEvent = Event.parseEvent("SB3;SB2", ["batter", "first", "second", null], 1, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.deepEqual([null, "first", "second"], enhancedEvent.basesOccupiedAfterPlay);
    assert.deepEqual(["first", "second"], enhancedEvent.baseStealers);
  });

  it('RBI probs', function() {
    let enhancedEvent = Event.parseEvent("W+WP.3-H;2XH(2516)", ["batter", null, "second", "third"], 1, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.equal(1, enhancedEvent.runs);
    assert.equal(0, enhancedEvent.rbi);
  });

  it('W+SB', function() {
    let enhancedEvent = Event.parseEvent("W+SB3", ["batter", null, "second", null], 1, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.deepEqual(["batter", null, "second"], enhancedEvent.basesOccupiedAfterPlay);
  });

  it('SB plus out', function() {
    let enhancedEvent = Event.parseEvent("SB2", ["batter", "first", null, null], 1, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.deepEqual([null, "first", null], enhancedEvent.basesOccupiedAfterPlay);
    assert.deepEqual(["first"], enhancedEvent.baseStealers);
    enhancedEvent = Event.parseEvent("SB2.1X3(285)", ["batter", "first", null, null], 1, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.deepEqual([null, null, null], enhancedEvent.basesOccupiedAfterPlay);
    assert.deepEqual(["first"], enhancedEvent.baseStealers);
  });

  it('SBH bug', function() {
    let enhancedEvent = Event.parseEvent("SBH", ["batter", "first", null, "third"], 1, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.deepEqual(["first", null, null], enhancedEvent.basesOccupiedAfterPlay);
    assert.deepEqual(1, enhancedEvent.runsScoredBy.length);
    assert.equal("third", enhancedEvent.runsScoredBy[0].runner);
  });

  it('SB3', function() {
    let enhancedEvent = Event.parseEvent("SB3", ["batter", null, "second", null], 1, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.deepEqual([null, null, "second"], enhancedEvent.basesOccupiedAfterPlay);
    assert.equal(2, enhancedEvent.baseStealers.length);
    assert.equal(null, enhancedEvent.baseStealers[0]);
    assert.equal("second", enhancedEvent.baseStealers[1]);
  });

});

// end
