var port = 1337;

var async = require('async');
var http = require('http');
var app = http.createServer(initDbHandler)
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
      res.forEach(function (meeting) {
        meetings.push(meeting);
      });
      updateWithComparisonCurrency(meetings, socket);
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
        logMessage('Error saving meeting with id: ' + meeting.id + ' Error: ' + err);
      } else {
        logMessage('Success saving meeting with id: ' + meeting.id);
      }

      socket.emit('meeting update response', meeting);
    });
  });
});

function updateWithComparisonCurrency(meetings, socket) {
  var comparableCurrency = 'USD';
  var updatedMeetings = [];

  var counter = 1;
  async.forEach(meetings, function (meeting, callback) { 
    meeting.comparableCurrency = comparableCurrency;
    var options = {
      host: 'rate-exchange.appspot.com',
      port: 80,
      path: '/currency?from=' + meeting.currency + '&to='+ comparableCurrency
    };

    http.get(options, function(res) {
      res.on("data", function(chunk) {
        var currencyRate = JSON.parse(chunk);
        if (currencyRate.rate) {
          meeting.comparableMeetingCost = calculateComparableMeetingCost(meeting, currencyRate.rate);
          console.log("Success getting currency rate and calculated comparable meeting cost: " + meeting.comparableMeetingCost + " (" + meeting.meetingCost + ")");
          updatedMeetings.push(meeting);
        }
        callback();
      });
    }).on('error', function(e) {
      console.log("Eror getting currency rate: " + e.message);
      callback(); 
    });

  }, function(err) {
    logMessage('Find all meetings with name and meeting cost');
    socket.emit('top list update response', updatedMeetings);
  });
}

function calculateComparableMeetingCost(meeting, rate) {
  return roundToZeroDecimals(meeting.comparableMeetingCost = meeting.meetingCost * rate);
}

function roundToZeroDecimals(value) {
    return Math.round(value).toFixed(0);
}

function logMessage(message) {
  console.log('### ' + moment().format('MMMM Do YYYY, h:mm:ss a')); 
  console.log(message);
}