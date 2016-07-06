var app = require('./app');
var https = require('https');
var fs = require('fs')
var express = require('express');

var options = {
  key: fs.readFileSync('./key.pem')
, cert: fs.readFileSync('./cert.pem')
, requestCert: false
, rejectUnauthorized: false
}
var server = https.createServer(options, app).listen(4000)
