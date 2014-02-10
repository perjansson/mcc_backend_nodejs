var roundToDecimals = function (value, numberOfDecimals) {
    return (Math.round(value * 100000) / 100000).toFixed(numberOfDecimals);
}

exports.roundToDecimals = roundToDecimals;