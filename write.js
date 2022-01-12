var fs = require('fs');
const WebSocket = require('ws');
var wss = new WebSocket.Server({ port: 3124 }); // Server on ws://localhost:3124
console.log(`Websocket server has been setup at ws://localhost:3124`);

var vlcMetadata = process.env.APPDATA + '\\vlc\\np_metadata_full.txt';

function formatMetadata(data) {
  // Removes Tabs and Carriage Returns, then splits by new line
  data = data.replace(/([\r\t])/g, "").split('\n')

  // Formats lines and removes curly braces from keys
  let results = '';
  data.forEach((x, index) => {
    if (index%2 !== 0) {
      results = results + x + '\n';
    }
    else {
      results = results +x.replace(/[{}]/g, "") + ' ';
    }
  });

  // Creates object
  let metadata = results.split("\n").reduce(function(obj, str, index) {
    let strParts = str.split(/:(.+)/);
    if (strParts[0] && strParts[1]) { //<-- Make sure the key & value are not undefined
      obj[strParts[0].replace(/\s+/g, '')] = strParts[1].trim(); //<-- Get rid of extra spaces at beginning of value strings
    }
    return obj;
  }, {});

  return metadata;
}

let filename;
function readFile(init, ws) {
  const meta = fs.readFile(vlcMetadata, 'utf8', function(err, data) {
    if(err) {
      console.log(err);
    } else {
      if(data.trim() == 'NOT_PLAYING') {
        console.log('VLC is not playing anything at the moment.');
      } else {
        let metadata = formatMetadata(data); // formats to JSON
        if(init) {
          ws.send(JSON.stringify({data:metadata}));
          filename = metadata.filename;
        } else if(metadata.filename !== filename) {
          ws.send(JSON.stringify({data:metadata}));
          filename = metadata.filename;
        }
      }
    }
  });
}

wss.on('connection', ws => {
  console.log('New client connected!');

  readFile(true, ws);

  let fsWait = false;
  const watcher = fs.watch(vlcMetadata, 'utf8', (event, filename) => {
    if(filename && event == 'change') {

      setTimeout(() => {
        readFile(false, ws);
      }, 500);
    }
  });


  ws.on('close', () => {
    console.log('Client has disconnected.');
  });
});
