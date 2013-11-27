var port = 1337;
var dollarToBitCoinConversionRate = 0.001425;

var async = require('async');
var http = require('http');
var app = http.createServer(initDbHandler)
    , io = require('socket.io').listen(app)
    , fs = require('fs')
    , moment = require('moment')
    , uuid = require('node-uuid')
    , nconf = require('nconf');

nconf.file('config.json');

io.set('log level', 1);

app.listen(port);

var db = null;

function initDbHandler(req, http_res) {
    http_res.writeHead(200, {'Content-Type': 'text/plain'});
    http_res.end('Node.js server up and running v-(*_*)z');
}

function connectToCouchDb() {
    if (db == null) {
        var cradle = require('cradle');
        var dbHost = nconf.get('db:host');
        var dbUserName = nconf.get('db:username');
        var dbPassword = nconf.get('db:password');
        logMessage("Trying to connect to dbhost: " + dbHost);
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
                logMessage('Error saving meeting with id: ' + meeting.id + ' Error: ' + err);
            } else {
                logMessage('Success saving meeting with id: ' + meeting.id);
            }

            socket.emit('meeting update response', meeting);
        });
    });
});

function updateWithComparisonCurrency(meetings, socket) {
    var comparableCurrency = 'BTC';
    var updatedMeetings = [];

    async.forEach(meetings, function (meeting, callback) {
        meeting.comparableCurrency = comparableCurrency;
        /*var options = {
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
         console.log("Error getting currency rate: " + e.message);
         callback();
         });*/

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

/****************/
connectToCouchDb();

/****************/
var conversionRates;
var file = 'conversion_rates.json';
fs.readFile(file, 'utf8', function (err, data) {
    if (err) {
        console.log('Error: ' + err);
        return;
    }

    conversionRates = JSON.parse(data);
    logMessage("Loaded conversion rates, e.g. USD to BitCoin: " + getConversionRate("USD"));
});

var getConversionRate = function (fromKey) {
    for (var i in conversionRates) {
        var conversionRate = conversionRates[i];
        if (conversionRate.fromKey == fromKey) {
            return conversionRate.rate;
        }
    }
};


/*var file = 'currencies.json';
 var conversionRates = [];

 fs.readFile(file, 'utf8', function (err, data) {
 if (err) {
 console.log('Error: ' + err);
 return;
 }

 currencies = JSON.parse(data);
 for (var i in currencies) {
 //for (var j in currencies) {
 var from = currencies[i].key;
 //var to = currencies[j].key;
 var to = "USD";
 retrieveConversionRateFromCloud(from, to, currencies.length);
 //}
 }
 });*/
var counter = 1;
var retrieveConversionRateFromCloud = function (from, to, noofCurrencies) {

    var options = {
        host: 'rate-exchange.appspot.com',
        port: 80,
        path: '/currency?from=' + from + '&to=' + to
    };

    http.get(options, function (res) {
        res.on("data", function (chunk) {
            counter++;
            var result = JSON.parse(chunk);
            if (result.rate) {
                var conversionRate = {};
                conversionRate.fromKey = from;
                conversionRate.toKey = "BTC";
                conversionRate.rate = result.rate * dollarToBitCoinConversionRate;
                conversionRates.push(conversionRate);
                var lastOne = counter == noofCurrencies;
                if (lastOne) {
                    console.log(JSON.stringify(conversionRates));
                }
            } else if (result.err) {
                //console.log("Eror getting currency rate from: " + from + " to: " + to);
            }
        });
    });
}

/****************/

function calculateComparableMeetingCost(meeting, rate) {
    return roundToDecimals(meeting.comparableMeetingCost = meeting.meetingCost * rate, 0);
}

function roundToDecimals(value, noofDecimals) {
    var rounded = (Math.round(value * 100000) / 100000).toFixed(noofDecimals);
    return rounded;
}

function logMessage(message) {
    console.log('### ' + moment().format('MMMM Do YYYY, h:mm:ss a') + " " + message);
}