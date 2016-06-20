'use strict';

require('console-stamp')(console, {
  colors: {
    stamp: "white",
    label: "yellow",
	}
});
var df = require('dateformat');

/* Note: using staging server url, remove .testing() for production
Using .testing() will overwrite the debug flag with true */ 
var LEX = require('letsencrypt-express').testing();

// Change these two lines!
var DOMAIN = 'localhost';
var EMAIL = 'blu@ayro.nz';

var lex = LEX.create({
  configDir: require('os').homedir() + '/letsencrypt/etc'
, approveRegistration: function (hostname, approve) { // leave `null` to disable automatic registration
    if (hostname === DOMAIN) { // Or check a database or list of allowed domains
      approve(null, {
        domains: [DOMAIN]
      , email: EMAIL
      , agreeTos: true
      });
    }
  }
});

// Main imports
var express = require('express');
var compression = require('compression');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
//var multer = require('multer'); // v1.0.5 // Used for multipart/form-data file uploading
var stylus = require('stylus');
var autoprefixer = require('autoprefixer-stylus');

// routing imports
var routes = require('./routes/index');

// Running a server
var app = express();
//var http = require('http').Server(app);
//var io = require('./lib/sockets').listen(http)

if (app.get('env') === 'development') {
  //var minify = require('./lib/minify');
  //minify();
}

app.use(function(req, res, next) {
  // Set permissive CORS header - this allows this server to be used only as
  // an API server in conjunction with something like webpack-dev-server.
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
logger.format('mydate', function(req, res) {
  return df(new Date()).toString().cyan;
});
logger.format('mystatus', function(req, res) {
  if (res.statusCode >= 400)
    return res.statusCode.toString().red;
  else if (res.statusCode >= 300)
    return res.statusCode.toString().yellow;
  return res.statusCode.toString().green;
});
app.use(logger('[:mydate] :remote-addr - :remote-user ":method :url HTTP/:http-version" :mystatus :res[content-length] ":referrer" ":user-agent"'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
//app.use(cookieParser());
app.use(stylus.middleware({
  src: path.join(__dirname, 'styl')
, dest: path.join(__dirname, 'public')
, compile: function(str, path) {
    return stylus(str)
      .use(autoprefixer())   // autoprefixer
      .set('filename', path) // @import
      .set('compress', true) // compress
      .set('include css', true)
    ;
  }
}));
 
app.use(compression());

var oneDay = 86400000;
app.use(express.static(path.join(__dirname, 'public'), { maxAge: oneDay*7 }));

app.use('/', routes);

//io.on('connection', function(socket){
//  console.log('a user connected');
//});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


//module.exports = app;
//module.exports = http;

//var server = http;
var debug = require('debug')('temp:server');
var https = require('http2');
var port = normalizePort(process.env.PORT || '3000');

//server.listen(port);
//server.on('error', onError);
//server.on('listening', onListening);
lex.onRequest = app;

lex.listen([80], [443, 5001], function () {
  var protocol = ('requestCert' in this) ? 'https': 'http';
  console.log("Listening at " + protocol + '://localhost:' + this.address().port);
});
//var fs = require('fs');
//var options = {
//  key: fs.readFileSync('./config/key.pem'),
//  cert: fs.readFileSync('./config/cert.pem')
//};
//https.createServer(lex.httpsOptions, LEX.createAcmeResponder(lex, app)).listen(4043);
//https.createServer(options, function(request, response) {
//  response.end('Hello world!');
//}).listen(4043);
var server = https;

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

