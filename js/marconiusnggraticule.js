// ***************************************************************************
// *  usng.js  (calculate and display U.S. National Grid
// *          zones and gridlines on a Google map)
//    modified by Xavier Irias, origional version by Larry Moore as described below
//    The major changes involved doing USNG calcs with Marconi's map code rather than hardcoded for USNG
//    and making the module comply with Google maps version 3 overlay requirements.
// ****************************************************************************/
//
// Copyright (c) 2009 Larry Moore, jane.larry@gmail.com
// Released under the MIT License 
// http://www.opensource.org/licenses/mit-license.php 
// http://en.wikipedia.org/wiki/MIT_License
//
// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation
// files (the "Software"), to deal in the Software without
// restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following
// conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
// OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
// WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.
//
//
//*****************************************************************************


USNG = (function() {
    var latLongWGS84    = new MARCONI.map.SpatialReference(MARCONI.map.COORDSYS_WORLD, MARCONI.map.DATUM_HORIZ_WGS84, MARCONI.map.UNITS_DEGREES);
    var usngRef         = MARCONI.map.spatialRefGivenCode(MARCONI.map.SPATIALREF_USNG);
    var pt              = new MARCONI.map.GeoPoint();

    return {
    LLtoUSNG : function ( latitude, longitude, precision ) {
        try {
            pt.x = longitude;
            pt.y = latitude;

            pt.convert(latLongWGS84, usngRef);

            return pt.x;
        }
        catch(ex) {
            throw("LLtoUSNG(): Error converting lat-long " + latitude + ", " + longitude +  " to USNG, err is " + ex);
        }
    },

    USNGtoLL : function (gridRef) {
        try {
            pt.x = gridRef;

            pt.convert(usngRef, latLongWGS84);

            return new google.maps.LatLng(pt.y, pt.x);
        }
        catch(ex) {
            throw("USNGtoLL(): Error converting grid value " + gridRef + " to lat-long, err is " + ex);
        }
    },

    LLtoUTM : function ( latitude, longitude, utmcoords, zoneNumber) {
        try {
            zoneNumber = (zoneNumber ? zoneNumber : MARCONI.map.getUTMZoneFromLatLong(latitude, longitude));

            var utmRef = MARCONI.map.UTMSpatialRef(zoneNumber);

            pt.x = longitude;
            pt.y = latitude;

            pt.convert(latLongWGS84, utmRef);

            utmcoords[0] = pt.x;
            utmcoords[1] = pt.y;
            utmcoords[2] = zoneNumber;

        }
        catch(ex) {
            throw("LLtoUTM(): Error converting lat-long " + latitude + ", " + longitude + " zone " + zoneNumber + " to UTM, err is " + ex);
        }
    },

    UTMtoLL_GeoPoint : function ( x, y, zoneNumber) {
        try {
            var utmRef = MARCONI.map.UTMSpatialRef(zoneNumber);

            pt.x = x;
            pt.y = y;

            pt.convert(utmRef,latLongWGS84);

            return pt;
        }
        catch(ex) {
            throw("UTMtoLL_GeoPoint(): Error converting utm " + x + ", " + y + " zone " + zoneNumber + " to lat-long, err is " + ex);
        }
    },

    UTMtoLL : function ( x, y, zoneNumber) {
        try {
            var utmRef = MARCONI.map.UTMSpatialRef(zoneNumber);

            pt.x = x;
            pt.y = y;

            pt.convert(utmRef,latLongWGS84);

            return new google.maps.LatLng(pt.y, pt.x);
        }
        catch(ex) {
            throw("UTMtoLL(): Error converting utm " + x + ", " + y + " zone " + zoneNumber + " to lat-long, err is " + ex);
        }
    } };
}());



function USNGGraticule(map, gridStyle) {
    var that=this;
    
    //alert("usng grid constructor");
    if(!map  ) {
        throw "Must supply map to the constructor";
    }
    this._map = map;

    this.gridStyle = gridStyle;

    this.setMap(map);  // will trigger a draw()
    
    // Google API should call draw() on its own at various times but often fails to
    // so put our own listeners in.  
    
    this.resizeListener = google.maps.event.addDomListener(window, "resize", function() {
                        that.draw();});  
    this.dragListener = google.maps.event.addListener(map, 'dragend',
        function() { that.draw(); })
        
}


USNGGraticule.prototype = new google.maps.OverlayView();

USNGGraticule.prototype.onAdd= function() {};

USNGGraticule.prototype.onRemove = function(leaveHandlersAlone) {
    try {
        if( this.zoneLines ) {
            this.zoneLines.remove();
            this.zoneLines = null;
        }
        if( this.grid100k) {
            this.grid100k.remove();
            this.grid100k = null;
        }

        if( this.grid1k) {
            this.grid1k.remove();
            this.grid1k = null;
        }

        if( this.grid100m ) {
            this.grid100m.remove();
            this.grid100m = null;
        }
        
        if( leaveHandlersAlone!==true ) {
            google.maps.event.removeListener(this.resizeListener);
            google.maps.event.removeListener(this.dragListener);
        }
        
    
  }
    catch(e) {
        MARCONI.stdlib.log("Error " + e + " removing USNG graticule");
    }
}

USNGGraticule.prototype.draw = function() {
    try {
        this.onRemove(true);

        MARCONI.stdlib.log("drawing USNG grid, zoom is " + this._map.getZoom() );

        this.view = new USNGViewport(this._map);

        var zoomLevel = this._map.getZoom();  // zero is whole world, higher numbers (to about 20 are move detailed)

        if( zoomLevel < 6 ) {   // zoomed way out
            this.zoneLines = new USNGZonelines(this._map, this.view, this,
            this.gridStyle.majorLineColor, this.gridStyle.majorLineWeight, this.gridStyle.majorLineOpacity);
        }
        else {  // close enough to draw the 100km lines
            this.grid100k = new Grid100klines(this._map, this.view, this,
                this.gridStyle.semiMajorLineColor,
                this.gridStyle.semiMajorLineWeight,
                this.gridStyle.semiMajorLineOpacity);
            
            if(zoomLevel > 10 ) {    // draw 1k lines also if close enough
                this.grid1k = new Grid1klines(this._map, this.view, this,
                this.gridStyle.minorLineColor,
                this.gridStyle.minorLineWeight,
                this.gridStyle.minorLineOpacity);
                
                if( zoomLevel > 13 ) {   // draw 100m lines if very close
                    this.grid100m = new Grid100mlines(this._map, this.view, this,
                    this.gridStyle.fineLineColor,
                    this.gridStyle.fineLineWeight,
                    this.gridStyle.fineLineOpacity);
                }
            }
        }
    }
    catch(ex) {
        MARCONI.stdlib.warn("Error " + ex + " drawing USNG graticule");
    }
};

USNGGraticule.prototype.gridValueFromPt = function(latLongPt) {
    return USNG.LLtoUSNG(latLongPt.lat(), latLongPt.lng());
};

///////////////////////  begin class USNGViewport ///////////////////////////////////////
//
// class that keeps track of the viewport context
// unlike most of the other classes in this module, does *not* implement a Google Maps custom overlay
// stores the corner coordinates of the viewport, and coordinate information
//     that defines the top-level MGRS/USNG zones within the viewport
// USNGViewport is a geographic rectangle (bounded by parallels and meridians).  zone lines and
//     grid lines are computed within and clipped to this rectangle


function USNGViewport(mygmap) {   // mygmap is an instance of GMap, created by calling function
   // arrays that hold the key coordinates...corners of viewport and UTM zone boundary intersections
   this.lat_coords = [];
   this.lng_coords = [];

   // array that holds instances of the class usng_georectangle, for this viewport
   this.georectangle = [];

   // call to Google Maps to get the boundaries of the map
   this.bounds = mygmap.getBounds();

   // geographic coordinates of edges of viewport
   this.slat = this.bounds.getSouthWest().lat();
   this.wlng = this.bounds.getSouthWest().lng();
   this.nlat = this.bounds.getNorthEast().lat();
   this.elng = this.bounds.getNorthEast().lng();
   
   // UTM is undefined beyond 84N or 80S, so this application defines viewport at those limits
   // even though USNG can go all the way to the poles
   if (this.nlat > 84) { 
       this.nlat=84;
   }

   // first zone intersection inside the southwest corner of the map window
   // longitude coordinate is straight-forward...

   var x1 = (Math.floor((this.wlng/6)+1)*6.0)

   // but latitude coordinate has three cases
   var y1 = (this.slat >= -80 ? Math.floor((this.slat/8)+1)*8.0 : -80);


   // compute lines of UTM zones -- geographic lines at 6x8 deg intervals

   // latitudes first

   if (this.slat < -80) {
       this.lat_coords[0] = -80;
   }  // special case of southern limit
   else { 
       this.lat_coords[0] = this.slat;
   }  // normal case

   for( var lat=y1, j=1; lat < this.nlat; lat += 8, j++) {
      if (lat <= 72) {
         this.lat_coords[j] = lat;
      }
      else if (lat <= 80) {
         this.lat_coords[j] = 84;
      }
      else { 
          j--;
      }
   }
   this.lat_coords[j] = this.nlat;

   // compute the longitude coordinates that belong to this viewport
   var lng;

   this.lng_coords[0] = this.wlng;
   if (this.wlng < this.elng) {   // normal case
      for (lng=x1, j=1; lng < this.elng; lng+=6, j++) {
         this.lng_coords[j] = lng;
      }
   }
   else { // special case of window that includes the international dateline
      for (lng=x1, j=1; lng <= 180; lng+=6, j++) {
         this.lng_coords[j] = lng;
      }
      for (lng=-180; lng < this.elng; lng+=6, j++) {
         this.lng_coords[j] = lng;
      }
   }

   this.lng_coords[j++] = this.elng;

   // store corners and center point for each geographic rectangle in the viewport
   // each rectangle may be a full UTM cell, but more commonly will have one or more
   //    edges bounded by the extent of the viewport
   // these geographic rectangles are stored in instances of the class 'usng_georectangle'
   var k = 0;
   for (var i=0; i < this.lat_coords.length-1 ; i++) {
      for (j = 0; j < this.lng_coords.length-1 ; j++) {
         if(      this.lat_coords[i] >= 72 && this.lng_coords[j] ==  6 ) {  } // do nothing
         else if (this.lat_coords[i] >= 72 && this.lng_coords[j] == 18 ) {  } // do nothing
         else if (this.lat_coords[i] >= 72 && this.lng_coords[j] == 30 ) {  } // do nothing
         else {
            this.georectangle[k] = new usng_georectangle();
            this.georectangle[k].assignCorners(this.lat_coords[i], this.lat_coords[i+1], this.lng_coords[j], this.lng_coords[j+1])
            if (this.lat_coords[i] != this.lat_coords[i+1]) {  // ignore special case of -80 deg latitude
               this.georectangle[k].assignCenter()
            }
            k++;
         }
      }
   }
} // end of function USNGViewport()

// return array of latitude coordinates corresponding to lat lines
USNGViewport.prototype.lats = function() {
   return this.lat_coords;
}

// return array of longitude coordinates corresponding to lng lines
USNGViewport.prototype.lngs = function() {
   return this.lng_coords;
}

// return an array or georectangles associated with this viewprot
USNGViewport.prototype.geoextents = function() {
   return this.georectangle;
}

////////////////////// end class USNGViewport /////////////////////////////////



///////////////////// class to draw UTM zone lines/////////////////////////

// zones are defined by lines of latitude and longitude, normally 6 deg wide by 8 deg high
// northern-most zone is 12 deg high, from 72N to 84N


function USNGZonelines(map, viewport, parent) {
    try {
       this._map = map;
       this.view = viewport;
       this.parent=parent;
       

       this.lat_line = [];
       this.lng_line = [];

       var latlines = this.view.lats();
       var lnglines = this.view.lngs();
       this.gzd_rectangles = this.view.geoextents();
       this.marker = [];
       var temp = [];
       var i;

       // creates polylines corresponding to zone lines using arrays of lat and lng points for the viewport
       for( i = 1 ; i < latlines.length ; i++) {
           temp=[];

           for (var j = 0 ; j < lnglines.length; j++) {
               temp.push(new google.maps.LatLng(latlines[i],lnglines[j]));
           }


           this.lat_line.push(new google.maps.Polyline({
              path: temp, 
              strokeColor: this.parent.gridStyle.majorLineColor,
              strokeWeight: this.parent.gridStyle.majorLineWeight,
              strokeOpacity: this.parent.gridStyle.majorLineOpacity, map: this._map
            }));
       }

       

       for( i = 1 ; i < lnglines.length ; i++ ) {
           // need to reset array for every line of longitude!
           temp = [];

           // deal with norway special case at longitude 6
           if( lnglines[i] == 6 ) {
              for( j = 0 ; j < latlines.length ; j++ ) {
                 if (latlines[j]==56) {
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]));
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]-3));
                 }
                 else if( latlines[j]<56 || (latlines[j]>64 && latlines[j]<72)) {
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]));
                 }
                 else if (latlines[j]>56 && latlines[j]<64) {
                    temp.push(new google.maps.LatLng(latlines[j],lnglines[i]-3));
                 }
                 else if (latlines[j]==64) {
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]-3));
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]));
                 }
                 // Svlabard special case
                 else if (latlines[j]==72) {
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]));
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]+3));
                 }
                 else if (latlines[j]<72) {
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]));
                 }
                 else if (latlines[j]>72) {
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]+3));
                  }
                 else {
                    temp.push(new google.maps.LatLng(latlines[j],lnglines[i]-3));
                 }
                }
       
            }

           // additional Svlabard cases

           // lines at 12,18 and 36 stop at latitude 72
           else if (lnglines[i] == 12 || lnglines[i] == 18 || lnglines[i] == 36) {
              for (j = 0; j < latlines.length; j++) {
                 if (latlines[j]<=72) {
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]));
                 }
              }
          }
          else if (lnglines[i] == 24) {
              for (j=0; j < latlines.length ; j++) {
                 if (latlines[j] == 72) {
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]));
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]-3));
                 }
                 else if ( latlines[j] < 72) {
                    temp.push(new google.maps.LatLng(latlines[j],lnglines[i]));
                 }
                 else if ( latlines[j] > 72) {
                    temp.push(new google.maps.LatLng(latlines[j],lnglines[i]-3));
                 }
              }
          }
           else if (lnglines[i] == 30) {
              for ( j = 0 ; j < latlines.length ; j++) {

                 if( latlines[j] == 72 ) {
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]));
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]+3));
                 }
                 else if ( latlines[j] < 72 ) {
                    temp.push(new google.maps.LatLng( latlines[j], lnglines[i]));
                 }
                 else if ( latlines[j] > 72 ) {
                    temp.push(new google.maps.LatLng( latlines[j], lnglines[i]+3));
                 }
              }
          }
      
          // normal case, not in Norway or Svalbard
          else {
              for( j = 0 ; j < latlines.length; j++) {
                  temp.push(new google.maps.LatLng(latlines[j], lnglines[i]));
              }
          }

          this.lng_line.push(new google.maps.Polyline({path:temp, 
              strokeColor: this.parent.gridStyle.majorLineColor,
              strokeWeight: this.parent.gridStyle.majorLineWeight,
              strokeOpacity: this.parent.gridStyle.majorLineOpacity,
              map: this._map}));
          
        }  // for each latitude line

    //Only draw the zone marker at certain scales
    if (this._map.getZoom() < 10 ) {
          this.zonemarkerdraw();
        }
    }
    catch(ex) {
        throw("Error drawing USNG zone boundaries: " + ex);
    }
}  // constructor

USNGZonelines.prototype.remove = function() {
    try {
        var i;

        if( this.lat_line ) {

          for(i=0; i< this.lat_line.length; i++) {
              this.lat_line[i].setMap(null);
          }
          this.lat_line = null;
        }

        if( this.lng_line ) {

            for(i=0; i< this.lng_line.length; i++) {
                this.lng_line[i].setMap(null);
            }
            this.lng_line = null;
        }

        // remove center-point label markers
        if (this.marker) {
            for (i=0; i<this.marker.length; i++) {
               this.marker[i].parentNode.removeChild(this.marker[i]);
            }
            this.marker=null;
        }
    }
    catch(ex) {
        alert("Error removing zone lines: " + ex);
    }
} 


// zone label markers
USNGZonelines.prototype.zonemarkerdraw = function() {
    function makeLabel(parent, latLong, labelText, className) {
        try {
            var pixelPoint = parent.getProjection().fromLatLngToDivPixel(latLong);

            var d = document.createElement("div");
            var x = pixelPoint.x;
            var y = pixelPoint.y;
            var height=20;
            var width=50;

            d.style.position = "absolute";
            d.style.width  = "" + width + "px";
            d.style.height = "" + height + "px";

            d.innerHTML = labelText;

            if( className ) {
                d.className = className;
            }
            else {
                d.style.color = "#000000";
                d.style.fontFamily='Arial';
                d.style.fontSize='small';
                d.style.backgroundColor = "white";
                d.style.opacity=0.5;
            }

            d.style.textAlign = "center";
            d.style.verticalAlign = "middle";
            d.style.left = (x-width*.5).toString() + "px";
            d.style.top  = (y-height*.5).toString() + "px";

            if( parent && parent.getPanes && parent.getPanes().overlayLayer ) {
                parent.getPanes().overlayLayer.appendChild(d);
            }
            else {
                MARCONI.stdlib.warn("parent is " + parent + " drawing label");
            }

            return d;
        }
        catch(ex) {
            throw "Error making zone label " + labelText + ": " + ex;
        }
    }

    for (var i = 0 ; i <this.gzd_rectangles.length; i++ ) {

        var lat = this.gzd_rectangles[i].getCenter().lat();

        var lng = this.gzd_rectangles[i].getCenter().lng();

        // labeled marker
        var z = USNG.LLtoUSNG(lat,lng,1);

        z = z.substring(0,3);

        this.marker.push(makeLabel(this.parent, this.gzd_rectangles[i].getCenter(), z, this.parent.gridStyle.majorLabelClass));
        
    }
}  

/////////////////end of class that draws zone lines///////////////////////////////

///////////////////// class to draw 100,000-meter grid lines/////////////////////////
  
function Grid100klines(map, viewport, parent) {
    this._map = map;
    this.view = viewport;
    this.parent = parent;
    
    this.Gridcell_100k = [];

    
    // zone lines are also the boundaries of 100k lines...separate instance of this class for 100k lines
    // The problem is this also adds a zone label at inappropriate scales, so need to change the function
    this.zonelines = new USNGZonelines(this._map, this.view, parent);
    
    this.zones = this.view.geoextents();

    for (var i=0; i < this.zones.length; i++) {
        var newCell = new Gridcell(this._map, this.parent, this.zones[i],100000);

        this.Gridcell_100k.push(newCell);

        newCell.drawOneCell();
    }
}

Grid100klines.prototype.remove = function() {
    try {
        if( this.zonelines ) {
           this.zonelines.remove();
        }

        if( this.Gridcell_100k ) {
            for (var i=0; i < this.Gridcell_100k.length; i++) {
                this.Gridcell_100k[i].remove();
            }

            this.Gridcell_100k = null;
        }
    }
    catch(ex) {
        alert("Error " + ex + " trying to remove 100k gridlines");
    }
}

/////////////end class Grid100klines ////////////////////////////////////////



///////////////////// class to draw 1,000-meter grid lines/////////////////////////

function Grid1klines(map, viewport, parent) {
    this._map = map;
    this.view = viewport;
    this.parent = parent;
    

    this.Gridcell_1k = [];
   
    this.zones = this.view.geoextents();

    for (var i = 0 ; i < this.zones.length ; i++ ) {
        this.Gridcell_1k[i] = new Gridcell(this._map, this.parent, this.zones[i], 1000);
        this.Gridcell_1k[i].drawOneCell();
    }
}

Grid1klines.prototype.remove = function() {
    // remove 1k grid lines
    for (var i=0; i<this.zones.length; i++) {
       this.Gridcell_1k[i].remove();
    }
    this.Gridcell_1k = null;
}


/////////////end class Grid1klines ////////////////////////////////////////


///////////////////// class to draw 100-meter grid lines/////////////////////////

function Grid100mlines(map, viewport, parent) {
    this._map = map;
    this.view = viewport;
    this.parent = parent;
    

    this.Gridcell_100m = [];
    this.zones = this.view.geoextents();

    for (var i=0; i<this.zones.length; i++) {
       this.Gridcell_100m[i] = new Gridcell(this._map, this.parent, this.zones[i], 100);
       this.Gridcell_100m[i].drawOneCell();
    }
}

Grid100mlines.prototype.remove = function() {
   // remove 100-m grid lines
   for (var i = 0 ; i < this.zones.length ; i++) {
      this.Gridcell_100m[i].remove();
   }
}

/////////////end class Grid100mlines ////////////////////////////////////////


///////////////////////// class usng_georectangle//////////////////////////
function usng_georectangle() {
   this.nlat = 0;
   this.slat = 0;
   this.wlng=0;
   this.elng=0;
   this.centerlat=0;
   this.centerlng=0;
}

usng_georectangle.prototype.assignCorners = function(slat,nlat,wlng,elng) {
   this.nlat = nlat;
   this.slat = slat;

   // special case: Norway
   if (slat==56 && wlng==0) {
      this.wlng = wlng;
      this.elng = elng-3;
   }
   else if (slat==56 && wlng==6) {
      this.wlng = wlng-3;
      this.elng = elng;
   }
   // special case: Svlabard
   else if (slat==72 && wlng==0) {
      this.wlng = wlng;
      this.elng = elng+3;
   }
   else if (slat==72 && wlng==12) {
      this.wlng = wlng-3;
      this.elng = elng+3;
   }
   else if (slat==72 && wlng==36) {
      this.wlng = wlng-3;
      this.elng = elng;
   }
   else {
      this.wlng = wlng;
      this.elng = elng;
   }
}

usng_georectangle.prototype.assignCenter = function() {
      this.centerlat = (this.nlat+this.slat)/2;
      this.centerlng = (this.wlng+this.elng)/2;
}
usng_georectangle.prototype.getCenter = function() {
      return(new google.maps.LatLng(this.centerlat,this.centerlng));
}

usng_georectangle.prototype.getNW = function() {
      return(new google.maps.LatLng(this.nlat,this.wlng));
}
usng_georectangle.prototype.getSW = function() {
      return(new google.maps.LatLng(this.slat,this.wlng));
}
usng_georectangle.prototype.getSE = function() {
      return(new google.maps.LatLng(this.slat,this.elng));
}
usng_georectangle.prototype.getNE = function() {
      return(new google.maps.LatLng(this.nlat,this.elng));
}
//////////////////////////////////////////////////////////////////////////////



///////////////////// class to calculate and draw grid lines ///////////////////////

// constructor
function Gridcell(map, parent, zones,interval) {
    if(!map) {
        throw "map argument not supplied to Gridcell constructor";
    }
    if(!parent) {
        // TODO -- check some properties of parent to make sure it's real
        throw "parent USNG grid not supplied to Gridcell constructor";
    }

    this._map   = map;
    this.parent = parent;   // provides access to gridStyle for example
    this.slat   = zones.slat;
    this.wlng   = zones.wlng;
    this.nlat   = zones.nlat;
    this.elng   = zones.elng;

    this.interval   = interval;
    this.gridlines  = [];
    this.label_100k = [];
    this.label_1k   = [];
    this.label_100m = [];
}



// instance of one utm cell
Gridcell.prototype.drawOneCell = function() {
    try {
        var utmcoords = [];

        var zone = MARCONI.map.getUTMZoneFromLatLong((this.slat+this.nlat)/2,(this.wlng+this.elng)/2);
        
        var i,j,k,m,n,p,q;
           
        USNG.LLtoUTM(this.slat,this.wlng,utmcoords,zone);
        
        var sw_utm_e = (Math.floor(utmcoords[0]/this.interval)*this.interval)-this.interval;
        var sw_utm_n = (Math.floor(utmcoords[1]/this.interval)*this.interval)-this.interval;

        USNG.LLtoUTM(this.nlat,this.elng,utmcoords,zone);
        
        var ne_utm_e = (Math.floor(utmcoords[0]/this.interval+1)*this.interval) + 10 * this.interval;
        var ne_utm_n = (Math.floor(utmcoords[1]/this.interval+1)*this.interval) + 10 * this.interval;
                
        if( sw_utm_n > ne_utm_n || sw_utm_e > ne_utm_e) {
            throw("Error, northeast of cell less than southwest");
        }
        
        var geocoords    = null;
        var temp         = null;
        var gr100kCoord  = null;
        var northings    = [];
        var eastings     = [];

        // set density of points on grid lines as space in meters between points
        // case 1: zoomed out a long way; not very dense
        var precision;

        if (this._map.getZoom() < 12 ) {
            precision = 10000;
        }
        // case 2: zoomed in a long way
        else if (this._map.getZoom() > 15) {
           precision = 100;
        }
        // case 3: in between, zoom levels 12-15
        else {
           precision = 1000;
        }

        precision *= 10;  // experiment here with a speedup multiplier
        if( precision > this.interval * 5) {
            precision = this.interval * 5;
        }
        // ensure at least two vertices for each segment
        if( precision > ne_utm_n - sw_utm_n ) {
            precision = ne_utm_n - sw_utm_n;
        }
        if( precision > ne_utm_e - sw_utm_e ) {
            precision = ne_utm_e - sw_utm_e;
        }

        var skipFactor=1;

        if( this.interval==1000 && this._map.getZoom() == 11) {
            skipFactor=2;
        }

        // for each e-w line that covers the cell, with overedge
        northings[0] = this.slat;
        
        if( !northings[0]) {
            throw "Southern latitude is " + northings[0];
        }
        
        k=1;
        for (i=sw_utm_n, j=0 ; i < ne_utm_n ; i += this.interval * skipFactor, j++) {

            // collect coords to be used to place markers
            // '2*this.interval' is a fudge factor that approximately offsets grid line convergence
            geocoords = USNG.UTMtoLL_GeoPoint(sw_utm_e+(2*this.interval), i, zone);

            if ((geocoords.y > this.slat) && (geocoords.y < this.nlat)) {
                northings[k++] = geocoords.y;
            }

            // calculate  line segments of one e-w line
            temp=[];
            for( m = sw_utm_e ; m <= ne_utm_e ; m += precision ) {
                temp.push(USNG.UTMtoLL(m, i, zone));
            }
            
            gr100kCoord = [];
           
           //+var to store result of checkClip+
           var check = false;
            // clipping routine...eliminate overedge lines
            // case of final point in the array is not covered
            //+revised to return either 'false' or an array of google maps lat/lng pairs+
            for( p = 0  ; p < temp.length-1 ; p++ ) {
              check = this.checkClip(temp, p);
             if((check.constructor == Array)) {                
                  gr100kCoord.push.apply(gr100kCoord, check);
              }
            }

            if (this.interval == 100000) {
               this.gridlines.push(new google.maps.Polyline( {
                   path: gr100kCoord,
                   strokeColor: this.parent.gridStyle.semiMajorLineColor,
                   strokeWeight: this.parent.gridStyle.semiMajorLineWeight,
                   strokeOpacity: this.parent.gridStyle.semiMajorLineOpacity,
                   map: this._map}));

            }
            else if (this.interval == 1000) {
               this.gridlines.push(new google.maps.Polyline( {
                   path: gr100kCoord,
                   strokeColor: this.parent.gridStyle.minorLineColor,
                   strokeWeight: this.parent.gridStyle.minorLineWeight,
                   strokeOpacity: this.parent.gridStyle.minorLineOpacity,
                    map: this._map}));
            }
            else if (this.interval == 100) {
               this.gridlines.push(new google.maps.Polyline( {
                   path: gr100kCoord,
                   strokeColor: this.parent.gridStyle.fineLineColor,
                   strokeWeight: this.parent.gridStyle.fineLineWeight,
                   strokeOpacity: this.parent.gridStyle.fineLineOpacity,
                   map: this._map}));
            }
            
        }

        northings[k++] = this.nlat;
        eastings[0]    = this.wlng;
        k=1;



        // for each n-s line that covers the cell, with overedge
        for (i=sw_utm_e; i<ne_utm_e; i+=this.interval * skipFactor,j++) {
          
          // collect coords to be used to place markers
          // '2*this.interval' is a fudge factor that approximately offsets grid line convergence
          geocoords = USNG.UTMtoLL_GeoPoint(i, sw_utm_n+(2*this.interval), zone);

          if (geocoords.x > this.wlng && geocoords.x < this.elng) {
              eastings[k++] = geocoords.x;
          }

          temp=[];

          for (m=sw_utm_n,n=0; m<=ne_utm_n; m+=precision,n++) {
             temp.push(USNG.UTMtoLL(i, m, zone));
          }
          
          // clipping routine...eliminate overedge lines
          gr100kCoord  = [];
          
          //+var to store result of checkClip+
          var check = false;
           
           // clipping routine...eliminate overedge lines
           // case of final point in the array is not covered
           //+revised to return false or an array of google maps lat/lng pairs+
          for (p=0 ; p < temp.length-1; p++) {
              //+test to see about skipping clip+
              //+if (1) {+
           check = this.checkClip(temp, p);
              if((check.constructor == Array)) {                
                  gr100kCoord.push.apply(gr100kCoord, check);
              }
          }

          if (this.interval == 100000) {
             this.gridlines.push(new google.maps.Polyline({
                 path: gr100kCoord,
                 strokeColor: this.parent.gridStyle.semiMajorLineColor,
                 strokeWeight: this.parent.gridStyle.semiMajorLineWeight,
                 strokeOpacity: this.parent.gridStyle.semiMajorLineOpacity,
                 map: this._map}));
          }
          else if (this.interval == 1000) {
             this.gridlines.push(new google.maps.Polyline( {
                 path: gr100kCoord,
                 strokeColor: this.parent.gridStyle.minorLineColor,
                 strokeWeight: this.parent.gridStyle.minorLineWeight,
                 strokeOpacity: this.parent.gridStyle.minorLineOpacity,
                 map: this._map}));
          }
          else if (this.interval == 100) {              
              this.gridlines.push(new google.maps.Polyline( {
                 path: gr100kCoord,
                 strokeColor: this.parent.gridStyle.fineLineColor,
                 strokeWeight: this.parent.gridStyle.fineLineWeight,
                 strokeOpacity: this.parent.gridStyle.fineLineOpacity,
                 map: this._map}));
          }
        }
        
        eastings[k] = this.elng;

        if (this.interval == 100000) {
           this.place100kLabels(eastings,northings);
        }
        else if (this.interval == 1000) {
           this.place1kLabels(eastings,northings);
        }
        else if (this.interval == 100) {
           this.place100mLabels(eastings,northings);
        }
     }
     catch(oneCellErr) {
       throw("Error drawing a cell: " + oneCellErr);
     }
}  // end drawOneCell


Gridcell.prototype.remove = function() {
    try {
        if( this.gridlines ) {
            for (var i=0; i < this.gridlines.length ; i++) {
                this.gridlines[i].setMap(null);
            }
            this.gridlines=[];
        }
        if( this.label_100k ) {
            for (i=0; this.label_100k[i]; i++) {
                this.label_100k[i].parentNode.removeChild(this.label_100k[i]);
            }
            this.label_100k = [];
        }

        if( this.label_1k ) {
            for (i=0; this.label_1k[i]; i++) {
                this.label_1k[i].parentNode.removeChild(this.label_1k[i]);
            }
            this.label_1k=[];
        }

        if( this.label_100m ) {
            for (i=0; this.label_100m[i]; i++) {
                this.label_100m[i].parentNode.removeChild(this.label_100m[i]);
            }
            this.label_100m = [];
        }
       
   }
   catch(ex) {
       alert("Error removing old USNG graticule: " + ex);
   }
}




Gridcell.prototype.makeLabel = function (parentGrid, latLong, labelText, horizontalAlignment, verticalAlignment, className) {
    var pixelPoint = this.parent.getProjection().fromLatLngToDivPixel(latLong);

    var d = document.createElement("div");
    var x = pixelPoint.x;
    var y = pixelPoint.y;

    var height = 30;
    var width  = 50;


    d.style.position = "absolute";
    d.style.width = "" + width + "px";
    d.style.height = "" + height + "px";

    if( className ) {
        d.className = className;
    }
    else {
        d.style.color = "#000000";
        d.style.fontFamily='Arial';
        d.style.fontSize='small';
    }

    d.innerHTML = labelText;

    d.style.textAlign = horizontalAlignment || "center";
    d.style.verticalAlign = verticalAlignment || "middle";
    
    d.style.left = ((horizontalAlignment || "center") == "center"  ? (x-0.5*width)  : x).toString() + "px";
    d.style.top  = ((verticalAlignment   || "middle") == "middle"  ? (y-0.5*height) : y).toString() + "px";

    parentGrid.getPanes().overlayLayer.appendChild(d);

    return d;
}

Gridcell.prototype.place100kLabels = function(east,north) {
    try {

        var zone;
        var labelText;
        var latitude;
        var longitude;

    /*Removing so this label always shows
        if (this._map.getZoom() > 15) {
            return; // don't display label when zoomed way in
        }
        */

        for (var i=0 ; east[i+1] ; i++ ) {
            
                
            for (var j=0; north[j+1]; j++) {
                // labeled marker
                zone = MARCONI.map.getUTMZoneFromLatLong((north[j]+north[j+1])/2,(east[i]+east[i+1])/2 );

                // lat and long of center of area
                latitude = (north[j]+north[j+1])/2;
                longitude = (east[i] + east[i+1])/2;
                
                labelText = USNG.LLtoUSNG(latitude, longitude);
                //console.log("Initial label text in this 100klabels function is: "+labelText);
                
                // if zoomed way out use a different label
                // MD: Use this section to adjust when zoomed way in, to remove the zone portion

                if (this._map.getZoom() < 10 || this._map.getZoom() > 13) {
                    if (zone > 9) {
                        labelText = labelText.substring(4,6)
                    }
                    else {
                        labelText = labelText.substring(3,5)
                    }
                }
                else {
                    if (zone > 9) {
                        labelText = labelText.substring(0,3) + labelText.substring(4,6)
                    }
                    else {
                        labelText = labelText.substring(0,2) + labelText.substring(3,5)
                    }
                    
                }
        //original vertical alignment was "middle". Changed to "bottom" to attempt a small offset
                this.label_100k.push(this.makeLabel(
                    this.parent, new google.maps.LatLng(latitude,longitude), labelText, "center", "bottom",
                    this.parent.gridStyle.semiMajorLabelClass));
                //console.log("Placing 100k label: "+labelText);
            }
        }
    }
   catch(markerError) {
       throw("Error placing 100k markers: " + markerError);
   }
}

Gridcell.prototype.place1kLabels = function(east,north) {
   try {

       var latitude;
       var longitude;

       // at high zooms, don't label the 1k line since it'll get a 100m label'
       if (this._map.getZoom() > 15) {
           return;
       }

       // place labels on N-S grid lines (that is, ladder labels lined up in an E-W row)

       // label x-axis
       for (var i=1; east[i+1] ; i++) {
           if( !east[i] || !east[i+1]  ) {
                //alert("at i=" + i + ", east is " + east[i] + " and " + east[i+1]);
           }
            
          for (var j=1; j<2 && j+1 < north.length ; j++) {
              if( !north[j] || !north[j+1]  ) {
                    //alert("at j=" + j + ", northing is " + north[j] + " and " + north[j+1]);
                }
                
               // labeled marker
               latitude  = (north[j]+north[j+1])/2;
               longitude = east[i];
               
               if(!latitude) {
                    MARCONI.stdlib.warn("x-axis latitude is " + latitude + " when j=" + j);
                }
                if(!longitude) {
                    MARCONI.stdlib.warn("longitude is " + longitude);
                }
                
               var gridRef = USNG.LLtoUSNG(latitude, longitude);
               var parts = gridRef.split(" ");

               var x = parseFloat(parts[2].substr(0,2));

               var z = parseFloat(parts[2].substr(2,3));
                if( z > 500 ) {
                    x++;
                    z=0;
                }

                var labelText = "" + x +"k";
                var marker = this.makeLabel(this.parent, new google.maps.LatLng(latitude,longitude), labelText, "left", "top",
                    this.parent.gridStyle.minorLabelClass);
                this.label_1k.push(marker);
          }
       }

       // place labels on y-axis
       for (i=1; i<2; i++) {
          for (j=1; north[j+1]; j++) {
               // labeled marker
               latitude  = north[j];
               longitude = (east[i]+east[i+1])/2;
               
               if(!latitude) {
                    MARCONI.stdlib.warn("y-axis latitude is " + latitude);
                }
                if(!longitude) {
                    MARCONI.stdlib.warn("y-axis longitude is " + longitude);
                }

               gridRef  = USNG.LLtoUSNG(latitude,longitude);

               parts = gridRef.split(" ");

               var y = parseFloat(parts[3].substr(0,2));
               z = parseFloat(parts[3].substr(2,3));
                if( z > 500 ) {
                    y++;
                    z=0;
                }
              
               labelText = "" + y +"k";
               marker = this.makeLabel(this.parent, new google.maps.LatLng(latitude,longitude), labelText, "center", "top",
                    this.parent.gridStyle.minorLabelClass);
               this.label_1k.push(marker);
         }
       }
   }
   catch(ex) {
       throw("Error placeing 1k markers: " + ex);
   }
}  // end place1kLabels()

Gridcell.prototype.place100mLabels = function(east,north) {
    try {
        
        // only label lines when zoomed way in
        if( this._map.getZoom() < 14) {
            return;
        }
        //++both arrays must have two or more elements++
        if( east.length < 2 || north.length < 2 ) {
            return;
        }
        
        var skipFactor = (this._map.getZoom() > 15 ? 1 : 2);
        
        //++get lengths of respective lat and long arrays++
        var northlen = north.length;
        var eastlen = east.length;
        
        // place "x-axis" labels
        for (var i = 1; east[i+1] ; i+= 1) {
            var count = 1;
            for (var j=1; j< 2; j++) {
                //++will always be at least two elements (code above on line 1254 checks for that)++
                //++array is zero-based, so the first array element is skipped.++
                //++for special case where array only has two elements,++
                //++lat value for north[j+1] is undefined and 'NaN' gets passed to LLtoUSNG here, resulting in error++
                //++added a test for special case of two element array and hard-code distance halfway between two northings++
                if (northlen==2){
                    var gridRefLat = ((north[0]+north[1])/2);
                }else{
                    var gridRefLat = (north[j]+north[j+1])/2;
                }
                var gridRef = USNG.LLtoUSNG(gridRefLat, east[i]);
                var parts = gridRef.split(" ");

                var x = parseFloat(parts[2].substr(0,3));
                var z = parseFloat(parts[2].substr(3,2));
                if( z > 50 ) {
                    x++;
                    z=0;
                }
                
                if( !(x % skipFactor) ) {
                    
                    var insigDigits = (skipFactor == 1 || !(x%10) ? "<sup>00</sup>" : "");
                    //++passing in gridRefLat variable for label++
                    this.label_100m.push(this.makeLabel(this.parent, new google.maps.LatLng(gridRefLat,(east[i])),
                    //((north[j]+north[j+1])/2,(east[i])),
                        MARCONI.stdlib.fixedFormatNumber(x, 1, 0, true) + insigDigits, "left", "top",
                        this.parent.gridStyle.fineLabelClass));
                }
            }
        }

        // place "y-axis" labels, don't worry about skip factor since there's plenty of room comparatively
        for (i=1; i<2; i++) {
            for (j=1; north[j+1]; j++) {
                //++can get a long value of 'NaN' here too, if zoomed in close enough, and viewport is sized right++
                //++again, with special case where easting array only has two elements,++
                //++lon value for east[i+1] is undefined,'NaN' gets passed to LLtoUSNG, and results in error++
                //++add test for special case of two element array and hard-code distance halfway between two eastings++
                if (eastlen==2){
                    var gridRefLon = ((east[0]+east[1])/2);
                }else{
                    var gridRefLon = (east[i]+east[i+1])/2;
                }
                gridRef  = USNG.LLtoUSNG(north[j],gridRefLon,4);
                parts = gridRef.split(" ");
                
                var y = parseFloat(parts[3].substr(0,3));
                z     = parseFloat(parts[3].substr(3,2));

                // if due to roundoff we got something like 99 for z, make it a perfect zero
                if( z > 50) {
                    y++;
                    z=0;
                }
                
                this.label_100m.push(this.makeLabel(
                    this.parent,
                    //++use gridRefLon value for creating label++                    
                    new google.maps.LatLng((north[j]),gridRefLon),
                    MARCONI.stdlib.fixedFormatNumber(y,1,0,true) + "<sup>00</sup>", "center", "top",
                    this.parent.gridStyle.fineLabelClass));
            }
        }
   }
   catch(ex) {
       MARCONI.stdlib.log("Error placing 100-meter markers: " + ex);
       throw("Error placing 100-meter markers: " + ex);
   }
}  // end place100mLabels()

/**++Revised to ensure display of grid lines (see https://code.google.com/p/usng-gmap-v3/issues/detail?id=4). In non-trivial case, now adds both endpoints of a grid line crossing the viewport and having endpoints falling outside of viewport to the array used for rendering polylines ++**/
Gridcell.prototype.checkClip = function(cp, p) {
    ///  implementation of Cohen-Sutherland clipping algorithm to clip grid lines at boundarie
    //        of utm zones and the viewport edges
 
    var that=this;  // so private funcs can see this via that

    var temp;
    var pair = []; //+empty array for coordinate pair+
    var t;
    var u1=cp[p].lng();
    var v1=cp[p].lat();
    var u2=cp[p+1].lng();
    var v2=cp[p+1].lat();
    
    //+flag if nontrivial case+
    var nontrivial = false;
    
    //+flag if coordinates have been swapped for clipping+
    var swap = false;
    
    //+if point falls outside of viewport, determine if point lies above or below viewport, and if point lies to the left or right of viewport+    
    function outcode(lat,lng) {
        var code = 0;
        if (lat < that.slat) {
            code |= 4;
        }
        if (lat > that.nlat) {
            code |= 8;
        }
        if (lng < that.wlng) {
            code |= 1;}
        if (lng > that.elng) {
            code |= 2;
        }
        return code;
    }
    
    //+bitwise code returned after determining where first point lies relative to viewport+
    var code1 = outcode(v1, u1);
        
    //+bitwise code returned after determining where second point lies relative to viewport+
    var code2 = outcode(v2, u2);
    
    //+determine if coordinate pairs are trivial accept or trivial reject case, or non-trivial case+
    //+if non-trivial case, clip segment+
    if (nontrivialcheck(v1,u1,v2,u2)) {
        clip(v1,u1,v2,u2);
    }
        
    function nontrivialcheck(v1,u1,v2,u2){
        //+if both points fall outside of the viewport on the same side (e.g. above, below, to left, or to right)+
        if ((code1 & code2) !== 0) {   // line segment outside window...don't draw it
          return null;
        }
        
        //+if both points fall within viewport (bitwise OR) and,+
        //+if trivial case add first endpoint to array for rendering grid line;+
        //+if non-trivial case add both endpoints to array for rendering grid line+
        if ((code1 | code2) === 0) {   // line segment completely inside window...draw it
           pair[0] = new google.maps.LatLng(v1,u1);
           if (nontrivial) {
            pair[1] = new google.maps.LatLng(v2,u2); 
           }
           nontrivial = false;
           return nontrivial;
        }
        
        //+otherwise, non-trivial case, clip+
        nontrivial = true;
        return nontrivial;
    }
        
    //+if endpoint falls within viewport, return true+
    function inside(lat,lng) {  
        if (lat < that.slat || lat > that.nlat) {
            return 0;
        }
        if (lng < that.wlng || lng > that.elng) {
            return 0;
        }
        return 1;
    }        
            
    function clip(v1,u1,v2,u2) {
        //+check coordinates of first endpoint to determine if point falls within viewport+
        if (inside(v1,u1)) {  // coordinates must be altered
          // swap coordinates
          temp = u1;
          u1 = u2;
          u2 = temp;

          temp = v1;
          v1 = v2;
          v2 = temp;

          temp = code1;
          code1 = code2;
          code2 = temp;
          
          //+flag that swap of coordinates occured and should be swapped again+
          swap = true;
       }
       //+now clip endpoint to boundary of viewport based on point's position relative to the viewport.+
       //generalize code param
       if (code1 & 8) { // clip along northern edge of polygon
          t = (that.nlat - v1)/(v2-v1);
          u1 += t*(u2-u1);
          v1 = that.nlat;
       }
       else if (code1 & 4) { // clip along southern edge
          t = (that.slat - v1)/(v2-v1);
          u1 += t*(u2-u1);
          v1 = that.slat;
       }
       else if (code1 & 1) { // clip along west edge
          t = (that.wlng - u1)/(u2-u1);
          v1 += t*(v2-v1);
          u1 = that.wlng;
       }
       else if (code1 & 2) { // clip along east edge
          t = (that.elng - u1)/(u2-u1);
          v1 += t*(v2-v1);
          u1 = that.elng;
       }
       if (swap){
       //+swap coords again+
       temp = u1;
       u1 = u2;
       u2 = temp;

       temp = v1;
       v1 = v2;
       v2 = temp;
       
       //+reset flag+
       swap = false;
       }
       
       //+get respective endpoints' bitwise codes after clip+
       code1 = outcode(v1, u1);
       code2 = outcode(v2, u2);
       
       //+now check endpoint to determine if it is now on the viewport boundary+
       //+if endpoint is on viewport boundary, but opposite endpoint is outside of viewport, will need to clip again+
       if (nontrivialcheck(v1,u1,v2,u2)) {
        clip(v1,u1,v2,u2);
       }
    }
  if (pair.length == 0){
  return false;
  }else{
  return pair;
  }
 }