var fs = require("fs");
var webpage = require('webpage');
var masterDone;

module.exports = scrapePage;


function scrapePage(url, done, worker) {
  masterDone = done;
  var page = webpage.create()
  page.open(url, function(status) {
    if (status !== "success") {
      console.error("Unable to load page", status);
      phantom.exit();
    } else {
      page.includeJs("https://code.jquery.com/jquery-2.2.0.min.js", pageLoaded(page));
    }
  });
  page.onConsoleMessage = function(msg) {
    console.log(msg);
  };
}

function pageLoaded(page) {
  return function () {
    var playerData = page.evaluate(getData);
    if (!playerData) {
      masterDone("Unable to parse page.");
    }
    masterDone(null, playerData);
    phantom.exit();
  }
}

function getData() {
  var table = $("#odds-data-table table.table-main")[0];
  var rows = $(table).find("tbody tr");
  var matches = [];
  var winInfo = getWinner();
  var player0Won = winInfo.player0Won, retired = winInfo.retired;
  var playerNames = getNames();
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var tds = $(row).children("td.odds");
    if (tds.length === 0) {
      break;
    }
    var player0Td = tds[0];
    var player1Td = tds[1];
    var player0 = new Player(NaN, parseFloat(player0Td.textContent), playerNames[0]);
    var player1 = new Player(NaN, parseFloat(player1Td.textContent), playerNames[1]);
    var player0Mouseover = $(player0Td).children("div").attr("onmouseover");
    var player1Mouseover = $(player1Td).children("div").attr("onmouseover");
    if (!player0Mouseover || !player1Mouseover) {
      continue;
    } else {
      player0.startingOdds = parseMouseover(player0Td, player0Mouseover);
      player1.startingOdds = parseMouseover(player1Td, player1Mouseover);
      var book = $(row).find("a.name").text();
      var winner = (player0Won) ? player0 : player1;
      var loser = (player0Won) ? player1 : player0;
      var match = new Match(winner, loser, book, retired);
      matches.push(match.POJO());
    }
  }

  return matches;

  function getNames() {
    var playerNames = $("#col-content h1").text();
    var playerNamesRegex = /(.*) - (.*)/;
    var matches = playerNamesRegex.exec(playerNames);
    return [matches[1], matches[2]];
  }

  function getWinner() {
    var player0Won = false, retired = false;
    var finalString = $("#col-content .result span.bold").text();
    var result = $("#col-content .result strong").text();
    if (finalString !== "Final result ") {
      if (result.indexOf("retired")) {
        retired = true;
      } else {
        console.error("Invalid match");
        return false;
      }
    } else {
      var result = result.split(':');
      var firstScore = parseInt(result[0]);
      var secondScore = parseInt(result[1]);
      player0Won = firstScore > secondScore;
    }
    return {
      player0Won: player0Won,
      retired: retired
    };
  }

  function parseMouseover(element, mouseover) {
    var regex = /page.hist\((.*),\'(.*)\',\'(.*)\',(.*),(.*),(.*),(.*)\)/;
    var e = new Event("mouseover");
    var matches = regex.exec(mouseover);
    return parseFloat(historyTooltip.apply(page.getActiveTableSet(),
                         [element, matches[2], matches[3], matches[4], e ,
                           matches[6], matches[7]]));
  }

  function Match (winner, loser, book, cancelled) {
    this.winner = winner;
    this.loser = loser;
    this.book = book;
    this.cancelled = cancelled;

    this.POJO = function() {
      return {
        odds_winner_open: this.winner.startingOdds,
        odds_loser_open: this.loser.startingOdds,
        odds_winner_close: this.winner.endingOdds,
        odds_loser_close: this.loser.endingOdds,
        is_cancelled_or_walkover: this.cancelled,
        book: this.book,
        winner: this.winner.name,
        loser: this.loser.name
      };
    };
  }

  function Player (startingOdds, endingOdds, name){
    this.startingOdds = startingOdds;
    this.endingOdds = endingOdds;
    this.name = name;

    this.POJO = function() {
      return {
        start: this.startingOdds,
        end: this.endingOdds,
        name: this.name
      };
    };
  }

  function historyTooltip (element, tableKey, outcomeId, provider, event, betslip, isBack) {
    var table = this.getTable(tableKey);
    if (!table) {
      console.log("first");
        return false
    }
    var formatOdd = function(odd) {
        if (table.isExchange) {
            odd = globals.getCommisionOdd(odd, provider, isBack)
        }
        return globals.formatOdd(odd, true)
    }
    ;
    var getOddDelta = function(odd1, odd2) {
        if (table.isExchange) {
            odd1 = globals.getCommisionOdd(odd1, provider, isBack);
            odd2 = globals.getCommisionOdd(odd2, provider, isBack)
        }
        return globals.getOddDelta(odd1, odd2)
    }
    ;
    var providerRow = table.getProviderRow(provider);
    if (!providerRow) {
      console.log("second");
        return false
    }
    var key;
    var cellObject = null ;
    for (var i = 0; i < table.dataCols.length; i++) {
        key = table.dataCols[i];
        if (key !== null  && table.dataColsObject[key].outcomeId == outcomeId) {
            if (table.isExchange && !isBack) {
                key = 'L' + key
            }
            cellObject = providerRow.valueCells[key]
        }
    }
    if (!cellObject) {
      console.log("third");
        return false
    }
    var out = '';
    var delta = null ;
    if (page.historyCleared) {
        out += 'Closing odds: ';
        out += ' <strong>' + formatOdd(cellObject.value[0]) + '</strong> ';
        if (table.isExchange) {
            out += ' (' + cellObject.value[1] + ') '
        }
        delta = getOddDelta(cellObject.value[0], cellObject.opening[0]);
        if (delta != 0) {
            out += globals.formatOddDelta(delta, true)
        }
        out += '<br />';
        out += 'Opening odds: ';
        out += ' <strong>' + formatOdd(cellObject.opening[0]) + '</strong> ';
        return formatOdd(cellObject.opening[0]);
        if (table.isExchange) {
            out += ' (' + cellObject.opening[1] + ') '
        }
    } else {
        var hist = cellObject.history;
        var currentOddDisplayed = false;
        var onlyOpening = true;
        if (hist && hist.length > 0) {
            if (cellObject.value[0] != hist[0][0]) {
                out += globals.dateTime(cellObject.value[2], true) + ' ';
                out += ' <strong>' + formatOdd(cellObject.value[0]) + '</strong> ';
                if (table.isExchange) {
                    out += ' (' + cellObject.value[1] + ') '
                }
                delta = getOddDelta(cellObject.value[0], hist[0][0]);
                out += globals.formatOddDelta(delta, true);
                out += '<br />';
                currentOddDisplayed = true;
                onlyOpening = false
            }
            if (hist.length > 0 || currentOddDisplayed) {
                for (i = 0; i < hist.length - 1; i++) {
                    out += globals.dateTime(hist[i][2], true) + ' ';
                    out += ' <strong>' + formatOdd(hist[i][0]) + '</strong> ';
                    if (table.isExchange) {
                        out += ' (' + hist[i][1] + ') '
                    }
                    if (hist[i + 1]) {
                        delta = getOddDelta(hist[i][0], hist[i + 1][0]);
                        out += globals.formatOddDelta(delta, true)
                    }
                    out += '<br />';
                    onlyOpening = false
                }
                cellObject.opening = hist[hist.length - 1];
                if (!onlyOpening) {
                    out += '<br />'
                }
                out += 'Opening odds:<br />';
                out += globals.dateTime(cellObject.opening[2], true) + ' ';
                out += ' <strong>' + formatOdd(cellObject.opening[0], true) + '</strong>';
                return formatOdd(cellObject.opening[0], true);
                if (table.isExchange) {
                    out += ' (' + cellObject.opening[1] + ') '
                }
                out += '<br />'
            }
        }
        if (betslip && out != '') {
            out += '<strong>' + _('Click to BET NOW') + '</strong>'
        } else if (betslip) {
            out += '<strong>' + _('Click to BET NOW') + ' ' + _('(remote betslip)') + '</strong>'
        }
    }
  }
}

function waitFor(testFx, onReady, timeOutMillis) {
    var maxtimeOutMillis = timeOutMillis ? timeOutMillis : 3000, //< Default Max Timout is 3s
        start = new Date().getTime(),
        condition = false,
        interval = setInterval(function() {
            if ( (new Date().getTime() - start < maxtimeOutMillis) && !condition ) {
                // If not time-out yet and condition not yet fulfilled
                condition = (typeof(testFx) === "string" ? eval(testFx) : testFx()); //< defensive code
            } else {
                if(!condition) {
                    // If condition still not fulfilled (timeout but condition is 'false')
                    console.log("'waitFor()' timeout");
                    phantom.exit(1);
                } else {
                    // Condition fulfilled (timeout and/or condition is 'true')
                    console.log("'waitFor()' finished in " + (new Date().getTime() - start) + "ms.");
                    typeof(onReady) === "string" ? eval(onReady) : onReady(); //< Do what it's supposed to do once the condition is fulfilled
                    clearInterval(interval); //< Stop this interval
                }
            }
        }, 250); //< repeat check every 250ms
};
