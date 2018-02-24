"use strict";

var path = require('path');
var fs = require('fs');
var moment = require('moment');
var parseXmlString = require('xml2js').parseString;
var http = require('http');

var mergePitchFx = true;

function displayUsage() {
  console.error("usage: node [path to convert-retrosheet.js] event-file game-id --merge-pitch-fx=true");
  process.exit(-1);
}

if (process.argv.length < 4) {
  displayUsage();
} else if (process.argv.length === 5) {
  let m = process.argv[4].match(/--merge-pitch-fx=(true|false)/);
  if (m == null) {
    displayUsage();
  }
  mergePitchFx = m[1] === "true";
}

var file = process.argv[2];
var gameId = process.argv[3];

var homeTeam = gameId.substr(0, 3);
var dataDir = path.dirname(file);

var year = gameId.substr(3, 4);
var month = gameId.substr(7, 2);
var day = gameId.substr(9, 2);
var dayGameSeq = gameId.substr(11, 1);

var teamFile = path.join(dataDir, "TEAM" + year);

console.log("Processing game " + gameId + " from data directory " + dataDir);

let chadwickPlayers = [];
let chadwickUmpires = [];
let chadwickRegisterFile = path.join(path.dirname(dataDir), "people.csv");
if (fs.existsSync(chadwickRegisterFile)) {
  fs.readFileSync(chadwickRegisterFile, 'utf-8').split('\n').forEach(function(line) {
    if (!line.trim().length == 0) {
      let rec = line.split(",");
      if (rec[38] !== '') {
        // resulting array has: [retro id, mlb id, last, first]
        chadwickUmpires.push([ rec[3], rec[2], rec[12], rec[13] ]);
      } else if (rec[3] !== '') {
        chadwickPlayers.push([ rec[3], rec[2], rec[12], rec[13] ]);
      }
    }
  });
} else {
  console.warn("No Chadwick register person file found, cannot lookup umpires or PitchFX info.  Download this file at https://github.com/chadwickbureau/register/blob/master/data/people.csv and put in " + dirname(chadwickRegisterFile));
}

console.log("Read " + chadwickUmpires.length + " umpires and " + chadwickPlayers.length + " players from Chadwick register");

let teams = [];
fs.readFileSync(teamFile, 'utf-8').split('\r\n').forEach(function(line) {
  if (!line.trim().length == 0) {
    teams.push(line.split(","));
  }
});

let parks = [];
let parksFile = path.join(path.dirname(dataDir), "parkcode.txt");
if (fs.existsSync(parksFile)) {
  fs.readFileSync(parksFile, 'utf-8').split('\n').forEach(function(line) {
    if (line.trim().length > 0) {
      parks.push(line.split(",").slice(0, 2));
    }
  });
} else {
  console.warn("No parks file found, sites will not be translated.  Download parks file at http://www.retrosheet.org/parkcode.txt and put in " + dirname(parksFile));
}

let lines = fs.readFileSync(file, 'utf-8').split('\r\n');

var infoRecs = [];
var startRecs = [];
var playRecs = [];
var subRecs = [];
var inGame = false;
lines.forEach(function(line, lineNum) {

  if (RegExp("^id," + gameId).test(line)) {
    inGame = true;
  } else if (inGame && /^id/.test(line)) {
    inGame = false;
  }

  let rec = line.split(",");

  if (inGame && line.trim().length > 0) {
    if (/^info/.test(line)) {
      infoRecs.push(rec);
    } else if (/^start/.test(line)) {
      startRecs.push(rec);
    } else if (/^play/.test(line)) {
      playRecs.push(rec);
    } else if (/^sub/.test(line)) {
      subRecs.push(rec);
      playRecs.push(rec);
    }
  }

});

let o = new Object;

o.description = "Game file converted from Retrosheet game ID " + gameId;
o.source = "The information used here was obtained free of charge from and is copyrighted by Retrosheet.  Interested parties may contact Retrosheet at 20 Sunset Rd., Newark, DE 19711.";
o.games = [];
let game = new Object;
o.games.push(game);

game.game_id = gameId;
game.visitor_team = new Object;
game.home_team = new Object;

function lookupUmpire(id) {
  var ret = [];
  chadwickUmpires.forEach(function(umpRec) {
    if (umpRec[0] === id) {
      ret = umpRec;
    }
  });
  return ret;
}

function createUmpire(rec) {
  let ret = new Object;
  ret.umpire_id = rec[2];
  let umpRec = lookupUmpire(rec[2]);
  if (umpRec.length > 0) {
    ret.umpire_last_name = umpRec[2];
    ret.umpire_first_name = umpRec[3];
  }
  return ret;
}

infoRecs.forEach(function(rec) {
  if ("visteam" === rec[1]) {
    game.visitor_team.team_id = rec[2];
    teams.forEach(function(team) {
      if (team[0] === rec[2]) {
        game.visitor_team.team_name = team[2] + " " + team[3];
      }
    });
  } else if ("hometeam" === rec[1]) {
    game.home_team.team_id = rec[2];
    teams.forEach(function(team) {
      if (team[0] === rec[2]) {
        game.home_team.team_name = team[2] + " " + team[3];
      }
    });
  } else if ("date" === rec[1]) {
    game.start_date = moment(rec[2], "YYYY/MM/DD").format("YYYY-MM-DD");
  } else if ("starttime" === rec[1]) {
    game.start_time = moment(rec[2], "h:ma").format("HH:mm");
  } else if ("daynight" === rec[1]) {
    game.daynight = rec[2];
  } else if ("site" === rec[1]) {
    game.site = new Object;
    game.site.site_id = rec[2];
    parks.forEach(function(park) {
      if (park[0] === game.site.site_id) {
        game.site.site_name = park[1];
      }
    })
  } else if ("usedh" === rec[1]) {
    game.use_dh = rec[2] === "true";
  } else if ("umphome" === rec[1]) {
    game.ump_home = createUmpire(rec);
  } else if ("ump1b" === rec[1]) {
    game.ump_1b = createUmpire(rec);
  } else if ("ump2b" === rec[1]) {
    game.ump_2b = createUmpire(rec);
  } else if ("ump3b" === rec[1]) {
    game.ump_3b = createUmpire(rec);
  } else if ("umplf" === rec[1]) {
    game.ump_lf = createUmpire(rec);
  } else if ("umprf" === rec[1]) {
    game.ump_rf = createUmpire(rec);
  } else if ("howscored" === rec[1]) {
    game.how_scored = rec[2];
  } else if ("pitches" === rec[1]) {
    game.pitches = rec[2];
  } else if ("scored_by" === rec[1]) {
    game.scored_by = rec[2];
  } else if ("winddir" === rec[1]) {
    game.wind = rec[2];
  } else if ("windspeed" === rec[1]) {
    game.wind_speed = rec[2];
  } else if ("temp" === rec[1]) {
    game.temp = rec[2];
  } else if ("fieldcond" === rec[1]) {
    game.field_conditions = rec[2];
  } else if ("precip" === rec[1]) {
    game.precip = rec[2];
  } else if ("sky" === rec[1]) {
    game.sky = rec[2];
  } else if ("attendance" === rec[1]) {
    game.attendance = Number.parseInt(rec[2]);
  } else if ("wp" === rec[1]) {
    game.winning_pitcher = rec[2];
  } else if ("lp" === rec[1]) {
    game.losing_pitcher = rec[2];
  } else if ("save" === rec[1]) {
    game.save_pitcher = rec[2];
  } else if ("timeofgame" === rec[1]) {
    let time = Number.parseInt(rec[2]);
    let startTime = moment(game.start_date + " " + game.start_time, "YYYY-MM-DD HH:mm");
    let endTime = startTime.add(Number.parseInt(time), "minutes");
    game.end_time = endTime.format("HH:mm");
  }
});

var visitorRoster = [];
fs.readFileSync(path.join(dataDir, game.visitor_team.team_id + year + ".ROS"), 'utf-8').split('\r\n').forEach(function(rec) {
  visitorRoster.push(rec.split(","));
});
var homeRoster = [];
fs.readFileSync(path.join(dataDir, game.home_team.team_id + year + ".ROS"), 'utf-8').split('\r\n').forEach(function(rec) {
  homeRoster.push(rec.split(","));
});

game.visitor_team.lineup = [];
game.home_team.lineup = [];

startRecs.forEach(function(rec) {
  let tt = rec[3] === "0" ? game.visitor_team : game.home_team;
  let roster = rec[3] === "0" ? visitorRoster : homeRoster;
  let player = new Object;
  tt.lineup.push(player);
  player.player = new Object();
  player.player.player_id = rec[1];
  roster.forEach(function(rosterRec) {
    if (rec[1] === rosterRec[0]) {
      player.player.player_first_name = rosterRec[2];
      player.player.player_last_name = rosterRec[1];
      player.player.bats = rosterRec[3];
      player.player.throws = rosterRec[4];
    }
  });
  player.starter = true;
  player.lineup_position = rec[4];
  player.fielder_position = rec[5];
});

subRecs.forEach(function(rec) {
  let tt = rec[3] === "0" ? game.visitor_team : game.home_team;
  let roster = rec[3] === "0" ? visitorRoster : homeRoster;
  let player = new Object;
  tt.lineup.push(player);
  player.player = new Object();
  player.player.player_id = rec[1];
  roster.forEach(function(rosterRec) {
    if (rec[1] === rosterRec[0]) {
      player.player.player_first_name = rosterRec[2];
      player.player.player_last_name = rosterRec[1];
      player.player.bats = rosterRec[3];
      player.player.throws = rosterRec[4];
    }
  });
  player.starter = false;
});

game.plays = [];

playRecs.forEach(function(rec) {
  let o = new Object;
  let type = rec[0];
  if ("play" === type) {
    o.type = "play";
    o.inning = Number.parseInt(rec[1]);
    o.batting_team_id = rec[2] === "0" ? game.visitor_team.team_id : game.home_team.team_id;
    o.batting_player_id = rec[3];
    o.count = rec[4];
    o.pitch_sequence = rec[5];
    o.play = rec[6];
  } else {
    // sub
    o.type = "substitution";
    o.substitution = new Object;
    let playerId = rec[1];
    let roster = rec[3] === "0" ? visitorRoster : homeRoster;
    o.substitution.player = new Object;
    o.substitution.player.player_id = playerId;
    roster.forEach(function(rosterRec) {
      if (rec[1] === rosterRec[0]) {
        o.substitution.player.player_first_name = rosterRec[2];
        o.substitution.player.player_last_name = rosterRec[1];
      }
    });
    o.substitution.lineup_position = rec[4];
    o.substitution.fielder_position = rec[5];
  }
  game.plays.push(o);
});

function outputGame() {
  fs.writeFileSync(gameId + '.json', JSON.stringify(o, null, 2));
}

function integratePitchFx(data) {

  // useful for debugging, not called
  let validatePitches = function(g) {

    let good=0, bad=0;
    g.plays.forEach(function(p) {
      if (p.type === 'play') {
        let ps = p.pitch_sequence;
        let eps = p.enhanced_pitch_sequence;
        if (eps != null) {
          eps = eps.split(";").reduce( function(accumulator, pitch) { return accumulator += pitch.replace(/^([^\/]+).*/, "$1"); }, "");
          if (ps !== eps) {
            bad++;
            console.error("Difference in pitch sequence (inning: " + p.inning + ", batting team: " + p.batting_team_id + ", batter=" + p.batting_player_id + "): retro=" + ps + ", enhanced=" + eps);
          } else {
            good++;
            console.log("Comparison of ps=" + ps + " to eps=" + eps + " checks out!");
          }
        }
      }
    });
    console.log("Pitch sequence same: " + good + ", different: " + bad);

  }

  let handleParsedXml = function(pitchFxGame) {

    var events = [];

    var handleAB = function(atbat) {
      var abEvents = [];
      atbat.pitch.forEach(function(pitch) {
        let p = new Object;
        p.event_num = Number.parseInt(pitch.$.event_num);
        p.des = pitch.$.des;
        p.velocity = pitch.$.start_speed;
        p.pitch_type = pitch.$.pitch_type;
        p.batterMlbId = atbat.$.batter;
        p.px = pitch.$.px;
        p.pz = pitch.$.pz;
        p.type = pitch.$.type;
        p.code = pitch.$.code; // doesn't seem to exist before 2016?
        abEvents.push(p);
      });
      abEvents.forEach(function(abEvent) {
        chadwickPlayers.some(function(playerRec) {
          if (abEvent.batterMlbId === playerRec[1]) {
            abEvent.batterRetroId = playerRec[0];
            return true;
          }
          return false;
        });
      });
      return abEvents;
    };

    pitchFxGame.game.inning.forEach(function(inning) {
      inning.top[0].atbat.forEach(function(atbat, seq) {
        let abEvents = handleAB(atbat);
        abEvents.forEach(function(e) {
          e.abSequence = seq;
          e.inning = inning.$.num;
          e.batting_team_id = game.visitor_team.team_id;
        });
        events = events.concat(abEvents);
      });
      if (inning.bottom != null) {
        inning.bottom[0].atbat.forEach(function(atbat, seq) {
          let abEvents = handleAB(atbat);
          abEvents.forEach(function(e) {
            e.abSequence = seq;
            e.inning = inning.$.num;
            e.batting_team_id = game.home_team.team_id;
          });
          events = events.concat(abEvents);
        });
      }
    });

    let currentInning = 1;
    let lastBatter = null;
    let playerAppearanceMap = new Map;

    game.plays.forEach(function(play) {

      if (play.type === "play") {

        if (play.inning !== currentInning) {
          currentInning = play.inning;
          playerAppearanceMap = new Map;
        }

        let playerAppearance = playerAppearanceMap.get(play.batting_player_id);
        if (playerAppearance == null) {
          playerAppearance = 0;
          playerAppearanceMap.set(play.batting_player_id, 0);
        }

        if (lastBatter == null || lastBatter != play.batting_player_id) {
          playerAppearance++;
          playerAppearanceMap.set(play.batting_player_id, playerAppearance);
        }
        lastBatter = play.batting_player_id;

        play.enhanced_pitch_sequence = [];
        let pitchCount = play.pitch_sequence.length;
        let eligibleRetroPitchIndex = 0;

        //console.log(play.inning + ": " + play.batting_player_id + " (" + playerAppearance + ") : " + "NEW SEQ: " + play.pitch_sequence);

        for (let i=0; i < pitchCount; i++) {

          let c = play.pitch_sequence.charAt(i);
          let ep = new Object;
          ep.type = "";
          if (["*","+",">"].includes(c)) {
            ep.type += c;
            c = play.pitch_sequence.charAt(++i);
          }
          ep.type += c;

          if (![".","1","2","3"].includes(c)) {
            let pitchfxPlayerAppearance = 0;
            let lastPitchfxBatter = null;
            let batterPitchIndex = 0;
            events.some(function(event) {
              if (event.inning == currentInning && event.batterRetroId == play.batting_player_id) {
                if (lastPitchfxBatter == null || lastPitchfxBatter != event.batterRetroId) {
                  pitchfxPlayerAppearance++;
                }
                if (pitchfxPlayerAppearance === playerAppearance) {
                  if (batterPitchIndex++ === eligibleRetroPitchIndex) {
                    ep.velocity = event.velocity;
                    ep.pitch_type = event.pitch_type;
                    ep.location = new Object;
                    ep.location.x = event.px;
                    ep.location.z = event.pz;
                    //console.log(play.inning + ": " + play.batting_player_id + ": " + "RETRO=" + c + ', PITCHFX=' + event.des);
                    // todo: test for incompatible pitches?  compare c to p.des / p.type / p.code
                  }
                }
              }
              lastPitchfxBatter = event.batterRetroId;
              if (event.inning > currentInning) {
                return true;
              }
              return false;
            });
            eligibleRetroPitchIndex++;
          }

          play.enhanced_pitch_sequence.push(ep);

        }

      }
    });

    outputGame();

  };

  parseXmlString(data, function(err, result) {
    handleParsedXml(result);
  });

}

if (mergePitchFx) {

  let url = "http://gd2.mlb.com/components/game/mlb/year_" + year + "/month_" + month + "/day_" + day + "/gid_" + year + "_" + month + "_" + day + "_" +
    game.visitor_team.team_id.toLowerCase() + "mlb_" + game.home_team.team_id.toLowerCase() + "mlb_" + (Number.parseInt(dayGameSeq) + 1) + "/inning/inning_all.xml";

  console.log("Integrating PitchF/X data from url: " + url);

  http.get(url, function(res) {

    var xml = '';

    res.on('data', function(chunk) {
      xml += chunk;
    });

    res.on('error', function(e) {
      console.err(e);
    });

    res.on('timeout', function(e) {
      console.err(e);
    });

    res.on('end', function() {
      integratePitchFx(xml);
    });

  });

} else {

  console.log("Skipping integration of PitchF/X data per command line option");
  outputGame();

}
