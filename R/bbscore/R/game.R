#' Produce summary stats from a list of parsed game data
#' @import dplyr
#' @import openxlsx
#' @importFrom stringr str_count
#' @param playDataList list of parsed game data
#' @param teamID team for whom to produce statistics
#' @export
#' @examples
#' parseGames('~/my-scoresheet-data-dir') %>% summarizeGames()
summarizeGames <- function(playDataList, teamID) {

  countVars <- c('PlateAppearance', 'AtBat', 'Hit', 'Walk', 'Strikeout', 'HBP', 'Hit2B', 'Hit3B', 'HR', 'RBI',
                 'QAB', 'SacFly', 'SacBunt', 'GroundBall', 'FlyBall', 'Popup', 'Pitches', 'KS', 'KC', 'AtBatRISP', 'HitRISP')

  runsScoredSummary <- playDataList$RunsScored %>%
    filter(BattingTeamID==teamID) %>%
    group_by(RunnerID, RunnerLast, RunnerFirst) %>%
    summarize(R=n()) %>%
    rename(PlayerID=RunnerID, PlayerLast=RunnerLast, PlayerFirst=RunnerFirst)

  sbSummary <- playDataList$StolenBases %>%
    filter(BattingTeamID==teamID) %>%
    group_by(RunnerID, RunnerLast, RunnerFirst) %>%
    summarize(SB=n()) %>%
    rename(PlayerID=RunnerID, PlayerLast=RunnerLast, PlayerFirst=RunnerFirst)

  csSummary <- playDataList$CaughtStealing %>%
    filter(BattingTeamID==teamID) %>%
    group_by(RunnerID, RunnerLast, RunnerFirst) %>%
    summarize(CS=n()) %>%
    rename(PlayerID=RunnerID, PlayerLast=RunnerLast, PlayerFirst=RunnerFirst)

  offenseSummary <- playDataList$BatterPlays %>%
    filter(BattingTeamID==teamID) %>%
    mutate(AtBatRISP=AtBat*RISP, HitRISP=Hit*RISP) %>%
    group_by(BatterID, BatterLast, BatterFirst) %>%
    summarize_at(vars(!!countVars), sum) %>%
    rename(PlayerID=BatterID, PlayerLast=BatterLast, PlayerFirst=BatterFirst) %>%
    full_join(runsScoredSummary, by=c('PlayerID', 'PlayerLast', 'PlayerFirst')) %>%
    full_join(sbSummary, by=c('PlayerID', 'PlayerLast', 'PlayerFirst')) %>%
    full_join(csSummary, by=c('PlayerID', 'PlayerLast', 'PlayerFirst')) %>%
    mutate_at(vars(!!c(countVars, 'R', 'SB', 'CS')), function(v) {
      case_when(is.na(v) ~ 0L, TRUE ~ v)
    })

  offenseTotals <- offenseSummary %>%
    ungroup() %>%
    summarize_at(vars(!!c(countVars, 'R', 'SB', 'CS')), sum) %>%
    mutate(PlayerLast='Team')

  offenseSummary <- offenseSummary %>%
    arrange(PlayerLast) %>%
    bind_rows(offenseTotals) %>%
    mutate(
      AVG=Hit/AtBat,
      OBP=(Hit+Walk+HBP)/(AtBat+Walk+HBP+SacFly),
      SLG=((Hit-Hit2B-Hit3B-HR) + 2*Hit2B + 3*Hit3B + 4*HR)/AtBat,
      OPS=OBP+SLG,
      `AVG w RISP`=HitRISP/AtBatRISP,
      PitchesPerPA=Pitches/PlateAppearance,
      QABPct=QAB/PlateAppearance
    ) %>%
    mutate_if(is.numeric, function(v) {ifelse(v==Inf, NA_real_, v)}) %>%
    ungroup() %>%
    select(-HitRISP, -AtBatRISP, -PlayerID)

  defenseSummary <- playDataList$Defense %>%
    filter(FieldingTeamID==teamID) %>%
    group_by(PlayerID, FielderLast, FielderFirst, Type) %>%
    summarize(n=n()) %>% spread(key=Type, value=n, fill = 0L) %>%
    rename(Assists=assist, Errors=error, Putouts=putout) %>%
    ungroup() %>%
    select(-PlayerID) %>%
    arrange(FielderLast)

  defenseTotals <- defenseSummary %>%
    summarize_at(vars(Assists, Errors, Putouts), sum) %>%
    mutate(FielderLast='Team')

  defenseSummary <- bind_rows(defenseSummary, defenseTotals)

  pitchingRunSummary <- playDataList$RunsScored %>%
    filter(FieldingTeamID==teamID) %>%
    mutate(earned_=!Unearned) %>%
    group_by(PitcherID, PitcherLast, PitcherFirst) %>%
    summarize(R=n(), ER=sum(earned_))

  pitchingOutSummary <- playDataList$PitcherOuts %>%
    filter(FieldingTeamID==teamID) %>%
    group_by(PitcherID, PitcherLast, PitcherFirst) %>%
    summarize(OutsRecorded=sum(OutsRecorded))

  pitchingSummary <- playDataList$BatterPlays %>%
    filter(FieldingTeamID==teamID) %>%
    mutate(Strikes=str_count(PitchSequence, 'X|S|C|F|L'), Balls=str_count(PitchSequence, 'B|H'), BIP_AB=AtBat*BIP) %>%
    group_by(PitcherID, PitcherLast, PitcherFirst) %>%
    summarize(BF=n(),
              AtBat=sum(AtBat),
              BIPAtBat=sum(BIP_AB),
              Walks=sum(Walk),
              Hits=sum(Hit),
              Pitches=sum(Pitches),
              K=sum(Strikeout),
              KS=sum(KS),
              KC=sum(KC),
              Strikes=sum(Strikes),
              Balls=sum(Balls),
              QAB=sum(QAB)) %>%
    full_join(pitchingRunSummary, by=c('PitcherID', 'PitcherLast', 'PitcherFirst')) %>%
    full_join(pitchingOutSummary, by=c('PitcherID', 'PitcherLast', 'PitcherFirst')) %>%
    mutate_at(vars(R, ER), function(v) {
      case_when(is.na(v) ~ 0L, TRUE ~ v)
    })

  pitchingTotals <- pitchingSummary %>%
    ungroup() %>%
    summarize_if(is.numeric, sum) %>%
    mutate(PitcherLast='Team')

  pitchingSummary <- pitchingSummary %>%
    bind_rows(pitchingTotals) %>%
    mutate(
      BAA=Hits/AtBat,
      BABIP=Hits/BIPAtBat,
      PctStrikes=Strikes/Pitches,
      `Pitches/Batter`=Pitches/BF,
      `QABA Pct`=QAB/BF,
      `ERA per 7`=ER*21/OutsRecorded,
      Innings=OutsRecorded,
      Innings=as.integer(Innings/3) + (Innings %% 3)*.1,
      WHIP=(Walks+Hits)/Innings
      ) %>%
    ungroup() %>%
    select(-PitcherID, -AtBat, -Strikes, -Balls, -QAB, -OutsRecorded, -BIPAtBat)

  boldStyle <- createStyle(textDecoration = "bold")
  threePointStyle <- createStyle(numFmt = "0.000")
  percentageStyle <- createStyle(numFmt = "0.00")

  wb <- createWorkbook()
  sheet <- addWorksheet(wb, "Offense")
  writeData(wb, "Offense", offenseSummary, headerStyle=boldStyle)
  addStyle(wb, "Offense", boldStyle, cols=1:(ncol(offenseSummary)), rows=nrow(offenseSummary)+1, gridExpand = TRUE)
  addStyle(wb, "Offense", threePointStyle, cols=c(25:29, 31), rows=2:(nrow(offenseSummary)+1), gridExpand = TRUE)
  addStyle(wb, "Offense", percentageStyle, cols=c(30), rows=2:(nrow(offenseSummary)+1), gridExpand = TRUE)
  setColWidths(wb, "Offense", widths="auto", cols=1:(ncol(offenseSummary)))

  sheet <- addWorksheet(wb, "Defense")
  writeData(wb, "Defense", defenseSummary, headerStyle=boldStyle)
  addStyle(wb, "Defense", boldStyle, cols=1:(ncol(defenseSummary)), rows=nrow(defenseSummary)+1, gridExpand = TRUE)
  setColWidths(wb, "Defense", widths="auto", cols=1:(ncol(defenseSummary)))

  sheet <- addWorksheet(wb, "Pitching")
  writeData(wb, "Pitching", pitchingSummary, headerStyle=boldStyle)
  addStyle(wb, "Pitching", boldStyle, cols=1:(ncol(pitchingSummary)), rows=nrow(pitchingSummary)+1, gridExpand = TRUE)
  addStyle(wb, "Pitching", threePointStyle, cols=c(12, 13, 14, 16, 19), rows=2:(nrow(pitchingSummary)+1), gridExpand = TRUE)
  addStyle(wb, "Pitching", percentageStyle, cols=c(15, 17), rows=2:(nrow(pitchingSummary)+1), gridExpand = TRUE)
  setColWidths(wb, "Pitching", widths="auto", cols=1:(ncol(pitchingSummary)))

  saveWorkbook(wb, 'Stats.xlsx', overwrite = TRUE)

  ret <- list()
  ret$offenseSummary <- offenseSummary
  ret$defenseSummary <- defenseSummary
  ret$pitchingSummary <- pitchingSummary

  ret

}

#' Parse a collection of enhanced game files in a directory.
#'
#' @import dplyr
#' @import tibble
#' @import purrr
#' @importFrom readr read_csv
#' @param sourceDir the directory from which to read source files
#' @param filePattern pattern defining files to read
#' @export
parseGames <- function(sourceDir, filePattern='.+-enhanced.json') {

  writeLines(paste0('Parsing games from directory: ', sourceDir))

  rosterFiles <- list.files(sourceDir, full.names = TRUE, pattern='.+.ROS')

  masterRoster <- map_df(rosterFiles, function(f) {
    teamId <- gsub(x=basename(f), pattern='([A-Z]+)([0-9]+)\\.ROS', replacement='\\1')
    yr <- gsub(x=basename(f), pattern='([A-Z]+)([0-9]+)\\.ROS', replacement='\\2')
    read_csv(f, col_names=c('PlayerID', 'PlayerLast', 'PlayerFirst', 'Bats', 'Throws'), col_types = 'ccccc') %>%
      mutate(TeamID=teamId, Year=as.integer(yr))
  })

  sourceFiles <- list.files(sourceDir, full.names = TRUE, pattern=filePattern)

  gameLists <- map(sourceFiles, function(f) {
    parseGame(f, masterRoster)
  })

  ret <- list()

  ret$BatterPlays <- map_df(gameLists, function(gameList) {
    gameList$BatterPlays
  })

  ret$RunsScored <- map_df(gameLists, function(gameList) {
    gameList$RunsScored
  })

  ret$StolenBases <- map_df(gameLists, function(gameList) {
    gameList$StolenBases
  })

  ret$CaughtStealing <- map_df(gameLists, function(gameList) {
    gameList$CaughtStealing
  })

  ret$Defense <- map_df(gameLists, function(gameList) {
    gameList$Defense
  })

  ret$PitcherOuts <- map_df(gameLists, function(gameList) {
    gameList$PitcherOuts
  })

  ret

}

#' Parse an enhanced game json file into tibbles suitable for summarization
#'
#' Note that the input json data must be in the \code{baseball-tools} enhanced format. See the
#' \href{https://github.com/scottcame/baseball-tools/tree/master/jslib}{baseball-tools Javascript library}
#' for more information and guidance on how to enhance raw retrosheet input data.
#' @importFrom jsonlite fromJSON
#' @importFrom stringr str_length str_sub
#' @importFrom lubridate ymd year
#' @import dplyr
#' @import tibble
#' @import purrr
#' @param enhancedGameJSON path to JSON file containing enhanced play information
#' @param masterRoster data frame containing PlayerID and attributes of each player (generally
#' created from a retrosheet .ROS file)
#' @return A list containing five tibbles:
#' \describe{
#'   \item{BatterPlays}{One record for each play involving a batter}
#'   \item{Defense}{One record for each error, assist, and putout}
#'   \item{RunsScored}{One record for each run scored}
#'   \item{StolenBases}{One record for each stolen base}
#'   \item{CaughtStealing}{One record for each caught-stealing}
#' }
#' @export
parseGame <- function(enhancedGameJSON, masterRoster=NULL) {

  writeLines(paste0('Parsing game: ', basename(enhancedGameJSON)))

  eg <- fromJSON(enhancedGameJSON, simplifyDataFrame = FALSE)

  gameId <- eg$game_id
  gameDate <- eg$start_date

  otherTeamLookup <- c(eg$visitor_team$team_id, eg$home_team$team_id)
  names(otherTeamLookup) <- rev(otherTeamLookup)

  playLists <- imap(eg$plays, function(play, idx) {

    ret <- list()

    if (play$type == 'play') {

      ep = play$enhanced_play

      ret$pdf <- tibble(
        GameID=gameId,
        PlayID=idx,
        GameDate=ymd(gameDate),
        Inning=play$inning,
        BattingTeamID=play$batting_team_id,
        BatterID=play$batting_player_id,
        PitcherID=ep$pitchCount$responsible_pitcher_player_id,
        PitchSequence=play$pitch_sequence,
        Play=play$play,
        PlateAppearance=ep$plateAppearance,
        AtBat=ep$atBat,
        PlayCode=ep$playCode,
        Hit=ep$hit,
        Walk=ep$walk,
        Strikeout=ep$strikeout,
        HBP=ep$playCode=='HP',
        Hit2B=ep$playCode=='D',
        Hit3B=ep$playCode=='T',
        HR=ep$playCode=='HR',
        RBI=ep$rbi,
        QAB=ep$qab,
        SacFly=ep$sacFly,
        SacBunt=ep$sacBunt,
        OutsRecorded=ep$outsRecorded,
        OutsAfterPlay=ep$outsAfterPlay,
        GroundBall=ifelse(!is.null(ep$ballInPlay$groundBall), ep$ballInPlay$groundBall, FALSE),
        FlyBall=ifelse(!is.null(ep$ballInPlay$flyBall), ep$ballInPlay$flyBall, FALSE),
        Popup=ifelse(!is.null(ep$ballInPlay$popup), ep$ballInPlay$popup, FALSE),
        HardHitBallInPlay=ifelse(!is.null(ep$ballInPlay$hard), ep$ballInPlay$hard, FALSE),
        RISP=ep$risp,
        BIP=ep$pitchCount$bip,
        BaseOccupied1=is.list(ep$basesOccupiedBeforePlay[[1]]),
        BaseOccupied2=is.list(ep$basesOccupiedBeforePlay[[2]]),
        BaseOccupied3=is.list(ep$basesOccupiedBeforePlay[[3]]),
        R=NA_integer_
      )

      ret$rsdf <- map_df(ep$runsScoredBy, function(rsby) {
        if (!is.null(rsby$runner)) {
          tibble(
            GameID=gameId,
            PlayID=idx,
            GameDate=ymd(gameDate),
            Play=play$play,
            BattingTeamID=play$batting_team_id,
            RunnerID=rsby$runner$batting_player_id,
            PitcherID=rsby$runner$responsible_pitcher_player_id,
            Unearned=as.integer(rsby$unearnedIndicated)==1 # have to do this due to some weirdness in fromJSON
          )
        }
      })

      ret$bsdf <- map_df(ep$baseStealers, function(bs) {
        if (!is.null(bs)) {
          tibble(
            GameID=gameId,
            PlayID=idx,
            GameDate=ymd(gameDate),
            Play=play$play,
            BattingTeamID=play$batting_team_id,
            RunnerID=bs$batting_player_id
          )
        }
      })

      ret$csdf <- tibble()

      if (grepl(x=play$play, pattern='^.*CS[23H]')) {
        attemptedBase <- gsub(x=play$play, pattern='^.*CS([23H]).*', replacement='\\1')
        startingBase <- ifelse(attemptedBase=='H', "3", as.character(as.integer(attemptedBase)-1))
        out <- Filter(x=ep$outs, f=function(o) {o$runnerStartingBase==startingBase})
        if (is.null(out)) {
          str(play)
          stop("Caught stealing but no corresponding out found")
        }
        out <- out[[1]]
        catcher <- Filter(x=out$assistFielders, f=function(af) {af$fielderPosition=="2"})
        catcherId <- NA_character_
        if (!is.null(catcher) & length(catcher) == 1) {
          catcherId <- catcher[[1]]$fielderId
        }
        ret$csdf <- tibble(
          GameID=gameId,
          PlayID=idx,
          GameDate=ymd(gameDate),
          Play=play$play,
          BattingTeamID=play$batting_team_id,
          RunnerID=out$runnerId$batting_player_id,
          CatcherID=catcherId
        )
      }

      ret$ddf <- map_df(ep$outs, function(o) {

        ddf_ret <- tibble()

        if (o$recorded) {
          ddf_ret <- tibble(
            GameID=gameId,
            PlayID=idx,
            GameDate=ymd(gameDate),
            Play=play$play,
            BattingTeamID=play$batting_team_id,
            PlayerID=o$putoutFielderId,
            Type='putout'
          )
        }

        ddf_ret <- ddf_ret %>% bind_rows(
          map_df(o$assistFielders, function(af) {
            tibble(
              GameID=gameId,
              PlayID=idx,
              GameDate=ymd(gameDate),
              Play=play$play,
              BattingTeamID=play$batting_team_id,
              PlayerID=af$fielderId,
              Type='assist'
            )
          })
        )

        ddf_ret

      }) %>% bind_rows(
        map_df(ep$errors, function(e) {
          tibble(
            GameID=gameId,
            PlayID=idx,
            GameDate=ymd(gameDate),
            Play=play$play,
            BattingTeamID=play$batting_team_id,
            PlayerID=e,
            Type='error'
          )
        })
      )

    }

    ret

  })

  out_df <- map_df(playLists, function(pl) {
    pl$pdf
  }) %>%
    filter(Play != 'NP') %>%
    mutate(
      FieldingTeamID=unname(otherTeamLookup[BattingTeamID]),
      Year_=year(GameDate)
    ) %>%
    select(PitcherID, OutsRecorded, Year_, FieldingTeamID, Inning)

  odf <- map_df(playLists, function(pl) {
    pl$pdf
  }) %>%
    filter(Play != 'NP') %>%
    filter(PlateAppearance) %>%
    mutate(OutsBeforePlay=OutsAfterPlay-OutsRecorded,
           FieldingTeamID=otherTeamLookup[BattingTeamID],
           realPitches_=gsub(x=PitchSequence, pattern='\\.', replacement=''),
           Pitches=str_length(realPitches_),
           KS=case_when(PlayCode=='K' & str_sub(realPitches_, -1)=='S' ~ TRUE, TRUE ~ FALSE),
           KC=case_when(PlayCode=='K' & str_sub(realPitches_, -1)=='C' ~ TRUE, TRUE ~ FALSE),
           FPS=case_when(str_sub(realPitches_, 1, 1) %in% c('C','S','F','L','X') ~ TRUE, TRUE ~ FALSE),
           Year_=year(GameDate)
    )

  rsdf <- map_df(playLists, function(pl) {
    pl$rsdf
  }) %>%
    mutate(
      FieldingTeamID=unname(otherTeamLookup[BattingTeamID]),
      Year_=year(GameDate)
    )

  if (nrow(rsdf) > 0) {

    playRuns <- rsdf %>%
      group_by(PlayID) %>%
      summarize(R=n())

    odf <- odf %>%
      select(-R) %>%
      left_join(playRuns, by='PlayID')

  }

  odf <- odf %>%
    mutate(R=case_when(is.na(R) ~ 0L, TRUE ~ R)) %>%
    group_by(GameID, Inning, BattingTeamID) %>%
    arrange(GameID, desc(PlayID))  %>%
    mutate(InningRunsAfterPlay=cumsum(R)) %>%
    ungroup() %>% arrange(GameID, PlayID)

  bsdf <- map_df(playLists, function(pl) {
    pl$bsdf
  })

  if (nrow(bsdf)) {
    bsdf <- bsdf %>%
      mutate(
        Year_=year(GameDate)
      )
  }

  csdf <- map_df(playLists, function(pl) {
    pl$csdf
  })

  if (nrow(csdf)) {
    csdf <- csdf %>%
      mutate(
        FieldingTeamID=unname(otherTeamLookup[BattingTeamID]),
        Year_=year(GameDate)
      )
  }

  ddf <- map_df(playLists, function(pl) {
    pl$ddf
  }) %>%
    mutate(
      FieldingTeamID=unname(otherTeamLookup[BattingTeamID]),
      Year_=year(GameDate)
    )

  if (!is.null(masterRoster)) {
    odf <- odf %>%
      left_join(masterRoster %>% rename(BatterLast=PlayerLast, BatterFirst=PlayerFirst, BatterHandedness=Bats) %>% select(-Throws),
                by=c('Year_'='Year', 'BattingTeamID'='TeamID', 'BatterID'='PlayerID')) %>%
      left_join(masterRoster %>% rename(PitcherLast=PlayerLast, PitcherFirst=PlayerFirst, PitcherHandedness=Throws) %>% select(-Bats),
                by=c('Year_'='Year', 'FieldingTeamID'='TeamID', 'PitcherID'='PlayerID'))
    rsdf <- rsdf %>%
      left_join(masterRoster %>% rename(RunnerLast=PlayerLast, RunnerFirst=PlayerFirst) %>% select(-Throws, -Bats),
                by=c('Year_'='Year', 'BattingTeamID'='TeamID', 'RunnerID'='PlayerID')) %>%
      left_join(masterRoster %>% rename(PitcherLast=PlayerLast, PitcherFirst=PlayerFirst, PitcherHandedness=Throws) %>% select(-Bats),
                by=c('Year_'='Year', 'FieldingTeamID'='TeamID', 'PitcherID'='PlayerID'))
    ddf <- ddf %>%
      left_join(masterRoster %>% rename(FielderLast=PlayerLast, FielderFirst=PlayerFirst) %>% select(-Throws, -Bats),
                by=c('Year_'='Year', 'FieldingTeamID'='TeamID', 'PlayerID'))
    out_df <- out_df %>%
      left_join(masterRoster %>% rename(PitcherLast=PlayerLast, PitcherFirst=PlayerFirst) %>% select(-Bats),
                by=c('Year_'='Year', 'FieldingTeamID'='TeamID', 'PitcherID'='PlayerID'))
    if (nrow(bsdf)) {
      bsdf <- bsdf %>%
        left_join(masterRoster %>% rename(RunnerLast=PlayerLast, RunnerFirst=PlayerFirst) %>% select(-Throws, -Bats),
                  by=c('Year_'='Year', 'BattingTeamID'='TeamID', 'RunnerID'='PlayerID'))
    }
    if (nrow(csdf)) {
      csdf <- csdf %>%
        left_join(masterRoster %>% rename(RunnerLast=PlayerLast, RunnerFirst=PlayerFirst) %>% select(-Throws, -Bats),
                  by=c('Year_'='Year', 'BattingTeamID'='TeamID', 'RunnerID'='PlayerID')) %>%
        left_join(masterRoster %>% rename(CatcherLast=PlayerLast, CatcherFirst=PlayerFirst) %>% select(-Throws, -Bats),
                  by=c('Year_'='Year', 'FieldingTeamID'='TeamID', 'CatcherID'='PlayerID'))
    }
  }

  odf <- odf %>% select(-ends_with('_'))
  out_df <- out_df %>% select(-ends_with('_'))
  rsdf <- rsdf %>% select(-ends_with('_'))
  ddf <- ddf %>% select(-ends_with('_'))
  bsdf <- bsdf %>% select(-ends_with('_'))
  csdf <- csdf %>% select(-ends_with('_'))

  ret <- list()
  ret$BatterPlays <- odf
  ret$RunsScored <- rsdf
  ret$Defense <- ddf
  ret$StolenBases <- bsdf
  ret$CaughtStealing <- csdf
  ret$PitcherOuts <- out_df

  ret

}
