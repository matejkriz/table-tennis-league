import { err, ok } from '@evolu/common';

const CIPHER_ALGORITHM = 'AES-GCM';
const IV_SIZE = 12; // 96 bits for AES-GCM
const AUTH_TAG_LENGTH = 128; // bits

// Branded type for encrypted hex strings
export type EncryptedHex = string & { readonly _brand: 'EncryptedHex' };

const asEncryptedHex = (value: string): EncryptedHex => value as EncryptedHex;

// Convert hex string to Uint8Array
const hexToBytes = (hex: string): Uint8Array => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
};

// Convert Uint8Array to hex string
const bytesToHex = (bytes: Uint8Array): string => {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

// Derive 256-bit key from hex key string using SHA-256
const deriveKey = async (keyHex: string): Promise<CryptoKey> => {
    const keyData = new TextEncoder().encode(keyHex);
    const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
    return crypto.subtle.importKey(
        'raw',
        hashBuffer,
        { name: CIPHER_ALGORITHM },
        false,
        ['encrypt', 'decrypt']
    );
};

// Generate random bytes for IV
const getRandomBytes = (size: number): Uint8Array => {
    return crypto.getRandomValues(new Uint8Array(size));
};

export type EncryptionUnavailable = {
    type: 'EncryptionUnavailable';
    message: string;
};

export const EncryptionUnavailable = (message: string): EncryptionUnavailable => ({
    type: 'EncryptionUnavailable' as const,
    message,
});

export type DecryptionFailed = {
    type: 'DecryptionFailed';
};

export const DecryptionFailed = (): DecryptionFailed => ({
    type: 'DecryptionFailed' as const,
});

export const encrypt = async ({ value, encryptionKey }: { value: string, encryptionKey: string | null }) => {
    if (encryptionKey === null) {
        return err(EncryptionUnavailable('Encryption key not available'));
    }

    try {
        const key = await deriveKey(encryptionKey);
        const iv = getRandomBytes(IV_SIZE);
        const encodedValue = new TextEncoder().encode(value);

        const encrypted = await crypto.subtle.encrypt(
            {
                name: CIPHER_ALGORITHM,
                iv: iv as Uint8Array<ArrayBuffer>,
                tagLength: AUTH_TAG_LENGTH,
            },
            key,
            encodedValue
        );

        // Format: IV (12 bytes) + ciphertext with auth tag
        const result = new Uint8Array(iv.length + encrypted.byteLength);
        result.set(iv, 0);
        result.set(new Uint8Array(encrypted), iv.length);

        return ok(asEncryptedHex(bytesToHex(result)));
    } catch {
        return err(EncryptionUnavailable('Encryption failed'));
    }
};

export const decrypt = async ({ value, encryptionKey }: { value: string, encryptionKey: string | null }) => {
    if (encryptionKey === null) {
        return err(EncryptionUnavailable('Encryption key not available'));
    }

    try {
        const key = await deriveKey(encryptionKey);
        const input = hexToBytes(value);

        const iv = new Uint8Array(input.buffer, 0, IV_SIZE);
        const ciphertext = new Uint8Array(input.buffer, IV_SIZE);

        const decrypted = await crypto.subtle.decrypt(
            {
                name: CIPHER_ALGORITHM,
                iv: iv as Uint8Array<ArrayBuffer>,
                tagLength: AUTH_TAG_LENGTH,
            },
            key,
            ciphertext as Uint8Array<ArrayBuffer>
        );

        return ok(new TextDecoder().decode(decrypted));
    } catch {
        // Could be wrong key or tampered data, cryptographically indistinguishable by design.
        return err(DecryptionFailed());
    }
};
