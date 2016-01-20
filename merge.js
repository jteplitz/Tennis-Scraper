var fs = require("fs");
var dirname = __dirname + "/" + process.argv[2];
var outFile = __dirname + "/" + new Date().getTime() + "-merged-" + process.argv[3];
var dirList = fs.readdirSync(dirname);
var matches = [];

for (var i = 0; i < dirList.length; i++) {
  var curr = JSON.parse(fs.readFileSync(dirname + "/" + dirList[i]));
  matches = matches.concat(curr);
}

fs.writeFileSync(outFile, JSON.stringify(matches));
