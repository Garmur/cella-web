class Passcode {
	static #SALT = "[salt]CELLA"
	static #IV_LENGTH = 12

	#currentPasscodeHash

	async setupPasscode(passcode) {
		this.#currentPasscodeHash = await Passcode.sha256(passcode)
	}

	async decryptSession(encrypted, forgetPasscode = true) {
		const decrypted = await this.#aesDecrypt(encrypted)

		if(forgetPasscode) {
			this.#currentPasscodeHash = null
		}

		return decrypted
	}

	async encryptSession(data) {
		if(!this.#currentPasscodeHash) {
			throw new Error("Clave no asignada")
		}

		const sessionEncrypted = await this.#aesEncrypt(data)
		return sessionEncrypted
	}

	static sha256(plaintext, withSalt) {
		return crypto.subtle.digest("SHA-256", new TextEncoder().encode(withSalt ? `${plaintext}${SALT}` : plaintext))
	}

	async #aesEncrypt(plaintext) {
		const iv = crypto.getRandomValues(new Uint8Array(Passcode.#IV_LENGTH))
		const alg = { name: "AES-GCM", iv }
		const key = await crypto.subtle.importKey("raw", this.#currentPasscodeHash, alg, false, ["encrypt"])
		const ptUint8 = new TextEncoder().encode(plaintext)
		const ctBuffer = await crypto.subtle.encrypt(alg, key, ptUint8)
		const ct = new Uint8Array(ctBuffer)
		const result = new Uint8Array(Passcode.#IV_LENGTH + ct.length)
		result.set(iv, 0)
		result.set(ct, Passcode.#IV_LENGTH)
		return result.buffer
	}

	async #aesDecrypt(data) {
		const dataArray = new Uint8Array(data)
		const iv = dataArray.slice(0, Passcode.#IV_LENGTH)
		const alg = { name: "AES-GCM", iv }
		const key = await crypto.subtle.importKey("raw", this.#currentPasscodeHash, alg, false, ["decrypt"])
		const ct = dataArray.slice(Passcode.#IV_LENGTH)
		const plainBuffer = await crypto.subtle.decrypt(alg, key, ct)
		return new TextDecoder().decode(plainBuffer)
	}
}
