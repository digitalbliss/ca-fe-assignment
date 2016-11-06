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
            wordCountArray: [],
            batchSize: 6,
            batchResults: [],
            timeTaken: 0
        },
        baseUrl = 'https://hacker-news.firebaseio.com/v0/',
        batchResults = [],
        startTime=0,
        endTime=0;

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
            Takes as input an array of strings and creates new objects in 
            hnAPI.wordCountArray or increments their count if they already exist
        */
        function addArrayToWordCount(inputArray) {

            for (var i = 0; i < inputArray.length; i++) {

                var newWord = inputArray[i];
                var isFirstInput = hnAPI.wordCountArray.length === 0? true: false;

                // first word in the wordCountArray, create and push the object
                if (isFirstInput) {
                    hnAPI.wordCountArray.push({count: 1, word: newWord});
                } else {

                    //go through the word count array 
                    for (var x = 0; x < hnAPI.wordCountArray.length; x++) {

                        // check if it is an existing word and increment count if so
                        if (hnAPI.wordCountArray[x].word === newWord) {
                            hnAPI.wordCountArray[x].count++;
                            break;
                        } else if (x === hnAPI.wordCountArray.length - 1) {
                            // otherwise add an object at the last position
                            hnAPI.wordCountArray.push({count: 1, word: newWord});
                            break;
                        }
                    }
                }
            }
        }

        /*
            Uses a simple regex to get the words from the input text
            and then converts them to lowercase so that we can ignore
            case in the count. Finally adds them to the count.
        */
        function countWords(text) {

            var words = text.match(/[-\w]+/g);

            // transform to lowercase 
            var lowerCaseWords = arrayToLowercase(words);

            // and add to our current count
            addArrayToWordCount(lowerCaseWords);
        }

        /*
            Main method for making the GET requests./
            Returns the result on success and error
            so that its handled by the caller.
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
            Entry point for the UI takes as input a 
            string representing a task and starts execution.
        */
        hnAPI.startProcess = function(task) {

            // reseting so that we get fresh results
            hnAPI.reset();
            startTime = new Date().getTime();
            hnAPI.status = 'Getting maxitem';
            hnAPI.get('maxitem.json').then(function(data){
                hnAPI.status = 'Got maxitem';

                //store the latest entry id
                hnAPI.currentEntryId = data.data;

                // kickoff the selected process
                if (task === 'stories-600') {
                    hnAPI.retrieveStories();
                } else if (task === 'posts') {
                    hnAPI.retrieveLastWeeksStories();
                } else if (task === 'stories-600-batch') {
                    hnAPI.retrieveStoriesBatch();
                }
            });
        }

        // for error handling just logs the failed request.
        function handleError(failedRequest) {
            console.error('Something went wrong with this request: ');
            console.error(failedRequest);
        }

        /* 
            Used to process the batch results.
            Goes through them and counts the words
            empties the array for later processing calls.
        */
        function processBatchResults() {

            for (var i = 0; i < hnAPI.batchResults.length; i++) {

                // stop batch processing if we have reached the desired number of stories
                if (hnAPI.storiesRetrieved >= hnAPI.numberOfStoriesToRetrieve) {
                    break;
                }

                countWords(hnAPI.batchResults[i].text);
            }
            hnAPI.batchResults = [];
        }

        /* 
            Executes the next batch of requests.
        */
        function retrieveNextBatch() {

            var deferred = $q.defer();
            var currentBatchCount = 0;

            function getEntry(entryId) {
                // updating the entryId now means that we don't care 
                // if it fails or succeeds as each entryId will be tried 
                // only once.
                hnAPI.currentEntryId = hnAPI.currentEntryId - 1;

                hnAPI.get('item/' + entryId + '.json').then(function(response) {
                    // storing the entry id we tried.
                    hnAPI.latestEntries.push(entryId);
                    currentBatchCount++;

                    // sometimes the statusText is OK but the data is null
                    // so we log that as an error.
                    if (response.statusText === 'OK' && response.data) {

                        var responseData = response.data;
                        // Using text only to get results quicker alternatively use:
                        // if (response.type === 'story' && response.text) {
                        if (responseData.text) {
                            hnAPI.storiesRetrieved = hnAPI.storiesRetrieved + 1;
                            hnAPI.batchResults.push(responseData);
                        }

                        if (currentBatchCount === hnAPI.batchSize){
                             deferred.resolve('Finished Batch');
                        }
                    } else {
                        handleError(response);

                        if (currentBatchCount === hnAPI.batchSize){
                             deferred.resolve('Finished Batch');
                        }
                    }
                });
            }

            // Fire off all of the requests in a specific batch size
            for (var i = 0; i < hnAPI.batchSize; i++) {
                getEntry(hnAPI.currentEntryId);
            }

            return deferred.promise;
        }

        /*
            Fires off the request batches until the required number
            of stories retrieved is reached
        */
        hnAPI.retrieveStoriesBatch = function () {
            hnAPI.status = 'Retrieving Entries';

            retrieveNextBatch().then(function(){
                processBatchResults();

                // if we retrieved enough stories stop the porcess and count the time
                if (hnAPI.storiesRetrieved >= hnAPI.numberOfStoriesToRetrieve) {
                    endTime = new Date().getTime();
                    hnAPI.status = 'Finished';
                    var time = endTime - startTime;
                    hnAPI.timeTaken = time;
                } else {
                    // otherwise rinse and repeat
                    hnAPI.retrieveStoriesBatch();
                }
            });
        }

        /*
            Retrieves and processes the number of stories required
            one at a time.
        */
        hnAPI.retrieveStories = function () {
            hnAPI.status = 'Retrieving Entries';

            function getEntry(entryId) {
                hnAPI.latestEntries.push(entryId);
                hnAPI.get('item/' + entryId + '.json').then(function(response) {

                    // sometimes the statusText is OK but the data is null
                    // so we log that as an error.
                    if (response.statusText === 'OK' && response.data) {

                        var responseData = response.data;

                        // Using text only to get results quicker alternatively use:
                        // if (response.type === 'story' && response.text) {
                        if (responseData.text) {
                            hnAPI.storiesRetrieved = hnAPI.storiesRetrieved + 1;
                            countWords(responseData.text);
                        }

                        // resolve when we have reached the number of stories to retrieve
                        if (hnAPI.storiesRetrieved >= hnAPI.numberOfStoriesToRetrieve) {
                            endTime = new Date().getTime();
                            hnAPI.status = 'Finished';
                            var time = endTime - startTime;
                            hnAPI.timeTaken = time;
                        } else { //else keep going
                            hnAPI.currentEntryId = hnAPI.currentEntryId - 1;
                            getEntry(hnAPI.currentEntryId);
                        }
                    } else {
                        handleError(response);

                        // and keep going
                        hnAPI.currentEntryId = hnAPI.currentEntryId - 1;
                        getEntry(hnAPI.currentEntryId);
                    }   
                });
            }

            getEntry(hnAPI.currentEntryId);
        }

        /*  
            Retrieves and processes last week's stories
            one at a time.
        */
        hnAPI.retrieveLastWeeksStories = function () {

            // simplified version of last week 60 seconds * 60 minutes * 24 hours * 7 days
            // not sure what we meant by exactly last week
            var lastWeekInSeconds = (Date.now()/1000) - (60*60*24*7);
            // past couple of hours for something quicker
            // var lastWeekInSeconds = (Date.now()/1000) - (60*60*2);
            hnAPI.status = 'Retrieving Entries';

            function getEntry(entryId) {
                hnAPI.latestEntries.push(entryId);
                hnAPI.get('item/' + entryId + '.json').then(function(response) {

                    // sometimes the statusText is OK but the data is null
                    // so we log that as an error.
                    if (response.statusText === 'OK' && response.data) {

                        var responseData = response.data;

                        // Using text only to get results quicker alternatively use:
                        // if (response.type === 'story' && response.text) {
                        if (responseData.text) {
                            hnAPI.storiesRetrieved = hnAPI.storiesRetrieved + 1;
                            countWords(responseData.text);
                        }

                        // if the response is less than a week old process it
                        if (response.time >= lastWeekInSeconds) {
                            endTime = new Date().getTime();
                            hnAPI.status = 'Finished';
                            var time = endTime - startTime;
                            hnAPI.timeTaken = time;
                        } else { //else keep going
                            hnAPI.currentEntryId = hnAPI.currentEntryId - 1;
                            getEntry(hnAPI.currentEntryId);
                        }
                    } else {
                        handleError(response);

                        // and keep going
                        hnAPI.currentEntryId = hnAPI.currentEntryId - 1;
                        getEntry(hnAPI.currentEntryId);
                    }   
                });
            }
            getEntry(hnAPI.currentEntryId);
        }

        /*
            Used to reset state
        */
        hnAPI.reset = function (){
            hnAPI.wordCount = {};
            hnAPI.latestEntries = [];
            hnAPI.wordCount = {};
            hnAPI.sortedWordCount = [];
            hnAPI.currentEntryId = 0;
            hnAPI.status = 'Ready';
            hnAPI.storiesRetrieved = 0;
            hnAPI.wordCountArray = [];
            hnAPI.timeTaken = 0;
        }

        return hnAPI;
    }
]);

