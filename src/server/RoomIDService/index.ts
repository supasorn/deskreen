import shortID from 'shortid';

// fixed room so the viewer URL never changes
export const FIXED_ROOM_ID = '123456';

export default class RoomIDService {
	takenRoomIDs: Set<string>;

	nextSimpleRoomID: number;

	constructor() {
		this.takenRoomIDs = new Set<string>();
		this.nextSimpleRoomID = 1;
		// TODO: load saved taken room ids from local storage, will be useful for saved devices feature in FUTURE
	}

	getSimpleAvailableRoomID(): Promise<string> {
		this.nextSimpleRoomID += 1;
		return Promise.resolve(FIXED_ROOM_ID);
	}

	getShortIDStringOfAvailableRoom(): Promise<string> {
		return new Promise<string>((resolve) => {
			let newID = shortID();
			while (this.takenRoomIDs.has(newID)) {
				newID = shortID();
			}
			resolve(newID);
		});
	}

	markRoomIDAsTaken(id: string): void {
		this.takenRoomIDs.add(id);
	}

	unmarkRoomIDAsTaken(id: string): void {
		// keep the fixed room open between sessions, so a viewer reconnecting
		// before the next waiting session exists isn't rejected; the signaling
		// server still allows only one viewer at a time
		if (id === FIXED_ROOM_ID) return;
		this.takenRoomIDs.delete(id);
	}

	isRoomIDTaken(id: string): boolean {
		return this.takenRoomIDs.has(id);
	}
}
