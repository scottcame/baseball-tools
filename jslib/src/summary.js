"use strict";

var Game = require("./game.js");

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

  let currentLineups = Game.initializeLineups(game);
  currentLineups.current_visitor_batting_order.forEach(function(player_id, index) {
    ret.box.visitor_team.batting[index] = [];
    ret.box.visitor_team.batting[index].push([player_id, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
  currentLineups.current_home_batting_order.forEach(function(player_id, index) {
    ret.box.home_team.batting[index] = [];
    ret.box.home_team.batting[index].push([player_id, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  ret.box.home_team.pitching = [
    [currentLineups.current_home_defense[0], 0, 0, 0, 0, 0, 0, 0, 0]
  ];
  ret.box.visitor_team.pitching = [
    [currentLineups.current_visitor_defense[0], 0, 0, 0, 0, 0, 0, 0, 0]
  ];

  let lastBaseState = [null, null, null];

  game.plays.some(function(play, index) {

    if (index > playIndex) {
      return true;
    } else if (play.type === "play") {

      let offenseTeamStats = null;
      let defenseTeamStats = null;
      let offenseLineup = null;
      let defenseLineup = null;
      let offenseBattingOrder = null;
      let defenseBattingOrder = null;
      let defensePositionPlayers = null;
      let defensePitchingBox = null;

      if (play.batting_team_id === game.home_team.team_id) {
        offenseTeamStats = ret.home_team_stats;
        defenseTeamStats = ret.visitor_team_stats;
        offenseLineup = ret.box.home_team.batting;
        offenseBattingOrder = currentLineups.current_home_batting_order;
        defenseLineup = ret.box.visitor_team.batting;
        defenseBattingOrder = currentLineups.current_visitor_batting_order;
        defensePositionPlayers = currentLineups.current_visitor_defense;
        defensePitchingBox = ret.box.visitor_team.pitching;
      } else if (play.batting_team_id === game.visitor_team.team_id) {
        offenseTeamStats = ret.visitor_team_stats;
        defenseTeamStats = ret.home_team_stats;
        offenseLineup = ret.box.visitor_team.batting;
        offenseBattingOrder = currentLineups.current_visitor_batting_order;
        defenseLineup = ret.box.home_team.batting;
        defenseBattingOrder = currentLineups.current_home_batting_order;
        defensePositionPlayers = currentLineups.current_home_defense;
        defensePitchingBox = ret.box.home_team.pitching;
      } else {
        console.error("Unrecognized team: " + play.batting_team_id);
      }

      offenseTeamStats.runs_per_inning[play.inning-1] = offenseTeamStats.runs_per_inning[play.inning-1] == null ? 0 : offenseTeamStats.runs_per_inning[play.inning-1] + play.enhanced_play.runs;
      offenseTeamStats.score += play.enhanced_play.runs;
      offenseTeamStats.hits += (["S","D","T","H","HR"].includes(play.enhanced_play.playCode));
      defenseTeamStats.error_count += play.enhanced_play.errors.length;

      let findPlayerStatsArray = function(playerToFind, battingOrder, lineup) {
        let ret = null;
        let lineupSpot = null;
        battingOrder.some(function(player_id, index) {
          if (player_id === playerToFind) {
            lineupSpot = index;
            return true;
          }
          return false;
        });
        if (lineupSpot == null) {
          console.error("Player " + playerToFind + " not found in lineup");
        } else {
          lineup[lineupSpot].some(function(playerStatsArray) {
            if (playerStatsArray[0] === playerToFind) {
              ret = playerStatsArray;
              return true;
            }
            return false;
          });
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
      let thisPlayerStatsArray = findPlayerStatsArray(play.batting_player_id, offenseBattingOrder, offenseLineup);

      if (thisPlayerStatsArray == null) {
        console.error("Player " + play.batting_player_id + " involved in play before subbing in");
      } else {
        thisPlayerStatsArray[1] += play.enhanced_play.atBat;
        thisPlayerStatsArray[3] += play.enhanced_play.hit;
        thisPlayerStatsArray[4] += play.enhanced_play.rbi;
        thisPlayerStatsArray[5] += play.enhanced_play.walk;
        thisPlayerStatsArray[6] += play.enhanced_play.strikeout;
      }

      play.enhanced_play.runsScoredBy.forEach(function(rsby) {
        thisPlayerStatsArray = findPlayerStatsArray(rsby.runner.batting_player_id, offenseBattingOrder, offenseLineup);
        if (thisPlayerStatsArray == null) {
          console.error("Player " + rsby.runner.batting_player_id + " somehow scored a run before subbing in");
        } else {
          thisPlayerStatsArray[2]++;
        }
        let responsiblePitcherStatsArray = findResponsiblePitcherStatsArray(rsby.runner.responsible_pitcher_player_id);
        if (responsiblePitcherStatsArray == null) {
          console.error("Pitcher " + rsby.runner.responsible_pitcher_player_id + " somehow gave up a run before subbing in");
        } else {
          responsiblePitcherStatsArray[3]++;
          if (!rsby.unearnedIndicated) {
            responsiblePitcherStatsArray[4]++;
          }
        }
      });

      play.enhanced_play.outs.forEach(function(out) {
        if (out.putoutFielderId != null) {
          thisPlayerStatsArray = findPlayerStatsArray(out.putoutFielderId, defenseBattingOrder, defenseLineup);
          if (thisPlayerStatsArray == null) {
            console.error("Player " + out.putoutFielderId + " somehow got a putout before subbing in");
          } else {
            thisPlayerStatsArray[7]++;
          }
        }
        out.assistFielders.forEach(function(assistFielder) {
          thisPlayerStatsArray = findPlayerStatsArray(assistFielder.fielderId, defenseBattingOrder, defenseLineup);
          if (thisPlayerStatsArray == null) {
            console.error("Player " + assistFielder.fielderId + " somehow got an assist before subbing in");
          } else {
            thisPlayerStatsArray[8]++;
          }
        });
        pitcherStatsArray[1]++; // this is the IP stat, but we need to express it as outs.  we'll convert it to the conventional .1, .2, .3 later
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
        pitcherStatsArray[7]++;
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
        if (base === "H") {
          base = "Home";
          runner_player_id = play.enhanced_play.runsScoredBy[0].runner.batting_player_id;
        } else {
          runner_player_id = play.enhanced_play.basesOccupiedAfterPlay[Number.parseInt(base)-1].batting_player_id;
          base = base + "d";
        }
        let dpo = new Object;
        dpo.base = base;
        dpo.runner_player_id = runner_player_id;
        dpo.pitcher_player_id = defensePositionPlayers[0];
        dpo.catcher_player_id = defensePositionPlayers[1];
        offenseTeamStats.sb.push(dpo);
      }

      // if (play.enhanced_play.playCode === "CS") {
      //   let base = play.enhanced_play.rawEvent.basicPlay.replace(/^CS([23H])/, "$1");
      //   let runner_player_id = null;
      //   if (base === "H") {
      //     base = "Home";
      //     runner_player_id = play.enhanced_play.runsScoredBy[0].runner.batting_player_id;
      //   } else {
      //     runner_player_id = play.enhanced_play.basesOccupiedAfterPlay[Number.parseInt(base)-1].batting_player_id;
      //     base = base + "d";
      //   }
      //   let dpo = new Object;
      //   dpo.base = base;
      //   dpo.runner_player_id = runner_player_id;
      //   dpo.pitcher_player_id = defensePositionPlayers[0];
      //   dpo.catcher_player_id = defensePositionPlayers[1];
      //   offenseTeamStats.sb.push(dpo);
      // }

      defenseTeamStats.errors = defenseTeamStats.errors.concat(play.enhanced_play.errors);

      if (play.enhanced_play.plateAppearance) {
        pitcherStatsArray[8]++;
      }

      if (play.enhanced_play.strikeout) {
        pitcherStatsArray[6]++;
      } else if (play.enhanced_play.walk) {
        pitcherStatsArray[5]++;
      } else if (play.enhanced_play.hit) {
        pitcherStatsArray[2]++;
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
        let found = false;
        let playerIndex = play.substitution.lineup_position == Game.DH_LINEUP_POSITION ? box.batting.length-1 : play.substitution.lineup_position-1;
        box.batting[playerIndex].some(function(playerStatsArray) {
          if (playerStatsArray[0] === play.substitution.player.player_id) {
            // this happens when a player switches defensive spots but stays in the batting order in the same spot
            found = true;
            return true;
          }
          return false;
        });
        if (!found) {
          box.batting[playerIndex].push([play.substitution.player.player_id, 0, 0, 0, 0, 0, 0, 0, 0]);
          if (play.substitution.fielder_position === 1) {
            box.pitching.push([play.substitution.player.player_id, 0, 0, 0, 0, 0, 0, 0, 0]);
          }
        }
      }
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
      summary.box.home.batting[index].push([player_id, 0, 0, 0, 0, 0, 0]);
    }

  });
  lineups.current_visitor_batting_order.some(function(player_id, index) {
    summary.box.visitor.batting[index] = [];
    summary.box.visitor.batting[index].push([player_id, 0, 0, 0, 0, 0, 0]);
  });
  return lineups;
}

module.exports.getGameSummary = getGameSummary;
module.exports.getGameSummaryToPlay = getGameSummaryToPlay;
