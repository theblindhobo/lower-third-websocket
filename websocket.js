var fs = require('fs');
const WebSocket = require('ws');
var wss = new WebSocket.Server({ port: 3124 });
console.log(`Websocket server has been setup at ws://localhost:3124`);

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
let notPlaying = false;
function readFile(init, ws) {
  const meta = fs.readFile(vlcMetadata, 'utf8', function(err, data) {
    if(err) {
      console.log(err);
    } else {
      if(data != 'NOT_PLAYING') {
        notPlaying = false;
        let metadata = formatMetadata(data); // formats to JSON
        if(init || metadata.filename !== filename) {
          ws.send(JSON.stringify({ "event": "message", data:metadata })); // added "event" as a key
          filename = metadata.filename; // to compare
        }
      } else if(data.trim() == 'NOT_PLAYING') {
        if(!notPlaying || init) {
          notPlaying = true;
          console.log('VLC is not playing anything at the moment.');
        }
      }
    }
  });
}

function heartbeat(ws) {
  ws.isAlive = true;
}

wss.on('connection', ws => {
  console.log('New client connected!');
  ws.isAlive = true;

  readFile(true, ws);

  let fsWait = false;
  const watcher = fs.watch(vlcMetadata, 'utf8', (event, filename) => {
    if(filename && event == 'change') {
      setTimeout(() => {
        readFile(false, ws);
      }, 500);
    }
  });

  ws.on('message', data => {
    var data = JSON.parse(data);
    if(data === 'pong') {
      heartbeat(ws);
    }
  });

  ws.on('close', ws => {
    ws.isAlive = false;
    console.log(`Client has disconnected: `, ws);
  });
});

const interval = setInterval(function ping() {
  wss.clients.forEach(function (ws) {
    if (ws.isAlive === false) {
      console.log(`Connection died: `, ws);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.send(JSON.stringify({ "event": "ping" }));
  });
}, 30000);

wss.on('close', function close() {
  clearInterval(interval);
});
