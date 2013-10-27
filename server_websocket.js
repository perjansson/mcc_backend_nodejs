var port = 1337;

var http = require('http');

var httpServer = http.createServer(function(request, response) {
  logMessage((new Date()) + ' Received request for ' + request.url);
  response.writeHead(200, {'Content-type': 'text/plain'});
  response.end('Hello MCC node.js server :)\n');
});

httpServer.listen(port, function() {
  logMessage('HTTP server is listening on port ' + port);
});


var websocket = require('websocket').server;
var moment = require('moment');
var uuid = require('node-uuid');

webSocketServer = new websocket({
  httpServer: httpServer,
  autoAcceptConnections: false
});

webSocketServer.on('request', function(request) {
  var connection = request.accept();
  logMessage('WebSocket connection accepted on server side from ' + connection.remoteAddress + ' using Node.js :)');

  connection.on('message', function(message) {
    var meeting = JSON.parse(message.utf8Data);
    logMessage('Meeting ' + meeting.status + ':' + JSON.stringify(meeting, null, 4));
    if (meeting.id == null || meeting.id == '') {
      meeting.id = uuid.v4();
    }
    connection.sendUTF(meeting.id);
  });
  
  connection.on('close', function(reasonCode, description) {
    logMessage(connection.remoteAddress + ' disconnected with reasonCode: ' + reasonCode + ' and description: ' + description);
  });

});

function logMessage(message) {
  console.log('### ' + moment().format('MMMM Do YYYY, h:mm:ss a')); 
  console.log(message);
}