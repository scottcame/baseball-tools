"use strict";

var assert = require('assert');
var fs = require('fs');
var Summary = require('../src/summary.js')
var Game = require('../src/game.js')

describe('SummaryTest: Runs per inning', function() {
  it('SummaryTest: Entire game', function() {
    let games = JSON.parse(fs.readFileSync("test/LAN201711010.json", 'utf8'));
    let enhancedGames = Game.parseGames(games);
    let summary = Summary.getGameSummary(enhancedGames.games[0]);
    console.log(JSON.stringify(summary, null, 2));
  });
  it('SummaryTest: First five plays', function() {
    let games = JSON.parse(fs.readFileSync("test/LAN201711010.json", 'utf8'));
    let enhancedGames = Game.parseGames(games);
    let summary = Summary.getGameSummaryToPlay(enhancedGames.games[0], 5);
    //console.log(JSON.stringify(summary, null, 2));
  });
});
