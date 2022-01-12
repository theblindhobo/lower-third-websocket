const _line1 = document.getElementById('line1');
const _line2 = document.getElementById('line2');
const _ani = document.getElementById('animation-1');

const minInterval = 5; // Refresh animation every x minutes


function formatFileName(filename) {
  filename = filename.replace(/\.[^/.]+$/, ""); // removes .mp4, .wav, .mp3, etc
  filename = filename.replace(/([\\])/g, "\\\\"); // keeps backslashes in final output
  filename = filename.replace(/([`])/g, "\'"); // replaces any backquotes with a single quote
  filename = filename.replace(/(["'])/g, "\\$1"); // keeps any single or double quote in final output
  return filename;
}
function formatLines(filename) {
  let line1;
  let line2;
  if(filename.includes('_')) {
    let title = formatFileName(filename).split('_');
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
      line1 = `${formatFileName(filename).substring(0, 70)}`;
      line2 = ``;
    }
  } else {
    line1 = `${formatFileName(filename).substring(0, 70)}`;
    line2 = ``;
  }
  return {
    line1,
    line2
  };
}
function durationToSeconds(duration) {
  if(!duration.includes(":")) {
    console.log(`Error: duration isn't proper format.`);
    return undefined;
  } else {
    const arr = duration.split(":");
    if(arr.length == 3) { // 01:31:55
      const seconds = arr[0]*3600+arr[1]*60+(+arr[2]);
      return seconds;
    } else if(arr.length == 2) { // 29:15
      const seconds = arr[0]*60+(+arr[1]);
      return seconds;
    } else {
      console.log(`Error: duration either too long or not in proper format.`)
      return undefined;
    }
  }
}

function connect() {
  const ws = new WebSocket('ws://localhost:3124');

  ws.addEventListener('open', () => {
    console.log('We are connected.');
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

  ws.addEventListener('message', async function(event) {
    try {
      // Clears previous timers on new messages (videos)
      await clearAllTimeouts();
      timers = [];

      const data = JSON.parse(event.data);
      if(data.data == 'NOT_PLAYING') {
        console.log('VLC is not playing anything at the moment!');
      } else {
        let filename = data.data.filename;
        console.log(filename);

        let duration = data.data.duration;
        duration = durationToSeconds(duration); // in seconds

        var lines = formatLines(filename);
        _line1.innerText = lines.line1;
        _line2.innerText = lines.line2;

        if(duration == undefined) {
          console.log(`Error: duration isn't proper format.`);
        } else {
          let times = Math.floor((duration / 60) / minInterval); // How many times to run every x interval
          if(times == 0) {
            refreshElement();
          } else if(times > 0) {
            for(let i = 0; i <= times - 1; i++) {
              await addTimeouts(i);
            }
          }
        }

      }
    } catch(err) {
      console.log('Something went wrong: ', err);
    }
  });

  ws.addEventListener('close', function(event) {
    console.log('WS error: ', event);
    console.log(`Disconnected from WebSocket.. let's reconnect`);
    setTimeout(function () {
      connect();
    }, 10000);
  });
}

connect();
