var async = require('async');
var nconf = require('nconf');
var currencyConversion = require('./currencyconversion.js');
var numberutil = require('./numberutil.js');
var logger = require('./logger.js');

nconf.file('./config/config.json');

exports.updateMeetingWithStuff = function (meetings, callback) {
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
        logger.log('top list update response');
        callback(updatedMeetings);
    });
}

function getPrettyMeetingDuration(meeting) {
    var prettyMeetingTime = null;
    var timeInHours = meeting.meetingCost / meeting.numberOfAttendees / meeting.averageHourlyRate;
    var hours, minutes, seconds = null;
    if (timeInHours >= 1) {
        var array = numberutil.roundToDecimals(timeInHours, 2).toString().split('.');
        hours = parseInt(array[0]);
        minutes = parseInt(array[1]);
        prettyMeetingTime = hours + " h " + minutes + " min";
    } else if (timeInHours >= 0.01666666666667) {
        minutes = timeInHours * 60;
        prettyMeetingTime = numberutil.roundToDecimals(minutes, 0) + " min";
    } else {
        seconds = timeInHours * 3600;
        prettyMeetingTime = numberutil.roundToDecimals(seconds, 0) + " s";
    }
    return prettyMeetingTime;
}