// Load symbol dragging function when Window loads
var id = 0;
var markers = [];
iw = new google.maps.InfoWindow();
var mouseStartDrag = [0, 0];
var newMarker;
var activePointPin = [47, 128]; // = bottom center of the pin.  Change this value if the pin is changed
var map;
var overlay;
var iw;
var canvasLayer;
var resolutionScale = window.devicePixelRatio || 1;
overlay = new google.maps.OverlayView();
overlay.draw = function() {};
overlay.setMap(map);
elevator = new google.maps.ElevationService();
console.log("MGRS Mapper by James Pistell");
$(window).on('load', function() {
	function enableSymbolDragging() {
		// Enable the symbol preview to start dragging
		$('.draggable').draggable({
			revert: true,
			stack: ".draggable",
			helper: 'clone'
		});
		// Enable the map canvas to accept the drop
		$('#map').droppable({
			accept: ".draggable",
			drop: function(event, ui) {
				if (iw) iw.close(); //If there is an InfoWindow open, close it when a new element is dragged in
				document.getElementsByClassName("dragAndDropNotification")[0].style.display = "none"; //Remove drag and drop notification once the symbol has been dropped
				var zIndex = 0;
				var contentStr = [];
				var droppable = $(this);
				var draggable = ui.draggable;
				var coordinatesOverDiv = [event.clientX - $('#map').position().left, event.clientY - $('#map').position().top];
				// we don't want the mouse position, we want the position of the active point on the pin.
				coordinatesOverDiv = [
					coordinatesOverDiv[0] + activePointPin[0] - mouseStartDrag[0],
					coordinatesOverDiv[1] + activePointPin[1] - mouseStartDrag[1]
				];
				// ask Google to get the position, corresponding to a pixel on the map
				var pixelLatLng = overlay.getProjection().fromContainerPixelToLatLng(new google.maps.Point(coordinatesOverDiv[0], coordinatesOverDiv[1]));
				// set a new marker
				var getBase64 = $(".svg-symbol img").attr('src');
				var getNewHeight = $(".svg-symbol img").attr('height'); //gets the new Symbol Height from the resizer function in milsymbol-unit-generator.js
				var getNewWidth = $(".svg-symbol img").attr('width');
				image = new google.maps.MarkerImage(getBase64, null, null, null);
				var newMarker = new google.maps.Marker({
					map: map,
					position: pixelLatLng,
					draggable: true,
					icon: image,
					id: id++,
					optimized: false,
					zIndex: zIndex,
					funcid: document.getElementsByClassName("funcid")[0].innerText.split("-").slice(-2).reverse().join(", ") //Appends the Function ID to the infowindow for readability
				});
				markers.push(newMarker);

				newMarker.icon.scaledSize = new google.maps.Size(getNewWidth, getNewHeight);
				google.maps.event.addListener(newMarker, "click", function(e) {
					actual = newMarker;
					var lat = actual.getPosition().lat();
					var lng = actual.getPosition().lng();
					var theCurrentLatLon = "<div class='infowindow'><h6><span style='color: red;'>Lat/Lon: <\/span>" + lat.toFixed(6) + ", " + lng.toFixed(6) + "<\/h6><\/div>";
					var theCurrentMGRS = "<div class='MGRS'><h6><span style='color: red;'>MGRS: <\/span>" + USNG.LLtoUSNG(lat, lng, 5) + "<\/h6><\/div>";
					//This will send out the Lat/Lon and MGRS data into the InfoWindow
					iw.setContent(theCurrentLatLon + theCurrentMGRS);
					iw.open(map, this);
				});

				ga('send', 'event', {
						eventCategory: 'Marker',
						eventAction: 'Dropped',
						eventLabel: newMarker.funcid
				});
				//This listener is only for retreiving the Elevation
				google.maps.event.addListener(newMarker, 'click', function(event) {
					displayLocationElevation(event.latLng, elevator, iw);
				});
				// from https://jsfiddle.net/user2314737/j285Le70/
				function displayLocationElevation(location, elevator, iw) {
					// Initiate the location request
					elevator.getElevationForLocations({
						'locations': [location]
					}, function(results, status) {
						iw.setPosition(location);
						if (status === 'OK') {
							// Retrieve the first result
							if (results[0]) {
								var theCurrentElevation = "<div class='Elevation'><h6><span style='color: red;'>Elevation: <\/span>" + parseInt(results[0].elevation) + " meters<\/h6><\/div>";
								theCurrentElevation += "<h6><span style='color: red;'>Unit: <\/span>" + newMarker.funcid + "</h6>" // Append the function ID to the unit window!
								theCurrentElevation += "<input type = 'button' value = 'Delete' onclick = 'DeleteMarker(" + newMarker.id + ")'/>";
								var elem = document.querySelector(".MGRS");
								elem.innerHTML = elem.innerHTML + theCurrentElevation;
							} else {
								iw.setContent('No results found');
							}
						} else {
							iw.setContent('Elevation service failed due to: ' + status);
						}
					});
				}

				google.maps.event.addListener(newMarker, "dragstart", function() {
					actual = newMarker;
					if (actual == newMarker) iw.close();
					zIndex += 1;
					newMarker.setZIndex(zIndex);
				});
				google.maps.event.addListener(map, "click", function() {
					if (iw) iw.close(); //close the information window onclick
				});
				// Move draggable into droppable
				draggable.clone().appendTo(droppable);

			}
		});
	};
	// Run the function when the page loads.
	enableSymbolDragging();

	// Changes the label for "Symbol Modifier 2" to "Unit Size" when selected on everything except Ground Equipment. Makes everything more logical
	function changeLabel() {
		if (document.querySelector(".battle_dim").innerText === "Ground Equipment") {
			document.querySelector(".sym_mod_2").innerText = "Symbol Modifier 2";
		} else {
			document.querySelector(".sym_mod_2").innerText = "Unit Size";
		}
	}

	// Start an event listener on the right sidebar and look for MUTATATIONS
	// This will re-enable the drag function during any DOM change
	var listenNodes = document.querySelector('#toolbar');
	var observer = new MutationObserver(function(mutations) {
		mutations.forEach(function(mutation) {
			if (mutation.type == "attributes") {
				// Run the function if there is any DOM mutations on the right sidebar
				enableSymbolDragging();
				changeLabel();
			}
		});
	});
	observer.observe(listenNodes, {
		attributes: true,
		subtree: true,
	});
});

// Delete the marker by ID.
function DeleteMarker(id) {
	for (var i = 0; i < markers.length; i++) {
		if (markers[i].id == id) {
			markers[i].setMap(null);
			markers.splice(i, -1);
			return;
		}
	}
}
