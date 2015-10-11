var os = require('os');
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var conf = require('nconf-jsonminify');
var GitHubAPI = require('github');
var colors = require('colors');

var timespan = require('./timespan.js');

var github;

main();

function main() {
  initConfig();
  initGithub();

  var refreshTimeout = conf.get('refresh-timeout');
  if (!refreshTimeout) {
      return console.error("ERROR:".red + " You need to provide a 'refresh-timeout' specification in your configuration file");
  }

  var refreshTimeoutMs = timespan.getTimeSpanInMs(refreshTimeout);
  initializeRefreshLoop(refreshTimeoutMs);
}

function initGithub() {
  github = new GitHubAPI({
   // required
   version: "3.0.0",
   // optional
   debug: true,
   protocol: "https",
   host: "api.github.com", // should be api.github.com for GitHub
   pathPrefix: "", // for some GHEs; none for GitHub
   timeout: 5000,
   headers: {
       "user-agent": "hotfoot/0.1.0" // GitHub is happy with a unique user agent
   }
   });

   var userToken = conf.get('github-auth-token');
   if (!userToken) {
       return console.error("WARN:".yellow + " No github authentication token was specified in your config file. We won't be able to do much!");
   }

   github.authenticate({
     type: 'token',
     token: userToken
   });
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
  // We want to perform the following on each refresh:
  // 1. Download the list of github issues (and PRs, if enabled) for the given
  //    repositories that have changed since the last refresh. These need to be
  //    processed, one at a time.
  // github.repos.getAll({}, function (err, data) {
  //   if (err) {
  //     return console.error("ERROR".red, err);
  //   }
  //
  //   for (index in data) {
  //     var object = data[index];
  //     console.log(object.full_name);
  //   }
  // });
}

function initializeRefreshLoop(aTimeSpanMs) {
  refresh();
  var intervalId = setInterval(refresh, aTimeSpanMs);
}
