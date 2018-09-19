/*
 * Library to convert between NAD83 Lat/Lon and US National Grid
 * Maintained at https://github.com/klassenjs/usng_tools
 *
 * License:
 * 
 * Copyright (c) 2008-2013 James Klassen
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the 'Software'), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies of this Software or works derived from this Software.
 * 
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

/* TODO: Norway and others odd grid
 *       UTM as hash instead of function?
 *       More tolerant of extended zones in UPS zones?
 *       Return box instead of point?
 *       Return list of coordinates w/distances for truncated search as well as best.
 *       Internalize UPS projection (remove proj4js dependency).
 *       
 */

window.USNG2 = function() {
	// Note: grid locations are the SW corner of the grid square (because easting and northing are always positive)
	//                   0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19   x 100,000m northing
	var NSLetters135 = ['A','B','C','D','E','F','G','H','J','K','L','M','N','P','Q','R','S','T','U','V'];
	var NSLetters246 = ['F','G','H','J','K','L','M','N','P','Q','R','S','T','U','V','A','B','C','D','E'];

	//                  1   2   3   4   5   6   7   8   x 100,000m easting
	var EWLetters14 = ['A','B','C','D','E','F','G','H'];
	var EWLetters25 = ['J','K','L','M','N','P','Q','R'];
	var EWLetters36 = ['S','T','U','V','W','X','Y','Z'];

	//                  -80  -72  -64  -56  -48  -40  -32  -24  -16  -8    0    8   16   24   32   40   48   56   64   72   (*Latitude) 
  //                                                                                                 Handle oddball zone 80-84
	var GridZones    = ['C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'X'];
	var GridZonesDeg = [-80, -72, -64, -56, -48, -40, -32, -24, -16, -8,   0,   8,  16,  24,  32,  40,  48,  58,  64,  72,  80];
	
	// TODO: This is approximate and actually depends on longitude too.
	var GridZonesNorthing = new Array(20);	
	for(var i = 0 ; i < 20; i++) {
		GridZonesNorthing[i] = 110946.259 * GridZonesDeg[i]; // == 2 * PI * 6356752.3 * (latitude / 360.0)
	}

	// Grid Letters for UPS
	//                 0    1    2    3    4    5    6    7    8    9   10   11   12   13   14   15   16   17
  var XLetters  = [ 'A', 'B', 'C', 'F', 'G', 'H', 'J', 'K', 'L', 'P', 'Q', 'R', 'S', 'T', 'U', 'X', 'Y', 'Z' ];
	var YNLetters = [ 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'A', 'B', 'C', 'D', 'E', 'F', 'G' ];
	var YSLetters = [ 'N', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
	                  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M' ];
	

	// http://en.wikipedia.org/wiki/Great-circle_distance
	// http://en.wikipedia.org/wiki/Vincenty%27s_formulae 
	this.llDistance = function(ll_start, ll_end)
	{
		var lat_s = ll_start.lat * Math.PI / 180;
		var lat_f = ll_end.lat * Math.PI / 180;
		var d_lon = (ll_end.lon - ll_start.lon) * Math.PI / 180;
		return( Math.atan2( Math.sqrt( Math.pow(Math.cos(lat_f) * Math.sin(d_lon),2) + Math.pow(Math.cos(lat_s)*Math.sin(lat_f) - Math.sin(lat_s)*Math.cos(lat_f)*Math.cos(d_lon),2)) ,
							Math.sin(lat_s)*Math.sin(lat_f) + Math.cos(lat_s)*Math.cos(lat_f)*Math.cos(d_lon) )
				);
	}

	/* Returns a USNG String for a UTM point, and zone id's, and precision
	 * utm_zone => 15 ; grid_zone => 'T' (calculated from latitude); 
	 * utm_easting => 491000, utm_northing => 49786000; precision => 2 
	 */
	this.fromUTM = function(utm_zone, grid_zone, utm_easting, utm_northing, precision) {
		var utm_zone;
		var grid_zone;
		var grid_square;
		var grid_easting;
		var grid_northing;
		var precision;
		
		var grid_square_set = utm_zone % 6;
		
		var ew_idx = Math.floor(utm_easting / 100000) - 1; // should be [100000, 900000]
		var ns_idx = Math.floor((utm_northing % 2000000) / 100000); // should [0, 10000000) => [0, 2000000)
		if(ns_idx < 0) { /* handle southern hemisphere */
			ns_idx += 20;
		}
		switch(grid_square_set) {
			case 1:
				grid_square = EWLetters14[ew_idx] + NSLetters135[ns_idx];
				break;
			case 2:
				grid_square = EWLetters25[ew_idx] + NSLetters246[ns_idx];
				break;
			case 3:
				grid_square = EWLetters36[ew_idx] + NSLetters135[ns_idx];
				break;
			case 4:
				grid_square = EWLetters14[ew_idx] + NSLetters246[ns_idx];
				break;
			case 5:
				grid_square = EWLetters25[ew_idx] + NSLetters135[ns_idx];
				break;
			case 0: // Calculates as zero, but is technically 6 */
				grid_square = EWLetters36[ew_idx] + NSLetters246[ns_idx];
				break;
			default:
				throw("USNG: can't get here");
		}

		
		// Calc Easting and Northing integer to 100,000s place
		var easting  = Math.floor(utm_easting % 100000).toString();
		var northing = Math.floor(utm_northing % 100000);
		if(northing < 0) {
			// TODO: Does this switch to southing or is 1m south of the equator 99999?
			northing += 100000;
			//northing = -northing;
		}
		northing = northing.toString();

		// Pad up to meter precision (5 digits)
		while(easting.length < 5) easting = '0' + easting;
		while(northing.length < 5) northing = '0' + northing;
		
		if(precision > 5) {
			// Calculate the fractional meter parts
			var digits = precision - 5;
			grid_easting  = easting + (utm_easting % 1).toFixed(digits).substr(2,digits);
			grid_northing = northing + (utm_northing % 1).toFixed(digits).substr(2,digits);		
		} else {
			// Remove unnecessary digits
			grid_easting  = easting.substr(0, precision);
			grid_northing = northing.substr(0, precision);
		}
		
		var usng_string = String(utm_zone) + grid_zone + " " + grid_square + " " + grid_easting + " " + grid_northing; 
		return(usng_string);
	}

	// Calculate UTM easting and northing from full, parsed USNG coordinate
	this.toUTMFromFullParsedUSNG = function(utm_zone, grid_zone, grid_square, grid_easting, grid_northing, precision, strict)
	{
		var utm_easting = 0;
		var utm_northing = 0;

		var grid_square_set = utm_zone % 6;
		var ns_grid;
		var ew_grid;
		switch(grid_square_set) {
			case 1:
				ns_grid = NSLetters135;
				ew_grid = EWLetters14;
				break;
			case 2:
				ns_grid = NSLetters246;
				ew_grid = EWLetters25;
				break;
			case 3:
				ns_grid = NSLetters135;
				ew_grid = EWLetters36;
				break;
			case 4:
				ns_grid = NSLetters246;
				ew_grid = EWLetters14;
				break;
			case 5:
				ns_grid = NSLetters135;
				ew_grid = EWLetters25;
				break;
			case 0: // grid_square_set will == 0, but it is technically group 6 
				ns_grid = NSLetters246;
				ew_grid = EWLetters36;
				break;
			default:
				throw("Can't get here");
		}
		var ew_idx = ew_grid.indexOf(grid_square[0]);
		var ns_idx = ns_grid.indexOf(grid_square[1]);
		
		if(ew_idx == -1 || ns_idx == -1)
			throw("USNG: Invalid USNG 100km grid designator for UTM zone " + utm_zone + ".");
			//throw(RangeError("USNG: Invalid USNG 100km grid designator."));
		
		utm_easting = ((ew_idx + 1) * 100000) + grid_easting; // Should be [100,000, 900,000]
		utm_northing = ((ns_idx + 0) * 100000) + grid_northing; // Should be [0, 2,000,000)

		// TODO: this really depends on easting too...
		// At this point know UTM zone, Grid Zone (min latitude), and easting
		// Right now this is look up table returns a max number based on lon == utm zone center 	
		var min_northing = GridZonesNorthing[GridZones.indexOf(grid_zone)]; // Unwrap northing to ~ [0, 10000000]
		utm_northing += 2000000 * Math.ceil((min_northing - utm_northing) / 2000000);

		// Check that the coordinate is within the utm zone and grid zone specified:
		var ll = utm_proj.invProj(utm_zone, utm_easting, utm_northing);
		var ll_utm_zone = Math.floor((ll.lon - (-180.0)) / 6.0) + 1;
		var ll_grid_zone = GridZones[Math.floor((ll.lat - (-80.0)) / 8)];

		// If error from the above TODO mattered... then need to move north a grid
		if( ll_grid_zone != grid_zone) {
			utm_northing -= 2000000;
			ll = utm_proj.invProj(utm_zone, utm_easting, utm_northing);
			ll_utm_zone = Math.floor((ll.lon - (-180.0)) / 6.0) + 1;
			ll_grid_zone = GridZones[Math.floor((ll.lat - (-80.0)) / 8)];
		}

		if(strict) {
			if(ll.lat > 84.0 || ll.lat < -80.0)
				throw("USNG: Latitude " + ll.lat + " outside valid UTM range.");
			if(ll_utm_zone != utm_zone)
				throw("USNG: calculated coordinate not in correct UTM zone! Supplied: "+utm_zone+grid_zone+" Calculated: "+ll_utm_zone+ll_grid_zone);
			if(ll_grid_zone != grid_zone)
				throw("USNG: calculated coordinate not in correct grid zone! Supplied: "+utm_zone+grid_zone+" Calculated: "+ll_utm_zone+ll_grid_zone);
		} else {
			// Loosen requirements to allow for grid extensions that don't introduce ambiguity.
		
			// "The UTM grid extends to 80°30'S and 84°30'N, providing a 30-minute overlap with the UPS grid."
			// -- http://earth-info.nga.mil/GandG/publications/tm8358.1/tr83581b.html Section 2-6.3.1
			if(ll.lat > 84.5 || ll.lat < -79.5)
				throw("USNG: Latitude " + ll.lat + " outside valid UTM range.");

			// 100km grids E-W unique +/- 2 UTM zones of the correct UTM zone.
			// 100km grids unique for 800,000m in one UTM zone.
			// Thus, two limiting conditions for uniqueness:
			//		UTM zone max width = 665,667m at equator => 800,000m is 1.2 UTM 6* zones wide at 0*N. => 67000m outside zone.
			//			=> utm_easting in [100,000, 900,000] (800,000m wide centered at 500,000m (false easting) 
			//		UTM zone min width = 63,801m at 84.5* N. => 12 UTM 6* zones.  => 2 UTM zones.
			if(utm_easting < 100000 || utm_easting > 900000)
				throw("USNG: calculated coordinate not in correct UTM zone! Supplied: "+utm_zone+grid_zone+" Calculated: "+ll_utm_zone+ll_grid_zone);
			var utm_zone_diff = Math.abs(ll_utm_zone - utm_zone);
			if(utm_zone_diff > 2 && utm_zone_diff < 58) // utm_zone wraps 1..60,1
				throw("USNG: calculated coordinate not in correct UTM zone! Supplied: "+utm_zone+grid_zone+" Calculated: "+ll_utm_zone+ll_grid_zone);

			// 100km grids N-S unique +/- 2,000,000 meters
			// A grid zone is roughly 887,570 meters N-S
			// => unique +/- 1 grid zone.
			var ll_idx = NSLetters135.indexOf(ll_grid_zone); // 135 or 246 doesn't matter
			var gz_idx = NSLetters135.indexOf(grid_zone);    // letters in same order and circular subtraction.
			var gz_diff  = Math.abs(ll_idx - gz_idx);
			if(gz_diff > 1 && gz_diff < 19)
				throw("USNG: calculated coordinate not in correct grid zone! Supplied: "+utm_zone+grid_zone+" Calculated: "+ll_utm_zone+ll_grid_zone);
		}

		var usng_string = String(utm_zone) + grid_zone + " " + grid_square + " " + grid_easting + " " + grid_northing;
		return { zone : utm_zone, easting : utm_easting, northing : utm_northing, precision : precision, usng: usng_string };	
	}

	/* Method to convert a USNG coordinate string into a NAD83/WGS84 LonLat Point 
	 * First parameter: usng = A valid USNG coordinate string (possibly truncated)
	 *	Possible cases:
	 *		Full USNG: 14TPU3467
	 *		Truncated:   TPU3467
	 *		Truncated:    PU3467
	 *		Truncated:      3467
	 *		Truncated: 14TPU
	 *		Truncated: 14T
	 *		Truncated:    PU
	 * Second parameter: a LonLat point to use to disambiguate a truncated USNG point
	 * Returns: The LonLat point
	 */ 
	this.toUTM = function(usng, initial_lonlat, strict) {
		// Parse USNG into component parts
		var easting = 0;
		var northing = 0;
		var precision = 0;

		var digits = ""; /* don't really need this if using call to parsed... */
		var grid_square = null;
		var grid_zone = null;
		var utm_zone = null;
		
		// Remove Whitespace (shouldn't be any)
		usng = usng.replace(/ /g, "");

		// Strip Coordinate values off of end, if any
		// This will be any trailing digits.
		re = new RegExp("([0-9]+)$");
		fields = re.exec(usng);
		if(fields) {
			digits = fields[0];
			precision = digits.length / 2; // TODO: throw an error if #digits is odd.
			var scale_factor = Math.pow(10, (5 - precision)); // 1 digit => 10k place, 2 digits => 1k ...
			easting = Number(digits.substr(0, precision)) * scale_factor;
			northing = Number(digits.substr(precision, precision)) * scale_factor;
		}
		usng = usng.substr(0, usng.length-(precision*2));

		// Get 100km Grid Designator, if any
		var re = new RegExp("([A-Z][A-Z]$)");
		var fields = re.exec(usng);
		if(fields) {
			grid_square = fields[0];
		}
		usng = usng.substr(0, usng.length - 2);

		// Get UTM and Grid Zone
		re = new RegExp("([0-9]+)([A-Z])");
		fields = re.exec(usng);
		if(fields) {
			utm_zone = fields[1];
			grid_zone = fields[2];
		}
		// Allow the number-less A,B,Y,Z UPS grid zones
		if(!utm_zone) {
			re = new RegExp("([A-Z])");
			fields = re.exec(usng);
			if(fields)
				grid_zone = fields[1];
		}

		// Use lonlat Point as approx Location to fill in missing prefix info
		// Note: actual prefix need not be the same as that of the llPoint (we could cross 100km grid squares, utm zones, etc.)
		// Our job is to find the closest point to the llPoint given what we know about the USNG point.

		// Calculate the UTM zone, easting and northing from what we know
		
		/* Method: we can only guess missing prefix information so our cases are:
		 * We have everything (14TPU)
		 * We are missing the UTM zone (PU)
		 * We are missing the UTM zone and the grid designator
		 * TODO: Need to throw an exception if utm_zone and no grid_zone as invalid
		 * TODO: Also need to throw an exception if don't have at least one of grid_zone and coordinate...maybe
		 * TODO: Error if grid_zone is not in GridZones
		 */	

		if(utm_zone && grid_zone && grid_square) {
			; // We have everything so there is nothing more to do, UTM.
		} else if((grid_zone == "A" || grid_zone == "B" || grid_zone == "Y" || grid_zone == "Z") && grid_square) {
			; // We have everything so there is nothing more to do, UPS.
		} else if(grid_square && initial_lonlat) {
			// We need to find the utm_zone and grid_zone
			// We know the grid zone so first we need to find the closest matching grid zone
			// to the initial point. Then add in the easting and northing (if any).
			//throw("USNG: Truncated coordinate support not implemented");
			
			// Linear search all possible points (TODO: try to put likely guesses near top of list)
			var min_arc_distance = 1000;
			var min_utm_zone  = null;
			var min_grid_zone = null;
			
			var ll_utm_zone = Math.floor((initial_lonlat.lon - (-180.0)) / 6.0) + 1;
			var ll_grid_zone_idx = Math.floor((initial_lonlat.lat - (-80.0)) / 8); 

			// Check the min ranges that need to be searched based on the spec.
			// Need to wrap UTM zones mod 60
			for(utm_zone = ll_utm_zone - 1; utm_zone <= ll_utm_zone+1; utm_zone++) { // still true at 80*?
				for(var grid_zone_idx = 0; grid_zone_idx < 20; grid_zone_idx++) {
					grid_zone = GridZones[grid_zone_idx];
					try {
						var result = this.toLonLat((utm_zone%60) + grid_zone + grid_square + digits, null, true); // usng should be [A-Z][A-Z][0-9]+

						var arc_distance = this.llDistance(initial_lonlat, result);
						//console.log(utm_zone + grid_zone + grid_square + digits + " " + arc_distance);
						if(arc_distance < min_arc_distance) {
							min_arc_distance = arc_distance;
							min_utm_zone = utm_zone % 60;
							min_grid_zone = grid_zone;
						}
					} catch(e) {
						;//console.log("USNG: upstream: "+e); // catch range errors and ignore
					}
				}
			}
			// Search UPS zones
			var ups_zones;
			if(initial_lonlat.lat > 0)
				ups_zones = ['Y', 'Z'];
			else
				ups_zones = ['A', 'B'];
			for(var grid_zone_idx in ups_zones) {
				grid_zone = ups_zones[grid_zone_idx];
				try {
					var result = this.toLonLat(grid_zone + grid_square + digits, null, true); // usng should be [A-Z][A-Z][0-9]+

					var arc_distance = this.llDistance(initial_lonlat, result);
					//console.log(grid_zone + grid_square + digits + " " + arc_distance);
					if(arc_distance < min_arc_distance) {
						min_arc_distance = arc_distance;
						min_utm_zone = null;
						min_grid_zone = grid_zone;
					}
				} catch(e) {
					;//console.log("USNG: upstream: "+e); // catch range errors and ignore
				}
			}
				
			if(min_grid_zone) {
				utm_zone = min_utm_zone;
				grid_zone = min_grid_zone;
			} else {
				throw("USNG: Couldn't find a match");
			}
		} else if(initial_lonlat) {
			// We need to find the utm_zone, grid_zone and 100km grid designator
			// Find the closest grid zone within the specified easting and northing
			// Note: may cross UTM zone boundaries!
			// Linear search all possible points (TODO: try to put likely guesses near top of list)
			var min_arc_distance = 1000;
			var min_utm_zone  = null;
			var min_grid_zone = null;
			var min_grid_square = null;
			
			var ll_utm_zone = Math.floor((initial_lonlat.lon - (-180.0)) / 6.0) + 1;
			var ll_grid_zone_idx = Math.floor((initial_lonlat.lat - (-80.0)) / 8); 

			// Check the min ranges that need to be searched based on the spec.
			for(utm_zone = ll_utm_zone-1; utm_zone <= ll_utm_zone+1; utm_zone++) { // still true at 80*?
				for(var grid_zone_idx = ll_grid_zone_idx - 1; grid_zone_idx <= ll_grid_zone_idx + 1; grid_zone_idx++) {
					grid_zone = GridZones[grid_zone_idx];
					var grid_square_set = utm_zone % 6;
					var ns_grid;
					var ew_grid;
					switch(grid_square_set) {
						case 1:
							ns_grid = NSLetters135;
							ew_grid = EWLetters14;
							break;
						case 2:
							ns_grid = NSLetters246;
							ew_grid = EWLetters25;
							break;
						case 3:
							ns_grid = NSLetters135;
							ew_grid = EWLetters36;
							break;
						case 4:
							ns_grid = NSLetters246;
							ew_grid = EWLetters14;
							break;
						case 5:
							ns_grid = NSLetters135;
							ew_grid = EWLetters25;
							break;
						case 0: // grid_square_set will == 0, but it is technically group 6 
							ns_grid = NSLetters246;
							ew_grid = EWLetters36;
							break;
						default:
							throw("Can't get here");
					}
					//console.log(utm_zone + grid_zone);
					for(var ns_idx = 0; ns_idx < 20; ns_idx++) {
						for(var ew_idx = 0; ew_idx < 8; ew_idx++) {
							try {
								grid_square = ew_grid[ew_idx]+ns_grid[ns_idx];
								var result = this.toLonLat((utm_zone%60) + grid_zone + grid_square + digits, null, true); // usng should be [A-Z][A-Z][0-9]+

								var arc_distance = this.llDistance(initial_lonlat, result);
								//console.log(utm_zone + grid_zone + grid_square + digits + " " + arc_distance);
								if(arc_distance < min_arc_distance) {
									min_arc_distance = arc_distance;
									min_utm_zone = utm_zone % 60;
									min_grid_zone = grid_zone;
									min_grid_square = grid_square;
								}
							} catch(e) {
								; //console.log("USNG: upstream: "+e); // catch range errors and ignore
							}
						}
					}
				}
			}
			// Search UPS zones
			var ups_zones;
			var y_zones;
			var y_max;
			if(initial_lonlat.lat > 0) { 
				ups_zones = ['Y', 'Z'];
				y_zones = YNLetters;
				y_max = 14;
			} else {
				ups_zones = ['A', 'B'];
				y_zones = YSLetters;
				y_max = 24;
			}
			for(var grid_zone_idx in ups_zones) {
				grid_zone = ups_zones[grid_zone_idx];

				for(var y_idx = 0; y_idx < y_max; y_idx++) {
					for(var x_idx = 0; x_idx < 18; x_idx++) {
						try {
							grid_square = XLetters[x_idx]+y_zones[y_idx];
							var result = this.toLonLat(grid_zone + grid_square + digits, null, true); // usng should be [A-Z][A-Z][0-9]+

							var arc_distance = this.llDistance(initial_lonlat, result);
							//console.log(grid_zone + grid_square + digits + " " + arc_distance);
							if(arc_distance < min_arc_distance) {
								min_arc_distance = arc_distance;
								min_utm_zone = null;
								min_grid_zone = grid_zone;
								min_grid_square = grid_square;
							}
						} catch(e) {
							; //console.log("USNG: upstream: "+e); // catch range errors and ignore
						}
					}
				}
			}
				
			if(min_grid_zone) {
				utm_zone = min_utm_zone;
				grid_zone = min_grid_zone;
				grid_square = min_grid_square;
			} else {
				throw("USNG: Couldn't find a match");
			}

		} else {
			throw("USNG: Not enough information to locate point.");
		}

		if(grid_zone == "A" || grid_zone == "B" || grid_zone == "Y" || grid_zone == "Z")
			return(this.toUPSFromFullParsedUSNG(grid_zone, grid_square, easting, northing, precision));
		else
			return(this.toUTMFromFullParsedUSNG(utm_zone, grid_zone, grid_square, easting, northing, precision, strict));
	}


	this.fromUPS = function(grid_zone, ups_x, ups_y, precision)
	{
		if(! ((grid_zone == "A") || (grid_zone == "B") || (grid_zone == "Y") || (grid_zone == "Z")))
			throw( "UPS only valid in zones A, B, Y, and Z" );

		var grid_square;
	
		var grid_square_x_idx = Math.floor((ups_x - 2000000) / 100000);
		var grid_square_y_idx = Math.floor((ups_y - 2000000) / 100000);

		if(grid_square_x_idx < 0)
			grid_square_x_idx += 18;
		
		if(grid_zone == "A" || grid_zone == "B") { // south
			if(grid_square_y_idx < 0)
				grid_square_y_idx += 24;

			grid_square = XLetters[grid_square_x_idx] + YSLetters[grid_square_y_idx];
		} else { // north
			if(grid_square_y_idx < 0)
				grid_square_y_idx += 14;

			grid_square = XLetters[grid_square_x_idx] + YNLetters[grid_square_y_idx];
		}
	
		// Calc X and Y integer to 100,000s place
		var x = Math.floor(ups_x % 100000).toString();
		var y = Math.floor(ups_y % 100000).toString();

		// Pad up to meter precision (5 digits)
		while(x.length < 5) x = '0' + x;
		while(y.length < 5) y = '0' + y;

		if(precision > 5) {
			// Calculate the fractional meter parts
			var digits = precision - 5;
			grid_x  = x + (ups_x % 1).toFixed(digits).substr(2,digits);
			grid_y = y + (ups_y % 1).toFixed(digits).substr(2,digits);		
		} else {
			// Remove unnecessary digits
			grid_x  = x.substr(0, precision);
			grid_y = y.substr(0, precision);
		}
	
		return grid_zone + " " + grid_square + " " + grid_x + " " + grid_y;
	}


	this.toUPSFromFullParsedUSNG = function(grid_zone, grid_square, grid_x, grid_y, precision)
	{
		if(!Proj4js)
			throw("USNG: Zones A,B,Y, and Z require Proj4js.");
	
		/* Start at the pole */
		var ups_x = 2000000;
		var ups_y = 2000000;

		/* Offset based on 100km grid square */
		var x_idx = XLetters.indexOf(grid_square[0]);
		if(x_idx < 0)
			throw("USNG: Invalid grid square.");
		var y_idx;
		switch(grid_zone) {
			case 'A': // South West half-hemisphere
				x_idx = x_idx - 18;
			case 'B': // South East half-hemisphere
				y_idx = YSLetters.indexOf(grid_square[1]);
				if(x_idx < -12 || x_idx > 11 || y_idx < 0)
					throw("USNG: Invalid grid square.");

				if(y_idx > 11)
					y_idx = y_idx - 24;
				break;

			case 'Y': // North West half-hemisphere
				x_idx = x_idx - 18;
			case 'Z': // North East half-hemisphere
				y_idx = YNLetters.indexOf(grid_square[1]);
				if(x_idx < -7 || x_idx > 6 || y_idx < 0)
					throw("USNG: Invalid grid square.");

				if(y_idx > 6)
					y_idx = y_idx - 14;
				break;

			default:
				throw( "UPS only valid in zones A, B, Y, and Z" );
		};
		//console.log(x_idx, y_idx);
		ups_x += x_idx * 100000;
		ups_y += y_idx * 100000;

		/* Offset based on grid_x,y */
		ups_x += grid_x;
		ups_y += grid_y;

		// Check that the coordinate is within the ups zone and grid zone specified:
		var ll = { x: ups_x, y: ups_y };
		if(grid_zone == "A" || grid_zone == "B") {
			Proj4js.transform(south_proj, ll_proj, ll);
			if(ll.y > -80.0)
				throw("USNG: Grid Zone A or B but Latitude > -80.");
		} else {
			Proj4js.transform(north_proj, ll_proj, ll);
			if(ll.y < 84.0)
				throw("USNG: Grid Zone Y or Z but Latitude < 84.");
		}

		var usng_string = grid_zone + " " + grid_square + " " + grid_x + " " + grid_y;
		return { grid_zone : grid_zone, x : ups_x, y : ups_y, precision : precision, usng: usng_string };	
	}


	// Converts a lat, lon point (NAD83) into a USNG coordinate string
	// of precision where precision indicates the number of digits used
	// per coordinate (0 = 100,000m, 1 = 10km, 2 = 1km, 3 = 100m, 4 = 10m, ...)
	this.fromLonLat = function(lonlat, precision) {
		var lon = lonlat.lon;
		var lat = lonlat.lat;

		// Normalize Latitude and Longitude
		while(lon < -180) {
			lon += 180;
		}
		while(lon > 180) {
			lon -= 180;
		}
		
		// Calculate UTM Zone number from Longitude
		// -180 = 180W is grid 1... increment every 6 degrees going east
		// Note [-180, -174) is in grid 1, [-174,-168) is 2, [174, 180) is 60 
		var utm_zone = Math.floor((lon - (-180.0)) / 6.0) + 1;
		
		// Calculate USNG Grid Zone Designation from Latitude
		// Starts at -80 degrees and is in 8 degree increments
		if(! ((lat > -80) && (lat < 84) )) {
			if(!north_proj)
				throw("USNG: Latitude must be between -80 and 84. (Zones A,B,Y, and Z require Proj4js.)");

			var grid_zone;
			var ups_pt = new Proj4js.Point( lon, lat );

			if( lat > 0 ) {
				Proj4js.transform( ll_proj, north_proj, ups_pt );
				grid_zone = (lon < 0) ? "Y":"Z";
			} else {
				Proj4js.transform( ll_proj, south_proj, ups_pt );
				grid_zone = (lon < 0) ? "A":"B";	
			}	
			return this.fromUPS(grid_zone, ups_pt.x, ups_pt.y, precision);		
		}
		
		var grid_zone = GridZones[Math.floor((lat - (-80.0)) / 8)]; 
		var utm_pt = utm_proj.proj(utm_zone, lon, lat);
		
		return this.fromUTM(utm_zone, grid_zone, utm_pt.utm_easting, utm_pt.utm_northing, precision);
	}


	
	this.toLonLat = function(usng, initial_lonlat, strict)
	{
		var result = this.toUTM(usng, initial_lonlat, strict);
		var grid_zone = result.grid_zone;
		var ll;

		//console.log(result);
		if(south_proj && (grid_zone == "A" || grid_zone == "B")) {
			var pt = {x: result.x, y: result.y};
			Proj4js.transform( south_proj, ll_proj, pt );
			ll = { lon: pt.x, lat: pt.y, precision: result.precision, usng: result.usng };
		} else if(north_proj && (grid_zone == "Y" || grid_zone == "Z")) {
			var pt = {x: result.x, y: result.y};
			Proj4js.transform( north_proj, ll_proj, pt );
			ll = { lon: pt.x, lat: pt.y, precision: result.precision, usng: result.usng };
		} else {
			ll = utm_proj.invProj(result.zone, result.easting, result.northing);
			ll.precision = result.precision;
			ll.usng = result.usng;
		}
		return (ll);
	}
	
	this.UTM = function() {		
		// Functions to convert between lat,lon and utm. Derived from visual basic
		// routines from Craig Perault. This assumes a NAD83 datum.
		
		// constants
		var MajorAxis = 6378137.0;
		var MinorAxis = 6356752.3;
		var Ecc = (MajorAxis * MajorAxis - MinorAxis * MinorAxis) / (MajorAxis * MajorAxis);
		var Ecc2 = Ecc / (1.0 - Ecc);
		var K0 = 0.9996;
		var E4 = Ecc * Ecc;
		var E6 = Ecc * E4;
		var degrees2radians = Math.PI / 180.0;
		
		// Computes the meridian distance for the GRS-80 Spheroid.
		// See equation 3-22, USGS Professional Paper 1395.
		function meridianDist(lat) {
			var c1 = MajorAxis * (1 - Ecc / 4 - 3 * E4 / 64 - 5 * E6 / 256);
			var c2 = -MajorAxis * (3 * Ecc / 8 + 3 * E4 / 32 + 45 * E6 / 1024);
			var c3 = MajorAxis * (15 * E4 / 256 + 45 * E6 / 1024);
			var c4 = -MajorAxis * 35 * E6 / 3072;
			
			return(c1 * lat + c2 * Math.sin(lat * 2) + c3 * Math.sin(lat * 4) + c4 * Math.sin(lat * 6));
		}
		
		// Convert lat/lon (given in decimal degrees) to UTM, given a particular UTM zone.
		this.proj = function(zone, in_lon, in_lat) {
			var centeralMeridian = -((30 - zone) * 6 + 3) * degrees2radians;
			
			var lat = in_lat * degrees2radians;
			var lon = in_lon * degrees2radians;
			
			var latSin = Math.sin(lat);
			var latCos = Math.cos(lat);
			var latTan = latSin / latCos;
			var latTan2 = latTan * latTan;
			var latTan4 = latTan2 * latTan2;
			
			var N = MajorAxis / Math.sqrt(1 - Ecc * (latSin*latSin));
			var c = Ecc2 * latCos*latCos;
			var a = latCos * (lon - centeralMeridian);
			var m = meridianDist(lat);
			
			var temp5 = 1.0 - latTan2 + c;
			var temp6 = 5.0 - 18.0 * latTan2 + latTan4 + 72.0 * c - 58.0 * Ecc2;
			var temp11 = Math.pow(a, 5);
			
			var x = K0 * N * (a + (temp5 * Math.pow(a, 3)) / 6.0 + temp6 * temp11 / 120.0) + 500000;
			
			var temp7 = (5.0 - latTan2 + 9.0 * c + 4.0 * (c*c)) * Math.pow(a,4) / 24.0;
			var temp8 = 61.0 - 58.0 * latTan2 + latTan4 + 600.0 * c - 330.0 * Ecc2;
			var temp9 = temp11 * a / 720.0;
			
			var y = K0 * (m + N * latTan * ((a * a) / 2.0 + temp7 + temp8 * temp9))
				
			return( { utm_zone: zone, utm_easting : x, utm_northing : y } );
		}
		
		// Convert UTM coordinates (given in meters) to Lat/Lon (in decimal degrees), given a particular UTM zone.
		this.invProj = function(zone, easting, northing) {
			var centeralMeridian = -((30 - zone) * 6 + 3) * degrees2radians;
			
			var temp = Math.sqrt(1.0 - Ecc);
			var ecc1 = (1.0 - temp) / (1.0 + temp);
			var ecc12 = ecc1 * ecc1;
			var ecc13 = ecc1 * ecc12;
			var ecc14 = ecc12 * ecc12;
			
			easting = easting - 500000.0;
			
			var m = northing / K0;
			var um = m / (MajorAxis * (1.0 - (Ecc / 4.0) - 3.0 * (E4 / 64.0) - 5.0 * (E6 / 256.0)));
			
			var temp8 = (1.5 * ecc1) - (27.0 / 32.0) * ecc13;
			var temp9 = ((21.0 / 16.0) * ecc12) - ((55.0 / 32.0) * ecc14);
			
			var latrad1 = um + temp8 * Math.sin(2 * um) + temp9 * Math.sin(4 * um) + (151.0 * ecc13 / 96.0) * Math.sin(6.0 * um);
			
			var latsin1 = Math.sin(latrad1);
			var latcos1 = Math.cos(latrad1);
			var lattan1 = latsin1 / latcos1;
			var n1 = MajorAxis / Math.sqrt(1.0 - Ecc * latsin1 * latsin1);
			var t2 = lattan1 * lattan1;
			var c1 = Ecc2 * latcos1 * latcos1;
			
			var temp20 = (1.0 - Ecc * latsin1 * latsin1);
			var r1 = MajorAxis * (1.0 - Ecc) / Math.sqrt(temp20 * temp20 * temp20);
			
			var d1 = easting / (n1*K0);
			var d2 = d1 * d1;
			var d3 = d1 * d2;
			var d4 = d2 * d2;
			var d5 = d1 * d4;
			var d6 = d3 * d3;
			
			var t12 = t2 * t2;
			var c12 = c1 * c1;
			
			var temp1 = n1 * lattan1 / r1;
			var temp2 = 5.0 + 3.0 * t2 + 10.0 * c1 - 4.0 * c12 - 9.0 * Ecc2;
			var temp4 = 61.0 + 90.0 * t2 + 298.0 * c1 + 45.0 * t12 - 252.0 * Ecc2 - 3.0 * c12;
			var temp5 = (1.0 + 2.0 * t2 + c1) * d3 / 6.0;
			var temp6 = 5.0 - 2.0 * c1 + 28.0 * t2 - 3.0 * c12 + 8.0 * Ecc2 + 24.0 * t12;

			var lat = (latrad1 - temp1 * (d2 / 2.0 - temp2 * (d4 / 24.0) + temp4 * d6 / 720.0)) * 180 / Math.PI;
			var lon = (centeralMeridian + (d1 - temp5 + temp6 * d5 / 120.0) / latcos1) * 180 / Math.PI;
			//easting = easting + 500000.0;
			
			return ({ lon: lon, lat: lat});
		}
		
	}
	var utm_proj = new this.UTM();

	// Use Proj4JS for Universal Polar Stereographic if available.
	var north_proj;
	var south_proj;
	var ll_proj;
	if(typeof Proj4js == "object") {
  	Proj4js.defs["EPSG:32661"] = "+proj=stere +lat_0=90 +lat_ts=90 +lon_0=0 +k=0.994 +x_0=2000000 +y_0=2000000 +ellps=WGS84 +datum=WGS84 +units=m +no_defs";
		Proj4js.defs["EPSG:32761"] = "+proj=stere +lat_0=-90 +lat_ts=-90 +lon_0=0 +k=0.994 +x_0=2000000 +y_0=2000000 +ellps=WGS84 +datum=WGS84 +units=m +no_defs";
		Proj4js.defs["EPSG:4326"] = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs";
		north_proj = new Proj4js.Proj('EPSG:32661');
		south_proj = new Proj4js.Proj('EPSG:32761');
		ll_proj    = new Proj4js.Proj('EPSG:4326');
	}
}