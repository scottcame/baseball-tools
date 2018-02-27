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
  Parses the legacy Retrosheet pitch sequence format into an object structure.
*/
function parsePitchSequence(pitchSequenceText) {

    let ret = [];

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

    return ret;

}

module.exports.parsePitchSequence = parsePitchSequence;
