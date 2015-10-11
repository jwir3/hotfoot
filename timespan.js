module.exports.getTimeSpanInMs = getTimeSpanInMs;

function getTimeSpanInMs(aTimeSpanString) {
  aTimeSpanString = aTimeSpanString.toLowerCase().replace(/\W/g, '');
  var numericPart = aTimeSpanString.replace(/\D/g, '');
  var unit = aTimeSpanString.replace(/\d/g, '');

  var multiplier = 1;
  switch(unit) {
    case 'ms':
      break;;

    case 's':
      multiplier = 1000;
      break;

    case 'm':
      multiplier = 1000 * 60;
      break;

    case 'h':
      multiplier = 1000 * 60 * 60;
      break;

    case 'd':
      multiplier = 1000 * 60 * 60 * 24;
  }

  return numericPart * multiplier;
}
