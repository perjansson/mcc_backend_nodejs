var fs = require('fs');
var logger = require('./logger.js');

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

// Load conversion rates locally from conversion_rates.json
var conversionRates;
fs.readFile('./config/conversion_rates.json', 'utf8', function (err, data) {
    if (err) {
        console.log('Error: ' + err);
        return;
    }

    conversionRates = JSON.parse(data);
    logger.log("Loaded conversion rates (e.g. SEK to BitCoin: " + getConversionRate('SEK') + ")");
});

exports.getConversionRate = getConversionRate;