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
