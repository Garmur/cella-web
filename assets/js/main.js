"use strict"

let menu, animate
var app, cella

window.onload = async function() {
	Notiflix.Notify.init({position:"center-bottom"})
	Notiflix.Report.init({svgSize:"64px",plainText:false})

	// Initialize menu
	//-----------------
	let layoutMenuEl = document.querySelectorAll('#layout-menu')
	layoutMenuEl.forEach(function (element) {
		menu = new Menu(element, {
			orientation: 'vertical',
			closeChildren: false
		})
		// Change parameter to true if you want scroll animation
		window.Helpers.scrollToActive((animate = false))
		window.Helpers.mainMenu = menu
	})

	// Initialize menu togglers and bind click on each
	let menuToggler = document.querySelectorAll('.layout-menu-toggle')
	menuToggler.forEach(item => {
		item.addEventListener('click', event => {
			event.preventDefault()
			window.Helpers.toggleCollapsed()
		})
	})

	// Display menu toggle (layout-menu-toggle) on hover with delay
	let delay = function (elem, callback) {
		let timeout = null
		elem.onmouseenter = function () {
			// Set timeout to be a timer which will invoke callback after 300ms (not for small screen)
			if (!Helpers.isSmallScreen()) {
				timeout = setTimeout(callback, 300)
			} else {
				timeout = setTimeout(callback, 0)
			}
		}

		elem.onmouseleave = function () {
			// Clear any timers set to timeout
			document.querySelector('.layout-menu-toggle').classList.remove('d-block')
			clearTimeout(timeout)
		}
	}
	if (document.getElementById('layout-menu')) {
		delay(document.getElementById('layout-menu'), function () {
			// not for small screen
			if (!Helpers.isSmallScreen()) {
				document.querySelector('.layout-menu-toggle').classList.add('d-block')
			}
		})
	}

	// Display in main menu when menu scrolls
	let menuInnerContainer = document.getElementsByClassName('menu-inner'),
		menuInnerShadow = document.getElementsByClassName('menu-inner-shadow')[0]
	if (menuInnerContainer.length > 0 && menuInnerShadow) {
		menuInnerContainer[0].addEventListener('ps-scroll-y', function () {
			if (this.querySelector('.ps__thumb-y').offsetTop) {
				menuInnerShadow.style.display = 'block'
			} else {
				menuInnerShadow.style.display = 'none'
			}
		})
	}

	// Init helpers & misc
	// --------------------

	// Init BS Tooltip
	const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
	tooltipTriggerList.map(function (tooltipTriggerEl) {
		return new bootstrap.Tooltip(tooltipTriggerEl)
	})

	// Accordion active class
	const accordionActiveFunction = function (e) {
		if (e.type == 'show.bs.collapse' || e.type == 'show.bs.collapse') {
			e.target.closest('.accordion-item').classList.add('active')
		} else {
			e.target.closest('.accordion-item').classList.remove('active')
		}
	}

	const accordionTriggerList = [].slice.call(document.querySelectorAll('.accordion'))
	const accordionList = accordionTriggerList.map(function (accordionTriggerEl) {
		accordionTriggerEl.addEventListener('show.bs.collapse', accordionActiveFunction)
		accordionTriggerEl.addEventListener('hide.bs.collapse', accordionActiveFunction)
	})

	// Auto update layout based on screen size
	window.Helpers.setAutoUpdate(true)

	// Toggle Password Visibility
	window.Helpers.initPasswordToggle()

	// Speech To Text
	window.Helpers.initSpeechToText()

	cella = new Cella()

	let pMovementList = function(){}
	pMovementList.prototype = new senna.HtmlScreen()
	pMovementList.prototype.activate = function() {
		if(cella.isUsable()) {
			cella.listMovements(0)
			return
		}
		Notiflix.Notify.warning("Falta acceso a los archivos.")
	}

	let pProductList = function(){}
	pProductList.prototype = new senna.HtmlScreen()
	pProductList.prototype.activate = function() {
		if(cella.isUsable()) {
			cella.listProducts(0)
			return
		}
		Notiflix.Notify.warning("Falta acceso a los archivos.")
	}

	let pProductView = function(){}
	pProductView.prototype = new senna.HtmlScreen()
	pProductView.prototype.activate = function() {
		if(cella.isUsable()) {
			const productId = parseInt(new URLSearchParams(document.location.search).get("producto"))
			if(productId >= 0) {
				cella.viewProduct(productId)
			}
			else {
				Notiflix.Report.warning("Identidad inconsiste", "El índice interno del producto debe igual o mayor que cero.", "Aceptar")
			}
			return
		}
		Notiflix.Notify.warning("Falta acceso a los archivos.")
	}

	let pMovementView = function(){}
	pMovementView.prototype = new senna.HtmlScreen()
	pMovementView.prototype.activate = function() {
		if(cella.isUsable()) {
			const movementId = parseInt(new URLSearchParams(document.location.search).get("movimiento"))
			if(movementId >= 0) {
				cella.viewMovement(movementId)
			}
			else {
				Notiflix.Report.warning("Identidad inconsiste", "El índice interno del producto debe igual o mayor que cero.", "Aceptar")
			}
			return
		}
		Notiflix.Notify.warning("Falta acceso a los archivos.")
	}

	app = new senna.App()
	app.addSurfaces(["navegador", "lienzo"])
	app.addRoutes([
		new senna.Route("/", senna.HtmlScreen),
		new senna.Route("/index.html", senna.HtmlScreen),
		new senna.Route("/productos.html", pProductList),
		new senna.Route("/bloqueo.html", senna.HtmlScreen),
		new senna.Route("/configuracion.html", senna.HtmlScreen),
		new senna.Route("/movimientos.html", pMovementList),
		new senna.Route("/bloqueo.html", senna.HtmlScreen),
		new senna.Route("/productos-agregar.html", senna.HtmlScreen),
		new senna.Route(/productos-editar\.html\??(?:&?[^=&]*=[^=&]*)*/, pProductView),
		new senna.Route(/movimientos-ver\.html\??(?:&?[^=&]*=[^=&]*)*/, pMovementView),
		new senna.Route("/inventario.html", senna.HtmlScreen)
	])
	app.on("endNavigate", function(event) {
		if(event.error) {
			if(event.error.invalidStatus) {
				Notiflix.Report.info("Página no disponible","No se puede mostrar la página solicitada.<br>Tal vez no esté disponible por ahora.<br>Prueba navegando a otras secciones.", "Aceptar", function(){document.documentElement.classList.remove( app.getLoadingCssClass() )})
			}

			if(event.error.requestError) {
				Notiflix.Report.failure("Error de navegación","No se puede solicitar página.<br>Comprueba tu conexión a Internet.", "Aceptar", function(){document.documentElement.classList.remove( app.getLoadingCssClass() )})
			}

			if(event.error.timeout) {
				Notiflix.Report.warning("Demora en la red","No se pudo traer la página solicitada.<br>La conexión a Internet está tardando mucho.", "Aceptar", function(){document.documentElement.classList.remove( app.getLoadingCssClass() )})
			}
			return
		}
	})

	await cella.init()

	// Manage menu expanded/collapsed with templateCustomizer & local storage
	//------------------------------------------------------------------

	// If current layout is horizontal OR current window screen is small (overlay menu) than return from here
	if (window.Helpers.isSmallScreen()) {
		return
	}

	// If current layout is vertical and current window screen is > small

	// Auto update menu collapsed/expanded based on the themeConfig
	window.Helpers.setCollapsed(true, false)
}

function avoidSubmitting(e) {
	if((e.charCode || e.keyCode || 0) == 13) {
		e.preventDefault()
	}
}

let deferredPrompt = null
const addBtn = document.getElementById("instalador")
window.addEventListener("beforeinstallprompt", function(e) {
	e.preventDefault()
	deferredPrompt = e
	if(addBtn.classList.contains("d-none")) {
		addBtn.classList.remove("d-none")
		const instalabilizador = document.getElementById("instalabilizador")
		if(instalabilizador) {
			instalabilizador.classList.remove("d-none")
		}
	}

	addBtn.addEventListener("click", addToHome)
})

function addToHome(e) {
	const instalabilizador = document.getElementById("instalabilizador")
	if(instalabilizador) {
		instalabilizador.classList.add("d-none")
	}
	addBtn.classList.add("d-none")
	deferredPrompt.prompt()
	deferredPrompt.userChoice.then(function(choiceResult) {
		if(choiceResult.outcome === "accepted") {
			Notiflix.Report.success("Cella instalada", "Ahora estamos entre tus demás aplicaciones.<br>Toca el ícono de la caja amarilla para lanzar este simpático gestor de inventario.","Aceptar")
		}
		else {
			Notiflix.Report.info("Sin instalar", "Instálanos para estar estar siempre contigo. No ocupamos casi nada de espacio.", "Aceptar")
		}
		deferredPrompt = null
	})
}

if("serviceWorker" in navigator) {
	navigator.serviceWorker.register("/service-worker.js").then(function(reg) {
		reg.onupdatefound = function() {
			let installingWorker = reg.installing
			installingWorker.onstatechange = function() {
				switch (installingWorker.state) {
					case "installed":
						if(navigator.serviceWorker.controller) {
							console.log("Contenido nuevo o actualizado está disponible.")
						}
						else {
							console.log("El contenido está ahora disponible offline.")
						}
						break

					case "redundant":
						console.error("Se está repitiendo la instalación del service worker.")
						break
					}
				};
		}
		console.log("Fractuyo registrado")
	}).catch(function(e) {
		console.error("Error durante registro de SW:", e)
	})

}
