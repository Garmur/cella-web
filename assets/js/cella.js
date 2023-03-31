class Cella {
	#globalDirHandle
	#businessName
	#businessId

	#passcode
	#storage

	#db
	#publicKey
	#privateKey
	#template

	#usable

	static #SQL

	constructor() {
		console.log("Cella started.")
		this.#usable = false
	}

	isUsable() {
		return this.#usable
	}

	async chooseDirHandle() {
		this.#globalDirHandle = await window.showDirectoryPicker()
	}

	async saveData(form) {
		if(this.#globalDirHandle == undefined) {
			Notiflix.Report.warning(
				"Falta directorio",
				"Debes elegir una carpeta donde se almacenen los archivos.",
				"Aceptar"
			)
			return
		}

		const ruc = form.elements.ruc.value.trim()
		const name = form.elements.name.value.trim()

		const creatingDatabase = form.elements["creating-database"].checked
		const creatingKeys = form.elements["creating-keys"].checked

		let fileHandle, writable

		if(creatingDatabase) {
			this.#db = new Cella.#SQL.Database()
			const sqlstr = "\
				CREATE TABLE producto(\
					id integer PRIMARY KEY autoincrement,\
					config integer,\
					sku varchar(32),\
					nombre varchar(64),\
					descripcion varchar(256),\
					reserva blob,\
					precio integer\
				);\
				CREATE TABLE movimiento(\
					id integer PRIMARY KEY autoincrement,\
					config integer,\
					fecha integer,\
					descuento blob,\
					dni varchar(11),\
					consumidor varchar(32)\
				);\
				CREATE TABLE producto_movido(\
					_movimiento integer,\
					_producto integer,\
					cantidad blob,\
					precio blob,\
					FOREIGN KEY(_movimiento) REFERENCES movimiento(id),\
					FOREIGN KEY(_producto) REFERENCES producto(id)\
				);\
			"
			this.#db.run(sqlstr)

			fileHandle = await this.#globalDirHandle.getFileHandle("cella.db", { create: true })
			writable = await fileHandle.createWritable()
			await writable.write(this.#db.export())
			await writable.close()
		}

		if(creatingKeys) {
			const publicKey = form.elements["public-key"].value.trim()
			const privateKey = form.elements["private-key"].value.trim()

			if(publicKey.length) {
				fileHandle = await this.#globalDirHandle.getFileHandle("public.key", { create: true })
				writable = await fileHandle.createWritable()
				await writable.write(publicKey)
				await writable.close()

				if(privateKey.length) {
					await Notiflix.Confirm.prompt(
						"Seguridad de datos",
						"Escribe contraseña nueva", "",
						"Guardar", "Cancelar",
						async (pin) => {
							await this.#passcode.setupPasscode(pin)

							const encryptedData = await this.#passcode.encryptSession(privateKey)
							fileHandle = await this.#globalDirHandle.getFileHandle("private.bin", { create: true })
							writable = await fileHandle.createWritable()
							await writable.write(encryptedData)
							await writable.close()
						}
					)
				}
			}
		}

		const oSession = {
			ruc: ruc,
			dir: this.#globalDirHandle,
			nom: name
		}
		this.#storage.add(oSession)
	}

	async init() {
		this.#passcode = new Passcode()
		this.#storage = new Storage(this)

		Cella.#SQL = await initSqlJs({
			locateFile: file => "assets/js/sql-wasm.wasm"
		})
	}

	listenStorageInit(event) {
		this.#storage.readFirst()
	}

	setBusiness(business) {
		if(business == null)  {
			Notiflix.Report.info(
				"Falta configuración",
				"Debes configurar datos para usar.",
				"Aceptar"
			)
			return
		}
		this.#globalDirHandle = business.dir
		this.#businessName = business.nom
		this.#businessId = business.ruc
		Notiflix.Report.success(
			"Datos disponibles",
			`Listo para usar ${this.#businessName}.`,
			"Aceptar"
		)
	}

	async useDirectory() {
		try {
			if(await this.#checkDirHandle()) {
				let fileHandle, file, fileContent
				try {
					fileHandle = await this.#globalDirHandle.getFileHandle("cella.db", {})
					file = await fileHandle.getFile()
					fileContent = await file.arrayBuffer()

					this.#db = new Cella.#SQL.Database(new Uint8Array(fileContent))
				}
				catch(e) {
					Notiflix.Report.error("Sin almacén", "No hay base de datos para leer.", "Aceptar")
					console.log(e)
					return
				}

				try {
					fileHandle = await this.#globalDirHandle.getFileHandle("public.key", {})
					file = await fileHandle.getFile()
					fileContent = await file.text()
					this.#publicKey = content
				}
				catch(e) {
					Notiflix.Notify.warning("Falta clave pública.")
					console.log(e)
				}

				this.#usable = true
				return
			}
			Notiflix.Notify.warning("No hay permisos para acceder a directorio local.")
		}
		catch(e) {
			Notiflix.Notify.error("No hay referencia a directorio.")
		}
	}

	async #checkDirHandle() {
		if(this.#globalDirHandle instanceof FileSystemDirectoryHandle) {
			//https://stackoverflow.com/a/66500919
			const options = {
				mode: "readwrite"
			}
			// Check if permission was already granted. If so, return true.
			if((await this.#globalDirHandle.queryPermission(options)) === "granted") {
				return true
			}
			// Request permission. If the user grants permission, return true.
			if((await this.#globalDirHandle.requestPermission(options)) === "granted") {
				return true
			}
			// The user didn't grant permission, so return false.
			return false
		}

		throw new Error("No es directorio.")
	}
}
