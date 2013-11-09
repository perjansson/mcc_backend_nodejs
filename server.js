var port = 1337;

var app = require('http').createServer(initDbHandler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')
  , moment = require('moment')
  , uuid = require('node-uuid')

io.set('log level', 1);

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

  socket.on('top list request', function() {
    connectToCouchDb();

    db.view('mcc/findallwithnameandmeetingcost', function (err, res) {
      var meetings = [];
      res.forEach(function (row) {
        meetings.push(row);
      });
      logMessage('Find all meetings with name and meeting cost');
      socket.emit('top list update response', meetings);
    });
  });

  socket.on('meeting update request', function (data) {
    connectToCouchDb();

    var meeting = JSON.parse(data);
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

      socket.emit('meeting update response', meeting);
    });
  });
});

function logMessage(message) {
  console.log('### ' + moment().format('MMMM Do YYYY, h:mm:ss a')); 
  console.log(message);
}