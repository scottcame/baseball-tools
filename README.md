### Baseball Tools

This repository contains a set of tools to support entering, viewing, and analyzing baseball data.

There are currently three tools:

* **Game Editor:** a J2EE web application used to score/capture/edit game results
* **jslib:** [Node.js](https://nodejs.org/en/) applications and modules for working with game results
* **R:** An [R](https://www.r-project.org/) package (`bbscore`) for working with game results

See the README.md document in each tool's directory for further details.

All of the tools work with JSON game results in the format defined by the [baseball-json](https://github.com/scottcame/baseball-json) JSON schema. This
format, in turn, builds upon the de-facto standard for baseball game results representation established by [Project Retrosheet](http://www.retrosheet.org/).

The `example-data` directory contains example results from Game 7 of the 2017 World Series, in which the visiting Houston Astros defeated the
Los Angeles Dodgers 5-1 to capture the championship.  The example results demonstrate various transformations of game results performed by the modules
and applications in the `jslib` sub-project.

### Motivation

For the past two decades, Project Retrosheet has established an ecosystem of sorts around the format used to capture historical play-by-play (and, for more recent
  games especially, pitch-by-pitch) results.  Tools like those provided by the [Chadwick project](http://chadwick.sourceforge.net/doc/index.html) have, for many
  years, enabled analysts and fans to produce game summaries, box scores, and more.  The Chadwick project tools are written in C and need to be compiled for each
  operating system on which they are executed.

I began this project with a hypothesis:  that software developers and data scientists would benefit from a Javascript Object Notation (JSON) representation of Retrosheet
data, and also from a set of tools that consume this JSON representation and produce box scores, summaries, and sabermetric analyses typically valued by baseball
fans, players, and coaches.  This takes nothing away from the remarkable and enormously valuable contribution that the existing Retrosheet format and Chadwick tools have
made to our understanding and enjoyment of the game of baseball.  To the contrary, with this project, we seek to amplify and broaden the impact of these contributions, by
making the data and processing more easily accessible to contemporary programming and data science platforms, like Javascript and R.

Like many baseball analytics enthusiasts, I frequently volunteer to collect and summarize game results for local amateur or youth baseball teams.  As a volunteer team
statistician, I have found it disappointing that few viable options exist for capturing and processing pitch-by-pitch and play-by-play results in the Retrosheet format. And
so a further motivation for this project is to provide the building blocks for such tools.  We have started with a simple spreadsheet (Excel or Google Sheets) mechanism for
entering data in the Retrosheet format directly, along with functions in `jslib` to convert those to JSON.  The Game Editor subproject is the beginning of an attempt to build
a general-purpose editor for the JSON format.  I look forward to seeing where this might go, especially if collaborators skilled in user interface design and implementation
are willing to pitch in.

### Getting Started

The best way to get started is probably to use `jslib` to process Retrosheet game results, either MLB results downloaded from the Retrosheet website,
or results that you've entered yourself from a game you've attended.  The README.md for `jslib` walks through the steps.

Familiarity with the [Retrosheet event file format](http://www.retrosheet.org/eventfile.htm) will help in understanding the play and pitch notation used in `jslib`.

### Contributing

If you've modified the source code to add a feature or fix a bug, feel free to submit a PR.  Or if you have an idea for a new feature, or see something not working
like you'd expect, submit an issue.

All three tools are still evolving, and ideas and contributions from others who share an interest in baseball
data and analytics are most welcome!
