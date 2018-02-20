"use strict";

function parseEvent(eventText, baseStateBeforePlay, defensivePlayers) {

  if (arguments.length != 2) {
    throw new Error("parseEvent requires eventText, baseStateBeforePlay, and defensivePlayers arguments");
  }

  let rawEvent = parseRawEvent(eventText);

  let ret = new Object();

  ret.outs = determineOuts(rawEvent, baseStateBeforePlay, defensivePlayers);
  ret.outsRecorded = determineOutsRecorded(ret.outs);

  ret.runsScoredBy = determineRunsScoredBy(rawEvent, baseStateBeforePlay);
  ret.runs = ret.runsScoredBy.length;

  ret.basesOccupiedAfterPlay = determineBasesOccupiedAfterPlay(rawEvent);

  let playCode = getPlayCode(rawEvent);

  ret.atBat = !(["W","IW","HP","C"].includes(playCode));
  ret.single = playCode === 'S';
  ret.double = playCode === 'D';
  ret.triple = playCode === 'T';
  ret.homeRun = ["H","HR"].includes(playCode);
  ret.hit = ret.single || ret.double || ret.triple || ret.homeRun;
  ret.walk = ["W","IW"].includes(playCode);
  ret.balk = playCode === 'BK';
  ret.stolenBase = playCode === 'SB';
  ret.caughtStealing = playCode === 'CS';
  ret.pickoff = playCode === 'PO';
  ret.strikeout = playCode === 'K';
  ret.hitByPitch = playCode === 'HP';
  ret.sacrificeFly = getIsSacFly(rawEvent);
  ret.sacrificeBunt = getIsSacBunt(rawEvent);
  ret.fieldersChoice = playCode === 'FC';
  ret.forceOut = playCode === 'FO';

  ret.ballInPlay = getBallInPlay(rawEvent);

  // Cannot determine if a play is an error without knowing how many outs there are.  Have to defer this to the calling context.
  // And therefore also, because determination of an RBI requires knowing whether there is an error...we have to defer RBI determination too

  return ret;

}

function getBallInPlay(rawEvent) {
  // todo: do we want to infer bip locations from base play notations...e.g., S7 means "middle" left field, 63 means "normal" ground ball to shortstop?
  // for now, we do not.  and i don't think we should...implies an accuracy that is not intended/supported by data.
  var ret = null;
  rawEvent.modifiers.forEach(function(modifier, index) {
    if (modifier === "LDP") {
      modifier = "L";
    } else if (modifier === "GDP") {
      modifier = "G";
    }
    let components = modifier.match(/^([B])?([FPGL])([0-9]*)(\+|\-)?/);
    if (components != null) {
      if (ret != null) {
        throw new Error("Multiple ball-in-play modifiers: " + rawEvent.rawText);
      }
      ret = new Object;
      ret.bunt = components[1] != null;
      ret.flyBall = components[2] === "F";
      ret.popup = components[2] === "P";
      ret.groundBall = components[2] === "G";
      ret.lineDrive = components[2] === "L";
      ret.location = components[3] == null || components[3] === '' ? null : components[3];
      ret.soft = "-" === components[4];
      ret.hard = "+" === components[4];
    }
  });
  return ret;
}

function getIsSacFly(rawEvent) {
  return rawEvent.modifiers.reduce(function(accumulator, currentValue) { return accumulator |= (/^SF/.test(currentValue) ? true : false); }, false);
}

function getIsSacBunt(rawEvent) {
  return rawEvent.modifiers.reduce(function(accumulator, currentValue) { return accumulator |= (/^SH/.test(currentValue) ? true : false); }, false);
}

function getPlayCode(rawEvent) {
  let outRegex = /^([0-9]+)[\/\.$]/;
  let testRegex = outRegex;
  if (!outRegex.test(rawEvent.basicPlay)) {
    let kwPlusRegex = /^([KW])\+.+/;
    if (kwPlusRegex.test(rawEvent.basicPlay)) {
      testRegex = kwPlusRegex;
    } else {
      testRegex = /^([A-Z]+)[\/\.0-9$]+/;
    }
  }
  return rawEvent.basicPlay.replace(testRegex, "$1");
}

function parseRawEvent(eventText) {

  let ret = new Object();

  let outerRegex = /([^\.]+)\.(.+)?/;
  let innerRegex = /([^\/]+)\/(.+)*/;
  let modifiersRegex = /[^\/]+\//;
  let advancesRegex = /[^\.]+\./;

  let basicPlayAndModifiers = eventText.replace(outerRegex, "$1");
  ret.advances = advancesRegex.test(eventText) ? eventText.replace(outerRegex, "$2").split(";") : [];

  ret.basicPlay = basicPlayAndModifiers.replace(innerRegex, "$1");
  ret.modifiers = modifiersRegex.test(basicPlayAndModifiers) ? basicPlayAndModifiers.replace(innerRegex, "$2").split("/") : [];
  ret.rawText = eventText;

  return ret;

}

function parseAssistFielders(fielders, defensivePlayers) {
  let assistFielders = [];
  let assistPos = [];
  if (fielders != null && fielders.length > 1) {
    for (let j=0;j < fielders.length-1;j++) {
      let fielderChar = fielders.charAt(j);
      if (fielderChar === "E") {
        break;
      }
      let ao = new Object;
      ao.fielderPosition = fielderChar;
      ao.fielderId = defensivePlayers[ao.fielderPosition - 1];
      // only get one assist per out (e.g., in a rundown play)
      if (!assistPos.includes(fielderChar)) {
        assistFielders.push(ao);
        assistPos.push(fielderChar);
      }
    }
  }
  return assistFielders;
}

function determineOutsRecorded(outs) {
  return outs.reduce(function(accumulator, currentValue) { return accumulator += currentValue.recorded; }, 0);
}

function determineOuts(rawEvent, baseStateBeforePlay, defensivePlayers) {

  let outs = [];

  // batter outs
  let outSpecs = rawEvent.basicPlay.match(/^([0-9]+)(\([B123]\))?([0-9]+)?(\([B123]\))?([0-9]+)?(\([B123]\))?$/);
  if (outSpecs != null) {
    let numOuts = (outSpecs.length - 1) / 2;
    let priorPutoutFielderPosition = null;
    for (let i=1;i < numOuts*2;i+=2) {
      let fielders = outSpecs[i];
      if (fielders != null) {
        if (i > 1 && !RegExp("^" + priorPutoutFielderPosition).test(fielders)) {
          fielders = priorPutoutFielderPosition + fielders;
        }
        let runner = outSpecs[i+1];
        let runnerStartingBase = runner == null ? "B" : runner.replace(/\(([B123])\)/, "$1");
        runner = runnerStartingBase === "B" ? 0 : Number.parseInt(runnerStartingBase);
        let runnerId = baseStateBeforePlay[runner];
        let putoutFielderPosition = fielders.substr(-1, 1);
        priorPutoutFielderPosition = putoutFielderPosition;
        putoutFielderPosition = Number.parseInt(putoutFielderPosition);
        let putoutFielderId = defensivePlayers[putoutFielderPosition - 1];
        let assistFielders = parseAssistFielders(fielders, defensivePlayers);
        let out = new Object;
        out.play = fielders;
        out.runnerStartingBase = runnerStartingBase;
        out.runnerId = runnerId;
        out.putoutFielderPosition = putoutFielderPosition;
        out.putoutFielderId = putoutFielderId;
        out.assistFielders = assistFielders;
        out.recorded = true;
        outs.push(out);
      }
    }
  }

  let getBaserunningOut = function(advanceOutSpec) {
    let out = null;
    if (advanceOutSpec != null) {
      let runnerStartingBase = advanceOutSpec[1];
      let fielders = advanceOutSpec[2];
      if (fielders != null) {
        fielders = fielders.replace(/\(([1-9E]+).*\)/, "$1");
        let runner = runnerStartingBase === "B" ? 0 : Number.parseInt(runnerStartingBase);
        let runnerId = baseStateBeforePlay[runner];
        out = new Object;
        let putoutFielderPosition = null;
        let putoutFielderId = null;
        out.recorded = false;
        if (!fielders.match(/E/)) {
          putoutFielderPosition = fielders == null ? null : Number.parseInt(fielders.substr(-1, 1));
          putoutFielderId = putoutFielderPosition == null ? null : defensivePlayers[putoutFielderPosition - 1];
          out.recorded = true;
        }
        let assistFielders = parseAssistFielders(fielders, defensivePlayers);
        out.play = fielders;
        out.runnerStartingBase = runnerStartingBase;
        out.runnerId = runnerId;
        out.putoutFielderPosition = putoutFielderPosition;
        out.putoutFielderId = putoutFielderId;
        out.assistFielders = assistFielders;
      }
    }
    return out;
  }

  // baserunning (advances) outs
  rawEvent.advances.forEach(function(advance) {
    let outAdvance = advance.match(/([B123])X(?:[123H])(\([1-9E]+.*\))/);
    let out = getBaserunningOut(outAdvance);
    if (out != null) {
      outs.push(out);
    }
  });

  // caught stealing
  let cs = rawEvent.basicPlay.match(/CS([23H])(\([1-9E]+.*\))/);
  if (cs != null) {
    cs[1] = cs[1] === "H" ? "3" : cs[1] - 1 + "";
  }
  let out = getBaserunningOut(cs);
  if (out != null) {
    outs.push(out);
  }

  // pickoff
  let po = rawEvent.basicPlay.match(/PO([123])(\([1-9E]+.*\))/);
  out = getBaserunningOut(po);
  if (out != null) {
    outs.push(out);
  }

  // strikeout
  let kk = rawEvent.basicPlay.match(/^K([0-9]+)?/);
  if (kk != null && !rawEvent.advances.includes("B-1")) {
    out = new Object;
    let fielders = kk[1];
    out.play = rawEvent.basicPlay;
    out.runnerStartingBase = "B";
    out.runnerId = baseStateBeforePlay[0];
    out.putoutFielderPosition = fielders == null ? 2 : Number.parseInt(fielders.substr(-1, 1));
    out.assistFielders = parseAssistFielders(fielders, defensivePlayers);
    out.putoutFielderId = defensivePlayers[out.putoutFielderPosition-1];
    out.recorded = true;
    outs.push(out);
  }

  return outs;

}

function determineRunsScoredBy(rawEvent, baseStateBeforePlay) {
  let ret = [];
  if (/^HR?[1-9]?$/.test(rawEvent.basicPlay)) {
    // home run
    let score = new Object;
    score.runner = baseStateBeforePlay[0];
    score.unearnedIndicated = false;
    score.noRbiIndicated = false;
    ret.push(score);
  }
  let scoreAdvanceRegex = /^([B123])(?:-H|XH\().*/;
  rawEvent.advances.forEach(function(currentValue) {
    if (scoreAdvanceRegex.test(currentValue)) {
      let baseFromStr = currentValue.replace(scoreAdvanceRegex, "$1");
      let baseFrom = baseFromStr === 'B' ? 0 : Number.parseInt(baseFromStr);
      let score = new Object;
      score.runner = baseStateBeforePlay[baseFrom];
      score.unearnedIndicated = /\(UR\)/.test(currentValue);
      score.noRbiIndicated = /\((?:NR|NORBI)\)/.test(currentValue);
      ret.push(score);
    }
  });
  return ret;
}

function determineBasesOccupiedAfterPlay(rawEvent, baseStateBeforePlay) {

  // spec is not entirely clear if "implicit" advances are possible...i.e., runner on first, batter walks.  does the .1-2 advance have to be specified?  we assume so, but if
  //  we find this isn't the case, and sometimes advances are assumed, we'll have some work to do here.

  let ret = baseStateBeforePlay.slice(1, 4);

  let advanceRegex = /^([B123])-([123H])/;

  rawEvent.advances.forEach(function(value) {
    let preState = value.replace(advanceRegex, "$1");
    if (preState != "B") {
      ret[Number.parseInt(preState)-1] = null;
    }
  });

  ret[0] = /^(?:S[1-9]?|E[1-9]?|W|IW|I|HP|C)$/.test(rawEvent.basicPlay) ? baseStateBeforePlay[0] : ret[0];
  ret[1] = /^D[1-9]?$/.test(rawEvent.basicPlay) ? baseStateBeforePlay[0] : ret[1];
  ret[2] = /^T[1-9]?$/.test(rawEvent.basicPlay) ? baseStateBeforePlay[0] : ret[2];

  rawEvent.advances.forEach(function(value) {
    if (advanceRegex.test(value)) {
      let preState = value.replace(advanceRegex, "$1");
      let postState = value.replace(advanceRegex, "$2");
      if (postState != "H") {
        if (preState === "B") {
          preState = "0";
        }
        ret[Number.parseInt(postState)-1] = baseStateBeforePlay[Number.parseInt(preState)];
      }
    }
  });

  let poRegex = /^(?:PO|K\+PO)([123])/;

  if (poRegex.test(rawEvent.basicPlay)) {
    let base = Number.parseInt(rawEvent.basicPlay.replace(poRegex, "$1"));
    ret[base-1] = null;
  }

  let csRegex = /^(?:POCS|CS|K\+CS)([23H])/;

  if (csRegex.test(rawEvent.basicPlay)) {
    let baseStr = rawEvent.basicPlay.replace(csRegex, "$1");
    let base = (baseStr === 'H' ? 3 : Number.parseInt(baseStr) - 1);
    ret[base-1] = null;
  }

  return ret;

}

module.exports.parseRawEvent = parseRawEvent;
module.exports.parseEvent = parseEvent;
module.exports.determineBasesOccupiedAfterPlay = determineBasesOccupiedAfterPlay;
module.exports.determineRunsScoredBy = determineRunsScoredBy;
module.exports.determineOuts = determineOuts;
module.exports.determineOutsRecorded = determineOutsRecorded;
module.exports.getBallInPlay = getBallInPlay;
module.exports.getIsSacFly = getIsSacFly;
module.exports.getIsSacBunt = getIsSacBunt;
module.exports.getPlayCode = getPlayCode;
