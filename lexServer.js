var app = require('./app');
var LEX = require('letsencrypt-express').testing();

// Change these two lines!
var DOMAIN = 'webrtc.ayro.nz';
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

var debug = require('debug')('temp:server');
//var https = require('https');

//server.listen(port);
//server.on('error', onError);
//server.on('listening', onListening);
lex.onRequest = app;

lex.listen([3100], [4000, 5001], function () {
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
//var server = https;
//var port = normalizePort(process.env.PORT || '3000');
//
//function normalizePort(val) {
//  var port = parseInt(val, 10);
//
//  if (isNaN(port)) {
//    // named pipe
//    return val;
//  }
//
//  if (port >= 0) {
//    // port number
//    return port;
//  }
//
//  return false;
//}
//
//function onError(error) {
//  if (error.syscall !== 'listen') {
//    throw error;
//  }
//
//  var bind = typeof port === 'string'
//    ? 'Pipe ' + port
//    : 'Port ' + port;
//
//  // handle specific listen errors with friendly messages
//  switch (error.code) {
//    case 'EACCES':
//      console.error(bind + ' requires elevated privileges');
//      process.exit(1);
//      break;
//    case 'EADDRINUSE':
//      console.error(bind + ' is already in use');
//      process.exit(1);
//      break;
//    default:
//      throw error;
//  }
//}
//
//function onListening() {
//  var addr = server.address();
//  var bind = typeof addr === 'string'
//    ? 'pipe ' + addr
//    : 'port ' + addr.port;
//  debug('Listening on ' + bind);
//}
//
