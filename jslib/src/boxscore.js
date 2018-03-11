"use strict";

var path = require('path');
var fs = require('fs');
var Game = require("./game.js");
var Summary = require('./summary.js')
var moment = require("moment")

function displayUsage() {
  console.error("usage: node [path to boxscore.js] event-file");
  process.exit(-1);
}

var gameFile = process.argv[2];

if (gameFile == null) {
  displayUsage();
}

let gg = JSON.parse(fs.readFileSync(gameFile, 'utf8'));
let g = gg.games[0];
g = Game.parseGame(g);

//fs.writeFileSync(gameFile.split('.')[0] + '-enhanced.json', JSON.stringify(g, null, 2));
//console.log(JSON.stringify(gs, null, 2));

let outStream = process.stdout;

let gs = Summary.getGameSummary(g);

let teamHead = [gs.home_team_name, gs.visitor_team_name];
let scoreHead = [gs.home_team_stats.score, gs.visitor_team_stats.score];

if (gs.home_team_stats.score < gs.visitor_team_stats.score) {
  teamHead = teamHead[1,0];
  scoreHead = scoreHead[1,0];
}

let teamNameSpace = Math.max(gs.home_team_name.length, gs.visitor_team_name.length) + 5;
var playerSpace = 25;

outStream.write("---" + "\n");
outStream.write("documentclass: extarticle" + "\n");
outStream.write("fontsize: 8pt" + "\n");
outStream.write("---" + "\n");
outStream.write("```" + "\n");

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
outStream.write("```" + "\n");
outStream.write("\\pagebreak\n");
outStream.write("```" + "\n");
writeTeamSection(gs.home_team_stats, gs.box.home_team, gs.home_team_name);

outStream.write("```" + "\n");

function writeTeamSection(teamStats, team, name) {

  outStream.write("\n\n");

  outStream.write("   *** " + name + " ***" + "\n\n");

  outStream.write(" ".repeat(playerSpace) +
  "AB" + "   " +
  "R" + "    " +
  "H" + "    " +
  "RBI" + "  " +
  "BB" + "   " +
  "K" + "      " +
  "PO" + "   " +
  "A" + "    " +
    "\n"
  );

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
    "\n"
  );

  team.pitching.forEach(function(pitcherArray, index) {
    let playerId = pitcherArray[0];
    let pp = lookupPlayer(playerId);
    if (pp != null) {
        outStream.write(pp.player_last_name);
        outStream.write(" ".repeat(playerSpace - pp.player_last_name.length));
        let ip = "" + pitcherArray[1];
        outStream.write(ip + "    " + " ".repeat(3-ip.length));
        outStream.write("" + pitcherArray[2] + "    ")
        outStream.write("" + pitcherArray[3] + "    ")
        outStream.write("" + pitcherArray[4] + "    ")
        outStream.write("" + pitcherArray[5] + "    ")
        outStream.write("" + pitcherArray[6] + "    ")
        outStream.write("" + pitcherArray[7] + "    ")
        outStream.write("" + pitcherArray[8] + "    ")
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

function writeBattingRow(row, indent = "") {
  let playerId = row[0];
  let pp = lookupPlayer(playerId);
  if (pp != null) {
    outStream.write(indent);
    outStream.write(pp.player_last_name);
    outStream.write(" ".repeat(playerSpace - pp.player_last_name.length - indent.length));
    outStream.write("" + row[1] + "    ")
    outStream.write("" + row[2] + "    ")
    outStream.write("" + row[3] + "    ")
    outStream.write("" + row[4] + "    ")
    outStream.write("" + row[5] + "    ")
    outStream.write("" + row[6] + "      ")
    outStream.write("" + row[7] + "    ")
    outStream.write("" + row[8] + "    ")
    outStream.write("\n");
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
