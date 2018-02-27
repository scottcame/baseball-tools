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
  ret.visitor_team_stats.errors = 0;
  ret.visitor_team_stats.runs_per_inning = [];

  ret.home_team_stats = new Object;
  ret.home_team_stats.score = 0;
  ret.home_team_stats.hits = 0;
  ret.home_team_stats.errors = 0;
  ret.home_team_stats.runs_per_inning = [];

  ret.box = new Object;
  ret.box.home_team = new Object;
  ret.box.visitor_team = new Object;
  ret.box.home_team.batting = [];
  ret.box.visitor_team.batting = [];

  let currentLineups = Game.initializeLineups(game);
  currentLineups.current_visitor_batting_order.some(function(player_id, index) {
    ret.box.visitor_team.batting[index] = [];
    ret.box.visitor_team.batting[index].push([player_id, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
  currentLineups.current_home_batting_order.some(function(player_id, index) {
    ret.box.home_team.batting[index] = [];
    ret.box.home_team.batting[index].push([player_id, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

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

      if (play.batting_team_id === game.home_team.team_id) {
        offenseTeamStats = ret.home_team_stats;
        defenseTeamStats = ret.visitor_team_stats;
        offenseLineup = ret.box.home_team.batting;
        offenseBattingOrder = currentLineups.current_home_batting_order;
        defenseLineup = ret.box.visitor_team.batting;
        defenseBattingOrder = currentLineups.current_visitor_batting_order;
      } else if (play.batting_team_id === game.visitor_team.team_id) {
        offenseTeamStats = ret.visitor_team_stats;
        defenseTeamStats = ret.home_team_stats;
        offenseLineup = ret.box.visitor_team.batting;
        offenseBattingOrder = currentLineups.current_visitor_batting_order;
        defenseLineup = ret.box.home_team.batting;
        defenseBattingOrder = currentLineups.current_home_batting_order;
      } else {
        console.error("Unrecognized team: " + play.batting_team_id);
      }

      offenseTeamStats.runs_per_inning[play.inning-1] = offenseTeamStats.runs_per_inning[play.inning-1] == null ? 0 : offenseTeamStats.runs_per_inning[play.inning-1] + play.enhanced_play.runs;
      offenseTeamStats.score += play.enhanced_play.runs;
      offenseTeamStats.hits += (["S","D","T","H","HR"].includes(play.enhanced_play.playCode));
      defenseTeamStats.errors += play.enhanced_play.errors.length;

      let findPlayerStatsArray = function(playerToFind, battingOrder, lineup) {
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
        }
        let ret = null;
        lineup[lineupSpot].some(function(playerStatsArray) {
          if (playerStatsArray[0] === playerToFind) {
            ret = playerStatsArray;
            return true;
          }
          return false;
        });
        return ret;
      };

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
        thisPlayerStatsArray = findPlayerStatsArray(rsby.runner, offenseBattingOrder, offenseLineup);
        if (thisPlayerStatsArray == null) {
          console.error("Player " + rsby.runner + " somehow scored a run before subbing in");
        } else {
          thisPlayerStatsArray[2]++;
        }
      });

      play.enhanced_play.outs.forEach(function(out) {
        thisPlayerStatsArray = findPlayerStatsArray(out.putoutFielderId, defenseBattingOrder, defenseLineup);
        if (thisPlayerStatsArray == null) {
          console.error("Player " + out.putoutFielderId + " somehow got a putout before subbing in");
        } else {
          thisPlayerStatsArray[7]++;
        }
        out.assistFielders.forEach(function(assistFielder) {
          thisPlayerStatsArray = findPlayerStatsArray(assistFielder.fielderId, defenseBattingOrder, defenseLineup);
          if (thisPlayerStatsArray == null) {
            console.error("Player " + assistFielder.fielderId + " somehow got an assist before subbing in");
          } else {
            thisPlayerStatsArray[8]++;
          }
        })
      });

    } else if (play.type === "substitution") {
      currentLineups = Game.applySubstitution(game, currentLineups, play);
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
        box.batting[play.substitution.lineup_position-1].some(function(playerStatsArray) {
          if (playerStatsArray[0] === play.substitution.player.player_id) {
            // this happens when a player switches defensive spots but stays in the batting order in the same spot
            found = true;
            return true;
          }
          return false;
        });
        if (!found) {
          box.batting[play.substitution.lineup_position-1].push([play.substitution.player.player_id, 0, 0, 0, 0, 0, 0, 0, 0]);
        }
      }
    }
    return false;
  });

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
