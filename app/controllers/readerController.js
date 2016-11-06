'use strict';

angular.module('hnReader').controller('ReaderCtrl',
    ['$scope', 'hnAPI',
    function($scope, hnAPI) {

        var onRetrieveClicked = function () {

            if ($scope.selectedList !== ''){
                hnAPI.startProcess($scope.selectedList);
                $scope.message = 'Thanks! Getting that for you now.';
            } else {
                $scope.message = 'You have to choose something...';
            }
        }

        $scope.$watch( function () { return hnAPI.status; }, function (status) {
            $scope.apiStatus = status;

            if (status === 'Finished') {
                $scope.message = '...and done!';
                $scope.timeTaken = hnAPI.timeTaken;
            }
        }, true);

        $scope.$watch( function () { return hnAPI.storiesRetrieved; }, function (storiesRetrieved) {
            $scope.storiesRetrieved = storiesRetrieved;
            $scope.latestEntries = hnAPI.latestEntries;
        }, true);

        $scope.$watch( function () { return hnAPI.sortedWordCount; }, function (sortedWordCount) {
            $scope.sortedWordCount = sortedWordCount;
        }, true);

        $scope.$watch( function () { return hnAPI.wordCountArray; }, function (wordCountArray) {
            $scope.sortedWordCount = wordCountArray;
        }, true);

        $scope.selectedList = '';
        $scope.onRetrieveClicked = onRetrieveClicked;
        $scope.latestEntries = hnAPI.latestEntries;
        $scope.storiesRetrieved = hnAPI.storiesRetrieved;
        $scope.apiStatus = hnAPI.status;
        $scope.sortedWordCount = hnAPI.wordCountArray;
        $scope.message = '';
        $scope.timeTaken = hnAPI.timeTaken;
}]);