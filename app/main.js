'use strict';

var app = require('app');
var BrowserWindow = require('browser-window');

var env = require('./vendor/electron_boilerplate/env_config');
var devHelper = require('./vendor/electron_boilerplate/dev_helper');
var windowStateKeeper = require('./vendor/electron_boilerplate/window_state');

var ipc   = require('ipc');
var http  = require('http');
var https = require('https');
var http2 = require('http2');

// Disable certificate validation
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var mainWindow;
// Preserver of the window size and position between app launches.
var mainWindowState = windowStateKeeper('main');

app.on('ready', function () {
    mainWindow = new BrowserWindow({
        x: mainWindowState.x,
        y: mainWindowState.y,
        width: 500,
        height: 300,
        
        "use-content-size": true,
        resizable: false,
        fullscreen: false
    });

    mainWindow.loadUrl('file://' + __dirname + '/app.html');

    if (env.name === 'development') {
        devHelper.setDevMenu();
        mainWindow.openDevTools();
    }

    mainWindow.on('close', function () {
        mainWindowState.saveState(mainWindow);
    });
});

app.on('window-all-closed', function () {
    app.quit();
});




ipc.on('http-request', function(event, url) {
    http2.globalAgent = new http2.Agent(); // restart the http2 agent!
    console.log(url);

    http.get(url, function(response) {
        console.log(url + ' => ' + response.statusCode);
        var content = '';
        response.on('data', function (chunk) {
            content += chunk;
        });
        
        response.on('end', function() {
            event.returnValue = {url: url, statusCode: response.statusCode, content: JSON.parse(content)};
        });
    }).on('error', function(error) {
        console.log(url + ' => ' + error.message);
        event.returnValue = {url: url, error: error.message}
    });
});


ipc.on('http2-request', function(event, url) {
    console.log(url);
    var returnValue;
    
    // Handle better errors
    var get = (url.indexOf('https:') == -1) ? http2.raw.get : http2.get;
    //var get = (url.indexOf('https:') == -1) ? http.get : http2.get;
    
    var request = get(url, function(response) {
        console.log(url + ' => ' + response.statusCode);
        
        var content = '';
        response.on('data', function (chunk) {
            content += chunk;
        });
        
        response.on('end', function() {
            //console.log(url + ' => ' + content);
            returnValue = {url: url, statusCode: response.statusCode, content: JSON.parse(content)}
            //event.sender.send('http2-response', returnValue);
            event.returnValue = returnValue;
        });
        
    });
    
    request.on('error', function(error) {
        console.log(url + ' => ' + error.message);
        //event.sender.send('http2-response', {url: url, error: error.message});
        event.returnValue = {url: url, error: error};
    });
    
    request.setTimeout(1000, function(error) {
        console.log('request timeout');
    });
    
    if ((url.indexOf('https:') == -1)) {

        console.log('===============');
        for (var property in request) {
            console.log(property);
        }
        
        console.log('===============');
        for (var property in request.stream) {
            console.log(property);
        }
        
        console.log('===============');
        for (var property in request.stream.connection) {
            console.log(property);
        }
        
        
        console.log('===============');
        for (var property in request.domain) {
            console.log(property);
        }
        
        
        console.log('===============');
        
    
        request.stream.on('error', function(error) {
            console.log('stream');
        });
        
        request.stream.connection.on('error', function(error) {
            console.log('connection');
        });
        
        /*
        request.domain.on('error', function(error) {
            console.log('domain');
        });
        */
        
    }
    
    /*
    request.stream.on('error', function(error) {
        console.log('request timeout');
    });
    */

//event.returnValue = returnValue;
});



process.on('uncaughtException', function (er) {
    console.error(er);
    console.error(er.stack);
    //process.exit(1)
});