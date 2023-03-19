class Cella {
	#globalDirHandle

	constructor() {
		console.log("Cella started.")
	}

	async chooseDirHandle() {
		this.#globalDirHandle = await window.showDirectoryPicker()
	}
}
