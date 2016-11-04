'use strict';

angular.module('hnReader.version', [
  'hnReader.version.interpolate-filter',
  'hnReader.version.version-directive'
])

.value('version', '0.1');
