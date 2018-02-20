### Baseball Tools

This repository contains a set of tools to support entering, viewing, and analyzing baseball data,

#### Game Editor

The `game-editor` sub-project contains a J2EE web application used to score/capture/edit game results that conform
to the JSON schema specified in the [baseball-json](https://github.com/scottcame/baseball-json) codebase.

To build: `mvn install`.

#### jslib

The `jslib` sub-project contains [Node.js](https://nodejs.org/en/) applications and modules for processing baseball-json game files.

To run tests: `mocha` (from the `jslib` directory)
To browserify: `browserify src/* > dist/baseball-tools.js`
