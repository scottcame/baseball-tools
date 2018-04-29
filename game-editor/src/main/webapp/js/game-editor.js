var current_game = null;
var enhanced_game = null;
var participants = [];
var activePlayIndex = null;
var activePitchIndex = null;

$("#add-game-form-ok").on("click", function(e) {
  current_game.game_id = "game1";
  current_game.visitor_team = new Object();
  current_game.visitor_team.team_name = $("#add-game-form-visitor").val();
  current_game.home_team = new Object();
  current_game.home_team.team_name = $("#add-game-form-home").val();
  current_game.start_date = $("#add-game-form-date").val();
});

$(function() {
  loadGame(null);
  setupUI();
});

function setupUI() {
  $('#btnInsertPlay').on('click', function (e) {
    handleInsertPlayClick(e);
  });
}

function handleInsertPlayClick(e) {
  insertNewPlayAboveActive();
}

function handlePitchLogClick(e) {
  let pitch = Number.parseInt(e.target.id.replace(/^pitch([0-9]+)$/, "$1"));
  $("#divPitchLog > a.active").removeClass("active");
  $(e.target).addClass("active");
  activePitchIndex = pitch;
  activePitchChanged();
}

function handleGameLogClick(e) {
  let play = Number.parseInt(e.target.id.replace(/^play([0-9]+)$/, "$1"));
  $("#divGameLog > a.active").removeClass("active");
  $(e.target).addClass("active");
  activePlayIndex = play;
  activePlayChanged();
}

function loadGame(identifier) {
  current_game = static_game.games[0];
  updateGame();
  current_game.home_team.lineup.forEach(function(spot) {
    participants.push([spot.player.player_id, spot.player.player_last_name, spot.player.player_first_name]);
  });
  current_game.visitor_team.lineup.forEach(function(spot) {
    participants.push([spot.player.player_id, spot.player.player_last_name, spot.player.player_first_name]);
  });
  participantsChanged();
  gameChanged();
}

function insertNewPlayAboveActive() {
  let p = new Object;
}

// called after any edit to the game
function updateGame() {
  enhanced_game = bt.parseGame(current_game);
  activePlayIndex = enhanced_game.plays.length-1;
  activePlayChanged();
  activePitchChanged();
}

function activePitchChanged() {
  let activePitch = getActivePitch();
  console.log("Active pitch changed: " + JSON.stringify(activePitch));
}

function activePlayChanged() {
  console.log("Active play changed: " + getActivePlay().play);
  let eps = getActivePlay().enhanced_pitch_sequence;
  activePitchIndex = eps == null ? null : eps.length-1;
  updatePitchLog();
}

function getActivePitch() {
  return getActivePlay().enhanced_pitch_sequence[activePitchIndex];
}

function getActivePlay() {
  return enhanced_game.plays[activePlayIndex];
}

function participantsChanged() {
  // nothing for now
  // todo: scan current lineups and update (updateLineups())
}

function gameChanged(enhanced_game) {
  updateGameLog();
  updateLineups();
}

function updatePitchLog() {
  $("#divPitchLog").empty();
  let activePlay = getActivePlay();
  if (activePlay.enhanced_pitch_sequence != null) {
    for (let index=activePlay.enhanced_pitch_sequence.length-1; index >= 0; index--) {
      let pitch = activePlay.enhanced_pitch_sequence[index];
      let desc = "[" + pitch.type + "]: " + pitch.velocity + "/" + pitch.pitch_type + "/" + "Z1";
      let poTest = pitch.type.match(/^([123])/);
      if (poTest != null) {
        desc = "[pickoff]: " + poTest[1] + "b";
      } else if (pitch.type === ".") {
        desc = "[.]: marker";
      }
      let active = (index == activePitchIndex) ? " active" : "";
      $("#divPitchLog").append("<a href='#' class='list-group-item list-group-item-action pitch-log-item" + active + "' id='pitch" + index + "'>" + desc + "</a>");
    }
    $('.pitch-log-item').on('click', function (e) {
      handlePitchLogClick(e);
    });
  }
}

function positionNumberToString(pn) {
  return ["p","c","1b","2b","3b","ss","lf","cf","rf","dh","ph","pr","eh","cr"][pn-1];
}

function lookupPlayerLastName(player_id) {
  let ret = null;
  participants.some(function(p) {
    if (p[0] === player_id) {
      ret = p[1];
      return true;
    }
    return false;
  });
  return ret;
}

function updateGameLog() {
  $("#divGameLog").empty();
  for (let i=current_game.plays.length-1; i >= 0; i--) {
    play = current_game.plays[i];
    let desc = null;
    if (play.type === "play") {
      desc = play.batting_team_id + " [" + play.inning + "]: " + play.play;
    } else {
      let currentI = i;
      let priorPlay = current_game.plays[--currentI];
      desc = priorPlay.batting_team_id + " [" + priorPlay.inning + "]: sub " + play.substitution.player.player_id + "[" +
        positionNumberToString(play.substitution.fielder_position) + "," + play.substitution.lineup_position + "]";
    }
    let active = (i == activePlayIndex) ? " active" : "";
    $("#divGameLog").append("<a href='#' class='list-group-item list-group-item-action game-log-item" + active + "' id='play" + i + "'>" + desc + "</a>");
  }
  $('.game-log-item').on('click', function (e) {
    handleGameLogClick(e);
  });
}

function updateLineups() {
  $("#homeLineupHeader").empty();
  $("#visitorLineupHeader").empty();
  $("#divHomeLineup").empty();
  $("#divVisitorLineup").empty();
  $("#homeLineupHeader").append(enhanced_game.home_team.team_name);
  $("#visitorLineupHeader").append(enhanced_game.visitor_team.team_name);
  enhanced_game.currentLineups.current_home_batting_order.forEach(function(spot, index) {
    let posNumber = positionNumberToString(enhanced_game.currentLineups.current_home_positions[index]);
    if (posNumber.length == 1) {
      posNumber += "&nbsp;"
    }
    $("#divHomeLineup").append("<li>" + posNumber + " " + lookupPlayerLastName(spot) + "</li>");
  });
  enhanced_game.currentLineups.current_visitor_batting_order.forEach(function(spot, index) {
    let posNumber = positionNumberToString(enhanced_game.currentLineups.current_visitor_positions[index]);
    if (posNumber.length == 1) {
      posNumber += "&nbsp;"
    }
    $("#divVisitorLineup").append("<li>" + posNumber + " " + lookupPlayerLastName(spot) + "</li>");
  });
}
