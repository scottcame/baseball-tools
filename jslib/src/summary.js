"use strict";

var Game = require("./game.js");

const BATTING_STAT_AB = 1;
const BATTING_STAT_R = 2;
const BATTING_STAT_H = 3;
const BATTING_STAT_RBI = 4;
const BATTING_STAT_BB = 5;
const BATTING_STAT_K = 6;
const BATTING_STAT_PO = 7;
const BATTING_STAT_A = 8;
const BATTING_STAT_QAB = 9;
const BATTING_STAT_PA = 10;

const PITCHING_STAT_IP = 1;
const PITCHING_STAT_H = 2;
const PITCHING_STAT_R = 3;
const PITCHING_STAT_ER = 4;
const PITCHING_STAT_BB = 5;
const PITCHING_STAT_SO = 6;
const PITCHING_STAT_HR = 7;
const PITCHING_STAT_BF = 8;
const PITCHING_STAT_PT = 9;
const PITCHING_STAT_PS = 10;
const PITCHING_STAT_11COUNTS = 11;
const PITCHING_STAT_WIN11 = 12;

function initializePlayerStatArray(player_id) {
  let ret = [];
  ret[0] = player_id;
  ret[BATTING_STAT_AB] = 0;
  ret[BATTING_STAT_R] = 0;
  ret[BATTING_STAT_H] = 0;
  ret[BATTING_STAT_RBI] = 0;
  ret[BATTING_STAT_BB] = 0;
  ret[BATTING_STAT_K] = 0;
  ret[BATTING_STAT_PO] = 0;
  ret[BATTING_STAT_A] = 0;
  ret[BATTING_STAT_QAB] = 0;
  ret[BATTING_STAT_PA] = 0;
  return ret;
}

function initializePitchingStatArray(player_id) {
  let ret = [];
  ret[0] = player_id;
  ret[PITCHING_STAT_IP] = 0;
  ret[PITCHING_STAT_H] = 0;
  ret[PITCHING_STAT_R] = 0;
  ret[PITCHING_STAT_ER] = 0;
  ret[PITCHING_STAT_BB] = 0;
  ret[PITCHING_STAT_SO] = 0;
  ret[PITCHING_STAT_HR] = 0;
  ret[PITCHING_STAT_BF] = 0;
  ret[PITCHING_STAT_PT] = 0;
  ret[PITCHING_STAT_PS] = 0;
  ret[PITCHING_STAT_11COUNTS] = 0;
  ret[PITCHING_STAT_WIN11] = 0;
  return ret;
}

function getGameSummary(game) {
  return getGameSummaryToPlay(game, game.plays.length - 1);
}

function getGameSummaryToPlay(game, playIndex) {

  if (game.enhanced == null || !game.enhanced) {
    game = Game.parseGame(game);
  }

  let ret = new Object;

  ret.current_play = game.plays.length === 0 ? null : game.plays[playIndex];
  ret.prior_play = playIndex === 0 || game.plays.length === 0 ? null : game.plays[playIndex-1];

  ret.visitor_team_stats = new Object;
  ret.visitor_team_stats.score = 0;
  ret.visitor_team_stats.hits = 0;
  ret.visitor_team_stats.error_count = 0;
  ret.visitor_team_stats.runs_per_inning = [];
  ret.visitor_team_stats.lob = 0;
  ret.visitor_team_stats.dp = [];
  ret.visitor_team_stats.doubles = [];
  ret.visitor_team_stats.triples = [];
  ret.visitor_team_stats.hr = [];
  ret.visitor_team_stats.hbp = [];
  ret.visitor_team_stats.sb = [];
  ret.visitor_team_stats.cs = [];
  ret.visitor_team_stats.errors = [];
  ret.visitor_team_stats.wp = [];
  ret.visitor_team_stats.pb = [];
  ret.visitor_team_stats.ibb = [];

  ret.home_team_stats = new Object;
  ret.home_team_stats.score = 0;
  ret.home_team_stats.hits = 0;
  ret.home_team_stats.error_count = 0;
  ret.home_team_stats.runs_per_inning = [];
  ret.home_team_stats.lob = 0;
  ret.home_team_stats.dp = [];
  ret.home_team_stats.doubles = [];
  ret.home_team_stats.triples = [];
  ret.home_team_stats.hr = [];
  ret.home_team_stats.hbp = [];
  ret.home_team_stats.sb = [];
  ret.home_team_stats.cs = [];
  ret.home_team_stats.errors = [];
  ret.home_team_stats.wp = [];
  ret.home_team_stats.pb = [];
  ret.home_team_stats.ibb = [];

  ret.box = new Object;
  ret.box.home_team = new Object;
  ret.box.visitor_team = new Object;
  ret.box.home_team.batting = [];
  ret.box.visitor_team.batting = [];

  ret.date = game.start_date;

  ret.home_team_name = game.home_team.team_name;
  ret.visitor_team_name = game.visitor_team.team_name;

  let currentLineups = Game.initializeLineups(game);

  ret.players = [];

  [game.home_team, game.visitor_team].forEach(function(team) {
    team.lineup.forEach(function(p) {
      let po = new Object;
      po.player_id = p.player.player_id;
      po.player_last_name = p.player.player_last_name;
      po.player_positions = [];
      if (p.lineup_position != null) {
        po.player_positions.push(p.fielder_position);
      }
      ret.players.push(po);
    });
  });

  currentLineups.current_visitor_batting_order.forEach(function(player_id, index) {
    ret.box.visitor_team.batting[index] = [];
    ret.box.visitor_team.batting[index].push(initializePlayerStatArray(player_id));
  });

  game.visitor_team.lineup.some(function(spot) {
    if (spot.lineup_position == Game.DH_LINEUP_POSITION) {
      let dhSpotSlot = [];
      ret.box.visitor_team.batting.push(dhSpotSlot);
      dhSpotSlot.push(initializePlayerStatArray(spot.player.player_id));
      return true;
    }
    return false;
  });

  currentLineups.current_home_batting_order.forEach(function(player_id, index) {
    ret.box.home_team.batting[index] = [];
    ret.box.home_team.batting[index].push(initializePlayerStatArray(player_id));
  });

  game.home_team.lineup.some(function(spot) {
    if (spot.lineup_position == Game.DH_LINEUP_POSITION) {
      let dhSpotSlot = [];
      ret.box.home_team.batting.push(dhSpotSlot);
      dhSpotSlot.push(initializePlayerStatArray(spot.player.player_id));
      return true;
    }
    return false;
  });

  ret.box.home_team.pitching = [];
  ret.box.home_team.pitching.push(initializePitchingStatArray(currentLineups.current_home_defense[0]));

  ret.box.visitor_team.pitching = [];
  ret.box.visitor_team.pitching.push(initializePitchingStatArray(currentLineups.current_visitor_defense[0]));

  ret.winning_pitcher = game.winning_pitcher;
  ret.losing_pitcher = game.losing_pitcher;
  ret.save_pitcher = game.save_pitcher;

  let lastBaseState = [null, null, null];

  game.plays.some(function(play, index) {

    // console.log("Processing play # " + index);

    if (index > playIndex) {
      return true;
    } else if (play.type === "play") {

      let offenseTeamStats = null;
      let defenseTeamStats = null;
      let offenseLineup = null;
      let defenseLineup = null;
      let defensePositionPlayers = null;
      let defensePitchingBox = null;

      if (play.batting_team_id === game.home_team.team_id) {
        offenseTeamStats = ret.home_team_stats;
        defenseTeamStats = ret.visitor_team_stats;
        offenseLineup = ret.box.home_team.batting;
        defenseLineup = ret.box.visitor_team.batting;
        defensePositionPlayers = currentLineups.current_visitor_defense;
        defensePitchingBox = ret.box.visitor_team.pitching;
      } else if (play.batting_team_id === game.visitor_team.team_id) {
        offenseTeamStats = ret.visitor_team_stats;
        defenseTeamStats = ret.home_team_stats;
        offenseLineup = ret.box.visitor_team.batting;
        defenseLineup = ret.box.home_team.batting;
        defensePositionPlayers = currentLineups.current_home_defense;
        defensePitchingBox = ret.box.home_team.pitching;
      } else {
        console.error("Unrecognized team: " + play.batting_team_id);
      }

      offenseTeamStats.runs_per_inning[play.inning-1] = offenseTeamStats.runs_per_inning[play.inning-1] == null ? 0 : offenseTeamStats.runs_per_inning[play.inning-1] + play.enhanced_play.runs;
      offenseTeamStats.score += play.enhanced_play.runs;
      offenseTeamStats.hits += (["S","D","T","H","HR"].includes(play.enhanced_play.playCode));
      defenseTeamStats.error_count += play.enhanced_play.errors.length;

      let findPlayerStatsArray = function(playerToFind, lineup) {
        let ret = null;
        let lineupSpot = null;
        lineup.some(function(lineupSpotArray, index) {
          lineupSpotArray.some(function(playerStatsArray) {
            if (playerStatsArray[0] === playerToFind) {
              ret = playerStatsArray;
              return true;
            }
            return false;
          });
        });
        if (ret == null) {
          throw new Error("Player " + playerToFind + " not found in lineup\n" + JSON.stringify(play));
        }
        return ret;
      };

      let findResponsiblePitcherStatsArray = function(pitcher_player_id) {
        let ret = null;
        defensePitchingBox.some(function(playerStatsArray) {
          if (pitcher_player_id === playerStatsArray[0]) {
            ret = playerStatsArray;
            return true;
          }
          return false;
        });
        return ret;
      };

      let pitcherStatsArray = defensePitchingBox.slice(-1)[0]; // current pitcher on the mound
      let thisPlayerStatsArray = findPlayerStatsArray(play.batting_player_id, offenseLineup);

      if (thisPlayerStatsArray == null) {
        console.error("Player " + play.batting_player_id + " involved in play before subbing in");
      } else {
        thisPlayerStatsArray[BATTING_STAT_PA] += play.enhanced_play.plateAppearance;
        thisPlayerStatsArray[BATTING_STAT_AB] += play.enhanced_play.atBat;
        thisPlayerStatsArray[BATTING_STAT_H] += play.enhanced_play.hit;
        thisPlayerStatsArray[BATTING_STAT_RBI] += play.enhanced_play.rbi;
        thisPlayerStatsArray[BATTING_STAT_BB] += play.enhanced_play.walk;
        thisPlayerStatsArray[BATTING_STAT_K] += play.enhanced_play.strikeout;
        thisPlayerStatsArray[BATTING_STAT_QAB] += play.enhanced_play.qab;
      }

      play.enhanced_play.runsScoredBy.forEach(function(rsby) {
        if (rsby.runner == null) {
          throw new Error("runsScoredBy structure without runner: " + JSON.stringify(play));
        }
        thisPlayerStatsArray = findPlayerStatsArray(rsby.runner.batting_player_id, offenseLineup);
        if (thisPlayerStatsArray == null) {
          console.error("Player " + rsby.runner.batting_player_id + " somehow scored a run before subbing in");
        } else {
          thisPlayerStatsArray[BATTING_STAT_R]++;
        }
        let responsiblePitcherStatsArray = findResponsiblePitcherStatsArray(rsby.runner.responsible_pitcher_player_id);
        if (responsiblePitcherStatsArray == null) {
          throw new Error("Pitcher " + rsby.runner.responsible_pitcher_player_id + " somehow gave up a run before subbing in\n" + JSON.stringify(play));
        } else {
          responsiblePitcherStatsArray[PITCHING_STAT_R]++;
          if (!rsby.unearnedIndicated) {
            responsiblePitcherStatsArray[PITCHING_STAT_ER]++;
          }
        }
      });

      play.enhanced_play.outs.forEach(function(out) {
        if (out.putoutFielderId != null) {
          thisPlayerStatsArray = findPlayerStatsArray(out.putoutFielderId, defenseLineup);
          if (thisPlayerStatsArray == null) {
            console.error("Player " + out.putoutFielderId + " somehow got a putout before subbing in");
          } else {
            thisPlayerStatsArray[BATTING_STAT_PO]++;
          }
        }
        out.assistFielders.forEach(function(assistFielder) {
          thisPlayerStatsArray = findPlayerStatsArray(assistFielder.fielderId, defenseLineup);
          if (thisPlayerStatsArray == null) {
            console.error("Player " + assistFielder.fielderId + " somehow got an assist before subbing in");
          } else {
            thisPlayerStatsArray[BATTING_STAT_A]++;
          }
        });
        pitcherStatsArray[PITCHING_STAT_IP]++; // this is the IP stat, but we need to express it as outs.  we'll convert it to the conventional .1, .2, .3 later
      });

      if (play.enhanced_play.outsAfterPlay === 3) {
        let inningLob = play.enhanced_play.basesOccupiedAfterPlay.reduce(function(accumulator, value) { return accumulator += (value != null); }, 0);
        offenseTeamStats.lob += inningLob;
      }

      if (play.enhanced_play.doublePlay) {
        let fielders = [];
        let players = play.enhanced_play.outs.forEach(function(out) {
          out.assistFielders.forEach(function(fielder) {
            if (fielders.length == 0 || fielders.slice(-1)[0] !== fielder.fielderId) {
              fielders.push(fielder.fielderId);
            }
          });
          if (fielders.length == 0 || fielders.slice(-1)[0] !== out.putoutFielderId) {
            fielders.push(out.putoutFielderId);
          }
        });
        defenseTeamStats.dp.push(fielders);
      }

      if (play.enhanced_play.playCode === "D") {
        let dpo = new Object;
        dpo.batting_player_id = play.batting_player_id;
        dpo.pitcher_player_id = defensePositionPlayers[0];
        offenseTeamStats.doubles.push(dpo);
      }
      if (play.enhanced_play.playCode === "T") {
        let dpo = new Object;
        dpo.batting_player_id = play.batting_player_id;
        dpo.pitcher_player_id = defensePositionPlayers[0];
        offenseTeamStats.triples.push(dpo);
      }
      if (["HR","H"].includes(play.enhanced_play.playCode)) {
        let dpo = new Object;
        dpo.batting_player_id = play.batting_player_id;
        dpo.pitcher_player_id = defensePositionPlayers[0];
        dpo.inning = play.inning;
        dpo.on = 0;
        dpo.out = 0;
        if (index > 0) {
          let priorPlay = game.plays[index-1];
          if (priorPlay.batting_team_id == play.batting_team_id) {
            dpo.on = priorPlay.enhanced_play.basesOccupiedAfterPlay.reduce(function(accumulator, value) { return accumulator + (value != null); }, 0);
            dpo.out = priorPlay.enhanced_play.outsAfterPlay;
          }
        }
        offenseTeamStats.hr.push(dpo);
        pitcherStatsArray[PITCHING_STAT_HR]++;
      }

      if (play.enhanced_play.playCode === "HP") {
        let dpo = new Object;
        dpo.batting_player_id = play.batting_player_id;
        dpo.pitcher_player_id = defensePositionPlayers[0];
        offenseTeamStats.hbp.push(dpo);
      }

      if (play.enhanced_play.playCode === "WP") {
        let dpo = new Object;
        dpo.batting_player_id = play.batting_player_id;
        dpo.pitcher_player_id = defensePositionPlayers[0];
        defenseTeamStats.wp.push(dpo);
      }

      if (play.enhanced_play.playCode === "IW") {
        let dpo = new Object;
        dpo.batting_player_id = play.batting_player_id;
        dpo.pitcher_player_id = defensePositionPlayers[0];
        defenseTeamStats.ibb.push(dpo);
      }

      if (play.enhanced_play.playCode === "PB") {
        let dpo = new Object;
        dpo.batting_player_id = play.batting_player_id;
        dpo.catcher_player_id = defensePositionPlayers[1];
        defenseTeamStats.pb.push(dpo);
      }

      if (play.enhanced_play.playCode === "SB") {
        let base = play.enhanced_play.rawEvent.basicPlay.replace(/^SB([23H])/, "$1");
        let runner_player_id = null;
        let baseNumber = null;
        if (base === "H") {
          base = "Home";
          baseNumber = 4;
          runner_player_id = play.enhanced_play.runsScoredBy[0].runner.batting_player_id;
        } else {
          runner_player_id = play.enhanced_play.basesOccupiedAfterPlay[Number.parseInt(base)-1].batting_player_id;
          base = base + "d";
          baseNumber = Number.parseInt(base);
        }
        play.enhanced_play.rawEvent.advances.some(function(adv) {
          let startingBaseNumber = Number.parseInt(adv.startingBase);
          if (startingBaseNumber == baseNumber - 1) {
            if (adv.endingBase === "H") {
              let runnerFound = false;
              play.enhanced_play.runsScoredBy.some(function(rsby) {
                if (rsby.scoredFrom == adv.startingBase) {
                  runner_player_id = rsby.runner.batting_player_id;
                  runnerFound = true;
                  return true;
                }
                return false;
              });
              return runnerFound;
            } else {
              let r = play.enhanced_play.basesOccupiedAfterPlay[Number.parseInt(adv.endingBase) - 1];
              if (r != null) {
                runner_player_id = r;
                return true;
              }
            }
          }
          return false;
        });
        let dpo = new Object;
        dpo.base = base;
        dpo.runner_player_id = runner_player_id;
        dpo.pitcher_player_id = defensePositionPlayers[0];
        dpo.catcher_player_id = defensePositionPlayers[1];
        offenseTeamStats.sb.push(dpo);
      }

      if (play.enhanced_play.playCode === "CS") {
        play.enhanced_play.outs.forEach(function(out) {
          if (out.recorded) {
            let base = play.enhanced_play.rawEvent.basicPlay.replace(/^CS([23H]).*/, "$1");
            if (base === "H") {
              base = "Home";
            } else {
              base = base + "d";
            }
            let dpo = new Object;
            dpo.base = base;
            dpo.runner_player_id = out.runnerId.batting_player_id;
            dpo.catcher_player_id = defensePositionPlayers[1];
            offenseTeamStats.cs.push(dpo);
          }
        });
      }

      defenseTeamStats.errors = defenseTeamStats.errors.concat(play.enhanced_play.errors);

      if (play.enhanced_play.plateAppearance) {
        pitcherStatsArray[PITCHING_STAT_BF]++;
      }

      if (play.enhanced_play.strikeout) {
        pitcherStatsArray[PITCHING_STAT_SO]++;
      } else if (play.enhanced_play.walk) {
        pitcherStatsArray[PITCHING_STAT_BB]++;
      } else if (play.enhanced_play.hit) {
        pitcherStatsArray[PITCHING_STAT_H]++;
      }

      if (play.enhanced_play.plateAppearance) {
        let pc = play.enhanced_play.pitchCount;
        let totalStrikes = pc.calledStrikes + pc.swingingStrikes + pc.unknownStrikes + pc.fouls + pc.bip;
        pitcherStatsArray[PITCHING_STAT_PS] += totalStrikes;
        pitcherStatsArray[PITCHING_STAT_PT] += pc.totalPitches;
        pitcherStatsArray[PITCHING_STAT_11COUNTS] += play.enhanced_play.had11count;
        pitcherStatsArray[PITCHING_STAT_WIN11] += play.enhanced_play.win11count;
      }

      // end of play tabulation

      lastBaseState = play.enhanced_play.outsAfterPlay === 3 ? [null, null, null] : play.enhanced_play.basesOccupiedAfterPlay;

    } else if (play.type === "substitution") {

      currentLineups = Game.applySubstitution(game, currentLineups, play, lastBaseState);

      let box = null;

      game.visitor_team.lineup.some(function(spot) {
        if (spot.player.player_id === play.substitution.player.player_id) {
          box = ret.box.visitor_team;
          return true;
        }
        return false;
      });
      if (box == null) game.home_team.lineup.some(function(spot) {
        if (spot.player.player_id === play.substitution.player.player_id) {
          box = ret.box.home_team;
          return true;
        }
        return false;
      });

      if (box == null) {
        console.error("Player " + play.substitution.player.player_id + " not found in either lineup");
      } else {
        let playerIndex = play.substitution.lineup_position == Game.DH_LINEUP_POSITION ? box.batting.length-1 : play.substitution.lineup_position-1;
        let battingFound = false;
        box.batting[playerIndex].some(function(playerStatsArray) {
          if (playerStatsArray[0] === play.substitution.player.player_id) {
            // this happens when a player switches defensive spots but stays in the batting order in the same spot
            battingFound = true;
            return true;
          }
          return false;
        });
        if (!battingFound) {
          box.batting[playerIndex].push(initializePlayerStatArray(play.substitution.player.player_id));
        }
        if (play.substitution.fielder_position === 1) {
          let pitchingFound = false;
          box.pitching.some(function(playerStatsArray) {
            if (playerStatsArray[0] === play.substitution.player.player_id) {
              // this happens when a player switches defensive spots but stays in the batting order in the same spot
              pitchingFound = true;
              return true;
            }
            return false;
          });
          if (!pitchingFound) {
            box.pitching.push(initializePitchingStatArray(play.substitution.player.player_id));
          }
        }
      }

      ret.players.some(function(player) {
        if (player.player_id === play.substitution.player.player_id) {
          player.player_positions.push(play.substitution.fielder_position);
        }
      });

    }

    return false;

  });

  let adjustInningsPitched = function(pitchingBox) {
    pitchingBox.forEach(function(line) {
      line[1] = Math.floor(line[1] / 3) + ((line[1] % 3) / 10);
    });
  };

  adjustInningsPitched(ret.box.home_team.pitching);
  adjustInningsPitched(ret.box.visitor_team.pitching);

  return ret;

}

function updateBoxForLineupChange(lineups, summary) {
  lineups.current_home_batting_order.some(function(player_id, index) {
    let lineupSpot = summary.box.home.batting[index];
    if (lineupSpot == null) {
      lineupSpot = [];
      summary.box.home.batting[index] = lineupSpot;
      summary.box.home.batting[index].push(initializePlayerStatArray(player_id));
    }

  });
  lineups.current_visitor_batting_order.some(function(player_id, index) {
    summary.box.visitor.batting[index] = [];
    summary.box.visitor.batting[index].push(initializePlayerStatArray(player_id));
  });
  return lineups;
}

module.exports.getGameSummary = getGameSummary;
module.exports.getGameSummaryToPlay = getGameSummaryToPlay;

module.exports.BATTING_STAT_AB = BATTING_STAT_AB;
module.exports.BATTING_STAT_R = BATTING_STAT_R;
module.exports.BATTING_STAT_H = BATTING_STAT_H;
module.exports.BATTING_STAT_RBI = BATTING_STAT_RBI;
module.exports.BATTING_STAT_BB = BATTING_STAT_BB;
module.exports.BATTING_STAT_K = BATTING_STAT_K;
module.exports.BATTING_STAT_PO = BATTING_STAT_PO;
module.exports.BATTING_STAT_A = BATTING_STAT_A;
module.exports.BATTING_STAT_QAB = BATTING_STAT_QAB;
module.exports.BATTING_STAT_PA = BATTING_STAT_PA;

module.exports.PITCHING_STAT_IP = PITCHING_STAT_IP;
module.exports.PITCHING_STAT_H = PITCHING_STAT_H;
module.exports.PITCHING_STAT_R = PITCHING_STAT_R;
module.exports.PITCHING_STAT_ER = PITCHING_STAT_ER;
module.exports.PITCHING_STAT_BB = PITCHING_STAT_BB;
module.exports.PITCHING_STAT_SO = PITCHING_STAT_SO;
module.exports.PITCHING_STAT_HR = PITCHING_STAT_HR;
module.exports.PITCHING_STAT_BF = PITCHING_STAT_BF;
module.exports.PITCHING_STAT_PT = PITCHING_STAT_PT;
module.exports.PITCHING_STAT_PS = PITCHING_STAT_PS;
module.exports.PITCHING_STAT_11COUNTS = PITCHING_STAT_11COUNTS;
module.exports.PITCHING_STAT_WIN11 = PITCHING_STAT_WIN11;
