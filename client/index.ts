import { Twisty } from 'cubing/twisty'
import {
	ProxyEvent,
	WebSocketProxyReceiver,
	WebSocketProxySender,
} from 'cubing/stream'
import { Puzzles } from 'cubing/kpuzzle'
import { BlockMove, Sequence } from 'cubing/alg'
import { MoveEvent } from 'cubing/dist/esm/src/bluetooth'

class TwitchSolverProxySender extends WebSocketProxySender {
	sendStateEvent(newState: string): void {
		this.websocket.send(
			JSON.stringify({ event: 'state', data: { newState: newState } })
		)
	}
}

class CallbackProxyReceiver extends WebSocketProxyReceiver {
	constructor(url: string, private callback: (e: MoveEvent) => void) {
		super(url)
	}

	onProxyEvent(e: MoveEvent): void {
		this.callback(e)
	}
}

class TwistySolvesPuzzles {
	public proxyReceiver: WebSocketProxyReceiver
	public proxySender: TwitchSolverProxySender
	private twisty: Twisty
	public votes: { move: string; username: string }[] = []
	public moves: BlockMove[] = []
	public VOTE_INTERVAL = parseInt(
		new URL(location.href).searchParams.get('voteInterval') || '10'
	)
	public COOLDOWN_INTERVAL = parseInt(
		new URL(location.href).searchParams.get('cooldownInterval') || '10'
	)
	public MAX_MESSAGES = 9
	public state: string = 'none'
	private countdown: any
	private voteTally: any = {}
	public scramble: { sequence: Sequence; scrambleString: string } = {
		sequence: new Sequence([]),
		scrambleString: '',
	}
	public moves333 = (move: string) => {
		switch (move) {
			case 'R':
				return { family: 'R', amount: 1 }
			case "R'":
				return { family: 'R', amount: -1 }
			case 'R2':
				return { family: 'R', amount: 2 }
			case 'L':
				return { family: 'L', amount: 1 }
			case "L'":
				return { family: 'L', amount: -1 }
			case 'L2':
				return { family: 'L', amount: 2 }
			case 'U':
				return { family: 'U', amount: 1 }
			case "U'":
				return { family: 'U', amount: -1 }
			case 'U2':
				return { family: 'U', amount: 2 }
			case 'D':
				return { family: 'D', amount: 1 }
			case "D'":
				return { family: 'D', amount: -1 }
			case 'D2':
				return { family: 'D', amount: 2 }
			case 'F':
				return { family: 'F', amount: 1 }
			case "F'":
				return { family: 'F', amount: -1 }
			case 'F2':
				return { family: 'F', amount: 2 }
			case 'B':
				return { family: 'B', amount: 1 }
			case "B'":
				return { family: 'B', amount: -1 }
			case 'B2':
				return { family: 'B', amount: 2 }
			case 'u':
				return { family: 'u', amount: 1 }
			case "u'":
				return { family: 'u', amount: -1 }
			case 'u2':
				return { family: 'u', amount: 2 }
			case 'd':
				return { family: 'd', amount: 1 }
			case "d'":
				return { family: 'd', amount: -1 }
			case 'd2':
				return { family: 'd', amount: 2 }
			case 'f':
				return { family: 'f', amount: 1 }
			case "f'":
				return { family: 'f', amount: -1 }
			case 'f2':
				return { family: 'f', amount: 2 }
			case 'b':
				return { family: 'b', amount: 1 }
			case "b'":
				return { family: 'b', amount: -1 }
			case 'b2':
				return { family: 'b', amount: 2 }
			case 'r':
				return { family: 'r', amount: 1 }
			case "r'":
				return { family: 'r', amount: -1 }
			case 'r2':
				return { family: 'r', amount: 2 }
			case 'l':
				return { family: 'l', amount: 1 }
			case "l'":
				return { family: 'l', amount: -1 }
			case 'l2':
				return { family: 'l', amount: 2 }
			case 'y':
				return { family: 'y', amount: 1 }
			case "y'":
				return { family: 'y', amount: -1 }
			case 'y2':
				return { family: 'y', amount: 2 }
			case 'z':
				return { family: 'z', amount: 1 }
			case "z'":
				return { family: 'z', amount: -1 }
			case 'z2':
				return { family: 'z', amount: 2 }
			case 'x':
				return { family: 'x', amount: 1 }
			case "x'":
				return { family: 'x', amount: -1 }
			case 'x2':
				return { family: 'x', amount: 2 }
			case 'M':
				return { family: 'M', amount: 1 }
			case "M'":
				return { family: 'M', amount: -1 }
			case 'M2':
				return { family: 'M', amount: 2 }
			case 'S':
				return { family: 'S', amount: 1 }
			case "S'":
				return { family: 'S', amount: -1 }
			case 'S2':
				return { family: 'S', amount: 2 }
			case 'E':
				return { family: 'E', amount: 1 }
			case "E'":
				return { family: 'E', amount: -1 }
			case 'E2':
				return { family: 'E', amount: 2 }
			default:
				return { family: 'R', amount: 1 }
		}
	}
	public mode: string = 'democracy'

	constructor() {
		this.proxySender = new TwitchSolverProxySender(
			this.proxyURL('/register-sender')
		)
		this.proxyReceiver = new CallbackProxyReceiver(
			this.proxyURL('/register-receiver'),
			this.onMove.bind(this)
		)
		this.handleReset()
		this.changeState = this.changeState.bind(this)
		this.startCountDown = this.startCountDown.bind(this)
	}

	public changeState = (newState: string) => {
		console.log(newState)
		this.proxySender.sendStateEvent(newState)
		this.state = newState
		if (newState === 'COOLDOWN') {
			this.performMove()
		}
		if (newState === 'VOTING' || newState === 'COOLDOWN') {
			const timeleft =
				newState === 'VOTING' ? this.VOTE_INTERVAL : this.COOLDOWN_INTERVAL
			;(document.getElementById(
				'progress-bar'
			) as HTMLInputElement).value = timeleft.toString()
			document.getElementById('progress-header')!.innerHTML = this.state
			;(document.getElementById(
				'progress-bar'
			) as HTMLInputElement).max = timeleft.toString()
			this.startCountDown(timeleft, 1000, this.changeState)
		} else {
			clearTimeout(this.countdown)
			document.getElementById('progress-header')!.innerHTML = this.state
			switch (newState) {
				case 'STOP':
					break
				case 'RESET':
					this.handleReset()
					this.performScramble()
				case 'PAUSE':
					break
			}
		}
	}

	private proxyURL(pathname: string): string {
		const socketOrigin = new URL(location.href).searchParams.get('socketOrigin')
		const url = new URL(socketOrigin)
		url.pathname = pathname
		return url.toString()
	}

	private newTwisty = (puzzle: string) => {
		console.log(puzzle)
		this.twisty = new Twisty(document.querySelector('#target-twisty')!, {
			alg: new Sequence([]),
			puzzle: Puzzles[puzzle],
			playerConfig: {
				visualizationFormat: '3D',
				experimentalShowControls: false,
				experimentalCube3DViewConfig: {
					experimentalShowBackView: true,
				},
			},
		})
	}

	private performMove = () => {
		if (Object.keys(this.voteTally).length > 0) {
			// move with highest vote
			let move: string
			let moveToApply: BlockMove
			if (this.mode === 'democracy') {
				move = Object.keys(this.voteTally).reduce((a, b) =>
					this.voteTally[a] > this.voteTally[b] ? a : b
				)
				const moveInfo = this.moves333(move)
				moveToApply = new BlockMove(
					undefined,
					undefined,
					moveInfo.family,
					moveInfo.amount
				)
			} else {
				move = this.votes.slice(-1)[0].move
				const moveInfo = this.moves333(move)
				moveToApply = new BlockMove(
					undefined,
					undefined,
					moveInfo.family,
					moveInfo.amount
				)
			}
			// perform move
			this.twisty.experimentalAddMove(moveToApply)
			this.moves.push(moveToApply)
			document.getElementById(
				'total-moves'
			)!.innerText = `${this.moves.length} Moves`
			// remove prior messages
			let elements = document.getElementsByClassName('message-box-item')
			for (let i = 0; i < elements.length; i++) {
				elements.item(i)?.remove()
			}
			// send move applied
			const li = document.createElement('li')
			li.classList.add('message-box-item')
			li.classList.add('message')
			li.innerHTML = `<b>${move}</b> was just applied to the puzzle!`
			const messageList = document.getElementById('message-box-list')
			messageList?.appendChild(li)
			this.voteTally = {}
			this.votes = []
		}
	}
	private handleReset = () => {
		this.voteTally = {}
		this.moves = []
		let elements = document.getElementsByClassName('message-box-item')
		for (let i = 0; i < elements.length; i++) {
			elements.item(i)?.remove()
		}
	}
	private startCountDown(i: number, p: number, f: (state: string) => void) {
		// I really don't know how to do typscript types for this
		var pause = p
		var fn = f
		var countDownObj = document.getElementById(
			'progress-bar'
		) as HTMLInputElement

		countDownObj.count = (i: number) => {
			//  write out count
			countDownObj.value = i.toString()
			if (i == 0) {
				if (this.countdown) {
					clearTimeout(this.countdown)
				}
				//  execute function
				fn(this.state === 'VOTING' ? 'COOLDOWN' : 'VOTING')
				return
			}
			this.countdown = setTimeout(function () {
				countDownObj!.count(i - 1)
			}, pause)
		}
		//  set it going
		countDownObj.count(i)
	}

	private onMove(e: ProxyEvent | any): void {
		console.log(e.event)
		switch (e.event) {
			case 'START':
				this.newTwisty(e.puzzleId)
				this.scramble.scrambleString = e.scramble
				this.performScramble()
				console.log(e.mode)
				this.mode = e.mode || 'democracy'
				this.changeState('VOTING')
				return
			case 'move':
				this.addVote(e.vote)
				return
			case 'RESET':
				this.scramble.scrambleString = e.scramble
				this.performScramble()
				this.changeState('RESET')
			default:
				this.changeState(e.event)
		}
	}
	private addVote = (vote: { move: string; username: string }): void => {
		this.votes.push(vote)
		const prevSum = this.voteTally[vote.move]
		this.voteTally[vote.move] = prevSum === undefined ? 1 : prevSum + 1
		console.log(this.voteTally)
		this.showNewVote(vote)
	}
	private showNewVote = (vote: { move: string; username: string }): void => {
		const priorMessages = document.getElementsByClassName('message-box-item')
		if (priorMessages.length >= this.MAX_MESSAGES) {
			priorMessages[0].remove()
		}
		const li = document.createElement('li')
		li.classList.add('message-box-item')
		li.classList.add('vote')
		li.innerHTML = `<b>${vote.username}</b> just voted for <b>${vote.move}</b>`
		const messageList = document.getElementById('message-box-list')
		messageList?.appendChild(li)
	}
	private performScramble(): void {
		let scrambleMoves = []
		if (this.scramble) {
			for (const move of this.scramble.scrambleString
				.split(/\s+/)
				.slice(0, -1)) {
				scrambleMoves.push(
					new BlockMove(
						undefined,
						undefined,
						this.moves333(move).family,
						this.moves333(move).amount
					)
				)
			}
			this.scramble.sequence = new Sequence(scrambleMoves)
			this.twisty.experimentalSetAlg(this.scramble.sequence, false)
			this.showScramble()
		}
	}
	private showScramble(): void {
		const id = document.getElementById('scramble')
		if (id) {
			id.innerHTML = `Scramble: ${this.scramble.scrambleString}`
		}
	}
}

;(window as any).twistySolvesPuzzles = new TwistySolvesPuzzles()
