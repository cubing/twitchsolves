interface BlockMove {
	family: string
	amount: number
	value?: string
}
export interface Puzzle {
	moves: BlockMove[]
	name: string
	id: string
}

export const faceMoves: BlockMove[] = [
	{ value: 'R', family: 'R', amount: 1 },
	{ value: "R'", family: 'R', amount: -1 },
	{ value: 'R2', family: 'R', amount: 2 },
	{ value: 'L', family: 'L', amount: 1 },
	{ value: "L'", family: 'L', amount: -1 },
	{ value: 'L2', family: 'L', amount: 2 },
	{ value: 'U', family: 'U', amount: 1 },
	{ value: "U'", family: 'U', amount: -1 },
	{ value: 'U2', family: 'U', amount: 2 },
	{ value: 'D', family: 'D', amount: 1 },
	{ value: "D'", family: 'D', amount: -1 },
	{ value: 'D2', family: 'D', amount: 2 },
	{ value: 'F', family: 'F', amount: 1 },
	{ value: "F'", family: 'F', amount: -1 },
	{ value: 'F2', family: 'F', amount: 2 },
	{ value: 'B', family: 'B', amount: 1 },
	{ value: "B'", family: 'B', amount: -1 },
	{ value: 'B2', family: 'B', amount: 2 },
]
export const sliceMoves: BlockMove[] = [
	{ value: 'M', family: 'M', amount: 1 },
	{ value: "M'", family: 'M', amount: -1 },
	{ value: 'M2', family: 'M', amount: 2 },
	{ value: 'S', family: 'S', amount: 1 },
	{ value: "S'", family: 'S', amount: -1 },
	{ value: 'S2', family: 'S', amount: 2 },
	{ value: 'E', family: 'E', amount: 1 },
	{ value: "E'", family: 'E', amount: -1 },
	{ value: 'E2', family: 'E', amount: 2 },
]
export const wideMoves: BlockMove[] = [
	{ value: 'Uw', family: 'u', amount: 1 },
	{ value: "Uw'", family: 'u', amount: -1 },
	{ value: 'Uw2', family: 'u', amount: 2 },
	{ value: 'Dw', family: 'd', amount: 1 },
	{ value: "Dw'", family: 'd', amount: -1 },
	{ value: 'Dw2', family: 'd', amount: 2 },
	{ value: 'Fw', family: 'f', amount: 1 },
	{ value: "Fw'", family: 'f', amount: -1 },
	{ value: 'Fw2', family: 'f', amount: 2 },
	{ value: 'Bw', family: 'b', amount: 1 },
	{ value: "Bw'", family: 'b', amount: -1 },
	{ value: 'Bw2', family: 'b', amount: 2 },
	{ value: 'Rw', family: 'r', amount: 1 },
	{ value: "Rw'", family: 'r', amount: -1 },
	{ value: 'Rw2', family: 'r', amount: 2 },
	{ value: 'Lw', family: 'l', amount: 1 },
	{ value: "Lw'", family: 'l', amount: -1 },
	{ value: 'Lw2', family: 'l', amount: 2 },
]

export const rotations: BlockMove[] = [
	{ value: 'y', family: 'y', amount: 1 },
	{ value: "y'", family: 'y', amount: -1 },
	{ value: 'y2', family: 'y', amount: 2 },
	{ value: 'z', family: 'z', amount: 1 },
	{ value: "z'", family: 'z', amount: -1 },
	{ value: 'z2', family: 'z', amount: 2 },
	{ value: 'x', family: 'x', amount: 1 },
	{ value: "x'", family: 'x', amount: -1 },
	{ value: 'x2', family: 'x', amount: 2 },
]

export const moves_333: BlockMove[] = [
	...faceMoves,
	...sliceMoves,
	...wideMoves,
	...rotations,
]

export const moves_222: BlockMove[] = [...faceMoves, ...rotations]

export const moves_pyraminx: BlockMove[] = [...faceMoves, ...rotations]

export const puzzles: Puzzle[] = [
	{ moves: moves_333, name: '3x3x3', id: '333' },
	{ moves: moves_222, name: '2x2x2', id: '222' },
	{ moves: moves_pyraminx, name: 'pyraminx', id: 'pyram' },
	{ moves: moves_333, name: '4x4x4', id: '444' },
]
