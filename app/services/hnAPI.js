'use strict';

angular.module('hnReader').factory('hnAPI', ['$http','$q',
    function($http, $q) {

        var hnAPI = {
            latestEntries: [],
            wordCount: {},
            sortedWordCount: [],
            currentEntryId: 0,
            status: 'Ready',
            storiesRetrieved: 0,
            numberOfStoriesToRetrieve: 600,
            wordCountArray: []
        },
        baseUrl = 'https://hacker-news.firebaseio.com/v0/';

        /*
            Utility method used to convert an array
            of strings to lowercase.
        */
        function arrayToLowercase(inputArray) {

            var lowerCaseWords = [];

            for (var i = 0; i < inputArray.length; i++) {
                lowerCaseWords.push(inputArray[i].toLowerCase());
            }

            return lowerCaseWords;
        }

        /*
            Used to do the word count using an object
            for the convinience of the syntax
        */
        function addToWordCount(inputArray) {

            for (var i = 0; i < inputArray.length; i++) {

                var word = inputArray[i];

                if (hnAPI.wordCount.hasOwnProperty(word)) {
                    hnAPI.wordCount[word].count = hnAPI.wordCount[word].count + 1;
                } else {
                    hnAPI.wordCount[word] = {count: 1, word: word};
                }
            }
        }

        /*
            Used to convert the word count object into
            an array for sorting and displaying in the UI
        */
        function wordCountToArray() {

            var array = [];

            for (var word in hnAPI.wordCount) {

              if (hnAPI.wordCount.hasOwnProperty(word)) {
                array.push(hnAPI.wordCount[word]);
              }
            }
            return array;
        }

        /*
            Simple method used to sort an array
        */
        function sortWordCount(inputArray) {
            return inputArray.sort(function(a, b){
                return a.count - b.count;
            });
        }

        /*
            Very simplistic method for counting words
            Uses a simple regex to get the words from the input text
            and then converts them to lowercase so that we can ignore
            case in the count
        */
        function countWords(text) {

            var words = text.match(/[-\w]+/g);

            // transform to lowercase 
            var lowerCaseWords = arrayToLowercase(words);

            //and add to our current count
            addToWordCount(lowerCaseWords);
        }

        /*
            Main method for making the GET requests.
        */
        hnAPI.get = function(inputUrl) {

            return $http({
                method: 'GET',
                url: baseUrl + inputUrl,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Access-Control-Allow-Origin': '*'
                }
            }).then(function(response) {

                return response;
            }, function(error) {

                // log and return the error
                console.error(error);
                return error;
            });
        };

        /* 
            Entry point for the UI
        */
        hnAPI.startProcess = function(task) {

            //reseting so that we get fresh results
            hnAPI.reset();
            hnAPI.status = 'Getting maxitem';
            hnAPI.get('maxitem.json').then(function(data){
                hnAPI.status = 'Got maxitem';

                //store the latest entry id
                hnAPI.currentEntryId = data.data;

                // kickoff the appropriate process
                if (task === 'stories-600') {
                    hnAPI.retrieveStories();
                } else if (task === 'posts') {
                    hnAPI.retrieveLastWeeksStories();
                }
            });
        }

        hnAPI.retrieveStories = function () {

            var deferred = $q.defer();

            function getEntry(entryId) {
                var lastWeekInSeconds = Date.now() *1000 - (60*60*24*7);

                hnAPI.get('item/' + entryId + '.json').then(function(data){
                    hnAPI.status = 'Retrieving Entries';
                    var response = data.data;
                    hnAPI.latestEntries.push(response);
                    hnAPI.currentEntryId = hnAPI.currentEntryId - 1;

                    // Using text only to get results quicker
                    // if (response.type === 'story' && response.text) {
                    if (response.text) {
                    
                        hnAPI.storiesRetrieved = hnAPI.storiesRetrieved + 1;
                        countWords(response.text);
                        hnAPI.wordCountArray = wordCountToArray();
                        hnAPI.wordCountArray = sortWordCount(hnAPI.wordCountArray);
                    }

                    // resolve when we have reached the number of stories to retrieve
                    if (hnAPI.storiesRetrieved >= hnAPI.numberOfStoriesToRetrieve) {
                        hnAPI.status = 'Finished';
                        deferred.resolve(data.data);
                    } else { //else keep going
                        getEntry(hnAPI.currentEntryId);
                    }
                });
            }
            //TODO: Error handling
            getEntry(hnAPI.currentEntryId);
        }


        /*
            Retrieves the stories for last week
        */
        hnAPI.retrieveLastWeeksStories = function () {

            var deferred = $q.defer();

            // simplified version of last week 60 seconds * 60 minutes * 24 hours * 7 days
            // not sure what we meant by exactly last week
            // var lastWeekInSeconds = (Date.now()/1000) - (60*60*24*7);
            // past couple of hours for something quicker
            var lastWeekInSeconds = (Date.now()/1000) - (60*60*2);

            function getEntry(entryId) {
                hnAPI.get('item/' + entryId + '.json').then(function(data){

                    // let the user know the job is in progress
                    hnAPI.status = 'Retrieving Entries';

                    var response = data.data;
                    hnAPI.latestEntries.push(response);

                    //counting down the entry numbers
                    hnAPI.currentEntryId = hnAPI.currentEntryId - 1;

                    if (!response) {
                        //TODO: Queue and repeat
                        console.error('a request returned null!!');
                        getEntry(hnAPI.currentEntryId);
                    } 

                    // if the response is less than a week old process it
                    else if (response.time >= lastWeekInSeconds) {

                        // but only if it contains text
                        if (response.text) {
                            hnAPI.storiesRetrieved = hnAPI.storiesRetrieved + 1;

                            countWords(response.text);
                            hnAPI.wordCountArray = wordCountToArray();
                            // Sorting now so that I can keep updating the UI and 
                            // give the user a sense of progress it would have been 
                            // more efficient to do this only once at the end
                            hnAPI.wordCountArray = sortWordCount(hnAPI.wordCountArray);
                        }

                        // and move on to the next one
                        getEntry(hnAPI.currentEntryId);
                    } else {
                        //else resolve
                        hnAPI.status = 'Finished';
                        deferred.resolve(data.data);
                    }
                });
            }
            //TODO: Error handling
            getEntry(hnAPI.currentEntryId);
        }

        /*
            Used to reset state
        */
        hnAPI.reset = function (){
            hnAPI.wordCount = {};
            hnAPI.latestEntries = [];
            hnAPI.latestEntries = [];
            hnAPI.wordCount = {};
            hnAPI.sortedWordCount = [];
            hnAPI.currentEntryId = 0;
            hnAPI.status = 'Ready';
            hnAPI.storiesRetrieved = 0;
            hnAPI.wordCountArray = [];
        }

        return hnAPI;
    }
]);

