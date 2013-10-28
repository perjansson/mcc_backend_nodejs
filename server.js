var port = 1337;

var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')
  , moment = require('moment')
  , uuid = require('node-uuid')

app.listen(port);

function handler (req, http_res) {
  logMessage('Running handler in create server');
  http_res.writeHead(200, {'Content-Type': 'text/plain'});
  var response = '';

  var cradle = require('cradle');
  var connection = new(cradle.Connection)('81.169.133.153', {
      auth: { username: 'per_jansson', password: '8sP50bjSk3' }
  });

  var db = connection.database('mcc');
  db.save('nodeJsBackendWelcomeMessage', {
      message: 'Node.js backend for Meeting Cost Calculator d-(*_*)z'
  }, function (err, res) {
    if (err) {
        // Handle error
        logMessage(err);
        response += ' SAVE ERROR: Could not save record!!\n';
    } else {
        // Handle success
        logMessage(res);
        response += ' SUCESSFUL SAVE\n';
    }
    db.get('document_key', function (err, doc) {
        response += ' DOCUMENT: ' + doc + '\n';
        http_res.end(response);
    });
  });

}

io.sockets.on('connection', function (socket) {
  socket.on('meeting update request', function (data) {
    var meeting = JSON.parse(data);
    logMessage('Meeting ' + meeting.status + ':' + JSON.stringify(meeting, null, 4));
    if (meeting.id == null || meeting.id == '') {
      meeting.id = uuid.v4();
    }

    /* TODO: Persist meeting */

    socket.emit('meeting update response', meeting);
  });
});

function logMessage(message) {
  console.log('### ' + moment().format('MMMM Do YYYY, h:mm:ss a')); 
  console.log(message);
}