var port = 1337;

var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')
  , moment = require('moment')
  , uuid = require('node-uuid')

app.listen(port);

function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}

io.sockets.on('connection', function (socket) {
  socket.on('meeting update', function (data) {
    var meeting = JSON.parse(data);
    logMessage('Meeting ' + meeting.status + ':' + JSON.stringify(meeting, null, 4));
    if (meeting.id == null || meeting.id == '') {
      meeting.id = uuid.v4();
    }
    socket.emit('message', meeting);
  });
});

function logMessage(message) {
  console.log('### ' + moment().format('MMMM Do YYYY, h:mm:ss a')); 
  console.log(message);
}