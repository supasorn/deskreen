const RETRY_INTERVAL_MS = 2000;

let isScheduled = false;

// Polls the Deskreen server and reloads the page once it responds, which
// starts a fresh viewer session (new socket, peer and keys).
export default function scheduleAutoReconnect(): void {
	if (isScheduled) return;
	isScheduled = true;

	const attempt = async () => {
		try {
			const res = await fetch(window.location.href, {
				method: 'HEAD',
				cache: 'no-store',
			});
			if (res.ok) {
				window.location.reload();
				return;
			}
		} catch {
			// server still offline
		}
		setTimeout(attempt, RETRY_INTERVAL_MS);
	};

	setTimeout(attempt, RETRY_INTERVAL_MS);
}
