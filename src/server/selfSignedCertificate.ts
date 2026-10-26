import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { app } from 'electron';
import forge from 'node-forge';

// Self-signed certificate so remote viewers can load the viewer over HTTPS:
// WebCodecs (the low-latency video path) only exists in secure contexts. The
// browser asks once to accept it; it's kept in userData so that sticks, and
// only regenerated when the machine's IP addresses change.

type StoredCertificate = { key: string; cert: string; ips: string[] };

export function getLocalIPv4Addresses(): string[] {
	const addresses = ['127.0.0.1'];
	Object.values(os.networkInterfaces()).forEach((interfaces) => {
		(interfaces || []).forEach((info) => {
			if (info.family === 'IPv4' && !info.internal) {
				addresses.push(info.address);
			}
		});
	});
	return addresses;
}

function createCertificate(ips: string[]): StoredCertificate {
	const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
		modulusLength: 2048,
		publicKeyEncoding: { type: 'spki', format: 'pem' },
		privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
	});

	const cert = forge.pki.createCertificate();
	cert.publicKey = forge.pki.publicKeyFromPem(publicKey);
	cert.serialNumber = `01${crypto.randomBytes(8).toString('hex')}`;
	cert.validity.notBefore = new Date(Date.now() - 24 * 60 * 60 * 1000);
	cert.validity.notAfter = new Date();
	cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 2);
	const attributes = [{ name: 'commonName', value: 'Deskreen CE' }];
	cert.setSubject(attributes);
	cert.setIssuer(attributes);
	cert.setExtensions([
		{ name: 'basicConstraints', cA: false },
		{ name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
		{ name: 'extKeyUsage', serverAuth: true },
		{
			name: 'subjectAltName',
			altNames: [
				{ type: 2, value: 'localhost' },
				...ips.map((ip) => ({ type: 7, ip })),
			],
		},
	]);
	cert.sign(forge.pki.privateKeyFromPem(privateKey), forge.md.sha256.create());

	return { key: privateKey, cert: forge.pki.certificateToPem(cert), ips };
}

export default function getSelfSignedCertificate(): {
	key: string;
	cert: string;
} {
	const ips = getLocalIPv4Addresses();
	const certificatePath = path.join(
		app.getPath('userData'),
		'viewer-https-certificate.json',
	);

	try {
		const stored = JSON.parse(
			fs.readFileSync(certificatePath, 'utf8'),
		) as StoredCertificate;
		if (ips.every((ip) => stored.ips.includes(ip))) {
			return stored;
		}
	} catch {
		// missing or unreadable: create a new one
	}

	const created = createCertificate(ips);
	try {
		fs.writeFileSync(certificatePath, JSON.stringify(created), { mode: 0o600 });
	} catch (error) {
		console.error('failed to save viewer HTTPS certificate', error);
	}
	return created;
}
