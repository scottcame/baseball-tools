"use strict";

const PITCH_TYPES = {
  "FA": "Generic fastball",
  "FF": "4-seam fastball",
  "FT": "2-seam fastball",
  "FS": "split-finger fastball",
  "FC": "Cut fastball (cutter)",
  "SI": "Sinker",
  "SL": "Slider",
  "CH": "Changeup",
  "CU": "Curveball",
  "KC": "Knuckle-Curve",
  "KN": "Knuckleball",
  "EP": "Eephus"
};

// a modifier occurs before a pitch to add context
const PITCH_MODIFIERS = {
  "+": "Pickoff throw by catcher",
  "*": "Pitch blocked by catcher",
  "1": "Pickoff throw to first",
  "2": "Pickoff throw to second",
  "3": "Pickoff throw to third",
  ">": "Runner going on the pitch"
}

const PITCH_OUTCOMES = {
  "B": "ball",
  "C": "called strike",
  "F": "foul",
  "H": "hit batter",
  "I": "intentional ball",
  "K": "strike (unknown type)",
  "L": "foul bunt",
  "M": "missed bunt attempt",
  "N": "no pitch (on balks and interference calls)",
  "O": "foul tip on bunt",
  "P": "pitchout",
  "Q": "swinging on pitchout",
  "R": "foul ball on pitchout",
  "S": "swinging strike",
  "T": "foul tip",
  "U": "unknown or missed pitch",
  "V": "called ball because pitcher went to his mouth",
  "X": "ball put into play by batter",
  "Y": "ball put into play on pitchout",
  ".": "marker for play not involving the batter"
};

/*
  We support two pitch sequence formats:

    1. Standard Retrosheet format
    2. Enhanced format, regex occurs 1..* separated by semi-colons: (.)?(.)/([0-9]+)/([A-Z]{2})/([0-9])
       Where $1=PITCH_MODIFIER, $2=PITCH_OUTCOME, $3=velocity, $4=PITCH_TYPE, $5=location zone
*/
function parsePitchSequence(pitchSequenceText) {

    let ret = [];

    let enhancedRegex = /(.)?(.)\/([0-9]+)\/([A-Z]{2})\/([0-9])/;

    if (/;|\//.test(pitchSequenceText)) {
      // enhanced format
      let pitches = pitchSequenceText.split(";");
      pitches.forEach(function(value) {
        if (value.length > 0) {
          let values = value.match(enhancedRegex);
          if (values == null) {
            throw new Error("Invalid enhanced pitch sequence: " + value);
          }
          let obj = new Object;
          obj.modifier = values[1];
          obj.outcome = values[2];
          obj.velocity = values[3];
          obj.type = values[4];
          obj.location = values[5];
          ret.push(obj);
        }
      });
    } else {
      for (let i=0; i < pitchSequenceText.length; i++) {
        let obj = new Object;
        let c = pitchSequenceText.charAt(i);
        if (PITCH_MODIFIERS.hasOwnProperty(c)) {
          obj.modifier = c;
          c = pitchSequenceText.charAt(++i);
        }
        obj.outcome = c;
        ret.push(obj);
      }
    }

    return ret;

}

module.exports.parsePitchSequence = parsePitchSequence;
