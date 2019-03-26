"use strict";

function pad(n, totalLength) {
  let sn = "" + n;
  return sn.padEnd(totalLength, " ");
}

var path = require('path');
var fs = require('fs');
var Game = require("./game.js");
var Summary = require('./summary.js')
var moment = require("moment")

function displayUsage() {
  console.error("usage: node [path to boxscore.js] event-file --latex=true --intermediate-files=true --include-11=false");
  process.exit(-1);
}

var positions = ['p','c','1b','2b','3b','ss','lf','cf','rf','dh','ph','pr','eh','cr'];

var gameFile = process.argv[2];

if (gameFile == null) {
  displayUsage();
} else {
  gameFile = path.resolve(gameFile)
}

let latex = false;
let intermediateFiles = false;
let include11 = false;

if (process.argv.length > 3) {
  process.argv.slice(3).forEach(function(arg) {
    let tl = arg.match(/^\-\-latex=(.+)$/);
    if (tl) {
      latex = tl[1] === "true";
    }
    tl = arg.match(/^\-\-intermediate-files=(.+)$/);
    if (tl) {
      intermediateFiles = tl[1] === "true";
    }
    tl = arg.match(/^\-\-include-11=(.+)$/);
    if (tl) {
      include11 = tl[1] === "true";
    }
  });
}

let gg = JSON.parse(fs.readFileSync(gameFile, 'utf8'));
let g = gg.games[0];
g = Game.parseGame(g);

if (intermediateFiles) {
  let dir = path.dirname(gameFile);
  if (!latex) console.log("Writing intermediate enhanced/summary files to " + dir);
  fs.writeFileSync(gameFile.split('.')[0] + '-enhanced.json', JSON.stringify(g, null, 2));
}

let gs = Summary.getGameSummary(g);

if (intermediateFiles) {
  let dir = path.dirname(gameFile);
  fs.writeFileSync(gameFile.split('.')[0] + '-summary.json', JSON.stringify(gs, null, 2));
}

let outStream = process.stdout;

let teamHead = [gs.home_team_name, gs.visitor_team_name];
let scoreHead = [gs.home_team_stats.score, gs.visitor_team_stats.score];

if (gs.home_team_stats.score < gs.visitor_team_stats.score) {
  teamHead = teamHead.reverse();
  scoreHead = scoreHead.reverse()
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

if (gs.tournament) {
  let ts = gs.tournament;
  if(gs.tournament_game) {
    ts += (", " + gs.tournament_game);
  }
  outStream.write(ts + "\n");
}

if (gs.site) {
  outStream.write(gs.site.site_name + "\n");
}

if (gs.extra_info) {
  outStream.write(gs.extra_info + "\n");
}

outStream.write(moment(gs.date).format('dddd, MMMM Do YYYY') + "\n");

outStream.write("\n");

outStream.write(gs.visitor_team_name + " ".repeat(teamNameSpace - gs.visitor_team_name.length));
let rs = gs.visitor_team_stats.runs_per_inning.reduce(function(a, v) { return a + pad(v, 3); }, "");
outStream.write(rs);
outStream.write("  :   " + pad(gs.visitor_team_stats.runs_per_inning.reduce(function(a, v) { return a + v; }, 0), 3));
outStream.write("   " + pad(gs.visitor_team_stats.hits, 3));
outStream.write("   " + pad(gs.visitor_team_stats.error_count, 3));
outStream.write("\n");

outStream.write(gs.home_team_name + " ".repeat(teamNameSpace - gs.home_team_name.length));
rs = gs.home_team_stats.runs_per_inning.reduce(function(a, v) { return a + pad(v, 3); }, "");
outStream.write(rs);
outStream.write(gs.home_team_stats.runs_per_inning.length < gs.visitor_team_stats.runs_per_inning.length ? "   " : "");
outStream.write("  :   " + pad(gs.home_team_stats.runs_per_inning.reduce(function(a, v) { return a + v; }, 0), 3));
outStream.write("   " + pad(gs.home_team_stats.hits, 3));
outStream.write("   " + pad(gs.home_team_stats.error_count, 3));

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
  pad("AB", 6) +
  pad("QAB", 6) +
  pad("R", 6) +
  pad("H", 6) +
  pad("RBI", 6) +
  pad("BB", 6) +
  pad("K", 6) +
  pad("PO", 6) +
  pad("A", 6) +
  pad("PA", 6) +
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
      let nm = pp.player_box_display_name + " " + ppp.join(",");
      outStream.write(indent);
      outStream.write(nm);
      outStream.write(" ".repeat(playerSpace - nm.length - indent.length));
      outStream.write(pad(row[Summary.BATTING_STAT_AB], 6));
      outStream.write(pad(row[Summary.BATTING_STAT_QAB], 6));
      outStream.write(pad(row[Summary.BATTING_STAT_R], 6));
      outStream.write(pad(row[Summary.BATTING_STAT_H], 6));
      outStream.write(pad(row[Summary.BATTING_STAT_RBI], 6));
      outStream.write(pad(row[Summary.BATTING_STAT_BB], 6));
      outStream.write(pad(row[Summary.BATTING_STAT_K], 6));
      outStream.write(pad(row[Summary.BATTING_STAT_PO], 6));
      outStream.write(pad(row[Summary.BATTING_STAT_A], 6));
      outStream.write(pad(row[Summary.BATTING_STAT_PA], 6));
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

  if (teamStats.doubles.length || teamStats.triples.length || teamStats.hr.length || teamStats.hbp.length || teamStats.sf.length || teamStats.sh.length) {
    outStream.write("Batting:\n");
    outStream.write("--------\n");
    outStream.write("\n");
    writeCumulativeStat(teamStats.doubles, "2B:", 'batting_player_id', 'pitcher_player_id');
    writeCumulativeStat(teamStats.triples, "3B:", 'batting_player_id', 'pitcher_player_id');
    writeCumulativeStat(teamStats.hr, "HR:", 'batting_player_id', 'pitcher_player_id');
    writeCumulativeStat(teamStats.hbp, "HBP:", 'batting_player_id', 'pitcher_player_id', "by");
    writeCumulativeStat(teamStats.sf, "Sac Fly:", 'batting_player_id', 'pitcher_player_id');
    writeCumulativeStat(teamStats.sh, "Sac Bunt:", 'batting_player_id', 'pitcher_player_id');
    writeCumulativeStat(teamStats.gdp, "GDP:", 'batting_player_id', null);
    let teamQabPct = Math.round(100*teamStats.qab / teamStats.plateAppearance);
    outStream.write('Team QAB%: ' + teamQabPct + "\n");
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

  let writeFieldingStatLine = function(teamStatArray, label, playerProperty) {
    if (teamStatArray.length) {
      let m = teamStatArray.reduce(function(a, vo) {
        let v = playerProperty == null ? vo : vo[playerProperty];
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
        ds.push(lookupPlayer(p).player_box_display_name + ": " + m[p]);
      }
      outStream.write(label + ds.join("; "));
      outStream.write("\n");
    }
  };

  if (teamStats.errors.length || teamStats.pb.length || teamStats.dp.length) {
    outStream.write("Fielding:\n");
    outStream.write("---------\n");
    outStream.write("\n");
    writeFieldingStatLine(teamStats.errors, "E: ", null);
    writeFieldingStatLine(teamStats.pb, "PB: ", "catcher_player_id");
    if (teamStats.dp.length) {
      let adp = [];
      outStream.write("DP: ")
      teamStats.dp.forEach(function(dp) {
        let dps = dp.map(function(v) { return lookupPlayer(v).player_box_display_name; });
        adp.push(dps.join("-"));
      });
      outStream.write(adp.join("; ") + "\n");
    }
  }

  outStream.write("\n");

  outStream.write("Pitching:\n");
  outStream.write("---------\n\n");

  let header11 = "";
  if (include11) {
    header11 = pad("1-1", 6) + pad("1-1 WIN%", 6);
  }

  outStream.write(" ".repeat(playerSpace) +
  pad("IP", 6) +
  pad("H", 6) +
  pad("R", 6) +
  pad("ER", 6) +
  pad("BB", 6) +
  pad("SO", 6) +
  pad("HR", 6) +
  pad("BF", 6) +
  pad("PT", 6) +
  pad("PS%", 6) +
  header11 +
    "\n"
  );

  team.pitching.forEach(function(pitcherArray, index) {
    let playerId = pitcherArray[0];
    let pp = lookupPlayer(playerId);
    if (pp != null) {
      let nm = pp.player_box_display_name;
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
      outStream.write(pad(pitcherArray[Summary.PITCHING_STAT_IP], 6));
      outStream.write(pad(pitcherArray[Summary.PITCHING_STAT_H], 6));
      outStream.write(pad(pitcherArray[Summary.PITCHING_STAT_R], 6));
      outStream.write(pad(pitcherArray[Summary.PITCHING_STAT_ER], 6));
      outStream.write(pad(pitcherArray[Summary.PITCHING_STAT_BB], 6));
      outStream.write(pad(pitcherArray[Summary.PITCHING_STAT_SO], 6));
      outStream.write(pad(pitcherArray[Summary.PITCHING_STAT_HR], 6));
      outStream.write(pad(pitcherArray[Summary.PITCHING_STAT_BF], 6));
      outStream.write(pad(pitcherArray[Summary.PITCHING_STAT_PT], 6));
      let psPct = Math.round(100*pitcherArray[Summary.PITCHING_STAT_PS] / pitcherArray[Summary.PITCHING_STAT_PT]);
      outStream.write(pad(psPct, 6));
      if (include11) {
        outStream.write(pad(pitcherArray[Summary.PITCHING_STAT_11COUNTS], 6));
        let win11Pct = Math.round(100*pitcherArray[Summary.PITCHING_STAT_WIN11] / pitcherArray[Summary.PITCHING_STAT_11COUNTS]);
        win11Pct = (isNaN(win11Pct) ? "--" : win11Pct);
        outStream.write(pad(win11Pct, 6));
      }
      outStream.write("\n");
      return true;
    }
  });

  outStream.write("\n");
  writeFieldingStatLine(teamStats.wp, "WP: ", "pitcher_player_id");
  writeFieldingStatLine(teamStats.ibb, "IBB: ", "pitcher_player_id");
  writeFieldingStatLine(teamStats.balks, "Balk: ", "pitcher_player_id");

}

function writeCumulativeStat(stat, label, offenseProperty, defenseProperty, connector='off') {

  if (defenseProperty == null) {
    defenseProperty = "0000";
  }

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
          ddds.push(m[b][op][dp] + (defenseProperty === "0000" ? "" : (" " + connector + " " + lookupPlayer(dp).player_box_display_name)));
        }
        dds.push(lookupPlayer(op).player_box_display_name + ": " + ddds.join(", "));
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
