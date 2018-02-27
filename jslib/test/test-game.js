"use strict";

var assert = require('assert');
var Game = require('../src/game.js')
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
  it('Basic visitor', function() {
    let setupStructure = setup();
    let subPlay = new Object;
    subPlay.type = "substitution";
    subPlay.substitution = new Object;
    subPlay.substitution.player = new Object;
    subPlay.substitution.player.player_id = "v1";
    subPlay.substitution.lineup_position = 2;
    subPlay.substitution.fielder_position = 4;
    Game.applySubstitution(setupStructure.enhancedGame, setupStructure.currentLineups, subPlay);
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
    Game.applySubstitution(setupStructure.enhancedGame, setupStructure.currentLineups, subPlay);
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
    Game.applySubstitution(setupStructure.enhancedGame, setupStructure.currentLineups, subPlay);
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
    Game.applySubstitution(setupStructure.enhancedGame, setupStructure.currentLineups, subPlay);
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
