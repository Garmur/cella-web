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
	#logo

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
					dni varchar(12),\
					consumidor varchar(32),\
					nota varchar(128)\
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
					this.#publicKey = fileContent
				}
				catch(e) {
					Notiflix.Notify.warning("Falta clave pública.")
					console.log(e)
				}

				try {
					fileHandle = await this.#globalDirHandle.getFileHandle("logo.jpg", {})
					file = await fileHandle.getFile()
					fileContent = await file.arrayBuffer()
					this.#logo = fileContent
				}
				catch(e) {
					console.log(e)
				}

				this.#usable = true
				Notiflix.Notify.success("Datos de almacén cargados.")
				this.#modifyLocker()
				app.navigate("/index.html")
				return
			}
			Notiflix.Notify.warning("No hay permisos para acceder a directorio local.")
		}
		catch(e) {
			Notiflix.Notify.failure(e.message)
			console.log(e)
		}
	}

	#modifyLocker() {
		const unlockerLink = document.getElementById("unlocker")
		if(unlockerLink) {
			const parentLink = unlockerLink.parentNode
			unlockerLink.remove()

			let binary = ''
			const bytes = new Uint8Array( this.#logo )
			const len = bytes.byteLength
			for(let i = 0; i < len; i++) {
				binary += String.fromCharCode( bytes[ i ] )
			}

			const newImage = document.createElement("img")
			newImage.alt = "logo"
			newImage.width = "32"
			newImage.src = `data:image/jpg;base64,${window.btoa( binary )}`
			parentLink.appendChild(newImage)
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

	#showUnreadMessage() {
		Notiflix.Report.warning("Lectura pendiente", "Luego de aceptar el acceso al sistema de archivos se podrá usar Cella.", "Aceptar")
	}

	async saveProduct(form) {
		if(! this.#usable) {
			this.#showUnreadMessage()
			await this.useDirectory()
			return
		}

		Notiflix.Confirm.show( "Guardando producto", "¿Almacenar datos?", "Sí", "No",
			async () => {
				form.elements.trigger.disabled = true
				await this.#createProduct(form)
				form.elements.trigger.disabled = false
			}
		)
	}

	async #createProduct(form) {
		if(this.#globalDirHandle == undefined) {
			Notiflix.Report.warning(
				"Falta directorio",
				"Debes elegir una carpeta en tu dispositivo para almacenar todos los datos de este formulario.",
				"Aceptar"
			)
			return
		}

		const product = new Item()
		try {
			if(form.elements.identidad) {
				product.setIdentity(parseInt(form.elements.identidad.value.trim()))
			}
			product.setSku(form.elements.codigo.value.trim())
			product.setName(form.elements.nombre.value.trim())
			product.setDescription(form.elements.descripcion.value.trim())
			product.setPrice(Number(form.elements.precio.value.trim()))
			if(form.elements.identidad == undefined) {
				product.setQuantity(Number(form.elements.cantidad.value.trim()))
			}
		}
		catch(e) {
			Notiflix.Notify.warning(e.message)
			console.error(e)
			return
		}

		try {
			this.#db.run("BEGIN TRANSACTION")
			if(product.getIdentity() > 0) {
				this.#db.run("UPDATE producto SET sku = ?, nombre = ?, descripcion = ?, precio = ? WHERE id = ?", [
					product.getSku(),
					product.getName(),
					product.getDescription(),
					product.getPrice(),
					product.getIdentity()
				])
			}
			else {
				this.#db.run("INSERT INTO producto VALUES(?,?,?,?,?,?,?)", [
					null, 1,
					product.getSku(),
					product.getName(),
					product.getDescription(),
					product.getQuantity(),
					product.getPrice()
				])
			}

			//Saving db onto disk
			let fileHandle = await this.#globalDirHandle.getFileHandle("cella.db", { create: true })
			let writable = await fileHandle.createWritable()
			this.#db.run("COMMIT")
			await writable.write(this.#db.export())
			await writable.close()

			if(product.getIdentity() > 0) {
				Notiflix.Notify.success(`Producto "${product.getName()}" editado.`)
			}
			else {
				Notiflix.Notify.success(`Producto "${product.getName()}" registrado.`)
			}
		}
		catch(e) {
			this.#db.run("ROLLBACK")
			Notiflix.Report.failure("Error para crear", e.message, "Aceptar")
			console.error(e)
		}
	}

	listProducts(lastIndex) {
		const list = document.getElementById("lista-productos")
		if(list == null) {
			Notiflix.Notify.warning("No hay lugar para listar comprobantes.")
			return
		}

		if(lastIndex == 0) {
			const stmt = this.#db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'producto'");
			if(stmt.step()) {
				const row = stmt.get()
				lastIndex = row[0]
				++lastIndex
			}
			stmt.free()
		}

		this.#db.each("SELECT * FROM producto WHERE id < $lastindex ORDER BY id DESC LIMIT 8", {$lastindex: lastIndex},
			function(row) {
				const tr = list.insertRow()
				tr.insertCell().appendChild(document.createTextNode(row.sku))
				tr.insertCell().appendChild(document.createTextNode(row.nombre))
				tr.insertCell().appendChild(document.createTextNode(row.config & 1 ? "Activo" : "Inactivo"))
				tr.insertCell().appendChild(document.createTextNode(row.reserva))
				tr.insertCell().appendChild(document.createTextNode(row.precio.toFixed(2)))
				const editterButton = document.createElement("i")
				editterButton.setAttribute("class", "bx bx-edit-alt me-1")
				const editter = document.createElement("a")
				editter.href = `/productos-editar.html?producto=${row.id}`
				editter.setAttribute("class", "btn btn-secondary p-1")
				editter.appendChild(editterButton)
				editter.appendChild(document.createTextNode("Editar"))
				tr.insertCell().appendChild(editter)
			}
		)
	}

	viewProduct(identity) {
		const form = document.getElementById("editor-producto")
		if(form == null) {
			Notiflix.Notify.warning("No hay lugar para editar datos.")
			return
		}

		this.#db.each("SELECT id, config, sku, nombre, descripcion, precio FROM producto WHERE id = $identity LIMIT 1", {$identity: identity},
			function(row) {
				form.elements.identidad.value = row.id
				form.elements.codigo.value = row.sku
				form.elements.nombre.value = row.nombre
				form.elements.descripcion.value = row.descripcion
				form.elements.precio.value = row.precio
			}
		)
	}

	/**
	 * Search and append item row if found it and there is not in form items.
	 */
	appendItem() {
		const items = document.getElementById("items")
		if(items == undefined) {
			Notiflix.Notify.failure("No hay contenedor de ítems.")
			return
		}

		const sku = document.getElementById("codigo-buscable").value.trim()
		if(sku.length == 0) {
			Notiflix.Notify.warning("Entrada para código está vacía.")
			return
		}

		const rows = document.getElementsByClassName("item")
		if(rows != undefined) {
			for(const row of rows) {
				if(row.querySelector("[data-type='sku']").value.trim() == sku) {
					const quantitySelector = row.querySelector("[data-type='quantity']")
					quantitySelector.value = parseInt(quantitySelector.value) + 1
					Cella.#calculateSubtotal(
						row.querySelector("[data-type='subtotal']"),
						quantitySelector,
						row.querySelector("[data-type='unit-value']")
					)
					Cella.calculateTotal()
					return
				}
			}
		}

		const product = new Item()
		this.#db.each("SELECT id, config, sku, nombre, descripcion, precio FROM producto WHERE sku = $sku LIMIT 1", {$sku: sku},
			function(row) {
				product.setIdentity(row.id)
				product.setSku(sku)
				product.setName(row.nombre)
				product.setDescription(row.descripcion)
				product.setPrice(row.precio)
			}
		)

		if(! product.getIdentity()) {
			Notiflix.Notify.failure("No existe el código en el almacén.")
			return
		}

		const itemRow = document.createElement("div")
		itemRow.setAttribute("class", "row border-bottom mb-2")
		items.append(itemRow)

		const eraserCol = document.createElement("div")
		eraserCol.setAttribute("class", "col-md-1")
		itemRow.appendChild(eraserCol)

		const eraserIcon = document.createElement("i")
		eraserIcon.setAttribute("class", "bx bxs-trash")

		const eraser = document.createElement("button")
		eraser.type = "button"
		eraser.setAttribute("class", "btn btn-outline-danger border-0")
		eraser.appendChild(eraserIcon)
		eraserCol.appendChild(eraser)

		const dataCol = document.createElement("div")
		dataCol.setAttribute("class", "col-md-11")
		itemRow.appendChild(dataCol)

		const datagroupRow = document.createElement("div")
		datagroupRow.setAttribute("class", "row item")
		dataCol.appendChild(datagroupRow)

		const skuCol = document.createElement("div")
		skuCol.setAttribute("class", "col-md-4 mb-1")
		datagroupRow.appendChild(skuCol)
		const skuFloating = document.createElement("div")
		skuFloating.setAttribute("class", "form-floating")
		skuCol.appendChild(skuFloating)
		const skuInput = document.createElement("input")
		skuInput.value = product.getSku()
		skuInput.required = true
		skuInput.type = "text"
		skuInput.setAttribute("class", "form-control")
		skuInput.placeholder = "Código único"
		skuInput.readOnly = true
		skuInput.setAttribute("data-type", "sku")
		skuFloating.appendChild(skuInput)
		const skuLabel = document.createElement("label")
		skuLabel.appendChild(document.createTextNode("Código único"))
		skuFloating.appendChild(skuLabel)

		const identityInput = document.createElement("input")
		identityInput.type = "hidden"
		identityInput.value = product.getIdentity()
		identityInput.setAttribute("data-type", "identity")
		skuFloating.appendChild(identityInput)

		const nameCol = document.createElement("div")
		nameCol.setAttribute("class", "col-md-8 mb-1")
		datagroupRow.appendChild(nameCol)
		const nameFloating = document.createElement("div")
		nameFloating.setAttribute("class", "form-floating")
		nameCol.appendChild(nameFloating)
		const nameInput = document.createElement("input")
		nameInput.required = true
		nameInput.type = "text"
		nameInput.setAttribute("class", "form-control")
		nameInput.placeholder = "Nombre"
		nameInput.value = product.getName()
		nameInput.readOnly = true
		nameFloating.appendChild(nameInput)
		const nameLabel = document.createElement("label")
		nameLabel.appendChild(document.createTextNode("Nombre de producto"))
		nameFloating.appendChild(nameLabel)

		const quantityCol = document.createElement("div")
		quantityCol.setAttribute("class", "col-md-4 mb-1")
		datagroupRow.appendChild(quantityCol)
		const quantityFloating = document.createElement("div")
		quantityFloating.setAttribute("class", "form-floating")
		quantityCol.appendChild(quantityFloating)
		const quantityInput = document.createElement("input")
		quantityInput.value = "1"
		quantityInput.setAttribute("data-type", "quantity")
		quantityInput.required = true
		quantityInput.type = "text"
		quantityInput.setAttribute("class", "form-control")
		quantityInput.placeholder = "Cantidad"
		quantityFloating.appendChild(quantityInput)
		const quantityLabel = document.createElement("label")
		quantityLabel.appendChild(document.createTextNode("Cantidad"))
		quantityFloating.appendChild(quantityLabel)

		const priceCol = document.createElement("div")
		priceCol.setAttribute("class", "col-md-4 mb-1")
		datagroupRow.appendChild(priceCol)
		const priceFloating = document.createElement("div")
		priceFloating.setAttribute("class", "form-floating")
		priceCol.appendChild(priceFloating)
		const priceInput = document.createElement("input")
		priceInput.value = product.getPrice(true)
		priceInput.required = true
		priceInput.type = "text"
		priceInput.setAttribute("data-type", "unit-value")
		priceInput.setAttribute("class", "form-control")
		priceInput.placeholder = "Precio"
		priceFloating.appendChild(priceInput)
		const priceLabel = document.createElement("label")
		priceLabel.appendChild(document.createTextNode("Valor unitario"))
		priceFloating.appendChild(priceLabel)

		const subtotalCol = document.createElement("div")
		subtotalCol.setAttribute("class", "col-md-4 mb-1")
		datagroupRow.appendChild(subtotalCol)
		const subtotalFloating = document.createElement("div")
		subtotalFloating.setAttribute("class", "form-floating")
		subtotalCol.appendChild(subtotalFloating)
		const subtotalInput = document.createElement("input")
		subtotalInput.value = product.getPrice(true)
		subtotalInput.required = true
		subtotalInput.type = "text"
		subtotalInput.setAttribute("data-type", "subtotal")
		subtotalInput.setAttribute("class", "form-control")
		subtotalInput.placeholder = "Subtotal"
		subtotalInput.readOnly = true
		subtotalFloating.appendChild(subtotalInput)
		const subtotalLabel = document.createElement("label")
		subtotalLabel.appendChild(document.createTextNode("Subtotal"))
		subtotalFloating.appendChild(subtotalLabel)

		subtotalInput.onkeyup = quantityInput.onkeyup = priceInput.onkeyup = function() {
			Cella.#calculateSubtotal(subtotalInput, quantityInput, priceInput)
		}

		Cella.calculateTotal()
	}

	enterCode(event) {
		if(event.keyCode == 13 && event.currentTarget.value.trim().length) {
			event.stopPropagation()
			this.appendItem()
			return false
		}
		event.stopPropagation()
   }

   static #calculateSubtotal(entradaSubtotal, entradaCantidad, entradaValorUnitario) {
		if(entradaCantidad.value.trim().length == 0 || entradaValorUnitario.value.trim().length == 0) {
			entradaSubtotal.value = ""
			return
		}

		entradaSubtotal.value = ( parseFloat(entradaCantidad.value) * parseFloat(entradaValorUnitario.value) ).toFixed(2)
		Cella.calculateTotal()
   }

	static calculateTotal() {
		const form = document.getElementById("formulario")
		const items = document.getElementsByClassName("item")

		let subtotal = 0, quantity, unitValue

		for(const item of items) {
			unitValue = parseFloat(item.querySelector("[data-type='unit-value']").value)
			quantity = parseFloat(item.querySelector("[data-type='quantity']").value)

			subtotal += unitValue * quantity
		}

		let discount = parseFloat(form.elements["descuento-global"].value.trim())
		if(isNaN(discount)) {
			discount = 0
		}
		form.elements["total-global"].value = ( subtotal - discount ).toFixed(2)
	}

	async saveMovement(form) {
		const isIn = parseInt(form.elements["move-type"].value)

		const items = document.getElementsByClassName("item")
		if(items == undefined || items.length == 0) {
			Notiflix.Report.warning(
				"No hay ítems",
				`No se puede procesar ${isIn ? "compra" : "venta"} sin elementos.`,
				"Aceptar"
			)
			return
		}

		if(! this.#usable) {
			this.#showUnreadMessage()
			await this.useDirectory()
			return
		}

		Notiflix.Confirm.show("Creando movimiento", `¿Generar ${isIn ? "compra" : "venta"}?`, "Sí", "No",
			async () => {
				form.elements.trigger.disabled = true
				await this.#createMovement(form)
				form.elements.trigger.disabled = false
			}
		)
	}

	async #createMovement(form) {
		if(this.#globalDirHandle == undefined) {
			Notiflix.Report.warning(
				"Falta directorio",
				"Debes elegir una carpeta en tu dispositivo para almacenar todos los datos de este formulario.",
				"Aceptar"
			)
			return
		}

		let subtotal = 0, quantity, unitValue
		const movement = new Move()
		movement.setType(parseInt(form.elements["move-type"].value))
		movement.setCustomer(form.elements["customer-identification"].value.trim(), form.elements["customer-name"].value.trim())
		movement.setDiscount(parseFloat(form.elements["descuento-global"].value.trim()))
		movement.setNote(form.elements.mensaje.value.trim())

		const items = form.getElementsByClassName("item")
		for(const item of items) {
			const product = new Item()
			product.setIdentity(parseInt(item.querySelector("[data-type='identity']").value))
			product.setPrice(parseFloat(item.querySelector("[data-type='unit-value']").value))
			product.setQuantity(parseFloat(item.querySelector("[data-type='quantity']").value))
			movement.addItem(product)
		}

		try {
			this.#db.run("BEGIN TRANSACTION")
			this.#db.run("INSERT INTO movimiento VALUES(?,?,?,?,?,?,?)", [
				null, movement.getConfiguration(), Date.now() / 1000,
				movement.getDiscount(),
				movement.getDni() ? movement.getDni() : '',
				movement.getCustomer() ? movement.getCustomer() : '',
				movement.getNote() ? movement.getNote() : ''
			])

			const lastResult = this.#db.exec("SELECT last_insert_rowid()")
			movement.setIdentity(lastResult[0].values[0][0])

			let withoutItem = true
			for(const item of movement.getItems()) {
				this.#db.run("INSERT INTO producto_movido VALUES(?,?,?,?)", [
					movement.getIdentity(),
					item.getIdentity(),
					item.getQuantity(),
					item.getPrice()
				])

				this.#db.run(`UPDATE producto SET reserva = reserva ${movement.getType() ? '+' : '-'} ? WHERE id = ?`, [
					item.getQuantity(),
					item.getIdentity()
				])
				if(withoutItem) {
					withoutItem = false
				}
			}
			if(withoutItem) {
				this.#db.run("ROLLBACK")
				Notiflix.Report.warning("Proceso no culminado", "No hay ítems para insertar con el movimiento.", "Aceptar")
				return
			}

			//Saving db onto disk
			let fileHandle = await this.#globalDirHandle.getFileHandle("cella.db", { create: true })
			let writable = await fileHandle.createWritable()
			this.#db.run("COMMIT")
			await writable.write(this.#db.export())
			await writable.close()

			Notiflix.Report.success(movement.getType() ? "Compra" : "Venta", `Se generó el movimiento ${movement.getIdentity()}.`, "Aceptar")
		}
		catch(e) {
			this.#db.run("ROLLBACK")
			Notiflix.Report.failure("Error para mover", e.message, "Aceptar")
			console.error(e)
		}
	}

	listMovements(lastIndex) {
		const list = document.getElementById("lista-movimientos")
		if(list == null) {
			Notiflix.Notify.warning("No hay lugar para listar movimientos.")
			return
		}

		if(lastIndex == 0) {
			const stmt = this.#db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'movimiento'");
			if(stmt.step()) {
				const row = stmt.get()
				lastIndex = row[0]
				++lastIndex
			}
			stmt.free()
		}

		this.#db.each("SELECT * FROM movimiento WHERE id < $lastindex ORDER BY id DESC LIMIT 8", {$lastindex: lastIndex},
			function(row) {
				const tr = list.insertRow()
				tr.insertCell().appendChild(document.createTextNode(row.id))
				tr.insertCell().appendChild(document.createTextNode(row.config & 1 ? "Compra" : "Venta"))
				tr.insertCell().appendChild(document.createTextNode(row.fecha))
				tr.insertCell().appendChild(document.createTextNode(row.consumidor))
				const viewerButton = document.createElement("i")
				viewerButton.setAttribute("class", "bx bx-link me-1")
				const viewer = document.createElement("a")
				viewer.href = `/movimientos-ver.html?movimiento=${row.id}`
				viewer.setAttribute("class", "btn btn-secondary p-1")
				viewer.appendChild(viewerButton)
				viewer.appendChild(document.createTextNode("Ver más"))
				tr.insertCell().appendChild(viewer)
			}
		)
	}

	viewMovement(identity) {
		const movement = new Move()
		this.#db.each("SELECT * FROM movimiento WHERE id = $identity LIMIT 1", {$identity: identity},
			function(row) {
				movement.setIdentity(row.id)
				movement.setTimestamp(row.fecha)
				movement.setDiscount(row.descuento)
				movement.setCustomer(row.dni, row.consumidor)
				movement.setNote(row.nota)
			}
		)

		this.#db.each("SELECT _producto, producto_movido.precio, cantidad, sku, nombre FROM producto_movido INNER JOIN producto ON id = _producto WHERE _movimiento = $identity", {$identity: identity},
			function(row) {
				const product = new Item()
				product.setIdentity(row._producto)
				product.setQuantity(row.cantidad)
				product.setPrice(row.precio)
				product.setName(row.nombre)
				movement.addItem(product)
			}
		)

		let binary = ''
		const bytes = new Uint8Array( this.#logo )
		const len = bytes.byteLength
		for(let i = 0; i < len; i++) {
			binary += String.fromCharCode( bytes[ i ] )
		}
		document.getElementById("custom-logo").src = `data:image/jpg;base64,${window.btoa( binary )}`

		document.getElementById("identidad").textContent = movement.getIdentity()
		document.getElementById("identidad-header").textContent = movement.getIdentity()
		document.getElementById("descuento").textContent = movement.getDiscount(true)
		document.getElementById("subtotal").textContent = movement.getTotal(true)
		document.getElementById("total").textContent = movement.getPayableAmount(true)
		document.getElementById("tipo").textContent = movement.getType() ? "Compra" : "Venta"
		document.getElementById("nombre").textContent = movement.getCustomer()
		document.getElementById("dni").textContent = movement.getDni()
		document.getElementById("nota").textContent = movement.getNote()
		document.getElementById("fecha").textContent = Move.getDate( movement.getTimestamp() )
		document.getElementById("hora").textContent = Move.getTime( movement.getTimestamp() )

		const list = document.getElementById("productos")
		for(const item of movement.getItems()) {
			const tr = list.insertRow()
			tr.insertCell().appendChild(document.createTextNode(item.getQuantity()))
			tr.insertCell().appendChild(document.createTextNode(item.getName()))
			tr.insertCell().appendChild(document.createTextNode(item.getPrice(true)))
		}
	}

	/**
	 * Search if index exists and go on.
	 */
	searchMovement(form) {
		const identity = parseInt(form.elements.identity.value.trim())
		if(isNaN(identity) || identity < 1) {
			Notiflix.Notify.warning("Se debe escribir un número natural.")
			return
		}

		let notFound = true
		const stmt = this.#db.prepare("SELECT EXISTS(SELECT 1 FROM movimiento WHERE id = $identity)")
		stmt.bind({$identity: identity})
		if(stmt.step()) {
			const row = stmt.get()
			if(row[0] == '1') {
				notFound = false
			}
		}
		stmt.free()

		if(notFound) {
			Notiflix.Notify.info("No existe el movimiento.")
			return
		}
		form.reset()

		app.navigate(`/movimientos-ver.html?movimiento=${identity}`)
	}
}
