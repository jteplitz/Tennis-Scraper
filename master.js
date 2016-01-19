var Pool = require('phantomjs-pool').Pool;
var urls = require('./urls.json');
var fs = require('fs');
var allMatches = [];
var numDone = 0;
var NUM_WORKERS = 10;
var outFile = process.argv[2];

function jobCallback(job, worker, index) {
  if (index >= urls.length) {
    job(null);
  } else {
    var url = urls[index];
    console.log("Processing", url);
    job(url, function(err, matches) {
      numDone++;
      if (err) {
        console.error("Error on ", url, err);
      } else {
        console.log("Done processing", url);
        allMatches = allMatches.concat(matches);
        if (numDone === urls.length) {
          fs.writeFileSync(outFile || "out.json", JSON.stringify(allMatches));
        }
      }
    });
  }
}

var pool = new Pool({
  numWorkers: NUM_WORKERS,
  jobCallback: jobCallback,
  workerFile: __dirname + "/scrape_match.js",
  phantomjsBinary: "/usr/local/bin/phantomjs"
});

pool.start();
  var url = "http://www.oddsportal.com/tennis/india/atp-chennai-2009/devvarman-somdev-schuettler-rainer-AmsAckNi/";
