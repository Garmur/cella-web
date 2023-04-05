class Item {
	#identity
	#sku
	#name
	#description
	#price
	#quantity

	setIdentity(identity) {
		if(isNaN(identity)) {
			throw new Error("El índice debe ser numérico.")
		}

		this.#identity = identity
	}

	getIdentity = function() {
		return this.#identity
	}

	setPrice(price) {
		if(isNaN(price)) {
			throw new Error("Precio de producto debe ser numérico.")
		}

		if(price <= 0) {
			throw new Error("Precio de producto es cero o menor que cero.")
		}

		this.#price = price
	}

	getPrice = function(withFormat) {
		return withFormat ? this.#price.toFixed(2) : this.#price
	}

	setDescription(description) {
		this.#description = description
	}

	getDescription() {
		return this.#description
	}

	setName(name) {
		if( ( typeof name === "string" || name instanceof String ) && name.length > 0 ) {
			this.#name = name
			return
		}
		throw new Error("No hay nombre válido.")
	}

	getName() {
		return this.#name
	}

	setSku(sku) {
		if( ( typeof sku === "string" || sku instanceof String ) && sku.length > 0 ) {
			this.#sku = sku
			return
		}
		throw new Error("Código único no válido.")
	}

	getSku() {
		return this.#sku
	}

	/**
	 * It can be zero or less.
	 */
	setQuantity(quantity) {
		if(isNaN(quantity)) {
			throw new Error("La cantidad debe ser numérica.")
		}

		this.#quantity = quantity
	}

	getQuantity = function() {
		return this.#quantity
	}
}

class Move {
	#identity

	#total = 0
	#discount = 0
	#items = Array()

	/** Customer */
	#dni
	#customer
	#note

	#configuration

	getConfiguration() {
		return this.#configuration
	}

	setType(type) {
		this.#configuration = this.#configuration & ~1 | (type & 1)
	}

	getType() {
		return this.#configuration & 1
	}

	setIdentity(identity) {
		this.#identity = identity
	}

	getIdentity(identity) {
		return this.#identity
	}

	setNote(note) {
		this.#note = note
	}

	getNote() {
		return this.#note
	}

	addItem(item) {
		this.#items.push(item)
		this.#total = 0
	}

	getItems() {
		return this.#items
	}

	setDiscount(discount) {
		this.#discount = discount
	}

	getDiscount(withFormat = false) {
		return withFormat ? this.#discount.toFixed(2) : this.#discount
	}

	getTotal(withFormat = false) {
		if(this.#total != 0) {
			return withFormat ? this.#total.toFixed(2) : this.#total
		}

		for(const item of this.#items) {
			this.#total += item.getPrice() * item.getQuantity()
		}

		return withFormat ? this.#total.toFixed(2) : this.#total
	}

	getPayableAmount(withFormat = false) {
		return withFormat ? (this.#total - this.discount).toFixed(2) : this.#total - this.#discount
	}

	setCustomer(dni, name) {
		this.#dni = dni
		this.#customer = name
	}

	getDni() {
		return this.#dni
	}

	getCustomer() {
		return this.#customer
	}
}
