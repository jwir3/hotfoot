var os = require('os');
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var conf = require('nconf-jsonminify');

var timespan = require('./timespan.js');

main();

function main() {
  initConfig();

  var refreshTimeoutMs = timespan.getTimeSpanInMs(conf.get('refresh-timeout'));
  initializeRefreshLoop(refreshTimeoutMs);
}

function initConfig() {
  verifyConfigDirCreated();
  conf.loadFile(getConfigPath());
}

function getConfigDirPath() {
  return path.join(os.homedir(), '.hotfoot');
}

function getConfigPath() {
  return path.join(getConfigDirPath(), 'config.json');
}

function verifyConfigDirCreated() {
  var configDirPath = getConfigDirPath();

  try {
    fs.accessSync(configDirPath);
  } catch (err) {
    mkdirp.sync(configDirPath);
  }

  try {
    fs.accessSync(getConfigPath());
  } catch (err) {
    var defaultConfigPath = path.join(__dirname, "config", "default.json");
    var data = fs.readFileSync(defaultConfigPath);
    fs.writeFileSync(getConfigPath(), data);
  }
}

function refresh() {
  console.log("Refreshed at: " + new Date().toString());
}

function initializeRefreshLoop(aTimeSpanMs) {
  refresh();
  var intervalId = setInterval(refresh, aTimeSpanMs);
}
