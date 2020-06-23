import WebSocket from 'ws'
import tmi from 'tmi.js'
import { puzzles, Puzzle } from './consts'
import { Scrambow } from 'scrambow'
import { twitchUsername, token, channel } from './config.js'

class TwitchSolvesServer {
	private scramble: string = ''
	state: string = 'none' // TODO: Change this to oneof later
	private username: string = twitchUsername
	private token: string = token
	private client: null | tmi.Client = null
	private ws: null | WebSocket.Server = null
	private socket: null | WebSocket = null
	private puzzle: null | Puzzle = null
	private mode: string = 'democracy'
	constructor() {
		this.scramble = new Scrambow().get(1)[0].scramble_string
		this.client = new (tmi.client as any)({
			connection: {
				secure: true,
				reconnect: true,
			},
			channels: [channel],
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
		if (this.client) {
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
			console.log(`Connecting to /${channel}..`)
		}
	}
	move = (
		message: string,
		family: string,
		amount: number,
		username: string
	) => {
		return {
			event: 'move',
			data: {
				latestMove: { family: family, amount: amount, type: 'blockMove' },
				timeStamp: Date.now(),
			},
			vote: { move: message, username: username },
		}
	}
	handleMessage = (message: string) => {
		const parsedMessage = JSON.parse(message)
		if (parsedMessage.event === 'state') {
			this.state = parsedMessage.data.newState
		}
	}
	handleTwitchMessage = (
		channel: string,
		tags: tmi.ChatUserstate,
		message: string,
		self: boolean
	) => {
		if (
			(self || tags.username === this.username) &&
			this.socket !== null &&
			this.client !== null
		) {
			const command = message.toLowerCase().split(' ')[0]
			const args = message.toLowerCase().split(' ').slice(1)
			switch (command) {
				case '!start':
					const puzzle = puzzles.find((puzzle) => puzzle.id === args[0])
					if (!puzzle) {
						console.error('Invalid Scramble Type')
					} else {
						if (args[1]) {
							this.mode = args[1]
						}
						this.puzzle = puzzle
						this.scramble = new Scrambow()
							.setType(puzzle.id)
							.get()[0].scramble_string
						this.socket.send(
							JSON.stringify({
								event: 'START',
								scramble: this.scramble,
								puzzleId: this.puzzle.name,
								mode: this.mode,
							})
						)
					}
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
		const moveInfo = this.puzzle?.moves.find((move) => move.value === message)
		if (this.socket && moveInfo && this.state === 'VOTING') {
			console.log(`VOTING FOR ${message}`)
			const moveToPerform = JSON.stringify(
				this.move(
					message,
					moveInfo.family,
					moveInfo.amount,
					tags.username || ''
				)
			)
			this.socket.send(moveToPerform)
		}
	}
}

new TwitchSolvesServer()
