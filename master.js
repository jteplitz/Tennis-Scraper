var Pool = require('phantomjs-pool').Pool;
var urls = require('./2010.3.json');
var fs = require('fs');
var allMatches = [];
var numErrors = 0;
var numDone = 0;
var filesWritten = 0;
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
      if (numDone >= urls.length - 1 || numDone % 50 === 0) {
        writeFile(allMatches);
      }
    });
  }
}

function writeFile(matches) {
  var name = new Date().getTime() + "-" + filesWritten + (outFile || "out.json");
  console.log("Dumping to", name);
  fs.writeFileSync(name, JSON.stringify(allMatches));
  filesWritten++;
}

var pool = new Pool({
  numWorkers: NUM_WORKERS,
  jobCallback: jobCallback,
  workerFile: __dirname + "/scrape_match.js",
  phantomjsBinary: "/usr/local/bin/phantomjs",
  spawnWorkerDelay: 1000
});

pool.start();
