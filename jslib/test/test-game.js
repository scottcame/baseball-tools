"use strict";

var assert = require('assert');
var Game = require('../src/game.js')
var Summary = require('../src/summary.js')
var fs = require('fs');

describe('Initialize Batting Order Tests', function() {
  it('Basic', function() {
    let o = new Object;
    o.lineup = [];
    for (let i=1;i <= 12;i++) {
      let spot = new Object;
      spot.player = new Object;
      spot.player.player_id = "p" + (12 - i + 1);
      if (i < 10) {
        spot.lineup_position = i;
      }
      o.lineup.push(spot);
    }
    let battingOrder = Game.initializeBattingOrder(o);
    assert.equal(9, battingOrder.length);
    assert.deepEqual(["p12","p11","p10","p9","p8","p7","p6","p5","p4"], battingOrder);
  });
});

describe('Initialize Defense Tests', function() {
  it('Basic with DH', function() {
    let o = new Object;
    o.lineup = [];
    for (let i=1;i <= 14;i++) {
      let spot = new Object;
      spot.player = new Object;
      spot.player.player_id = "p" + (14 - i + 1);
      if (i < 11) {
        spot.fielder_position = i;
      }
      o.lineup.push(spot);
    }
    let defense = Game.initializeDefense(o);
    assert.equal(10, defense.length);
    assert.deepEqual(["p14","p13","p12","p11","p10","p9","p8","p7","p6","p5"], defense);
  });
  it('Basic without DH', function() {
    let o = new Object;
    o.lineup = [];
    for (let i=1;i <= 14;i++) {
      let spot = new Object;
      spot.player = new Object;
      spot.player.player_id = "p" + (14 - i + 1);
      if (i < 10) {
        spot.fielder_position = i;
      }
      o.lineup.push(spot);
    }
    let defense = Game.initializeDefense(o);
    assert.equal(9, defense.length);
    assert.deepEqual(["p14","p13","p12","p11","p10","p9","p8","p7","p6"], defense);
  });
});

describe('Substitution Tests', function() {
  let setup = function() {
    let ret = new Object;
    let enhancedGame = new Object;
    enhancedGame.visitor_team = new Object;
    enhancedGame.visitor_team.lineup = [];
    for (let i=1;i <= 12;i++) {
      let spot = new Object;
      spot.player = new Object;
      spot.player.player_id = "v" + (12 - i + 1);
      if (i < 10) {
        spot.lineup_position = i;
      }
      enhancedGame.visitor_team.lineup.push(spot);
    }
    enhancedGame.home_team = new Object;
    enhancedGame.home_team.lineup = [];
    for (let i=1;i <= 12;i++) {
      let spot = new Object;
      spot.player = new Object;
      spot.player.player_id = "h" + (12 - i + 1);
      if (i < 10) {
        spot.lineup_position = i;
      }
      enhancedGame.home_team.lineup.push(spot);
    }
    ret.currentLineups = Game.initializeLineups(enhancedGame);
    ret.enhancedGame = enhancedGame;
    return ret;
  };
  let lastBaseState = [null, null, null];
  it('Basic visitor', function() {
    let setupStructure = setup();
    let subPlay = new Object;
    subPlay.type = "substitution";
    subPlay.substitution = new Object;
    subPlay.substitution.player = new Object;
    subPlay.substitution.player.player_id = "v1";
    subPlay.substitution.lineup_position = 2;
    subPlay.substitution.fielder_position = 4;
    Game.applySubstitution(setupStructure.enhancedGame, setupStructure.currentLineups, subPlay, lastBaseState);
    assert.equal("v1", setupStructure.currentLineups.current_visitor_batting_order[1]);
    assert.equal("v1", setupStructure.currentLineups.current_visitor_defense[3]);
  });
  it('Basic home', function() {
    let setupStructure = setup();
    let subPlay = new Object;
    subPlay.type = "substitution";
    subPlay.substitution = new Object;
    subPlay.substitution.player = new Object;
    subPlay.substitution.player.player_id = "h3";
    subPlay.substitution.lineup_position = 7;
    subPlay.substitution.fielder_position = 3;
    Game.applySubstitution(setupStructure.enhancedGame, setupStructure.currentLineups, subPlay, lastBaseState);
    assert.equal("h3", setupStructure.currentLineups.current_home_batting_order[6]);
    assert.equal("h3", setupStructure.currentLineups.current_home_defense[2]);
  });
  it('Player not found - no change to lineups', function() {
    let setupStructure = setup();
    let subPlay = new Object;
    subPlay.type = "substitution";
    subPlay.substitution = new Object;
    subPlay.substitution.player = new Object;
    subPlay.substitution.player.player_id = "not-a-real-player";
    subPlay.substitution.lineup_position = 7;
    subPlay.substitution.fielder_position = 3;
    let priorBattingOrder = setupStructure.currentLineups.current_home_batting_order;
    let priorDefense = setupStructure.currentLineups.current_home_defense;
    Game.applySubstitution(setupStructure.enhancedGame, setupStructure.currentLineups, subPlay, lastBaseState);
    assert.deepEqual(priorBattingOrder, setupStructure.currentLineups.current_home_batting_order);
    assert.deepEqual(priorDefense, setupStructure.currentLineups.current_home_defense);
  });
  it('Pinch hitter - no change to defense', function() {
    let setupStructure = setup();
    let subPlay = new Object;
    subPlay.type = "substitution";
    subPlay.substitution = new Object;
    subPlay.substitution.player = new Object;
    subPlay.substitution.player.player_id = "h1";
    subPlay.substitution.lineup_position = 2;
    subPlay.substitution.fielder_position = 11;
    let priorDefense = setupStructure.currentLineups.current_home_defense;
    Game.applySubstitution(setupStructure.enhancedGame, setupStructure.currentLineups, subPlay, lastBaseState);
    assert.equal("h1", setupStructure.currentLineups.current_home_batting_order[1]);
    assert.deepEqual(priorDefense, setupStructure.currentLineups.current_home_defense);
  });
});

describe('Enhanced game play tests', function() {
  it('Basic', function() {
    let games = JSON.parse(fs.readFileSync("test/LAN201711010.json", 'utf8'));
    let enhancedGames = Game.parseGames(games);
    fs.writeFileSync('LAN201711010-enhanced.json', JSON.stringify(enhancedGames, null, 2));
    // for now, we just make sure there are no errors.
  });
});

describe("Game boundary conditions", function() {
  it('Game with no plays', function() {
    let game = new Object;
    game.home_team = new Object;
    game.home_team.team_id = "HOM";
    let lineup = [];
    for (let i=0;i < 15;i++) {
      let o = new Object;
      o.fielder_position = i+1;
      o.lineup_position = i+1;
      o.player = new Object;
      o.player.player_id = "PH" + i;
      o.player.player_last_name = "P home " + i;
      o.starter = i < 9;
      lineup.push(o);
    }
    game.home_team.lineup = lineup;
    game.visitor_team = new Object;
    game.visitor_team.team_id = "VIZ";
    lineup = [];
    for (let i=0;i < 16;i++) {
      let o = new Object;
      o.fielder_position = i+1;
      o.lineup_position = i+1;
      o.player = new Object;
      o.player.player_id = "PV" + i;
      o.player.player_last_name = "P viz " + i;
      o.starter = i < 9;
      lineup.push(o);
    }
    game.visitor_team.lineup = lineup;
    game.game_id = "MyGame";
    game.plays = [];
    let eg = Game.parseGame(game);
    assert.equal(game.plays.length, eg.plays.length);
    let s = Summary.getGameSummary(eg);
  });
  it('Unexpected batter', function() {
    let game = new Object;
    game.home_team = new Object;
    game.home_team.team_id = "HOM";
    let lineup = [];
    for (let i=0;i < 15;i++) {
      let o = new Object;
      o.fielder_position = i+1;
      o.lineup_position = i+1;
      o.player = new Object;
      o.player.player_id = "PH" + i;
      o.player.player_last_name = "P home " + i;
      o.starter = i < 9;
      lineup.push(o);
    }
    game.home_team.lineup = lineup;
    game.visitor_team = new Object;
    game.visitor_team.team_id = "VIZ";
    lineup = [];
    for (let i=0;i < 16;i++) {
      let o = new Object;
      o.fielder_position = i+1;
      o.lineup_position = i+1;
      o.player = new Object;
      o.player.player_id = "PV" + i;
      o.player.player_last_name = "P viz " + i;
      o.starter = i < 9;
      lineup.push(o);
    }
    game.visitor_team.lineup = lineup;
    game.game_id = "MyGame";
    game.plays = [];
    game.plays.push({
      "type": "play",
      "inning": 1,
      "batting_team_id": "VIZ",
      "batting_player_id": "PV1",
      "count": "02",
      "pitch_sequence": "SCX",
      "play": "31/G-",
      "enhanced_pitch_sequence": [
        {
          "type": "S",
          "velocity": 95.7,
          "pitch_type": "FF",
          "location": {
            "x": 0.320106343279761,
            "z": 1.96774632961962
          },
          "time": "2017-11-02T00:26:42Z"
        },
        {
          "type": "C",
          "velocity": 84.7,
          "pitch_type": "SL",
          "location": {
            "x": -0.191016133472106,
            "z": 2.00797747217167
          },
          "time": "2017-11-02T00:27:04Z"
        },
        {
          "type": "X",
          "velocity": 87.5,
          "pitch_type": "CH",
          "location": {
            "x": 0.0696062995225629,
            "z": 2.69852350199868
          },
          "time": "2017-11-02T00:27:30Z"
        }
      ]
    });
    game.plays.push({
      "type": "play",
      "inning": 1,
      "batting_team_id": "VIZ",
      "batting_player_id": "PV8", // should be PV 2
      "count": "02",
      "pitch_sequence": "SCX",
      "play": "31/G-",
      "enhanced_pitch_sequence": [
        {
          "type": "S",
          "velocity": 95.7,
          "pitch_type": "FF",
          "location": {
            "x": 0.320106343279761,
            "z": 1.96774632961962
          },
          "time": "2017-11-02T00:26:42Z"
        },
        {
          "type": "C",
          "velocity": 84.7,
          "pitch_type": "SL",
          "location": {
            "x": -0.191016133472106,
            "z": 2.00797747217167
          },
          "time": "2017-11-02T00:27:04Z"
        },
        {
          "type": "X",
          "velocity": 87.5,
          "pitch_type": "CH",
          "location": {
            "x": 0.0696062995225629,
            "z": 2.69852350199868
          },
          "time": "2017-11-02T00:27:30Z"
        }
      ]
    });
    game.plays.push({
      "type": "play",
      "inning": 1,
      "batting_team_id": "VIZ",
      "batting_player_id": "PV888", // should be PV 3, and PV888 doesn't even exist
      "count": "02",
      "pitch_sequence": "SCX",
      "play": "31/G-",
      "enhanced_pitch_sequence": [
        {
          "type": "S",
          "velocity": 95.7,
          "pitch_type": "FF",
          "location": {
            "x": 0.320106343279761,
            "z": 1.96774632961962
          },
          "time": "2017-11-02T00:26:42Z"
        },
        {
          "type": "C",
          "velocity": 84.7,
          "pitch_type": "SL",
          "location": {
            "x": -0.191016133472106,
            "z": 2.00797747217167
          },
          "time": "2017-11-02T00:27:04Z"
        },
        {
          "type": "X",
          "velocity": 87.5,
          "pitch_type": "CH",
          "location": {
            "x": 0.0696062995225629,
            "z": 2.69852350199868
          },
          "time": "2017-11-02T00:27:30Z"
        }
      ]
    });
    let eg = Game.parseGame(game);
    assert.equal(game.plays.length, eg.plays.length);
    let s = Summary.getGameSummary(eg);
  });
});

describe('Positions tests', function() {
  it('No DH', function() {
    let games = JSON.parse(fs.readFileSync("test/LAN201711010.json", 'utf8'));
    let enhancedGames = Game.parseGames(games);
    let g = enhancedGames.games[0];
    let p = g.currentLineups.current_visitor_positions;
    assert.deepEqual([9,5,4,6,3,2,7,1,8], p);
    p = g.currentLineups.current_home_positions;
    assert.deepEqual([8,6,5,3,9,7,4,2,11], p);
  });
  it('DH', function() {
    let games = JSON.parse(fs.readFileSync("test/HOU201710290.json", 'utf8'));
    let enhancedGames = Game.parseGames(games);
    let g = enhancedGames.games[0];
    let p = g.currentLineups.current_visitor_positions;
    assert.deepEqual([4,6,10,7,3,5,9,2,8,1], p);
    p = g.currentLineups.current_home_positions;
    assert.deepEqual([9,5,4,6,8,7,10,3,12,1], p);
  });
});
