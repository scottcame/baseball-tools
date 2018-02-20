current_game = new Object();

$("#add-game-form-ok").on("click", function(e) {
  current_game.game_id = "game1";
  current_game.visitor_team = new Object();
  current_game.visitor_team.team_name = $("#add-game-form-visitor").val();
  current_game.home_team = new Object();
  current_game.home_team.team_name = $("#add-game-form-home").val();
  current_game.start_date = $("#add-game-form-date").val();
});

$(function() {
});
