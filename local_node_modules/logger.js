var moment = require('moment');

exports.log = function (value) {
    console.log(moment().format('MMMM Do YYYY, h:mm:ss a') + ": " + value);
}