"use strict";

var path = require('path');
var fs = require('fs');
var XLSX = require('xlsx')

function displayUsage() {
  console.error("usage: node [path to convert-retrosheet-excel.js] event-file output-dir year");
  process.exit(-1);
}

function failIfNotExist(f, message) {
  try {
    fs.statSync(f);
  } catch (err) {
    if (err.code === "ENOENT") {
      console.err(message);
    }
  }
}

if (process.argv.length !== 5) {
  displayUsage();
}

var file = process.argv[2];
var inputDir = path.dirname(file);
var outputDir = process.argv[3]
var year = process.argv[4];

try {
  let ss = fs.statSync(outputDir);
  if (!ss.isDirectory()) {
    console.error("output-dir " + outputDir + " exists and is not a directory")
    process.exit(-2);
  }
} catch (err) {
  if (err.code === "ENOENT") {
    console.log("output-dir " + outputDir + " does not exist, creating...")
    fs.mkdirSync(outputDir);
  }
}

let teamFileInput = path.join(inputDir, 'Team' + year + '.xlsx');
let teamFileOutput = path.join(outputDir, 'TEAM' + year);

failIfNotExist(teamFileInput, "No team file spreadsheet found in " + inputDir);

let wb = XLSX.readFileSync(teamFileInput);
let dd = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1'], {header:1});

var strm = fs.createWriteStream(teamFileOutput);
var teams = [];

dd.forEach(function(row) {
  teams.push(row[0]);
  let outRow = row.join(',');
  if (outRow.trim().length > 0) {
    strm.write(outRow + '\n');
  }
});

strm.end();

teams.forEach(function(tt) {
  strm = fs.createWriteStream(path.join(outputDir, tt + year + '.ROS'));
  wb = XLSX.readFileSync(path.join(inputDir, tt + year + '.xlsx'));
  dd = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1'], {header:1});
  dd.forEach(function(row) {
    let outRow = row.join(',');
    if (outRow.trim().length > 0) {
      strm.write(outRow + '\n');
    }
  });
  strm.end();
});

wb = XLSX.readFileSync(file);
dd = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1'], {header:1});
let outputFileName = path.basename(file).replace(/(.+)\.xlsx/, '$1.EVE');
strm = fs.createWriteStream(path.join(outputDir, outputFileName));
dd.forEach(function(row) {
  let outRow = row.join(',');
  if (outRow.trim().length > 0) {
    strm.write(outRow + '\n');
  }
});

strm.end();
