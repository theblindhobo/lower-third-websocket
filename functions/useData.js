const { formatMetadata } = require('./formatMetadata.js');

module.exports = {
  useData: (data, ws) => {
    if(ws.readyState == 1) {
      if(data != 'NOT_PLAYING') {
        let metadata = formatMetadata(data); // formats to JSON
        console.log(`\x1b[36m%s\x1b[32m%s\x1b[0m`, `[LOWER THIRD]`, ` Now playing:`, metadata.filename);
        let vlcObj = {
          "event": "message",
          "action": "VLC",
          data: metadata
        };
        ws.send(JSON.stringify(vlcObj)); // added "event" as a key
        return vlcObj;
      } else if(data.trim() == 'NOT_PLAYING') {
        console.log(`\x1b[33m%s\x1b[0m`, `[READFILE]`, `VLC is not playing anything at the moment.`);
      }
    } else {
      // if refreshed multiple times, probably some dead sockets still lingering on
      console.log(`\x1b[35m%s\x1b[31m%s\x1b[0m`, `[WEBSOCKET]`, ` It appears you have some dead websockets lingering, try restarting websocket.js!`);
    }
  }
};
