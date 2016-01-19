var Pool = require('phantomjs-pool').Pool;
var urls = require('./2010.1.json');
var fs = require('fs');
var allMatches = [];
var numErrors = 0;
var numDone = 0;
var NUM_WORKERS = 10;
var outFile = process.argv[2];
console.log("writing to", outFile);

function jobCallback(job, worker, index) {
  if (index >= urls.length) {
    job(null);
  } else {
    var url = urls[index];
    console.log("Processing", url);
    job(url, function(err, matches) {
      numDone++;
      console.log(numDone / urls.length * 100 + "%");
      if (err) {
        numErrors++;
        console.error("Error on ", url, err);
        console.log("Error rate", numErrors / numDone * 100 + "%");
      } else {
        console.log("Done processing", url);
        allMatches = allMatches.concat(matches);
      }
      if (numDone >= urls.length - 1) {
        fs.writeFileSync(outFile || "out.json", JSON.stringify(allMatches));
      }
    });
  }
}

var pool = new Pool({
  numWorkers: NUM_WORKERS,
  jobCallback: jobCallback,
  workerFile: __dirname + "/scrape_match.js",
  phantomjsBinary: "/usr/local/bin/phantomjs",
  spawnWorkerDelay: 1000
});

pool.start();
