var port = 1337;

//require('newrelic');
var async = require('async');
var http = require('http');
var app = http.createServer(initDbHandler);
var io = require('socket.io').listen(app);
var fs = require('fs');
var moment = require('moment');
var uuid = require('node-uuid');
var cradle = require('cradle');
var db = null;

var nconf = require('nconf');
nconf.argv().env().file({ file: 'config.json' });

io.set('log level', 1);
app.listen(port);

connectToCouchDb();

function initDbHandler(req, http_res) {
    http_res.writeHead(200, {'Content-Type': 'text/plain'});
    http_res.end('Node.js server up and running V-(*_*)z');
}

function connectToCouchDb() {
    if (db == null) {
        var dbHost = nconf.get('db_host');
        var dbUserName = nconf.get('db_username');
        var dbPassword = nconf.get('db_password');

        logMessage("Trying to connect to database host: " + dbHost);
        var connection = new (cradle.Connection)(dbHost, {
            auth: { username: dbUserName, password: dbPassword }
        });

        db = connection.database('mcc');

        logMessage('Successfully connected to couchdb');
    }
}

io.sockets.on('connection', function (socket) {

    socket.on('top list request', function () {
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
                var errorMessage = JSON.stringify(err);
                logMessage('Error saving meeting with id: ' + meeting.id + ' Error: ' + errorMessage);
                socket.emit('meeting update error', errorMessage);
            } else {
                logMessage('Success saving meeting with id: ' + meeting.id);
                socket.emit('meeting update response', meeting);
            }

        });
    });
});

function updateWithComparisonCurrency(meetings, socket) {
    var comparableCurrency = 'BTC';
    var updatedMeetings = [];

    async.forEach(meetings, function (meeting, callback) {
        meeting.comparableCurrency = comparableCurrency;

        var conversionRate = getConversionRate(meeting.currency);
        if (conversionRate) {
            meeting.comparableMeetingCost = roundToDecimals(meeting.meetingCost * conversionRate, 5);
            updatedMeetings.push(meeting);
        }
        callback();

    }, function (err) {
        logMessage('Find all meetings with name and meeting cost');
        socket.emit('top list update response', updatedMeetings);
    });
}

function roundToDecimals(value, noofDecimals) {
    return (Math.round(value * 100000) / 100000).toFixed(noofDecimals);
}

// Load conversion rates locally from conversion_rates.json
var conversionRates;
fs.readFile('conversion_rates.json', 'utf8', function (err, data) {
    if (err) {
        console.log('Error: ' + err);
        return;
    }

    conversionRates = JSON.parse(data);
    logMessage("Loaded conversion rates, e.g. SEK to BitCoin: " + getConversionRate("SEK"));
});

var getConversionRate = function (fromKey) {
    var conversionRateForFromKey = null;
    for (var i in conversionRates) {
        var conversionRate = conversionRates[i];
        if (conversionRate.fromKey == fromKey) {
            conversionRateForFromKey = conversionRate.rate;
            break;
        }
    }
    return conversionRateForFromKey;
};

function logMessage(message) {
    console.log('### ' + moment().format('MMMM Do YYYY, h:mm:ss a') + " " + message);
}
