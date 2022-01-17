var fs = require('fs');
const WebSocket = require('ws');
var wss = new WebSocket.Server({ port: 3124 });
console.log(`\x1b[35m%s\x1b[0m`, `[WEBSOCKET]`, `Server has been initiated at ws://localhost:3124`);

var vlcMetadata = process.env.APPDATA + '\\vlc\\np_metadata_full.txt';


function formatMetadata(data) {
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


let filename; // to compare
let isPlaying = true;
function readFile(init, ws) {
  const meta = fs.readFile(vlcMetadata, 'utf8', function(err, data) {
    if(err) {
      console.log(`\x1b[31m%s\x1b[0m`, `[READFILE]`, err);
    } else {
      // logs filename to console but doesnt send to WebSocket
      // also doesnt display
      if(data != 'NOT_PLAYING') {
        isPlaying = true;
        let metadata = formatMetadata(data); // formats to JSON
        if(init || metadata.filename !== filename) {
          console.log(`\x1b[36m%s\x1b[32m%s\x1b[0m`, `[LOWER THIRD]`, ` Now playing:`, metadata.filename);
          filename = metadata.filename; // to compare
          let socket = (lowerThirdWebsocket !== undefined) ? lowerThirdWebsocket : ws;
          socket.send(JSON.stringify({ "event": "message", data:metadata })); // added "event" as a key

        }
      } else if(data.trim() == 'NOT_PLAYING') {
        if(isPlaying || init) {
          isPlaying = false;
          console.log(`\x1b[35m%s\x1b[0m`, `[WEBSOCKET]`, `VLC is not playing anything at the moment.`);
        }
      }
    }
  });
}


function heartbeat(ws) {
  ws.isAlive = true;
}

let lowerThirdWebsocket; // to send titles to;
wss.on('connection', ws => {
  console.log(`\x1b[35m%s\x1b[0m`, `[WEBSOCKET]`, `New client connected!`);
  ws.isAlive = true;


  let prevData; // check previous data every file change
  var fsTimeout; // timeout to slow down watch/read calls
  const watcher = fs.watch(vlcMetadata, 'utf8', (event, filename) => {
    if(filename && event == 'change') {
      if(!fsTimeout) {
        let data = fs.readFile(vlcMetadata, 'utf8', function(err, data) {
          if(err) {
            console.log(`\x1b[31m%s\x1b[0m`, `[READFILE]`, err);
          } else if(prevData !== data) {
            readFile(false, ws);
            prevData = data;
          }
        });
        fsTimeout = setTimeout(() => {
          fsTimeout = null;
        }, 500);
      }
    }
  });


  ws.on('message', data => {
    var data = JSON.parse(data);
    if(data.event === 'pong') {
      heartbeat(ws);
    }
    if(data.event === 'titles') {
      if(lowerThirdWebsocket !== undefined) {
        console.log(`\x1b[36m%s\x1b[32m%s\x1b[0m`, `[LOWER THIRD]`, ` Now playing:`, `LIVE: ${data.data.name}`);
        lowerThirdWebsocket.send(JSON.stringify({ "event": "titles", data:data.data }));
      }
    }
    if(data.event === 'init') {
      lowerThirdWebsocket = ws;
      readFile(true, ws);
    }
  });

  ws.on('close', ws => {
    ws.isAlive = false;
    console.log(`\x1b[35m%s\x1b[0m`, `[WEBSOCKET]`, `Client has disconnected: `, ws);
  });
});

const interval = setInterval(function ping() {
  wss.clients.forEach(function (ws) {
    if (ws.isAlive === false) {
      console.log(`\x1b[35m%s\x1b[0m`, `[WEBSOCKET]`, `Connection died: `, ws);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.send(JSON.stringify({ "event": "ping" }));
  });
}, 30000);

wss.on('close', function close() {
  clearInterval(interval);
});
