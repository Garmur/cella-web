/**
 * For managing encrypted "sessions".
 * @ref https://www.tutorialspoint.com/html5/html5_indexeddb.htm
 */
var Storage = function(cella) {
	var db

	var request = window.indexedDB.open("business", 1)

	request.onerror = function(event) {
		Notiflix.Report.warning(event.target.error.message, "No se pudo leer lista de organizaciones.", "Aceptar")
		console.log("error:", event)
	}

	request.onsuccess = function(event) {
		db = request.result
		cella.listenStorageInit()
	}

	request.onupgradeneeded = function(event) {
		db = event.target.result;
		let objectStore = db.createObjectStore("session", {keyPath: "ruc"})
		objectStore.createIndex("ruc", "ruc", { unique: true })
	}

	this.add = function(oSession) {
		const request = db.transaction(["session"], "readwrite")
			.objectStore("session")
			.add(oSession)

		request.onsuccess = function(event) {
			Notiflix.Report.success("Datos guardados.", "Ahora podrás usar Cella con los datos proporcionados.", "Gracias")
		}

		request.onerror = function(event) {
			alert("No se pudo guardar la referencia en este navegador.");
		}
	}

	this.read = async function(ruc) {
		let objectStore = db.transaction(["session"]).objectStore("session")
		let request = objectStore.get(ruc)

		request.onerror = function(event) {
			alert("Unable to retrieve data from database!");
		}

		request.onsuccess = cella.handleUnlocked
	}

	this.readFirst = function() {
		var objectStore = db.transaction("session").objectStore("session");

		objectStore.openCursor().onsuccess = function(event) {
			var cursor = event.target.result

			if(cursor) {
				//~ alert("Name for id " + cursor.key + " is " + cursor.value.name + ", Age: " + cursor.value.age + ", Email: " + cursor.value.email);
				cella.setBusiness(cursor.value)
				objectStore.abort()
			}
			else {
				cella.setBusiness(null)
			}
		}
	}

	this.countRegisters = function(fnFull, fnEmpty) {
		const request = db.transaction(["session"], "readonly")
		const objectStore = request.objectStore("session")

		const myIndex = objectStore.index("ruc")
		const countRequest = myIndex.count()
		countRequest.onsuccess = () => {
			if(countRequest.result == 0) {
				fnEmpty()
			}
			else {
				fnFull(countRequest.result)
			}
		}
	}

	this.remove = function(ruc) {
		const request = db.transaction(["session"], "readwrite")
			.objectStore("session")
			.delete(ruc)

		request.onsuccess = function(event) {
			Notiflix.Notify.success("Directorio y RUC de " + ruc + " quitados.")
		}
	}
}
