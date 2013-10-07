var port = 1337;

var http = require('http');

var httpServer = http.createServer(function(request, response) {
  logMessage((new Date()) + ' Received request for ' + request.url);
  response.writeHead(200, {'Content-type': 'text/plain'});
  response.end('MCC backend server started :)\n');
});

httpServer.listen(port, function() {
  logMessage('HTTP server is listening on port ' + port);
});


var WebSocketServer = require('websocket').server;

wsServer = new WebSocketServer({
  httpServer: httpServer,
  autoAcceptConnections: false
});

wsServer.on('request', function(request) {
  var connection = request.accept();
  logMessage('WebSocket connection accepted on server side using Node.js :)');

  connection.on('message', function(message) {
    var meeting = JSON.parse(message.utf8Data);
    logMessage('Meeting ' + meeting.status + ':' + JSON.stringify(meeting, null, 4));
  });
  
  connection.on('close', function(reasonCode, description) {
    logMessage((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
  });

});

function logMessage(message) {
  console.log(message);
}