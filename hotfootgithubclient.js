var github = require('github');
var logger = require('tracer').colorConsole();

module.exports = HotfootGithubClient;

function HotfootGithubClient(aRepos, aAuthToken) {
  this.mGithub = new github({
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

   this.mGithub.authenticate({
     type: 'token',
     token: aAuthToken
   });

  this.mRepos = aRepos;
}

HotfootGithubClient.prototype = {
  mGithub: null,
  mRepos: null,

  getRepos: function() {
    return this.mRepos;
  },

  refreshAllRepos: function(aUpdateTime, aCompletedCallback) {
    var lastUpdate = new Date(Number(aUpdateTime));
    logger.debug("Last update was at: " + lastUpdate.toString());
    var reposRefreshed = [];

    for (index in this.mRepos) {
      var that = this;
      var repo = this.mRepos[index];
      var userName = repo.split("/")[0];
      var repoName = repo.split("/")[1];
      this.getIssuesFromRepository(userName, repoName, function(err, issues) {
        if (err) {
          aCompletedCallback(err, null);
          return;
        }

        reposRefreshed.push(userName + "/" + repoName);

        if (reposRefreshed.length == that.mRepos.length) {
          aCompletedCallback(null, reposRefreshed);
        }
      });
    }
  },

  getIssuesFromRepository: function(aLastUpdateTime, aUsername, aRepo, aCallback) {
    var issues = [];
    this._recursivelyMergeNextPageOfIssues(aLastUpdateTime, aUsername, aRepo, 0, issues, aCallback);
  },

  _recursivelyMergeNextPageOfIssues(aLastUpdateTime, aUsername, aRepo, aNextPage, aIssues, aCallback) {
    var issues = aIssues;
    var self = this;
    this._getPageOfIssuesFromRepository(aLastUpdateTime, aUsername, aRepo, aNextPage, function (err, data) {
      if (err) {
        aCallback(err, null);
        return;
      }

      for (i = 0; i < data.length; i++) {
        issues.push(data[i]);
      }

      if (self._hasAdditionalPages()) {
        self._recursivelyMergeNextPageOfIssues(aLastUpdateTime, aUsername, aRepo, aNextPage + 1, issues, aCallback);
      } else {
        aCallback(null, issues);
      }
    });
  },

  _hasAdditionalPages: function() {
    return this.mGithub.hasNextPage();
  },

  _getPageOfIssuesFromRepository: function(aLastUpdateTime, aUsername, aRepo, aPageNum, aCallback) {
    this.mGithub.issues.repoIssues({
      user: aUsername,
      repo: aRepo,
      state: "all",
      page: aPageNum,
      per_page: 100
    }, function (err, data) {
      if (err) {
        aCallback(err, null);
        return;
      }

      var issues = [];

      for (index = 0; index < data.length; index++) {
        issues.push(data[index]);
      }

      aCallback(null, issues);
    });
  }
}
