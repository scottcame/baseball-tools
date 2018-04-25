"use strict";

function parseEvent(eventText, baseStateBeforePlay, outsBeforePlay, defensivePlayers) {

  if (arguments.length != 4) {
    throw new Error("parseEvent requires eventText, baseStateBeforePlay, outsBeforePlay, and defensivePlayers arguments");
  }

  let rawEvent = parseRawEvent(eventText);

  if (rawEvent == null) {
    // todo: right?
    return null;
  }

  if (baseStateBeforePlay == null) {
    throw new Error("Must provide non-null prior base state");
  } else {
    if (baseStateBeforePlay[0] == null) {
      throw new Error("Every play must have a batter");
    } else {
      let pastValues = [];
      baseStateBeforePlay.forEach(function(value) {
        if (pastValues.includes(value)) {
          throw new Error("Same runner cannot occupy multiple bases");
          pastValues.push(value);
          console.log(JSON.stringify(pastValues));
        }
      });
    }
  }

  let ret = new Object();
  ret.rawEvent = rawEvent;

  ret.playCode = getPlayCode(rawEvent);

  ret.outs = determineOuts(rawEvent, baseStateBeforePlay, defensivePlayers);

  ret.outsRecorded = determineOutsRecorded(ret.outs);
  ret.outsAfterPlay = outsBeforePlay + ret.outsRecorded;
  ret.doublePlay = isDoublePlay(rawEvent);
  ret.runsScoredBy = determineRunsScoredBy(rawEvent, baseStateBeforePlay);
  ret.runs = ret.runsScoredBy.length;
  let boap = determineBasesOccupiedAfterPlay(rawEvent, baseStateBeforePlay);
  ret.basesOccupiedAfterPlay = boap.basesOccupiedAfterPlay;
  ret.baseStealers = boap.baseStealers;

  ret.ballInPlay = getBallInPlay(rawEvent);

  ret.plateAppearance = !isBaserunningEvent(ret) && ret.playCode != 'NP';
  ret.atBat = isAtBat(ret);
  ret.hit = ["S","D","T","H","HR"].includes(ret.playCode);
  ret.walk = ["W","IW"].includes(ret.playCode);
  ret.strikeout = ret.playCode === "K";
  ret.sacFly = getIsSacFly(rawEvent);
  ret.sacBunt = getIsSacBunt(rawEvent);
  ret.baserunningPlay = isBaserunningEvent(ret);

  ret.rbi = determineRBI(ret, outsBeforePlay);
  ret.errors = determineErrors(rawEvent, defensivePlayers);
  ret.risp = baseStateBeforePlay[2] !== null || baseStateBeforePlay[3] !== null;

  ret.valid = rawEvent.basicPlayParseError == null && rawEvent.advancesParseErrors.length == 0 && rawEvent.modifiersParseErrors.length == 0;

  // looking for where ret.lineupPosition is set?  It has to be done in game.js, as we need to track it across plays/innings/etc.

  return ret;

}

function isDoublePlay(rawEvent) {
  return rawEvent.modifiers.reduce(function(accumulator, value) { return accumulator || ["GDP","LDP","DP"].includes(value); }, false);
}

function isAtBat(parsedEvent) {
  return !(["W","IW","HP","NP","C"].includes(parsedEvent.playCode) || getIsSacFly(parsedEvent.rawEvent) || getIsSacBunt(parsedEvent.rawEvent) || isBaserunningEvent(parsedEvent));
}

function isBaserunningEvent(parsedEvent) {
  return ["BK","CS","DI","OA","PB","WP","PO","POCS","SB"].includes(parsedEvent.playCode);
}

function determineErrors(rawEvent, defensivePlayers) {

  let ret = [];
  let eRegex = /E([0-9])/;

  let extractError = function(m) {
    if (m != null) {
      ret.push(defensivePlayers[Number.parseInt(m[1])-1]);
    }
  };

  extractError(rawEvent.basicPlay.match(eRegex));

  rawEvent.advances.forEach(function(advance) {
    advance.parameters.forEach(function(param) {
      extractError(param.parameter.match(eRegex));
      param.modifiers.forEach(function(modifier) {
        extractError(modifier.match(eRegex));
      });
    });
  });

  rawEvent.modifiers.forEach(function(modifier) {
    extractError(modifier.match(eRegex));
  });

  return ret;

}

function determineRBI(parsedEvent, outsBeforePlay) {

  /*
    1. If play is not a WP, PB, BK, error or strikeout, then iterate through the advances.  If endingBase === H and no error parameter or NR/NORBI parameter or GDP modifier on the play, then count an RBI.
    2. If play is an error, and outs < 2, and endingBase === H and startingBase === 3 and no NR/NORBI parameter, then count an RBI
    3. If play is a home run, batter's advance to home is implicit, so count an additional RBI for him
  */

  let rbi = 0;

  let rbiScore = function(advance) {
    return !/WP|PB|BK/.test(parsedEvent.rawEvent.basicPlay) && advance.endingBase === "H" &&
    advance.type === "advance" &&
    !advance.parameters.reduce(function(accumulator, parameter) { return accumulator |= ["NR", "NORBI"].includes(parameter.parameter); }, false);
  };

  if (parsedEvent.playCode === "E" && outsBeforePlay < 2) {
    parsedEvent.rawEvent.advances.forEach(function(advance) {
      if (rbiScore(advance) && advance.startingBase === "3") {
        rbi++;
      }
    });
  } else if (!["K", "E"].includes(parsedEvent.playCode) && !parsedEvent.rawEvent.modifiers.reduce(function(accumulator, modifier) { return accumulator |= ("GDP" === modifier); }, false)) {
    parsedEvent.rawEvent.advances.forEach(function(advance) {
      if (rbiScore(advance)) {
        rbi++;
      }
    });
    if (["HR", "H"].includes(parsedEvent.playCode)) {
      rbi++;
    }
  }

  return rbi;

}

const BATTED_BALL_LOCATION_REGEX = /^(BP|BG|BGDP|BL|BP|BPDP|G|GDP|GTP|L|LDP|LTP|F|P)?([1-9]{1,2}(?:F|DF|LSF|LF|LDF|D|LS|L|LD|S|M|MD|MS|XD)?)?([+\-])?$/;
const ADVANCE_REGEX = /^([B123])([\-X])([123H])((?:\((?:[1-9E]+)?(?:\/?(?:TH[123H]?|INT|RINT))?\))?(?:\((?:UR|NR|WP|PB|TUR|RBI)\)){0,2})*$/;

function validateModifiers(modifiers) {
  let errors = [];
  modifiers.forEach(function(modifier) {
    if (!(/^(?:AP|BINT|BOOT|BR|C|COUB|COUF|COUR|DP|E[1-9]|FDP|FINT|FL|FO|IF|INT|IPHR|MREV|NDP|OBS|PASS|R[1-9]+|RINT|SF|SH|TH|TH[123H]|TP|UINT|UREV|BF)$/.test(modifier) ||
          BATTED_BALL_LOCATION_REGEX.test(modifier))) {
      errors.push("Invalid modifier: " + modifier);
    }
  });
  return errors;
}

function validateAdvances(advances) {
  let errors = [];
  advances.forEach(function(advance) {
    if (!ADVANCE_REGEX.test(advance)) {
      errors.push("Invalid advance: " + advance);
    }
  });
  return errors;
}

function validateBasicPlay(basicPlay) {
  let ret = null;
  if (!(/^FC[1-9]|E[1-9]|[I]?W|(?:SB[23H])(?:;SB[23H])*|CS[23H]|PO[123]|POCS[23H]|DI|BK|HR[1-9]*|DGR|PB|FLE[1-9]|OA|NP|C|HP$/.test(basicPlay) ||
        /^(?:[1-9]+(?:[\-]|\([B123]\))?)+$/.test(basicPlay) ||
        /^[SDTH][1-9]*$/.test(basicPlay) ||
        /^[K][1-9]*(?:\+(?:CS|SB|PO)[23H]|E[1-9]|PB|WP)?$/.test(basicPlay))) {
    ret = "Invalid basic play: " + basicPlay;
  }
  return ret;
}

function parseAdvancesDetail(rawAdvances) {

  let ret = [];

  rawAdvances.forEach(function(rawAdvance) {

    let splitAdvance = rawAdvance.match(ADVANCE_REGEX);

    if (splitAdvance != null) {
      let a = new Object;
      a.startingBase = splitAdvance[1];
      a.type = splitAdvance[2] === '-' ? "advance" : "out";
      a.endingBase = splitAdvance[3];
      a.parameters = [];
      let params = splitAdvance[4];
      if (params != null) {
        while (/\(/.test(params)) {
          params = params.replace(/\(/, "");
        }
        params = params.replace(/\)$/, "").split(")");
        params.forEach(function(param) {
          let p = new Object;
          let splitParam = param.split("/");
          p.parameter = splitParam[0];
          if (/E/.test(p.parameter) && a.type === "out") {
            // negated out
            a.type = "safe-on-error";
          }
          p.modifiers = splitParam.slice(1);
          a.parameters.push(p);
        })
      }
      a.runnerSafe = a.type != "out";
      ret.push(a);
    }

  });

  return ret;

}

function getBallInPlay(rawEvent) {

  // todo: do we want to infer bip locations from base play notations...e.g., S7 means "middle" left field, 63 means "normal" ground ball to shortstop?
  // for now, we do not.  and i don't think we should...implies an accuracy that is not intended/supported by data.

  var ret = new Object;
  ret.bunt = null;
  ret.flyBall = null;
  ret.groundBall = null;
  ret.lineDrive = null;
  ret.popup = null;
  ret.trajectoryExplicit = false;
  ret.location = null;
  ret.soft = null;
  ret.bunt = null;
  ret.hard = null;

  var locationModifierFound = false;
  var trajectoryModifierFound = false;

  if (/^[0-9]{2}$/.test(rawEvent.basicPlay)) {
    ret.bunt = false;
    ret.flyBall = false;
    ret.groundBall = true;
    ret.lineDrive = false;
    ret.popup = false;
  } else if (/^[0-9]$/.test(rawEvent.basicPlay)) {
    ret.bunt = false;
    ret.flyBall = true;
    ret.groundBall = false;
    ret.lineDrive = false;
    ret.popup = false;
  }

  rawEvent.modifiers.forEach(function(modifier, index) {
    if (modifier === "LDP") {
      modifier = "L";
    } else if (modifier === "GDP") {
      modifier = "G";
    }
    let components = modifier.match(BATTED_BALL_LOCATION_REGEX);
    if (components != null) {
      if (ret != null) {
        if (components[1] != null && trajectoryModifierFound) {
          throw new Error("Duplicate trajectory modifiers in play: " + rawEvent.rawText);
        } else if (components[2] != null && locationModifierFound) {
          throw new Error("Duplicate location modifiers in play: " + rawEvent.rawText);
        }
      }
      if (components[1] != null) {
        ret.bunt = ["BP","BG","BGDP","BL","BP","BPDP"].includes(components[1]);
        ret.flyBall = components[1] === "F";
        ret.popup = ["P","BP","BPDP"].includes(components[1]);
        ret.groundBall = ["G","GDP","GTP","BG","BGDP"].includes(components[1]);
        ret.lineDrive = ["L","LDP","LTP","BLDP","BL"].includes(components[1]);
        ret.trajectoryExplicit = true;
        trajectoryModifierFound = true;
      }
      if (components[2] != null) {
        ret.location = components[2] === '' ? null : components[2];
        locationModifierFound = true;
      }
      if (components[3] != null) {
        ret.soft = "-" === components[3];
        ret.hard = "+" === components[3];
      }
    }
  });
  return ret;
}

function getIsSacFly(rawEvent) {
  return rawEvent.modifiers.reduce(function(accumulator, currentValue) { return accumulator |= (/^SF/.test(currentValue) ? true : false); }, false) == 1;
}

function getIsSacBunt(rawEvent) {
  return rawEvent.modifiers.reduce(function(accumulator, currentValue) { return accumulator |= (/^SH/.test(currentValue) ? true : false); }, false) == 1;
}

function getPlayCode(rawEvent) {
  if (rawEvent.basicPlayParseError != null) {
    return null;
  }
  let outRegex = /^([0-9]+)[\/\.$]/;
  let testRegex = outRegex;
  if (!outRegex.test(rawEvent.basicPlay)) {
    let kwPlusRegex = /^([KW])\+.+/;
    let csWithParamRegex = /^(CS|POCS)[123H].*/;
    if (kwPlusRegex.test(rawEvent.basicPlay)) {
      testRegex = kwPlusRegex;
    } else if (csWithParamRegex.test(rawEvent.basicPlay)) {
      testRegex = csWithParamRegex;
    } else {
      testRegex = /^([A-Z]+)[\/\.0-9$]+/;
    }
  }
  return rawEvent.basicPlay.replace(testRegex, "$1");
}

function parseRawEvent(eventText) {

  if (eventText == null || eventText.trim().length == 0) {
    return null;
  }

  while(/[!#]/.test(eventText)) {
    eventText = eventText.replace(/[!#]/, "");
  }

  let ret = new Object();
  let outerRegex = /([^\.]+)(?:\.(.+))?/;
  let advancesRegex = /[^\.]+\./;

  let basicPlayAndModifiers = eventText.replace(outerRegex, "$1");
  ret.advances = advancesRegex.test(eventText) ? eventText.replace(outerRegex, "$2").split(";") : [];

  let innerRegex = /([^\/]+)\/(.+)*/;
  let modifiersRegex = /[^\/]+\//;

  if (/\(.+\/.+\)/.test(basicPlayAndModifiers)) {
    innerRegex = /^(.+\))(?:\/(.+))*/;
    modifiersRegex = /\).*\//;
  }

  ret.basicPlay = basicPlayAndModifiers.replace(innerRegex, "$1");
  ret.modifiers = modifiersRegex.test(basicPlayAndModifiers) ? basicPlayAndModifiers.replace(innerRegex, "$2").split("/") : [];
  ret.rawText = eventText;

  ret.basicPlayParseError = validateBasicPlay(ret.basicPlay);
  ret.advancesParseErrors = validateAdvances(ret.advances);
  ret.modifiersParseErrors = validateModifiers(ret.modifiers);

  ret.advances = parseAdvancesDetail(ret.advances);

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

  // baserunning (advances) outs
  rawEvent.advances.forEach(function(advance) {
    if (["out", "safe-on-error"].includes(advance.type)) {
      let out = new Object;
      advance.parameters.forEach(function(param) {
        if (/^[0-9]/.test(param.parameter)) {
          out.play = param.parameter;
          out.runnerStartingBase = advance.startingBase;
          let runner = advance.startingBase === "B" ? 0 : Number.parseInt(advance.startingBase);
          out.runnerId = baseStateBeforePlay[runner];
          if (advance.type === "out") {
            out.putoutFielderPosition = Number.parseInt(param.parameter.substr(-1, 1));
            out.putoutFielderId = defensivePlayers[out.putoutFielderPosition - 1];
          }
          out.assistFielders = parseAssistFielders(param.parameter, defensivePlayers);
          out.recorded = !advance.runnerSafe;
        }
      });
      outs.push(out);
    }
  });

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
  if (kk != null && !rawEvent.advances.reduce(function(accumulator, advance) { return accumulator |= (advance.startingBase === "B" && advance.endingBase === "1" ? true : false); }, false)) {
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
  if (/SBH/.test(rawEvent.basicPlay)) {
    let score = new Object;
    score.runner = baseStateBeforePlay[3];
    score.unearnedIndicated = false;
    score.noRbiIndicated = false;
    ret.push(score);
  }
  rawEvent.advances.forEach(function(advance) {
    if (advance.runnerSafe && advance.endingBase === "H") {
      let baseFromStr = advance.startingBase;
      let baseFrom = baseFromStr === 'B' ? 0 : Number.parseInt(baseFromStr);
      let score = new Object;
      score.scoredFrom = baseFromStr;
      score.runner = baseStateBeforePlay[baseFrom];
      score.unearnedIndicated = advance.parameters.reduce(function(accumulator, param) { return accumulator |= param.parameter === "UR" ? true : false; }, false);
      score.noRbiIndicated = advance.parameters.reduce(function(accumulator, param) { return accumulator |= ["NR","NORBI"].includes(param.parameter) ? true : false; }, false);
      ret.push(score);
    }
  });
  return ret;
}

function determineBasesOccupiedAfterPlay(rawEvent, baseStateBeforePlay) {

  // spec is not entirely clear if "implicit" advances are possible...i.e., runner on first, batter walks.  does the .1-2 advance have to be specified?  we assume so, but if
  //  we find this isn't the case, and sometimes advances are assumed, we'll have some work to do here.

  let retObj = new Object;

  let ret = baseStateBeforePlay.slice(1, 4);

  rawEvent.advances.forEach(function(advance) {
    let preState = advance.startingBase;
    if (preState != "B") {
      ret[Number.parseInt(preState)-1] = null;
    }
  });

  let batterExplicit = false;
  let explicitPostStates = [];

  rawEvent.advances.forEach(function(advance) {
    if(advance.runnerSafe) {
      let preState = advance.startingBase;
      let postState = advance.endingBase;
      if (postState != "H") {
        if (preState === "B") {
          batterExplicit = true;
          preState = "0";
        }
        explicitPostStates[Number.parseInt(postState)-1] = baseStateBeforePlay[Number.parseInt(preState)];
      }
    }
  });

  if (!batterExplicit) {
    ret[0] = /^(?:S[1-9]*|E[1-9]?|FC[1-9]?|W(?:\+.+)?|IW|I|HP|C|[1-9]+\([123]\))$/.test(rawEvent.basicPlay) ? baseStateBeforePlay[0] : ret[0];
    ret[1] = /^D[1-9]?$/.test(rawEvent.basicPlay) ? baseStateBeforePlay[0] : ret[1];
    ret[2] = /^T[1-9]?$/.test(rawEvent.basicPlay) ? baseStateBeforePlay[0] : ret[2];
  }

  let baseStealers = [];

  let sbRegexMatch = rawEvent.basicPlay.match(/^(?:W\+|K\+)?(?:SB([23H]))(?:;SB([23H]))?(?:;SB([23H]))?/);

  if (sbRegexMatch) {
    let sbs = sbRegexMatch.slice(1,4).filter(function(v) { return v != null; }).sort().reverse();
    sbs.forEach(function(baseStr) {
      let base = (baseStr === 'H' ? 3 : Number.parseInt(baseStr)-1);
      baseStealers[base-1] = baseStateBeforePlay[base];
      if (base < 3) {
        ret[base] = ret[base-1];
      }
      ret[base-1] = null;
    });
  }

  let m = rawEvent.basicPlay.match(/^(?:PO|K\+PO)([123])(\([1-9E].*\))?/);

  if (m != null) {
    let base = Number.parseInt(m[1]);
    if (m[2] == null || !/E/.test(m[2])) {
      ret[base-1] = null;
    }
  }

  m = rawEvent.basicPlay.match(/^(?:POCS|CS|K\+CS)([23H])(\([1-9E].*\))?/);

  if (m != null) {
    let baseStr = m[1];
    let base = (baseStr === 'H' ? 3 : Number.parseInt(baseStr) - 1);
    if (m[2] != null && /E/.test(m[2]) && base < 3) {
      ret[base] = ret[base-1];
    }
    ret[base-1] = null;
  }

  explicitPostStates.forEach(function(runner, index) {
    if (ret[index] == null) {
      ret[index] = runner;
    }
  });

  retObj.basesOccupiedAfterPlay = ret;

  // we have to track base stealers explicitly, because if there is a credited SB but then an out on an attempted advance, we will
  // no longer have (in the basesOccupiedAfterPlay array) who the runner was.  eg SB2.1X3(285).

  retObj.baseStealers = baseStealers;

  return retObj;

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
module.exports.validateBasicPlay = validateBasicPlay;
module.exports.validateAdvances = validateAdvances;
module.exports.validateModifiers = validateModifiers;
module.exports.parseAdvancesDetail = parseAdvancesDetail;
module.exports.determineRBI = determineRBI;
module.exports.determineErrors = determineErrors;
module.exports.isDoublePlay = isDoublePlay;
