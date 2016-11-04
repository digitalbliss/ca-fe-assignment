'use strict';

// Declare app level module which depends on views, and components
angular.module('hnReader', [
  'ngRoute'
  // 'hnReader.explanation'
  // 'hnReader.reader'
]).
config(['$locationProvider', '$routeProvider', function($locationProvider, $routeProvider) {
  $locationProvider.hashPrefix('!');
  $routeProvider.otherwise({redirectTo: '/explanation'})
  .when('/explanation', {
    templateUrl: 'partials/explanation.html',
    controller: 'ExplanationCtrl'
  }).when('/reader', {
    templateUrl: 'partials/reader.html',
    controller: 'ReaderCtrl'
  });

}]);
