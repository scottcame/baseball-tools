"use strict";

var assert = require('assert');
var Game = require('../src/game.js')
var Summary = require('../src/summary.js')
var fs = require('fs');

describe('Initialize Batting Order Tests', function() {
  it('Basic No DH', function() {
    let o = new Object;
    o.lineup = [];
    let players = ['p','c','1b','2b','3b','ss','lf','cf','rf','sub1','sub2','sub3'];
    for (let i=1;i <= 12;i++) {
      let spot = new Object;
      spot.player = new Object;
      spot.player.player_id = players[i-1];
      if (i < 10) {
        spot.lineup_position = i;
      }
      o.lineup.push(spot);
    }
    let battingOrder = Game.initializeBattingOrder(o);
    assert.equal(9, battingOrder.length);
    assert.deepEqual(['p','c','1b','2b','3b','ss','lf','cf','rf'], battingOrder);
  });
  it('Basic DH', function() {
    let o = new Object;
    o.lineup = [];
    // 12 players on the lineup card
    let players = ['p','c','1b','2b','3b','ss','lf','cf','rf','dh','sub1','sub2'];
    for (let i=1;i <= 12;i++) {
      let spot = new Object;
      spot.player = new Object;
      spot.player.player_id = players[i-1];
      if (i < 11) {
        spot.lineup_position = i-1; // pitcher, in this scenario, is DHed for so goes in lineup slot 0
        spot.fielder_position = i;
      }
      o.lineup.push(spot);
    }
    let battingOrder = Game.initializeBattingOrder(o);
    assert.equal(9, battingOrder.length);
    assert.deepEqual(['c','1b','2b','3b','ss','lf','cf','rf','dh'], battingOrder);
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
    assert.throws(() => {
      Summary.getGameSummary(eg);
    }, /not found in lineup/);
  });
});

// describe('Positions tests', function() {
//   it('No DH', function() {
//     let games = JSON.parse(fs.readFileSync("test/LAN201711010.json", 'utf8'));
//     let enhancedGames = Game.parseGames(games);
//     let g = enhancedGames.games[0];
//     let p = g.currentLineups.current_visitor_positions;
//     assert.deepEqual([9,5,4,6,3,2,7,1,8], p);
//     p = g.currentLineups.current_home_positions;
//     assert.deepEqual([8,6,5,3,9,7,4,2,11], p);
//   });
//   it('DH', function() {
//     let games = JSON.parse(fs.readFileSync("test/HOU201710290.json", 'utf8'));
//     let enhancedGames = Game.parseGames(games);
//     let g = enhancedGames.games[0];
//     let p = g.currentLineups.current_visitor_positions;
//     assert.deepEqual([4,6,10,7,3,5,9,2,8,1], p);
//     p = g.currentLineups.current_home_positions;
//     assert.deepEqual([9,5,4,6,8,7,10,3,12,1], p);
//   });
// });

describe('Lineup tests No DH', function() {

  it('Position', function() {
    let games = JSON.parse(fs.readFileSync("test/LAN201711010.json", 'utf8'));
    let g = Game.parseGame(games.games[0]);
    g.plays.forEach(function(play, index) {
      if (play.type === "play") {
        let pos = play.enhanced_play.lineupPosition;
        let gg = Game.parseGameToPlay(games.games[0], index);
        let lineup = gg.currentLineups.current_home_batting_order;
        if (g.visitor_team.team_id === play.batting_team_id) {
          lineup = gg.currentLineups.current_visitor_batting_order;
        }
        assert.equal(play.batting_player_id, lineup[pos]);
      }
    });
  });

  it('Batting team', function() {
    let games = JSON.parse(fs.readFileSync("test/LAN201711010.json", 'utf8'));
    let g = Game.parseGame(games.games[0]);
    g.plays.forEach(function(play, index) {
      if (play.type === "play" && index < g.plays - 1) {
        let gg = Game.parseGameToPlay(games.games[0], index-1);
        assert.equal(play.batting_team_id, gg.currentLineups.next_batter_team);
      }
    });
  });

});

describe('Lineup tests DH', function() {

  it('Position', function() {
    let games = JSON.parse(fs.readFileSync("test/HOU201710290.json", 'utf8'));
    let g = Game.parseGame(games.games[0]);
    g.plays.forEach(function(play, index) {
      if (play.type === "play") {
        let pos = play.enhanced_play.lineupPosition;
        let gg = Game.parseGameToPlay(games.games[0], index);
        let lineup = gg.currentLineups.current_home_batting_order;
        if (g.visitor_team.team_id === play.batting_team_id) {
          lineup = gg.currentLineups.current_visitor_batting_order;
        }
        assert.equal(play.batting_player_id, lineup[pos]);
      }
    });
  });

  it('Batting team', function() {
    let games = JSON.parse(fs.readFileSync("test/HOU201710290.json", 'utf8'));
    let g = Game.parseGame(games.games[0]);
    g.plays.forEach(function(play, index) {
      if (play.type === "play" && index < g.plays - 1) {
        let gg = Game.parseGameToPlay(games.games[0], index-1);
        assert.equal(play.batting_team_id, gg.currentLineups.next_batter_team);
      }
    });
  });

});

describe('BO> Batting order tracking tests', function() {

  it('Basic', function() {
    // let games = JSON.parse(fs.readFileSync("test/LAN201711010.json", 'utf8'));
    // let g = Game.parseGameToPlay(games.games[0], 4);
    // g.plays.forEach(function(play, index) {
    //   if (index > 0 && play.type === "play") {
    //     let gg = Game.parseGameToPlay(games.games[0], index-1);
    //     console.log("Testing inning " + play.inning + ", batter=" + play.batting_player_id + ", gg.plays.length=" + gg.plays.length + ", index=" + index);
    //     let p = Game.createNextPlay(gg);
    //     assert.equal(play.inning, p.inning);
    //     assert.equal(play.batting_team_id, p.batting_team_id);
    //     assert.equal(play.batting_player_id, p.batting_player_id);
    //     console.log("Successful test of " + play.batting_player_id + " === " + p.batting_player_id);
    //   }
    // });
  });

});

describe('GLEEB DH Substitution Tests', function() {
  let setupWithoutDH = function() {
    let ret = new Object;
    let enhancedGame = new Object;
    enhancedGame.visitor_team = new Object;
    enhancedGame.visitor_team.lineup = [];
    let players = ['vp','vc','v1b','v2b','v3b','vss','vlf','vcf','vrf','vsub1','vsub2','vsub3'];
    for (let i=1;i <= 12;i++) {
      let spot = new Object;
      spot.player = new Object;
      spot.player.player_id = players[i-1];
      if (i < 10) {
        spot.lineup_position = i;
        spot.fielder_position = i;
      }
      enhancedGame.visitor_team.lineup.push(spot);
    }
    enhancedGame.home_team = new Object;
    enhancedGame.home_team.lineup = [];
    players = ['hp','hc','h1b','h2b','h3b','hss','hlf','hcf','hrf','hsub1','hsub2','hsub3'];
    for (let i=1;i <= 12;i++) {
      let spot = new Object;
      spot.player = new Object;
      spot.player.player_id = players[i-1];
      if (i < 10) {
        spot.lineup_position = i;
        spot.fielder_position = i;
      }
      enhancedGame.home_team.lineup.push(spot);
    }
    ret.currentLineups = Game.initializeLineups(enhancedGame);
    ret.enhancedGame = enhancedGame;
    return ret;
  };
  let setupWithDH = function() {
    let ret = new Object;
    let enhancedGame = new Object;
    enhancedGame.visitor_team = new Object;
    enhancedGame.visitor_team.lineup = [];
    let players = ['vp','vc','v1b','v2b','v3b','vss','vlf','vcf','vrf','vdh','vsub1','vsub2'];
    for (let i=1;i <= 12;i++) {
      let spot = new Object;
      spot.player = new Object;
      spot.player.player_id = players[i-1];
      if (i < 11) {
        spot.lineup_position = i-1;
        spot.fielder_position = i;
      }
      enhancedGame.visitor_team.lineup.push(spot);
    }
    enhancedGame.home_team = new Object;
    enhancedGame.home_team.lineup = [];
    players = ['hp','hc','h1b','h2b','h3b','hss','hlf','hcf','hrf','hdh','hsub1','hsub2'];
    for (let i=1;i <= 12;i++) {
      let spot = new Object;
      spot.player = new Object;
      spot.player.player_id = players[i-1];
      if (i < 11) {
        spot.lineup_position = i-1;
        spot.fielder_position = i;
      }
      enhancedGame.home_team.lineup.push(spot);
    }
    ret.currentLineups = Game.initializeLineups(enhancedGame);
    ret.enhancedGame = enhancedGame;
    return ret;
  };
  let setupWithDHIn4Hole = function() {
    let ret = new Object;
    let enhancedGame = new Object;
    enhancedGame.visitor_team = new Object;
    enhancedGame.visitor_team.lineup = [];
    let players = ['vp','vc','v1b','v2b','v3b','vss','vlf','vcf','vrf','vdh','vsub1','vsub2'];
    for (let i=1;i <= 12;i++) {
      let spot = new Object;
      spot.player = new Object;
      spot.player.player_id = players[i-1];
      if (i < 11) {
        spot.lineup_position = i-1;
        spot.fielder_position = i;
      }
      enhancedGame.visitor_team.lineup.push(spot);
    }
    enhancedGame.home_team = new Object;
    enhancedGame.home_team.lineup = [];
    players = ['hp','hc','h1b','h2b','h3b','hss','hlf','hcf','hrf','hdh','hsub1','hsub2'];
    let bo = [3, 1, 2, 0, 5, 8, 7, 9, 6, 4];
    for (let i=1;i <= 12;i++) {
      let spot = new Object;
      spot.player = new Object;
      spot.player.player_id = players[i-1];
      if (i < 11) {
        spot.lineup_position = bo[i-1];
        spot.fielder_position = i;
      }
      enhancedGame.home_team.lineup.push(spot);
    }
    ret.currentLineups = Game.initializeLineups(enhancedGame);
    ret.enhancedGame = enhancedGame;
    return ret;
  };
  let lastBaseState = [null, null, null];
  it('Sub position player', function() {
    let setupStructure = setupWithDH();
    let subPlay = new Object;
    subPlay.type = "substitution";
    subPlay.substitution = new Object;
    subPlay.substitution.player = new Object;
    subPlay.substitution.player.player_id = "hsub1";
    subPlay.substitution.lineup_position = 1;
    subPlay.substitution.fielder_position = 2;
    assert.equal("hc", setupStructure.currentLineups.current_home_batting_order[0]);
    assert.equal("hc", setupStructure.currentLineups.current_home_defense[1]);
    Game.applySubstitution(setupStructure.enhancedGame, setupStructure.currentLineups, subPlay, lastBaseState);
    assert.equal("hsub1", setupStructure.currentLineups.current_home_batting_order[0]);
    assert.equal("hsub1", setupStructure.currentLineups.current_home_defense[1]);
  });
  it('Erase DH', function() {
    let setupStructure = setupWithDH();
    let subPlay = new Object;
    subPlay.type = "substitution";
    subPlay.substitution = new Object;
    subPlay.substitution.player = new Object;
    subPlay.substitution.player.player_id = "hdh";
    subPlay.substitution.lineup_position = 9;
    subPlay.substitution.fielder_position = 1;
    assert.equal("hc", setupStructure.currentLineups.current_home_batting_order[0]);
    assert.equal("hdh", setupStructure.currentLineups.current_home_batting_order[8]);
    assert.equal(10, setupStructure.currentLineups.current_home_defense.length);
    assert.equal("hdh", setupStructure.currentLineups.current_home_defense[9]);
    assert.equal("hp", setupStructure.currentLineups.current_home_defense[0]);
    Game.applySubstitution(setupStructure.enhancedGame, setupStructure.currentLineups, subPlay, lastBaseState);
    assert.equal("hc", setupStructure.currentLineups.current_home_batting_order[0]);
    assert.equal("hdh", setupStructure.currentLineups.current_home_batting_order[8]);
    assert.equal(9, setupStructure.currentLineups.current_home_defense.length);
    assert.equal("hdh", setupStructure.currentLineups.current_home_defense[0]);
  });
  it('GLEEK Erase DH in 4 spot', function() {

    let setupStructure = setupWithDHIn4Hole();

    let subPlay = new Object;
    subPlay.type = "substitution";
    subPlay.substitution = new Object;
    subPlay.substitution.player = new Object;
    subPlay.substitution.player.player_id = "hdh";
    subPlay.substitution.lineup_position = 4;
    subPlay.substitution.fielder_position = 4;

    assert.equal("hdh", setupStructure.currentLineups.current_home_batting_order[3]);
    assert.equal(10, setupStructure.currentLineups.current_home_defense.length);
    assert.equal("hdh", setupStructure.currentLineups.current_home_defense[9]);
    assert.equal("h2b", setupStructure.currentLineups.current_home_defense[3]);

    Game.applySubstitution(setupStructure.enhancedGame, setupStructure.currentLineups, subPlay, lastBaseState);
    
    assert.equal("hdh", setupStructure.currentLineups.current_home_batting_order[3]);
    assert.equal(9, setupStructure.currentLineups.current_home_defense.length);
    assert.equal("hdh", setupStructure.currentLineups.current_home_defense[3]);

  });
});
