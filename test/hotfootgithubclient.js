var assert = require('assert');
var mockery = require('mockery');
var github = require('github');
var fs = require('fs');
var path = require('path');
var logger = require('tracer').colorConsole();

var HotfootGithubClient;

function GithubMock(config) {

}

// For the mock prototype, we use a hack whereby the authentication token has the
// form: number;number. The first number is the number of issues to create and the
// second is the number of pull requests to create. Pull requests are always
// created after issues, and the last thing to be created will have the most
// recent update time.
GithubMock.prototype = {
  mAuthToken: null,

  authenticate: function(params) {
    this.mAuthToken = params.token;
    this.issues.mAuthToken = params.token;
  },

  hasNextPage: function() {
    return this.issues.mHasMorePages;
  },

  issues: {
    repoIssues: function(params, callback) {
      var currentPage = params.page;
      var perPage = params.per_page;
      var since = params.since;
      var numIssues = this.mAuthToken.split(';')[0];
      var numPRs = this.mAuthToken.split(';')[1];
      var issues = createIssuesAndPRs(currentPage, perPage, since, numIssues, numPRs);
      this.mHasMorePages = issues["meta"]["hasMorePages"];
      callback(null, issues);
    }
  }
}

function createIssuesAndPRs(aCurrentPage, aPerPage, aSince, aNumber, aNumberPRs) {
  var issuesTemplateString = fs.readFileSync(path.join(__dirname, '/data',
                                             'issue.json'), 'utf8');

  var prTemplateString = fs.readFileSync(path.join(__dirname, '/data',
                                         'pullrequest.json'), 'utf8');


  var issuesTemplate = JSON.parse(issuesTemplateString);
  var pullRequestTemplate = JSON.parse(prTemplateString);

  var issuesArray = [];
  for (i = 0; i < aNumber - aNumberPRs; i++) {
    createSingleIssueAndAddToArray(issuesTemplate, i, aNumber - aNumberPRs, issuesArray);
  }

  for (j = aNumber - aNumberPRs + 1; j < aNumber; j++) {
    createSingleIssueAndAddToArray(pullRequestTemplate, j, aNumber, issuesArray);
  }

  var startIndex = 0 + (aPerPage*aCurrentPage);
  var endIndex = aPerPage + (aPerPage*aCurrentPage);
  issuesArray = issuesArray.filter(function(element, index, array) {
    if (!aSince) {
      return true;
    }

    var sinceDate = Date.parse(aSince);
    var issueUpdatedAt = Date.parse(element.updated_at);
    return sinceDate < issueUpdatedAt;
  });

  var hasMorePages = issuesArray.length > (aPerPage * (aCurrentPage+1));
  issuesArray = issuesArray.slice(startIndex, endIndex);

  addMetaDataToArray(issuesArray, hasMorePages);

  return issuesArray;
}

function addMetaDataToArray(aArray, aHasMorePages) {
  var metaDataTemplateString = fs.readFileSync(path.join(__dirname, '/data',
                                               'meta.json'), 'utf8');

  var metaDataTemplate = JSON.parse(metaDataTemplateString);

  aArray["meta"] = metaDataTemplate.meta;
  aArray["meta"]["hasMorePages"] = aHasMorePages;
}

function createSingleIssueAndAddToArray(aTemplate, aNumber, aTotal, aIssuesArray) {
  // Clone the template object
  aIssuesArray.push(JSON.parse(JSON.stringify(aTemplate["0"])));
  aIssuesArray[i].number = aNumber;

  // Make all of the issues have a last updated date of 1444259586254, which is
  // 2015-10-13T23:13:32.564Z, except the last one, which should have an update
  // date of now.
  aIssuesArray[aNumber].updated_at = new Date(1444259586254).toISOString();

  if (aNumber == (aTotal - 1)) {
    aIssuesArray[aNumber].updated_at = new Date().toISOString();
  }

  for (prop in aIssuesArray[aNumber]) {
    if (aIssuesArray[aNumber].hasOwnProperty(prop)
        && (typeof aIssuesArray[aNumber][prop] == "string")) {
      aIssuesArray[aNumber][prop] = aIssuesArray[aNumber][prop].replace("{issueNum}", aNumber);
    }
  }
}

describe('HotfootGithubClient', function() {
  before(function() {
    mockery.enable();
    mockery.registerMock('github', GithubMock);
    mockery.registerAllowable('../hotfootgithubclient.js');
    mockery.registerAllowable('tracer');
    mockery.registerAllowable('./console');

    HotfootGithubClient = require('../hotfootgithubclient.js');
  });

  after(function() {
    mockery.disable();
  });

  describe('intitialization', function() {
    it ('should initialize a HotfootGithubClient with two repos', function() {
      var githubClient = new HotfootGithubClient(['some/repo', 'another/repo'], '2;0');
      assert.equal(githubClient.getRepos().length, 2);
    });

  // describe('issue retrieval', function() {
  //   it ('should return that 2 repositories were refreshed after calling refreshAllRepos', function(done) {
  //     var githubClient = new HotfootGithubClient(['some/repo', 'another/repo'], 'anAuthToken');
  //     var lastUpdateTime = new Date().getTime();
  //     githubClient.refreshAllRepos(lastUpdateTime, function(err, data) {
  //       assert.equal(2, data.length);
  //       done();
  //     });
  //   });

    it ('should return both issues in a repository with two issues without paging', function(done) {
      var githubClient = new HotfootGithubClient(['some/repo', 'another/repo'], '2;0');
      githubClient._getPageOfIssuesFromRepository(null, 'some', 'repo', 0, function(err, issues) {
        assert.equal(issues.length, 2);
        assert(!githubClient._hasAdditionalPages());
        done();
      });
    });

    it ('should return metadata with issues', function(done) {
      var gh = require('github');
      var githubClient = new gh({
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

       githubClient.authenticate({
         type: 'token',
         token: 'blah'
       });

       var params = {
         user: 'some',
         repo: 'repo',
         state: "all",
         page: 0,
         per_page: 100
       };

      githubClient.issues.repoIssues(params, function (err, data) {
        if (err) {
          throw err;
          done();
        }

        assert(data['meta']);
        done();
      });
    });

    it ('should return that the repository has more pages after retrieval of the first page of issues', function(done) {
      var githubClient = new HotfootGithubClient(['some/repo'], '120;0');
      githubClient._getPageOfIssuesFromRepository(null, 'some', 'repo', 0, function(err, issues) {
        assert.equal(issues.length, 100);
        assert(githubClient._hasAdditionalPages());
        done();
      });
    });

    it ('should return all issues in a repository with 313 issues', function(done) {
      var githubClient = new HotfootGithubClient(['some/repo'], '313;0');
      githubClient.getIssuesFromRepository(null, 'some', 'repo', function(err, data) {
        assert.equal(data.length, 313);
        done();
      });
    });

    it ('should return one issue modified since 2015-10-13T23:13:32.564Z', function (done) {
      var githubClient = new HotfootGithubClient(['some/repo'], '313;0');
      var lastUpdateTime = new Date(1444259587254);
      githubClient.getIssuesFromRepository(lastUpdateTime, 'some', 'repo', function(err, data) {
        assert.equal(data.length, 1);
        done();
      });
    });

    it ('should return a single pull request for a repository that has one pull request modified since 2015-10-13T23:13:32.564Z', function (done) {
      var githubClient = new HotfootGithubClient(['some/repo'], '4;5');
      var lastUpdateTime = new Date(1444259587254);
      githubClient.getIssuesFromRepository(lastUpdateTime, 'some', 'repo', function(err, data) {
        assert.equal(data.length, 1);
        assert(githubClient._isPullRequest(data[0]));
        done();
      });
    });
  });
});
