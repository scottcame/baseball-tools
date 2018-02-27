"use strict";

var assert = require('assert');
var fs = require('fs');
var Summary = require('../src/summary.js')
var Game = require('../src/game.js')

describe('SummaryTest: Entire game', function() {

  let gameFile = "test/LAN201711010.json";
  // find box score at http://www.retrosheet.org/boxesetc/2017/B11010LAN2017.htm
  let games = JSON.parse(fs.readFileSync(gameFile, 'utf8'));
  let enhancedGames = Game.parseGames(games);
  let summary = Summary.getGameSummary(enhancedGames.games[0]);

  it('Headline', function() {
    //console.log(JSON.stringify(summary, null, 2));
    assert.deepEqual([2,3,0,0,0,0,0,0,0], summary.visitor_team_stats.runs_per_inning);
    assert.deepEqual([0,0,0,0,0,1,0,0,0], summary.home_team_stats.runs_per_inning);
    assert.equal(5, summary.visitor_team_stats.score);
    assert.equal(1, summary.home_team_stats.score);
    assert.equal(5, summary.visitor_team_stats.hits);
    assert.equal(6, summary.home_team_stats.hits);
    assert.equal(0, summary.visitor_team_stats.error_count);
    assert.equal(1, summary.home_team_stats.error_count);
  });

  it('Batting summary stats - visitor team', function() {
    //console.log(JSON.stringify(summary.visitor_team_stats.sb))
    assert.equal(summary.visitor_team_stats.lob, 5);
    assert.deepEqual(summary.visitor_team_stats.dp, [["corrc001","altuj001"]]);
    assert.deepEqual(summary.visitor_team_stats.doubles, [{"batting_player_id":"sprig001","pitcher_player_id":"darvy001"},{"batting_player_id":"gonzm002","pitcher_player_id":"darvy001"}]);
    assert.deepEqual(summary.visitor_team_stats.triples, []);
    assert.deepEqual(summary.visitor_team_stats.hr, [{"batting_player_id":"sprig001","pitcher_player_id":"darvy001","inning":2,"on":1,"out":2}]);
    assert.deepEqual(summary.visitor_team_stats.hbp, []);
    assert.deepEqual(summary.visitor_team_stats.sb, [
      {"base":"3d","runner_player_id":"brega001","pitcher_player_id":"darvy001","catcher_player_id":"barna001"},
      {"base":"2d","runner_player_id":"altuj001","pitcher_player_id":"jansk001","catcher_player_id":"barna001"}
    ]);
    assert.deepEqual(summary.visitor_team_stats.cs, []);
    assert.deepEqual(summary.visitor_team_stats.errors, []);
  });

  it('Batting summary stats - home team', function() {
    assert.equal(summary.home_team_stats.lob, 10);
    assert.deepEqual(summary.home_team_stats.dp, []);
    assert.deepEqual(summary.home_team_stats.doubles, [{"batting_player_id":"taylc001","pitcher_player_id":"mccul002"}]);
    assert.deepEqual(summary.home_team_stats.triples, []);
    assert.deepEqual(summary.home_team_stats.hr, []);
    assert.deepEqual(summary.home_team_stats.hbp, [
      {"batting_player_id":"turnj001","pitcher_player_id":"mccul002"},
      {"batting_player_id":"puigy001","pitcher_player_id":"mccul002"},
      {"batting_player_id":"herne001","pitcher_player_id":"mccul002"},
      {"batting_player_id":"turnj001","pitcher_player_id":"mccul002"}
    ]);
    assert.deepEqual(summary.home_team_stats.sb, []);
    assert.deepEqual(summary.home_team_stats.cs, []);
    assert.deepEqual(summary.home_team_stats.errors, ["bellc002"]);
  });

  it('Batting boxes', function() {

    let visitorBox = [
      [["sprig001", 5,2,2,2,0,1,2,0]],
      [["brega001", 4,1,0,0,0,3,1,2]],
      [["altuj001", 3,0,0,1,1,0,1,4]],
      [["corrc001", 4,0,1,0,0,0,3,3]],
      [["gurry001", 4,0,0,0,0,1,10,0]],
      [["mccab002", 3,1,0,0,1,2,8,1]],
      [["gonzm002", 3,1,2,0,1,0,1,0]],
      [
        ["reddj001", 2,0,0,0,0,0,0,0],
        ["gatte001", 0,0,0,0,1,0,0,0],
        ["mortc002", 1,0,0,0,0,1,0,0]
      ],
      [
        ["mccul002", 1,0,0,1,0,0,0,0],
        ["peacb001", 1,0,0,0,0,0,0,0],
        ["lirif001", 0,0,0,0,0,0,0,0],
        ["devec001", 0,0,0,0,0,0,0,0],
        ["maybc001", 2,0,0,0,0,1,1,0]
      ]
    ];

    let homeBox = [
      [["taylc001", 5,0,1,0,0,1,5,0]],
      [["seagc001", 4,0,1,0,1,1,1,1]],
      [["turnj001", 2,0,1,0,0,0,1,1]],
      [["bellc002", 4,0,0,0,0,3,8,1]],
      [["puigy001", 3,0,0,0,0,0,2,0]],
      [["pedej001", 4,1,1,0,0,2,0,0]],
      [["forsl001", 3,0,1,0,1,0,0,3]],
      [["barna001", 4,0,0,0,0,0,9,0]],
      [
        ["darvy001", 0,0,0,0,0,0,1,0],
        ["morrb001", 0,0,0,0,0,0,0,0],
        ["herne001", 0,0,0,0,0,0,0,0],
        ["kersc001", 1,0,0,0,0,1,0,1],
        ["ethia001", 1,0,1,1,0,0,0,0],
        ["jansk001", 0,0,0,0,0,0,0,0],
        ["wooda002", 0,0,0,0,0,0,0,0],
        ["utlec001", 1,0,0,0,0,1,0,0]
      ]
    ];

    let testBattingBoxes = function(stats, box) {
      box.forEach(function(spot, index) {
        let statsSpot = stats[index];
        assert.equal(spot.length, statsSpot.length);
        spot.forEach(function(line, lineIndex) {
          assert.deepEqual(line, statsSpot[lineIndex]);
        });
      });
    };

    testBattingBoxes(summary.box.visitor_team.batting, visitorBox);
    testBattingBoxes(summary.box.home_team.batting, homeBox);

  });

  it('Pitching boxes', function() {

    let visitorBox = [
      ["mccul002", 2.1,3,0,0,0,3,0,13],
      ["peacb001", 2,1,0,0,1,2,0,8],
      ["lirif001", 0.1,0,0,0,0,0,0,1],
      ["devec001", 0.1,0,0,0,0,0,0,1],
      ["mortc002", 4,2,1,1,1,4,0,15]
    ];

    let homeBox = [
      ["darvy001", 1.2,3,5,4,1,0,1,10],
      ["morrb001", 0.1,0,0,0,0,1,0,1],
      ["kersc001", 4,2,0,0,2,4,0,16],
      ["jansk001", 1,0,0,0,1,1,0,4],
      ["wooda002", 2,0,0,0,0,3,0,6]
    ];

    let testPitchingBoxes = function(stats, box) {
      box.forEach(function(pitcher, index) {
        assert.deepEqual(pitcher, stats[index]);
      });
    };

    testPitchingBoxes(summary.box.visitor_team.pitching, visitorBox);
    testPitchingBoxes(summary.box.home_team.pitching, homeBox);

  });

  it('SummaryTest: Partial game only', function() {
    let summary = Summary.getGameSummaryToPlay(enhancedGames.games[0], 5);
    assert.deepEqual([2], summary.visitor_team_stats.runs_per_inning);
    assert.deepEqual([], summary.home_team_stats.runs_per_inning);
    summary = Summary.getGameSummaryToPlay(enhancedGames.games[0], 10);
    assert.deepEqual([2], summary.visitor_team_stats.runs_per_inning);
    assert.deepEqual([0], summary.home_team_stats.runs_per_inning);
  });

});
