module.exports = {
  formatMetadata: (data) => {
    data = data.replace(/([\r\t])/g, "").split('\n'); // Removes Tabs and Carriage Returns, then splits by new line
    // Formats lines and removes curly braces from keys
    let results = '';
    data.forEach((x, index) => {
      if (index%2 !== 0) {
        results = results + x + '\n';
      } else {
        results = results +x.replace(/[{}]/g, "") + ' ';
      }
    });
    // Creates object
    let metadata = results.split("\n").reduce(function(obj, str, index) {
      let strParts = str.split(/:(.+)/);
      if (strParts[0] && strParts[1]) { // <-- Make sure the key & value are not undefined
        obj[strParts[0].replace(/\s+/g, '')] = strParts[1].trim(); // <-- Get rid of extra spaces at beginning of value strings
      }
      return obj;
    }, {});

    // Formats 'filename' and places into new key 'formatted_name'
    metadata.formatted_name = metadata.filename;
    metadata.formatted_name = metadata.formatted_name.replace(/\.[^/.]+$/, ""); // removes .mp4, .wav, .mp3, etc
    metadata.formatted_name = metadata.formatted_name.replace(/([`])/g, "\'"); // replaces any backquotes with a single quote
    return metadata;
  }
};
