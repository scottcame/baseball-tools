### jslib: baseball-json Node.js module and applications

`jslib` provides a [Node.js](https://nodejs.org/en/) module and applications for converting, processing, and summarizing [baseball-json](https://github.com/scottcame/baseball-json) game
results.

#### Exposed functions

The module, accessible via `require('./src/index.js')`, contains the following functions:

* `parseGameFile()`:  Takes the path to a baseball-json game file and "enhances" it by calculating higher-order attributes of game state from the raw plays
* `parseGames()`: Takes an array of simple, raw baseball-json game objects, and enhances them
* `parseGame()`: Enhances a single baseball-json game object
* `getGameSummary()`: Creates a summary structure (basically, the contents of a full box score, with stats as specified in MLB Rule 10.02) from a baseball-json game object

These functions' behavior is wrapped in a set of Node applications that form a sort of "pipeline" that starts with a Retrosheet event file, and end with baseball-json game files, enhanced game files, summary files, and box scores.

(Note: to run the applications, you need to have Node.js installed.  This is a fairly straightforward install from the [Node.js home page](https://nodejs.org/en/).)

#### Usage

To illustrate the processing pipeline, consider the following example of Game 7 of the 2017 World Series.  We could start with the Retrosheet event, roster, and team files (available inside the 2017 postseason zip file
  at http://www.retrosheet.org/events/2017post.zip).  However, it might be a little easier to enter the data into a spreadsheet, where the rows are the same as the lines in the corresponding Retrosheet files, and the columns, separated
  by commas in the Retrosheet files, are simply separated into columns in the spreadsheet.  We've created the spreadsheet version of this game file [here](../example-data/LAN201711010.xlsx).

First, we run the `convert-retrosheet-excel.js` application (from the root of the `jslib` directory tree), with the first command-line parameter being the directory into which to write the equivalent Retrosheet files, and the second parameter
being the year in which the game occurred:

```
node src/convert-retrosheet-excel.js ../example-data/LAN201711010.xlsx ../example-data 2017
```

This command expects additional spreadsheets for the two team rosters (in this case, `LAN2017.xlsx` and `HOU2017.xlsx`) and a team-year file (in this case, `TEAM2017.xlsx`) to exist.
After the conversion, the file `../example-data/LAN201711010.EVE` is created, along with the `.ROS` roster files for the two teams and the `TEAM2017` file.  Now, we need to convert these Retrosheet files (which are identical to the files that
  Retrosheet provides...but again, we wanted to show the functionality of the Excel conversion) to baseball-json format:

```
node src/convert-retrosheet.js ../example-data/LAN201711010.EVE LAN201711010 --merge-pitch-fx=false
Processing game LAN201711010 from data directory ../example-data
Read 1543 umpires and 18946 players from Chadwick register
Skipping integration of PitchF/X data per command line option
```

The first command-line parameter here is the input `.EVE` (Retrosheet event file) to process, and the second parameter is the game ID within that file.  In this case, there is only one game in the input file, but there could be more than one.

Before running this command, we downloaded the [Chadwick regsiter](https://github.com/chadwickbureau/register/blob/master/data/people.csv) file and the [Retrosheet parks file](http://www.retrosheet.org/parkcode.txt) and placed them in the parent directory
of the directory where the game file being processed resides.  `convert-retrosheet.js` will work fine without these, but will be unable to pull in umpire names and park information without them.

The third parameter indicates whether we want to pull in enhanced pitch information from PitchFX data online.  We have added an extension to the Retrosheet structure to handle the PitchFX attributes (like velocity, location, and type).  In this case,
we elect to retain the original, basic Retrosheet pitch-by-pitch information.

Finally, we can generate a box score for this game (similar to the output of the Chadwick `cwbox` tool), and in the process we can save off the enhanced game file and the intermediate summary file:

```
node src/boxscore.js ../example-data/LAN201711010.json --intermediate-files=true
Writing intermediate enhanced/summary files to /Users/scott/git-repos/scottcame/baseball-tools/example-data
Houston Astros 5, Los Angeles Dodgers 1
Wednesday, November 1st 2017

Houston Astros          2  3  0  0  0  0  0  0  0    :   5     5     0
Los Angeles Dodgers     0  0  0  0  0  1  0  0  0    :   1     6     1

   *** Houston Astros ***

                         AB    QAB   R     H     RBI   BB    K     PO    A     PA
Springer cf,rf           5     2     2     2     2     0     1     2     0     5
Bregman 3b               4     1     1     0     0     0     3     1     2     4
Altuve 2b                3     2     0     0     1     1     0     1     4     4
Correa ss                4     1     0     1     0     0     0     3     3     4
Gurriel 1b               4     1     0     0     0     0     1     10    0     4
McCann c                 3     1     1     0     0     1     2     8     1     4
Gonzalez lf              3     3     1     2     0     1     0     1     0     4
Reddick rf               2     0     0     0     0     0     0     0     0     2
  Gattis ph              0     1     0     0     0     1     0     0     0     1
  Morton p               1     0     0     0     0     0     1     0     0     1
McCullers p              1     1     0     0     1     0     0     0     0     1
  Peacock p              1     0     0     0     0     0     0     0     0     1
  Liriano p              0     0     0     0     0     0     0     0     0     0
  Devenski p             0     0     0     0     0     0     0     0     0     0
  Maybin ph,cf           2     0     0     0     0     0     1     1     0     2

Team LOB: 5

Batting:
--------

2B: Springer: 1 off Darvish; Gonzalez: 1 off Darvish
HR: Springer: 1 off Darvish

Baserunning:
------------

SB:
 3d: Bregman: 1 off Barnes
 2d: Altuve: 1 off Barnes


Pitching:
---------

                         IP    H     R     ER    BB    SO    HR    BF    PT    PS%
McCullers                2.1   3     0     0     0     3     0     13    49    55
Peacock                  2     1     0     0     1     2     0     8     37    65
Liriano                  0.1   0     0     0     0     0     0     1     4     50
Devenski                 0.1   0     0     0     0     0     0     1     6     83
Morton (W)               4     2     1     1     1     4     0     15    52    71



   *** Los Angeles Dodgers ***

                         AB    QAB   R     H     RBI   BB    K     PO    A     PA
Taylor cf                5     1     0     1     0     0     1     5     0     5
Seager ss                4     2     0     1     0     1     1     1     1     5
Turner 3b                2     3     0     1     0     0     0     1     1     4
Bellinger 1b             4     0     0     0     0     0     3     8     1     4
Puig rf                  3     1     0     0     0     0     0     2     0     4
Pederson lf              4     1     1     1     0     0     2     0     0     4
Forsythe 2b              3     2     0     1     0     1     0     0     3     4
Barnes c                 4     0     0     0     0     0     0     9     0     4
Darvish p                0     0     0     0     0     0     0     1     0     0
  Morrow p               0     0     0     0     0     0     0     0     0     0
  Hernandez ph           0     1     0     0     0     0     0     0     0     1
  Kershaw p              1     0     0     0     0     0     1     0     1     1
  Ethier ph              1     1     0     1     1     0     0     0     0     1
  Jansen p               0     0     0     0     0     0     0     0     0     0
  Wood p                 0     0     0     0     0     0     0     0     0     0
  Utley ph               1     0     0     0     0     0     1     0     0     1

Team LOB: 10

Batting:
--------

2B: Taylor: 1 off McCullers
HBP: Turner: 2 by McCullers; Puig: 1 by McCullers; Hernandez: 1 by McCullers

Fielding:
---------

E: Bellinger: 1

Pitching:
---------

                         IP    H     R     ER    BB    SO    HR    BF    PT    PS%
Darvish (L)              1.2   3     5     4     1     0     1     10    47    64
Morrow                   0.1   0     0     0     0     1     0     1     3     100
Kershaw                  4     2     0     0     2     4     0     16    51    67
Jansen                   1     0     0     0     1     1     0     4     20    60
Wood                     2     0     0     0     0     3     0     6     25    72

WP: Kershaw: 1
IBB: Kershaw: 2
```

The `boxscore.js` application also supports a `--latex=true` command-line option, which outputs the boxscore with LaTeX formatting that can be fed into a processor
like [pandoc](https://pandoc.org/) to create a PDF version of the box score.

#### Running unit tests

The `jslib` codebase includes a suite of unit tests developed with [mocha](https://mochajs.org/).  To run them (from the root `jslib` directory):

```
$> mocha

rawText
  ✓ should return input as rawText property

Event.parseRawEvent (No Modifiers or Advances)
  ✓ should parse S7
  ✓ should parse 9

Event.parseRawEvent (with modifiers)
  ✓ should parse D7/G5
  ✓ should parse D7/E7/TH

Event.parseRawEvent (with advances)
  ✓ should parse D7.2-H
  ✓ should parse D7.2-H;3-H
  ✓ should parse D7/L.2-H;3-H
  ✓ should parse D7.2-H;3-H
...
```
