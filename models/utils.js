/*
 * Example usage: given:
 *  array = [ {'cat': 3, 'dog': 4}, {'cat': 13, 'dog': 14} ]
 *  key = 'dog'
 *  value = 14
 *  returns: true
 */
var arraySearchByKey = function(array, key, value) {
  for (obj in array) {
    if (obj[key] === value) {
      return true;
    }
  }
  return false;
};

module.exports = {
  arraySearchByKey: arraySearchByKey
};
