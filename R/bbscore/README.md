### R package `bbscore`

This package provides functions for reading, manipulating, and summarizing [baseball-json](https://github.com/scottcame/baseball-json) game results.  The
primary functions are:

* `parseGames()`: Read enhanced game JSON files in a directory and represent them as a list of tibbles with one row per event.  Note that the input files must
be "enhanced" by running them through the `parseGame()` function in `jslib`.  (Eventually, we may use the [V8 R package](https://github.com/jeroen/v8) to enhance
games on the fly.)
* `summarizeGames()`: Summarize the list of tibbles produced by `parseGames()` to produce offense, defense, and pitching summaries for individuals on a team, and write
these summaries into an Excel spreadsheet for sharing with coaches, fans, etc.
