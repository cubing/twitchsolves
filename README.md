# twitchsolves

Twitch Solves Twisty Puzzles

## Usage

Twitch Solves has 2 components, a client and a server. The client is available online [here](twitchsolves.netlify.app) and the server is available as a executable [here](https://github.com/cubing/twitchsolves/releases).

To use the server, you'll need to specify certain configurations in `config.json`

- twitchUsername: Username of the Bot/Account which will control the commands
- token: Oauth Token for the account, which can be generated from here: <https://id.twitch.tv/oauth2/authorize>
- channel: Username of the Twitch Channel you want twitch solves to work on

Now you can run the executable file and then navigate to <https://twitchsolves.netlify.app/?socketOrigin=ws:localhost:8080> and begin using the application.

## Twitch Usage

The following commands are available via the Twitch Chat

- !start puzzle mode: Start a session with the puzzle and mode provided. If no mode is provided, democracy will be used
  - Puzzle can be 333, pyram, 222. More puzzles will be available soon
  - mode can be either anarchy or democracy
- !stop: Disconnect from server
- !reset: Reset the session. Requires calling !start to start a new session
- !pause: Pause the session

## Development

Note: You need to add your own `config.json` inside `server/` file

### Run the server

`cd server && npm install && npm start`

### Run cubing.js

`cd client && npm install && npm run dev`

Navigate to <https://localhost:1234/?socketOrigin=ws:localhost:8080> You can also mention the voteInterval and cooldownInterval via the URL as a param
