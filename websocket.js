var fs = require('fs');
const WebSocket = require('ws');
var wss = new WebSocket.Server({ port: 3124 });
console.log(`\x1b[35m%s\x1b[0m`, `[WEBSOCKET]`, `Server has been initiated at ws://localhost:3124`);

var vlcMetadata = process.env.APPDATA + '\\vlc\\np_metadata_full.txt';

const { formatMetadata } = require('./functions/formatMetadata.js');
const { useData } = require('./functions/useData.js');


function heartbeat(ws) {
  ws.isAlive = true;
}

let cooldown = false;
let lowerThirdWebsocket; // to send titles to;

let prevObj; // stores every new outgoing data object

let watchers = [];
let watcherID = 0;


wss.on('connection', ws => {
  console.log(`\x1b[35m%s\x1b[0m`, `[WEBSOCKET]`, `New client connected!`);
  ws.isAlive = true;

  ws.on('message', data => {
    var data = JSON.parse(data);
    if(data.event === 'pong') {
      heartbeat(ws);
    }

    if(data.event === 'init') {
      lowerThirdWebsocket = ws;


      if(data.hasOwnProperty('prevEvent')) {
        data.event = data.prevEvent;
        delete data.prevEvent;
        prevObj = data;
        // send previous Object
        ws.send(JSON.stringify(data));
      } else if(prevObj != undefined){
        ws.send(JSON.stringify(prevObj));
      }

      // watcher function
      let prevData;
      let thisWatcherID = watcherID;
      let listener = {};
      listener.id = watcherID;
      listener.watcher = (curr, prev) => {
        if(curr.mtime.getTime() != prev.mtime.getTime()) {
          fs.readFile(vlcMetadata, 'utf8', function(err, data) {
            if(err) {
              console.log(`\x1b[33m%s\x1b[0m`, `[READFILE]`, err);
            } else  {
              if(data != undefined && (data.substring(0,3) == '{al' || data.substring(0,3) == 'NOT')) { // checks to see if VLC Log has metadata or NOT_PLAYING, otherwise ignore
                if(prevData != data) {
                  prevData = data;
                  // check cooldown
                  if(cooldown == false) {
                    // send data to websocket
                    let vlcObj = useData(data, lowerThirdWebsocket);
                    if(vlcObj !== undefined) {
                      prevObj = vlcObj; // stores every new outgoing data object
                    }
                  } else {
                    console.log(`\x1b[33m%s\x1b[0m`, `[READFILE]`, `VLC titles are currently on a cooldown to let other titles run.`);
                    console.log(`\x1b[33m%s\x1b[0m`, `[READFILE]`, `If this is an error, please contact theblindhobo.`);
                  }
                } else {
                  // same data, ignore
                }
              } else {
                console.log(`\x1b[33m%s\x1b[0m`, `[READFILE]`, `Error caught: Data is undefined.`);
              }
            }
          });
        }
    }
      // listens on new watcher
      fs.watchFile(vlcMetadata, {
          bigint: false,
          presistent: true
        }, listener.watcher);
      watchers.push(listener);
      watcherID++;
      // stops previous watcher
      var i = watchers.length;
      while(i--) {
        if(watchers[i].id !== thisWatcherID) {
          fs.unwatchFile(vlcMetadata, watchers[i].watcher);
          watchers.splice(i, 1);
        }
      }

    } else if(data.event === 'titles') {
      if(data.data.action === 'LIVE' || data.data.action === 'VOD' || data.data.action === 'DISPLAY') {
        cooldown = true;
        setTimeout(() => {
          cooldown = false;
        }, 20000);

        let titleObj = {
          "event": "titles",
          "action": data.data.action,
          data: data.data
        };
        let terminalAction;
        let terminalName;
        switch (data.data.action) {
          case 'LIVE':
            terminalAction = `${data.data.action}: ${data.data.source}`;
            terminalName = `\n\t\tLine1: ${data.data.line1} \n\t\tLine2: ${data.data.line2}\n`
            break;
          case 'VOD':
            terminalAction = `${data.data.action}: ${data.data.source}`;
            terminalName = `\n\t\tLine1: ${data.data.line1} \n\t\tLine2: ${data.data.line2}\n`
            break;
          case 'DISPLAY':
            terminalAction = `QUICK ${data.data.action}`;
            terminalName = `\n\t\tLine1: ${data.data.line1} \n\t\tLine2: ${data.data.line2}\n`;
            break;
          default:
            terminalName = data.data.name;
        }

        if(lowerThirdWebsocket !== undefined && lowerThirdWebsocket.readyState == 1) {
          console.log(`\x1b[36m%s\x1b[32m%s\x1b[0m`, `[LOWER THIRD]`, ` Now playing:`, `${terminalAction} ${terminalName}`);
          prevObj = titleObj;
          lowerThirdWebsocket.send(JSON.stringify(titleObj));
        } else {
          console.log(`\x1b[35m%s\x1b[33m%s\x1b[0m`, `[WEBSOCKET]`, ` NOTICE: Connection to Browser is not open. WebSocket stored title.`, `\n\t\t${terminalAction} ${terminalName}`);
          prevObj = titleObj;
        }
      }
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
