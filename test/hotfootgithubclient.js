var assert = require('assert');
var mockery = require('mockery');
var github = require('github');
var fs = require('fs');
var path = require('path');

var HotfootGithubClient;

function GithubMock(config) {

}

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
      var issues = createIssues(currentPage, perPage, Number(this.mAuthToken));
      this.mHasMorePages = issues["meta"]["hasMorePages"];
      callback(null, issues);
    }
  }
}

function createIssues(aCurrentPage, aPerPage, aNumber) {
  var issuesTemplateString = fs.readFileSync(path.join(__dirname, '/data',
                                             'issue.json'), 'utf8');

  var issuesTemplate = JSON.parse(issuesTemplateString);
  var issuesArray = [];
  for (i = 0; i < aNumber; i++) {
    // Clone the template object
    issuesArray.push(JSON.parse(JSON.stringify(issuesTemplate["0"])));
    issuesArray[i].number = i;
    for (prop in issuesArray[i]) {
      if (issuesArray[i].hasOwnProperty(prop) && (typeof issuesArray[i][prop] == "string")) {
        issuesArray[i][prop] = issuesArray[i][prop].replace("{issueNum}", i);
      }
    }
  }

  var startIndex = 0 + (aPerPage*aCurrentPage);
  var endIndex = aPerPage + (aPerPage*aCurrentPage);
  var hasMorePages = issuesArray.length > (aPerPage * (aCurrentPage+1));
  issuesArray = issuesArray.slice(startIndex, endIndex);

  issuesArray["meta"] = issuesTemplate.meta;
  issuesArray["meta"]["hasMorePages"] = hasMorePages;

  return issuesArray;
}

describe('HotfootGithubClient', function() {
  before(function() {
    mockery.enable();
    mockery.registerMock('github', GithubMock);
    mockery.registerAllowable('../hotfootgithubclient.js');

    HotfootGithubClient = require('../hotfootgithubclient.js');
  });

  after(function() {
    mockery.disable();
  });

  describe('intitialization', function() {
    it ('should initialize a HotfootGithubClient with two repos', function() {
      var githubClient = new HotfootGithubClient(['some/repo', 'another/repo'], '2');
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
      var githubClient = new HotfootGithubClient(['some/repo', 'another/repo'], '2');
      var lastUpdateTime = new Date().getTime();
      githubClient._getPageOfIssuesFromRepository(lastUpdateTime, 'some', 'repo', 0, function(err, data) {
        assert.equal(data.issues.length, 2);
        assert(!githubClient._hasAdditionalPages());
        done();
      });
    });

    it ('should return that the repository has more pages after retrieval of the first page of issues', function(done) {
      var githubClient = new HotfootGithubClient(['some/repo'], '120');
      var lastUpdateTime = new Date().getTime();
      githubClient._getPageOfIssuesFromRepository(lastUpdateTime, 'some', 'repo', 0, function(err, data) {
        assert.equal(data.issues.length, 100);
        assert(githubClient._hasAdditionalPages());
        done();
      });
    });

    it ('should return all issues in a repository with 313 issues', function(done) {
      var githubClient = new HotfootGithubClient(['some/repo'], '313');
      var lastUpdateTime = new Date().getTime();
      githubClient.getIssuesFromRepository(lastUpdateTime, 'some', 'repo', function(err, data) {
        assert.equal(data.issues.length, 313);
        done();
      });
    });
  });
});
