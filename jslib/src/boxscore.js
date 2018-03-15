"use strict";

var path = require('path');
var fs = require('fs');
var Game = require("./game.js");
var Summary = require('./summary.js')
var moment = require("moment")

function displayUsage() {
  console.error("usage: node [path to boxscore.js] event-file --latex=true");
  process.exit(-1);
}

var positions = ['p','c','1b','2b','3b','ss','lf','cf','rf','dh','ph','pr','eh','cr'];

var gameFile = process.argv[2];

if (gameFile == null) {
  displayUsage();
}

let latex = false;

if (process.argv.length === 4) {
  latex = process.argv[3].match(/^\-\-latex=(.+)$/);
  if (latex != null) {
    latex = latex[1] === "true";
  }
}

let gg = JSON.parse(fs.readFileSync(gameFile, 'utf8'));
let g = gg.games[0];
g = Game.parseGame(g);
let gs = Summary.getGameSummary(g);

fs.writeFileSync(gameFile.split('.')[0] + '-enhanced.json', JSON.stringify(g, null, 2));
fs.writeFileSync(gameFile.split('.')[0] + '-summary.json', JSON.stringify(gs, null, 2));
//console.log(JSON.stringify(gs, null, 2));

let outStream = process.stdout;

let teamHead = [gs.home_team_name, gs.visitor_team_name];
let scoreHead = [gs.home_team_stats.score, gs.visitor_team_stats.score];

if (gs.home_team_stats.score < gs.visitor_team_stats.score) {
  teamHead = teamHead[1,0];
  scoreHead = scoreHead[1,0];
}

let teamNameSpace = Math.max(gs.home_team_name.length, gs.visitor_team_name.length) + 5;
var playerSpace = 25;

if (latex) outStream.write("---" + "\n");
if (latex) outStream.write("geometry: margin=.5in" + "\n");
if (latex) outStream.write("---" + "\n");
if (latex) outStream.write("\\setmonofont[Scale=1]{LetterGothic}" + "\n");
if (latex) outStream.write("\\pagenumbering{gobble}" + "\n");

if (latex) outStream.write("```" + "\n");

outStream.write(teamHead[0] + " " + scoreHead[0] + ", " + teamHead[1] + " " + scoreHead[1] + "\n");
outStream.write(moment(gs.date).format('dddd, MMMM Do YYYY') + "\n");
outStream.write("\n");

outStream.write(gs.visitor_team_name + " ".repeat(teamNameSpace - gs.visitor_team_name.length));
outStream.write(gs.visitor_team_stats.runs_per_inning.join("   "));
outStream.write("  :   " + gs.visitor_team_stats.runs_per_inning.reduce(function(a, v) { return a + v; }, 0));
outStream.write("   " + gs.visitor_team_stats.hits);
outStream.write("   " + gs.visitor_team_stats.error_count);
outStream.write("\n");

outStream.write(gs.home_team_name + " ".repeat(teamNameSpace - gs.home_team_name.length));
outStream.write(gs.home_team_stats.runs_per_inning.join("   "));
outStream.write(gs.home_team_stats.runs_per_inning.length < gs.visitor_team_stats.runs_per_inning.length ? "    " : "");
outStream.write("  :   " + gs.home_team_stats.runs_per_inning.reduce(function(a, v) { return a + v; }, 0));
outStream.write("   " + gs.home_team_stats.hits);
outStream.write("   " + gs.home_team_stats.error_count);

writeTeamSection(gs.visitor_team_stats, gs.box.visitor_team, gs.visitor_team_name);
if (latex) outStream.write("```" + "\n");
if (latex) outStream.write("\\pagebreak\n");
if (latex) outStream.write("```" + "\n");
writeTeamSection(gs.home_team_stats, gs.box.home_team, gs.home_team_name);

if (latex) outStream.write("```" + "\n");

function writeTeamSection(teamStats, team, name) {

  outStream.write("\n\n");

  outStream.write("   *** " + name + " ***" + "\n\n");

  outStream.write(" ".repeat(playerSpace) +
  "AB" + "   " +
  "QAB" + "  " +
  "R" + "    " +
  "H" + "    " +
  "RBI" + "  " +
  "BB" + "   " +
  "K" + "      " +
  "PO" + "   " +
  "A" + "    " +
  "PA" + "    " +
    "\n"
  );

  let writeBattingRow = function(row, indent = "") {
    let playerId = row[0];
    let pp = lookupPlayer(playerId);
    if (pp != null) {
      let ppp = [];
      pp.player_positions.forEach(function(p) {
        ppp.push(positions[p-1]);
      });
      let nm = pp.player_last_name + " " + ppp.join(",");
      outStream.write(indent);
      outStream.write(nm);
      outStream.write(" ".repeat(playerSpace - nm.length - indent.length));
      outStream.write("" + row[Summary.BATTING_STAT_AB] + "    ")
      outStream.write("" + row[Summary.BATTING_STAT_QAB] + "    ")
      outStream.write("" + row[Summary.BATTING_STAT_R] + "    ")
      outStream.write("" + row[Summary.BATTING_STAT_H] + "    ")
      outStream.write("" + row[Summary.BATTING_STAT_RBI] + "    ")
      outStream.write("" + row[Summary.BATTING_STAT_BB] + "    ")
      outStream.write("" + row[Summary.BATTING_STAT_K] + "      ")
      outStream.write("" + row[Summary.BATTING_STAT_PO] + "    ")
      outStream.write("" + row[Summary.BATTING_STAT_A] + "    ")
      outStream.write("" + row[Summary.BATTING_STAT_PA] + "    ")
      outStream.write("\n");
    }
  };

  team.batting.forEach(function(lineupSpotArray, index) {
    writeBattingRow(lineupSpotArray[0]);
    let others = lineupSpotArray.slice(1);
    others.forEach(function(other) {
      writeBattingRow(other, "  ");
    });
    if (index === 8 && team.batting.length > 9) {
      outStream.write("------------\n");
    }
  });

  outStream.write("\n");

  outStream.write("Team LOB: " + teamStats.lob + "\n");
  outStream.write("\n");

  if (teamStats.doubles.length || teamStats.triples.length || teamStats.hr.length || teamStats.hbp.length) {
    outStream.write("Batting:\n");
    outStream.write("--------\n");
    outStream.write("\n");
    writeCumulativeStat(teamStats.doubles, "2B:", 'batting_player_id', 'pitcher_player_id');
    writeCumulativeStat(teamStats.triples, "3B:", 'batting_player_id', 'pitcher_player_id');
    writeCumulativeStat(teamStats.hr, "HR:", 'batting_player_id', 'pitcher_player_id');
    writeCumulativeStat(teamStats.hbp, "HBP:", 'batting_player_id', 'pitcher_player_id', "by");
    outStream.write("\n");
  }

  if (teamStats.sb.length || teamStats.cs.length) {
    outStream.write("Baserunning:\n");
    outStream.write("------------\n");
    outStream.write("\n");
    writeCumulativeStat(teamStats.sb, "SB:", 'runner_player_id', 'catcher_player_id');
    writeCumulativeStat(teamStats.cs, "CS:", 'runner_player_id', 'catcher_player_id', "by");
    outStream.write("\n");
  }

  if (teamStats.errors.length) {
    outStream.write("Fielding:\n");
    outStream.write("---------\n");
    outStream.write("\n");
    let m = teamStats.errors.reduce(function(a, v) {
      let tally = a[v];
      if (tally == null) {
        tally = 0;
      }
      tally++;
      a[v] = tally;
      return a;
    }, new Object);
    let ds = [];
    for (let p in m) {
      ds.push(lookupPlayer(p).player_last_name + ": " + m[p]);
    }
    outStream.write("E: " + ds.join("; "));
  }

  outStream.write("\n\n");

  outStream.write("Pitching:\n");
  outStream.write("---------\n\n");

  outStream.write(" ".repeat(playerSpace) +
  "IP" + "     " +
  "H" + "    " +
  "R" + "    " +
  "ER" + "   " +
  "BB" + "   " +
  "SO" + "   " +
  "HR" + "   " +
  "BF" + "   " +
  "PT" + "    " +
  "PS%" + "  " +
  "1-1" + "  " +
  "1-1 WIN%" + " " +
    "\n"
  );

  team.pitching.forEach(function(pitcherArray, index) {
    let playerId = pitcherArray[0];
    let pp = lookupPlayer(playerId);
    if (pp != null) {
      let nm = pp.player_last_name;
      if (pp.player_id == gs.winning_pitcher) {
        nm += " (W)";
      }
      if (pp.player_id == gs.losing_pitcher) {
        nm += " (L)";
      }
      if (pp.player_id == gs.save_pitcher) {
        nm += " (S)";
      }
      outStream.write(nm);
      outStream.write(" ".repeat(playerSpace - nm.length));
      let ip = "" + pitcherArray[Summary.PITCHING_STAT_IP];
      outStream.write(ip + "    " + " ".repeat(3-ip.length));
      outStream.write("" + pitcherArray[Summary.PITCHING_STAT_H] + "    ");
      outStream.write("" + pitcherArray[Summary.PITCHING_STAT_R] + "    ");
      outStream.write("" + pitcherArray[Summary.PITCHING_STAT_ER] + "    ");
      outStream.write("" + pitcherArray[Summary.PITCHING_STAT_BB] + "    ");
      outStream.write("" + pitcherArray[Summary.PITCHING_STAT_SO] + "    ");
      outStream.write("" + pitcherArray[Summary.PITCHING_STAT_HR] + "    ");
      let s = "" + pitcherArray[Summary.PITCHING_STAT_BF];
      outStream.write(s + " ".repeat(5-s.length));
      outStream.write("" + pitcherArray[Summary.PITCHING_STAT_PT] + "    ");
      let psPct = Math.round(100*pitcherArray[Summary.PITCHING_STAT_PS] / pitcherArray[Summary.PITCHING_STAT_PT]);
      outStream.write("" + psPct + "   ");
      outStream.write("" + pitcherArray[Summary.PITCHING_STAT_11COUNTS] + "    ");
      let win11Pct = Math.round(100*pitcherArray[Summary.PITCHING_STAT_WIN11] / pitcherArray[Summary.PITCHING_STAT_11COUNTS]);
      outStream.write("" + (isNaN(win11Pct) ? "--" : win11Pct) + " ");
      outStream.write("\n");
      return true;
    }
  });

}

function writeCumulativeStat(stat, label, offenseProperty, defenseProperty, connector='off') {
  if (stat.length) {
    var baseStat = false;
    var m = stat.reduce(function(a, d) {
      var base = "";
      if (d.hasOwnProperty('base')) {
        base = " " + d.base + ": ";
        baseStat = true;
      }
      var bm = a[base];
      if (bm == null) {
        bm = new Object;
        a[base] = bm;
      }
      var pm = bm[d[offenseProperty]];
      if (pm == null) {
        pm = new Object;
        bm[d[offenseProperty]] = pm;
      }
      var vm = pm[d[defenseProperty]];
      if (vm == null) {
        vm = 0;
      }
      pm[d[defenseProperty]] = vm+1;
      return a;
    }, new Object);
    var ds = [];
    for (let b in m) {
      let dds = [];
      for (let op in m[b]) {
        let ddds = [];
        for (let dp in m[b][op]) {
          ddds.push(m[b][op][dp] + " " + connector + " " + lookupPlayer(dp).player_last_name);
        }
        dds.push(lookupPlayer(op).player_last_name + ": " + ddds.join(", "));
      }
      ds.push(b + dds.join("; "))
    }
    outStream.write(label + (baseStat ? "\n" : " ") + ds.join("\n") + "\n");
  }
}

function lookupPlayer(playerId, gameSummary) {
  let ret = null;
  gs.players.some(function(pp) {
    if (pp.player_id === playerId) {
      ret = pp;
      return true;
    }
    return false;
  });
  return ret;
}









// end
