"use strict";

var Event = require("./event.js");

const DH_LINEUP_POSITION = 0;

function parseGames(games) {

  let ret = new Object;

  ret.description = games.description;
  ret.source = games.source;

  ret.games = [];

  games.games.forEach(function(game) {
    ret.games.push(parseGame(game));
  })

  return ret;

}

function parseGame(game) {

  let ret = new Object;

  ret.game_id = game.game_id;
  ret.enhanced = true;

  ret.visitor_team = game.visitor_team;
  ret.home_team = game.home_team;

  ret.site = game.site;
  ret.start_date = game.start_date;
  ret.start_time = game.start_time;
  ret.daynight = game.daynight;
  ret.use_dh = game.use_dh;
  ret.ump_home = game.ump_home;
  ret.ump_1b = game.ump_1b;
  ret.ump_2b = game.ump_2b;
  ret.ump_3b = game.ump_3b;
  ret.ump_lf = game.ump_lf;
  ret.ump_rf = game.ump_rf;
  ret.ump_field = game.ump_field;
  ret.how_scored = game.how_scored;
  ret.pitches = game.pitches;
  ret.temp = game.temp;
  ret.wind = game.wind;
  ret.wind_speed = game.wind_speed;
  ret.field_conditions = game.field_conditions;
  ret.precip = game.precip;
  ret.sky = game.sky;
  ret.end_time = game.end_time;
  ret.attendance = game.attendance;
  ret.winning_pitcher = game.winning_pitcher;
  ret.losing_pitcher = game.losing_pitcher;
  ret.save_pitcher = game.save_pitcher;

  let currentLineups = initializeLineups(ret);

  ret.plays = [];

  let outs = 0;
  let lastBaseState = [null, null, null];
  game.plays.forEach(function(play, index) {
    if (play.type === "substitution") {
      currentLineups = applySubstitution(ret, currentLineups, play, lastBaseState);
      play.current_lineups = currentLineups;
    } else {
      let defensivePlayers = currentLineups.current_visitor_defense;
      if (play.batting_team_id === ret.visitor_team.team_id) {
        defensivePlayers = currentLineups.current_home_defense;
      }
      let batterBaseState = new Object;
      batterBaseState.batting_player_id = play.batting_player_id;
      batterBaseState.responsible_pitcher_player_id = defensivePlayers[0];
      let baseStateBeforePlay = [batterBaseState].concat(lastBaseState);
      //console.log("Updating baseStateBeforePlay=" + JSON.stringify(baseStateBeforePlay));
      play = enhancePlay(play, baseStateBeforePlay, outs, defensivePlayers);
      outs += play.enhanced_play.outsRecorded;
      if (outs > 3) {
        // todo: throw Error?
        console.error("Encountered more than three outs, play: " + JSON.stringify(play));
      } else if (outs === 3) {
        if (index != game.plays.length-1) {
          if (play.batting_team_id == game.plays[index+1].batting_team_id) {
            // todo: throw Error?
            console.error("Encountered three outs before the end of the inning, play: " + JSON.stringify(play));
          }
        }
        outs = 0;
        lastBaseState = [null, null, null];
      } else {
        lastBaseState = play.enhanced_play.basesOccupiedAfterPlay;
        //console.log("Updating lastBaseState=" + JSON.stringify(lastBaseState));
      }
    }
    ret.plays.push(play);
  });

  ret.currentLineups = currentLineups;

  return ret;

}

function enhancePlay(play, baseStatePrior, outs, defensivePlayers) {
  let ret = play;
  ret.enhanced_play = Event.parseEvent(play.play, baseStatePrior, outs, defensivePlayers);
  return ret;
}

function findPlayer(game, player_id) {
  let ret = null;
  game.visitor_team.lineup.some(function(spot) {
    if (spot.player.player_id === player_id) {
      ret = spot.player;
      return true;
    }
    return false;
  });
  if (ret == null) game.home_team.lineup.some(function(spot) {
    if (spot.player.player_id === player_id) {
      ret = spot.player;
      return true;
    }
    return false;
  });
  return ret;
}

function initializeLineups(enhancedGame) {
  let ret = new Object;
  ret.current_visitor_batting_order = initializeBattingOrder(enhancedGame.visitor_team);
  ret.current_home_batting_order = initializeBattingOrder(enhancedGame.home_team);
  ret.current_visitor_defense = initializeDefense(enhancedGame.visitor_team);
  ret.current_home_defense = initializeDefense(enhancedGame.home_team);
  return ret;
}

function applySubstitution(enhancedGame, currentLineups, substitutionPlay, lastBaseState) {

  let player = substitutionPlay.substitution.player.player_id;

  let battingOrder = null;
  let defense = null;
  enhancedGame.visitor_team.lineup.some(function(spot) {
    if (spot.player.player_id === player) {
      battingOrder = currentLineups.current_visitor_batting_order;
      defense = currentLineups.current_visitor_defense;
      return true;
    }
    return false;
  });
  if (battingOrder == null) {
    enhancedGame.home_team.lineup.some(function(spot) {
      if (spot.player.player_id === player) {
        battingOrder = currentLineups.current_home_batting_order;
        defense = currentLineups.current_home_defense;
        return true;
      }
      return false;
    });
  }
  if (battingOrder == null) {
    // todo: throw error?
    console.error("Player " + player + " not found in lineups.");
  } else {

    let currentPlayer = null;

    if (substitutionPlay.substitution.lineup_position == 0) {
      currentPlayer = battingOrder[battingOrder.length-1];
      battingOrder[battingOrder.length-1] = player;
    } else {
      currentPlayer = battingOrder[substitutionPlay.substitution.lineup_position-1];
      battingOrder[substitutionPlay.substitution.lineup_position-1] = player;
    }

    if (![11,12,13,14].includes(substitutionPlay.substitution.fielder_position)) {
      // only sub in the defensive positions if not a pinch hitter (11) or runner (12) or extra-hitter (13) or courtesy-runner (14)
      defense[substitutionPlay.substitution.fielder_position-1] = player;
    }

    // pinch runner
    lastBaseState.forEach(function(baseStateItem) {
      if (baseStateItem != null && baseStateItem.batting_player_id === currentPlayer) {
        baseStateItem.batting_player_id = player;
      }
    });

  }

  return currentLineups;

}

function initializeBattingOrder(team) {

  // If we're using the DH, then put the pitcher at the end of the "batting order" so that he/she can be found in lookups and
  // have putouts and assists recorded in the summary

  let ret = [];
  let playerDHedFor = null;
  team.lineup.forEach(function(spot) {
    if (spot.lineup_position != null) {
      if (spot.lineup_position == DH_LINEUP_POSITION) {
        playerDHedFor = spot.player.player_id;
      } else {
        ret[spot.lineup_position-1] = spot.player.player_id;
      }
    }
  });
  if (playerDHedFor != null) {
    ret.push(playerDHedFor);
  }
  return ret;
}

function initializeDefense(team) {
  let ret = [];
  team.lineup.forEach(function(spot) {
    if (spot.fielder_position != null) {
      ret[spot.fielder_position-1] = spot.player.player_id;
    }
  });
  return ret;
}

module.exports.initializeLineups = initializeLineups;
module.exports.initializeBattingOrder = initializeBattingOrder;
module.exports.initializeDefense = initializeDefense;
module.exports.applySubstitution = applySubstitution;
module.exports.parseGames = parseGames;
module.exports.parseGame = parseGame;
module.exports.findPlayer = findPlayer;
module.exports.DH_LINEUP_POSITION = DH_LINEUP_POSITION;
