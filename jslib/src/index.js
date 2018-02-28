/*

  Top-level module file for baseball tools.  This is intended to expose the public interface of the toolkit.

  To prepare for use in the browser (assuming you're running this from the parent directory...that is, the one that includes src):

  browserify src/index.js -s bt -o dist/baseball-tools.js

  The resulting dist/baseball-tools.js script can be included directly in html, and the exported objects below are then available in a global variable called bt.

  (The -s option passed to browserify creates a "standalone" module bound to a global variable specified in the parameter to -s.)

*/

var Game = require("./game.js");

module.exports.parseGame = Game.parseGame;
