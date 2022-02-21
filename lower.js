const _slash = document.getElementById('slash');
const _line1 = document.getElementById('line1');
const _line2 = document.getElementById('line2');
const _ani = document.getElementById('animation-1');

const PORT_NUMBER = '3124';

const slash = '!';

const minInterval = 5; // Refresh animation every x minutes
const titleDelayInSecs = 5; // The delay before LIVE, VOD, DISPLAY titles appear
const websocketReconnectDelayInSecs = 10; // The delay before WebSocket attempts to reconnect

const removeCooldownTimeoutInSecs = 20; // Removes the cooldown set when VOD, DISPLAY titles appear
                                        // Because usually VLC will send a new message when file changes


function formatLines(filename) {
  let line1;
  let line2;
  if(filename.includes('_')) {
    let title = filename.split('_');
    if(title.length == 4) {
      line1 = `${title[2].substring(0, 33)} by ${title[1].substring(0, 33)}`; // Title by Group
      line1 = `${line1.substring(0,70)}`;
      if(title[3] == '') {
        line2 = `${title[0].substring(0,70)}`; // Year, without the | separator
      } else {
        line2 = `${title[0].substring(0, 33)} | ${title[3].substring(0, 33)}`; // Year | Platform
        line2 = `${line2.substring(0,70)}`;
      }
    } else if(title.length == 3) {
      line1 = `${title[2].substring(0, 33)} by ${title[1].substring(0, 33)}`; // Title by Group
      line1 = `${line1.substring(0,70)}`;
      line2 = `${title[0].substring(0,70)}`; // Year, without the | separator
    } else if(title.length == 2) {
      line1 = `${title.slice(1).join(' - ').substring(0, 70)}`;
      line2 = `${title.shift().substring(0,70)}`; // Year
    } else {
      line1 = `${filename.substring(0, 70)}`;
      line2 = ``;
    }
  } else {
    line1 = `${filename.substring(0, 70)}`;
    line2 = ``;
  }
  return {
    line1,
    line2
  };
}
function durationToSeconds(duration) {
  if(!duration.includes(":")) {
    console.log(`\x1b[36m%s\x1b[0m`, `[LOWER THIRD]`, `Error: duration isn't proper format.`);
    return 0;
  } else {
    const arr = duration.split(":");
    if(arr.length == 3) { // 01:31:55
      const seconds = arr[0]*3600+arr[1]*60+(+arr[2]);
      return seconds;
    } else if(arr.length == 2) { // 29:15
      const seconds = arr[0]*60+(+arr[1]);
      return seconds;
    } else {
      console.log(`\x1b[36m%s\x1b[0m`, `[LOWER THIRD]`, `Error: duration either too long or not in proper format.`)
      return 0;
    }
  }
}

let prevObj; // stores every new incoming data object


function connect() {
  const ws = new WebSocket(`ws://localhost:${PORT_NUMBER}`);

  ws.addEventListener('open', () => {
    console.log(`\x1b[35m%s\x1b[0m`, `[WEBSOCKET]`, 'We are connected.');
    if(prevObj !== undefined) {
      prevObj.prevEvent = prevObj.event;
      prevObj.event = 'init';
      ws.send(JSON.stringify(prevObj));
    } else {
      ws.send(JSON.stringify({ "event": "init" }));
    }

  });

  let timers = [];
  function clearAllTimeouts() {
    const arr = timers;
    let len = timers.length;
    while(len > 0) {
      const id = arr[len - 1];
      clearTimeout(id);
      len--;
    }
  }
  function addTimeouts(i) {
    const id = setTimeout(() => {
      refreshElement();
    }, i * minInterval * 60 * 1000);
    timers.push(id);
  }

  function refreshElement() {
    _ani.parentNode.replaceChild(_ani, _ani); // Replaces current element with new updated element
  }

  function heartbeat(ws) {
    clearTimeout(ws.pingTimeout);
    ws.pingTimeout = setTimeout(() => {
      ws.close(1000, 'Terminated');
    }, 30000 + 1000);
  }


  ws.addEventListener('message', async function(event) {
    const data = JSON.parse(event.data);
    if(data.event !== 'ping') prevObj = data; // stores every new incoming data object

    if(data.action === 'VOD' || data.action === 'LIVE' || data.action === 'DISPLAY') {
      // previously had put cooldown here, but is handled within websocket.js
    }

    if(data.event === 'ping') {
      heartbeat(ws);
      ws.send(JSON.stringify({ "event": "pong" }));
    }
    if(data.event === 'message') {
      try {
        // Clears previous timers on new messages (videos)
        await clearAllTimeouts();
        timers = [];

        let filename = data.data.formatted_name;
        console.log(`\x1b[36m%s\x1b[32m%s\x1b[0m`, `[LOWER THIRD]`, ` Now playing:`, filename);

        let duration = data.data.duration;
        duration = durationToSeconds(duration); // in seconds

        var lines = formatLines(filename);
        _slash.innerText = slash;
        _line1.innerText = lines.line1;
        _line2.innerText = lines.line2;

        // How many times to run every x interval
        let times = Math.floor((duration / 60) / minInterval);

        if(times <= 1) {
          refreshElement();
        } else if(times > 1) {
          for(let i = 0; i <= times - 1; i++) {
            await addTimeouts(i);
          }
        }

      } catch(err) {
        console.log(`\x1b[36m%s\x1b[0m`, `[LOWER THIRD]`, 'Something went wrong: ', err);
      }
    }
    if(data.event === 'titles') {
      // Clears previous timers on new messages (videos)
      await clearAllTimeouts();
      timers = [];

      console.log(`\x1b[36m%s\x1b[32m%s\x1b[0m`, `[LOWER THIRD]`, ` Now playing:`, `${data.action}: ${data.data.name}`);

      // update titles in 5s
      setTimeout(() => {
        _slash.innerText = slash;
        _line1.innerText = data.data.line1;
        _line2.innerText = data.data.line2;

        // run titles every 5 mins unless VLC playlist starts
        function runRefreshEveryFive() {
          refreshElement();
          let namedTimer = setTimeout(() => {
            runRefreshEveryFive();
          }, minInterval * 60 * 1000);
          timers.push(namedTimer);
        }
        runRefreshEveryFive();
      }, titleDelayInSecs * 1000);


    }
  });

  ws.addEventListener('close', function(event) {
    clearTimeout(ws.pingTimeout);
    console.log(`\x1b[35m%s\x1b[0m`, `[WEBSOCKET]`, `Error:`, event, `Disconnected from WebSocket.. reconnecting..`);
    setTimeout(function () {
      connect(); // Reconnect
    }, websocketReconnectDelayInSecs * 1000);
  });
}

connect();
