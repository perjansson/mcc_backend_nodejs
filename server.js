var port = 1337;

var app = require('http').createServer(initDbHandler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')
  , moment = require('moment')
  , uuid = require('node-uuid')

app.listen(port);

var db = null;

function initDbHandler (req, http_res) {
  connectToCouchDb();  
  http_res.writeHead(200, {'Content-Type': 'text/plain'});
  http_res.end('Node.js server up and running v-(*_*)z');
}

function connectToCouchDb() {
  if (db == null) {
    var cradle = require('cradle');
    var connection = new(cradle.Connection)('81.169.133.153', {
        auth: { username: 'per_jansson', password: '8sP50bjSk3' }
    });

    db = connection.database('mcc');

    logMessage('Successfully connected to couchdb');
  }
}

io.sockets.on('connection', function (socket) {
  socket.on('meeting update request', function (data) {
    connectToCouchDb();

    var meeting = JSON.parse(data);
    /*logMessage('Meeting ' + meeting.status + ':' + JSON.stringify(meeting, null, 4));*/
    if (meeting.id == null || meeting.id == '') {
      meeting.id = uuid.v4();
      logMessage('Generated new id: ' + meeting.id);
    }

    db.save(meeting.id, meeting, function (err, res) {
      if (err) {
          // Handle error
          logMessage('Error saving meeting with id: ' + meeting.id + ' Error: ' + err);
      } else {
          // Handle success
          logMessage('Success saving meeting with id: ' + meeting.id);
      }
      /*db.get(meeting.id, function (err, meeting) {
          logMessage('Success getting meeting with id: ' + meeting.id);*/
          socket.emit('meeting update response', meeting);
      /*});*/
    });
  });
});

function logMessage(message) {
  console.log('### ' + moment().format('MMMM Do YYYY, h:mm:ss a')); 
  console.log(message);
}