% Generated by roxygen2: do not edit by hand
% Please edit documentation in R/game.R
\name{parseGames}
\alias{parseGames}
\title{Parse a collection of enhanced game files in a directory.}
\usage{
parseGames(sourceDir, filePattern = ".+-enhanced.json",
  teamFilterFunction = function(g) {     TRUE })
}
\arguments{
\item{sourceDir}{the directory from which to read source files}

\item{filePattern}{pattern defining files to read}

\item{teamFilterFunction}{a function that takes an enhanced game list and returns true if the game should be parsed, or false otherwise}
}
\description{
Parse a collection of enhanced game files in a directory.
}
