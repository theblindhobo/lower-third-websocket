## Lower Thirds for OBS

*Parses metadata from log file created by VLC extension, then updates Lower Third and automatically displays on OBS Browser Source*

Logger: [VLC extension](https://addons.videolan.org/p/1172613)

Lower Thirds code borrowed from [vjccruz](https://github.com/vjccruz/lower-thirds-obs)

---
**Setup:**
1.  Download repo
2.  Open terminal in folder
3.  run `npm init -y` to initialize
4.  run `npm i ws` to install the websocket module needed
5.  Websocket port is automatically set to **3124**, if you're wanting to change this port.. you must do so within the **websocket.js** file on lines 3 & 4 and within the **lower.js** file on line 69.
6.  You may also need to change the directory that the log file is in. It's defaulted to `%APPDATA%\vlc\np_metadata_full.txt`. You can find this line in the **websocket.js** file on line 6.

---
**Running:**
1.  Open a terminal in this folder
2.  Run process `node websocket.js`
3.  Leave this process running so websocket server stays alive
4.  When VLC log file gets updated, it will update the Lower Thirds in the HTML file
