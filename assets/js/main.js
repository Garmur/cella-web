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
		new senna.Route(/movimientos-ver\.html\??(?:&?[^=&]*=[^=&]*)*/, pMovementView)
	])

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
