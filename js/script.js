(function (obj) {
	//get fileSystemObject from JavaScript library
	zip.workerScriptsPath = "./js/";
	var requestFileSystem = obj.webkitRequestFileSystem || obj.mozRequestFileSystem || obj.requestFileSystem;
	function onerror(message) {
		console.log("error", message)
	}

	function createTempFile(callback) {
		var tmpFilename = "tmp.zip";
		requestFileSystem(TEMPORARY, 4 * 1024 * 1024 * 1024, function (filesystem) {
			function create() {
				filesystem.root.getFile(tmpFilename, {
					create: true
				}, function (zipFile) {
					callback(zipFile);
				});
			}

			filesystem.root.getFile(tmpFilename, null, function (entry) {
				entry.remove(create, create);
			}, create);
		});
	}

	var model = (function () {
		var zipFileEntry, zipWriter, writer, creationMethod, URL = obj.webkitURL || obj.mozURL || obj.URL;

		return {
			setCreationMethod: function (method) {
				creationMethod = method;
			},
			addFiles: function addFiles(files, oninit, onadd, onprogress, onend) {
				var addIndex = 0;
				
				function nextFile() {
					var file = files[addIndex];
					onadd(file);
					//add each selected files to be zipped
					zipWriter.add(file.name, new zip.BlobReader(file), function () {
						addIndex++;
						if (addIndex < files.length)
							nextFile();
						else
							onend();
					}, onprogress);
				}

				function createZipWriter() {
					zip.createWriter(writer, function (writer) {
						zipWriter = writer;
						oninit();
						nextFile();
					}, onerror);
				}

				if (zipWriter)
					nextFile();
				else if (creationMethod == "Blob") {
					writer = new zip.BlobWriter();
					createZipWriter();
				} 
			},
			getBlobURL: function (callback) {
				zipWriter.close(function (blob) {
					var blobURL = creationMethod == "Blob" ? URL.createObjectURL(blob) : zipFileEntry.toURL();
					callback(blobURL);
					zipWriter = null;
				});
			},
			getBlob: function (callback) {
				zipWriter.close(callback);
			}
		};
	})();

	(function () {
		var fileInput = document.getElementById("file-input");
		var zipProgress = document.createElement("progress");
		var downloadButton = document.getElementById("download-button");
		var fileList = document.getElementById("file-list");
		var filenameInput = document.querySelector("input[name=ziptype]:checked");
		model.setCreationMethod("Blob");
		fileInput.addEventListener('change', function () {
			fileInput.disabled = true;
			model.addFiles(fileInput.files, function () {}, function (file) {
				var li = document.createElement("li");
				zipProgress.value = 0;
				zipProgress.max = 0;
				li.textContent = file.name;
				li.appendChild(zipProgress);
				fileList.appendChild(li);
			}, function (current, total) {
				zipProgress.value = current;
				zipProgress.max = total;
			}, function () {
				if (zipProgress.parentNode)
					zipProgress.parentNode.removeChild(zipProgress);
				fileInput.value = "";
				fileInput.disabled = false;
			});
		}, false);

		model.setCreationMethod("Blob");

		downloadButton.addEventListener("click", function (event) {
			var archiveName = "ArchivedFiles";
			var fileExtension;
			if (document.querySelector('#zip').checked) {
				fileExtension = document.querySelector('#zip').value
			} else if (document.querySelector('#rar').checked) {
				fileExtension = document.querySelector('#rar').value
			}
			var target = event.target,
				entry;
			if (!downloadButton.download) {
					model.getBlobURL(function (blobURL) {
					var clickEvent;
					clickEvent = document.createEvent("MouseEvent");
					clickEvent.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
					downloadButton.href = blobURL;
					downloadButton.download = archiveName + '.' + fileExtension;
					downloadButton.dispatchEvent(clickEvent);
				});
				location.reload();
				event.preventDefault();
			}
		}, false);

	})();

})(this);