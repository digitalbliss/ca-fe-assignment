'use strict';

angular.module('hnReader', [
  'ngRoute'
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
