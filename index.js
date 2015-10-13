var os = require('os');
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var conf = require('nconf-jsonminify');
var GitHubAPI = require('github');
var url = require('url');
var logger = require('tracer').colorConsole();

var HotfootGithubClient = require('./hotfootgithubclient.js');
var timespan = require('./timespan.js');

var github;

var githubClient;

main();

function main() {
  initConfig();
  initGithubClient();

  var refreshTimeout = conf.get('refresh-timeout');
  if (!refreshTimeout) {
      return logger.error("You need to provide a 'refresh-timeout' specification in your configuration file");
  }

  var refreshTimeoutMs = timespan.getTimeSpanInMs(refreshTimeout);
  initializeRefreshLoop(refreshTimeoutMs);
}

function initGithubClient() {
  var repositories = conf.get('repositories');
  var userToken = conf.get('github-auth-token');
  if (!userToken) {
    logger.warn("No github authentication token was specified in your config file. You won't be able to view private repositories.");
  } else {
    githubClient = new HotfootGithubClient(repositories, userToken);
  }
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

function getCacheDirPath() {
  return path.join(os.homedir(), '.hotfoot', 'cache');
}

function getLastUpdateTime() {
  var lastupdate = undefined;
  var cachePath = getCacheDirPath();
  try {
    return fs.readFileSync(path.join(cachePath, 'lastupdate'));
  } catch (err) {
    return undefined;
  }
}

function adjustCacheForLastUpdateTime() {
  var now = new Date();

  var cachePath = getCacheDirPath();
  try {
    fs.accessSync(cachePath);
  } catch (err) {
    mkdirp.sync(cachePath);
  }

  fs.writeFileSync(path.join(getCacheDirPath(), 'lastupdate'), now.getTime());
}

function refresh() {
  var lastUpdate = getLastUpdateTime();
  // if (!lastUpdate) {
  //   // This is an initial update, so we should just not do anything for now.
  //   logger.debug("Initial update detected. Not performing refresh for this cycle.");
  //   adjustCacheForLastUpdateTime();
  //   return;
  // }

  // We want to perform the following on each refresh:
  // 1. Download the list of github issues (and PRs, if enabled) for the given
  //    repositories that have changed since the last refresh. These need to be
  //    processed, one at a time.
  // githubClient.refreshAllRepos(lastUpdate, function(err, data) {
  //   if (err) {
  //     logger.error(err);
  //     return;
  //   }
  // });


  githubClient.getIssuesFromRepository(lastUpdate, 'jwir3', 'hotfoot', function(err, data) {
    console.log("Saw: " + data.length + " issues");
  });

  // Adjust the cache to indicate when the last refresh was.
  adjustCacheForLastUpdateTime();
}

// function processIssuesInRepository(aUserName, aRepoName) {
//   logger.debug("Refreshing repository: " + aUserName + "/" + aRepoName);
//   processSinglePageOfIssuesInRepository(aUserName, aRepoName,
//     function(err, aLinkHeader) {
//       logger.debug("Saw link header: " + aLinkHeader);
//   });
// }

function initializeRefreshLoop(aTimeSpanMs) {
  refresh();
  var intervalId = setInterval(refresh, aTimeSpanMs);
}
