var fs = require('fs');
const { formatMetadata } = require('./formatMetadata.js');

const dotenv = require('dotenv');
dotenv.config();
const title1 = process.env.TITLE1;

function nowDemoscene() {
  const d = new Date(Date.now()).toLocaleDateString('en-US',
    {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }
  ).replace(',','').split(' ');
  let dT = `NOW: Demoscene | ${d[1]} ${d[0]} ${d[2]}`;
  return dT;
}

module.exports = {
  useData: async (data, ws) => {
    if(ws.readyState == 1) {
      if(data != 'NOT_PLAYING') {
        let metadata = await formatMetadata(data); // formats to JSON
        console.log(`\x1b[36m%s\x1b[32m%s\x1b[0m`, `[LOWER THIRD]`, ` Now playing:`, metadata.filename);
        try{
          // write NOW: Demoscene to title1.txt file in Scheduler app
          fs.writeFileSync(title1, nowDemoscene());
        } catch(err) {
          console.log(`\x1b[33m%s\x1b[0m`, `[WRITEFILE]`, `Could not write to title1.txt file.`);
        }
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
