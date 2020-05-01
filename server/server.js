const config = require('../config')
const WebSocket = require('ws')
const tmi = require('tmi.js')
const { moves333 } = require('consts')
const { Scrambow } = require('scrambow')

class TwitchSolvesServer {
	constructor() {
		this.scramble = new Scrambow().get(1)[0].scramble_string
		this.state = 'none'
		this.username = 'twitchsolvestwistypuzzles'
		this.token = config.token
		this.client = new tmi.client({
			connection: {
				secure: true,
				reconnect: true,
			},
			channels: [config.channel],
			identity: {
				username: this.username,
				password: this.token,
			},
		})
		this.ws = new WebSocket.Server({
			port: 8080,
			perMessageDeflate: {
				zlibDeflateOptions: {
					// See zlib defaults.
					chunkSize: 1024,
					memLevel: 7,
					level: 3,
				},
				zlibInflateOptions: {
					chunkSize: 10 * 1024,
				},
				// Other options settable:
				clientNoContextTakeover: true, // Defaults to negotiated value.
				serverNoContextTakeover: true, // Defaults to negotiated value.
				serverMaxWindowBits: 10, // Defaults to negotiated value.
				// Below options specified as default values.
				concurrencyLimit: 10, // Limits zlib concurrency for perf.
				threshold: 1024, // Size (in bytes) below which messages
				// should not be compressed.
			},
		})
		this.socket = null
		this.ws.on('connection', (socket) => {
			this.socket = socket
			console.log('CONNECTED')
			this.socket.on('message', this.handleMessage)
		})

		this.client.on('message', this.handleTwitchMessage)
		this.client.addListener('connected', function (address, port) {
			console.log('Connected! Waiting for messages..')
		})
		this.client.addListener('disconnected', function (reason) {
			console.log('Disconnected from the server! Reason: ' + reason)
		})
		this.handleTwitchMessage = this.handleTwitchMessage.bind(this)
		this.handleMessage = this.handleMessage.bind(this)
		this.move = this.move.bind(this)
		this.client.connect()
		console.log(`Connecting to /${config.channel}..`)
	}
	move = (message, family, amount, username) => {
		return {
			event: 'move',
			data: {
				latestMove: { family: family, amount: amount, type: 'blockMove' },
				timeStamp: Date.now(),
			},
			vote: { move: message, username: username },
		}
	}
	handleMessage = (message) => {
		const parsedMessage = JSON.parse(message)
		if (parsedMessage.event === 'state') {
			this.state = parsedMessage.data.newState
		}
	}
	handleTwitchMessage = (channel, tags, message, self) => {
		if ((self || tags.username === this.username) && this.socket !== null) {
			switch (message.toLowerCase()) {
				case '!start':
					this.socket.send(
						JSON.stringify({ event: 'START', scramble: this.scramble })
					)
					break
				case '!stop':
					this.socket.send(JSON.stringify({ event: 'STOP' }))
					this.client.disconnect()
					break
				case '!pause':
					this.socket.send(JSON.stringify({ event: 'PAUSE' }))
					break
				case '!reset':
					this.scramble = new Scrambow().get(1)[0].scramble_string
					this.socket.send(
						JSON.stringify({ event: 'RESET', scramble: this.scramble })
					)
					break
				case '!voting':
					this.socket.send(JSON.stringify({ event: 'VOTING' }))
					break
				case '!cooldown':
					this.socket.send(JSON.stringify({ event: 'COOLDOWN' }))
					break
			}
		}
		const moveInfo = moves333[message]
		if (moveInfo && this.state === 'VOTING') {
			console.log(`VOTING FOR ${message}`)
			const moveToPerform = JSON.stringify(
				this.move(message, moveInfo.family, moveInfo.amount, tags.username)
			)
			this.socket.send(moveToPerform)
		}
	}
}

new TwitchSolvesServer()
