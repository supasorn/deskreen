import { ChildProcess, spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';

// Virtual display (DeskPad-like) created by resources/bin/virtual-display.
// Configure with DESKREEN_VIRTUAL_DISPLAY=<WIDTHxHEIGHT> (default 1280x800)
// or DESKREEN_VIRTUAL_DISPLAY=off, and DESKREEN_VIRTUAL_DISPLAY_HIDPI=1.

const START_TIMEOUT_MS = 5000;

let helperProcess: ChildProcess | null = null;
let virtualDisplayID: string | null = null;
const resizeListeners = new Set<() => void>();

function getHelperPath(): string {
	// resources/** is unpacked from the asar archive in packaged builds
	return join(app.getAppPath(), 'resources', 'bin', 'virtual-display').replace(
		'app.asar',
		'app.asar.unpacked',
	);
}

export function getVirtualDisplayID(): string | null {
	return virtualDisplayID;
}

export function startVirtualDisplay(): Promise<string | null> {
	const config = process.env.DESKREEN_VIRTUAL_DISPLAY || '1280x800';
	if (process.platform !== 'darwin' || config === 'off') {
		return Promise.resolve(null);
	}
	const helperPath = getHelperPath();
	if (!existsSync(helperPath)) {
		console.warn(
			`[virtual-display] helper not found at ${helperPath}, run "pnpm build:virtual-display"`,
		);
		return Promise.resolve(null);
	}

	const args = [config];
	if (process.env.DESKREEN_VIRTUAL_DISPLAY_HIDPI === '1') {
		args.push('--hidpi');
	}

	return new Promise((resolve) => {
		// stdin stays open as a lifeline: the helper exits when it closes
		const child = spawn(helperPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });
		helperProcess = child;

		const timeout = setTimeout(() => {
			console.error('[virtual-display] timed out waiting for display id');
			resolve(null);
		}, START_TIMEOUT_MS);

		let pendingOutput = '';
		child.stdout?.on('data', (chunk: Buffer) => {
			pendingOutput += chunk.toString();
			const lines = pendingOutput.split('\n');
			pendingOutput = lines.pop() ?? '';
			lines.forEach((line) => {
				const displayIDMatch = line.match(/^DISPLAY_ID=(\d+)/);
				if (displayIDMatch && virtualDisplayID === null) {
					virtualDisplayID = displayIDMatch[1];
					clearTimeout(timeout);
					console.log(
						`[virtual-display] created display ${virtualDisplayID} (${args.join(' ')})`,
					);
					resolve(virtualDisplayID);
				}
				const resolutionMatch = line.match(/^RESOLUTION=(\d+x\d+)/);
				if (resolutionMatch) {
					console.log(
						`[virtual-display] resolution changed to ${resolutionMatch[1]}`,
					);
					resizeListeners.forEach((listener) => listener());
				}
			});
		});
		child.stderr?.on('data', (chunk: Buffer) => {
			console.error(`[virtual-display] ${chunk.toString().trim()}`);
		});
		child.on('exit', (code) => {
			clearTimeout(timeout);
			console.log(`[virtual-display] helper exited (${code})`);
			helperProcess = null;
			virtualDisplayID = null;
			resolve(null);
		});
		child.on('error', (error) => {
			clearTimeout(timeout);
			console.error('[virtual-display] failed to start helper', error);
			resolve(null);
		});
	});
}

// Calls listener when the virtual display's resolution changes, e.g. from
// System Settings > Displays.
export function onVirtualDisplayResized(listener: () => void): () => void {
	resizeListeners.add(listener);
	return () => {
		resizeListeners.delete(listener);
	};
}

export function stopVirtualDisplay(): void {
	helperProcess?.kill('SIGTERM');
	helperProcess = null;
	virtualDisplayID = null;
}
