#' @export
calculateRunExpectancyMatrix <- function(batterPlaysDf) {

  batterPlaysDf %>%
    group_by(BaseOccupied1, BaseOccupied2, BaseOccupied3, OutsBeforePlay) %>%
    summarize(RE=mean(InningRunsAfterPlay)) %>%
    mutate(OutsBeforePlay=paste0(OutsBeforePlay, ' Out')) %>% spread(key=OutsBeforePlay, value=RE)

}
