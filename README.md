# twitchsolves

Twitch Solves Twisty Puzzles

## How to run

Note: You need to add your own config.js file, exporting the following:

```js

module.exports = {
twitchUsername // Username of the Bot/Account which will control the commands,
token // Oauth Token for the account, which can be generated from here: https://id.twitch.tv/oauth2/authorize,
channel // Username of the Twitch Channel you want twitch solves to work on. Multiple channels are currently not supported, though there are plans for that,
}

```

### Run the server

`js cd server && npm install && npm start`

### Run cubing.js

`js cd client && npm install && npm run dev`

Navigate to <https://localhost:1234/?socketOrigin=ws:localhost:8080> You can also mention the voteInterval and cooldownInterval via the URL as a param

## Twitch Usage

The following commands are available via the Twitch Chat

- !start puzzle mode: Start a session with the puzzle and mode provided. If no mode is provided, democracy will be used
  - Puzzle can be 333, pyram, 222. More puzzles will be available soon
  - mode can be either anarchy or democracy
- !stop: Disconnect from server
- !reset: Reset the session. Requires calling !start to start a new session
- !pause: Pause the session
