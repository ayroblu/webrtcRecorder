var app = require('./app');
var https = require('https');
var http = require('http');
var fs = require('fs')
var express = require('express');

var server = https.createServer(options, app).listen(4000)

try {
  fs.statSync('./key.pem')
  fs.statSync('./cert.pem')
  var options = {
    key: fs.readFileSync('./key.pem')
  , cert: fs.readFileSync('./cert.pem')
  , requestCert: false
  , rejectUnauthorized: false
  }
  https.createServer(options, app).listen(4000)
} catch(e) {
  http.createServer(app).listen(4000)
}
