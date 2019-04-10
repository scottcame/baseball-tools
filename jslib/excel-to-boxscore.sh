#!/bin/bash

# Example:
# ./excel-to-boxscore.sh SKI201904020 /opt/data/oly-baseball/2019/scoresheets

GAME=$1
SRCDIR=$2
PDF=$3

YEAR=$(echo $GAME | sed -E "s/[A-Z]{3}([0-9]{4}).+/\1/g")
echo "Converting game $GAME found in $SRCDIR for year $YEAR"

node src/convert-retrosheet-excel.js $SRCDIR/$GAME.xlsx $SRCDIR $YEAR
node src/convert-retrosheet.js $SRCDIR/$GAME.EVE $GAME --merge-pitch-fx=false

BASE="node src/boxscore.js $SRCDIR/$GAME.json --intermediate-files=true --include-11=true"

if [ "$PDF" = "" ]; then
  $BASE
else
  echo "Creating PDF box score..."
  $BASE --latex=true | pandoc --pdf-engine=xelatex -o box.pdf
  echo "...done"
fi
