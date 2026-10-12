export default (
	peerConnection: PeerConnection,
	users: PartnerPeerUser[] = [],
): void => {
	// no partner yet: someone else (e.g. a rejected extra viewer) left
	if (peerConnection.partner.username === '') return;
	const isPartnerStillInRoom = users.some(
		(user) => user.username === peerConnection.partner.username,
	);
	if (isPartnerStillInRoom) return;

	if (peerConnection.isSocketRoomLocked) {
		peerConnection.toggleLockRoom(false);
	}
	// destroy even if the call hasn't started yet, otherwise a viewer leaving
	// mid-handshake keeps the single viewer slot occupied forever
	peerConnection.selfDestroy();
};
