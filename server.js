var port = 1337;

//require('newrelic');
var async = require('async');
var http = require('http');
var app = http.createServer(initDbHandler);
var io = require('socket.io').listen(app);
var uuid = require('node-uuid');
var cradle = require('cradle');
var nconf = require('nconf');
var logger = require('./libs/logger.js');
var currencyConversion = require('./libs/currencyconversion.js');
var numberutil = require('./libs/numberutil.js');
var db = null;

nconf.argv().env().file({ file: 'config.json' });

nconf.file('config.json');

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
        var dbName = nconf.get('db_name');

        logger.log("Trying to connect to database host: " + dbHost);
        var connection = new (cradle.Connection)(dbHost, {
            auth: { username: dbUserName, password: dbPassword }
        });

        db = connection.database(dbName);

        logger.log('Successfully connected to couchdb');
    }
}

io.sockets.on('connection', function (socket) {

    socket.on('top list request', function () {
        connectToCouchDb();

        db.view(nconf.get('db_view_top_list'), function (err, res) {
            var meetings = [];
            res.forEach(function (meeting) {
                meetings.push(meeting);
            });
            updateMeetingWithStuff(meetings, socket);
        });
    });

    socket.on('meeting update request', function (data) {
        connectToCouchDb();

        var meeting = JSON.parse(data);
        if (meeting.id == null || meeting.id == '') {
            meeting.id = uuid.v4();
            logger.log('Generated new id: ' + meeting.id);
        }

        db.save(meeting.id, meeting, function (err, res) {
            if (err) {
                var errorMessage = JSON.stringify(err);
                logger.log('Error saving meeting with id: ' + meeting.id + ' Error: ' + errorMessage);
                socket.emit('meeting update error', errorMessage);
            } else {
                logger.log('Success saving meeting with id: ' + meeting.id);
                socket.emit('meeting update response', meeting);
            }

        });
    });
});

function updateMeetingWithStuff(meetings, socket) {
    var updatedMeetings = [];

    async.forEach(meetings, function (meeting, callback) {
        meeting.comparableCurrency = nconf.get('comparable_currency');

        var conversionRate = currencyConversion.getConversionRate(meeting.currency);
        if (conversionRate) {
            var meetingCostInComparisionCurrency = meeting.meetingCost * conversionRate;
            meeting.comparableMeetingCost = numberutil.roundToDecimals(meetingCostInComparisionCurrency, 5);
            updatedMeetings.push(meeting);
        }

        meeting.duration = meeting.meetingCost / meeting.numberOfAttendees / meeting.averageHourlyRate * 3600;
        meeting.prettyDuration = getPrettyMeetingDuration(meeting);

        callback();

    }, function (err) {
        logger.log('Find all meetings with name and meeting cost');
        socket.emit('top list update response', updatedMeetings);
    });
}

function getPrettyMeetingDuration(meeting) {
    var prettyMeetingTime = null;
    var timeInHours = meeting.meetingCost / meeting.numberOfAttendees / meeting.averageHourlyRate;
    if (timeInHours >= 1) {
        var array = roundToDecimals(timeInHours, 2).toString().split('.');
        var hours = parseInt(array[0]);
        var minutes = parseInt(array[1]);
        prettyMeetingTime = hours + " h " + minutes + " min";
    } else if (timeInHours >= 0.01666666666667) {
        var minutes = timeInHours * 60;
        prettyMeetingTime = roundToDecimals(minutes, 0) + " min";
    } else {
        var seconds = timeInHours * 3600;
        prettyMeetingTime = roundToDecimals(seconds, 0) + " s";
    }
    return  prettyMeetingTime;
}

function roundToDecimals(value, numberOfDecimals) {
    return (Math.round(value * 100000) / 100000).toFixed(numberOfDecimals);
}