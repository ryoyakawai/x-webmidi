/* sw.js */
importScripts('serviceworker-cache-polyfill.js');
var CACHE_NAME = 'samplesmfplayer-cache';
var urlsToCache = [
    './index.html',
    './sw.js',
    './register_sw.js',
    './bower_components/webcomponentsjs/webcomponents.js',
    './bower_components/polymer/polymer.html',
    './bower_components/x-webmidi/x-webmidirequestaccess.html',
    './bower_components/x-webmidi/extras/wm-webmidilink/wm-webmidilink.html',
    './bower_components/x-webmidi/extras/wm-smfplayer/wm-smfplayer.html',
    './contents/ys2_op_gm.mid',
    './images/webmidi-js-144x144.png',
];

self.addEventListener('install', function(event) {
  event.waitUntil(
      caches.open(CACHE_NAME)
          .then(function(cache) {
              //console.log('Opened cache ', cache);
              return cache.addAll(urlsToCache);
          })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
      caches.match(event.request)
          .then(function(response) {
              if (response) {
                  //console.log("[return cache] ", (response.url).split("/").pop());
                  return response;
              }
              var fetchRequest = event.request.clone();

              return fetch(fetchRequest)
                  .then(function(response) {
                      if (!response || response.status !== 200 || response.type !== 'basic') {
                          return response;
                      }
                      
                      var responseToCache = response.clone();

                      caches.open(CACHE_NAME)
                          .then(function(cache) {
                              cache.put(event.request, responseToCache);
                          });
                      
                      return response;
                  });
          })
  );
});

