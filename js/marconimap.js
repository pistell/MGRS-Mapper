/*
' MARCONI.map core including useful constants, the GeoPoint class, and the SpatialReference class
'
' by Xavier Irias
'
' Purpose:  to convert between coordinate systems
'           including:
'              XY to lat/long
'              lat/long to XY
'              datum-to-datum, both horizontal and vertical
'              and all combinations thereof...
'
' can interconvert among any combination of the following systems:
' Horizontal:
'     NAD27 and NAD83
'     Lambert Conformal as used in CA state-plane
'     UTM, Mercator, Albers Equal Area
'     basic lat/long to/from any of the projections
'
'
' Methods, Accuracy and Precision:
'   Uses ellipsoidal equations for all XY to lat/long calculations
'   Equations based on Snyder's book "Map Projections -- a Working Manual"
'   For datum-to-datum conversions, uses polynomial approx methods
'
'   XY to lat/long conversions, and vice-versa, are both accurate and precise.
'   Datum-to-datum conversions are extremely precise, but their absolute accuracy is
'   inherently limited to the underlying corrective grids.
'   Precision of all methods may be verified by making round-trip conversions.
'   Accuracy was tested against National Geodetic Survey software.
'

 test case from NGS site http://www.ngs.noaa.gov/TOOLS/spc.html for NAD27
    ===========================================================
          North(Feet)       East(Feet)       Datum     Zone
    INPUT =  520000.0          1510000.0        NAD27     0403
    ===========================================================

    LATITUDE        LONGITUDE         AREA
    DD MM SS.sssss  DDD MM SS.sssss       
    --------------  ---------------   ----
    37 54 57.42955  122 11 55.14042    403

    ie. 37.915952652777777777777777777778
    by 122.19865011666666666666666666667
    

Regression testing suite for NAD27 feet to NAD83 feet, State Plane zone 3, using grid-based correction:

NAD 27		                NAD 83 
X	            Y	        X	            Y
1,486,710.00	537,380.00	6,048,077.54	2,177,786.85
1,548,730.00	520,200.00	6,110,097.66	2,160,605.93
1,541,630.00	435,950.00	6,102,996.78	2,076,356.72
1,585,490.00	472,160.00	6,146,857.50	2,112,565.65
1,481,800.00	487,100.00	6,043,166.97	2,127,507.24
1,678,000.00	511,600.00	6,239,367.81	2,152,004.64
1,899,740.00	640,090.00	6,461,107.94	2,280,492.07
1,737,825.61	747,729.51	6,299,194.23	2,388,131.74
2,128,705.35	746,754.93	6,690,077.24	2,387,154.23


Washington monument is a good test point:
USNG grid location 18SUJ2348306479  at lat-long 38° 53' 22", -77° 2' 7" or 38.889471 latitude, -77.035242 longitude
UTM zone 18 xy is 323483, 4306479

Sample use:

var pt = new MARCONI.map.GeoPoint(1500000,450000);
var spatialRefIn  = new MARCONI.map.SpatialReference(MARCONI.map.COORDSYS_CAZONE3, MARCONI.map.DATUM_HORIZ_1927, MARCONI.map.UNITS_SURVEYFEET);
var spatialRefOut = new MARCONI.map.SpatialReference(MARCONI.map.COORDSYS_CAZONE3, MARCONI.map.DATUM_HORIZ_1983, MARCONI.map.UNITS_SURVEYFEET);
pt.convert(spatialRefIn, spatialRefOut);
alert("Transformed point is " + pt.x + ", " + pt.y);


Prior to 1955, the official definition of a foot in the US
was slightly shorter than an international foot.  The short foot
is called a US survey foot, and it's about 99.9999% or so the size of a
"regular" foot.
For pre-1955 coordinate systems, e.g., State Plane coords referenced to NAD27,
the practice of using survey feet was legislated.
NAD 83 State Plane Coordinates were designed to be metric so there is
no legislation to provide guidance on which kind of foot to use.
After some research, it was determined that the unofficial standard
practice is to use survey feet for NAD 83 reporting as well. Therefore,
the GeoPoint class uses survey feet exclusively when the user inputs or requests feet.
The constants for "real" feet are still retained for possible future use.
Although the difference in the conversion factor is
negligible for converting reasonable distances, it is significant
when converting to and from state plane coordinates, since
those coordinates have values of hundreds of thousands or millions
(Typical error is about 10')


Copyright (c) 2010, East Bay Municipal Utility District
All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice,
this list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
this list of conditions and the following disclaimer in the documentation and/or
other materials provided with the distribution.

* Neither the name of the East Bay Municipal Utility District nor the names of its contributors
may be used to endorse or promote products derived from this software
without specific prior written permission.


THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/

MARCONI.map = function() {
    var METERS_TO_SURVEY_FEET = 3.28083333333333;
    var SURVEY_FEET_TO_METERS = 1.0 / METERS_TO_SURVEY_FEET;

    // post-1955 "standard" definition of feet to meters is international standard
    // used for example by Oregon for its state plane system, but not used by most states
    var METERS_TO_INTERNATIONAL_FEET = 100 / (2.54 * 12);
    var INTERNATIONALFEET_TO_METERS  = 12 * 2.54 / 100;

    var DEGREES_TO_RADIANS = Math.PI/ 180;
    var RADIANS_TO_DEGREES = 180 / Math.PI;

    // ellipsoid constants
    var ELLIPSOID_GRS80 = "GRS80";
    var ELLIPSOID_WGS84 = "WGS84";
    var ELLIPSOID_AIRY1830  = "AIRY";
    var ELLIPSOID_AIRY1849  = "AIRY1849";
    var ELLIPSOID_CLARKE1866 = "CLARKE1866";
    var ELLIPSOID_BESSEL = "BESSEL";  // BESSEL 1842
    
    var ELLIPSOID_GRS80_STR = "GRS 80";
    var ELLIPSOID_CLARKE1866_STR = "Clarke 1866";
    var ELLIPSOID_WGS84_STR = "WGS 84";

    var RADIUS_CLARKE1866_METERS = 6378206.4;
    var RADIUS_WGS84_METERS      = 6378137.0;
    var RADIUS_GRS80_METERS      = 6378137.0;
    var RADIUS_AIRY1830_METERS   = 6377563.396;
    var RADIUS_AIRY1849_METERS   = 6377340.189;

    var RADIUS_CLARKE1866_SURVEYFEET   = RADIUS_CLARKE1866_METERS * METERS_TO_SURVEY_FEET;
    var RADIUS_GRS80_SURVEYFEET        = RADIUS_GRS80_METERS      * METERS_TO_SURVEY_FEET;
    var RADIUS_GRS80_INTERNATIONALFEET = RADIUS_GRS80_METERS      * METERS_TO_INTERNATIONAL_FEET;

    var eSquared_CLARKE1866            = 0.006768658;
    var eSquared_WGS84                 = 0.00669437999014;
    var eSquared_GRS80                 = 0.00669438;
    var eSquared_AIRY1830              = 0.006670540074149084;
    var eSquared_AIRY1849              = 0.00667054015;
        
    var E_CLARKE1866                   = 0.0822718542230039;
    var E_GRS80                        = 0.0818191911198883;
    var E_WGS84                        = 0.081819190842622;
    var E_AIRY1830                     = 0.0816733743281685;
    var E_AIRY1849                     = 0.08167337375652854;
    
    var FINV_CLARKE1866                = 294.9786982;
    var FINV_GRS80                     = 298.257222101;
    var FINV_WGS84                     = 298.257223563;
    var FINV_AIRY1830                  = 299.3249753;
    var FINV_AIRY1849                  = 299.3249646;
    
    // these codes for datum, units, coord systems, etc. should be used by any source code in lieu
    // of literal strings, to ensure exact matches with no only javscript source but also database code values
    var DATUM_HORIZ_1927    = "NAD27";
    var DATUM_HORIZ_1983    = "NAD83";
    var DATUM_HORIZ_WGS84   = "WGS84";
    var DATUM_HORIZ_OSGB    = "OSGB";
    var DATUM_HORIZ_IRISH65   = "IRISH65";
    
    var DATUM_HORIZ_DEFAULT = DATUM_HORIZ_WGS84;

    var UNITS_INTERNATIONALFEET = "ft";
    var UNITS_SURVEYFEET        = "usft";
    var UNITS_METERS            = "m";
    var UNITS_KILOMETERS        = "km";
    var UNITS_MILES             = "mi";
    var UNITS_DEGREES           = "degrees";
    var UNITS_GRID              = "grid";
    var UNITS_SQUAREMETERS      = "sqm";
    var UNITS_HECTARES          = "hectare";
    var UNITS_ACRES             = "ac";
    var UNITS_NAUTMILES         = "nmi";
    var UNITS_SQUAREMILES       = "sqmi";
    var UNITS_SQUARENAUTMILES   = "sqnmi";
    var UNITS_DEFAULT           = UNITS_DEGREES;

    var COORDSYS_WORLD             = "WORLD";
    var COORDSYS_CAZONE2           = "CAZONE2";
    var COORDSYS_CAZONE3           = "CAZONE3";
    var COORDSYS_CAZONE4           = "CAZONE4";
    var COORDSYS_UTM10             = "UTM10";
    var COORDSYS_USNG              = "USNG";
    var COORDSYS_MGRS              = "MGRS";
    var COORDSYS_GARS              = "GARS";
    var COORDSYS_CAP_CLASSIC       = "CAP_CLASSIC";
    var COORDSYS_CAP_CELL          = "CAP_CELL";
    var COORDSYS_ALBERS_CONUS      = "ALBERS_CONUS";
    var COORDSYS_EBMUDGRID         = "EBMUD";
    var COORDSYS_LAMBERTCUSTOM     = "LAMBERTCUSTOM";
    var COORDSYS_TMCUSTOM          = "TMCUSTOM";
    var COORDSYS_UTM18             = "UTM18";
    var COORDSYS_UTM               = "UTM";
    var COORDSYS_DEFAULT           = COORDSYS_WORLD;
    var COORDSYS_OSGB              = "OSGB"; // Ordnance Survey Great Britain
    var COORDSYS_IRISH             = "IRISH"; 
    
    var DATUM_HORIZ_1927_STR  = "NAD 1927";
    var DATUM_HORIZ_1983_STR  = "NAD 1983";
    var DATUM_HORIZ_WGS84_STR = "WGS84";
    var DATUM_HORIZ_OSGB_STR  = "OSGB datum";
    var DATUM_HORIZ_IRISH65_STR = "Irish 1965 datum";
    var DATUM_HORIZ_DEFAULT_STR = DATUM_HORIZ_WGS84_STR;

    var UNITS_INTERNATIONALFEET_STR = "International feet (rarely used)";
    var UNITS_SURVEYFEET_STR        = "US Survey feet (usual kind for maps)";
    var UNITS_METERS_STR            = "Meters";
    var UNITS_MILES_STR             = "Miles";
    var UNITS_NAUTMILES_STR         = "Nautical Miles";
    var UNITS_KILOMETERS_STR        = "Kilometers";
    var UNITS_DEGREES_STR           = "Degrees";
    var UNITS_GRID_STR              = "Grid and-or page designation";   // for grids or atlas systems
    var UNITS_SQUAREMETERS_STR      = "Square meters";
    var UNITS_HECTARES_STR          = "Hectare";
    var UNITS_ACRES_STR             = "Acre";
    var UNITS_SQUAREMILES_STR       = "Square miles";
    var UNITS_SQUARENAUTMILES_STR   = "Square nautical miles";
    
    var COORDSYS_WORLD_STR          = "World (lat/long)";
    var COORDSYS_CAZONE2_STR        = "CA Zone 2";
    var COORDSYS_CAZONE3_STR        = "CA Zone 3 (SF Bay Area)";
    var COORDSYS_CAZONE4_STR        = "CA Zone 4";
    var COORDSYS_UTM10_STR          = "UTM Zone 10 (SF Bay Area)";
    var COORDSYS_USNG_STR           = "US National Grid";
    var COORDSYS_MGRS_STR           = "US Military Grid Ref System (MGRS)";
    var COORDSYS_GARS_STR           = "Global Area Reference System grid (GARS)";
    var COORDSYS_CAP_CLASSIC_STR    = "Civil Air Patrol classic";
    var COORDSYS_CAP_CELL_STR       = "Civil Air Patrol Cell system";
    var COORDSYS_ALBERS_CONUS_STR   = "Albers Equal-area conic for CONUS";
    var COORDSYS_TMCUSTOM_STR       = "Custom Transverse Mercator";
    var COORDSYS_UTM18_STR          = "UTM Zone 18";
    var COORDSYS_UTM_STR            = "UTM";
    var COORDSYS_EBMUDGRID_STR      = "EBMUD map grid";
    var COORDSYS_LAMBERTCUSTOM_STR  = "Lambert custom";
    var COORDSYS_OSGB_STR           = "Ordnance Survey Great Britain";
    var COORDSYS_IRISH_STR          = "Irish Grid";

    var COORDSYS_TYPE_WORLD    = "WORLD";
    var COORDSYS_TYPE_LAMBERT  = "LAMBERT";
    var COORDSYS_TYPE_TM       = "TM";
    var COORDSYS_TYPE_GRID     = "GRID";
    var COORDSYS_TYPE_ATLAS    = "ATLAS";
    var COORDSYS_TYPE_MERCATOR = "MERCATOR";
    var COORDSYS_TYPE_ALBERS   = "ALBERS";
    var COORDSYS_TYPE_STEREO   = "STEREO";

    var SPATIALREF_LATLONG_WGS84 = "LATLONG_WGS84";
    var SPATIALREF_LATLONG_NAD27 = "LATLONG_NAD27";
    var SPATIALREF_LATLONG_NAD83 = "LATLONG_NAD83";
    var SPATIALREF_LATLONG_OSGB  = "LATLONG_OSGB";
    var SPATIALREF_UTM10_NAD83   = "UTM10_NAD83";
    var SPATIALREF_UTM10_NAD27   = "UTM10_NAD27";
    var SPATIALREF_UTM_NAD83     = "UTM_NAD83";
    var SPATIALREF_UTM_NAD27     = "UTM_NAD27";
    var SPATIALREF_EBMUDGRID     = "EBMUD";
    var SPATIALREF_USNG          = "USNG";
    var SPATIALREF_MGRS          = "MGRS";
    var SPATIALREF_GARS          = "GARS";
    var SPATIALREF_CAP_CLASSIC   = "CAP_CLASSIC";
    var SPATIALREF_CAP_CELL      = "CAP_CELL";
    var SPATIALREF_UTM18_NAD83   = "UTM18_NAD83";
    var SPATIALREF_ALBERS_CONUS  = "ALBERS_CONUS";
    var SPATIALREF_OSGB          = "OSGB";
    var SPATIALREF_IRISH         = "IRISH";

    var SPATIALREF_DEFAULT_INPUT  = SPATIALREF_LATLONG_WGS84;
    var SPATIALREF_DEFAULT_OUTPUT = SPATIALREF_USNG;
    var SPATIALREF_FOR_STORAGE    = SPATIALREF_LATLONG_WGS84;

    var _datumArray = [
        {datumCD: DATUM_HORIZ_1927,  datumName: DATUM_HORIZ_1927_STR,  isActive:true, equitorialAxisMeters: RADIUS_CLARKE1866_METERS, 
            eccentricity: E_CLARKE1866, eccentricitySquared: eSquared_CLARKE1866, flatteningInverse:FINV_CLARKE1866},
        {datumCD: DATUM_HORIZ_1983,  datumName: DATUM_HORIZ_1983_STR,  isActive:true, equitorialAxisMeters: RADIUS_GRS80_METERS,      
            eccentricity: E_GRS80, eccentricitySquared: eSquared_GRS80, flatteningInverse:FINV_GRS80},
        {datumCD: DATUM_HORIZ_WGS84, datumName: DATUM_HORIZ_WGS84_STR, isActive:true, equitorialAxisMeters: RADIUS_WGS84_METERS,      
            eccentricity: E_WGS84, eccentricitySquared:eSquared_WGS84, flatteningInverse:FINV_WGS84},
        {datumCD: DATUM_HORIZ_OSGB,  datumName: DATUM_HORIZ_OSGB_STR,  isActive:true, equitorialAxisMeters: RADIUS_AIRY1830_METERS,       
            eccentricity: E_AIRY1830, eccentricitySquared:eSquared_AIRY1830, flatteningInverse:FINV_AIRY1830},
        {datumCD: DATUM_HORIZ_IRISH65,  datumName: DATUM_HORIZ_IRISH65_STR,  isActive:true, equitorialAxisMeters: RADIUS_AIRY1849_METERS,       
            eccentricity: E_AIRY1849, eccentricitySquared:eSquared_AIRY1849, flatteningInverse:FINV_AIRY1849}
        ];

    var _mapUnitArray = [
        {mapUnitCD: UNITS_DEGREES,            unitName: UNITS_DEGREES_STR, isLinear: false,                                                      isActive:true},
        {mapUnitCD: UNITS_SURVEYFEET,         unitName: UNITS_SURVEYFEET_STR, isLinear: true, metersPerUnit:  SURVEY_FEET_TO_METERS,             isActive:true},
        {mapUnitCD: UNITS_MILES,              unitName: UNITS_MILES_STR, isLinear: true, metersPerUnit:  SURVEY_FEET_TO_METERS*5280.0,           isActive:true},
        {mapUnitCD: UNITS_METERS,             unitName: UNITS_METERS_STR, isLinear: true, metersPerUnit: 1.0,                                    isActive:true},
        {mapUnitCD: UNITS_KILOMETERS,         unitName: UNITS_KILOMETERS_STR, isLinear: true, metersPerUnit: 1000.0,                             isActive:true},
        {mapUnitCD: UNITS_NAUTMILES,          unitName: UNITS_NAUTMILES_STR, isLinear: true, metersPerUnit:  1852.0, isActive:true},
        {mapUnitCD: UNITS_GRID,               unitName: UNITS_GRID_STR, isLinear: false,                                                         isActive:true},
        {mapUnitCD: UNITS_INTERNATIONALFEET,  unitName: UNITS_INTERNATIONALFEET_STR, isLinear: true, metersPerUnit: INTERNATIONALFEET_TO_METERS, isActive:true},
        {mapUnitCD: UNITS_SQUAREMETERS,       unitName: UNITS_SQUAREMETERS_STR, isLinear: false, metersPerUnit: 1.0, isAreal: true,              isActive:true},
        {mapUnitCD: UNITS_HECTARES,           unitName: UNITS_HECTARES_STR, isLinear: false, metersPerUnit: 10000, isAreal: true,                isActive:true},
        {mapUnitCD: UNITS_ACRES,              unitName: UNITS_ACRES_STR, isLinear: false, metersPerUnit: 4046.85642, isAreal: true,              isActive:true},
        {mapUnitCD: UNITS_SQUAREMILES,        unitName: UNITS_ACRES_STR, isLinear: false, metersPerUnit: 2589988.11, isAreal: true,        isActive:true},
        {mapUnitCD: UNITS_SQUARENAUTMILES,    unitName: UNITS_ACRES_STR, isLinear: false, metersPerUnit: 1852*1852, isAreal: true,     isActive:true}
        ];

    var _coordSysArray = [
        {coordSysCD: COORDSYS_WORLD,                     coordSysName: COORDSYS_WORLD_STR,                      coordSysTypeCD: COORDSYS_TYPE_WORLD,    isActive: true},
        {coordSysCD: COORDSYS_CAZONE2,                   coordSysName: COORDSYS_CAZONE2_STR,                    coordSysTypeCD: COORDSYS_TYPE_LAMBERT,  isActive: false},
        {coordSysCD: COORDSYS_CAZONE3,                   coordSysName: COORDSYS_CAZONE3_STR,                    coordSysTypeCD: COORDSYS_TYPE_LAMBERT,  isActive: true},
        {coordSysCD: COORDSYS_CAZONE4,                   coordSysName: COORDSYS_CAZONE4_STR,                    coordSysTypeCD: COORDSYS_TYPE_LAMBERT,  isActive: false},
        {coordSysCD: COORDSYS_UTM,                       coordSysName: COORDSYS_UTM_STR,                        coordSysTypeCD: COORDSYS_TYPE_GRID,     isActive: true},
        {coordSysCD: COORDSYS_UTM10,                     coordSysName: COORDSYS_UTM10_STR,                      coordSysTypeCD: COORDSYS_TYPE_TM,       isActive: true},
        {coordSysCD: COORDSYS_UTM18,                     coordSysName: COORDSYS_UTM18_STR,                      coordSysTypeCD: COORDSYS_TYPE_TM,       isActive: false},
        {coordSysCD: COORDSYS_USNG,                      coordSysName: COORDSYS_USNG_STR,                       coordSysTypeCD: COORDSYS_TYPE_GRID,     isActive: true},
        {coordSysCD: COORDSYS_MGRS,                      coordSysName: COORDSYS_MGRS_STR,                       coordSysTypeCD: COORDSYS_TYPE_GRID,     isActive: true},
        {coordSysCD: COORDSYS_GARS,                      coordSysName: COORDSYS_GARS_STR,                       coordSysTypeCD: COORDSYS_TYPE_GRID,     isActive: true},
        {coordSysCD: COORDSYS_CAP_CLASSIC,               coordSysName: COORDSYS_CAP_CLASSIC_STR,                coordSysTypeCD: COORDSYS_TYPE_GRID,     isActive: true},
        {coordSysCD: COORDSYS_CAP_CELL,                  coordSysName: COORDSYS_CAP_CELL_STR,                   coordSysTypeCD: COORDSYS_TYPE_GRID,     isActive: true},
        {coordSysCD: COORDSYS_ALBERS_CONUS,              coordSysName: COORDSYS_ALBERS_CONUS_STR,               coordSysTypeCD: COORDSYS_TYPE_ALBERS,   isActive: true},
        {coordSysCD: COORDSYS_EBMUDGRID,                 coordSysName: COORDSYS_EBMUDGRID_STR,                  coordSysTypeCD: COORDSYS_TYPE_GRID,     isActive: true, 
            stateCD: "CA", zone: 3, gridTemplate: "{0,number,0000}B{1,number,000}", 
            gridCellSizeHorizontal: 3000, gridCellSizeVertical: 2000, baseCoordSysCD: COORDSYS_CAZONE3},
        {coordSysCD: COORDSYS_LAMBERTCUSTOM,             coordSysName: COORDSYS_LAMBERTCUSTOM_STR,              coordSysTypeCD: COORDSYS_TYPE_LAMBERT,  isActive: true},
        {coordSysCD: COORDSYS_TMCUSTOM,                  coordSysName: COORDSYS_TMCUSTOM_STR,                   coordSysTypeCD: COORDSYS_TYPE_TM,       isActive: true},
        {coordSysCD: COORDSYS_OSGB,                      coordSysName: COORDSYS_OSGB_STR,                       coordSysTypeCD: COORDSYS_TYPE_GRID,     isActive: true},
        {coordSysCD: COORDSYS_IRISH,                     coordSysName: COORDSYS_IRISH_STR,                      coordSysTypeCD: COORDSYS_TYPE_GRID,     isActive: true}
        ];


    // datum shifts, if named the names should be identical to any functionally identical datum shifts defined on the server
    // so that ajax refresh does not create a duplicate datum shift 
    var _datumShifts = [
        {fromDatumCD: DATUM_HORIZ_1983, toDatumCD: DATUM_HORIZ_WGS84,  datumShiftMethodCD: 'SYNONYM', datumShiftMethodName: 'Synonym -- the datums are essentially identical', isActive:true},
        {fromDatumCD: DATUM_HORIZ_1927, toDatumCD: DATUM_HORIZ_WGS84,  datumShiftMethodCD: 'MRE',     datumShiftMethodName: 'Multiple Regression Equation (MRE)', isActive:true,
            longitudeCoefficients:
            [
            {expLat: 0, expLong: 0, value: -0.88437},
            {expLat: 0, expLong: 1, value:  2.05061},
            {expLat: 1, expLong: 1, value: -0.76804},
            {expLat: 2, expLong: 0, value:  0.26361},
            {expLat: 0, expLong: 2, value:  0.13374},
            {expLat: 2, expLong: 1, value: -0.52162},
            {expLat: 1, expLong: 2, value: -1.05853},
            {expLat: 2, expLong: 2, value: -0.49211},
            {expLat: 3, expLong: 0, value: -1.31974},
            {expLat: 1, expLong: 3, value:  2.17204},
            {expLat: 0, expLong: 4, value: -0.06004},
            {expLat: 4, expLong: 1, value:  0.30139},
            {expLat: 1, expLong: 4, value:  1.88585},
            {expLat: 1, expLong: 5, value: -0.81162},
            {expLat: 3, expLong: 5, value: -0.12948},
            {expLat: 0, expLong: 6, value: -0.05183},
            {expLat: 1, expLong: 6, value: -0.96723},
            {expLat: 8, expLong: 1, value: -0.44507},
            {expLat: 1, expLong: 8, value:  0.18882},
            {expLat: 9, expLong: 0, value:  3.41827},
            {expLat: 0, expLong: 9, value: -0.01444},
            {expLat: 1, expLong: 9, value:  0.04794},
            {expLat: 9, expLong: 3, value: -0.59013}
            ],
        latitudeCoefficients: [
            {expLat: 0, expLong: 0, value:  0.16984},
            {expLat: 0, expLong: 1, value:  0.09585},
            {expLat: 1, expLong: 0, value: -0.76173},
            {expLat: 0, expLong: 3, value: 0.49831},
            {expLat: 0, expLong: 4, value: 0.1145},
            {expLat: 1, expLong: 3, value: 0.12415},
            {expLat: 2, expLong: 0, value: 1.09919},
            {expLat: 2, expLong: 1, value: -1.13239},
            {expLat: 3, expLong: 0, value: -4.57801},
            {expLat: 3, expLong: 1, value: -0.98399},
            {expLat: 5, expLong: 0, value: 27.05396},
            {expLat: 0, expLong: 5, value: -0.37548},
            {expLat: 0, expLong: 6, value: -0.14197},
            {expLat: 0, expLong: 7, value: 0.07439},
            {expLat: 0, expLong: 8, value: 0.03385},
            {expLat: 2, expLong: 3, value: 0.73357},
            {expLat: 3, expLong: 9, value: -0.07653},
            {expLat: 4, expLong: 1, value: 2.03449},
            {expLat: 4, expLong: 9, value: 0.08646},
            {expLat: 6, expLong: 3, value: -1.30575},
            {expLat: 7, expLong: 0, value: -59.96555},
            {expLat: 8, expLong: 0, value: -4.76082},
            {expLat: 9, expLong: 0, value: 49.0432}
        ],
        scaleFactor: .05235988, 
        shiftY: 37,
        shiftX: -95, latitudeMin:20, latitudeMax:50, longitudeMin: -131, longitudeMax:-63
        },
        {
            datumShiftName: 'CONUS', fromDatumCD: DATUM_HORIZ_1927, toDatumCD: DATUM_HORIZ_WGS84,  datumShiftMethodCD: 'MOLODENSKY', datumShiftMethodName: 'Molodensky three-parameter offset',
            shiftX: -8, shiftY: 160, shiftZ: 176, isActive:true
        },
        {
            datumShiftName: 'OSGB-M', fromDatumCD: DATUM_HORIZ_OSGB, toDatumCD: DATUM_HORIZ_WGS84,  datumShiftMethodCD: 'MOLODENSKY', datumShiftMethodName: 'Molodensky three-parameter offset',
            shiftX: 375, shiftY: -111, shiftZ: 431, isActive:true
        },
        {
            // see http://www.movable-type.co.uk/scripts/latlong-convert-coords.html
            datumShiftName: 'OSGB-H', fromDatumCD: DATUM_HORIZ_WGS84, toDatumCD: DATUM_HORIZ_OSGB,  datumShiftMethodCD: 'HELMERT', datumShiftMethodName: 'Helmert seven-parameter offset',
            shiftX: -446.448, shiftY: 125.157, shiftZ: -542.060, 
            rotationX: -0.1502, rotationY:-0.2470, rotationZ:-0.8421, scaleFactor: 20.4894,
            isActive:true
        },
        {
            // see http://en.wikipedia.org/wiki/Helmert_transformation
            datumShiftName: 'IRISH-H', fromDatumCD: DATUM_HORIZ_WGS84, toDatumCD: DATUM_HORIZ_IRISH65,  
            datumShiftMethodCD: 'HELMERT', datumShiftMethodName: 'Helmert seven-parameter offset',
            shiftX: -482.53, shiftY: 130.596, shiftZ: -564.557, 
            rotationX: 1.042, rotationY:0.214, rotationZ:.631, scaleFactor: -8.15,
            isActive:true
        }
    ];

    var _atlasArray = [];

    // sometimes we have AJAX calls pending,
    // so whenever we finish the "last" AJAX function we call an onready func if told to do so
    var _pendingAJAXCount=0;
    var _onReadyFunc=null;


    var _spatialRefArray = [
        {spatialReferenceCD:"CAZONE3_NAD27_FT", spatialReferenceName: "CA Zone 3 NAD 27 feet",
            coordSysTypeCD: COORDSYS_TYPE_LAMBERT, coordSysCD: COORDSYS_CAZONE3, coordSysName: COORDSYS_CAZONE3_STR, originLatitude: 36.5, originLongitude: -120.5,
            parallelOne: 37.0 + 4.0 / 60.0, parallelTwo: 38.0 + 26.0 / 60.0,
            originX: 2000000.0, originY: 0, centralScaleFactor: 1.0, mapUnitCD: UNITS_SURVEYFEET, datumCD: DATUM_HORIZ_1927, ellipsoidCD: ELLIPSOID_CLARKE1866,
            ellipsoidName: ELLIPSOID_CLARKE1866_STR, equitorialAxisMeters: RADIUS_CLARKE1866_METERS, eccentricity: E_CLARKE1866, isActive: true
        },
        {spatialReferenceCD: "CAZONE3_NAD27_M", spatialReferenceName: "CA Zone 3 NAD 27 meters",
            coordSysTypeCD: COORDSYS_TYPE_LAMBERT, coordSysCD: COORDSYS_CAZONE3, coordSysName: COORDSYS_CAZONE3_STR, originLatitude: 36.5, originLongitude: -120.5,
            parallelOne: 37.0 + 4.0 / 60.0, parallelTwo: (38.0 + 26.0 / 60.0),
            originX: 2000000.0 * SURVEY_FEET_TO_METERS, originY: 0, centralScaleFactor: 1.0, mapUnitCD: UNITS_METERS, datumCD: DATUM_HORIZ_1927,
            ellipsoidCD: ELLIPSOID_CLARKE1866,
            ellipsoidName: ELLIPSOID_CLARKE1866_STR, equitorialAxisMeters: RADIUS_CLARKE1866_METERS, eccentricity: E_CLARKE1866, isActive: false
        },
        {spatialReferenceCD:"CAZONE3_NAD83_FT", spatialReferenceName: "CA Zone 3 NAD 83 feet",
            coordSysTypeCD: COORDSYS_TYPE_LAMBERT, coordSysCD: COORDSYS_CAZONE3, coordSysName: COORDSYS_CAZONE3_STR, originLatitude: 36.5, originLongitude: -120.5,
            parallelOne: 37.0 + 4.0 / 60.0, parallelTwo: (38.0 + 26.0 / 60.0),
            originX: 2000000.0 * METERS_TO_SURVEY_FEET, originY: 500000.0 * METERS_TO_SURVEY_FEET,
            centralScaleFactor: 1.0, mapUnitCD: UNITS_SURVEYFEET, datumCD: DATUM_HORIZ_1983, ellipsoidCD: ELLIPSOID_GRS80,
            ellipsoidName: ELLIPSOID_GRS80_STR, equitorialAxisMeters: RADIUS_GRS80_METERS, eccentricity: E_GRS80, isActive: true
        },
        {spatialReferenceCD:"CAZONE3_NAD83_M", spatialReferenceName: "CA Zone 3 NAD 83 meters",
            coordSysTypeCD: COORDSYS_TYPE_LAMBERT, coordSysCD: COORDSYS_CAZONE3, coordSysName: COORDSYS_CAZONE3_STR, originLatitude: 36.5, originLongitude: -120.5,
            parallelOne: 37.0 + 4 / 60.0, parallelTwo: (38.0 + 26.0 / 60.0),
            originX: 2000000.0, originY: 500000.0,
            centralScaleFactor: 1.0, mapUnitCD: UNITS_METERS, datumCD: DATUM_HORIZ_1983, ellipsoidCD: ELLIPSOID_GRS80,
            ellipsoidName: ELLIPSOID_GRS80_STR, equitorialAxisMeters: RADIUS_GRS80_METERS, eccentricity: E_GRS80, isActive: false
        },
        {spatialReferenceCD: SPATIALREF_USNG, spatialReferenceName: COORDSYS_USNG_STR,
            coordSysTypeCD: COORDSYS_TYPE_GRID, coordSysCD: COORDSYS_USNG, coordSysName: COORDSYS_USNG_STR, originLatitude: null, originLongitude: null,
            datumCD: DATUM_HORIZ_1983, mapUnitCD: UNITS_GRID, ellipsoidCD: ELLIPSOID_GRS80,
            ellipsoidName: ELLIPSOID_GRS80_STR, equitorialAxisMeters: RADIUS_GRS80_METERS, eccentricity: E_GRS80, isActive: true
        },
        {spatialReferenceCD: SPATIALREF_MGRS, spatialReferenceName: COORDSYS_MGRS_STR,
            coordSysTypeCD: COORDSYS_TYPE_GRID, coordSysCD: COORDSYS_MGRS, coordSysName: COORDSYS_MGRS_STR, originLatitude: null, originLongitude: null,
            datumCD: DATUM_HORIZ_1983, mapUnitCD: UNITS_GRID, ellipsoidCD: ELLIPSOID_GRS80,
            ellipsoidName: ELLIPSOID_GRS80_STR, equitorialAxisMeters: RADIUS_GRS80_METERS, eccentricity: E_GRS80, isActive: false
        },
        {spatialReferenceCD:SPATIALREF_OSGB, spatialReferenceName: COORDSYS_OSGB_STR,
            coordSysTypeCD: COORDSYS_TYPE_GRID, coordSysCD: COORDSYS_OSGB, coordSysName: COORDSYS_OSGB_STR, 
            originLatitude: 49.0, originLongitude: -2.0, originX : 400000, originY : -100000,
            datumCD: DATUM_HORIZ_OSGB, mapUnitCD: UNITS_GRID, centralScaleFactor: 0.9996012717,
            ellipsoidCD: ELLIPSOID_AIRY1830,
            ellipsoidName: ELLIPSOID_AIRY1830, equitorialAxisMeters: RADIUS_AIRY1830_METERS, eccentricity: E_AIRY1830, isActive: true,
            latitudeMin: 42, latitudeMax: 62, 
            longitudeMin: -10, longitudeMax: 4
        },
        {spatialReferenceCD:SPATIALREF_IRISH, spatialReferenceName: COORDSYS_IRISH_STR,
            coordSysTypeCD: COORDSYS_TYPE_GRID, coordSysCD: COORDSYS_IRISH, coordSysName: COORDSYS_IRISH_STR, 
            originLatitude: 53.5, originLongitude: -8.0, originX : 200000, originY : 250000,
            datumCD: DATUM_HORIZ_IRISH65, mapUnitCD: UNITS_GRID, centralScaleFactor: 1.000035,
            ellipsoidCD: ELLIPSOID_AIRY1849,
            ellipsoidName: ELLIPSOID_AIRY1849, equitorialAxisMeters: RADIUS_AIRY1849_METERS, eccentricity: E_AIRY1849, isActive: true,
            latitudeMin: 50, latitudeMax: 57, 
            longitudeMin: -12, longitudeMax: -3
        },
        {spatialReferenceCD: SPATIALREF_UTM_NAD83, spatialReferenceName: COORDSYS_UTM + " NAD83",
            coordSysTypeCD: COORDSYS_TYPE_GRID, coordSysCD: COORDSYS_UTM, coordSysName: COORDSYS_UTM_STR, originLatitude: null, originLongitude: null,
            datumCD: DATUM_HORIZ_1983, mapUnitCD: UNITS_GRID, ellipsoidCD: ELLIPSOID_GRS80,
            ellipsoidName: ELLIPSOID_GRS80_STR, equitorialAxisMeters: RADIUS_GRS80_METERS, eccentricity: E_GRS80, isActive: true
        },
        {spatialReferenceCD: SPATIALREF_UTM_NAD27, spatialReferenceName: COORDSYS_UTM + " NAD27",
            coordSysTypeCD: COORDSYS_TYPE_GRID, coordSysCD: COORDSYS_UTM, coordSysName: COORDSYS_UTM_STR, originLatitude: null, originLongitude: null,
            datumCD: DATUM_HORIZ_1927, mapUnitCD: UNITS_GRID, ellipsoidCD: ELLIPSOID_CLARKE1866,
            ellipsoidName: ELLIPSOID_CLARKE1866_STR, equitorialAxisMeters: RADIUS_CLARKE1866_METERS, eccentricity: E_CLARKE1866, isActive: true
        },
        {spatialReferenceCD:SPATIALREF_GARS, spatialReferenceName: COORDSYS_GARS_STR,
            coordSysTypeCD: COORDSYS_TYPE_GRID, coordSysCD: COORDSYS_GARS, coordSysName: COORDSYS_GARS_STR, originLatitude: null, originLongitude: null,
            datumCD: DATUM_HORIZ_WGS84, mapUnitCD: UNITS_GRID, ellipsoidCD: ELLIPSOID_WGS84,
            ellipsoidName: ELLIPSOID_WGS84_STR, equitorialAxisMeters: RADIUS_WGS84_METERS, eccentricity: E_WGS84, isActive: true
        },
        {spatialReferenceCD:SPATIALREF_CAP_CLASSIC, spatialReferenceName: COORDSYS_CAP_CLASSIC_STR,
            coordSysTypeCD: COORDSYS_TYPE_GRID, coordSysCD: COORDSYS_CAP_CLASSIC, coordSysName: COORDSYS_CAP_CLASSIC_STR, originLatitude: null, originLongitude: null,
            datumCD: DATUM_HORIZ_WGS84, mapUnitCD: UNITS_GRID, ellipsoidCD: ELLIPSOID_WGS84,
            ellipsoidName: ELLIPSOID_WGS84_STR, equitorialAxisMeters: RADIUS_WGS84_METERS, eccentricity: E_WGS84, isActive: true
        },
        {spatialReferenceCD:SPATIALREF_CAP_CELL, spatialReferenceName: COORDSYS_CAP_CELL_STR,
            coordSysTypeCD: COORDSYS_TYPE_GRID, coordSysCD: COORDSYS_CAP_CELL, coordSysName: COORDSYS_CAP_CELL_STR, originLatitude: null, originLongitude: null,
            datumCD: DATUM_HORIZ_WGS84, mapUnitCD: UNITS_GRID, ellipsoidCD: ELLIPSOID_WGS84,
            ellipsoidName: ELLIPSOID_WGS84_STR, equitorialAxisMeters: RADIUS_WGS84_METERS, eccentricity: E_WGS84, isActive: true
        },
        {spatialReferenceCD: SPATIALREF_EBMUDGRID, spatialReferenceName: COORDSYS_EBMUDGRID_STR,
            coordSysTypeCD: COORDSYS_TYPE_GRID, coordSysCD: COORDSYS_EBMUDGRID, coordSysName: COORDSYS_EBMUDGRID_STR,
            originLatitude: null, originLongitude: null,
            parallelOne: null, parallelTwo: null,
            originX: null, originY: null,
            centralScaleFactor: null, mapUnitCD: UNITS_GRID, datumCD: DATUM_HORIZ_1927, ellipsoidCD: ELLIPSOID_CLARKE1866,
            ellipsoidName: ELLIPSOID_CLARKE1866_STR, equitorialAxisMeters: RADIUS_CLARKE1866_METERS, eccentricity: E_CLARKE1866, isActive: true,
            inputResolution:1000, inputResolutionUnitCD: UNITS_SURVEYFEET, 
            latitudeMin: 37.518, latitudeMax: 38.031, 
            longitudeMin: -122.442626953125, longitudeMax: -121.734008789062,
            stateCD: "CA", zone: 3, gridTemplate: "{0,number,0000}B{1,number,000}", 
            gridCellSizeHorizontal: 3000, gridCellSizeVertical: 2000, baseCoordSysCD: COORDSYS_CAZONE3
        
        },
        {spatialReferenceCD:SPATIALREF_LATLONG_NAD27, spatialReferenceName: "Lat-long NAD27",
            coordSysTypeCD: COORDSYS_TYPE_WORLD, coordSysCD: COORDSYS_WORLD, coordSysName: COORDSYS_WORLD_STR, originLatitude: 0, originLongitude: 0,
            mapUnitCD: UNITS_DEGREES, datumCD: DATUM_HORIZ_1927, ellipsoidCD: ELLIPSOID_CLARKE1866,
            ellipsoidName: ELLIPSOID_CLARKE1866_STR, equitorialAxisMeters: RADIUS_CLARKE1866_METERS, eccentricity: E_CLARKE1866, isActive: true
        },

        {spatialReferenceCD:SPATIALREF_LATLONG_NAD83, spatialReferenceName: "Lat-long NAD83",
            coordSysTypeCD: COORDSYS_TYPE_WORLD, coordSysCD: COORDSYS_WORLD, coordSysName: COORDSYS_WORLD_STR, originLatitude: null, originLongitude: null,
            mapUnitCD: UNITS_DEGREES, datumCD: DATUM_HORIZ_1983, ellipsoidCD: ELLIPSOID_GRS80,
            ellipsoidName: ELLIPSOID_GRS80_STR, equitorialAxisMeters: RADIUS_GRS80_METERS, eccentricity: E_GRS80, isActive: true
        },
        {spatialReferenceCD:SPATIALREF_LATLONG_WGS84, spatialReferenceName: "Lat-long WGS84",
            coordSysTypeCD: COORDSYS_TYPE_WORLD, coordSysCD: COORDSYS_WORLD, coordSysName: COORDSYS_WORLD_STR, originLatitude: null, originLongitude: null,
            mapUnitCD: UNITS_DEGREES, datumCD: DATUM_HORIZ_WGS84, ellipsoidCD: ELLIPSOID_WGS84,
            ellipsoidName: ELLIPSOID_WGS84_STR, equitorialAxisMeters: RADIUS_WGS84_METERS, eccentricity: E_WGS84, isActive: true
        },
        {spatialReferenceCD:SPATIALREF_LATLONG_OSGB, spatialReferenceName: "Lat-long OSGB36",
            coordSysTypeCD: COORDSYS_TYPE_WORLD, coordSysCD: COORDSYS_WORLD, coordSysName: COORDSYS_WORLD_STR, originLatitude: 0, originLongitude: 0,
            mapUnitCD: UNITS_DEGREES, datumCD: DATUM_HORIZ_OSGB, ellipsoidCD: ELLIPSOID_AIRY1830,
            ellipsoidName: ELLIPSOID_AIRY1830, equitorialAxisMeters: RADIUS_AIRY1830_METERS, eccentricity: E_AIRY1830, isActive: true
        },
        {spatialReferenceCD: SPATIALREF_UTM10_NAD83, spatialReferenceName: "UTM zone 10, NAD83",
            coordSysTypeCD: COORDSYS_TYPE_TM, coordSysCD: COORDSYS_UTM10, coordSysName: COORDSYS_UTM10_STR, originLatitude: 0, originLongitude: -123,
            originX: 500000.0, originY: 0, centralScaleFactor: 0.9996,
            mapUnitCD: UNITS_METERS, datumCD: DATUM_HORIZ_1983, ellipsoidCD: ELLIPSOID_GRS80,
            ellipsoidName: ELLIPSOID_GRS80_STR, equitorialAxisMeters: RADIUS_GRS80_METERS, eccentricity: E_GRS80, isActive: false
        },
        {spatialReferenceCD: SPATIALREF_UTM10_NAD27, spatialReferenceName: "UTM zone 10, NAD27",
            coordSysTypeCD: COORDSYS_TYPE_TM, coordSysCD: COORDSYS_UTM10, coordSysName: COORDSYS_UTM10_STR, originLatitude: 0, originLongitude: -123,
            originX: 500000.0, originY: 0, centralScaleFactor: 0.9996,
            mapUnitCD: UNITS_METERS, datumCD: DATUM_HORIZ_1927, ellipsoidCD: ELLIPSOID_CLARKE1866,
            ellipsoidName: ELLIPSOID_CLARKE1866_STR, equitorialAxisMeters: RADIUS_CLARKE1866_METERS, eccentricity: E_CLARKE1866, isActive: false
        },

        {spatialReferenceCD: SPATIALREF_UTM18_NAD83, spatialReferenceName: "UTM zone 18, NAD83",
            coordSysTypeCD: COORDSYS_TYPE_TM, coordSysCD: COORDSYS_UTM18, coordSysName: COORDSYS_UTM18_STR, originLatitude: 0, originLongitude: -75,
            originX: 500000.0, originY: 0, centralScaleFactor: 0.9996,
            mapUnitCD: UNITS_METERS, datumCD: DATUM_HORIZ_1983, ellipsoidCD: ELLIPSOID_GRS80,
            ellipsoidName: ELLIPSOID_GRS80_STR, equitorialAxisMeters: RADIUS_GRS80_METERS, eccentricity: E_GRS80, isActive: false
        },

        {spatialReferenceCD: SPATIALREF_ALBERS_CONUS, spatialReferenceName: "Albers Equal-area Conic for CONUS",
            coordSysTypeCD: COORDSYS_TYPE_ALBERS, coordSysCD: COORDSYS_ALBERS_CONUS, coordSysName: COORDSYS_ALBERS_CONUS_STR,
            originLatitude: 37.5, originLongitude: -96, parallelOne: 29.5, parallelTwo: 45.5,
            originX: 0.0, originY: 0.0, centralScaleFactor: 1.0,
            mapUnitCD: UNITS_METERS, datumCD: DATUM_HORIZ_1983, ellipsoidCD: ELLIPSOID_GRS80,
            ellipsoidName: ELLIPSOID_GRS80_STR, equitorialAxisMeters: RADIUS_GRS80_METERS, eccentricity: E_GRS80, isActive: true
        }
    ];

    var _canonicalDatums=null;
    
    function registerAJAXCompletion(msg) {
        var stage="";
        
        
        try {
            _pendingAJAXCount--;

            MARCONI.stdlib.log("Finished " + (msg ? msg : " asynch task") + ", " + _pendingAJAXCount + " tasks still running");
            
            if( _pendingAJAXCount === 0) {
                
                if( _onReadyFunc ) {

                    // MARCONI.stdlib.log("All AJAX map.js calls completed, calling completion callback functions: " + _onReadyFunc);

                    // copy the functions and then clear the original
                    // in case one of the functions is yet another ajax call to ourselves,
                    // in which case confusion would result since the callback function array would be rewritten

                    var callStack = [];
                    for( var i = 0 ; i < _onReadyFunc.length ; i++) {
                        callStack.push(_onReadyFunc[i]);
                    }
                    _onReadyFunc=null;


                    // now use our own private copy of the call stack
                    for( i = 0 ; i < callStack.length ; i++) {
                        
                        callStack[i]("MARCONI map module is ready to use");
                    }
                }
                else {
                    //MARCONI.stdlib.log("All AJAX map.js calls completed");
                }
            }
            else {
                //MARCONI.stdlib.log(_pendingAJAXCount + " calls still pending" + (_onReadyFunc ? ", will call back" : ", no callback registered"));
            }
        }
        catch(ex) {
            throw "Error registering completion of AJAX map calls at stage " + stage + ": " + ex + ", onready type is " + typeof(_onReadyFunc);
        }

    }
    function registerAJAXLaunch(msg) {
        _pendingAJAXCount++;

        if( msg ) {
            MARCONI.stdlib.log("Launched " + (msg ? msg : "asynch task") + ", pending task count is " + _pendingAJAXCount);
        }
    }

    // key for DOM storage
    function storageDataKey(entity, queryString) {
        return (entity ? entity  : "data") + "_" + (queryString ? queryString : "");
    }

    // get data from DOM storage if available and not expired
    // looking at cfg.minDate for expire date
    function getFromStorage( entity, queryString, onSuccess, onError, cfg ) {
        // attempt to read the indicated data from DOM storage
        // return true or false to indicate failure or at least possible success
        // If successful, invoke onSuccess with the data; else invoke onError with a message if not

        var MAX_AGE_MINUTES = 24*60*7;  // a week default is reasonably safe for most data

        function doGet( entity, queryString, cfg ) {
            try {

                var rawData = null;

                try {
                    rawData = engine.getItem( storageDataKey(entity, queryString) );
                }
                catch(getEx) {
                     MARCONI.stdlib.warn("Exception reading raw " + entity + " data from storage: " + getEx);
                }

                if( rawData ) {

                    //MARCONI.stdlib.log("parsing raw " + entity + " data retrieved from storage");
                    
                    var dataObject = YAHOO.lang.JSON.parse(rawData);

                    var dataArray    = dataObject && dataObject.data || dataObject;

                    var dateStored   = dataObject && dataObject.dateStored ?
                        (typeof(dataObject.dateStored)=="string" ? MARCONI.datetime.parseDate(dataObject.dateStored) : dataObject.dateStored) : null;

                    // establish minDate, the min cache date which we will accept -- anything earlier is too stale
                    var minDate = typeof(cfg.minDate)=="string" ? MARCONI.datetime.parseDate(cfg.minDate) : cfg.minDate;

                    // maxMinutes defaults only when minDate is not given
                    var maxMinutes = cfg.maxMinutes ? cfg.maxMinutes : (minDate ? null : MAX_AGE_MINUTES);

                    if( maxMinutes ) {
                        // compute minDate based on maxMinutes
                        var possibleMinDate = new Date(new Date().valueOf() - 1000*60*maxMinutes);

                        // use the most restrictive minDate
                        if( !minDate || possibleMinDate > minDate ) {

                            minDate = possibleMinDate;

                        }
                    }

                    if( dateStored && (dateStored > minDate) ) {
                        MARCONI.stdlib.log("Got useful " + entity + " data " + (queryString ? "for query " + queryString : "") +
                            " from DOM storage, date stored was " + dateStored + " versus min date of " + minDate);

                        return dataArray;
                    }
                    else {
                        MARCONI.stdlib.log("Got expired " + entity + " data for query " + queryString + " from DOM storage, date stored was " +
                            dateStored + " versus min date of " + minDate);
                    }
                }
                else {
                    MARCONI.stdlib.log("No useful " + entity + " data read from DOM storage" + (queryString ? ", " + queryString : ""));
                }

                return null;
            }
            catch(ex) {
                throw "Error doing user-data get from storage: " + ex;
            }
        }

        if(!entity) {
            throw "Must provide entity to getFromStorage()";
        }
        if(!onSuccess) {
            throw "Must provide onSuccess callback to getFromStorage()";
        }
        if(!onError) {
            throw "Must provide onError callback to getFromStorage()";
        }

        var engine=null;
        try {
            engine = YAHOO.util.StorageManager.get(YAHOO.util.StorageEngineHTML5.ENGINE_NAME, YAHOO.util.StorageManager.LOCATION_LOCAL, {force:true} );
            if(!engine) {
                return null;
            }
        }
        catch(ex) {
            engine=null;
        }

        if(engine) {
            if( engine.isReady ) {
                
                // MARCONI.stdlib.log("Engine already running, will get " + entity + " data immediately");

                try {
                    var data = doGet(entity, queryString, cfg );
                    
                    if( data ) {
                        onSuccess(data, cfg);
                    }
                    else {
                        return false;
                    }
                }
                catch(ex) {
                    throw "Error doing immediate fetch of " + entity + queryString + " from DOM storage: " + ex;
                }
            }
            else {
                //MARCONI.stdlib.log("Registering with storage engine to callback and get " + entity + queryString + " data from DOM storage");

                engine.subscribe( engine.CE_READY, function(e) {
                    try {

                        var dataArray = doGet(entity, queryString , cfg );

                        if( dataArray ) {
                            onSuccess( dataArray, cfg);
                        }
                        else {
                            onError("No " + entity + " data", cfg);
                        }

                        registerAJAXCompletion("fetching " + entity + " from storage");
                    }
                    catch(ex) {
                        onError(ex, cfg);
                    }

                });

                registerAJAXLaunch("fetch of " + entity + " from storage");
            }
            return true;
        }
        return false;

    }

    function putToStorage(entity, queryString, data, onSuccess, onError) {
        function doPut(entity, queryString, data, onSuccess, onError) {
            MARCONI.stdlib.log("About to save " + entity + queryString + " data to DOM storage");

            try {

                var dataString = YAHOO.lang.JSON.stringify({data:data, dateStored: MARCONI.datetime.dateToString(new Date())});

                engine.setItem(storageDataKey(entity, queryString), dataString);

                MARCONI.stdlib.log("Saved " + entity + " data to DOM storage");

                if(onSuccess) {
                    onSuccess("data stored");
                }
            }
            catch(ex) {
                MARCONI.stdlib.warn("Error " + ex + " trying to save " + entity + " data to DOM storage");
                if( onError ) {
                    onError(ex);
                }
                return false;
            }
        }

        var engine=null;
        try {
            engine = YAHOO.util.StorageManager.get(YAHOO.util.StorageEngineHTML5.ENGINE_NAME, YAHOO.util.StorageManager.LOCATION_LOCAL, {force:true} );
            if(!engine) {
                MARCONI.stdlib.log("No storage engine, cannot save " + entity + " data to DOM storage");

                return null;
            }
        }
        catch(ex) {
            engine=null;
        }

        try {

            if( engine) {
                if( engine.isReady ) {
                    // MARCONI.stdlib.log("Storage engine already running, will save " + entity + queryString + " data to DOM storage");
                    
                    doPut(entity, queryString, data, onSuccess, onError);
                }
                else {
                    MARCONI.stdlib.log("Subscribing to event to save " + entity + queryString + " data to DOM storage");

                    engine.subscribe( engine.CE_READY, function(e) {
                        doPut(entity, queryString, data, onSuccess, onError);
                        registerAJAXCompletion("Storage of " + entity + queryString);
                    });
                
                    registerAJAXLaunch("Finished asynch storage of " + entity + queryString);
                }

                return true;
            }
        }
        catch(ex) {
            if( onError ) {
                onError(ex);
            }
            return false;
        }
        return false;
    }


    var _CAPSections = [  // Civil Air Patrol
        // normal grid cells are 15 minutes of latitude, 15 minutes of longitude
        
        {code: "SEA", sectionName : "Seattle",            north: 49,    south: 44.5, west: -125,  east: -117},
        {code: "GTF", sectionName : "Great Falls",        north: 49,    south: 44.5, west: -117,  east: -109},
        {code: "BIL", sectionName : "Billings",           north: 49,    south: 44.5, west: -109,  east: -101},
        {code: "MSP", sectionName : "Twin Cities",        north: 49,    south: 44.5, west: -101,  east: -93},
        {code: "GRB", sectionName : "Green Bay",          north: 48.25, south: 44, west: -93,     east: -85},
        {code: "LHN", sectionName : "Lake Huron",         north: 48,    south: 44, west: -85,     east: -77},
        {code: "MON", sectionName : "Montreal",           north: 48,    south: 44, west: -77,     east: -69},
        {code: "HFX", sectionName : "Halifax",            north: 48,    south: 44, west: -69,     east: -61},
    
        {code: "LMT", sectionName : "Klamath Falls",      north: 44.5,  south: 40, west: -125,     east: -117},
        {code: "SLC", sectionName : "Salt Lake City",     north: 44.5,  south: 40, west: -117,     east: -109},
        {code: "CYS", sectionName : "Cheyenne",           north: 44.5,  south: 40, west: -109,     east: -101},
        {code: "OMA", sectionName : "Omaha",              north: 44.5,  south: 40, west: -101,     east: -93},
        {code: "ORD", sectionName : "Chicago",            north: 44,    south: 40, west: -93,     east: -85},
        {code: "DET", sectionName : "Detroit",            north: 44,    south: 40, west: -85,     east: -77},
        {code: "NYC", sectionName : "New York",           north: 44,    south: 40, west: -77,     east: -69},
    
        {code: "SFO", sectionName : "San Franciso",       north: 40,    south: 36,    west: -125,     east: -118},
        {code: "LAX", sectionName : "Los Angeles",        north: 36,    south: 32,    west: -121.5,     east: -115},
        {code: "LAS", sectionName : "Las Vegas",          north: 40,    south: 35.75, west: -118,     east: -111},
        {code: "DEN", sectionName : "Denver",             north: 40,    south: 35.75, west: -111,     east: -104},
        {code: "ICT", sectionName : "Wichita",            north: 40,    south: 36,    west: -104,     east: -97},
        {code: "MKC", sectionName : "Kansas City",        north: 40,    south: 36,    west: -97,     east: -90},
        {code: "STL", sectionName : "St. Louis",          north: 40,    south: 36,    west: -91,     east: -84},
        {code: "LUK", sectionName : "Cincinnati",         north: 40,    south: 36,    west: -85,     east: -78},
        {code: "DCA", sectionName : "Washington",         north: 40,    south: 36,    west: -79,     east: -72},
    
        {code: "PHX", sectionName : "Phoenix",            north: 35.75, south: 31.25, west: -116,     east: -109},
        {code: "ABQ", sectionName : "Albuquerque",        north: 36,    south: 32,    west: -109,     east: -102},
        {code: "DFW", sectionName : "Dallas - Ft. Worth", north: 36,    south: 32,    west: -102,     east: -95},
        {code: "MEM", sectionName : "Memphis",            north: 36,    south: 32,    west: -95,     east: -88},
        {code: "ATL", sectionName : "Atlanta",            north: 36,    south: 32,    west: -88,     east: -81},
        {code: "CLT", sectionName : "Charlotte",          north: 36,    south: 32,    west: -81,     east: -75},
   
        {code: "ELP", sectionName : "El Paso",            north: 32,    south: 28,    west: -109,     east: -103},
        {code: "SAT", sectionName : "San Antonio",        north: 32,    south: 28,    west: -103,     east: -97},
        {code: "HOU", sectionName : "Houstone",           north: 32,    south: 28,    west: -97,     east: -91},
        {code: "MSY", sectionName : "New Orleans",        north: 32,    south: 28,    west: -91,     east: -85},
        {code: "JAX", sectionName : "Jacksonville",       north: 32,    south: 28,    west: -85,     east: -79},

        {code: "BRO", sectionName : "Brownsville",        north: 28,    south: 24,    west: -103,     east: -97},
        {code: "MIA", sectionName : "Miami",              north: 28,    south: 24,    west: -83,     east: -77},
    
        // Alaska grids are 30 minutes latitude, one degree of longitude
        {code: "AL_I",    sectionName : "Alaska I",       north: 72,    south: 68,    west: -175,  east: -160, widthMinutes: 60, heightMinutes: 30},
        {code: "AL_II",   sectionName : "Alaska II",      north: 72,    south: 68,    west: -160,  east: -144, widthMinutes: 60, heightMinutes: 30},
        {code: "AL_III",  sectionName : "Alaska III",     north: 72,    south: 68,    west: -144,  east: -128, widthMinutes: 60, heightMinutes: 30},
        {code: "AL_IV",   sectionName : "Alaska IV",      north: 68,    south: 64,    west: -171,  east: -158, widthMinutes: 60, heightMinutes: 30},
        {code: "AL_V",    sectionName : "Alaska V",       north: 68,    south: 64,    west: -158,  east: -145, widthMinutes: 60, heightMinutes: 30},
        {code: "AL_VI",   sectionName : "Alaska VI",      north: 68,    south: 64,    west: -145,  east: -132, widthMinutes: 60, heightMinutes: 30},

        {code: "AL_VII",  sectionName : "Alaska VII",     north: 64,    south: 60,    west: -172,  east: -160, widthMinutes: 60, heightMinutes: 30},
        {code: "AL_VIII", sectionName : "Alaska VIII",    north: 64,    south: 60,    west: -160,  east: -148, widthMinutes: 60, heightMinutes: 30},
        {code: "AL_IX",   sectionName : "Alaska IX",      north: 64,    south: 60,    west: -148,  east: -136, widthMinutes: 60, heightMinutes: 30},

        {code: "AL_X",    sectionName : "Alaska X",       north: 60,    south: 56,    west: -173,  east: -162, widthMinutes: 60, heightMinutes: 30},
        {code: "AL_XI",   sectionName : "Alaska XI",      north: 60,    south: 56,    west: -162,  east: -151, widthMinutes: 60, heightMinutes: 30},
        {code: "AL_XII",  sectionName : "Alaska XII",     north: 60,    south: 56,    west: -151,  east: -141, widthMinutes: 60, heightMinutes: 30},
        {code: "AL_XIII", sectionName : "Alaska XIII",    north: 60,    south: 56,    west: -141,  east: -131, widthMinutes: 60, heightMinutes: 30},

        {code: "AL_XIV",  sectionName : "Alaska XIV",     north: 56,    south: 52,    west: -168,  east: -159, widthMinutes: 60, heightMinutes: 30},
        {code: "AL_XV",   sectionName : "Alaska XV",      north: 56,    south: 52,    west: -135,  east: -126, widthMinutes: 60, heightMinutes: 30}
    ];
    
    // this is the singleton pattern here, returning a literal object consisting of selecting variables
    // and various functions
    
    return {

    // these codes for datum, units, coord systems, etc. should be used by any source code in lieu
    // of literal strings, to ensure exact matches with no only javscript source but also database code values

    METERS_TO_SURVEY_FEET : METERS_TO_SURVEY_FEET,
    SURVEY_FEET_TO_METERS :  SURVEY_FEET_TO_METERS,
    METERS_TO_INTERNATIONAL_FEET :  METERS_TO_INTERNATIONAL_FEET,
    INTERNATIONALFEET_TO_METERS:  INTERNATIONALFEET_TO_METERS,

    DEGREES_TO_RADIANS: DEGREES_TO_RADIANS,
    RADIANS_TO_DEGREES: RADIANS_TO_DEGREES,

    
    RADIUS_CLARKE1866_METERS : RADIUS_CLARKE1866_METERS,
    RADIUS_WGS84_METERS      : RADIUS_WGS84_METERS,
    RADIUS_GRS80_METERS      : RADIUS_GRS80_METERS,

    RADIUS_CLARKE1866_SURVEYFEET : RADIUS_CLARKE1866_SURVEYFEET,

    eSquared_CLARKE1866 : eSquared_CLARKE1866,
    E_CLARKE1866 : E_CLARKE1866,

    RADIUS_GRS80_SURVEYFEET        : RADIUS_GRS80_SURVEYFEET,
    RADIUS_GRS80_INTERNATIONALFEET : RADIUS_GRS80_INTERNATIONALFEET,

    eSquared_WGS84                 : eSquared_WGS84,
    eSquared_GRS80                 : eSquared_GRS80,
    E_GRS80                        : E_GRS80,
    E_WGS84                        : E_WGS84,
    
    DATUM_HORIZ_1927     : DATUM_HORIZ_1927,
    DATUM_HORIZ_1983     : DATUM_HORIZ_1983,
    DATUM_HORIZ_WGS84    : DATUM_HORIZ_WGS84,
    DATUM_HORIZ_OSGB     : DATUM_HORIZ_OSGB,
    DATUM_HORIZ_IRISH65  : DATUM_HORIZ_IRISH65,

    DATUM_HORIZ_WGS84_STR : DATUM_HORIZ_WGS84_STR,


    UNITS_INTERNATIONALFEET : UNITS_INTERNATIONALFEET,
    UNITS_SURVEYFEET        : UNITS_SURVEYFEET,
    UNITS_METERS            : UNITS_METERS,
    UNITS_KILOMETERS        : UNITS_KILOMETERS,
    UNITS_MILES             : UNITS_MILES,
    UNITS_DEGREES           : UNITS_DEGREES,
    UNITS_GRID              : UNITS_GRID,
    UNITS_SQUAREMETERS      : UNITS_SQUAREMETERS,
    UNITS_ACRES             : UNITS_ACRES,
    UNITS_HECTARES          : UNITS_HECTARES,

    UNITS_DEGREES_STR       : UNITS_DEGREES_STR,

    COORDSYS_WORLD             : COORDSYS_WORLD,
    COORDSYS_CAZONE2           : COORDSYS_CAZONE2,
    COORDSYS_CAZONE3           : COORDSYS_CAZONE3,
    COORDSYS_CAZONE4           : COORDSYS_CAZONE4,
    COORDSYS_UTM10             : COORDSYS_UTM10,
    COORDSYS_USNG              : COORDSYS_USNG,
    COORDSYS_MGRS              : COORDSYS_MGRS,
    COORDSYS_GARS              : COORDSYS_GARS,
    COORDSYS_OSGB              : COORDSYS_OSGB,
    COORDSYS_IRISH             : COORDSYS_IRISH,
    COORDSYS_CAP_CLASSIC       : COORDSYS_CAP_CLASSIC,
    COORDSYS_CAP_CELL          : COORDSYS_CAP_CELL,
    COORDSYS_ALBERS_CONUS      : COORDSYS_ALBERS_CONUS,
    COORDSYS_EBMUDGRID         : COORDSYS_EBMUDGRID,
    COORDSYS_LAMBERTCUSTOM     : COORDSYS_LAMBERTCUSTOM,
    COORDSYS_TMCUSTOM          : COORDSYS_TMCUSTOM,
    COORDSYS_UTM               : COORDSYS_UTM,


    COORDSYS_WORLD_STR         : COORDSYS_WORLD_STR,

    DATUM_HORIZ_DEFAULT        : DATUM_HORIZ_DEFAULT,
    DATUM_HORIZ_DEFAULT_STR    : DATUM_HORIZ_DEFAULT_STR,

    UNITS_DEFAULT              : UNITS_DEFAULT,

    COORDSYS_DEFAULT : COORDSYS_DEFAULT,

    COORDSYS_TYPE_WORLD    : COORDSYS_TYPE_WORLD,
    COORDSYS_TYPE_LAMBERT  : COORDSYS_TYPE_LAMBERT,
    COORDSYS_TYPE_ALBERS   : COORDSYS_TYPE_ALBERS,
    COORDSYS_TYPE_TM       : COORDSYS_TYPE_TM,
    COORDSYS_TYPE_GRID     : COORDSYS_TYPE_GRID,
    COORDSYS_TYPE_ATLAS    : COORDSYS_TYPE_ATLAS,
    COORDSYS_TYPE_MERCATOR : COORDSYS_TYPE_MERCATOR,
    COORDSYS_TYPE_STEREO   : COORDSYS_TYPE_STEREO,

    SPATIALREF_LATLONG_WGS84 : SPATIALREF_LATLONG_WGS84,
    SPATIALREF_LATLONG_NAD27 : SPATIALREF_LATLONG_NAD27,
    SPATIALREF_LATLONG_NAD83 : SPATIALREF_LATLONG_NAD83,
    SPATIALREF_UTM10_NAD83   : SPATIALREF_UTM10_NAD83,
    SPATIALREF_UTM10_NAD27   : SPATIALREF_UTM10_NAD27,
    SPATIALREF_EBMUDGRID     : SPATIALREF_EBMUDGRID,
    SPATIALREF_USNG          : SPATIALREF_USNG,
    SPATIALREF_GARS          : SPATIALREF_GARS,
    SPATIALREF_OSGB          : SPATIALREF_OSGB,
    SPATIALREF_IRISH         : SPATIALREF_IRISH,
    SPATIALREF_CAP_CLASSIC   : SPATIALREF_CAP_CLASSIC,
    SPATIALREF_CAP_CELL      : SPATIALREF_CAP_CELL,
    SPATIALREF_UTM_NAD83     : SPATIALREF_UTM_NAD83,
    SPATIALREF_UTM_NAD27     : SPATIALREF_UTM_NAD27,

    SPATIALREF_DEFAULT_INPUT  : SPATIALREF_LATLONG_WGS84,
    SPATIALREF_DEFAULT_OUTPUT : SPATIALREF_USNG,
    SPATIALREF_FOR_STORAGE    : SPATIALREF_LATLONG_WGS84,

    
    getCanonicalDatumSet : function(refresh) {
        if( _canonicalDatums && !refresh ) {
            return _canonicalDatums;
        }

        // _canonicalDatums is an associative array, the key is a datum code and the value is the corresonding canonical datum code
        _canonicalDatums = [];

        for( var i = 0 ; i < _datumShifts.length ; i++) {
            if( _datumShifts[i].datumShiftMethodCD == 'SYNONYM') {

                var canonDatumFrom = this.canonicalDatum(_datumShifts[i].fromDatumCD, true);
                var canonDatumTo   = this.canonicalDatum(_datumShifts[i].toDatumCD, true);

                if( !canonDatumFrom && !canonDatumTo) {
                    _canonicalDatums[_datumShifts[i].fromDatumCD] = _datumShifts[i].fromDatumCD;
                    _canonicalDatums[_datumShifts[i].toDatumCD]   = _datumShifts[i].fromDatumCD;
                }
                else if( canonDatumFrom && !canonDatumTo) {
                    _canonicalDatums[_datumShifts[i].toDatumCD]   = canonDatumFrom;
                }
                else if( canonDatumTo && !canonDatumFrom ) {
                    _canonicalDatums[_datumShifts[i].fromDatumCD] = canonDatumTo;
                }
            }
        }
        return _canonicalDatums;
    },

    canonicalDatum : function(datumCD, returnNullIfNoEntry) {
       var canonicalDatums = this.getCanonicalDatumSet();

       var canon = canonicalDatums[datumCD];

       // it's appropriate to return a null when populating the list, but
       // for general usage returnNullIfNoEntry is omitted so datums without synonyms have themselves as canonical datums

       return( canon || returnNullIfNoEntry ? canon : datumCD);
    },


    isDatumUsedByCoordSys : function (datumCD, coordSysCD) {
        for( var j=0 ; j < _spatialRefArray.length ; j++) {
            if( _spatialRefArray[j].datumCD == datumCD && _spatialRefArray[j].coordSysCD == coordSysCD ) {
                   return true;
            }
        }
        return false;
    },

    coordSysGivenAtlas : function(atlasGN) {
        // to be useful in a map, an atlas needs to be linked to a coordinate system
        // so it's common to look one up.  It's also common for it to not be found if the ajax calls to augment
        // the various lists from the database have not been launched and finished.  So a common pattern is to
        // use this function to see if the needed atlas is available for mapping, and if not spawn an ajax call
        
        for( var i = 0 ; i < _coordSysArray.length ; i++) {
            if( _coordSysArray[i].coordSysTypeCD == "ATLAS" && _coordSysArray[i].atlasGN==atlasGN) {
                return _coordSysArray[i];
            }
        }
        return null;

    },

    spatialRefGivenAtlas : function(atlasGN) {
        var sys = this.coordSysGivenAtlas(atlasGN);
        
        if( !sys ) {
            throw"Cannot find a coordinate system for atlas " + atlasGN;
        }
        
        var ref=null;

        for( var i = 0 ; i < _spatialRefArray.length ; i++) {
            if( _spatialRefArray[i].coordSysCD == sys.coordSysCD ) {
                ref=_spatialRefArray[i];
                break;
            }
        }

        // create a spatial ref entry if needed
        if( !ref ) {
            ref = {coordSysTypeCD: sys.coordSysTypeCD,
                    coordSysCD: sys.coordSysCD,
                    coordSysName: sys.coordSysName,
                    datumCD: MARCONI.map.DATUM_HORIZ_WGS84,
                    mapUnitCD: MARCONI.map.UNITS_GRID,
                    spatialReferenceCD: "ad-hoc",
                    spatialReferenceName: "ad hoc spatial reference for atlas " + atlasGN
            };
            _spatialRefArray.push(ref);
        }
        var refObj = new MARCONI.map.SpatialReference(ref.coordSysCD, ref.datumCD, ref.mapUnitCD);
        if(!refObj) {
            throw( "Unable to get spatial reference for atlas " + atlasGN );
        }

        return refObj;
    },

    canConvertDatum : function (canonFromDatumCD, canonToDatumCD) {
        // obviously identical canonical datum names is a trivial but common case, e.g. WGS84 and NAD83 share a canonical datum
        if( canonFromDatumCD == canonToDatumCD ) {
            return true;
        }

        // search for a datum shift that either directly or indirectly solves the problem

        for( var i = 0 ; i < _datumShifts.length ; i++) {
            var canonShiftFromCD = this.canonicalDatum(_datumShifts[i].fromDatumCD);
            var canonShiftToCD   = this.canonicalDatum(_datumShifts[i].toDatumCD);

            if( (canonFromDatumCD == canonShiftFromCD && canonToDatumCD   == canonShiftToCD) ||
                (canonToDatumCD   == canonShiftFromCD   && canonFromDatumCD == canonShiftToCD) ) {

                return true;
            }
        }
        return false;
    },

    destinationDatums : function(fromDatumCD) {
        try {
            // return a list of all datums that can be reached from the "from" datum
            var canonFrom = this.canonicalDatum(fromDatumCD);
            var datumList = [];

            for( var i = 0 ; i < _datumArray.length ; i++) {
                var canonTo = this.canonicalDatum(_datumArray[i].datumCD);

                if( this.canConvertDatum(canonFrom, canonTo ) ) {
                    datumList.push(_datumArray[i]);
                }
            }
            return (datumList.length ? datumList : null);
        }
        catch(ex) {
            throw("Error getting list of destination datums from datum code " + fromDatumCD + ": " + ex);

        }
    },

    isUnitUsedByCoordSys : function (mapUnitCD, coordSysCD) {
        for( var j=0 ; j < _spatialRefArray.length ; j++) {
            if( _spatialRefArray[j].mapUnitCD == mapUnitCD && _spatialRefArray[j].coordSysCD == coordSysCD ) {
                
                return true;
            }
        }
        return false;
    },

    isCoordSysUsedByAnySpatialRef : function (coordSysCD) {
        for( var j=0 ; j < _spatialRefArray.length ; j++) {
            if( _spatialRefArray[j].coordSysCD == coordSysCD ) {
                return true;
            }
        }
        return false;
    },

    populateSpatialReferenceList : function(listControl, includeAuto, onlyGenericGrids) {
        try {
            var oldValue = MARCONI.stdlib.listboxSelectedValue(listControl);

            MARCONI.stdlib.listboxClear(listControl);

            if( includeAuto ) {
                MARCONI.stdlib.listboxAddItem(listControl, "Automatic", "");
            }

            MARCONI.stdlib.log("updating list control of spatial refs");

            for( var i=0 ; i < _spatialRefArray.length ; i++) {
                
                // honor optional parameter to show only generic (computed) grids.
                // that option is used by people who want to link a lat-long to a specific gridvalue and thence to a URL
                
                if( _spatialRefArray[i].isActive && (!onlyGenericGrids ||
                   (_spatialRefArray[i].coordSysTypeCD===this.COORDSYS_TYPE_GRID &&
                    _spatialRefArray[i].gridTemplate ))) {

                    var newItem = MARCONI.stdlib.listboxAddItem(listControl, _spatialRefArray[i].spatialReferenceName, _spatialRefArray[i].spatialReferenceCD);

                    if( newItem && _spatialRefArray[i].description ) {
                        newItem.title = _spatialRefArray[i].description;
                    }
                }
                else {
                    MARCONI.stdlib.log("skipping ", _spatialRefArray[i]);
                }

            }

            MARCONI.stdlib.listboxSynchToValue(listControl, oldValue);

            if( MARCONI.stdlib.listboxSelectedIndex(listControl) < 0) {
                MARCONI.stdlib.listboxSynchToValue(listControl, "");
            }
        }
        catch(ex) {
            throw "Cannot populate spatial ref list " + listControl + ": " + ex;
        }
    },

    spatialRefGivenCode : function(spatialRefCD) {
        for( var i=0 ; i < _spatialRefArray.length ; i++) {
            if( _spatialRefArray[i].spatialReferenceCD === spatialRefCD ) {
                return new MARCONI.map.SpatialReference(_spatialRefArray[i].coordSysCD, _spatialRefArray[i].datumCD, _spatialRefArray[i].mapUnitCD);
            }
        }
        return null;
    },

    spatialRefGivenComponents : function(coordSysCD, datumCD, mapUnitCD) {
        var ref = new MARCONI.map.SpatialReference(coordSysCD, datumCD, mapUnitCD);
        return ref;
    },
    parseLatLong : function (latLong) {
        if(!latLong) {
            return null;
        }
        
        // at least one char including digits, period, + or - 
        // then optional ^ or d for degrees
        // then optional whitespace
        // then digits or period chars with optional trailing ' sign for minutes
        // then optional whitespace
        // then digits or period chars with optional trailing " sign for seconds
        // then optional whitespace and optional direction letter or word
        
        var LAT_REGEX="([\\d\\+\\-.]+)[\\^d°]?[\\s]*([\\d.]*)[\'′]?[\\s]*([\\d.]*)[\"″]?[\\s]*(North?|South?|N?|S?)";
        var LNG_REGEX="([\\d\\+\\-.]+)[\\^d°]?[\\s]*([\\d.]*)[\'′]?[\\s]*([\\d.]*)[\"″]?[\\s]*(West?|East?|W?|E?)";
        
        var regex = "^" + LAT_REGEX + "[,\\s]+" + LNG_REGEX + "$";
        
        try {
            
            var p = new RegExp(regex, "i"); // case-insensitive

            var m = p.exec(latLong.trim());

            // MARCONI.stdlib.log("Parsing " + latLong + " as possible lat-long");

            if( m && m.length == 9) {
                var lat = m[1];
                var latSign = ( lat < 0 ? -1.0 : 1.0);

                lat = Math.abs(lat);
                
                if( lat > 90.0 ) {
                    throw "Latitude " + m[1] + " out of bounds, must be between -90 and 90";
                }

                lat += (m[2] ? m[2]/60.0 : 0);

                lat += (m[3] ? m[3]/3600.0 : 0);

                if( m[4] && m[4].substr(0,1).toUpperCase()=="S") {
                    latSign = -1.0;
                }

                lat = lat * latSign;
            
                var lng = m[5];
                var lngSign = ( lng < 0 ? -1.0 : 1.0);

                lng = Math.abs(lng);
                
                if( lng > 180.0 ) {
                    throw "Longitude " + m[5] + " out of bounds, must be between -180 and 180";
                }

                lng += (m[6] ? m[6]/60.0 : 0);

                lng += (m[7] ? m[7]/3600.0 : 0);

                if( m[8] && m[8].substr(0,1).toUpperCase()=="W") {
                    lngSign = -1.0;
                }
                lng = lng * lngSign;

                // MARCONI.stdlib.log("Lat-long match, lat-long =" + lat + ", " + lng);

                return new MARCONI.map.GeoPoint(lng, lat);
            }
        
            return null;
        
        }
        catch(ex) {
            throw "Error parsing " + latLong + " as lat-long: " + ex;
        }
    },
    parseUTMGridRef : function (mapGridValue) {
        // returns either an array of grid components, or null if the given value cannot be parsed as a valid UTM grid reference
        if( typeof(mapGridValue) !== "string" || mapGridValue.length === 0 ) {
            return null;
        }

        var REGEX="^([\\d]{1,2})[\\s]*([c-x]|north|south)[\\s]+([\\d.,]*)E?[\\s]+([\\d.,]*)N?$";
        var p = new RegExp(REGEX, "i");  // case-insens
        var m = p.exec(mapGridValue);

        if( m && m.length == 5 ) {
            var parts=[];
            for( var i = 1 ; i < m.length ; i++) {
                parts.push(m[i].toUpperCase());
            }
            return parts;
        }
        //MARCONI.stdlib.log("m is" + m);
        return null;
        
    },
    parseUSNGGridRef : function (mapGridValue) {
        // returns either an array of grid components, or null if the given value cannot be parsed as a valid USNG grid reference
        // components are:
        // 0. numeric UTM zone from 1 to 60 (if zero-length, latitude band should indicate a polar region)
        // 1. latitude band from A to Z excluding I and O
        // 2. optional two-letter grid square
        // 3. optional easting (integer)
        // 4. optional northing (integer)

        if( typeof(mapGridValue) !== "string" || mapGridValue.length === 0 ) {
            return null;
        }

        var REGEX="^([0-9]{0,2})[\\s]*([ABCDEFGHJKLMNPQRSTUVWXYZ])[\\s]*([ABCDEFGHJKLMNPQRSTUVWXYZ]?[ABCDEFGHJKLMNPQRSTUV]?)[\\s]*([0-9]*)[\\s]*([0-9]*)$";

        var p = new RegExp(REGEX, "i");
        var m = p.exec(mapGridValue);

        //MARCONI.stdlib.log("Grid " + mapGridValue + (m ? " is valid" : " is not valid"));

        if( !m ) {
            return null;
        }

        // push values to a new array because it lets us process the values as we go

        var parts=[];
        parts.push(m[1]);                 // zone, will be zero-length string in polar regions
        parts.push(m[2].toUpperCase());   // latitude band (single letter A-Z excluding I and O)
        parts.push(m[3].toUpperCase());   // two-letter grid square
        
        var isPolarLatitudeBand = "ABYZ".indexOf(m[2].toUpperCase()) >= 0;
        var isUTMZoneSpecified  = m[1].length > 0;

        // in polar latitude bands ABY and Z, must not specify UTM zone, and outside those zones must specify UTM zone
        // also, if grid square not given, only valid USNG values are polar
        if( isPolarLatitudeBand == isUTMZoneSpecified || (m[3].length != 2 && !isPolarLatitudeBand) ) {
            return null;
        }

        if( m[5] !== "" ) {
            parts.push(m[4]);
            parts.push(m[5]);
        }
        else if( m[4] !== "") {
            var len=m[4].length;
            if( len % 2 != 0 ) {
                return null;
            }
            parts.push(m[4].substr(0, m[4].length/2));
            parts.push(m[4].substr(m[4].length/2));
        }
        else {
            parts.push("");
            parts.push("");
        }

        return parts;
    },
    isValidUTM : function( gridRef) {
        try {
            var parts = MARCONI.map.parseUTMGridRef(gridRef);
            //MARCONI.stdlib.log("part is " + parts);
            return(parts != null);
        }
        catch(ex) {
            throw("MARCONI.map.isValidUTM(): Error checking grid value " + gridRef + ", err is " + ex);
        }
    },
    isValidUSNG : function ( gridRef) {
        try {
            var parts = this.parseUSNGGridRef(gridRef);

            var isValid = (parts != null);

            return isValid;
        }
        catch(ex) {
            throw("MARCONI.map.isValidUSNG(): Error checking grid value " + gridRef + ", err is " + ex);
        }
    },
    defaultSpatialRefGivenXY : function (x,y) {
        try {
            var ref=null;

            if( MARCONI.map.isValidUSNG(x) ) {
                ref= new MARCONI.map.SpatialReference( MARCONI.map.COORDSYS_USNG,  MARCONI.map.DATUM_HORIZ_1983, MARCONI.map.UNITS_GRID);
            }
            else if( MARCONI.map.isValidUTM(x) ) {
                ref= new MARCONI.map.SpatialReference( MARCONI.map.COORDSYS_UTM,  MARCONI.map.DATUM_HORIZ_1983, MARCONI.map.UNITS_GRID);
            }
            else if( MARCONI.map.isDegrees(x) && MARCONI.map.isDegrees(y) ) {
                ref = new MARCONI.map.SpatialReference( MARCONI.map.COORDSYS_WORLD, MARCONI.map.DATUM_HORIZ_WGS84, MARCONI.map.UNITS_DEGREES);
            }
            else if( Math.abs(x) < 1800000 && Math.abs(y) < 700000 ) {
                ref = new MARCONI.map.SpatialReference( MARCONI.map.COORDSYS_CAZONE3, MARCONI.map.DATUM_HORIZ_1927, MARCONI.map.UNITS_SURVEYFEET);
            }
            else {
                ref = new MARCONI.map.SpatialReference( MARCONI.map.COORDSYS_CAZONE3, MARCONI.map.DATUM_HORIZ_1983, MARCONI.map.UNITS_SURVEYFEET);
            }
            MARCONI.stdlib.log("Spatial ref is ", ref, " given x,y of " + x + ", " + y);
            
            return ref;
        }
        catch(ex) {
            throw "MARCONI.map.defaultSpatialRefGivenXY(): " + ex + ", given x,y of " + x + ", " + y;
        }
    },

    populateHorizontalDatumList : function (listControl, coordSysCD, limitToDestinationDatumCD) {
        try {
            if(typeof(listControl) == "string") {
                listControl = document.getElementById(listControl);
            }

            var oldValue = MARCONI.stdlib.listboxSelectedValue(listControl);
            MARCONI.stdlib.listboxClear(listControl);

            var destDatums = (!limitToDestinationDatumCD ? null : this.destinationDatums(limitToDestinationDatumCD));

            for( var i=0 ; i < _datumArray.length ; i++) {
                if( _datumArray[i].isActive ) {

                    if( (!coordSysCD || this.isDatumUsedByCoordSys(_datumArray[i].datumCD, coordSysCD)) &&
                        (!destDatums || destDatums.indexOf(_datumArray[i].datumCD))) {

                        MARCONI.stdlib.listboxAddItem(listControl, _datumArray[i].datumName, _datumArray[i].datumCD);
                    }

                }

            }
            MARCONI.stdlib.listboxSynchToValue(listControl, oldValue);

            if( listControl.options.length > 0 && listControl.selectedIndex < 0 ) {
                listControl.selectedIndex = 0;
            }
        }
        catch(ex) {
            throw("error in MARCONI.map.populateHorizontalDatumList(): " + ex);
        }

    },

    populateDatumShiftList : function (listControl, canonFromDatumCD, canonToDatumCD, excludeAvailableOnServerOnly ) {
        try {
            if(typeof(listControl) == "string") {
                listControl = document.getElementById(listControl);
            }


            //MARCONI.stdlib.log("Generating list of shifts from ." + canonFromDatumCD + ". to ." + canonToDatumCD + ".");
            
            var oldValue = MARCONI.stdlib.listboxSelectedValue(listControl);
            MARCONI.stdlib.listboxClear(listControl);

            for( var i=0 ; i < _datumShifts.length ; i++) {
                if(_datumShifts[i].isActive) {

                    var canonShiftFrom = this.canonicalDatum(_datumShifts[i].fromDatumCD);
                    var canonShiftTo   = this.canonicalDatum(_datumShifts[i].toDatumCD);

                    /*
                     *MARCONI.stdlib.log("Inspecting shift " + i + " of " + _datumShifts.length + ": " + _datumShifts[i].datumShiftMethodCD + " for shift from " + _datumShifts[i].fromDatumCD + " (" + canonShiftFrom + ") to " +
                            _datumShifts[i].toDatumCD + " (" + canonShiftTo + ")");
                    */

                    if(  ((canonShiftFrom == canonFromDatumCD && canonShiftTo == canonToDatumCD) ||
                         (canonShiftTo   == canonFromDatumCD && canonShiftFrom == canonToDatumCD )) &&
                         (!excludeAvailableOnServerOnly || !_datumShifts[i].isAvailableOnServerOnly) ) {

                        var descript = _datumShifts[i].datumShiftMethodName;
                        if( _datumShifts[i].datumShiftName ) {
                            descript += " [" + _datumShifts[i].datumShiftName + "]";
                        }
                        if( _datumShifts[i].isAvailableOnServerOnly ) {
                            descript += " [server only]";
                        }
                        var key = _datumShifts[i].datumShiftMethodCD;

                         // if an optional name is specified, add a space then the name
                         // the lookup routine getDatumShift() obviously needs to know this convention!
                        if( _datumShifts[i].datumShiftName) {
                            key += " " + _datumShifts[i].datumShiftName;
                        }
                        MARCONI.stdlib.listboxAddItem(listControl, descript, key);

                        //MARCONI.stdlib.log("Match, adding method " + _datumShifts[i].datumShiftMethodCD + " for shift from " + canonFromDatumCD + " to " + canonToDatumCD);
                    }
                    else {
                        //MARCONI.stdlib.log("Rejecting method " + _datumShifts[i].datumShiftMethodCD + " which shifts from " + canonShiftFrom + " to " + canonShiftTo);
                    }

                }
            }
            MARCONI.stdlib.listboxSynchToValue(listControl, oldValue);

            if( listControl.options.length > 0 && listControl.selectedIndex < 0 ) {
                listControl.selectedIndex = 0;
            }
        }
        catch(ex) {
            throw("error in MARCONI.map.populateDatumShiftList(): " + ex);
        }

    },

    getDatumShift : function(fromCanonDatumCD, toCanonDatumCD, datumShiftMethodCD, pt, isOkayForClient ) {
        // scan for a datum shift with desired from-to datums, and optionally a specific method and bounding lat-long extents
        var shiftName = null;

        if( datumShiftMethodCD && datumShiftMethodCD.indexOf(" ") > 0 ) {
            shiftName = datumShiftMethodCD.substr(datumShiftMethodCD.indexOf(" ")+1);
            datumShiftMethodCD = datumShiftMethodCD.substr(0, datumShiftMethodCD.indexOf(" "));
        }
        
        for( var i=0 ; i < _datumShifts.length ; i++) {
            if( (!datumShiftMethodCD || _datumShifts[i].datumShiftMethodCD == datumShiftMethodCD) &&
                this.canonicalDatum(_datumShifts[i].fromDatumCD) == fromCanonDatumCD &&
                this.canonicalDatum(_datumShifts[i].toDatumCD) == toCanonDatumCD && 
                (!shiftName || shiftName == _datumShifts[i].datumShiftName) )  {

                if( (!pt || this.isDatumShiftOkayForGivenPoint(_datumShifts[i], pt)) && !_datumShifts[i].isAvailableOnServerOnly ) {
                    return _datumShifts[i];
                }
            }
        }
        
        return null;
    },

    isDatumShiftOkayForGivenPoint : function(datumShift, pt) {
        // only check if passed a valid point, which for a datum shift requires longitude (x) and latitude (y)
        if( !pt ||  !pt.x  ||  !pt.y ) {
            throw "Invalid point passed to isDatumShiftOkayForGivenPoint() in map.js";
        }

        if( (!datumShift.latitudeMin  || datumShift.latitudeMin  < pt.y) &&
            (!datumShift.longitudeMin || datumShift.longitudeMin < pt.x) &&
            (!datumShift.latitudeMax  || datumShift.latitudeMax  > pt.y) &&
            (!datumShift.longitudeMax || datumShift.longitudeMax > pt.x) ) {

            //MARCONI.stdlib.log("point " + pt.y + ", " + pt.x  + " is within box: " + datumShift.latitudeMin + ", " + datumShift.longitudeMin + " by " + datumShift.latitudeMax + ", " + datumShift.longitudeMax );

            return true;
        }

        return false;
    },

    populateUnitsList : function (listControl, coordSysCD, unitType) {
        // unitType can be optionally passed as "linear" or "aerial" to limit the list accordingly
        try {

            if(typeof(listControl) == "string") {
                listControl = document.getElementById(listControl);
            }

            var oldValue = MARCONI.stdlib.listboxSelectedValue(listControl);

            MARCONI.stdlib.listboxClear(listControl);

            for( var i=0 ; i < _mapUnitArray.length ; i++) {
                if( _mapUnitArray[i].isActive ) {

                    if( !coordSysCD || this.isUnitUsedByCoordSys(_mapUnitArray[i].mapUnitCD, coordSysCD)) {
                       if( !unitType ||
                           (unitType.toLowerCase()=="linear" && _mapUnitArray[i].isLinear ) ||
                            unitType.toLowerCase()=="areal"  && _mapUnitArray[i].isAreal ) {

                           MARCONI.stdlib.listboxAddItem(listControl, _mapUnitArray[i].unitName, _mapUnitArray[i].mapUnitCD);
                       }
                    }
                }

            }
            MARCONI.stdlib.listboxSynchToValue(listControl, oldValue);

            if( listControl.options.length > 0  && listControl.selectedIndex < 0 ) {
                listControl.selectedIndex = 0;
            }
        }
        catch(ex) {
            throw("error in MARCONI.map.populateUnitsList(): " + ex);
        }

    },

    populateCoordSysList : function (listControl, includeAllActive) {
        try {
            var oldValue = MARCONI.stdlib.listboxSelectedValue(listControl);
            MARCONI.stdlib.listboxClear(listControl);

            for( var i=0 ; i < _coordSysArray.length ; i++) {
                if( _coordSysArray[i].isActive ) {

                    if( includeAllActive || this.isCoordSysUsedByAnySpatialRef( _coordSysArray[i].coordSysCD ) ) {
                        MARCONI.stdlib.listboxAddItem(listControl, _coordSysArray[i].coordSysName, _coordSysArray[i].coordSysCD);
                    }
                    else {
                        //MARCONI.stdlib.log("Skipping coord sys " + _coordSysArray[i].coordSysCD);
                    }
                }

            }
            MARCONI.stdlib.listboxSynchToValue(listControl, oldValue);
        }
        catch(ex) {
            throw("error in MARCONI.map.populateCoordSysList(): " + ex);
        }
    },

    mapUnitGivenCode : function (mapUnitCD) {
        for( var i=0 ; i < _mapUnitArray.length ; i++) {
            if( mapUnitCD == _mapUnitArray[i].mapUnitCD ) {
                return _mapUnitArray[i];
            }
        }
        MARCONI.stdlib.log("Unknown unit " + mapUnitCD);
        return null;
    },
    
    datumGivenCode : function (datumCD) {
        for( var i=0 ; i < _datumArray.length ; i++) {
            if( datumCD == _datumArray[i].datumCD) {
                return _datumArray[i];
            }
        }
        return null;
    },
    
    coordSysGivenCode : function (coordSysCD) {
        for( var i=0 ; i < _coordSysArray.length ; i++) {
            if( coordSysCD == _coordSysArray[i].coordSysCD) {
                return _coordSysArray[i];
            }
        }
        return null;
    },

    getCAPClassicGridSections : function() {
        return _CAPSections;
    },
    
    refCount : function () {return _spatialRefArray.length;},

    datumCount : function () {return _datumArray.length;},

    unitsCount : function () {return _mapUnitArray.length;},

    coordSysCount : function() {return _coordSysArray.length;},

    coordSysGivenIndex : function(i) {return _coordSysArray[i];},

    spatialRefGivenIndex : function(i) {return _spatialRefArray[i];},

    spatialRefInfoLookup : function(coordSysCD, datumCD, mapUnitCD) {
        // this func returns raw info NOT a spatial ref object!
        // use the three args with the SpatialReference constructor if you need a spatial ref

        for( var i = 0 ; i < _spatialRefArray.length ; i++ ) {

            if( _spatialRefArray[i].datumCD    === datumCD  &&
                _spatialRefArray[i].mapUnitCD  === mapUnitCD  &&
                _spatialRefArray[i].coordSysCD === coordSysCD ) {

                
                return _spatialRefArray[i];
            }
        }
        return null;
    },

    getUSNGZoneSet : function(zoneNumber) {
        try {
            // set 1 consists of zones 1, 7, 13, etc.
            // set 2 consists of zones 2, 8, etc.
            // there are six sets in all, each with 10 of the 60 UTM zones
            return parseInt(zoneNumber-1,10) % 6 + 1;
        }
        catch(ex) {
            throw "getUSNGZoneSet(): unknown error " + ex;
        }
    },

    getUTMZoneFromLatLong : function(latitude, longitude) {
        // normalize to span -180 to 180
        longitude = (longitude <= 180 ? longitude : longitude-360);

        // basic utm zoning is 6-degree bands of longitude
        var utmZone = Math.floor((longitude + 180)/6) + 1;

        // now handle exceptions
        if( latitude >= 56 && latitude < 64 && longitude >= 3 && longitude < 12 ) {
             utmZone = 32;
        }
        else if( latitude >= 72 && latitude < 84 ) {
            if( longitude >= 0 && longitude < 9 ) {
                 utmZone = 31;
            }
            else if( longitude >= 9 && longitude < 21 ) {
                 utmZone = 33;
            }
            else if( longitude >= 21 && longitude < 33 ) {
                 utmZone = 35;
            }
            else if( longitude >= 33 && longitude < 42 ) {
                 utmZone = 37;
            }

            
        }

        return  utmZone;
    },

    UTMSpatialRef : function(zoneNumber, zoneLetter, datumCD) {
        if( !datumCD) {
            datumCD = this.DATUM_HORIZ_1983;
        }

        var utmRef          = new MARCONI.map.SpatialReference(this.COORDSYS_TMCUSTOM, datumCD, this.UNITS_METERS);
        var originLongitude = (zoneNumber-1)*6-180+3;  // center of 6-degree band
        var originLatitude = 0;

        var originX=500000;  // standard UTM easting

        // assume we're north of the equator unless zone letter is passed and shows otherwise
        var originY= ( zoneLetter && zoneLetter < 'N' ? 10000000 : 0);  // equator is 10M for southern hemisphere, else zero


        var centralScaleFactor=0.9996;  // standard UTM scale factor

        utmRef.setCustomParams(
            0,
            0,
            originLatitude,
            originLongitude,
            originX,
            originY,
            centralScaleFactor );

        return utmRef;
    },

    updateAll : function(cfg) {
        // save onComplete, we do not want it called till last func is done
        var onComplete = null;
        if( cfg && cfg.onComplete ) {
            onComplete = cfg.onComplete;
            cfg.onComplete = null;
        }
        
        this.updateSpatialRefList(cfg);
        this.updateCoordSysList(cfg);
        this.updateDatumList(cfg);
        this.updateMapUnitList(cfg);

        this.registerAJAXCallback(onComplete);


    },

    registerAJAXCallback : function(func) {
        // call this func AFTER launching any ajax work
        // since it checks status immediately

        if( func ) {
            if( ! _onReadyFunc ) {
                _onReadyFunc = [];
            }
            _onReadyFunc.push(func);
        }

        // check right now
        if( _pendingAJAXCount === 0) {
            MARCONI.stdlib.log("All AJAX map.js calls completed");

            if(_onReadyFunc ) {
                for( var i = 0 ; i < _onReadyFunc.length ; i++) {
                    _onReadyFunc[i]("MARCONI map module is ready to use");
                }
                _onReadyFunc=null;
            }
        }
        else {
            MARCONI.stdlib.log(_pendingAJAXCount + " AJAX map.js calls pending");

        }

    },

    
    updateSpatialRefList : function(options) {
        // cfg is optional, has the following optional params:
        // activeOnly boolean
        // onComplete, onUpdate, onAdd
        // noStorage boolean
        // minDate and maxMinutes for cache age criteria
        
        var cfg;
        
        if( options ) {
            cfg = MARCONI.stdlib.clone(options);
        }
        else {
            cfg = {};
        }
        cfg.spatialRefArray = _spatialRefArray;

        
        try {

            var args= cfg.activeOnly === undefined ? "" : "&IsActive=" + cfg.activeOnly;

            // if Storage API is loaded, and not explicitly told to skip it, look in DOM storage first

            if( window.YAHOO && YAHOO.util.Storage && !(cfg && (cfg.noStorage || cfg.noReadStorage)) ) {
                
                MARCONI.stdlib.log("Attempting to get spatial ref list from DOM storage " + args );

                try {

                    if( getFromStorage("spatialref", args,
                        function(data, cfg) {
                            // success

                            _updateRefs(data, cfg);

                            if( cfg && cfg.onComplete) {
                                cfg.onComplete();
                            }
                        },
                        function(msg, cfg) {
                            // some kind of error occurred with Storage retrieval
                            MARCONI.stdlib.log(msg + ", spatial ref list not found in storage, calling again with noReadStorage option");
                            cfg.noReadStorage=true;
                            MARCONI.map.updateSpatialRefList(cfg);
                        },
                        cfg)) {

                        return;
                    }
                }
                catch(storageError) {
                    // some kind of error occurred with Storage retrieval
                    MARCONI.stdlib.log("Exception " + storageError + " reading spatial ref list from DOM storage, calling again with noReadStorage option");
                    if(!cfg) {
                        cfg = {};
                    }
                    cfg.noReadStorage=true;
                    MARCONI.map.updateSpatialRefList(cfg);
                    return;
                }

                // if we got a falsey value from getFromStorage(), it means we should not expect a callback, must forge on
                MARCONI.stdlib.log("spatialref, " +  args + " data not available in DOM storage cache, fetching list with AJAX call");
            }
            else {
                MARCONI.stdlib.log("DOM storage either not available, or noStorage option passed for spatialref " + args +
                    ", fetching list with AJAX call", "info", "clientinclude/map.js");
            }

            var url="../ajax/Lookup?entity=spatialreference";

            var myDataSource = new YAHOO.util.DataSource(url);

            // look in server code for ajax call to make sure fields match (case-sensitive)
            // order of field listing is not important, and we don't need to declare and use all fields provided by the server
            
            myDataSource.responseType = YAHOO.util.DataSource.TYPE_JSON;
            myDataSource.responseSchema = {
                resultsList : "data.Results",
                fields : ["spatialReferenceGN", "spatialReferenceCD", "spatialReferenceName", "baseCoordSysCD", "gridTemplate",
                    "gridCellSizeHorizontal", "gridCellSizeVertical", 
                    "description", "isSystem", "isActive", "WKID", "coordSysCD", "coordSysName", "coordSysTypeCD", "coordSysTypeName",
                    "originLatitude", "originLongitude", "parallelOne", "parallelTwo", "centralScaleFactor", "stateCD", "stateName", "zone",
                     "ellipsoidCD", "ellipsoidName", "datumCD", "datumName", "equitorialAxisMeters", "eccentricity", "mapUnitCD", "collatingValue", "originX", "originY",
                     "inputResolution", "inputResolutionUnitCD", "latitudeMin", "latitudeMax", "longitudeMin", "longitudeMax", "atlasGN"]
            };

            myDataSource.maxCacheEntries = 2;  // short-circuits hammering on refresh repeatedly

            var oCallback = {
                success: function(oRequest,oResponse,oPayload) {
                    if( !(oPayload && oPayload.noStorage) ) {
                        putToStorage("spatialref", args, oResponse.results);
                    }
                    _updateRefs(oResponse.results, oPayload);
                    registerAJAXCompletion("AJAX load of spatialref list");
                },
                failure: function(oRequest,oResponse,oPayload) {
                    //_updateRefs(null, oPayload);
                    throw("Failed to get list of spatial references, response was " + MARCONI.stdlib.logObject(oResponse, "response"));
                },
                scope: this,
                argument: cfg
            };

            myDataSource.doBeforeParseData = function (oRequest, oFullResponse) {
                    // if data not returned, look at error code and message
                    if( oFullResponse.data === undefined) {
                        if (oFullResponse.replyCode) {
                            alert("error " + oFullResponse.replyCode + ": " + MARCONI.stdlib.friendlyErrorMessage(oFullResponse.replyText));
                        }
                        else {
                            alert("Unknown error getting spatial reference list");
                        }
                    }

                    return oFullResponse;
                };

            
            //MARCONI.stdlib.log("Sending AJAX request for spatial reference list: " + url + args, "info", "map.js");

            myDataSource.sendRequest(args, oCallback);
            registerAJAXLaunch();
        }
        catch(ex) {
            throw("map.js: error launching AJAX request for update of spatial references: " + ex);
        }

        function _updateRefs(dataArray, args) {
            try {
                if(!args ) {
                    throw "Missing required args parameter to function _updateRefs in map.js";
                }
                var addCount=0;
                var updateCount=0;

                // if given a proper array of values, populate from it
                if( dataArray ) {
                    if( dataArray.length > 0 ) {
                        for( var i = 0 ; i < dataArray.length ; i++) {
                            
                            var action =  _updateRef(args.spatialRefArray, dataArray[i]);

                            if( action === "Add" ) {
                                addCount++;
                                // MARCONI.stdlib.log("added " + dataArray[i].spatialReferenceCD + " to list of spatial references");
                                if( args.onAdd ) {
                                    args.onAdd( dataArray[i] );
                                }
                            }
                            else if(action === "Update") {
                                updateCount++;
                                // MARCONI.stdlib.log("updated " + dataArray[i].spatialReferenceCD + " in list of spatial references");

                                if( args.onUpdate ) {
                                    args.onUpdate( dataArray[i]);
                                }
                            }
                        }  // end for

                        if( addCount > 0 || updateCount > 0 ) {
                            try {
                                args.spatialRefArray.sort(function(a,b) {
                                try {
                                    if( a.collatingValue === undefined || b.collatingValue===undefined ||
                                            a.collatingValue === b.collatingValue ) {
                                        return (MARCONI.stdlib.strcmp(a.spatialReferenceName, b.spatialReferenceName ));
                                    }
                                    else {
                                        return a.collatingValue - b.collatingValue;
                                    }
                                }
                                catch(innerSortErr) {
                                    MARCONI.stdlib.log("error in sort compare func for spatial ref, working around it, err is " + innerSortErr);
                                    return 0;
                                }
                                });
                            }
                            catch(outerError) {
                                MARCONI.stdlib.log("error trying to sort spatial refs:" + outerError);
                            }
                        }

                    }
                }
                else {
                    throw("No data received from AJAX call for spatial references");
                }

                if( args.onComplete ) {
                    args.onComplete("Added " + addCount + " spatial references, updated " + updateCount);
                }
                

                
            }
            catch(ex) {
                alert("Error updating spatial references with AJAX data, error is " + ex);
            }

        }

        function _updateRef(refArray, spatialReference) {
            try {
                var spatialReferenceCD=spatialReference.spatialReferenceCD;
                if( !spatialReferenceCD ) {
                    throw "Got bad data in place of a spatial reference: " + MARCONI.stdlib.logObject(spatialReference);
                }
                
                var isFound=false;
                var indexToUpdate = null;
                var action="";
                
                // MARCONI.stdlib.log("checking " + refArray.length + " spatialRefArray elements looking for " + spatialReferenceCD);
                
                for( var i=0; i < refArray.length ; i++) {
                    if( refArray[i].spatialReferenceCD === spatialReferenceCD ) {
                        isFound=true;
                        indexToUpdate=i;
                        break;
                    }
                }
                if(!isFound) {
                    // MARCONI.stdlib.log("adding spatial ref since " + spatialReferenceCD + " not found");
                
                    refArray.push(spatialReference);
                    indexToUpdate=refArray.length-1;
                    action="Add";
                }
                else {
                    // do a field-by-field update so we don't replace existing values with missing (null or undefined) values from the server
                    for(var key in spatialReference ) {
                        if( spatialReference[key]!==undefined && spatialReference[key]!==null && refArray[indexToUpdate][key] !== spatialReference[key] ) {
                            action="Update";
                            refArray[indexToUpdate][key] = spatialReference[key];
                        }
                    }
                    /*
                    if( action == "Update") {
                        MARCONI.stdlib.log("Done updating existing spatial reference " + spatialReferenceCD);
                    }
                    else {
                        MARCONI.stdlib.log("Spatial reference " + spatialReferenceCD + " already up to date");
                    }
                    */
                }
                

                // MARCONI.stdlib.log("Updated/added spatial reference ", spatialReference);

                if(refArray[indexToUpdate].baseCoordSysCD ){
                    //MARCONI.stdlib.log(spatialReferenceCD + ", base coordsys is " + refArray[indexToUpdate].baseCoordSysCD + ", gridsize is " +
                    //refArray[indexToUpdate].gridCellSizeHorizontal + ", " + refArray[indexToUpdate].gridCellSizeVertical);
                }
                return action;
            }
            catch(ex) {
                throw "Error updating spatial reference " + spatialReference + ": " + ex;
            }
        }
    },

    updateCoordSysList : function(options) {
        try {
            // cfg is optional, has the following optional params:
            // activeOnly boolean
            // onComplete, onUpdate, onAdd
            // noStorage boolean
            // minDate and maxMinutes for cache age criteria

            var cfg;

            if( options ) {
                // clone because we want to be able to copy and modify for local storage callback
                cfg = MARCONI.stdlib.clone(options);
                // functions not being cloned...
                cfg.onComplete = options.onComplete;
                cfg.onError    = options.onError;
            }
            else {
                cfg = {};
            }
            
            var args= cfg.activeOnly === undefined ? "&IsActive=true" : "&IsActive=" + cfg.activeOnly;
            
            // if Storage API is loaded, and not explicitly told to skip it, look in DOM storage first

            if( window.YAHOO && YAHOO.util.Storage && !(cfg && (cfg.noReadStorage || cfg.noStorage) ) ) {

                //MARCONI.stdlib.log("Attempting to get coordsys list from DOM storage " + args );
                try {


                    if( getFromStorage("coordsys", args,
                        function(data, cfg) {
                            // success

                            _updateCoordSystems(data, cfg);

                            if( cfg && cfg.onComplete) {
                                cfg.onComplete("Got coord sys list from storage");
                            }
                        },
                        function(msg, cfg) {
                            // some kind of error occurred with Storage retrieval
                            MARCONI.stdlib.warn(msg + ", coordinate system list not read from storage, calling again with noReadStorage option");
                            cfg.noReadStorage=true;
                            MARCONI.map.updateCoordSysList(cfg);
                        },
                        cfg)) {

                        return;
                    }
                }
                catch(storageError) {
                    // some kind of error occurred with Storage retrieval
                    MARCONI.stdlib.log("Exception reading coord sys list from DOM storage: " + storageError + ", calling again with noReadStorage option");
                    if( !cfg ) {
                        cfg = {};
                    }
                    cfg.noReadStorage=true;
                    MARCONI.map.updateCoordSysList(cfg);
                    return;
                }

                // if we got a falsey value from getFromStorage(), it means we should not expect a callback, must forge on
                MARCONI.stdlib.log("coordsys, " +  args + " data not available in DOM storage cache, fetching list with AJAX call");
            }
            else {
                //MARCONI.stdlib.log("DOM storage either not available, or noStorage option passed for coordsys " + args +
                //    ", fetching list with AJAX call", "info", "clientinclude/map.js");
            }

            var url="../ajax/Lookup?entity=coordsys";

            var myDataSource = new YAHOO.util.DataSource(url);

            // look in server code for ajax call to make sure fields match (case-sensitive)
            // order of field listing is not important, and we don't need to declare and use all fields provided by the server

            myDataSource.responseType = YAHOO.util.DataSource.TYPE_JSON;
            myDataSource.responseSchema = {
                resultsList : "data.Results",
                fields : [
                    "coordSysCD", "coordSysName", "coordSysTypeCD", "coordSysTypeName",
                    "stateCD", "stateName", "zone", "isActive", "isSystem",
                     "atlasGN", "collatingValue", "atlasGN", "gridTemplate", "gridCellSizeHorizontal", "gridCellSizeVertical", "baseCoordSysCD"]
            };

            myDataSource.maxCacheEntries = 2;  // short-circuits hammering on refresh repeatedly

            var oCallback = {
                success: function(oRequest,oResponse,oPayload) {
                    if( !(oPayload && oPayload.noStorage) ) {
                        putToStorage("coordsys", args, oResponse.results);
                    }

                    _updateCoordSystems(oResponse.results, oPayload);

                    registerAJAXCompletion("AJAX load of coordsys list");
                },
                failure: function(oRequest,oResponse,oPayload) {
                    throw("Failed to get list of coordinate systems, response was " + MARCONI.stdlib.logObject(oResponse, "response"));
                    //_updateCoordSystems(null, oPayload);
                },
                scope: this,
                argument: cfg
            };

            myDataSource.doBeforeParseData = function (oRequest, oFullResponse) {
                    // if data not returned, look at error code and message
                    if( oFullResponse.data === undefined) {
                        if (oFullResponse.replyCode) {
                            alert("error " + oFullResponse.replyCode + ": " + MARCONI.stdlib.friendlyErrorMessage(oFullResponse.replyText));
                        }
                        else {
                            alert("Unknown error getting list of coordinate systems");
                        }
                    }

                    return oFullResponse;
                };

            //MARCONI.stdlib.log("Sending AJAX request for coordinate system list: " + url, "info", "map.js");

            myDataSource.sendRequest(args,oCallback);
            registerAJAXLaunch();
        }
        catch(ex) {
            throw("map.js: error launching AJAX request for update of coordinate systems: " + ex);
        }

        function _updateCoordSystems(dataArray, args) {
            var stage="init";
            try {

                if(!args ) {
                    throw "Missing required args parameter to function _updateCoordSystems in map.js";
                }
                var addCount=0;
                var updateCount=0;

                // if given a proper array of values, populate from it
                if( dataArray ) {
                    if( dataArray.length > 0 ) {
                        for( var i = 0 ; i < dataArray.length ; i++) {
                            stage = "processing item " + i;
                            
                            var action =  _updateSys(_coordSysArray, dataArray[i]);

                            if( action === "Add" ) {
                                addCount++;
                                if( args.onAdd ) {
                                    args.onAdd( dataArray[i] );
                                }
                            }
                            else if( action === "Update") {
                                updateCount++;
                                
                                if( args.onUpdate ) {
                                    args.onUpdate( dataArray[i]);
                                }
                            }

                            //MARCONI.stdlib.log(action + " of coord sys " + dataArray[i].coordSysCD);
                        }

                        if( addCount > 0 || updateCount > 0 ) {
                            stage="sorting";
                            //MARCONI.stdlib.log("sorting coord sys list");

                            try {
                                
                                _coordSysArray.sort( function(a,b) {
                                    try {

                                        if( a.collatingValue === undefined || b.collatingValue===undefined || 
                                            a.collatingValue === b.collatingValue ) {

                                            //MARCONI.stdlib.log(a.coordSysName +  " and " + b.coordSysName + ", collatingValue=" + a.collatingValue||0);
                                            return MARCONI.stdlib.strcmp(a.coordSysName, b.coordSysName);
                                        }
                                        else {
                                            //MARCONI.stdlib.log("" + a.collatingValue +  " and " + b.collatingValue + " trump " + a.coordSysName +  " and " + b.coordSysName);
                                            return a.collatingValue - b.collatingValue;
                                        }
                                    }
                                    catch(sortErr) {
                                        MARCONI.stdlib.log("sorter returning zero to work around error: " + sortErr);
                                        return 0;
                                    }
                                });
                            }
                            catch(bigSortErr) {
                                MARCONI.stdlib.log("non-fatal error sorting coordinate systems: " + bigSortErr);
                            }

                        }
                    }
                }
                else {
                    throw("No data received from AJAX call for coordinate systems");
                }
                
                if( args.onComplete ) {
                    args.onComplete("Added " + addCount + " coordinate systems, updated " + updateCount, args.callbackArg);
                }

                
            }
            catch(ex) {
                alert("Error updating coordinate systems with AJAX data at stage " + stage + ", error is " + ex);
            }

        }

        function _updateSys(sysArray, coordSys) {
            try {
                var coordSysCD = coordSys.coordSysCD;
                if( !coordSysCD ) {
                    throw "Got bad data in place of a coordSysCD: " + MARCONI.stdlib.logObject(coordSys);
                }

                var isFound=false;
                var indexToUpdate = null;
                var action="";

                for( var i=0; i < sysArray.length ; i++) {
                    if( sysArray[i].coordSysCD === coordSysCD ) {
                        isFound=true;
                        indexToUpdate=i;
                        break;
                    }
                }
                if(!isFound) {
                    sysArray.push(coordSys);
                    indexToUpdate = sysArray.length-1;
                    //MARCONI.stdlib.log("adding new coordinate system " + coordSysCD + ", count of coord systems is now " + sysArray.length);
                    action="Add";
                }
                else {
                    
                    for(var key in sysArray[indexToUpdate] ) {
                        if( sysArray[indexToUpdate][key] !== coordSys[key] ) {
                            //MARCONI.stdlib.log("value " + key + " being updated from " + sysArray[indexToUpdate][key] + " to " + coordSys[key]);
                            action="Update";
                        }
                    }
                    if( action === "Update") {
                        //MARCONI.stdlib.log("updating existing coordinate system " + coordSysCD);
                    }
                }
                sysArray[indexToUpdate] = coordSys;
                
                
                return action;
            }
            catch(ex) {
                throw "Error updating coordinate system " + MARCONI.stdlib.logObject(coordSys) + ": " + ex;
            }
        }
    },

    isAtlasLoaded : function(atlasGN) {
        return ( typeof(_atlasArray[atlasGN]) === "undefined" ? false : true);
    },

    getAtlas : function(atlasGN) {
        return _atlasArray[atlasGN];
    },

    dumpAtlases : function(atlasGN) {
        for( var key in _atlasArray ) {
            if( _atlasArray.hasOwnProperty(key)) {
                MARCONI.stdlib.log("key is " + key + ", atlas is " + _atlasArray[key] +
                    MARCONI.stdlib.logObject(_atlasArray[key]));
            }
        }
    },
    
    getAtlasByAjax : function(cfg) {
        try {
            // cfg must
            // have the following param:
            // atlasGN
            // and may specify onComplete, onUpdate, onAdd
            // noStorage boolean
            // minDate and maxMinutes for cache age criteria

            if( !cfg ) {
                throw "Options required, since at least atlasGN is required";
            }

            if( !cfg.atlasGN ) {
                throw "atlasGN is required to load an atlas";
            }

            var args = "&AtlasGN=" + cfg.atlasGN;

            // MARCONI.stdlib.log("Loading atlas, cfg is " + MARCONI.stdlib.logObject(cfg) );
            
            // if Storage API is loaded, and not explicitly told to skip it, look in DOM storage first

            if( YAHOO.util.Storage && !(cfg && (cfg.noReadStorage || cfg.noStorage) ) ) {

                MARCONI.stdlib.log("Attempting to get atlas page list from DOM storage, " + args );
                try {


                    if( getFromStorage("atlaspage", args,
                        function(data, cfg) {
                            // success

                            _updateAtlasPages(data, cfg);

                        },
                        function(msg, cfg) {
                            // some kind of error occurred with Storage retrieval
                            MARCONI.stdlib.log(msg + ", atlas pages not found in storage, calling again with noReadStorage option");
                            cfg.noReadStorage=true;
                            MARCONI.map.getAtlasByAjax(cfg);
                        },
                        cfg)) {

                        return;
                    }
                }
                catch(storageError) {
                    // some kind of error occurred with Storage retrieval
                    MARCONI.stdlib.log("Exception reading atlas pages: " + storageError + ", calling again with noReadStorage option");
                    cfg = cfg || {};
                    cfg.noReadStorage=true;
                    MARCONI.map.getAtlasByAjax(cfg);
                    return;
                }

                // if we got a falsey value from getFromStorage(), it means we should not expect a callback, must forge on
                MARCONI.stdlib.log("atlaspage, " +  args + " data not available in DOM storage cache, fetching list with AJAX call");
            }
            else {
                //MARCONI.stdlib.log("DOM storage either not available, or noStorage option passed for atlaspage list " + args +
                //    ", fetching list with AJAX call", "info", "clientinclude/map.js");
            }

            var url="../ajax/Lookup?entity=atlaspage";

            MARCONI.stdlib.log("Loading atlas pages for atlas " + cfg.atlasGN);

            var myDataSource = new YAHOO.util.DataSource(url);

            // look in server code for ajax call to make sure fields match (case-sensitive)
            // order of field listing is not important, and we don't need to declare and use all fields provided by the server

            myDataSource.responseType = YAHOO.util.DataSource.TYPE_JSON;
            myDataSource.responseSchema = {
                resultsList : "data.Results",
                fields : [
                    "atlasPageGN", "pageIdentifier", "atlasPageTypeCD", "hasGridOnPage", "gridIncreasesDownPage",
                    "gridFirstHorizontal", "gridFirstVertical", "gridCellCountHorizontal", "gridCellCountVertical",
                    "imageOverlayURL", "mapUnitCD", "pageHeightMapUnits", "pageWidthMapUnits", "geometricShapeGN",
                    "latitudeMin", "latitudeMax",
                    "longitudeMin", "longitudeMax", "horizontalGridValueList", "verticalGridValueList"]
            };

            myDataSource.maxCacheEntries = 2;  // short-circuits hammering on refresh repeatedly

            var oCallback = {
                success: function(oRequest,oResponse,oPayload) {
                    if( !(oPayload && oPayload.noStorage) ) {
                        putToStorage("atlaspage", args, oResponse.results);
                    }_updateAtlasPages(oResponse.results, oPayload);
                    registerAJAXCompletion("AJAX fetch of atlas " + args.atlasGN);
                },
                failure: function(oRequest,oResponse,oPayload) {
                    throw("Failed to get list of atlas pages, response was " + MARCONI.stdlib.logObject(oResponse, "response"));
                    //_updateAtlasPages(null, oPayload);
                },
                scope: this,
                argument: cfg
            };

            myDataSource.doBeforeParseData = function (oRequest, oFullResponse) {
                    // if data not returned, look at error code and message
                    if( oFullResponse.data === undefined) {
                        if (oFullResponse.replyCode) {
                            alert("error " + oFullResponse.replyCode + ": " + MARCONI.stdlib.friendlyErrorMessage(oFullResponse.replyText));
                        }
                        else {
                            alert("Unknown error getting list of atlas pages");
                        }
                    }

                    return oFullResponse;
                };

            //MARCONI.stdlib.log("Sending AJAX request for atlas pages for atlas " + atlasGN + ": " + url, "info", "map.js");

            myDataSource.sendRequest(args,oCallback);

            registerAJAXLaunch("ajax request for atlas pages");
        }
        catch(ex) {
            throw("map.js: error launching AJAX request for update of atlas pages: " + ex);
        }

        function _updateAtlasPages(dataArray, args) {
            
            try {
                
                if(!args ) {
                    throw "Missing required args parameter to function _updateAtlasPages in map.js";
                }
                if( !args.atlasGN ) {
                    throw "Missing required args parameter atlasGN in function _updateAtlasPages in map.js";
                }


                var pagesAdded=0;

                //MARCONI.stdlib.log("Processing atlas" + args.atlasGN);


                // if given a proper array of values, populate from it
                if( dataArray ) {
                    _atlasArray[args.atlasGN] = dataArray;
                    pagesAdded=dataArray.length;
                }
                else {
                    throw("No data received from AJAX call for atlas pages");
                }

                if( args.onComplete ) {
                    args.onComplete(args.atlasGN, "Loaded " + pagesAdded + " pages for atlas " + args.atlasGN, args.callBackExtraArg);
                }
                else {
                    MARCONI.stdlib.log("No onComplete func for atlas load, args is " + MARCONI.stdlib.logObject(args));
                }
                
                
            }
            catch(ex) {
                throw("Error updating atlas page list with AJAX data, error is " + ex);
            }

        }
    },

    updateDatumList : function(options) {
        try {
            // cfg is optional, has the following optional params:
            // activeOnly boolean
            // onComplete, onUpdate, onAdd
            // noStorage boolean
            // minDate and maxMinutes for cache age criteria

            var cfg;

            if( options ) {
                cfg = MARCONI.stdlib.clone(options);
            }
            else {
                cfg = {};
            }

            // default to active shifts only
            var args= cfg.activeOnly === undefined ? "&IsActive=true" : "&IsActive=" + cfg.activeOnly;


            // if Storage API is loaded, and not explicitly told to skip it, look in DOM storage first

            if( YAHOO.util.Storage && !(cfg && (cfg.noReadStorage || cfg.noStorage) ) ) {

                //MARCONI.stdlib.log("Attempting to get datum list from DOM storage, " + args );

                try {

                    if( getFromStorage("datum", args,
                        function(data, cfg) {
                            // success

                            _updateDatums(data, cfg);

                            if( cfg && cfg.onComplete) {
                                cfg.onComplete();
                            }
                        },
                        function(msg, cfg) {
                            // some kind of error occurred with Storage retrieval
                            MARCONI.stdlib.log(msg + ", datum list not found in storage, calling again with noReadStorage option");
                            cfg.noReadStorage=true;
                            MARCONI.map.updateDatumList(cfg);
                        },
                        cfg)) {

                        return;
                    }

                }
                catch(storageError) {
                    // some kind of error occurred with Storage retrieval
                    MARCONI.stdlib.log("Exception " + storageError + " reading datum list from storage, calling again with noReadStorage option");
                    if( !cfg ) {
                        cfg={};
                    }
                    cfg.noReadStorage=true;
                    MARCONI.map.updateDatumList(cfg);
                    return;
                }

                // if we got a falsey value from getFromStorage(), it means we should not expect a callback, must forge on
                MARCONI.stdlib.log("datum, " +  args + " data not available in DOM storage cache, fetching list with AJAX call");
            }
            else {
                //MARCONI.stdlib.log("DOM storage either not available, or noStorage option passed for datum " + args +
                //    ", fetching list with AJAX call", "info", "clientinclude/map.js");
            }

            var url="../ajax/Lookup?entity=datum";

            var myDataSource = new YAHOO.util.DataSource(url);

            // look in server code for ajax call to make sure fields match (case-sensitive)
            // order of field listing is not important, and we don't need to declare and use all fields provided by the server

            myDataSource.responseType = YAHOO.util.DataSource.TYPE_JSON;
            myDataSource.responseSchema = {
                resultsList : "data.Results",
                fields : [
                    "datumCD", "datumName", "description", "ellipsoidCD", "ellipsoidName", "isActive",
                    "equitorialAxisMeters", "polarAxisMeters", "eccentricity", "eccentricitySquared", "flatteningInverse",
                     "collatingValue"]
            };

            myDataSource.maxCacheEntries = 2;  // short-circuits hammering on refresh repeatedly

            var oCallback = {
                success: function(oRequest,oResponse,oPayload) {
                    if( !(oPayload && oPayload.noStorage) ) {
                        putToStorage("datum", args, oResponse.results);
                    }
                    _updateDatums(oResponse.results, oPayload);
                    registerAJAXCompletion("AJAX fetch of datum list");
                },
                failure: function(oRequest,oResponse,oPayload) {
                    throw("Failed to get list of datums, response was " + MARCONI.stdlib.logObject(oResponse, "response"));
                    //_updateDatums(null, oPayload);
                },
                scope: this,
                argument: cfg
            };

            myDataSource.doBeforeParseData = function (oRequest, oFullResponse) {
                    // if data not returned, look at error code and message
                    if( oFullResponse.data === undefined) {
                        if (oFullResponse.replyCode) {
                            alert("error " + oFullResponse.replyCode + ": " + MARCONI.stdlib.friendlyErrorMessage(oFullResponse.replyText));
                        }
                        else {
                            alert("Unknown error getting datum list");
                        }
                    }

                    return oFullResponse;
                };

            //MARCONI.stdlib.log("Sending AJAX request for datum list: " + url, "info", "map.js");

            myDataSource.sendRequest(args,oCallback);

            registerAJAXLaunch();
        }
        catch(ex) {
            throw("map.js: error launching AJAX request for update of datums: " + ex);
        }

        function _updateDatums(dataArray, args) {
            try {
                
                if(!args ) {
                    throw "Missing required args parameter to function _updateDatums in map.js";
                }
                var addCount=0;
                var updateCount=0;

                // if given a proper array of values, populate from it
                if( dataArray ) {
                    if( dataArray.length > 0 ) {
                        for( var i = 0 ; i < dataArray.length ; i++) {

                            var action =  _updateDatum(_datumArray, dataArray[i]);

                            if( action === "Add" ) {
                                addCount++;
                                if( args.onAdd ) {
                                    args.onAdd( dataArray[i] );
                                }
                            }
                            else if( action === "Update") {
                                updateCount++;

                                if( args.onUpdate ) {
                                    args.onUpdate( dataArray[i]);
                                }
                            }

                        }

                        if( addCount > 0 || updateCount > 0 ) {
                            try {

                                _datumArray.sort(function(a,b) {
                                   try {
                                       if( a.collatingValue === undefined || b.collatingValue===undefined ||
                                            a.collatingValue == b.collatingValue ) {

                                            return MARCONI.stdlib.strcmp(a.datumName, b.datumName);
                                        }
                                        else {
                                            return a.collatingValue - b.collatingValue;
                                        }
                                    }
                                    catch(innerError) {
                                        MARCONI.stdlib.log("Error comparing datums: " + innerError);
                                        return 0;
                                    }
                                });
                            }
                            catch(outerError) {
                                MARCONI.stdlib.log("Error sorting datums: " + outerError);
                            }
                        }
                    }
                }
                else {
                    throw("No data received from AJAX call for datums");
                }
                // trigger datum shift update also
                
                MARCONI.map.updateDatumShiftList(args);

                


            }
            catch(ex) {
                alert("Error updating datum list with AJAX data, error is " + ex);
            }

        }

        function _updateDatum(datumArray, datum) {
            try {
                var datumCD=datum.datumCD;
                if( !datumCD ) {
                    throw "Got bad data in place of a datum: " + MARCONI.stdlib.logObject(datum);
                }

                var isFound=false;
                var indexToUpdate = null;
                var action="";

                for( var i=0; i < datumArray.length ; i++) {
                    if( datumArray[i].datumCD === datumCD ) {
                        isFound=true;
                        indexToUpdate=i;
                        break;
                    }
                }
                if(!isFound) {
                    datumArray.push(datum);
                    indexToUpdate = datumArray.length-1;
                    //MARCONI.stdlib.log("adding new datum " + datumCD + ", count of datums is now " + datumArray.length);
                    action="Add";
                }
                else {

                    for(var key in datumArray[indexToUpdate] ) {
                        if( datumArray[indexToUpdate][key] !== datum[key] ) {
                            //MARCONI.stdlib.log("value " + key + " being updated from " + datumArray[indexToUpdate][key] + " to " + datum[key]);
                            action="Update";
                        }
                    }
                    if( action === "Update") {
                        //MARCONI.stdlib.log("updating existing datum " + datumCD);
                    }
                }
                datumArray[indexToUpdate] = datum;
                
                // MARCONI.stdlib.log("new/updated datum ", datumArray[indexToUpdate]);
                
                return action;
            }
            catch(ex) {
                throw "Error updating datum " + MARCONI.stdlib.logObject(datum) + ": " + ex;
            }
        }
    },

    updateDatumShiftList : function(options) {
        try {
            // cfg is optional, has the following optional params:
            // activeOnly boolean
            // onComplete, onUpdate, onAdd
            // noStorage boolean
            // minDate and maxMinutes for cache age criteria

            var cfg;

            if( options ) {
                cfg = MARCONI.stdlib.clone(options);
            }
            else {
                cfg = {};
            }
            
            // default to active shifts only
            var args= cfg.activeOnly === undefined ? "&IsActive=true" : "&IsActive=" + cfg.activeOnly;

            // if Storage API is loaded, and not explicitly told to skip it, look in DOM storage first

            if( YAHOO.util.Storage && !(cfg && (cfg.noReadStorage || cfg.noStorage) ) ) {

                //MARCONI.stdlib.log("Attempting to get datumshift list from DOM storage, " + args );
                try {


                    if( getFromStorage("datumshift", args,
                        function(data, cfg) {
                            // success

                            _updateDatumShifts(data, cfg);

                            if( cfg && cfg.onComplete) {
                                cfg.onComplete();
                            }
                        },
                        function(msg, cfg) {
                            // some kind of error occurred with Storage retrieval
                            MARCONI.stdlib.log(msg + ", datumshift list not found in storage, calling again with noReadStorage option");
                            cfg.noReadStorage=true;
                            MARCONI.map.updateDatumShiftList(cfg);
                        },
                        cfg)) {

                        return;
                    }
                }
                catch(storageError) {
                    // some kind of error occurred with Storage retrieval
                    MARCONI.stdlib.log("Exception reading datum shifts from storage: " + storageError + ", calling again with noReadStorage option");
                    if(!cfg) {
                        cfg={};
                    }
                    cfg.noReadStorage=true;
                    MARCONI.map.updateDatumShiftList(cfg);
                    return;
                }

                // if we got a falsey value from getFromStorage(), it means we should not expect a callback, must forge on
                MARCONI.stdlib.log("coordsys, " +  args + " data not available in DOM storage cache, fetching list with AJAX call");
            }
            else {
                //MARCONI.stdlib.log("DOM storage either not available, or noStorage option passed for datumshift " + args +
                //    ", fetching list with AJAX call", "info", "clientinclude/map.js");
            }

            var url="../ajax/Lookup?entity=datumshift";

            var myDataSource = new YAHOO.util.DataSource(url);

            // look in server code for ajax call to make sure fields match (case-sensitive)
            // order of field listing is not important, and we don't need to declare and use all fields provided by the server

            myDataSource.responseType = YAHOO.util.DataSource.TYPE_JSON;
            myDataSource.responseSchema = {
                resultsList : "data.Results",
                fields : [
                    "fromDatumCD", "toDatumCD", "datumShiftMethodCD", "datumShiftMethodName", "datumShiftName", "datumShiftGN", "latitudeMin",
                    "latitudeMax", "longitudeMin", "longitudeMax", "shiftX", "shiftY", "shiftZ", "scaleFactor", "rotationX", "rotationY", "rotationZ",
                    "latitudeCoefficients", "longitudeCoefficients", "isAvailableOnServerOnly", "isActive"]
            };

            myDataSource.maxCacheEntries = 2;  // short-circuits hammering on refresh repeatedly

            var oCallback = {
                success: function(oRequest,oResponse,oPayload) {
                    if( !(oPayload && oPayload.noStorage) ) {
                        putToStorage("datumshift", args, oResponse.results);
                    }
                    _updateDatumShifts(oResponse.results, oPayload);
                    registerAJAXCompletion("AJAX fetch of datum shift list");
                },
                failure: function(oRequest,oResponse,oPayload) {
                    throw("Failed to get list of datum shifts, response was " + MARCONI.stdlib.logObject(oResponse, "response"));
                    //_updateDatumShifts(null, oPayload);
                },
                scope: this,
                argument: cfg
            };

            myDataSource.doBeforeParseData = function (oRequest, oFullResponse) {
                    // if data not returned, look at error code and message
                    if( oFullResponse.data === undefined) {
                        if (oFullResponse.replyCode) {
                            alert("error " + oFullResponse.replyCode + ": " + MARCONI.stdlib.friendlyErrorMessage(oFullResponse.replyText));
                        }
                        else {
                            alert("Unknown error getting list of datum shifts");
                        }
                    }

                    return oFullResponse;
                };

            //MARCONI.stdlib.log("Sending AJAX request for datum shift list: " + url, "info", "map.js");

            myDataSource.sendRequest(args,oCallback);
            registerAJAXLaunch();
        }
        catch(ex) {
            throw("map.js: error launching AJAX request for update of datum shifts: " + ex);
        }

        function _updateDatumShifts(dataArray, args) {
            try {

                var addCount=0;
                var updateCount=0;

                // if given a proper array of values, populate from it
                if( dataArray ) {
                    if( dataArray.length > 0 ) {
                        for( var i = 0 ; i < dataArray.length ; i++) {

                            var action =  _updateDatumShift(_datumShifts, dataArray[i]);

                            if( action === "Add" ) {
                                addCount++;
                                if( args && args.onAdd ) {
                                    args.onAdd( dataArray[i] );
                                }
                            }
                            else if( action === "Update") {
                                updateCount++;

                                if( args && args.onUpdate ) {
                                    args.onUpdate( dataArray[i] );
                                }
                            }

                        }

                        if( addCount > 0 || updateCount > 0 ) {
                            try {

                                _datumShifts.sort(function(a,b) {
                                    function methodRank(method) {
                                        // rank order will determine which shift is used when multiple shifts are available and user does not specify method.
                                        // rank for overall best methods first
                                        // SYNONYM, MRE, HELMERT, MOLODENSKY, then others such as GRID that may be implemented in the future
                                        return( method === "SYNONYM" ? 1 : (method == "MRE" ? 2 : (method=="HELMERT" ? 3 : (method=="MOLODENSKY" ? 4 : 5))));
                                    }
                                    
                                    if( a.fromDatumCD !== b.fromDatumCD) {
                                        return MARCONI.stdlib.strcmp(a.fromDatumCD, b.fromDatumCD);
                                    }
                                    else if( a.toDatumCD !== b.toDatumCD) {
                                        return MARCONI.stdlib.strcmp(a.toDatumCD, b.toDatumCD);
                                    }
                                    else {
                                        return methodRank(a.datumShiftMethodCD)- methodRank(b.datumShiftMethodCD);
                                    }

                                    
                                });
                            }
                            catch(outerError) {
                                MARCONI.stdlib.log("Error sorting datum shifts: " + outerError);
                            }
                        }

                        MARCONI.map.getCanonicalDatumSet(true); // force rebuilding lists of datum synonyms

                    }
                }
                else {
                    throw("No data received from AJAX call for datums");
                }

                if( args && args.onComplete ) {
                    args.onComplete("Added " + addCount + " datum shifts, updated " + updateCount);
                }
                
                

            }
            catch(ex) {
                alert("Error updating datum shift list with AJAX data, error is " + ex);
            }

        }

        function _updateDatumShift(datumShiftArray, datumShift) {
            try {
                var fromDatumCD=datumShift.fromDatumCD;
                if( !fromDatumCD ) {
                    throw "Got bad data in place of a datum shift: " + MARCONI.stdlib.logObject(datumShift);
                }

                var isFound=false;
                var indexToUpdate = null;
                var action="";

                for( var i=0; i < datumShiftArray.length ; i++) {
                    if( datumShiftArray[i].fromDatumCD === datumShift.fromDatumCD &&
                        datumShiftArray[i].toDatumCD === datumShift.toDatumCD &&
                        datumShiftArray[i].datumShiftMethodCD === datumShift.datumShiftMethodCD &&
                        (!datumShiftArray[i].datumShiftName || datumShiftArray[i].datumShiftName === datumShift.datumShiftName )) {
                        
                        isFound=true;
                        indexToUpdate=i;
                        break;
                    }
                }
                if(!isFound) {
                    datumShiftArray.push(datumShift);
                    indexToUpdate = datumShiftArray.length-1;
                    MARCONI.stdlib.log("adding new datum shift from " + fromDatumCD + " to " + datumShift["toDatumCD"] + ", method " + datumShift["datumShiftMethodCD"] + ", count of datum shifts is now " + datumShiftArray.length);
                    action="Add";
                }
                else {
                    // log any differences
                    for(var key in datumShift) {
                        if( !datumShiftArray[indexToUpdate][key] || datumShiftArray[indexToUpdate][key] !== datumShift[key] ) {
                            //MARCONI.stdlib.log("value " + key + " being updated from " + datumShiftArray[indexToUpdate][key] + " to " + datumShift[key]);
                            action="Update";
                        }
                    }
                }
                datumShiftArray[indexToUpdate] = datumShift;
                return action;
            }
            catch(ex) {
                throw "Error updating datum shift " + MARCONI.stdlib.logObject(datumShift) + ": " + ex;
            }
        }
    },
    
    getPointShifted : function(latitude, longitude, eastShift, northShift, linearUnitCD) {
        try {
            var units = MARCONI.map.mapUnitGivenCode((linearUnitCD ? linearUnitCD : "m"));
            if(!units) {
                throw "Could not resolve units code " + linearUnitCD;
            }
            if(!units.metersPerUnit) {
                throw "Meters per unit unknown for unit " + linearUnitCD;
            }

            var latitudeRad = parseFloat(latitude) * MARCONI.map.DEGREES_TO_RADIANS;

            var latitudeDegreesPerMeter = 180/(MARCONI.map.RADIUS_WGS84_METERS*Math.PI);  // roughly 111km per degree

            var longitudeDegreesPerMeter = latitudeDegreesPerMeter / Math.cos(latitudeRad);
            
            var deltaLatitude  = northShift * units.metersPerUnit * latitudeDegreesPerMeter;

            var deltaLongitude = eastShift * units.metersPerUnit * longitudeDegreesPerMeter;

            //alert("lat, long of " + latitude + ", " + longitude + " has shift of x,y " + eastShift + ", " + northShift + ", or " + deltaLatitude + ", " + deltaLongitude);

            var newPt= new MARCONI.map.GeoPoint(parseFloat(longitude) + deltaLongitude, parseFloat(latitude) + deltaLatitude);

            
            return newPt;
        }
        catch(ex) {
            throw("Error shifting point: " + ex);
        }
    },

    updateMapUnitList : function(options) {
        try {
            // cfg is optional, has the following optional params:
            // activeOnly boolean
            // onComplete, onUpdate, onAdd
            // noStorage boolean
            // minDate and maxMinutes for cache age criteria

            var cfg;

            if( options ) {
                cfg = MARCONI.stdlib.clone(options);
                cfg.onComplete = options.onComplete;
            }
            else {
                cfg = {};
            }

            // default to active shifts only
            var args= cfg.activeOnly === undefined ? "&IsActive=true" : "&IsActive=" + cfg.activeOnly;


            // if Storage API is loaded, and not explicitly told to skip it, look in DOM storage first

            if( window.YAHOO && YAHOO.util.Storage && !(cfg && (cfg.noReadStorage || cfg.noStorage) ) ) {

                //MARCONI.stdlib.log("Attempting to get mapunit list from DOM storage, " + args + (cfg && cfg.minDate ? ", newer than " + cfg.minDate : ""));

                try {

                    if( getFromStorage("mapunit", args,
                        function(data, cfg) {
                            // success

                            _updateMapUnits(data, cfg);

                            
                        },
                        function(msg, cfg) {
                            // some kind of error occurred with Storage retrieval
                            // call ourselves with flag
                            MARCONI.stdlib.log(msg + ", mapunit list not found in storage, calling again with noReadStorage option");
                            cfg.noReadStorage=true;
                            MARCONI.map.updateMapUnitList(cfg);
                        },
                        cfg)) {

                        return;
                    }
                }
                catch(storageError) {
                    // some kind of error occurred with Storage retrieval
                    // call ourselves with flag
                    MARCONI.stdlib.log("Exception reading map units from DOM storage: " + storageError + ", calling again with noReadStorage option");
                    if(!cfg) {
                        cfg={};
                    }
                    cfg.noReadStorage=true;
                    MARCONI.map.updateMapUnitList(cfg);
                    return;
                }

                // if we got a falsey value from getFromStorage(), it means we should not expect a callback, must forge on
                MARCONI.stdlib.log("mapunit, " +  args + " data not available in DOM storage cache, fetching list with AJAX call");
            }
            else {
                //MARCONI.stdlib.log("DOM storage either not available, or noStorage option passed for mapunit " + args +
                //    ", fetching list with AJAX call", "info", "clientinclude/map.js");
            }

            var url="../ajax/Lookup?entity=mapunit";

            var myDataSource = new YAHOO.util.DataSource(url);

            // look in server code for ajax call to make sure fields match (case-sensitive)
            // order of field listing is not important, and we don't need to declare and use all fields provided by the server

            myDataSource.responseType = YAHOO.util.DataSource.TYPE_JSON;
            myDataSource.responseSchema = {
                resultsList : "data.Results",
                fields : [
                    "mapUnitCD", "unitName", "description", "isActive", "isLinear", "isAreal", "metersPerUnit",
                     "collatingValue"]
            };

            myDataSource.maxCacheEntries = 2;  // short-circuits hammering on refresh repeatedly

            var oCallback = {
                success: function(oRequest,oResponse,oPayload) {
                    if( !(oPayload && oPayload.noStorage) ) {
                        putToStorage("mapunit", args, oResponse.results);
                    }

                    _updateMapUnits(oResponse.results, oPayload);

                    registerAJAXCompletion("AJAX fetch of mapunit list");
                },
                failure: function(oRequest,oResponse,oPayload) {
                    throw("Failed to get list of mapping units, response was " + MARCONI.stdlib.logObject(oResponse, "response"));
                    //_updateMapUnits(null, oPayload);
                },
                scope: this,
                argument: cfg
            };

            myDataSource.doBeforeParseData = function (oRequest, oFullResponse) {
                    // if data not returned, look at error code and message
                    if( oFullResponse.data === undefined) {
                        if (oFullResponse.replyCode) {
                            MARCONI.stdlib.log("error " + oFullResponse.replyCode + ": " + MARCONI.stdlib.friendlyErrorMessage(oFullResponse.replyText));
                        }
                        else {
                            MARCONI.stdlib.log("Unknown error getting list of mapping units");
                        }
                    }

                    return oFullResponse;
                };


            //MARCONI.stdlib.log("Sending AJAX request for map unit list: " + url + (cfg ? ", cfg=" + MARCONI.stdlib.logObject(cfg)  : ""), "info", "map.js");

            myDataSource.sendRequest(args,oCallback);
            
            registerAJAXLaunch();
        }
        catch(ex) {
            throw("map.js: error launching AJAX request for update of map units: " + ex);
        }

        function _updateMapUnits(dataArray, args) {
            try {
                if(!args ) {
                    throw "Missing required args parameter to function _updateMapUnits in map.js";
                }
                var addCount=0;
                var updateCount=0;

                // if given a proper array of values, populate from it
                if( dataArray ) {
                    if( dataArray.length > 0 ) {
                        for( var i = 0 ; i < dataArray.length ; i++) {

                            var action =  _updateMapUnit(_mapUnitArray, dataArray[i]);

                            if( action == "Add" ) {
                                addCount++;
                                if( args.onAdd ) {
                                    args.onAdd( dataArray[i] );
                                }
                            }
                            else if( action == "Update") {
                                updateCount++;

                                if( args.onUpdate ) {
                                    args.onUpdate( dataArray[i]);
                                }
                            }

                        }

                        if( addCount > 0 || updateCount > 0 ) {
                            try {

                                _mapUnitArray.sort(function(a,b) {
                                    if( a.collatingValue === undefined || b.collatingValue===undefined ||
                                            a.collatingValue == b.collatingValue ) {
                                        return MARCONI.stdlib.strcmp(a.mapUnitName, b.mapUnitName);
                                    }
                                    else {
                                        return a.collatingValue - b.collatingValue;
                                    }
                                });
                            }
                            catch(outerError) {
                                MARCONI.stdlib.log("Error sorting map unit list: " + outerError);
                            }
                        }
                    }
                }
                else {
                    throw("No data received from AJAX call for map units");
                }

                if( args.onComplete ) {
                    args.onComplete("Added " + addCount + " map units, updated " + updateCount);
                }
    
            }
            catch(ex) {
                alert("Error updating map unit list with AJAX data, error is " + ex);
            }

        }

        function _updateMapUnit(mapUnitArray, mapUnit) {
            try {
                var mapUnitCD=mapUnit.mapUnitCD;
                if( !mapUnitCD ) {
                    throw "Got bad data in place of a map unit: " + MARCONI.stdlib.logObject(mapUnit);
                }

                var isFound=false;
                var indexToUpdate = null;
                var action="";

                for( var i=0; i < mapUnitArray.length ; i++) {
                    if( mapUnitArray[i].mapUnitCD == mapUnitCD ) {
                        isFound=true;
                        indexToUpdate=i;
                        break;
                    }
                }
                if(!isFound) {
                    mapUnitArray.push({mapUnitCD: mapUnitCD});
                    indexToUpdate = mapUnitArray.length-1;
                    //MARCONI.stdlib.log("adding new map unit " + mapUnitCD + ", count of map units is now " + mapUnitArray.length);
                    action="Add";
                }
                else {

                    for(var key in mapUnitArray[indexToUpdate] ) {
                        if( mapUnitArray[indexToUpdate][key] != mapUnit[key] ) {
                            //MARCONI.stdlib.log("value " + key + " being updated from " + mapUnitArray[indexToUpdate][key] + " to " + mapUnit[key]);
                            action="Update";
                        }
                    }
                }
                mapUnitArray[indexToUpdate] = mapUnit;
                return action;
            }
            catch(ex) {
                throw "Error updating map unit " + MARCONI.stdlib.logObject(mapUnit) + ": " + ex;
            }
        }
    }};
}();   // end of MARCONI.map singleton function


// two main classes:  GeoPoint to hold x-y or lat-long
// and SpatialReference
MARCONI.map.GeoPoint = function( x, y ) {
    this.x = x;
    this.y = y;
};

MARCONI.map.GeoPoint.prototype.setMapGridValue = function( mapGridValue ) {
    this.mapGridValue = mapGridValue;
};

MARCONI.map.SpatialReference = function( coordSysCD, datumCD, mapUnitCD  ) {
    // constructor -- clearly the three params if given should uniquely specify a spatial ref

    var spatialRefInfo = null;

    if( coordSysCD && datumCD && mapUnitCD ) {
        // look to see if the indicated spatial reference is a stock one
        spatialRefInfo = MARCONI.map.spatialRefInfoLookup( coordSysCD, datumCD, mapUnitCD );
    }
    
    // if a stock one, just set params and return
    if( spatialRefInfo ) {
        for(var key in spatialRefInfo ) {
            if( spatialRefInfo.hasOwnProperty(key)) {
                this[key] = spatialRefInfo[key];
                //MARCONI.stdlib.log(key + "=" + spatialRefInfo[key]);
            }
        }

        if( !this.eSquared ) {
            this.eSquared = this.eccentricity * this.eccentricity;
        }
        
        if( this.mapUnitCD == MARCONI.map.UNITS_SURVEYFEET ) {
            this.equitorialAxis       = this.equitorialAxisMeters * MARCONI.map.METERS_TO_SURVEY_FEET;
        }
        else if( this.mapUnitCD == MARCONI.map.UNITS_INTERNATIONALFEET) {
            this.equitorialAxis       = this.equitorialAxisMeters * MARCONI.map.METERS_TO_INTERNATIONAL_FEET;
        }
        else {
            this.equitorialAxis       = this.equitorialAxisMeters;
        }
        
        return;
    }
    
    // handle custom coordinate systems of the supported type
    // by assigning the stuff we can.  Most params will be user-set
    // but we set stuff based on units and datum

    if( coordSysCD == MARCONI.map.COORDSYS_LAMBERTCUSTOM) {
        
        this.coordSysTypeCD = MARCONI.map.COORDSYS_TYPE_LAMBERT;
        this.coordSysCD     = coordSysCD;
        this.datumCD        = datumCD;
        this.mapUnitCD      = mapUnitCD;
    }
    else if( coordSysCD == MARCONI.map.COORDSYS_TMCUSTOM )  {

        this.coordSysTypeCD = MARCONI.map.COORDSYS_TYPE_TM;
        this.coordSysCD     = coordSysCD;
        this.datumCD        = datumCD;
        this.mapUnitCD      = mapUnitCD;
    }
    else {
        throw ("Cannot construct SpatialReference object that has coord sys " + coordSysCD + " with datum " + datumCD + " and units " + mapUnitCD);
    }

    // set constants based on the

    this.equitorialAxisMeters=0;
    this.equitorialAxis = 0;
    this.eSquared=0;
    this.parallel_one=0;
    this.parallelTwo=0;
    this.originLatitude=0;
    this.originLongitude=0;
    this.originX=0;
    this.originY=0;
    this.centralScaleFactor=1.0;

    // Assign geometry of the ellipsoid depending on the datum and units
    if(datumCD == MARCONI.map.DATUM_HORIZ_1927) {
          this.equitorialAxisMeters = MARCONI.map.RADIUS_CLARKE1866_METERS;

          this.eSquared = MARCONI.map.eSquared_CLARKE1866;
    }
    else if( datumCD == MARCONI.map.DATUM_HORIZ_1983 )  {

        this.equitorialAxisMeters = MARCONI.map.RADIUS_GRS80_METERS;

        this.eSquared = MARCONI.map.eSquared_GRS80;
    }
    else if( datumCD == MARCONI.map.DATUM_HORIZ_WGS84) {
        this.equitorialAxisMeters = MARCONI.map.RADIUS_WGS84_METERS;

        this.eSquared = MARCONI.map.eSquared_WGS84;
    }
    else {
        throw ("Datum " + datumCD + " not recognized, must be " + MARCONI.map.DATUM_HORIZ_1927 + " for NAD27 or " + MARCONI.map.DATUM_HORIZ_1983 + " for NAD83");
    }

    if( mapUnitCD == MARCONI.map.UNITS_SURVEYFEET) {
        this.equitorialAxis = this.equitorialAxisMeters * MARCONI.map.METERS_TO_SURVEY_FEET;
    }
    else if( mapUnitCD == MARCONI.map.UNITS_METERS ) {
        this.equitorialAxis = this.equitorialAxisMeters;
    }
    else if( this.mapUnitCD == MARCONI.map.UNITS_INTERNATIONALFEET) {
        this.equitorialAxis = this.equitorialAxisMeters * MARCONI.map.METERS_TO_INTERNATIONAL_FEET;
    }
    else if( mapUnitCD != MARCONI.map.UNITS_DEGREES ) {
        throw ("Units not supported, must be " + UNITS_SURVEYFEET + " for survey feet, " + MARCONI.map.UNITS_INTERNATIONALFEET + " for int. feet, " +
            MARCONI.map.UNITS_METERS +
            " for meters, or " + MARCONI.map.UNITS_DEGREES + " for degrees.");
    }


    // alert("projection radius is " + this.equitorialAxisMeters + "m");
};

MARCONI.map.SpatialReference.prototype.toString = function() {
    return "Coord sys " + this.coordSysCD + " of type " + this.coordSysTypeCD + ", datum " +
        this.datumCD + ", units " + this.mapUnitCD;
};

// this is called for custom TM or Lambert spatial references
MARCONI.map.SpatialReference.prototype.setCustomParams = function(
    parallelOne,
    parallelTwo,
    originLatitude,
    originLongitude,
    originX,
    originY,
    centralScaleFactor ) {
        
    if( parallelOne !== undefined) {
        this.parallel_one = parallelOne;
    }
    
    if( parallelTwo !== undefined ) {
        this.parallelTwo = parallelTwo;
    }

    if(originLatitude !== undefined) {
        this.originLatitude = originLatitude;
    }

    if(originLongitude !== undefined) {
        this.originLongitude = originLongitude;
    }

    if(originX !== undefined) {
        this.originX = originX;
    }

    if( originY !== undefined ) {
        this.originY = originY;
    }

    if( centralScaleFactor !== undefined ) {
        this.centralScaleFactor=centralScaleFactor;
    }
};

MARCONI.map.GeoPoint.prototype.toString = function() {
    return "x=" + this.x + ", y=" + this.y;
};

MARCONI.map.GeoPoint.prototype.setUTMzoneStyle = function(style) {
    this.utmZoneStyle = style;  // Letter or Hemisphere
};
MARCONI.map.GeoPoint.prototype.getUTMzoneStyle = function() {
    return this.utmZoneStyle || "Letter";
};

MARCONI.map.GeoPoint.prototype.convert = function(spatialRefIn, spatialRefOut, datumShiftMethodCD, format )  {
    // we use the idiom that=this to allow our inner funcs to access the GeoPoint via a "that" reference
    var that=this;
    
    function determineAtlasPageAndGridFromLatLong(atlasSpatialRef) {
        function gridValue(cellCount, baseGridValue, doesGridIncreaseToUpperLeft, coordValue, minCoordValue, maxCoordValue, possibleGridValues) {
            try {

                var ratio = (coordValue-minCoordValue)/(maxCoordValue-minCoordValue);
                if( !doesGridIncreaseToUpperLeft ) {
                    ratio = 1-ratio;
                }

                var cellIndex = null;

                var cellValue = null;

                if( possibleGridValues ) {
                    // for example the possible grid values might be a string ABC etc
                    // note that the string is given "down the page" as most maps put A as an upper grid, then B, etc.
                    // since map coordinates by contrast increase "up the page", we need to adjust as needed
                    // in fact the flag doesGridIncreaseToUpperLeft took care of this

                    cellIndex = Math.floor(ratio*cellCount);

                    var offset = possibleGridValues.indexOf(baseGridValue);   // normally zero but if page uses a subset of list could be nonzero
                    
                    cellIndex = offset + cellIndex;

                    cellValue = ( cellIndex >= 0 && cellIndex <= possibleGridValues.length ?
                        possibleGridValues.charCodeAt(cellIndex) : "");
                }
                else {
                    // note the wacky logic about cellIndexes 8 and over, designed to skip over the letter I
                    cellIndex = Math.floor(ratio*cellCount);

                    cellValue = (MARCONI.stdlib.isDigit(baseGridValue) ?
                        1*baseGridValue + cellIndex :
                        String.fromCharCode(baseGridValue.charCodeAt(0) + cellIndex + (cellIndex < 8 ? 0 : 1)) );
                }
                return cellValue;
            }
            catch(ex) {
                throw "Error computing grid component value from real-world coordinate of " + coordValue + ", min-max of " + minCoordValue + " and " + maxCoordValue +
                    " using cellcount of " + cellCount + ", baseGridValue of " + baseGridValue + (possibleGridValues ? " and possible gridvals of " + possibleGridValues : "") +
                    ", error is: " + ex;
            }
        }
        
        try {

            var coordSys = MARCONI.map.coordSysGivenCode(atlasSpatialRef.coordSysCD);
            if( !coordSys || !coordSys.atlasGN ) {
                throw "Coordinate system is of type atlas, but atlasGN is not known for coord sys with code " + atlasSpatialRef.coordSysCD;
            }
            
            if( ! MARCONI.map.isAtlasLoaded(coordSys.atlasGN) ) {
                // fire off an AJAX request so a retry might work
                MARCONI.stdlib.log("Auto-loading atlasGN " + coordSys.atlasGN);
                
                MARCONI.map.getAtlasByAjax({atlasGN: coordSys.atlasGN});

                // MARCONI.map.dumpAtlases();

                throw("BUSY -- atlas " + coordSys.atlasGN + " is being loaded.");
            }
            
            var atlas = MARCONI.map.getAtlas(coordSys.atlasGN);
            
            if( typeof(atlas) == "undefined") {
                throw "Atlas " + coordSys.atlasGN + " is not available";
            }

            if( atlas.length === 0 ) {
                throw "Atlas " + coordSys.atlasGN + " has no pages -- you have no hope of computing coordinates from it";
            }

            for( var i = 0 ; i < atlas.length ; i++) {

                // if given point is bounded by the page
                if( atlas[i].latitudeMin < that.y &&
                    atlas[i].longitudeMin < that.x &&
                    atlas[i].latitudeMax > that.y &&
                    atlas[i].longitudeMax > that.x ) {


                    that.x = atlas[i].pageIdentifier + (atlas[i].hasGridOnPage ? " " +
                        gridValue(atlas[i].gridCellCountHorizontal, atlas[i].gridFirstHorizontal, true, that.x, atlas[i].longitudeMin, atlas[i].longitudeMax, atlas[i].horizontalGridValueList) + " " +
                        gridValue(atlas[i].gridCellCountVertical,   atlas[i].gridFirstVertical,   !atlas[i].gridIncreasesDownPage, that.y, atlas[i].latitudeMin, atlas[i].latitudeMax, atlas[i].verticalGridValueList) : "");
                    that.y = "";

                    return;

                }

            }
            // if atlas page not resolved, it's not an error just an empty value
            that.x = "";
            that.y = "";
            return;
        }
        catch(ex) {
            throw(ex.startsWith("BUSY") ? ex : "Error getting atlas page from lat-long value: " + ex);
        }

        
        
    }

    function determineLatLongFromAtlasPageAndGrid(atlasSpatialRef) {
        function ratioFromLowerLeft(gridValue, baseGridValue, cellCount, doesGridIncreaseToUpperLeft, possibleGridValues) {
            var ratio=null;

            if( possibleGridValues ) {
                var baseIndex = possibleGridValues.indexOf(baseGridValue);
                var gridIndex = possibleGridValues.indexOf(gridValue);
                if( baseIndex < 0 || gridIndex < 0 ) {
                    throw "Grid-cell designation of " + gridValue + " with base value of " + baseGridValue + " illegal with given range of grid values " + possibleGridValues;
                }

                // Math.abs is used since the direction of grid values is already accounted for with the flag doesGridIncreaseToUpperLeft
                
                ratio = Math.abs(gridIndex-baseIndex)/cellCount;
                
            }
            else {
                ratio = ( MARCONI.stdlib.isDigit(baseGridValue) ? (gridValue-baseGridValue)/cellCount :
                (gridValue.charCodeAt(0) - baseGridValue.charCodeAt(0) - (gridValue.toUpperCase()  < 'J' ? 0 : 1))/cellCount) + 0.5/cellCount;


                
                
            }
            
            if(ratio < 0 || ratio > 1) {
                throw "Grid-cell designation of " + gridValue + " with base value of " + baseGridValue + " and " + cellCount + " cells" +
                    " results in illegal ratio of " + ratio + (possibleGridValues ? " using possibleGridValues of " + possibleGridValues : "");
            }
            
            if( !doesGridIncreaseToUpperLeft ) {
                ratio = 1 - ratio;
            }

            return ratio;
        }
        
        try {
            var coordSys = MARCONI.map.coordSysGivenCode(atlasSpatialRef.coordSysCD);
            if( !coordSys || !coordSys.atlasGN ) {
                throw "Coordinate system is of type atlas, but atlasGN is not known for coord sys with code " + atlasSpatialRef.coordSysCD;
            }
            
            if(!MARCONI.map.isAtlasLoaded(coordSys.atlasGN) ) {
                // fire off an AJAX request that will call back when done
                MARCONI.map.getAtlasByAjax({atlasGN: coordSys.atlasGN});

                throw("BUSY -- atlas " + coordSys.atlasGN + " is being loaded.");
            }

            var atlas = MARCONI.map.getAtlas(coordSys.atlasGN);
            if( !atlas ) {
                throw "Atlas " + coordSys.atlasGN + " is not available";
            }

            if( atlas.length === 0 ) {
                throw "Atlas " + coordSys.atlasGN + " has no pages -- you have no hope of computing coordinates from it";
            }

            var parts = that.x.toUpperCase().split(" ");
            if(!parts || parts.length === 0 ) {
                throw "Atlas page designation not given";
            }

            var pageIdentifier = parts[0];
            var gridHorizontal = parts.length > 1 ? parts[1].toUpperCase() : "";
            var gridVertical   = parts.length > 2 ? parts[2].toUpperCase() : "";
            if( gridHorizontal && !gridVertical && gridHorizontal.length > 1) {
                gridVertical   = gridHorizontal.substr(1);
                gridHorizontal = gridHorizontal.substr(0,1);
            }


            // look at each page of the atlas
            for( var i = 0 ; i < atlas.length ; i++) {

                // if the page is a match
                if( atlas[i].pageIdentifier == pageIdentifier ) {

                    var ratioX = (atlas[i].hasGridOnPage && gridHorizontal  ?
                        ratioFromLowerLeft(gridHorizontal, atlas[i].gridFirstHorizontal,atlas[i].gridCellCountHorizontal, true, atlas[i].horizontalGridValueList) : 0.5);

                    var ratioY = (atlas[i].hasGridOnPage && gridVertical  ?
                        ratioFromLowerLeft(gridVertical, atlas[i].gridFirstVertical,atlas[i].gridCellCountVertical, !atlas[i].gridIncreasesDownPage, atlas[i].verticalGridValueList): 0.5);


                    that.x = atlas[i].longitudeMin + ratioX * (atlas[i].longitudeMax - atlas[i].longitudeMin);
                    that.y = atlas[i].latitudeMin  + ratioY * (atlas[i].latitudeMax  - atlas[i].latitudeMin);

                    //MARCONI.stdlib.log("returning for page " + pageIdentifier + ", grid " + gridHorizontal + ", " + gridVertical);

                    return;
                }
            }

            // no match
            throw "Cannot find page " + pageIdentifier + " in atlas " + coordSys.atlasGN;

        }
        catch(ex) {
            throw( ex.startsWith("BUSY") ? ex : "Error determining lat-long from grid value: " + ex);
        }
    }

    function determineLatLongFromGridValue(spatialRef) {
            
        var mapGridValue = (that.mapGridValue ? that.mapGridValue : that.x);

        if( !mapGridValue ) {
            throw("call setMapGridValue or set x before calling convert()");
        }

        if( spatialRef.spatialReferenceCD == MARCONI.map.SPATIALREF_USNG ||
            spatialRef.spatialReferenceCD == MARCONI.map.SPATIALREF_MGRS ) {

            determineLatLongFromUSNG(spatialRef, mapGridValue);
        }
        else if( spatialRef.spatialReferenceCD == MARCONI.map.SPATIALREF_GARS ) {

            determineLatLongFromGARS(mapGridValue);
        }
        // UTM grid can use varying datums, but all use the same coord sys
        else if( spatialRef.coordSysCD == MARCONI.map.COORDSYS_UTM ) {

            determineLatLongFromUTM(spatialRef, mapGridValue);
        }
        else if( spatialRef.spatialReferenceCD == MARCONI.map.SPATIALREF_CAP_CLASSIC ) {
            determineLatLongFromCAPClassic(mapGridValue);
        }
        else if( spatialRef.spatialReferenceCD == MARCONI.map.SPATIALREF_CAP_CELL ) {

            determineLatLongFromCAPCell(mapGridValue);
        }
        else if( spatialRef.spatialReferenceCD == MARCONI.map.SPATIALREF_OSGB ) {
            determineLatLongFromOSGB(spatialRef, mapGridValue);
        }
        else if( spatialRef.spatialReferenceCD == MARCONI.map.SPATIALREF_IRISH ) {
            determineLatLongFromIrishGrid(spatialRef, mapGridValue);
        }
        else if( spatialRef.coordSysTypeCD == MARCONI.map.COORDSYS_TYPE_GRID  && spatialRef.baseCoordSysCD ) {
           
            determineLatLongFromGenericGrid(spatialRef, mapGridValue);
        }
        else {
            throw("Unrecognized grid type " + spatialRef.spatialReferenceCD);
        }
    }

    function determineGenericGridValueFromLatLong(spatialRef) {
        function inBounds(spatialRef, latitude, longitude) {
            if( spatialRef.latitudeMin && spatialRef.latitudeMax && spatialRef.longitudeMin && spatialRef.longitudeMax) {
                return( latitude  > spatialRef.latitudeMin  && latitude  < spatialRef.latitudeMax &&
                        longitude > spatialRef.longitudeMin && longitude < spatialRef.longitudeMax );
            }
            return true;
        }

        function formatXY(template, x, y) {
            function formatNumber(num, formatModel) {
                //alert("formatmodel is " + formatModel);
                
                var numLength = (typeof(formatModel) == "string" ? formatModel.length : 4);

                var retVal = MARCONI.stdlib.fixedFormatNumber(num, numLength, 0);
                
                return retVal;
            }

            template = template.trim();
            
            // format string aka template has up to five regions:  a prefix, a middle, an suffix all optional
            // and two numeric format expressions enclosed with curly braces
            var REGEX = "(.*)(\\{.*\\})([^\\d]*)(\\{.*\\})(.*)";


            var p = new RegExp(REGEX);
            var m = p.exec(template);

            if( m && m.length > 1) {

                var  prefix       = m[1];
                var firstNumber   = m[2];
                var middle        = m[3];
                var secondNumber  = m[4];
                var suffix        = m[5];

                var firstFormat   = firstNumber.length  > 2 ? firstNumber.substring(1,  firstNumber.length  - 1).split(",") : null;
                var secondFormat  = secondNumber.length > 2 ? secondNumber.substring(1, secondNumber.length - 1).split(",") : null;

                var isFirstComponentEasting=true;

                var firstFormatModel  = (firstFormat  ? firstFormat[2] : null);
                var secondFormatModel = (secondFormat ? secondFormat[2] : null);

                if( firstFormat !== null && secondFormat !== null && firstFormat[0].trim() == "1") {
                    isFirstComponentEasting = false;
                }

                var gridValue = prefix +
                    formatNumber((isFirstComponentEasting ? x : y), firstFormatModel) +
                    middle +
                    formatNumber((isFirstComponentEasting ? y : x), secondFormatModel) +
                    suffix;

                return gridValue;
            }
            else {
                MARCONI.stdlib.log("template ", template, ", ", " does not match ", REGEX);
            }
            return "";
        }
        
        try {
            if( !inBounds(spatialRef, that.y, that.x ) ) {
                that.x="";
                that.y="";
                return "";   // empty string rather than throw error since it's quite common for a point to lie outside grid area
            }

            if( !spatialRef.baseCoordSysCD ) {
                throw("Coord sys " + spatialRef.coordSysCD + " needs to define a base coord sys in order to compute grid values");
            }

            var baseRef = new MARCONI.map.SpatialReference( spatialRef.baseCoordSysCD, spatialRef.datumCD, spatialRef.inputResolutionUnitCD);

            if( !baseRef ) {
                throw("Cannot determine underlying spatial reference for grid reference frame " + spatialRef.spatialReferenceCD);
            }

            // MARCONI.stdlib.log("determined base ref system of " + MARCONI.stdlib.logObject(baseRef));
            
            if( baseRef.coordSysTypeCD == MARCONI.map.COORDSYS_TYPE_LAMBERT ) {
                
                Lambert_LatLongToCartesian(
                    baseRef.equitorialAxis,
                    baseRef.eSquared,
                    baseRef.parallelOne,
                    baseRef.parallelTwo,
                    baseRef.originLatitude,
                    baseRef.originLongitude,
                    baseRef.originX,
                    baseRef.originY);

            }
            else if( baseRef.coordSysTypeCD == MARCONI.map.COORDSYS_TYPE_TM) {
                TM_LatLongToCartesian(
                    baseRef.equitorialAxis,
                    baseRef.eSquared,
                    baseRef.originLatitude,
                    baseRef.originLongitude,
                    baseRef.originX,
                    baseRef.originY,
                    baseRef.centralScaleFactor);
            }
            else if( baseRef.coordSysTypeCD == MARCONI.map.COORDSYS_TYPE_ALBERS) {
                Albers_LatLongToCartesian(
                    baseRef.equitorialAxis,
                    baseRef.eSquared,
                    baseRef.parallelOne,
                    baseRef.parallelTwo,
                    baseRef.originLatitude,
                    baseRef.originLongitude,
                    baseRef.originX,
                    baseRef.originY);
            }
            else if( baseRef.coordSysTypeCD == MARCONI.map.COORDSYS_TYPE_STEREO ) {
                Stereo_LatLongToCartesian(
                    baseRef.equitorialAxis,
                    baseRef.eSquared,
                    baseRef.originLatitude,
                    baseRef.originLongitude,
                    baseRef.originX,
                    baseRef.originY,
                    baseRef.centralScaleFactor);
            }
            else if( baseRef.coordSysTypeCD == MARCONI.map.COORDSYS_TYPE_MERCATOR ) {
                Mercator_LatLongToCartesian(
                    baseRef.equitorialAxis,
                    baseRef.eSquared,
                    baseRef.originX,
                    baseRef.originY
                    );
            }
            else {
                throw("Unable to process grid based on coord sys of other than TM, Lambert or Albers");
            }

            var resolution = (spatialRef.inputResolution ? spatialRef.inputResolution : 1000.0);

            var horizMult = spatialRef.gridCellSizeHorizontal/resolution;
            var vertMult  = spatialRef.gridCellSizeVertical  /resolution;

            var x = (horizMult * Math.floor( that.x / spatialRef.gridCellSizeHorizontal));
            var y = (vertMult *  Math.floor( that.y / spatialRef.gridCellSizeVertical));

            // MARCONI.stdlib.log("Formatting ", x, ", ", y, " as a grid value with template ", spatialRef.gridTemplate);
            
            var gridVal= formatXY(spatialRef.gridTemplate, x, y);

            that.x=gridVal;
            that.y="";
            
            // MARCONI.stdlib.log("Got ", gridVal);
            
            return gridVal;
        }
        catch(ex) {
            throw("Error getting generic grid from lat-long of " + that.y + ", " + that.x  + ", err is " + ex.toString());
        }

        
    }

    function determineLatLongFromGenericGrid(spatialRef, gridValue) {
        function parsingRegExp(gridTemplate) {
            // format string has up to five regions:  a prefix, a middle, and a suffix, all optional
            // and two numeric format expressions enclosed with curly braces
            var REGEX = "(.*)(\\{.*\\})([^\\d]*)(\\{.*\\})(.*)";


            var p = new RegExp(REGEX);
            var m = p.exec(gridTemplate);

            if( m && m.length > 1) {

                var  prefix       = m[1];
                var firstNumber   = m[2];
                var middle        = m[3];
                var secondNumber  = m[4];
                var suffix = m[5];

                var NUMERIC_GROUP = "([\\d]*)";
                var firstFormat  = firstNumber.length  > 2 ? firstNumber.substring(1,  firstNumber.length-1).split(",") : null;
                var secondFormat = secondNumber.length > 2 ? secondNumber.substring(1, secondNumber.length-1).split(",") : null;

                var isFirstComponentEasting=true;

                if( firstFormat !== null && secondFormat !== null && firstFormat[0] == "1" ) {
                    isFirstComponentEasting = false;
                }

                var regExPattern =      "(" + (prefix.length === 0 ? "[\\s\\D]*" : "[\\s]*" + prefix + "[\\s]*") + ")" +
                        NUMERIC_GROUP + "(" + (middle.length === 0 ? "[\\s\\D]*" : "[\\s]*" + middle + "[\\s]*") + ")" +
                        NUMERIC_GROUP + "(" + (suffix.length === 0 ? "[\\s\\D]*" : "[\\s]*" + suffix + "[\\s]*") + ")";

                return {regExPattern: regExPattern, isFirstComponentEasting: isFirstComponentEasting};
            }
            return null;
        }

        try {
            var baseRef = new MARCONI.map.SpatialReference(spatialRef.baseCoordSysCD, spatialRef.datumCD, spatialRef.inputResolutionUnitCD);

            if( !baseRef ) {
                throw("Cannot determine underlying spatial reference for grid reference frame " + spatialRef.spatialReferenceCD);
            }

            var DEFAULT_REGEX="([\\D]*)([\\d]*)([\\D]*)([\\d]*)([\\D]*)";    // optional non-digits, digits, some non-digits, more digits, optional suffix

            var regExObject = parsingRegExp(spatialRef.gridTemplate);

            var regEx=DEFAULT_REGEX;
            if( regExObject && regExObject.regExPattern ) {
                regEx = regExObject.regExPattern;
            }

            var isFirstComponentEasting=true;
            if( regExObject && typeof(regExObject.isFirstComponentEasting) != "undefined") {
                isFirstComponentEasting=regExObject.isFirstComponentEasting;
            }

            var CASE_INSENSITIVE="i";
            var p = new RegExp(regEx, CASE_INSENSITIVE);
            var m = p.exec( gridValue );

            if( m && m.length == 6) {
                var eastingStr  = (isFirstComponentEasting ? m[2] : m[4]);
                var northingStr = (isFirstComponentEasting ? m[4] : m[2]);
                var easting;
                var northing;

                try {
                    easting  = parseInt(eastingStr,10);
                    northing = parseInt(northingStr,10);
                }
                catch( parseEx) {
                    throw("Cannot parse grid value " + that.x);
                }

                var resolution = (spatialRef.inputResolution ? spatialRef.inputResolution : 1000.0);

                var x = resolution * easting  + spatialRef.gridCellSizeHorizontal*0.5;
                var y = resolution * northing + spatialRef.gridCellSizeVertical*0.5;

                that.x = x;
                that.y = y;

                switch( baseRef.coordSysTypeCD ) {
                    case MARCONI.map.COORDSYS_TYPE_LAMBERT:
                       Lambert_CartesianToLatLong(
                            baseRef.equitorialAxis,
                            baseRef.eSquared,
                            baseRef.parallelOne,
                            baseRef.parallelTwo,
                            baseRef.originLatitude,
                            baseRef.originLongitude,
                            baseRef.originX,
                            baseRef.originY
                            );
                        break;
        
                    case MARCONI.map.COORDSYS_TYPE_TM:
                        TM_CartesianToLatLong(
                            baseRef.equitorialAxis,
                            baseRef.eSquared,
                            baseRef.originLatitude,
                            baseRef.originLongitude,
                            baseRef.originX,
                            baseRef.originY,
                            baseRef.centralScaleFactor);
                        break;

                    case MARCONI.map.COORDSYS_TYPE_ALBERS:
                       Albers_CartesianToLatLong(
                            baseRef.equitorialAxis,
                            baseRef.eSquared,
                            baseRef.parallelOne,
                            baseRef.parallelTwo,
                            baseRef.originLatitude,
                            baseRef.originLongitude,
                            baseRef.originX,
                            baseRef.originY
                            );
                        break;
                        
                    case MARCONI.map.COORDSYS_TYPE_STEREO:
                       Stereo_CartesianToLatLong(
                            baseRef.equitorialAxis,
                            baseRef.eSquared,
                            baseRef.originLatitude,
                            baseRef.originLongitude,
                            baseRef.originX,
                            baseRef.originY,
                            baseRef.centralScaleFactor
                            );
                        break;
                        
                    case MARCONI.map.COORDSYS_TYPE_MERCATOR:
                       Mercator_CartesianToLatLong(
                            baseRef.equitorialAxis,
                            baseRef.eSquared,
                            baseRef.originX,
                            baseRef.originY
                            );
                        break;

                    default:
                        throw("Stateplane grid does not work with base coordsys of type " + baseRef.coordSysTypeCD);
                }
            }
            else {
                throw("Illegal grid value passed, must match regular expression " + regEx + " which was formulated based on the GridTemplate of " +
                        spatialRef.gridTemplate + " associated with the coordinate system in database table coordsys with code " +
                        spatialRef.coordSysCD);
            }
        }
        catch(ex) {
            throw("Error " + ex + " attempting to convert grid value " + gridValue + " to lat-long");
        }
    }

    function determineGridValueFromLatLong(spatialRef, format) {
        try {

            if( that.x < -180 || that.x > 180 || that.y < -90 || that.y > 90 ) {
                throw("Cannot determine grid value since given lat-long of " + that.y + ", " + that.x + " is not a valid lat-long");
            }

            if( spatialRef.spatialReferenceCD == MARCONI.map.SPATIALREF_USNG ) {
                
                determineUSNGFromLatLong(false);
            }
            else if( spatialRef.spatialReferenceCD == MARCONI.map.SPATIALREF_MGRS ) {
                
                determineUSNGFromLatLong(true);
            }
            else if( spatialRef.coordSysCD == MARCONI.map.COORDSYS_UTM ) {
                
                determineUTMFromLatLong(spatialRef, that.getUTMzoneStyle().toLowerCase() == "hemisphere");
            }
            else if( spatialRef.spatialReferenceCD == MARCONI.map.SPATIALREF_GARS ) {
                
                determineGARSFromLatLong();
            }
            else if( spatialRef.spatialReferenceCD == MARCONI.map.SPATIALREF_CAP_CLASSIC ) {
                
                determineCAPClassicFromLatLong();
            }
            else if( spatialRef.spatialReferenceCD == MARCONI.map.SPATIALREF_CAP_CELL ) {
            
                determineCAPCellFromLatLong();
            }
            else if( spatialRef.coordSysTypeCD == MARCONI.map.COORDSYS_TYPE_GRID && spatialRef.baseCoordSysCD ) {
                
                determineGenericGridValueFromLatLong(spatialRef);
            }
            else if( spatialRef.spatialReferenceCD == MARCONI.map.COORDSYS_OSGB ) {
                
                determineOSGBFromLatLong(spatialRef, format);
            }
            else if( spatialRef.spatialReferenceCD == MARCONI.map.COORDSYS_IRISH ) {
                
                determineIrishGridFromLatLong(spatialRef, format);
            }
            else {
                throw("Unrecognized grid coordinate system " + spatialRef.coordSysCD );
            }
        }
        catch(ex) {
            throw("Error trying to get grid value from lat-long: " + ex);
        }

    }

    function determineOSGBFromLatLong( spatialRef, format ) {
        function OSGBGridGivenOrdinals(x,y) {
            var letters = "ABCDEFGHJKLMNOPQRSTUVWXYZ";  // 5x5 grid 
            
            y =  4 - (y % 5);  // y is now 0 for top row A-E, 4 for bottom row starting with V
            // y = 4-y;
            // var index = (((y+1)%5)-1)*5 + x%5;
            var index = y * 5 + x%5;
            
            var letter= letters.substr( index,1);
            
            // MARCONI.stdlib.log("Value at ", x, y, "=", letter, ", measured from lower left");
            
            return letter;
        }

        try {
            var eSquared = spatialRef.eSquared || (spatialRef.eccentricity * spatialRef.eccentricity);
            
            TM_LatLongToCartesian(
                spatialRef.equitorialAxisMeters,
                eSquared,
                spatialRef.originLatitude,
                spatialRef.originLongitude,
                spatialRef.originX,
                spatialRef.originY,
                spatialRef.centralScaleFactor);
        
            
            var x = Math.round(that.x);
            var y = Math.round(that.y);
            
            // if off the grid return a blank string 
            if( x < 0 || y < 0 ) {
                that.x = "";
            }
            else {
                if(!format || format.toLowerCase()=="alpha") {
                    // compute indexes based on lower-left origin for a 5x5 letter grid (A-E in first row, F-K in second row, etc.)
                    // then move two over and one up since we want square S not V for 0,0 TM coordinates
                    var xFirstOrdinal  =    Math.floor( x/500000 )+2;
                    var yFirstOrdinal  =    Math.floor( y/500000 )+1; 

                    // MARCONI.stdlib.log(x, y, " give coordinates of large square as", xFirstOrdinal, yFirstOrdinal, " from top left");

                    var firstLetter = OSGBGridGivenOrdinals(xFirstOrdinal, yFirstOrdinal);

                    var xSecondOrdinal =   Math.floor( x /100000);
                    var ySecondOrdinal =   Math.floor( y /100000);

                    var secondLetter = OSGBGridGivenOrdinals(xSecondOrdinal, ySecondOrdinal);

                    x = x % 100000;
                    y = y % 100000;

                    that.x = firstLetter + secondLetter + " " + MARCONI.stdlib.fixedFormatNumber(x, 5, 0, false) + " " + MARCONI.stdlib.fixedFormatNumber(y, 5, 0, false);
                }
                else {  // numeric
                    x -= 2E6;
                    y -= 1E6;

                    that.x = MARCONI.stdlib.fixedFormatNumber(x, 5, 0, false) + " " + MARCONI.stdlib.fixedFormatNumber(y, 5, 0, false);
                }
            }
            that.y = "";
        }
        catch(ex) {
            throw("Error computing OSGB from lat-long: " + ex);
        }
    }
    
    function determineIrishGridFromLatLong( spatialRef, format ) {
        function IrishGridGivenOrdinals(x,y) {
            var letters = "ABCDEFGHJKLMNOPQRSTUVWXYZ";  // 5x5 grid 
            
            y =  4 - (y % 5);  // y is now 0 for top row A-E, 4 for bottom row starting with V
            
            var index = y * 5 + x%5;
            
            var letter= letters.substr( index,1);
            
            return letter;
        }

        try {
            var eSquared = spatialRef.eSquared || (spatialRef.eccentricity * spatialRef.eccentricity);
            
            TM_LatLongToCartesian(
                spatialRef.equitorialAxisMeters,
                eSquared,
                spatialRef.originLatitude,
                spatialRef.originLongitude,
                spatialRef.originX,
                spatialRef.originY,
                spatialRef.centralScaleFactor);
        
            
            var x = Math.round(that.x);
            var y = Math.round(that.y);
            
            // if off the grid return a blank string 
            if( x < 0 || y < 0 ) {
                that.x = "";
            }
            else {
                if(!format || format.toLowerCase()=="alpha") {
                    // compute indexes based on lower-left origin for a 5x5 letter grid (A-E in first row, F-K in second row, etc.)
                    
                    var xFirstOrdinal  =    Math.floor( x/100000 );
                    var yFirstOrdinal  =    Math.floor( y/100000 ); 

                    // MARCONI.stdlib.log(x, y, " give coordinates of large square as", xFirstOrdinal, yFirstOrdinal, " from top left");

                    var letter = IrishGridGivenOrdinals(xFirstOrdinal, yFirstOrdinal);

                    

                    x = x % 100000;
                    y = y % 100000;

                    that.x = letter  + " " + MARCONI.stdlib.fixedFormatNumber(x, 5, 0, false) + " " + MARCONI.stdlib.fixedFormatNumber(y, 5, 0, false);
                }
                else {  // numeric
                    
                    that.x = MARCONI.stdlib.fixedFormatNumber(x, 5, 0, false) + " " + MARCONI.stdlib.fixedFormatNumber(y, 5, 0, false);
                }
            }
            that.y = "";
        }
        catch(ex) {
            throw("Error computing Irish grid from lat-long: " + ex);
        }
    }
    
    function determineGARSFromLatLong() {
        function getLongitudeBand(longitude) {
            if( !longitude) {
                return null;
            }
            var band = 1 + Math.floor((longitude + 180.0)*2.0);  // 1-based not zero-based, eg., code is 001 at longitude -179.9

            return MARCONI.stdlib.padLeft(band, 3);
        }
        function getLatitudeBand(latitude) {
            var LETTER_ARRAY = "ABCDEFGHJKLMNPQRSTUVWXYZ";  // no I or O

            if( !latitude ) {
                return null;
            }
            var offset = Math.floor((latitude + 90.0)*2.0);

            if( offset < 0 || offset > 719 ) {
                throw "Latitude band of " + offset + " is outside bounds 0-719 for latitude " + latitude;
            }

            var firstLetterOffset  = offset / LETTER_ARRAY.length;
            var secondLetterOffset = offset % LETTER_ARRAY.length;

            if( firstLetterOffset < 0 || firstLetterOffset >= LETTER_ARRAY.length ) {
                throw "Cannot compute band (letter code) for latitude " + latitude;
            }


            return  LETTER_ARRAY.substring(firstLetterOffset,  firstLetterOffset  + 1) +
                    LETTER_ARRAY.substring(secondLetterOffset, secondLetterOffset + 1);

        }
        function getQuadrant(latitude, longitude) {
            if( !latitude || !longitude) {
                return null;
            }

            // get 15-minute quadrant indices

            var latBand =
                    (Math.floor( (latitude+90.0)*4.0) % 2.0);
            var longBand =
                    (Math.floor( (longitude+180.0)*4.0) % 2.0);

            if( latBand < 0 || latBand > 1 ) {
                throw "Cannot compute quadrant for latitude " + latitude;
            }
            if( longBand < 0 || longBand > 1 ) {
                throw "Cannot compute quadrant for longitude " + longitude;
            }

            // quadrants 12
            // and       34
            // subdivide a 30-minute area

            if( latBand == 0 && longBand == 0 ) {
                return "3";
            }
            else if ( latBand ==1 && longBand == 0 ) {
                return "1";
            }
            else if ( latBand ==1 && longBand == 1 ) {
                return "2";
            }
            else if ( latBand ==0 && longBand == 1 ) {
                return "4";
            }
            return "";

        }

        function getKeypad(latitude, longitude) {
            if( !latitude || !longitude) {
                return null;
            }

            // 5-minute quadrant indices

            var latBand =
                    (Math.floor( (latitude+90.0)*12.0) % 12.0);

            latBand = latBand % 3;

            var longBand =
                    (Math.floor( (longitude+180.0)*12.0) % 12.0);

            longBand = longBand % 3;

            if( latBand < 0 || latBand > 2 ) {
                throw "Cannot compute keypad for latitude " + latitude;
            }
            if( longBand < 0 || longBand > 2 ) {
                throw "Cannot compute keypad for longitude " + longitude;
            }

            switch(latBand) {
                case 0:
                    return "789".substring(longBand, longBand+1);

                case 1:
                    return "456".substring(longBand, longBand+1);

                case 2:
                    return "123".substring(longBand, longBand+1);

                default:
                    return null;

            }
        }

        try {
            var latitude  = that.y;
            var longitude = that.x;

            var longBand  = getLongitudeBand(longitude);
            var latBand   = getLatitudeBand(latitude);
            var quadrant  = getQuadrant(latitude, longitude);
            var keypad    = getKeypad(latitude, longitude);

            that.x = "" + longBand + latBand + quadrant + keypad;
            that.y = "";
        }
        catch(ex) {
            throw("Error computing GARS from lat-long: " + ex);
        }
    }

    function determineCAPClassicFromLatLong() {
        function gridSectionGivenLatLong(latitude, longitude) {
            if( latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
                return null;
            }
            var i;
            var sections = MARCONI.map.getCAPClassicGridSections();
            
            for( i = 0 ; i < sections.length ; i++ ) {

                if( sections[i].north >= latitude  && sections[i].south <= latitude && 
                    sections[i].west  <= longitude && sections[i].east  >= longitude ) {

                    //MARCONI.stdlib.log("latlong within section " + sections[i].code );
            
                    return sections[i];
                }
            }
            return null;
        }
        
        try {
            
            var gridSection = gridSectionGivenLatLong(that.y, that.x);
            if( !gridSection ) {
                that.x="";
                that.y="";
                return;
            }

            var cellWidthMinutes  = gridSection.widthMinutes  || 15;
            var cellHeightMinutes = gridSection.heightMinutes || 15;
            
            var cellsPerDegLong = 60/cellWidthMinutes;
            var cellsPerDegLat  = 60/cellHeightMinutes;

            var cellsPerRow = cellsPerDegLong * Math.round(gridSection.east - gridSection.west);

            // compute cell indices, where cells are numbered in rows starting at upper left of grid section
            var cellX =  Math.floor( ( that.x - gridSection.west ) * cellsPerDegLong);
            var cellY =  Math.floor( ( gridSection.north- that.y ) * cellsPerDegLat);
            
            var cellOrdinal = cellY * cellsPerRow + cellX + 1;

            var cellLowerRightLat  = gridSection.north - (1+cellY)/cellsPerDegLat;
            var cellLowerRightLong = gridSection.west  + (1+cellX)/cellsPerDegLong;

            

            // compute minutes, relative to corner of cell 
            var minutesLong = 60*Math.abs( that.x - cellLowerRightLong );
            var minutesLat  = 60*Math.abs( that.y - cellLowerRightLat );

            // 
            var letter = minutesLong < (30 / cellsPerDegLong) ? 
                ( minutesLat < (30 / cellsPerDegLat) ? "D" : "B") :
                ( minutesLat < (30 / cellsPerDegLat) ? "C" : "A") ;

            that.x = gridSection.code + " " + cellOrdinal + letter; 
            that.y = "";
            
            // MARCONI.stdlib.log("CAP grid value is " + that.x);
        
        }
        catch(ex) {
            throw "Error converting lat-long to CAP classic grid value, error: " + ex;
        }
        
    }
    
    function determineCAPCellFromLatLong() {
        try {
            var longitude = that.x;
            var latitude  = that.y;
            
            // cell is just the whole degree of lat-long enclosing the point, i.e. lower left of cell
            var wholeLat  = Math.floor(latitude);
            var wholeLong = Math.floor(longitude);
            
            // get offsets from lower-left corner of cell
            latitude  -= wholeLat;
            longitude -= wholeLong;
            
            
            var degreesPerQuad = .5;
            var letters=[];
            
            for( var i=0 ; i < 3 ; i++) {
                var letter = latitude > degreesPerQuad ? 
                    (longitude < degreesPerQuad ? "A" : "B") :
                    (longitude < degreesPerQuad ? "C" : "D");
                
                letters.push(letter);

                longitude = longitude % degreesPerQuad;
                latitude  = latitude % degreesPerQuad;
                
                degreesPerQuad = degreesPerQuad/2;
            }
            
            var gridValue = "" + MARCONI.stdlib.fixedFormatNumber(
                Math.abs(wholeLat),2,0,true) + 
                MARCONI.stdlib.fixedFormatNumber(Math.abs(wholeLong+1.0),3,0,true) + letters.join("");
            
            //MARCONI.stdlib.log(gridValue +" from lat,long of " + that.y + ", " + that.x);
            
            that.x = gridValue
            that.y = "";
        }
        catch(ex) {
            throw "Error converting lat-long to CAP cell grid value, error: " + ex;
        }
    }
    
    function determineUTMFromLatLong(spatialRef, hemiSphereOnly) {
        // from lat-long, compute UTM zone, x and y, package all three as a grid reference
        // in the form zoneNumberAndLetter x y (space-delimited) where the zoneNumberAndLetter
        // is either the word North or South (if hemiSphereOnly is true), or else a UTM zone letter
        try {
            if( !spatialRef ) {
                throw "Must provide spatial reference to convert from lat-long to UTM, since conversion depends on datum";
            }
            if( that.y > 84 || that.y < -80 ) {
                throw "Latitude " + that.y + " out of UTM bounds (-80 to +84)";
            }
            
            var latitude  = that.y;
            var longitude = that.x;

            var utmZoneNumber = MARCONI.map.getUTMZoneFromLatLong(latitude, longitude);

            // zone letter designation could be either a MGRS letter or North-South; if the latter, we spell out to avoid confusion
            var zoneLetter    = hemiSphereOnly ? (latitude > 0 ? 'North' : 'South') : getZoneLetter(latitude, longitude);

            var originLongitude = (utmZoneNumber-1)*6-180+3;  // center of 6-degree band
            var originLatitude = 0;
            var originX=500000;                           // standard UTM easting
            var originY= ( latitude < 0 ? 10000000 : 0);  // equator is 10M for southern hemisphere, else zero
            var centralScaleFactor=0.9996;
            
            //MARCONI.stdlib.log("Getting UTM from lat-long, latitude is " + latitude + ", originY is " + originY);

            TM_LatLongToCartesian(
                spatialRef.equitorialAxisMeters,
                spatialRef.eSquared,
                originLatitude, originLongitude,
                originX, originY, centralScaleFactor);

            var x = that.x;
            var y = that.y;


            that.x =  utmZoneNumber + zoneLetter + " " + MARCONI.stdlib.fixedFormatNumber(x, 1, 1, true) + " " + MARCONI.stdlib.fixedFormatNumber(y, 1, 1, true);
            that.y = "";

            //MARCONI.stdlib.log("UTM value is " + that.x);

            return that.x;
        }
        catch(ex) {
            throw("Error computing UTM from lat-long: " + ex);
        }
    }

    function determineUSNGFromLatLong(useMGRSformat, precision) {
        try {
            var latitude  = that.y;
            var longitude = that.x;

            var utmZoneNumber = MARCONI.map.getUTMZoneFromLatLong(latitude, longitude);
            var zoneLetter    = getZoneLetter(latitude, longitude);

            var isUPS = "ABYZ".indexOf(zoneLetter) >= 0;

            var originX, originY, centralScaleFactor;

            if( isUPS ) {
                originX = 2000000;
                originY = 2000000;
                centralScaleFactor=0.994;

                Polar_LatLongToCartesian(
                    MARCONI.map.RADIUS_GRS80_METERS,
                    MARCONI.map.eSquared_GRS80,
                    originX,
                    originY,
                    centralScaleFactor);
                    
                that.x =  getUSNGgridDesignationUPS( that.x, that.y, zoneLetter, useMGRSformat, precision);

                that.y = "";

            }
            else {
                var originLongitude = (utmZoneNumber-1)*6-180+3;  // center of 6-degree band
                var originLatitude = 0;
                originX=500000;  // standard UTM easting
                originY= ( zoneLetter < 'N' ? 10000000 : 0);  // equator is 10M for southern hemisphere, else zero
                centralScaleFactor=0.9996;

                TM_LatLongToCartesian(
                    MARCONI.map.RADIUS_GRS80_METERS,
                    MARCONI.map.eSquared_GRS80,
                    originLatitude, originLongitude,
                    originX, originY, centralScaleFactor);

                var x = that.x;
                var y = that.y;

                
                that.x =  getUSNGgridDesignationUTM( x, y, utmZoneNumber, zoneLetter, useMGRSformat, precision);

                that.y = "";
            }

            //MARCONI.stdlib.log("got " + that.x + (isUPS ? ", polar, " : ", ") );
            return that.x;
        }
        catch(ex) {
            throw("Error computing USNG from lat-long: " + ex);
        }
    }
    
    function parseGridNumber(gridValue) {
        try {
            
            var scaler = 5 - gridValue.length;

            var val = (gridValue ? parseFloat(gridValue) : 0.0) + 0.5;  // the 0.5 adds to the least significant digit, centers value in square whatever size it may be

            val = val * Math.pow(10, scaler);   // scaler is often zero which leaves val unadjusted
            
            return val;
        }
        catch(ex) {
            throw "Error parsing grid number " + gridValue + ": " + ex;
        }
    }
    
    function formatGridNumber(num, precision) {
        precision = ( precision ? precision : 5);  // precision for USNG is number of digits with 5 being meter resolution.  4 is 10-meter, 6 is 0.1 meter

        var str;

        // throughout we use floor not round, part of MRGS/USNG spec...

        if( precision == 5 ) {
            str = MARCONI.stdlib.padLeft(Math.floor(num),precision);
        }
        else {
            num = Math.floor(num*Math.pow(10,5-precision))/Math.pow(10,5-precision);

            if( precision < 5 ) {
                str = "" + num;
                str = str.substr(0, precision);
            }
            else {
                str = MARCONI.stdlib.fixedFormatNumber(num, 1, precision-5);
            }
        }

        //MARCONI.stdlib.log("Returning " + str + " for " + num);
        
        return str;
    }

    function getUSNGgridDesignationUPS(x, y, zoneLetter, useMGRSformat, precision) {
        var hemiSphere = zoneLetter=="A" || zoneLetter=="B" ? "S" : "N";

        var xLetters = hemiSphere== "N" ? "RSTUXYZABCFGHJ" : "KLPQRSTUXYZABCFGHJKLPQ";
        var yLetters = hemiSphere== "N" ? "ABCDEFGHJKLMNP" : "BCDEFGHJKLMNPQRSTUVWXY";
        var gridCellSizeMeters=100000;
        var originX = 2000000;
        var originY = originX;

        var cellX = Math.floor( (x-originX) / gridCellSizeMeters);
        var cellY = Math.floor( (y-originY) / gridCellSizeMeters);


        x = x % gridCellSizeMeters;
        y = y % gridCellSizeMeters;

        var xLetter = xLetters.charAt(cellX + xLetters.indexOf("A"));
        var yLetter = yLetters.charAt(cellY + yLetters.indexOf(hemiSphere=="N" ? "H" : "N"));

        if( useMGRSformat ) {  // rigid format with no delimiters, fixed precision
            return zoneLetter + xLetter + yLetter + MARCONI.stdlib.padLeft(Math.round(x),5) + MARCONI.stdlib.padLeft(Math.round(y),5);
        }
        else {  // usng, which has adjustable precision and is space-delimited

            var xStr = formatGridNumber(x, precision);
            
            var yStr = formatGridNumber(y, precision);

            return zoneLetter + " " + xLetter + yLetter + " " + xStr + " " + yStr;
        }


    }
    function getUSNGgridDesignationUTM(x, y, utmZoneNumber, zoneLetter, useMGRSformat, precision) {
        // x and y are passed in as UTM coordinates
        // their USNG values will be based on the UTM values, but
        // smaller since they will be the leftover part that is not represented
        // by the 100-km grid squares indicated by two-letter codes

        
        if( typeof(useMGRSformat) == "undefined") {
            useMGRSformat = false;
        }

        // cellX is count of cells in horiz direction.  Note that the leftmost cell is at coord value 100000, not zero
        // so we have to subtract one from what would otherwise be cellX, to account for this 100000 offset
        var gridCellSizeMeters=100000;

        var cellX = Math.floor(x/gridCellSizeMeters)-1;
        var cellY = Math.floor(y/gridCellSizeMeters);

        x = x % gridCellSizeMeters;
        y = y % gridCellSizeMeters;

        
        
        var cellXrepeatCycle=8;    // first letter repeated every 8 chars within a zone
        var cellYrepeatCycle=20;   // second letter repeated every 20 chars

        cellX = cellX % cellXrepeatCycle;
        cellY = cellY % cellYrepeatCycle;

        var zoneSet = MARCONI.map.getUSNGZoneSet(utmZoneNumber);
        //MARCONI.stdlib.log("zone set is " + zoneSet + ", cellX is " + cellX + ", cellY is " + cellY);

        var yLetter;

        if( zoneSet % 2 !== 0 ) {
            yLetter = "ABCDEFGHJKLMNPQRSTUV".charAt(cellY);
        }
        else {
            yLetter = "FGHJKLMNPQRSTUVABCDE".charAt(cellY);
        }


        var xLetter;
        if( zoneSet == 1 || zoneSet == 4 ) {
            xLetter = "ABCDEFGH".charAt(cellX);
        }
        else if( zoneSet == 2 || zoneSet == 5 ) {
            xLetter = "JKLMNPQR".charAt(cellX);
        }
        else {
            xLetter = "STUVWXYZ".charAt(cellX);
        }

        if( useMGRSformat ) {  // rigid format with no delimiters, fixed precision
            return utmZoneNumber + zoneLetter + xLetter + yLetter + MARCONI.stdlib.padLeft(Math.floor(x),5) + MARCONI.stdlib.padLeft(Math.floor(y),5);
        }
        else {  // usng, which has adjustable precision and is space-delimited
            
            var xStr = formatGridNumber(x, precision);
            
            var yStr = formatGridNumber(y, precision);
            
            return utmZoneNumber + zoneLetter + " " + xLetter + yLetter + " " + xStr + " " + yStr;
        }
    }
    
    function getZoneLetter(latitude, longitude) {
        try {
            var letter;

            if( latitude >= -80 && latitude <= 84 ) {
                var utmZoneLetters="CDEFGHJKLMNPQRSTUVWX";

                // handle exception which is that zone X extends an extra 4 degrees beyond latitude 80, and is hence 12 degrees high not 8 like the other zones
                var offset = latitude >= 80 ? utmZoneLetters.length-1 : Math.floor((latitude+80)/8);

                letter = utmZoneLetters.charAt(offset);
            }
            else {     // UPS, applies near south and north poles, i.e., less than -80 or greater than 84 latitude

                if( longitude === undefined || longitude === null) {
                    throw "Longitude must be supplied to get zone letter in polar regions";
                }

                if( latitude < -80 ) {
                    letter = longitude <=0 ? "A" : "B";
                }
                else {
                    letter = longitude <=0 ? "Y" : "Z";
                }

            }

            return letter;

        }
        catch(ex) {
            throw("getZoneLetter(): cannot get zone letter from latitude " + latitude + ": " + ex);
        }
    }

    function determineLatLongFromCAPCell( mapGridValue ) {
        
        try {
            var parts = parseCAPCell( mapGridValue );
            
            if(!parts) {
                throw mapGridValue + " is not a valid CAP gridvalue";
            }
            
            // basic lat-long is in center of one-degree square
            var degreesPerQuad = .5;
            var latitude    =    parseFloat(parts[0]) + degreesPerQuad;
            var longitude   = -1*parseFloat(parts[1]) - degreesPerQuad;   
            
            var letters = parts[2];   // e.g. ABD, all letters optional

            var deltaX=0, deltaY=0;
            
            
            for( var i=0 ; i < letters.length ; i++) {
                var letter = letters.substr(i,1);
                
                deltaX = letter=="A" || letter=="C" ? -.5 : .5;
                deltaY = letter=="C" || letter=="D" ? -.5 : .5;
                
                longitude += deltaX*degreesPerQuad;
                latitude  += deltaY*degreesPerQuad;
                
                degreesPerQuad = 0.5 * degreesPerQuad;
            }
        
            that.x = longitude;
            that.y = latitude;
        }
        catch(ex) {
            throw "Error converting CAP cell-style gridvalue " + mapGridValue + " to lat-long: " + ex;
        }
    }
    
    function determineLatLongFromCAPClassic( mapGridValue ) {
        function gridSectionGivenCode(code) {
            var sections = MARCONI.map.getCAPClassicGridSections();
            if( sections ) {
                for( var i = 0 ; i < sections.length ; i++ ) {

                    if( sections[i].code == code ) {

                        return sections[i];
                    }
                }    
            }
            
            return null;
        }
        
        try {
            var parts = parseCAPClassic( mapGridValue );
            
            if(!parts) {
                throw mapGridValue + " is not a valid CAP gridvalue";
            }
            
            var code = parts[0]; // e.g. "SFO"
            var gridSection = gridSectionGivenCode(code);
            var cellOrdinal = parts[1];   // e.g. 323
            var cellLetters = parts[2];   // e.g. A
            
            var cellWidthMinutes  = gridSection.widthMinutes  || 15;
            var cellHeightMinutes = gridSection.heightMinutes || 15;
            
            var cellsPerDegLong = gridSection.code.substr(0,4) == "ALA_" ?  1 : 4;
            var cellsPerDegLat  = gridSection.code.substr(0,4) == "ALA_" ?  2 : 4;

            var cellsPerRow = cellsPerDegLong * Math.round(gridSection.east - gridSection.west);
        
            // compute cell indices, where cells are numbered in rows starting at upper left of grid section
            var cellX = (cellOrdinal-1) % cellsPerRow;
            var cellY = Math.floor( (cellOrdinal-1) / cellsPerRow);

            var latitude  = gridSection.north - (1+cellY) / cellsPerDegLat;
            var longitude = gridSection.west + (1+cellX)  / cellsPerDegLong;

            var deltaX=0, deltaY=0;
            var degreesPerQuadLong = 1/cellsPerDegLong/2;
            var degreesPerQuadLat  = 1/cellsPerDegLat/2;

            for( var i = 0 ; i < cellLetters.length ; i++) {
                var letter = cellLetters.substr(i,1);
                switch(letter) {
                    case "A":
                        deltaX += 1.5 * degreesPerQuadLong;
                        deltaY += 1.5 * degreesPerQuadLat;
                        break;

                    case "B":
                        deltaX += 0.5 * degreesPerQuadLong;
                        deltaY += 1.5 * degreesPerQuadLat;
                        break;

                    case "C":
                        deltaX += 1.5 * degreesPerQuadLong;
                        deltaY += 0.5 * degreesPerQuadLat;
                        break;

                    case "D":
                        deltaX += 0.5 * degreesPerQuadLong;
                        deltaY += 0.5 * degreesPerQuadLat;
                        break;

                    default:
                        throw "Unrecognized grid letter " + letter;

                }
            }
        
            latitude  += deltaY;
            longitude -= deltaX;

            that.x = longitude;
            that.y = latitude;
        }
        catch(ex) {
            throw "Error converting CAP gridvalue " + mapGridValue + " to lat-long: " + ex;
        }
    }
    
    function parseCAPClassic( mapGridValue ) {
        try {
            
            if( typeof(mapGridValue) !== "string" || mapGridValue.length === 0 ) {
                return null;
            }
            // from one to seven letters (underscore ok), optional whitespace, one to three digits, optional whitespace, optional single letter
            var REGEX_CONV = "^([a-z,_]{1,7})[\\s]*([0-9]{1,3})[\\s]*([a-z]?)$";

            var p = new RegExp(REGEX_CONV, "i");
            var m = p.exec(mapGridValue);

            //MARCONI.stdlib.log("Grid " + mapGridValue + (m ? " is valid CAP conventional gridvalue" : " is not valid CAP conventional gridvalue"));

            if( !m ) {
                return null;
            }

            var parts=[];
            parts.push(m[1].toUpperCase());                 // letters, e.g. SFO
            parts.push(m[2]);                               // cell number 1..n 
            parts.push(m[3].toUpperCase());                 // optional letter indicating quad within the cell

            return parts;
        }
        catch(ex) {
            throw "Error parsing " + mapGridValue + " as a CAP gridvalue, error is " + ex;
        }
    }
    
    function parseCAPCell( mapGridValue ) {
        if( typeof(mapGridValue) !== "string" || mapGridValue.length === 0 ) {
            return null;
        }
        // two digits of latitude, three of longitude, optional whitespace, one to three letters for further quartering of the gridcell
        var REGEX_CELL = "^([\\d]{2})([\\d]{3})[\\s]*([a-z]{0,3})$"

        var p = new RegExp(REGEX_CELL, "i");
        var m = p.exec(mapGridValue);

        // MARCONI.stdlib.log("Grid " + mapGridValue + (m ? " is valid CAP cell-style gridvalue" : " is not valid CAP cell-style gridvalue"));

        if( !m ) {
            return null;
        }

        var parts=[];
        parts.push(m[1]);                 // latitude
        parts.push(m[2].toUpperCase());   // longitude
        parts.push(m[3].toUpperCase());   // zero to three letters
       
        return parts;
    }
    
    function determineLatLongFromGARS(mapGridValue) {
        try {
            var latitude = 0.0;
            var longitude = 0.0;
            var FIVE_MINUTES = 1.0/12.0;

            if( !mapGridValue ) {
                return;
            }

            if( mapGridValue.length < 5 ) {
                throw "GARS code must be at least five characters";
            }
            
            var LETTER_ARRAY = "ABCDEFGHJKLMNPQRSTUVWXYZ";  // no I or O
            var longitudeString  = mapGridValue.substring(0,3);  // three-digit number to indicate which 30-second longitude zone
            var latitudeString   = mapGridValue.substring(3,5).toUpperCase();  // e.g. CZ

            longitude = (parseFloat(longitudeString)-1.0)/2.0 - 180.0;  // minus 180 since raw value is at 180W

            latitude =
                (
                    LETTER_ARRAY.indexOf(latitudeString.substring(0, 1)) * LETTER_ARRAY.length
                +
                    LETTER_ARRAY.indexOf(latitudeString.substring(1))
                ) * 0.5 - 90.0;  // minus 90 to set zero at equator not south pole

            // if long form given
            // accept quad and keypad with or without a space separating them
            if( mapGridValue.length >= 7 ) {
                var quadIndex=0;
                var keypadIndex=0;

                try {
                    var quadString;
                    var keypadString;

                    if( mapGridValue.indexOf(" ", 5) < 0 ) {
                        quadString = mapGridValue.substring(5,6);
                        keypadString = mapGridValue.substring(6);
                    }
                    else {
                        var parts = mapGridValue.substring(5).split(" ");
                        quadString   = parts[0];
                        keypadString = parts[1];
                    }

                    quadIndex   = parseInt(quadString,10);
                    keypadIndex = parseInt(keypadString,10);
                }
                catch( badNumber) {
                    throw "Error parsing quadrant and keypad as single-digit integers: " + badNumber;
                }

                if( quadIndex == 1 || quadIndex ==2) {
                    latitude += 0.25;
                }
                if( quadIndex==2 || quadIndex==4) {
                    longitude += 0.25;
                }

                // visualize keypad like a phone pad

                if( keypadIndex % 3 == 0 ) {
                    longitude += 2.0*FIVE_MINUTES;
                }
                else if(keypadIndex % 3 == 2) {
                    longitude += FIVE_MINUTES;
                }

                if( keypadIndex < 4 ) {
                    latitude += 2.0 * FIVE_MINUTES;
                }
                else if(keypadIndex < 7) {
                    latitude += FIVE_MINUTES;
                }

                // finally, center lat-long in the keypad cell by adding 2.5 minutes
                longitude += FIVE_MINUTES*0.5;
                latitude  += FIVE_MINUTES*0.5;

            }
            else {
                // short-form GARS coords given, return lat-long centered in the given 30-minute square
                latitude  += 0.25;
                longitude += 0.25;
            }

            that.x=longitude;
            that.y=latitude;
        }
        catch(ex) {
            throw "Error " + ex.toString() + " attempting to convert GARS value " + mapGridValue + " to lat-long";
        }
    }

    function determineLatLongFromOSGB(spatialRef, mapGridValue) {
        function parseOSGB( mapGridValue ) {
            try {
                if( typeof(mapGridValue) !== "string" || mapGridValue.length === 0 ) {
                    return null;
                }
                
                // zero, one or two letters, optional whitespace, optional digits, optional whitespace or comma, optional digits
                var REGEX = "^([a-z]{0,2})[\\s]*([0-9]*)[\\s,]*([0-9]*)$";

                var p = new RegExp(REGEX, "i");
                var m = p.exec(mapGridValue);

                // MARCONI.stdlib.log("Grid " + mapGridValue + (m ? " is valid OSGB gridvalue" : " is not a valid OSGB gridvalue"));

                if( !m ) {
                    return null;
                }

                var letters = m[1].toUpperCase();                 // e.g. SV, could also be an empty string
                
                var easting  = m[2];
                
                var northing = m[3];
                
                if( letters && !northing.length && easting !== "" && easting.length ) {
                
                    if( easting.length % 2 !== 0 ) {
                        return null;
                    }
                    
                    // MARCONI.stdlib.log("Chopping single numeric string ", easting, " into easting and northing");
                    
                    northing = easting.substr(easting.length/2);
                    easting  = easting.substr(0, easting.length/2);

                }
                
                
                var parsed = {
                    letters: letters, 
                    x: easting===""  ? 0 : parseInt(easting,10), 
                    y: northing==="" ? 0 : parseInt(northing,10), 
                    precision: letters.length ? easting.length : 5};
                
                // MARCONI.stdlib.log("Grid ", mapGridValue, " parses as ", parsed);
                
                
                return parsed;
            }
            catch(ex) {
                throw "Error parsing " + mapGridValue + " as OSGB gridvalue, error is " + ex;
            }
        }
        
        function OSGBOffsetGivenLetters(gridLetters) {
            var letters = "ABCDEFGHJKLMNOPQRSTUVWXYZ";
            var x=0, y=0;
            
            for( var i = 0 ; i < gridLetters.length ; i++) {
                var letter = gridLetters.substr(i,1);
                var index = letters.indexOf(letter);
                if( index < 0 ) {
                    throw "Letter " + letter + " is not a valid OSGB grid letter";
                }
                var cellSize = i==0 ? 500000 : 100000;
                
                var xIndex = index%5;
                var yIndex = 4-Math.floor(index/5);

                // MARCONI.stdlib.log("Letter " + letter + " is at position xy=", xIndex, ", ", yIndex, " measured from lower left");

                x += xIndex * cellSize;
                y += yIndex * cellSize;
            }
            
            if( gridLetters ) {
                // if letters used, adjust the offset in the 500k direction to account for the 5x5 grid's origin being offset from the coord sys origin 
                // such that large square S has Transverse Mercator coordinates 0,0 rather than square V which is the lower left of the 5x5 set of squares
                // ABCDE
                // FGHJK
                // LMNOP
                // QRSTU   note that S is two over, one uop from the lower left
                // VWXYZ

                x -= 500000*2;
                y -= 500000;
            }
            return {x: x, y:y};  // note that an empty string results in a zero offset
        }
        try {
            if( !mapGridValue ) {
                return;
            }

            var parsed = parseOSGB(mapGridValue);
            
            if( !parsed ) {
                throw "Gridvalue " + mapGridValue + " is not a valid OSGB grid value";
            }
            
            var offSet = OSGBOffsetGivenLetters(parsed.letters);
            
            parsed.x = parsed.x * Math.pow(10, 5-parsed.precision );
            
            parsed.y = parsed.y * Math.pow(10, 5-parsed.precision );

            // add offsets such that we center point in the square, if precision is less than a meter
            if( parsed.precision < 5 ) {
                // MARCONI.stdlib.log("Adjusting for low-precision x and y given as ", parsed.x, "," , parsed.y);

                parsed.x += 0.5 * Math.pow(10, 5 - parsed.precision);
                parsed.y += 0.5 * Math.pow(10, 5 - parsed.precision);
            }
            
            // MARCONI.stdlib.log("Adjusted x and y are ", parsed.x, "," , parsed.y);
            
            var x = parsed.x + offSet.x;
            var y = parsed.y + offSet.y;
            
            // MARCONI.stdlib.log("Final x,y values are ", x, y );
            
            var eSquared = spatialRef.eSquared || (spatialRef.eccentricity * spatialRef.eccentricity);

            that.x = x;
            that.y = y;
            
            TM_CartesianToLatLong(
                spatialRef.equitorialAxisMeters,
                eSquared,
                spatialRef.originLatitude,
                spatialRef.originLongitude,
                spatialRef.originX,
                spatialRef.originY,
                spatialRef.centralScaleFactor);
            
        }
        catch(ex) {
            throw "Error " + ex + " attempting to convert OSGB value " + mapGridValue + " to lat-long";
        }
    }

    function determineLatLongFromIrishGrid(spatialRef, mapGridValue) {
        function parseIrish( mapGridValue ) {
            try {
                if( typeof(mapGridValue) !== "string" || mapGridValue.length === 0 ) {
                    return null;
                }
                
                // zero or one letters, optional whitespace, optional digits, optional whitespace or commas, optional digits
                var REGEX = "^([a-z]{0,1})[\\s]*([0-9]*)[\\s,]*([0-9]*)$";

                var p = new RegExp(REGEX, "i");
                var m = p.exec(mapGridValue);

                // MARCONI.stdlib.log("Grid " + mapGridValue + (m ? " is valid Irish gridvalue" : " is not a valid Irish gridvalue"));

                if( !m ) {
                    return null;
                }

                var letter = m[1].toUpperCase();                 // e.g. S
                
                var easting  = m[2];
                
                var northing = m[3];
                
                if( letter && (!northing.length) && easting !== "" && easting.length ) {
                
                    if( easting.length % 2 !== 0 ) {
                        return null;
                    }
                    
                    // MARCONI.stdlib.log("Chopping single numeric string ", easting, " into easting and northing");
                    
                    northing = easting.substr(easting.length/2);
                    easting  = easting.substr(0, easting.length/2);

                }
                
                var parsed = {
                    letter: letter, 
                    x: easting===""  ? 0 : parseInt(easting,10), 
                    y: northing==="" ? 0 : parseInt(northing,10), 
                    precision: letter.length ? easting.length : 5};
                
                // MARCONI.stdlib.log("Grid ", mapGridValue, " parses as ", parsed);
                
                
                return parsed;
            }
            catch(ex) {
                throw "Error parsing " + mapGridValue + " as Irish gridvalue, error is " + ex;
            }
        }
        
        function IrishGridOffsetGivenLetter(gridLetter) {
            if(!gridLetter) {
                return {x:0, y:0};
            }
            
            var letters = "ABCDEFGHJKLMNOPQRSTUVWXYZ";
            var index = letters.indexOf(gridLetter);
            
            if( index < 0 ) {
                throw "Letter " + gridLetter + " is not a valid Irish grid letter";
            }
            var CELL_SIZE = 100000;
                
            var xIndex = index%5;
            var yIndex = 4-Math.floor(index/5);

            var x = xIndex * CELL_SIZE;
            var y = yIndex * CELL_SIZE;
            
            return {x: x, y:y};
        }
        try {
            if( !mapGridValue ) {
                return;
            }

            var parsed = parseIrish(mapGridValue);
            
            // MARCONI.stdlib.log(parsed);
            
            if( !parsed ) {
                throw "Gridvalue " + mapGridValue + " is not a valid Irish grid value";
            }
            
            var offSet = IrishGridOffsetGivenLetter(parsed.letter);
            
            // MARCONI.stdlib.log(parsed, " gives offset of ", offSet);
            
            // MARCONI.stdlib.log("With correction, offset for ", parsed.letters, " is ", offSet);

            parsed.x = parsed.x * Math.pow(10, 5-parsed.precision );
            parsed.y = parsed.y * Math.pow(10, 5-parsed.precision );

            // add offsets such that we center point in the square, if precision is less than a meter
            if( parsed.precision < 5 ) {
                // MARCONI.stdlib.log("Adjusting for low-precision x and y given as ", parsed.x, "," , parsed.y);

                parsed.x += 0.5 * Math.pow(10, 5 - parsed.precision);
                parsed.y += 0.5 * Math.pow(10, 5 - parsed.precision);
            }
            
            // MARCONI.stdlib.log("Adjusted x and y are ", parsed.x, "," , parsed.y);
            
            var x = parsed.x + offSet.x;
            var y = parsed.y + offSet.y;
            
            // MARCONI.stdlib.log("Final x,y, refvalues are ", x, y, spatialRef );
            
            var eSquared = spatialRef.eSquared || (spatialRef.eccentricity * spatialRef.eccentricity);

            that.x = x;
            that.y = y;
            
            TM_CartesianToLatLong(
                spatialRef.equitorialAxisMeters,
                eSquared,
                spatialRef.originLatitude,
                spatialRef.originLongitude,
                spatialRef.originX,
                spatialRef.originY,
                spatialRef.centralScaleFactor);
            
        }
        catch(ex) {
            throw "Error " + ex + " attempting to convert Irish grid value " + mapGridValue + " to lat-long";
        }
    }

    function determineLatLongFromUSNG(spatialRef, mapGridValue) {
        // regression test against http://gisdata.usgs.gov/XMLWebServices/USNG.asmx?op=Get_XY&AspxAutoDetectCookieSupport=1
        
        try {
            var parts = MARCONI.map.parseUSNGGridRef(mapGridValue);

            if(!parts) {
                throw mapGridValue + " is not a valid USNG value";
            }

            var utmZoneNumber = parts[0];
            var zoneLetter    = parts[1];
            var isUPS         = !parts[0];
            var letterCode    = parts[2];  // e.g. JK
            var gridX         = parts[3];
            var gridY         = parts[4];

            var firstLetter   = letterCode.substr(0,1);
            var secondLetter  = letterCode.substr(1,1);
            var cellIndexX, cellIndexY;
            
            if( isUPS ) {

                

                var hemiSphere = zoneLetter == "A" || zoneLetter == "B" ? "S" : "N";

                var xLetters = hemiSphere== "N" ? "RSTUXYZABCFGHJ" : "KLPQRSTUXYZABCFGHJKLPQ";
                var yLetters = hemiSphere== "N" ? "ABCDEFGHJKLMNP" : "BCDEFGHJKLMNPQRSTUVWXY";


                if( xLetters.indexOf(firstLetter) < 0 ) {
                    throw "Illegal grid letter " + firstLetter;
                }
                if( yLetters.indexOf(secondLetter) < 0 ) {
                    throw "Illegal grid letter " + secondLetter;
                }


                cellIndexX = xLetters.indexOf(firstLetter)   - xLetters.indexOf("A");

                cellIndexY = yLetters.indexOf(secondLetter)  - yLetters.indexOf(hemiSphere=="N" ? "H" : "N");

                spatialRef.originX = 2000000.0;
                spatialRef.originY = 2000000.0;
                spatialRef.centralScaleFactor= 0.994;

                var upsX =  100000 * cellIndexX + parseGridNumber(gridX) + 2000000.0;
                var upsY =  100000 * cellIndexY + parseGridNumber(gridY) + 2000000.0;

                that.x=upsX;
                that.y=upsY;

                Polar_CartesianToLatLong(
                    spatialRef.equitorialAxisMeters,
                    spatialRef.eSquared,
                    spatialRef.originX,
                    spatialRef.originY,
                    spatialRef.centralScaleFactor, hemiSphere);

            }
            else {
                if( zoneLetter.length != 1 || "CDEFGHJKLMNPQRSTUVWX".indexOf(zoneLetter) < 0 ) {
                    throw "Grid value " + mapGridValue + " is not a valid grid reference, UTM latitude bands run from C to X";
                }

                /*
                 *compare to USNG.cpp from Geotrans, from :
                 *http://earth-info.nga.mil/GandG/geotrans/geotrans3.1/docs/html/
                 * which tabulates "min northing" and "northing offsets" for each zone letter code in meters vs. millions in our arrays
                 * the min northings are approx the same, and of course the northing offsets are identical

                 const Latitude_Band Latitude_Band_Table[20] =
                   {{LETTER_C, 1100000.0, -72.0, -80.5,       0.0},
                    {LETTER_D, 2000000.0, -64.0, -72.0, 2000000.0},
                    {LETTER_E, 2800000.0, -56.0, -64.0, 2000000.0},
                    {LETTER_F, 3700000.0, -48.0, -56.0, 2000000.0},
                    {LETTER_G, 4600000.0, -40.0, -48.0, 4000000.0},
                    {LETTER_H, 5500000.0, -32.0, -40.0, 4000000.0},
                    {LETTER_J, 6400000.0, -24.0, -32.0, 6000000.0},
                    {LETTER_K, 7300000.0, -16.0, -24.0, 6000000.0},
                    {LETTER_L, 8200000.0, -8.0,  -16.0, 8000000.0},
                    {LETTER_M, 9100000.0,  0.0,   -8.0, 8000000.0},
                    {LETTER_N, 0.0,        8.0,    0.0,       0.0},
                    {LETTER_P, 800000.0,  16.0,    8.0,       0.0},
                    {LETTER_Q, 1700000.0, 24.0,   16.0,       0.0},
                    {LETTER_R, 2600000.0, 32.0,   24.0, 2000000.0},
                    {LETTER_S, 3500000.0, 40.0,   32.0, 2000000.0},
                    {LETTER_T, 4400000.0, 48.0,   40.0, 4000000.0},
                    {LETTER_U, 5300000.0, 56.0,   48.0, 4000000.0},
                    {LETTER_V, 6200000.0, 64.0,   56.0, 6000000.0},
                    {LETTER_W, 7000000.0, 72.0,   64.0, 6000000.0},
                    {LETTER_X, 7900000.0, 84.5,   72.0, 6000000.0}};

                */

                // for each latitude band from C to X inclusive, min Y value in the band, used to check and adjust computed Y's since letter codes repeat
                // these are approx, from FGDC diagrams
                var latitudeBandMinYarray    = [1.1, 2, 2.9,3.8,4.7,5.6,6.5,7.3,8.2,9.1,0,0.8,1.7,2.6,3.5,4.4,5.3,6.2,7,7.9];

                // for each latitude band from C to X inclusive, Y value of the lower corner of the lowest 100,000 meter square in millions of meters
                // These values are used as offsets, essentially describing the northing of the lowest letter value (A or F) in the latitude band
                var latitudeBandYOriginarray = [  0, 2,   2,  2,  4,  4,  6,  6,  8,  8, 0, 0,  0,  2,  2,  4,  4,  6, 6, 6];


                
                // compute cell index (# of 100,000-foot increments within latitude band), accounting for even-numbered utm zones running A-V and odd-numbered zones running F-E
                if( utmZoneNumber % 2 ) {
                    cellIndexY = "ABCDEFGHJKLMNPQRSTRUV".indexOf(secondLetter);
                }
                else {
                    cellIndexY = "FGHJKLMNPQRSTUVABCDE".indexOf(secondLetter);
                }

                var latitudeBandIndex = "CDEFGHJKLMNPQRSTUVWX".indexOf(zoneLetter);  // e.g. index = 14 for S, for UTM zone 10S in Bay Area

                // look up the min Y for the latitude band we're in
                var latitudeBandMinY = latitudeBandMinYarray[latitudeBandIndex];   // e.g., 0 for zone 10S


                //MARCONI.stdlib.log("cellIndexY is " + cellIndexY +", latitudeBandIndex is " + latitudeBandIndex );


                var yMillions = latitudeBandYOriginarray[latitudeBandIndex] + cellIndexY/10;


                // letter series repeats every 2M meters, so ensure computed Y is at least equal to lowest Y in the zone, e.g. at least 0 for zone S
                if( yMillions < latitudeBandMinY ) {
                    yMillions += 2.0;
                }

                //MARCONI.stdlib.log("yMillions is " + yMillions);
                
                var utmY = yMillions * 1000000.0 + parseGridNumber(gridY);

                if( zoneLetter < 'N')  { // southern hemisphere values are 10,000,000 at equator
                    spatialRef.originY = 10000000.0;
                }
                else {
                    spatialRef.originY = 0.0;

                }
                // x is 100K times an offset for the first letter, plus the grid value either bare for a five-digit position, or 10x grid value for a 4-digit


                spatialRef.originX = 500000;

                cellIndexX = "ABCDEFGHJKLMNPQRSTUVWXYZ".indexOf(firstLetter);

                var approxX = 100000 * (1 + cellIndexX % 8);
                
                var utmX =  approxX + parseGridNumber(gridX);

                that.x=utmX;
                that.y=utmY;

                //MARCONI.stdlib.log("approx x is " + approxX + ", full x,y are " + utmX + ", " + utmY);

                // now call standard utm to lat-long function for
                // USNG-standard ellipsoid

                // set up standard UTM params for the relevant zone


                spatialRef.originLongitude = (utmZoneNumber-1)*6-180+3;
                spatialRef.originLatitude = 0;
                spatialRef.centralScaleFactor = 0.9996;

                if( isNaN( spatialRef.originLongitude) ) {
                    throw "origin of UTM zone could not be determined from zone " + utmZoneNumber;
                }

                TM_CartesianToLatLong(
                    spatialRef.equitorialAxisMeters,
                    spatialRef.eSquared,
                    spatialRef.originLatitude,
                    spatialRef.originLongitude,
                    spatialRef.originX,
                    spatialRef.originY,
                    spatialRef.centralScaleFactor);

            } // if UTM
        }
        catch(e) {
            throw("Error " + e + " attempting to convert USNG value " + mapGridValue + " to lat-long");
        }
    }

    function determineLatLongFromUTM(spatialRef, mapGridValue) {
        try {
            
            var parts = MARCONI.map.parseUTMGridRef(mapGridValue);

            if( !parts ) {
                throw mapGridValue + " is not a valid UTM grid reference. UTM grid refs take the form zza xxxx yyyy where zz is a zone number, a is a letter from C-X, North, or South, and xxxx and yyyy are x and y values in meters";
            }
            
            var utmZoneNumber   = parts[0];
            var zoneLetter      = parts[1].toUpperCase();
            var utmX            = parseFloat(parts[2].replace(/,/g, ""));    // strip commas
            var utmY            = parseFloat(parts[3].replace(/,/g, ""));    // strip commas

            var isNorthernHemisphere=true;

            if( zoneLetter.length > 1 ) {
                if( zoneLetter !== "NORTH" && zoneLetter !== "SOUTH") {
                    throw utmZoneNumber + zoneLetter + " is not a valid UTM zone designation.  Zone designation must be either a UTM letter code C-X, or the word North or South spelled out";
                }
                isNorthernHemisphere = zoneLetter.startsWith("N");  // if South, make letter M since M is south of equator
            }
            else {
                isNorthernHemisphere = zoneLetter >= 'N';
            }

            // false northing is zero in northern hemisphere, 10M in southern hemisphere (to avoid negative values)
            spatialRef.originY = ( isNorthernHemisphere ?  0.0 : 10000000.0);


            spatialRef.originX = 500000;  // standard UTM false easting

            that.x=utmX;
            that.y=utmY;

            // now call standard utm to lat-long function for
            // set up standard UTM params for the relevant zone

            spatialRef.originLongitude = (utmZoneNumber-1)*6-180+3;
            spatialRef.originLatitude = 0;
            spatialRef.centralScaleFactor = 0.9996;

            if( isNaN( spatialRef.originLongitude) ) {
                throw "origin of UTM zone could not be determined from zone " + utmZoneNumber;
            }

            TM_CartesianToLatLong(
                spatialRef.equitorialAxisMeters,
                spatialRef.eSquared,
                spatialRef.originLatitude,
                spatialRef.originLongitude,
                spatialRef.originX,
                spatialRef.originY,
                spatialRef.centralScaleFactor);

            if( isNaN( spatialRef.originLongitude) ) {
                throw "origin of UTM zone could not be determined from zone " + utmZoneNumber;
            }
        }
        catch(e) {
            throw("Error " + e + " attempting to convert UTM value " + mapGridValue + " to lat-long");
        }
    }

    function Albers_LatLongToCartesian(
        equitorialAxisMeters,
        eSquared,
        parallelOne,
        parallelTwo,
        originLatitude,
        originLongitude,
        originX,
        originY)
    {

        function Q(phi, e, eSquared) {
            var sinPhi = Math.sin(phi);

            return (1-eSquared)*Math.abs
                ( sinPhi / (1-eSquared * sinPhi*sinPhi)-(1/(2*e)) *
                Math.log((1-e*sinPhi)/(1+e*sinPhi)));

        }

        try {
            if( isNaN(that.x) || isNaN(that.y) ) {
                throw "Illegal lat-long " + that.y + ", " + that.x + ", must be numeric";
            }

            /*
            Given constants such as radius and eccentricity of the ellipsoid,
            convert given latitude and longitude coordinates to X and Y
            Important assumption:  projection is Albers equal-area conic
            system.
            Calcs are based on formulas given by Snyder in his book "Map Projections -- A Working Manual"
            */


            /*
             *MARCONI.stdlib.log("converting " + that.x + "," + that.y + " from long-lat to XY using radius " + equitorialAxisMeters +
                ", eSquared=" + eSquared + ", parallels of " + parallelOne + " and " + parallelTwo +
                ", origin in lat-long of " + originLatitude + ", " + originLongitude +
                ", origin in x-y of " + originX + ", " + originY);
            */

            // verify lat and long are legal
            if( Math.abs( that.y ) > 90 ) {
                throw ("Latitude of " + that.y + " is illegal, domain is +/- 90");
            }

            if( Math.abs( that.x ) > 180) {
                throw ("Longitude of " + that.x + " is illegal, domain is +/- 180");
            }

            // convert info given in degrees to radians
            parallelOne        = parallelOne      * MARCONI.map.DEGREES_TO_RADIANS;
            parallelTwo        = parallelTwo      * MARCONI.map.DEGREES_TO_RADIANS;
            originLatitude     = originLatitude   * MARCONI.map.DEGREES_TO_RADIANS;
            originLongitude    = originLongitude  * MARCONI.map.DEGREES_TO_RADIANS;

            var latitude  = that.y*MARCONI.map.DEGREES_TO_RADIANS;
            var longitude = that.x*MARCONI.map.DEGREES_TO_RADIANS;
            var e = Math.sqrt(eSquared);

            // yes, M is defined the same for Albers as for Lambert...
            var m1 = Lambert_M(parallelOne, eSquared);
            var m2 = Lambert_M(parallelTwo, eSquared);

            //MARCONI.stdlib.log("m1=" + m1 + ", m2=" + m2);
        
        
            var q0 = Q(originLatitude,  e, eSquared);
            var q1 = Q(parallelOne,     e, eSquared);
            var q2 = Q(parallelTwo,     e, eSquared);
            var q =  Q(latitude,        e, eSquared);

            //MARCONI.stdlib.log("q0=" + q0 + ", q1=" + q1 + ", q2=" + q2 + ", q=" + q);

            var n = (m1*m1 - m2*m2)/(q2-q1);

            var C = m1*m1 + n * q1;

            var rho = equitorialAxisMeters * Math.sqrt(C-n*q)/n;

            var rhoKnot = equitorialAxisMeters * Math.sqrt(C-n*q0)/n;

            var theta = n * (longitude - originLongitude);
        
            that.x = originX + rho * Math.sin(theta);

            that.y = originY + rhoKnot - rho * Math.cos(theta);
            
            return true;
        }
        catch(ex) {
            throw "Error converting from lat-long to Albers: " + ex;
        }
    }

    function Albers_CartesianToLatLong(
        equitorialAxis,
        eSquared,
        parallelOne,
        parallelTwo,
        originLatitude,
        originLongitude,
        originX,
        originY)
        {


        /*
        ' Given constants such as radius and eccentricity of the ellipsoid,
        ' convert given point in cartesian coordinates to lat and long
        ' Important assumption:  projection is Albers equal-area conic
        ' system.
        ' Calcs are based on formulas given by Snyder in his book "Map Projections -- A Working Manual"
        */

        // Q calc is same as for latlong-to-cartesian
        function Q(phi, e, eSquared) {
            var sinPhi = Math.sin(phi);

            return (1-eSquared)*
                ( sinPhi / (1-eSquared * sinPhi*sinPhi)-(1/(2*e)) *
                Math.log((1-e*sinPhi)/(1+e*sinPhi)));

        }

        try {
            if( isNaN(that.x) || isNaN(that.y) ) {
                throw "Illegal x,y of " + that.x + ", " + that.y + ", must be numeric";
            }
            
            //MARCONI.stdlib.log("Albers_CartesianToLatLong: converting " + that.x + "," + that.y + " to lat-long using radius" + equitorialAxisMeters +
            //", eSquared=" + eSquared + ", parallels of " + parallelOne + " and " + parallelTwo +
            //", origin in lat-long of " + originLatitude + ", " + originLongitude +
            //", origin in x-y of " + originX + ", " + originY);

            // convert info given in degrees to radians
            parallelOne        = parallelOne      * MARCONI.map.DEGREES_TO_RADIANS;
            parallelTwo        = parallelTwo      * MARCONI.map.DEGREES_TO_RADIANS;
            originLatitude     = originLatitude   * MARCONI.map.DEGREES_TO_RADIANS;
            originLongitude    = originLongitude  * MARCONI.map.DEGREES_TO_RADIANS;

            // alert("Lambert_CartesianToLatLong(): pt is " + that.x + ", " + that.y);

            // Convert coords to offsets from the origin
            var x = that.x - originX;
            var y = that.y - originY;


            // Calculate map constants
            // These formulas identical to those for converting
            // from lat-long to XY -- they just describe
            // map constants
            var e  = Math.sqrt(eSquared);

            //MARCONI.stdlib.log("parallelOne is " +  parallelOne + ", eSquared is " + eSquared);

            
            // m1, m2, q0, q1, q2, n, C, rhoKnot are identical to those used for the latlong-to-cartesian conversions
            
            var m1 = Lambert_M(parallelOne, eSquared);
            var m2 = Lambert_M(parallelTwo, eSquared);
            var q0 = Q(originLatitude,  e, eSquared);
            var q1 = Q(parallelOne,     e, eSquared);
            var q2 = Q(parallelTwo,     e, eSquared);
            var n = (m1*m1 - m2*m2)/(q2-q1);
            var C = m1*m1 + n*q1;

            //MARCONI.stdlib.log("m1, m2 are " + m1 + ", " + m2 + " for Albers point " + x + ", " + y);

            var rhoKnot = equitorialAxis * Math.sqrt(C-n*q0)/n;

            // different obviously than the one used for the forward equations
            var rho     = Math.sqrt((x*x+(rhoKnot-y)*(rhoKnot-y)));

            var q = (C-rho*rho*n*n/(equitorialAxis*equitorialAxis))/n;

            var e4 = eSquared * eSquared;
            var e6 = e4 * eSquared;
            var beta = Math.asin( q / Math.abs( 1-((1-eSquared)/(2*e)) * Math.log((1-e)/(1+e))));
            var phi = beta + (eSquared/3 + 31*e4/180 + 517*e6/5040)*Math.sin(2*beta) +
                (23*e4/360 + 251*e6/3780)*Math.sin(4*beta) +
                (761*e6/45360)*Math.sin(4*beta);

            var theta = n> 0 ? Math.atan2(x, rhoKnot-y) : Math.atan2(-x, y-rhoKnot);

            // Convert to degrees
            that.y = phi * MARCONI.map.RADIANS_TO_DEGREES;
            that.x = (theta / n + originLongitude) * MARCONI.map.RADIANS_TO_DEGREES;

            
            //MARCONI.stdlib.log("returning lat-long of " + that.y + ", " + that.x + " for Albers point " + x + ", " + y);

            return true;  // success
        }
        catch(ex) {
            throw("Error converting from Albers to lat-long: " + ex);
        }
    }

    function Lambert_LatLongToCartesian(
        equitorialAxis,
        eSquared,
        parallelOne,
        parallelTwo,
        originLatitude,
        originLongitude,
        originX,
        originY)
    {
        try {
            if( isNaN(that.x) || isNaN(that.y) ) {
                throw "Illegal lat-long " + that.y + ", " + that.x + ", must be numeric";
            }

            /*
            Given constants such as radius and eccentricity of the ellipsoid,
            convert given latitude and longitude coordinates to X and Y
            Important assumption:  projection is Lambert conformal conic, i.e., same as CA state plane coord
            system.
            Calcs are based on formulas given by Snyder in his book "Map Projections -- A Working Manual"



             MARCONI.stdlib.log("converting " + that.x + "," + that.y + " from long-lat to XY using radius " + equitorialAxis +
                ", eSquared=" + eSquared + ", parallels of " + parallelOne + " and " + parallelTwo +
                ", origin in lat-long of " + originLatitude + ", " + originLongitude +
                ", origin in x-y of " + originX + ", " + originY);
            */



            // verify lat and long are legal
            if( Math.abs( that.y ) > 90 ) {
                throw ("Latitude of " + that.y + " is illegal, domain is +/- 90");
            }

            if( Math.abs( that.x ) > 180) {
                throw ("Longitude of " + that.x + " is illegal, domain is +/- 180");
            }

            // convert info given in degrees to radians
            parallelOne        = parallelOne      * MARCONI.map.DEGREES_TO_RADIANS;
            parallelTwo        = parallelTwo      * MARCONI.map.DEGREES_TO_RADIANS;
            originLatitude     = originLatitude   * MARCONI.map.DEGREES_TO_RADIANS;
            originLongitude    = originLongitude  * MARCONI.map.DEGREES_TO_RADIANS;

            var latitude = that.y*MARCONI.map.DEGREES_TO_RADIANS;
            var longitude = that.x*MARCONI.map.DEGREES_TO_RADIANS;
            var e = Math.sqrt(eSquared);

            var m1 = Lambert_M(parallelOne, eSquared);
            var m2 = Lambert_M(parallelTwo, eSquared);
            var m  = Lambert_M(latitude, eSquared);

            var t1 = Lambert_T(parallelOne, e);
            var t2 = Lambert_T(parallelTwo, e);
            var t0 = Lambert_T(originLatitude, e);
            var t  = Lambert_T(latitude, e);

        
            // n, F and rhoKnot are constants for a given map
            var n = (Math.log(m1) - Math.log(m2)) / (Math.log(t1) - Math.log(t2));
            var F = m1 / (n * Math.pow(t1, n));
            var rhoKnot = equitorialAxis * F * Math.pow(t0, n);

            var rho = equitorialAxis * F * Math.pow(t, n);

            // Sign convention for longitude matters here!
            // e.g. in Bay Area, originLongitude is negative, so is longitude variable
            var theta = n * (longitude - originLongitude);

            that.x = originX + rho * Math.sin(theta);
            that.y = originY + rhoKnot - rho * Math.cos(theta);

            //var k = m1 * Math.pow(t, n) / (m * Math.pow(t1, n));     // indicator of scale
        
            return true;  // success

        }
        catch(ex) {
            throw "Error converting from lat-long to Lambert: " + ex;
        }
    }

    function Lambert_CartesianToLatLong(
        equitorialAxis,
        eSquared,
        parallelOne,
        parallelTwo,
        originLatitude,
        originLongitude,
        originX,
        originY)
        {


        /*
        ' Given constants such as radius and eccentricity of the ellipsoid,
        ' convert given point in cartesian coordinates to lat and long
        ' Important assumption:  projection is Lambert conformal conic, i.e., same as CA state plane coord
        ' system.
        ' Calcs are based on formulas given by Snyder in his book "Map Projections -- A Working Manual"
        */

        try {
            if( isNaN(that.x) || isNaN(that.y) ) {
                throw "Illegal x,y of " + that.x + ", " + that.y + ", must be numeric";
            }
            
            //MARCONI.stdlib.log("Lambert_CartesianToLatLong: converting " + that.x + "," + that.y + " to lat-long using radius" + equitorialAxis +
            //", eSquared=" + eSquared + ", parallels of " + parallelOne + " and " + parallelTwo +
            //", origin in lat-long of " + originLatitude + ", " + originLongitude +
            //", origin in x-y of " + originX + ", " + originY);
            

            // convert info given in degrees to radians
            parallelOne        = parallelOne      * MARCONI.map.DEGREES_TO_RADIANS;
            parallelTwo        = parallelTwo      * MARCONI.map.DEGREES_TO_RADIANS;
            originLatitude     = originLatitude   * MARCONI.map.DEGREES_TO_RADIANS;
            originLongitude    = originLongitude  * MARCONI.map.DEGREES_TO_RADIANS;
            
            // alert("Lambert_CartesianToLatLong(): pt is " + that.x + ", " + that.y);
            
            
            // Convert coords to offsets from the origin
            // if given x and y are not valid numbers, an exception is thrown
            var x = parseFloat(that.x) - originX;
            var y = parseFloat(that.y) - originY;

            
            // Calculate map constants
            // These formulas identical to those for converting
            // from lat-long to XY -- they just describe
            // map constants
            var e  = Math.sqrt(eSquared);
            var m1 = Lambert_M(parallelOne, eSquared);
            var m2 = Lambert_M(parallelTwo, eSquared);
            var t0 = Lambert_T(originLatitude, e);
            var t1 = Lambert_T(parallelOne, e);
            var t2 = Lambert_T(parallelTwo, e);

            /*
            alert("t1 is " + t1 + ", t2 is " + t2);
            alert("m1 is " + m1 + ", m2 is " + m2);
            */

            // n is the "cone constant", or ratio of angles between meridians on map to true angle
            var n = (Math.log(m1) - Math.log(m2)) / (Math.log(t1) - Math.log(t2));

            var F = m1 / (n * Math.pow(t1, n));

            // radius at originLatitude
            var rhoKnot = equitorialAxis * F * Math.pow(t0, n);
            // alert("rhoKnot is " + rhoKnot);

            // Per Snyder, adjust sign of x,y, rhoKnot if n is negative
            // should only happen in Southern hemisphere
            if( n < 0 ) {
                x = -x;
                y = -y;
                rhoKnot = -rhoKnot;
            }

            // rho's sign gets adjusted to match that of n
            var rho = Math.sqrt(x * x + (rhoKnot - y) * (rhoKnot - y));

            if( n > 0.0) {
                rho = Math.abs(rho);
            }
            else {
                rho = -Math.abs(rho);
            }

            // Snyder offers two methods of getting phi (latitude)
            // One method is iteration, the other is an infinite series
            // The code below is based on taking the first several terms of
            // the infinite series
            var t = Math.pow(rho /(equitorialAxis * F), 1.0 / n);
            var chi = 0.5 * Math.PI - 2.0 * Math.atan(t);  // wacky Greek angle in Snyder's books

            var phi = chi;
            phi = phi + Math.sin(2 * chi) * (0.5 * eSquared + 5.0 * eSquared * eSquared / 24.0 + Math.pow(eSquared, 3) / 12.0 + 13.0 / 360.0 * Math.pow(eSquared,4));
            phi = phi + Math.sin(4 * chi) * (eSquared * eSquared * 7.0 / 48.0 + Math.pow(eSquared, 3.0) * 29.0 / 240.0 + 811.0 / 11520.0 * Math.pow(eSquared, 4));
            phi = phi + Math.sin(6 * chi) * (Math.pow(eSquared,3) * 7.0 / 120.0 + 81.0 / 1120.0 * Math.pow(eSquared,4));
            phi = phi + Math.sin(8 * chi) * (4279.0 / 161280.0 * Math.pow(eSquared,4));

            // Convert to degrees
            that.y = phi * MARCONI.map.RADIANS_TO_DEGREES;

            // Longitude is trivial, with the exception of its sign
            // This formula returns negative longitudes, as it should
            // but many people assume it's positive
            var theta = Math.atan(x / (rhoKnot - y));
            
            that.x = (theta / n + originLongitude) * MARCONI.map.RADIANS_TO_DEGREES;

            
            // uncomment to calculate map scale
            var m = Lambert_M(phi, eSquared);
            var k = m1 * Math.pow(t,n) / (m * Math.pow(t1,n));

            // for lambert, k and h are the same
            //m_CalcDetail.mapScaleFactorK = k
            //m_CalcDetail.mapScaleFactorH = k

            //MARCONI.stdlib.log("returning lat-long of " + that.y + ", " + that.x);
            return true;  // success
        }
        catch(ex) {
            throw("Error converting from Lambert to lat-long: " + ex);
        }
    }
    
    function Mercator_CartesianToLatLong(
        equitorialAxis,
        eSquared,
        originX,
        originY)
        {


        /*
         Given constants such as radius and eccentricity of the ellipsoid,
         convert given point in cartesian coordinates to lat and long
         Important assumption:  projection is Mercator
         Calcs are based on formulas given by Snyder in his book "Map Projections -- A Working Manual"
        */

        try {
            if( isNaN(that.x) || isNaN(that.y) ) {
                throw "Illegal x,y of " + that.x + ", " + that.y + ", must be numeric";
            }
            
            var originLongitude    = 0.0;   // non-zero reference longitude basically unheard of

            // Convert coords to offsets from the origin
            var x = that.x - originX;
            var y = that.y - originY;


            // Calculate map constants
            var t   = Math.exp(-y/equitorialAxis);
            var chi = Math.PI*0.5 - 2.0 * Math.atan(t);

            var e4 = eSquared * eSquared;
            var e6 = e4*eSquared;
            var e8 = e4*e4;

            // calculate latitude in radians
            var phi = chi + (eSquared * 0.5 +  5.0*e4/24.0 + e6/12.0  + 13.0*e8/360.0) * Math.sin(2.0*chi) +
                (7.0*e4/48.8 + 29.0*e6/240.0 + 811.0*e8/11520.0) * Math.sin(4.0*chi) +
                (7.0*e6/120.0 + 81*e8/1120.0)*Math.sin(6.0*chi) +
                (4279.0 * e8 / 161280.0)*Math.sin(8.0*chi);

            // then longitude in radians
            var lamda = x/equitorialAxis + originLongitude;

            // Convert to degrees
            that.y = phi * MARCONI.map.RADIANS_TO_DEGREES;

            that.x = lamda * MARCONI.map.RADIANS_TO_DEGREES;

            return true;  // success
        }
        catch(ex) {
            throw("Error converting from Mercator to lat-long: " + ex);
        }
    }

    function Mercator_LatLongToCartesian(
        equitorialAxis,
        eSquared,
        originX,
        originY)
        {

        try {
            if( isNaN(that.x) || isNaN(that.y) ) {
                throw "Illegal lat-long " + that.y + ", " + that.x + ", must be numeric";
            }
            
            MARCONI.stdlib.log("Converting " + that.y + ", " + that.x + " to mercator with origin " + originX + ", " + originY);
            
            var originLongitude    = 0.0;   // non-zero reference longitude basically unheard of

            var x = (that.x - originLongitude)* MARCONI.map.DEGREES_TO_RADIANS * equitorialAxis - originX;

            var e = Math.sqrt(eSquared);

            var sinPhi = Math.sin(that.y * MARCONI.map.DEGREES_TO_RADIANS);

            var y = 0.5 * equitorialAxis * Math.log(((1+sinPhi)/(1-sinPhi))*Math.pow((1-e*sinPhi)/(1+e*sinPhi), e) ) - originY;

            that.y = y;

            that.x = x;

            return true;  // success
        }
        catch(ex) {
            throw("Error converting from lat-long to Mercator: " + ex);
        }
    }

    function Stereo_LatLongToCartesian(
        equitorialAxis,
        eSquared,
        originLatitude,
        originLongitude,
        originX,
        originY,
        centralScaleFactor)
    {
        try {
            
            if( isNaN(that.x) || isNaN(that.y) ) {
                throw "Illegal lat-long " + that.y + ", " + that.x + ", must be numeric";
            }
            var EPSILON = .001;
    
            var isPolar = Math.abs(Math.abs(originLatitude)-90.0) < EPSILON;
            
            var e = Math.sqrt(eSquared);
            
            // get given lat-long, and origin, in radians
            originLatitude  = originLatitude  * MARCONI.map.DEGREES_TO_RADIANS;
            originLongitude = originLongitude * MARCONI.map.DEGREES_TO_RADIANS;
            
            var latitude  = that.y * MARCONI.map.DEGREES_TO_RADIANS;
            var longitude = that.x * MARCONI.map.DEGREES_TO_RADIANS;
            
            var x,y;
            
            if( isPolar ) {
                // polar special case, math from Defense Mapping Agency publication TM 8358.2
                
                latitude = Math.abs(latitude);
                
                var tanZ = Math.pow(  (1.0+e*Math.sin(latitude)) / (1.0-e*Math.sin(latitude)), 0.5*e) * Math.tan(Math.PI/4-latitude/2) ;

                var cKnot = 2.0*equitorialAxis/Math.sqrt(1-eSquared) * Math.pow((1.0-e)/(1.0+e), 0.5*e);

                var radius = centralScaleFactor * cKnot * tanZ;

                x = originX + radius * Math.sin(longitude);

                y = originLatitude > 0.0 ? originY - radius * Math.cos(longitude) : originY + radius * Math.cos(longitude);
            }
            else {  // non-polar, math from Snyder Map Projections -- A Working Manual
                
                // Snyder equation 3-1, setting phi equal to originLatitude
                var chiOne = 2.0 * Math.atan( 
                    Math.tan(Math.PI/4.0 + 0.5*originLatitude) 
                    * 
                    Math.pow(
                        (1.0-e*Math.sin(originLatitude))/(1+e*Math.sin(originLatitude)),0.5*e)
                    ) - 0.5 * Math.PI;
                
                
                var mOne = Math.cos(originLatitude)/ Math.sqrt( 1-eSquared * Math.pow(Math.sin(originLatitude),2.0)) ;  // Snyder eq 14.15 for phi=originLatitude

                var chi = 2.0 * Math.atan( 
                    Math.tan(Math.PI/4.0 + 0.5*latitude) * 
                    Math.pow(
                        (1.0-e*Math.sin(latitude))/(1.0+e*Math.sin(latitude)),0.5*e)
                    ) - 0.5 * Math.PI;
                
                
                var A = 2.0 * equitorialAxis * centralScaleFactor * mOne / (Math.cos(chiOne) * 
                        (1.0+Math.sin(chiOne) * Math.sin(chi) + Math.cos(chiOne) * Math.cos(chi) * Math.cos(longitude-originLongitude)));
                
                x = originX + A *  Math.cos(chi)    * Math.sin(longitude - originLongitude);
                y = originY + A * (Math.cos(chiOne) * Math.sin(chi) - Math.sin(chiOne) * Math.cos(chi) * Math.cos(longitude-originLongitude));
                
            }
            
            that.x = x;
            that.y = y;
        }
        catch(ex) {
            throw("Error converting from lat-long to stereographic: " + ex);
        }
    }  
    
    function Stereo_CartesianToLatLong(
        equitorialAxis,
        eSquared,
        originLatitude,
        originLongitude,
        originX,
        originY,
        centralScaleFactor)
    {
        try {
            if( isNaN(that.x) || isNaN(that.y) ) {
                throw "Illegal lat-long " + that.y + ", " + that.x + ", must be numeric";
            }
            
            var EPSILON = .001;

            var isPolar = Math.abs(Math.abs(originLatitude)-90.0) < EPSILON;

            var e = Math.sqrt(eSquared);
            
            // get origin in radians
            originLatitude  = originLatitude  * MARCONI.map.DEGREES_TO_RADIANS;
            originLongitude = originLongitude * MARCONI.map.DEGREES_TO_RADIANS;
            
            // remove false eastings and northings
            var x = that.x - originX;
            var y = that.y - originY;
            
            
            var e4 = eSquared*eSquared;
            var e6 = eSquared * e4;
            var e8 = e4*e4;

            var aBar = eSquared*0.5 + 5.0*e4/24.0 + e6/12.0 + e8*13.0/360.0;
            var bBar = 7.0*e4/48.0 + 29.0*e6/240.0 + 811.0*e8/11520.0;
            var cBar = 7.0*e6/120.0 + 81.0*e8/1120.0;
            var dBar = 4279.0*e8/161280.0;
            
            var lambda = originLongitude;  // longitude in radians
            
            var phi;  // to be assigned latitude in radians
            var chi;
            
            if( isPolar ) {
                // math from TM 8358.2 regarding UPS, special case of polar origin

                if( Math.abs(x) <  EPSILON && Math.abs(y) < EPSILON ) {
                    phi = Math.PI/2;
                    // lambda, i.e. longitude, remains at its origin in this case
                }
                else {
                    lambda += (originLatitude > 0.0 ? Math.atan2(x, -y) : Math.atan2(x, y));
                    
                    var radius = Math.abs(x/Math.sin(lambda));
                    var cKnot = 2*equitorialAxis/Math.sqrt(1-eSquared) * Math.pow((1-e)/(1+e), 0.5*e);
                    var z = 2*Math.atan2(radius, centralScaleFactor * cKnot);
                    
                    chi = Math.PI/2 - z;

                    phi = chi + aBar * Math.sin(2*chi) + bBar * Math.sin(4*chi) + cBar * Math.sin(6*chi) + dBar * Math.sin(8*chi);
                    
                    if( originLatitude < 0.0 ) {
                        phi = phi * -1.0;   // southern hemisphere
                    }
                    
                }
            }
            else {
                // for non-polar, i.e. oblique case, use math from Snyder chapter 21 of Map Projections -- A Working Manual 

                // Snyder equation 3-1, setting phi equal to originLatitude
                var chiOne = 2.0 * Math.atan( 
                    Math.tan(Math.PI/4.0 + 0.5*originLatitude) 
                    * 
                    Math.pow(
                        (1.0-e*Math.sin(originLatitude))/(1+e*Math.sin(originLatitude)),0.5*e)
                    ) - 0.5 * Math.PI;
                
                var rho = Math.sqrt(x*x+y*y);

                var mOne = Math.cos(originLatitude)/ Math.sqrt( 1-eSquared * Math.pow(Math.sin(originLatitude),2.0)) ;  // Snyder eq 14.15 for phi=originLatitude

                var c    = 2.0 * Math.atan( rho * Math.cos(chiOne)/(2*equitorialAxis * centralScaleFactor * mOne) );  // eq. 21-38

                
            
                if( Math.abs(rho) <  EPSILON ) {
                    chi = chiOne;
                    // lambda, i.e. longitude, remains at its origin in this case
                }
                else {
                    chi = Math.asin(Math.cos(c) * Math.sin(chiOne) + y*Math.sin(c) * Math.cos(chiOne)/rho);

                    // atan2 rather than atan preserves correct sign for coords in the southern hemisphere
                    lambda += Math.atan2(x * Math.sin(c),
                        rho * Math.cos(chiOne) * Math.cos(c) - y * Math.sin(chiOne) * Math.sin(c) );

                }
                
                phi = chi + aBar * Math.sin(2*chi) + bBar * Math.sin(4*chi) + cBar * Math.sin(6*chi) + dBar * Math.sin(8*chi);
            
            }

            
            var latitude  = phi    * MARCONI.map.RADIANS_TO_DEGREES;
            
            var longitude = lambda * MARCONI.map.RADIANS_TO_DEGREES;
            
            that.x = longitude;
            that.y = latitude;
        }
        catch(ex) {
            throw("Error converting from stereographic cartesian to lat-long: " + ex);
        }
    }  
    
    function shift_General(datumShift, pt) {
        function shift_Molodensky(datumShift, pt) {
            try {
                if( typeof(datumShift.shiftX) === "undefined" || typeof(datumShift.shiftX) === "null") {
                    throw("shiftX must be defined for Molodensky transform");
                }

                if( typeof(datumShift.shiftY) === "undefined" || typeof(datumShift.shiftY) === "null") {
                    throw("shiftY must be defined for Molodensky transform");
                }

                if( typeof(datumShift.shiftZ) === "undefined" || typeof(datumShift.shiftZ) === "null") {
                    throw("shiftZ must be defined for Molodensky transform");
                }

                var fromDatum = MARCONI.map.datumGivenCode(datumShift.fromDatumCD);
                var toDatum   = MARCONI.map.datumGivenCode(datumShift.toDatumCD);
                
                // MARCONI.stdlib.log("Converting datum from/to ", fromDatum, toDatum);


                if( typeof(fromDatum.flatteningInverse) === "undefined" && fromDatum.eccentricity > 0 ) {
                    throw("flattening inverse for datum " + datumShift.fromDatumCD + " must be defined unless ellipsoid is a perfect sphere");
                }

                if( typeof(toDatum.flatteningInverse) === "undefined" && toDatum.eccentricity > 0 ) {
                    throw("flattening inverse for datum " + datumShift.toDatumCD + " must be defined unless ellipsoid is a perfect sphere");
                }

                var fFrom = fromDatum.flatteningInverse ? 1/fromDatum.flatteningInverse : 0;
                var fTo   = toDatum.flatteningInverse   ? 1/toDatum.flatteningInverse   : 0;


                // see NIMA TR8350.2 section 7.4 for the math

                var sinPhi    = Math.sin(pt.y * MARCONI.map.DEGREES_TO_RADIANS);
                var cosPhi    = Math.cos(pt.y * MARCONI.map.DEGREES_TO_RADIANS);
                var cosLambda = Math.cos(pt.x * MARCONI.map.DEGREES_TO_RADIANS);
                var sinLambda = Math.sin(pt.x * MARCONI.map.DEGREES_TO_RADIANS);


                var a = fromDatum.equitorialAxisMeters;
                var b = fromDatum.polarAxisMeters ?  fromDatum.polarAxisMeters : a * (1 - fFrom);
                var deltaA = toDatum.equitorialAxisMeters - fromDatum.equitorialAxisMeters;

                var eSquared = fromDatum.eccentricitySquared !== null ? fromDatum.eccentricitySquared : fromDatum.eccentricity * fromDatum.eccentricity;
                var Rn = a / Math.sqrt(1-eSquared * sinPhi * sinPhi);
                var Rm = a*(1-eSquared)/Math.pow(1-eSquared*sinPhi*sinPhi,1.5);

                var h = pt.z ? pt.z : 0;  // geodetic height, i.e. height above "from" ellipsoid
                var sinOne = Math.sin(1/3600*MARCONI.map.DEGREES_TO_RADIANS);

                var deltaF = fTo - fFrom;


                var shiftLat = (-1*datumShift.shiftX * sinPhi * cosLambda -
                    datumShift.shiftY * sinPhi * sinLambda + datumShift.shiftZ * cosPhi + deltaA * (Rn * eSquared * sinPhi * cosPhi)/a + deltaF*(Rm*a/b + Rn*b/a)*sinPhi*cosPhi) /
                    ((Rm+h) * sinOne);

                var shiftLong = (-datumShift.shiftX * sinLambda + datumShift.shiftY * cosLambda) / ((Rn+h)*cosPhi * sinOne);

                //MARCONI.stdlib.log("Molodensky-based shift is " + shiftLat + " and " + shiftLong + " seconds for lat and long");

                pt.x += shiftLong/3600;
                pt.y += shiftLat/3600;
            }
            catch(ex) {
                throw "Error " + ex + " attempting datum-shift using Molodensky transformation matrix method";
            }
        }
        function shift_Helmert(datumShift, pt) {
            try {
                if( typeof(datumShift.shiftX) === "undefined" || typeof(datumShift.shiftX) === "null") {
                    throw("shiftX must be defined for Helmert transform");
                }

                if( typeof(datumShift.shiftY) === "undefined" || typeof(datumShift.shiftY) === "null") {
                    throw("shiftY must be defined for Helmert transform");
                }

                if( typeof(datumShift.shiftZ) === "undefined" || typeof(datumShift.shiftZ) === "null") {
                    throw("shiftZ must be defined for Helmert transform");
                }

                var fromDatum = MARCONI.map.datumGivenCode(datumShift.fromDatumCD);
                var toDatum   = MARCONI.map.datumGivenCode(datumShift.toDatumCD);


                if( typeof(fromDatum.equitorialAxisMeters) === "undefined" || typeof(fromDatum.eccentricitySquared) === "undefined" ) {
                    throw("equitorial axis and eccentricitySquared for datum " + datumShift.fromDatumCD + " must be defined for a Helmert shift");
                }

                if( typeof(toDatum.equitorialAxisMeters) === "undefined" || typeof(toDatum.eccentricitySquared) === "undefined" ) {
                    throw("equitorial axis and eccentricitySquared for datum " + datumShift.toDatumCD + " must be defined for a Helmert shift");
                }


                var a = fromDatum.equitorialAxisMeters;

                var latitude  = pt.y * MARCONI.map.DEGREES_TO_RADIANS;
                var longitude = pt.x * MARCONI.map.DEGREES_TO_RADIANS;

                var eSquared = fromDatum.eccentricitySquared;
                var h = pt.z || 0;  // geodetic height, i.e. height above "from" ellipsoid

                // example numbers happen to be WGS84 to Airy
                var xp = datumShift.shiftX;   // e.g. -446.448 meters
                var yp = datumShift.shiftY;   // e.g. 125.157 meters
                var zp = datumShift.shiftZ;   // e.g. -542.06 meters
                var xr = datumShift.rotationX;  // e.g. -0.1502 seconds
                var yr = datumShift.rotationY; // e.g. -0.247 seconds
                var zr = datumShift.rotationZ;  // e.g. -0.8421 seconds
                var s  = datumShift.scaleFactor;  // assumed to be in ppm, e.g., 20.4894;

                //MARCONI.stdlib.log("Helmert shift with dx,dy,dz=" + xp + ", " + yp + ", " + zp + ", rx,ry,rz= " + xr + ", " + yr + ", " + zr + ", scale=" + s);

                // convert given lat-long to earth-centered cartesian
                var sf = s * 0.000001;
                var v = a / (Math.sqrt(1 - eSquared * Math.sin(latitude) * Math.sin(latitude)));
                var x = (v + h) * Math.cos(latitude) * Math.cos(longitude);
                var y = (v + h) * Math.cos(latitude) * Math.sin(longitude);
                var z = ((1 - eSquared) * v + h) * Math.sin(latitude);

                // transform cartesian
                var xrot = (xr / 3600) * MARCONI.map.DEGREES_TO_RADIANS;
                var yrot = (yr / 3600) * MARCONI.map.DEGREES_TO_RADIANS;
                var zrot = (zr / 3600) * MARCONI.map.DEGREES_TO_RADIANS;
                var hx = x + (x * sf) - (y * zrot) + (z * yrot) + xp;
                var hy = (x * zrot) + y + (y * sf) - (z * xrot) + yp;
                var hz = (-1 * x * yrot) + (y * xrot) + z + (z * sf) + zp;

                // Convert back to lat, lon
                var  newLon = Math.atan(hy / hx);
                var p = Math.sqrt((hx * hx) + (hy * hy));
                var newLat = Math.atan(hz / (p * (1 - toDatum.eccentricitySquared)));
                v = toDatum.equitorialAxisMeters / (Math.sqrt(1 - toDatum.eccentricitySquared * (Math.sin(newLat) * Math.sin(newLat))));

                var errvalue = 1.0;
                var lat0 = 0;
                var EPSILON = 0.0000001;
                while (errvalue > EPSILON) {
                    lat0 = Math.atan((hz + toDatum.eccentricitySquared * v * Math.sin(newLat)) / p);
                    errvalue = Math.abs(lat0 - newLat);
                    newLat = lat0;
                }

                // converted point is in degrees
                pt.y = newLat * MARCONI.map.RADIANS_TO_DEGREES;
                pt.x = newLon * MARCONI.map.RADIANS_TO_DEGREES;
            }
            catch(ex) {
                throw "Error " + ex + " attempting datum-shift using Helmert transformation matrix method";
            }
        }
        function shift_MRE(datumShift, pt) {
            try {

                var U = datumShift.scaleFactor * (pt.y - datumShift.shiftY);
                var V = datumShift.scaleFactor * (pt.x - datumShift.shiftX);

                //for test data, U= -0.11593597351655573, V=0.4408093939615561

                //MARCONI.stdlib.log("U= " + U + ", V=" + V);
                var coeff=null;
                var i=null;

                var shiftLat = 0;
                if( datumShift.latitudeCoefficients ) {
                    for( i = 0 ; i < datumShift.latitudeCoefficients.length ; i++) {
                        coeff=datumShift.latitudeCoefficients[i];

                        //MARCONI.stdlib.log("Applying coefficient " + MARCONI.stdlib.logObject(coeff));
                        shiftLat += coeff.value * Math.pow(U, coeff.expLat) * Math.pow(V, coeff.expLong);
                    }
                }

                var shiftLong=0;
                if( datumShift.longitudeCoefficients ) {
                    for( i = 0 ; i <  datumShift.longitudeCoefficients.length ; i++) {
                        coeff=datumShift.longitudeCoefficients[i];

                        //MARCONI.stdlib.log("Applying coefficient " + coeff.value + " to U" + coeff.expLat + "V" + coeff.expLong + ": " + Math.pow(U, coeff.expLat) * Math.pow(V, coeff.expLong) + ", val= " + coeff.value *  Math.pow(U, coeff.expLat) * Math.pow(V, coeff.expLong));
                        shiftLong += coeff.value * Math.pow(U, 1*coeff.expLat) * Math.pow(V, 1*coeff.expLong);
                    }
                }

                //MARCONI.stdlib.log("MRE-based shift is " + shiftLat + " and " + shiftLong + " seconds for lat and long");

                pt.x += shiftLong/3600;
                pt.y += shiftLat/3600;
            }
            catch(ex) {
                throw "Error " + ex + " attempting datum-shift using Multiple Regression Equation";
            }
        }

        //MARCONI.stdlib.log("converting " + pt.y + ", " + pt.x + " generically using " + MARCONI.stdlib.logObject(datumShift, "obj", "-", 3));
        
        if( !datumShift || !datumShift.fromDatumCD || !datumShift.toDatumCD ) {
            
            throw("datumShift passed to shift_General() was null or invalid");
        }
        if( !pt || typeof(pt.x) == "undefined" || typeof(pt.y)=="undefined") {
            throw("point argument passed to shift_General() was null or invalid");
        }

        if( datumShift.datumShiftMethodCD == "MRE") {
            shift_MRE(datumShift, pt);
        }
        else if( datumShift.datumShiftMethodCD == "MOLODENSKY") {
            shift_Molodensky(datumShift, pt);
        }
        else if( datumShift.datumShiftMethodCD == "HELMERT") {
            shift_Helmert(datumShift, pt);
        }
        else {
            throw( datumShift.datumShiftMethodCD + " method is not supported");
        }
    }
    
    // Given latitude and longitude referenced to one datum, convert to new datum
    function convertToNewHorizDatum(oldDatum, newDatum, datumShiftMethodCD) {
        var stage="";

        try {
            var EPSILON = 1/3600 * 0.001;  // thousandths of a second convergence is more than good enough
            
            var ITERATION_COUNT_MAX = 50;

            var oldDatumCanonical = MARCONI.map.canonicalDatum(oldDatum);
            var newDatumCanonical = MARCONI.map.canonicalDatum(newDatum);


            if( oldDatumCanonical == newDatumCanonical ){
                return;
            }

            stage="looking for suitable datum shift from " + oldDatumCanonical + " to " + newDatumCanonical + 
                (datumShiftMethodCD ? ", method " + datumShiftMethodCD : ", any method");


            // look up the best datum shift available based on various criteria
            // if datumShiftMethodCD is given that narrows the search and that code can optionally contain a specific datum shift name
            // beyond that, we pass the point to be converted so that any bounding box criteria for datum shifts are observed
            // Note that the master array of datum shifts is sorted already from best-worst within a given fromDatum-toDatum, so
            // for example MRE shifts are preferred to Molodensky automatically unless a Molodensky is specifically requested



            var isSpecificShiftGiven = datumShiftMethodCD && datumShiftMethodCD.indexOf(" ") > 0;
            var pt = (isSpecificShiftGiven ? null : that);

            var datumShift = MARCONI.map.getDatumShift(oldDatumCanonical, newDatumCanonical, datumShiftMethodCD, pt);
            var rejectedDatumShiftInfo= "" ;

            if( datumShift ) {
                // if a very specific shift was given, we check and report bounding box compliance separately so user is not baffled
                if( !MARCONI.map.isDatumShiftOkayForGivenPoint(datumShift, that) ) {
                    rejectedDatumShiftInfo= "Datum shift " + datumShift.datumShiftMethodCD + " [" + datumShift.datumShiftName + "] is valid only for bounds of " +
                            datumShift.latitudeMin + ", " + datumShift.longitudeMin + " by " + datumShift.latitudeMax + ", " + datumShift.longitudeMax + ", not suitable for lat,long of " +
                            that.y + ", " + that.x;
                    
                    if(isSpecificShiftGiven) {
                        throw(rejectedDatumShiftInfo);
                    }
                    else {
                        datumShift =null;  // hope that we find a reverse shift
                    }
                }
            }

            // reverse shifts require iteration, often 10x the processing time, so they are a second choice
            var reverseShift = datumShift ? null : MARCONI.map.getDatumShift(newDatumCanonical, oldDatumCanonical, datumShiftMethodCD, pt);

            if( reverseShift ) {
                if( !MARCONI.map.isDatumShiftOkayForGivenPoint(reverseShift, that) ) {
                    if( isSpecificShiftGiven ) {
                        throw("Datum shift " + reverseShift.datumShiftMethodCD + " [" + reverseShift.datumShiftName + "] is valid only for bounds of " +
                        reverseShift.latitudeMin + ", " + reverseShift.longitudeMin + " by " + reverseShift.latitudeMax + ", " + reverseShift.longitudeMax +
                        ", not suitable for lat,long of " +
                        that.y + ", " + that.x);
                    }
                    else {
                        reverseShift=null;
                    }
                }
                else {
                    //MARCONI.stdlib.log("Selected reverse shift " + reverseShift.datumShiftName + MARCONI.stdlib.logObject(reverseShift));
                }
            }


            stage="";
            if( datumShiftMethodCD && !datumShift && !reverseShift) {
                throw "Cannot find a valid datum shift of type "  + datumShiftMethodCD + " for point " + that.y + ", " + that.x + ".  " + 
                    (datumShiftMethodCD.indexOf("GRID")==0 ? "Note that typically a GRID-type shift is not available for client-side calcs!" :
                    "Verify the bounding box criteria for datum shifts are correct.") +
                    rejectedDatumShiftInfo;
            }

            if(  datumShift ) {
                stage="performing direct shift";
                shift_General( datumShift, that);
            }
            else if( reverseShift ) {
                stage="iteratively performing reverse shift";

                // iterative method of datum shifting

                // initially guess that lat and long are unchanged -- not a bad guess since shifts are pretty small
                var initPt  = new MARCONI.map.GeoPoint(that.x, that.y);
                var trialPt = new MARCONI.map.GeoPoint(that.x, that.y);
                var  calcPt = new MARCONI.map.GeoPoint(that.x, that.y);

                for( var iterationCount = 0 ; iterationCount < ITERATION_COUNT_MAX ; iterationCount++ ) {
                    //MARCONI.stdlib.log( "Iteration #" + iterationCount + ": trying long-lat of " + trialPt.x + " / " + trialPt.y );

                    calcPt.x = trialPt.x;
                    calcPt.y = trialPt.y;

                    stage="reverse shift " + reverseShift;

                    shift_General( reverseShift, calcPt);
                    
                    var errorX = calcPt.x - initPt.x;
                    var errorY = calcPt.y - initPt.y;

                    //MARCONI.stdlib.log("shift errors are " + errorX + ", " + errorY);

                    if( Math.abs(errorX) < EPSILON && Math.abs(errorY) < EPSILON) {
                        that.x = trialPt.x;
                        that.y = trialPt.y;
                        return;
                    }

                    if( Math.abs(errorY ) > EPSILON) {
                        trialPt.y  = trialPt.y - errorY * 0.5;
                    }

                    if( Math.abs(errorX ) > EPSILON) {
                        trialPt.x  = trialPt.x - errorX * 0.5;
                    }
                }

                if( iterationCount >= ITERATION_COUNT_MAX) {
                    throw("Maximum iteration count exceeded converting iteratively from datum " + oldDatumCanonical + " to datum " + newDatumCanonical + " using method " + reverseShift.datumShiftMethodCD);
                }

            }
            else {
                stage="";
                throw ("Could not find a valid datum shift method to convert lat,long " + that.y + ", " + that.x + " from datum " + oldDatum + " to datum " + newDatum + ", which were mapped to canonical datums " +
                    oldDatumCanonical + " and " + newDatumCanonical);
            }
        }
        catch(ex) {
            throw("convertToNewHorizDatum() error: " + ex + (stage ? ", at stage " + stage : ""));
        }
    }

    function Polar_CartesianToLatLong(
        equitorialAxis,
        eSquared,
        originX,
        originY,
        centralScaleFactor,
        hemiSphere)
        {

        try {
            if( isNaN(that.x) || isNaN(that.y) ) {
                throw "Illegal lat-long " + that.y + ", " + that.x + ", must be numeric";
            }
            
            if(!(hemiSphere=="N" || hemiSphere=="S")) {
                throw "Must provide hemisphere as N or S";
            }
            var originLatitude = hemiSphere=="N" ? 90 : -90;
            var originLongitude = 0;
            
            
            // math from Defense Mapping Agency publication TM 8358.2 (instead of Snyder's formulae since Snyder wants us to know latitude of true scale)

            if( !centralScaleFactor ) {
                centralScaleFactor = 0.994;  // typical default, standard for UPS
            }
            
            Stereo_CartesianToLatLong(
                equitorialAxis,
                eSquared,
                originLatitude, originLongitude,
                originX,
                originY,
                centralScaleFactor);
        }
        catch(ex) {
            throw("Error converting polar coordinates to lat-long: " + ex);
        }

        return;
    }

    function Polar_LatLongToCartesian(
        equitorialAxis,
        eSquared,
        originX,
        originY,
        centralScaleFactor)
        {

        try {
            if( isNaN(that.x) || isNaN(that.y) ) {
                throw "Illegal lat-long " + that.y + ", " + that.x + ", must be numeric";
            }
            
            // origin of projection is north pole for northern latitude, south for southern latitudes
            var originLatitude = that.y > 0.0 ? 90 : -90;
            var originLongitude = 0;
            
            Stereo_LatLongToCartesian(
                equitorialAxis,
                eSquared,
                originLatitude,
                originLongitude,
                originX,
                originY,
                centralScaleFactor);

        }
        catch(ex) {
            throw("Polar_LatLongToCartesian(): Error converting lat-long to polar coordinates: " + ex);
        }
    }

    function TM_CartesianToLatLong(
        equitorialAxis,
        eSquared,
        originLatitude,
        originLongitude,
        originX,
        originY,
        centralScaleFactor)
        {

        try {
            if( isNaN(that.x) || isNaN(that.y) ) {
                throw "Illegal x,y of " + that.x + ", " + that.y + ", must be numeric";
            }
            
            // MARCONI.stdlib.log("converting TM " + parseFloat(that.x) + ", " + parseFloat(that.y) + " to lat-long, radius " + equitorialAxis + ", esqu=" + eSquared +", lat-long of origin is " + originLatitude + ", " + originLongitude + " at xy " + originX + ", " + originY +", scale is " + centralScaleFactor);
            
            if( !centralScaleFactor ) {
                centralScaleFactor = 0.9996;  // typical default, standard for UTM
            }
            
            // convert from degrees to radians
            originLatitude  = originLatitude  * MARCONI.map.DEGREES_TO_RADIANS;
            originLongitude = originLongitude * MARCONI.map.DEGREES_TO_RADIANS;

            var ePrimeSquared = eSquared / (1 - eSquared);

            var mKnot = MARCONI.map.trueDistanceAlongCentralMeridian(equitorialAxis, eSquared, originLatitude);

            var m = mKnot + (parseFloat(that.y) - originY) / centralScaleFactor;
            
            var meow = m / (equitorialAxis * (1 - eSquared / 4 - 3 * eSquared * eSquared / 64 - 5 * eSquared * eSquared * eSquared / 256));

            var eOne = (1 - Math.sqrt(1 - eSquared)) / (1 + Math.sqrt(1 - eSquared));

            var phiOne = meow + (1.5 * eOne - 27 * Math.pow(eOne, 3) / 32) * Math.sin(2 * meow) + (21 * eOne * eOne / 16 - 55 * Math.pow(eOne, 4) / 32) * Math.sin(4 * meow) + (151 * Math.pow(eOne, 3) / 96) * Math.sin(6 * meow) + (1097 * Math.pow(eOne, 4) / 512) * Math.sin(8 * meow);

            var cOne = ePrimeSquared * Math.pow(Math.cos(phiOne), 2);

            var tOne = Math.pow(Math.tan(phiOne),2);

            var nOne = equitorialAxis / Math.sqrt(1 - eSquared * Math.pow(Math.sin(phiOne), 2));

            var rOne = equitorialAxis * (1 - eSquared) / Math.pow(1 - eSquared * Math.pow(Math.sin(phiOne), 2), 1.5);

            var D = (parseFloat(that.x) - originX) / (nOne * centralScaleFactor);

            // MARCONI.stdlib.log("m=" + m + ", mKnot is ",mKnot, ", meow=", meow, ", phiOne=", phiOne, ", cOne=", cOne, " tOne=", tOne, "nOne=", nOne, ", rOne=", rOne, ", D=", D);

            // test
            //originLatitude=0;
            
            var latitude  = (phiOne - (nOne * Math.tan(phiOne) / rOne) * (D * D / 2 - (5 + 3 * tOne + 10 * cOne - 4 * cOne * cOne - 9 * ePrimeSquared) * Math.pow(D,4) / 24 + (61 + 90 * tOne + 298 * cOne + 45 * tOne * tOne - 252 * ePrimeSquared - 3 * cOne * cOne) * Math.pow(D,6) / 720))* MARCONI.map.RADIANS_TO_DEGREES;

            var longitude = (originLongitude + (D - (1 + 2 * tOne + cOne) * Math.pow(D, 3) / 6 + (5 - 2 * cOne + 28 * tOne - 3 * cOne * cOne + 8 * ePrimeSquared + 24 * tOne * tOne) * Math.pow(D, 5) / 120) / Math.cos(phiOne))* MARCONI.map.RADIANS_TO_DEGREES;

            // MARCONI.stdlib.log("Converted UTM to lat-long, xy is " + that.x + ", " + that.y + ", lat-long is " + latitude + ", " + longitude);

            that.y = latitude;
            that.x = longitude;

            // MARCONI.stdlib.log("done converting TM");

            // m_CalcDetail.mapScaleFactorH = 0
            // m_CalcDetail.mapScaleFactorK = 0
        }
        catch(ex) {
            throw("Error converting TM to lat-long: " + ex);
        }
        
        return;
    }

    function TM_LatLongToCartesian(
        equitorialAxis,
        eSquared,
        originLatitude,
        originLongitude,
        originX,
        originY,
        centralScaleFactor)
    {
        //MARCONI.stdlib.log("converting lat-long of " + that.y + ", " + that.x + " to UTM with lat-long origin of " + originLatitude + ", " + originLongitude + ", cartesian origin of " + originX + ", " + originY + ", scale factor " + centralScaleFactor);
        
        if( isNaN(that.x) || isNaN(that.y) ) {
            throw "Illegal lat-long " + that.y + ", " + that.x + ", must be numeric";
        }
            
        if( Math.abs(that.y) > 90 ) {
            throw ("TM_LatLongToCartesian(): Latitude of " + that.y + " is illegal");
        }

        if( Math.abs(that.x) > 180) {
            throw ("TM_LatLongToCartesian(): Longitude of " + that.x + " is illegal");
        }

        var latitude = that.y * MARCONI.map.DEGREES_TO_RADIANS;

        var longitude = that.x * MARCONI.map.DEGREES_TO_RADIANS;

        var ePrimeSquared = eSquared / (1 - eSquared);

        var n = equitorialAxis / Math.sqrt(1 - eSquared * Math.pow(Math.sin(latitude), 2));

        var t = Math.pow(Math.tan(latitude), 2);

        var C = ePrimeSquared * Math.pow(Math.cos(latitude), 2);

        var bigA = (longitude - MARCONI.map.DEGREES_TO_RADIANS * originLongitude) * Math.cos(latitude);

        var m = MARCONI.map.trueDistanceAlongCentralMeridian(equitorialAxis, eSquared, latitude);

        var mKnot = MARCONI.map.trueDistanceAlongCentralMeridian(equitorialAxis, eSquared, originLatitude*MARCONI.map.DEGREES_TO_RADIANS);

        that.x = centralScaleFactor * n * (bigA + (1 - t + C) * Math.pow(bigA,3) / 6 + (5 - 18 * t + t * t + 72 * C - 58 * ePrimeSquared) * Math.pow(bigA,5) / 120) + originX;

        that.y = centralScaleFactor * (m - mKnot + (n * Math.tan(latitude)) * (bigA * bigA / 2 + (5 - t + 9 * C + 4 * C * C) * Math.pow(bigA,4) / 24 + (61 - 58 * t + t * t + 600 * C - 330 * ePrimeSquared) * Math.pow(bigA,6) / 720)) + originY;

        //MARCONI.stdlib.log("x,y= " + that.x + ", " + that.y);
    }

    // Map constants for Lambert conformal conic calcs
    function Lambert_M( phi, eSquared ) {
        return Math.cos(phi) / Math.sqrt(1.0 - eSquared * Math.pow(Math.sin(phi),2.0));
    }

    function Lambert_T( phi, e ) {
        return Math.tan(Math.PI / 4.0 - 0.5 * phi) /
            Math.pow((1.0 - e * Math.sin(phi)) / (1.0 + e * Math.sin(phi)), 0.5*e);
    }

    try {
        
        // convert to lat-long if coord sys type is not WORLD
        switch( spatialRefIn.coordSysTypeCD ) {
            case MARCONI.map.COORDSYS_TYPE_LAMBERT:
               Lambert_CartesianToLatLong(
                    spatialRefIn.equitorialAxis,
                    spatialRefIn.eSquared,
                    spatialRefIn.parallelOne,
                    spatialRefIn.parallelTwo,
                    spatialRefIn.originLatitude,
                    spatialRefIn.originLongitude,
                    spatialRefIn.originX,
                    spatialRefIn.originY
                    );
                break;

            case MARCONI.map.COORDSYS_TYPE_TM:
                TM_CartesianToLatLong(
                    spatialRefIn.equitorialAxis,
                    spatialRefIn.eSquared,
                    spatialRefIn.originLatitude,
                    spatialRefIn.originLongitude,
                    spatialRefIn.originX,
                    spatialRefIn.originY,
                    spatialRefIn.centralScaleFactor);
                break;

            case MARCONI.map.COORDSYS_TYPE_ALBERS:
               Albers_CartesianToLatLong(
                    spatialRefIn.equitorialAxis,
                    spatialRefIn.eSquared,
                    spatialRefIn.parallelOne,
                    spatialRefIn.parallelTwo,
                    spatialRefIn.originLatitude,
                    spatialRefIn.originLongitude,
                    spatialRefIn.originX,
                    spatialRefIn.originY
                    );
                break;


            case MARCONI.map.COORDSYS_TYPE_GRID:
                determineLatLongFromGridValue(spatialRefIn);         // will set x=longitude, y=latitude
                break;

            case MARCONI.map.COORDSYS_TYPE_ATLAS:
                determineLatLongFromAtlasPageAndGrid(spatialRefIn);  // will set x=longitude, y=latitude
                break;

            case MARCONI.map.COORDSYS_TYPE_MERCATOR:
                Mercator_CartesianToLatLong(
                    spatialRefIn.equitorialAxis,
                    spatialRefIn.eSquared,
                    spatialRefIn.originX,
                    spatialRefIn.originY
                    );
                break;
                
            case MARCONI.map.COORDSYS_TYPE_STEREO:
                Stereo_CartesianToLatLong(
                    spatialRefIn.equitorialAxis,
                    spatialRefIn.eSquared,
                    spatialRefIn.originLatitude,
                    spatialRefIn.originLongitude,
                    spatialRefIn.originX,
                    spatialRefIn.originY,
                    spatialRefIn.centralScaleFactor
                    );
                break;

            default:  // degrees, might be in DMS form
                this.x = MARCONI.map.DMStoDecimalDegrees(this.x);
                this.y = MARCONI.map.DMStoDecimalDegrees(this.y);

                //MARCONI.stdlib.log("lat-long input values are " + this.y + ", " +  this.x);

                break;
        }

        
        // shift datum if needed
        if( spatialRefIn.datumCD != spatialRefOut.datumCD ) {
            convertToNewHorizDatum( spatialRefIn.datumCD, spatialRefOut.datumCD, datumShiftMethodCD );
            if( window.YAHOO ) {
                //MARCONI.stdlib.log("lat-long values after datum shift are " + this.y + ", " +  this.x);
            }
        }

        
        // convert from lat-long to XY if desired spatial ref is not lat-long
        // we do this by looking first for grid-based spatial refs since they may have various coord sys types
        // then looking at type of coord sys for all other conversions
            
        
        
        switch( spatialRefOut.coordSysTypeCD ) {
            case MARCONI.map.COORDSYS_TYPE_LAMBERT:
                Lambert_LatLongToCartesian(
                    spatialRefOut.equitorialAxis,
                    spatialRefOut.eSquared,
                    spatialRefOut.parallelOne,
                    spatialRefOut.parallelTwo,
                    spatialRefOut.originLatitude,
                    spatialRefOut.originLongitude,
                    spatialRefOut.originX,
                    spatialRefOut.originY);
                break;

            case MARCONI.map.COORDSYS_TYPE_TM:
                TM_LatLongToCartesian(
                    spatialRefOut.equitorialAxis,
                    spatialRefOut.eSquared,
                    spatialRefOut.originLatitude,
                    spatialRefOut.originLongitude,
                    spatialRefOut.originX,
                    spatialRefOut.originY,
                    spatialRefOut.centralScaleFactor);
                break;

            case MARCONI.map.COORDSYS_TYPE_ALBERS:
                Albers_LatLongToCartesian(
                    spatialRefOut.equitorialAxis,
                    spatialRefOut.eSquared,
                    spatialRefOut.parallelOne,
                    spatialRefOut.parallelTwo,
                    spatialRefOut.originLatitude,
                    spatialRefOut.originLongitude,
                    spatialRefOut.originX,
                    spatialRefOut.originY);
                break;

            case MARCONI.map.COORDSYS_TYPE_GRID:
                determineGridValueFromLatLong(spatialRefOut, format);  // will set x=grid value
                break;

            case MARCONI.map.COORDSYS_TYPE_ATLAS:
                determineAtlasPageAndGridFromLatLong(spatialRefOut);  // will set x=grid value
                break;

            case MARCONI.map.COORDSYS_TYPE_MERCATOR:
                Mercator_LatLongToCartesian(
                    spatialRefOut.equitorialAxis,
                    spatialRefOut.eSquared,
                    spatialRefOut.originX,
                    spatialRefOut.originY);
                break;
                
            case MARCONI.map.COORDSYS_TYPE_STEREO:
                Stereo_LatLongToCartesian(
                    spatialRefOut.equitorialAxis,
                    spatialRefOut.eSquared,
                    spatialRefOut.originLatitude,
                    spatialRefOut.originLongitude,
                    spatialRefOut.originX,
                    spatialRefOut.originY,
                    spatialRefOut.centralScaleFactor);
                break;

        }
        //MARCONI.stdlib.log("final x,y values are " + this.x + ", " +  this.y);
        
    }
    catch(e) {
        throw(e.startsWith("BUSY") ? e : "MARCONI.map.GeoPoint.convert(): " + e);
    }
    
};


/*
' Given angle in decimal degrees, return string of its degree-minutes-seconds representation
' Optional parameter is number of decimal places for seconds, otherwise it will default
*/
MARCONI.map.decimalDegreesToDMS = function (decimalValue, decimalPlaces) {
    if( decimalPlaces === undefined || decimalPlaces === null ) {
        decimalPlaces=3;
    }
    
    var EPSILON = Math.pow(10, -1 * (decimalPlaces + 1));
    
    var sign = (decimalValue > 0 ? 1.0 : -1.0);
    
    if( Math.abs(decimalValue) > 360.0 ) {
        throw ("decimalDegreesToDMS(): angle of " + decimalValue + " out of bounds");
    }

    var degrees = sign * Math.floor(Math.abs(decimalValue));   // e.g., if decimalvalue is -122.5, degrees is -122
    
    decimalValue = Math.abs(decimalValue) - Math.abs(degrees);
        
    var minutes = Math.floor(decimalValue * 60.0);
    
    var secs = 3600.0 * (decimalValue - minutes / 60.0);
       
    // if seconds is essentially 60, zero out and increment minutes 
    if( Math.abs(secs - 60.0) < EPSILON ) {
        secs = 0.0;
        minutes = minutes + 1.0;
    }
    
    // if minutes exceed 60, reduce them and bump degrees up or down 
    if( minutes >= 60.0 ) {
        minutes = minutes - 60.0;
        degrees = degrees + sign;
    }
    
    if( Math.abs(degrees) >= 360.0)  {
        degrees = degrees - sign*360.0;
    }

    var str = "" + degrees + "° " + minutes + "\' " + secs.toFixed(decimalPlaces) + "\"";
    // alert("returning " + str);
    
    return str;
};

MARCONI.map.decimalDegreesToDM = function (decimalValue, decimalPlaces) {
    if( decimalPlaces === undefined || decimalPlaces === null ) {
        decimalPlaces=5;
    }

    var sign = (decimalValue > 0 ? 1.0 : -1.0 );

    if( Math.abs(decimalValue) > 360.0 ) {
        throw ("decimalDegreesToDM(): angle of " + decimalValue + " out of bounds");
    }

    var degrees = sign * Math.floor(Math.abs(decimalValue));   // e.g., if decimalvalue is -122.5, degrees is -122

    decimalValue = Math.abs(decimalValue) - Math.abs(degrees);

    var minutes = decimalValue * 60.0;

    // if minutes exceed 60, reduce them and bump degrees up or down
    if( minutes >= 60.0 ) {
        minutes = minutes - 60.0;
        degrees = degrees + sign;
    }

    if( Math.abs(degrees) >= 360.0) {
        degrees = degrees - sign*360.0;
    }
    
    var str = "" + degrees + "° " + minutes.toFixed(decimalPlaces) + "\'";
    //alert("returning " + str);

    return str;
};

// Given ellipsoid constants, and a set of lat/long points in degrees, compute great-circle distances
// and assign to the passed GeoPoint object
MARCONI.map.greatCircleArcLengths = function (equitorialAxis, eSquared, latitude1, longitude1, latitude2, longitude2, ptDelta) {
    try {

        if( !ptDelta || !(ptDelta instanceof MARCONI.map.GeoPoint) ) {
            throw("Parameter ptDelta must be an object of type GeoPoint");
        }
    
        var averageLatitude = 0.5 * (latitude1 + latitude2) * MARCONI.map.DEGREES_TO_RADIANS;

        ptDelta.y = MARCONI.map.DEGREES_TO_RADIANS * Math.abs(equitorialAxis *
            (1.0 - eSquared) / Math.pow (1.0 - eSquared * Math.sin(averageLatitude) * Math.sin(averageLatitude), 1.5) *
            Math.abs(latitude2 - latitude1));

        ptDelta.x = Math.abs(equitorialAxis * Math.cos(averageLatitude) / Math.sqrt(1.0 - eSquared * Math.sin(averageLatitude) * Math.sin(averageLatitude)) * Math.abs(longitude2 - longitude1) * MARCONI.map.DEGREES_TO_RADIANS);

        // provide correct sense of signs

        if( longitude1 < 0.0) {  // positive east sign convention (we assume we're in California)
            if( longitude2 < longitude1 ) { // if we moved westward
                ptDelta.x = -1 * ptDelta.x;
            }
        }
        else  { // positive west convention
            if( longitude2 > longitude1 ) {
                ptDelta.x = -1 * ptDelta.x;
            }
        }

        if( latitude1 > 0.0 )  { // above equator
            if( latitude2 < latitude1 ) {
                ptDelta.y  = -1 * ptDelta.y;
            }
        }
        else {
            if( latitude2 > latitude1 ) {
                ptDelta.y = -1 * ptDelta.y;
            }
        }
    }
    catch(ex) {
        alert("Error in MARCONI.map.greatCircleArcLengths(): " + ex);
    }

};

// Crude units conversion function
// supports just the basics
MARCONI.map.linearUnitsConversion = function (valIn, unitsIn, unitsOut)
{
    try {
        var valOut=valIn;
        var badUnits = false;


        // convert to meters first
        switch(unitsIn) {
            case MARCONI.map.UNITS_SURVEYFEET:
                valOut = valIn * MARCONI.map.SURVEY_FEET_TO_METERS;
                break;

            case MARCONI.map.UNITS_INTERNATIONALFEET:
                valOut = valIn * MARCONI.map.INTERNATIONAL_FEET_TO_METERS;
                break;

            case MARCONI.map.UNITS_MILES:
                valOut = valIn * MARCONI.map.SURVEY_FEET_TO_METERS * 5280;
                break;

            case MARCONI.map.UNITS_METERS:
                break;

            case MARCONI.map.UNITS_KILOMETERS:
                valOut = 1000 * valIn;
                break;

            default:
                badUnits = true;
        }

        if( badUnits ) {
            throw "Unrecognized input unit code " + unitsIn;
        }

        // then convert meters to desired units

        switch( unitsOut ) {
            case MARCONI.map.UNITS_SURVEYFEET:
                valOut = valOut / MARCONI.map.SURVEY_FEET_TO_METERS;
                break;

            case MARCONI.map.UNITS_INTERNATIONALFEET:
                valOut = valOut / MARCONI.map.INTERNATIONAL_FEET_TO_METERS;
                break;

            case MARCONI.map.UNITS_MILES:
                valOut = (valOut / MARCONI.map.SURVEY_FEET_TO_METERS) / 5280.0;
                break;

            case MARCONI.map.UNITS_METERS:
                break;

            case MARCONI.map.UNITS_KILOMETERS:
                valOut = valOut/1000.0;
                break;

            default:
                badUnits = true;
        }


            
        if( badUnits ) {
            throw ("Unrecognized output unit code " + unitsOut);
        }

        return valOut;
    }
    catch(ex) {
        throw("MARCONI.map.linearUnitsConversion() error: " + ex);
    }
};
MARCONI.map.isDegrees = function(str) {
    try {
        var deg = MARCONI.map.DMStoDecimalDegrees(str);
        if( typeof(deg) == "number" && Math.abs(deg) <= 360.0001 ) {
            return true;
        }
        return false;
    }
    catch(ex) {
        return false;
    }
};

// Given a string, convert any degree-minutes-seconds formats
// and return decimal degrees.  
MARCONI.map.DMStoDecimalDegrees = function(str) {
    var decimalDegrees="";

    try {
        if( typeof(str) !== "string" || str.length === 0 ) {
            return str;
        }

        str = str.trim();
        
        // MARCONI.stdlib.log("parsing " + str);
        
        // parse DMS, components are:
        // 1. degrees with optional sign
        // 2. minutes (allowed if degrees are specified as integer)
        // 3. seconds (allowed if minutes are specified as integer)
        // 4. optional letter or word to indicate west|east|north|south, west and south are equivalent to negative degrees
//°

        var REGEX="^([\\d\\+\\-.]+)[\\^d°]?[\\s]*([\\d.]*)[\'′]?[\\s]*([\\d.]*)[\"″]?[\\s]*(West?|East?|North?|South?|W?|E?|N?|S?)$";

        var p = new RegExp(REGEX, "i"); // case-insensitive

        var m = p.exec(str);

        if( m && m.length == 5) {
            //for( var i = 1 ; i < m.length ; i++) {
            //    MARCONI.stdlib.log("Part " + i +": " + m[i]);
            //}

            
            var isNegative = m[1].indexOf("-") >= 0;

            decimalDegrees = Math.abs(parseFloat( m[1] ));

            if( decimalDegrees > 360.0 ) {
                throw "Degrees of " + m[1] + " out of bounds, absolute value must be [0-360]";
            }

            if( m[4] ) {
                if( isNegative ) {
                    throw "Illegal format, either sign or letter (W,E,S,N) may be specified to indicate direction, but not both."
                }
                switch(m[4].toUpperCase().substring(0,1)) {
                    case "W":
                    case "S":
                        isNegative = true;
                        //MARCONI.stdlib.log("Sign reversed to handle W or S letter");
                        break;

                }
            }
        
            var minutes = m[2];

            var seconds = m[3];

            if( m[1].indexOf(".") >= 0 && (minutes || seconds) ) {
                throw "If decimal degrees are used, may not supply minutes or seconds";
            }
            
            if( minutes.indexOf(".") >= 0 && seconds ) {
                throw "If decimal minutes are used, may not supply seconds";
            }


            if( minutes ) {
                var minutesFloat = parseFloat(minutes);
                if( minutesFloat > 60 ) {
                    throw "Minutes of " + minutes + " out of bounds, must be [0-60]";
                }
                decimalDegrees += minutesFloat/60.0;

            }

            if( seconds ) {
                var secondsFloat = parseFloat(seconds);
                if( secondsFloat > 60 ) {
                    throw "Seconds of " + minutes + " out of bounds, must be [0-60]";
                }
                decimalDegrees += secondsFloat/3600.0;
            }

            if( isNegative ) {
                decimalDegrees *= -1.0;
            }

            //MARCONI.stdlib.log("Parsed as " + decimalDegrees + ", based on " + minutes + "\' and " + seconds + "\"");
        
            
        }
        else {
            throw("Invalid format in " + str + ".  Acceptable formats include decimal degrees, degrees minutes, degrees minutes seconds.  W and S suffix indicates negative values.");
        }

    }
    catch(ex) {
        throw("Unable to convert " + str + " to decimal degrees, error is " + ex);
    }

    return decimalDegrees;
};

MARCONI.map.trueDistanceAlongCentralMeridian = function (equitorialAxis, eSquared, latitude)
{
    // latitude must be passed in radians, returns in the units of equitorialAxis

    return equitorialAxis * (
            (1 - eSquared / 4 - 3 * eSquared * eSquared / 64 - 5 * Math.pow(eSquared,3)/ 256) * latitude -
            (3 * eSquared / 8 + 3 * eSquared * eSquared / 32 + 45 * Math.pow(eSquared, 3) / 1024) * Math.sin(2 * latitude) +
            (15 * eSquared * eSquared  / 256 + 45 * Math.pow(eSquared, 3) / 1024) * Math.sin(4 * latitude) -
            (35 * Math.pow(eSquared,3) / 3072) * Math.sin(6 * latitude));

};

MARCONI.map.metersBetween = function (pt1, pt2, earthRadius, method) {
    if( !pt1 || !pt2 || typeof(pt1.x)=="undefined" || typeof(pt2.x) == "undefined" || typeof(pt1.y)=="undefined" || typeof(pt2.y) == "undefined") {
        throw "Missing inputs to metersBetween() -- it needs two GeoPoints holding lat-longs";
    }
    if( !earthRadius ) {
        earthRadius = MARCONI.map.RADIUS_WGS84_METERS;
    }
    return earthRadius * MARCONI.map.radiansBetween(pt1, pt2, method);
};
MARCONI.map.toRadians = function(degrees) {
    return degrees * MARCONI.map.DEGREES_TO_RADIANS;
}


MARCONI.map.radiansBetween = function(pt1, pt2, method) {
    
    function haverSine(degrees) {
        var val = Math.sin( 0.5 * MARCONI.map.toRadians(degrees));
        return val*val;
    }
    function haverSineRads(pt1, pt2) {
        return 2.0 * Math.asin(Math.sqrt(

                haverSine(pt1.y-pt2.y) +
                Math.cos(MARCONI.map.toRadians(pt1.y)) * Math.cos(MARCONI.map.toRadians(pt2.y)) * 
                    haverSine(pt1.x-pt2.x)

                ));
    }
    function vincentyRads() {
        // well-known Vincenty formula is considered generally superior to Haversine
        // particularly in polar regions

        var numerator = Math.sqrt(
                Math.pow( Math.cos(MARCONI.map.toRadians(pt2.y)) *
                          Math.sin(MARCONI.map.toRadians(pt1.x-pt2.x))
                          ,2.0) +
                Math.pow(
                    Math.cos(MARCONI.map.toRadians(pt1.y)) * Math.sin(MARCONI.map.toRadians(pt2.y)) -
                    Math.sin(MARCONI.map.toRadians(pt1.y)) * Math.cos(MARCONI.map.toRadians(pt2.y)) * Math.cos(MARCONI.map.toRadians(pt2.x-pt1.x))
                    ,2.0)
                    );

        var denominator = Math.sin(MARCONI.map.toRadians(pt1.y))*Math.sin(MARCONI.map.toRadians(pt2.y)) +
                Math.cos(MARCONI.map.toRadians(pt1.y)) * Math.cos(MARCONI.map.toRadians(pt2.y)) *
                Math.cos(MARCONI.map.toRadians(pt2.x-pt1.x));
        
        return Math.atan2(numerator, denominator);
    }
    try {

        if( !pt1 || !pt2 || typeof(pt1.x)=="undefined" || typeof(pt2.x) == "undefined" || typeof(pt1.y)=="undefined" || typeof(pt2.y) == "undefined") {
            throw "Missing inputs to radiansBetween() -- it needs two GeoPoints holding lat-longs";
        }

        var rads = null;
        
        switch(method) {
            case "LAW_OF_COSINES":
                rads= Math.acos(
                    Math.sin(pt1.y*MARCONI.map.DEGREES_TO_RADIANS) * Math.sin(pt2.y*MARCONI.map.DEGREES_TO_RADIANS) +
                    Math.cos(pt1.y*MARCONI.map.DEGREES_TO_RADIANS) * Math.cos(pt2.y*MARCONI.map.DEGREES_TO_RADIANS) * Math.cos((pt2.x-pt1.x)*MARCONI.map.DEGREES_TO_RADIANS));
                break;
            
            case "HAVERSINE":
                rads = haverSineRads(pt1, pt2);
                break;
                
            case "VINCENTY":
            default:
                rads = vincentyRads(pt1, pt2);
                
        }
        
        return rads;
    }
    catch(ex) {
        throw "Error computing radian distance between two points of lat-long " + pt1.y + ", " + pt1.x + " and " + pt2.y + ", " + pt2.x + ", error is: " + ex;
    }
};

MARCONI.map.polygonPerimeter = function (ptList, earthRadius) {
    if( !ptList) {
        throw "Missing required array of GeoPoints to polygonPerimeter";
    }
    if( !earthRadius ) {
        earthRadius = MARCONI.map.RADIUS_WGS84_METERS;
    }

    var radiansPerimeter=0.0;

    for( var i = 0 ; i < ptList.length-1 ; i++) {
        radiansPerimeter += this.radiansBetween(ptList[i], ptList[i+1]);
    }

    return earthRadius * radiansPerimeter;
};
MARCONI.map.haverSine = function(theta) {
    return 0.5 * (1.0 - Math.cos(theta));
};

MARCONI.map.polygonArea = function (ptList, earthRadius) {
    if( !ptList) {
        throw "Missing required array of GeoPoints to polygonArea";
    }
    if( !earthRadius ) {
        earthRadius = MARCONI.map.RADIUS_WGS84_METERS;
    }

    // compute area of geodesic polygon using method by Chamberlain and Duquette
    // The returned area is in whatever units the radius is provided in, by default square meters
    // note that final array item by convention should be a repeat of the first item, so vertex count is one less than array length.
    // This could be a bad thing to overlook.
    // And of course the geopoints should be loaded with latitude in x, longitude in y, in degrees.

    var area        = 0.0;
    var vertexCount = ptList.length-1;

    for( var i = 1 ; i <= vertexCount ; i++) {
        var latitude = ptList[i].y;

        var prior      = i-1;  // duh
        var next      = (i+1) % vertexCount;  // wrap back as needed

        var longPrior  = ptList[prior].x;
        var longNext   = ptList[next].x;

        area += ((longNext - longPrior) * Math.sin( MARCONI.map.DEGREES_TO_RADIANS * latitude ));
    }
    area = Math.abs(MARCONI.map.DEGREES_TO_RADIANS * area * earthRadius * earthRadius * 0.5);

    //MARCONI.stdlib.log("area=" + area + " with radius " + earthRadius);

    return area;
};

MARCONI.map.polygonArea2 = function (ptList, earthRadius) {
    // very complex method for polygon area
    // seems to give same answer as the shorter, simpler one by Chamberlain

    if( !ptList) {
        throw "Missing required array of GeoPoints to polygonArea";
    }
    if( !earthRadius ) {
        earthRadius = MARCONI.map.RADIUS_WGS84_METERS;
    }

    var area=0.0;
    var vertexCount=ptList.length-1;

    var lam1, lam2;
    var beta1, beta2, cosB1, cosB2;


    for( var i = 0 ; i < vertexCount ; i++) {
        if( i==0 ) {
            lam1  = ptList[i].x * MARCONI.map.DEGREES_TO_RADIANS;
            beta1 = ptList[i].y * MARCONI.map.DEGREES_TO_RADIANS;
            lam2  = ptList[i+1].x * MARCONI.map.DEGREES_TO_RADIANS;
            beta2 = ptList[i+1].y * MARCONI.map.DEGREES_TO_RADIANS;
            cosB1 = Math.cos(beta1);
            cosB2 = Math.cos(beta2);
        }
        else {
            var k = (i+1) % vertexCount;
            lam1  = lam2;
            beta1 = beta2;
            lam2  = ptList[k].x * MARCONI.map.DEGREES_TO_RADIANS;
            beta2 = ptList[k].y * MARCONI.map.DEGREES_TO_RADIANS;
            cosB1 = cosB2;
            cosB2 = Math.cos(beta2);
        }

        if( lam1 != lam2 ) {
            var hav = this.haverSine(beta2 - beta1) +
                cosB1*cosB2 * this.haverSine(lam2 - lam1);
            
            var a = 2.0 * Math.asin(Math.sqrt(hav));
            var b = 0.5 * Math.PI - beta2;
            var c = 0.5 * Math.PI - beta1;
            var s = 0.5 * (a+b+c);
            var t = Math.tan(0.5*s) * Math.tan(0.5*(s-a)) * Math.tan(0.5*(s-b)) * Math.tan(0.5*(s-c));

            var excess = Math.abs(4.0 * Math.atan(Math.sqrt(Math.abs(t))));

            if( lam2 < lam1 ) {
                excess = -1 * excess;
            }
            area += excess;
        }

    }
    area = Math.abs(area) * earthRadius * earthRadius;

    //MARCONI.stdlib.log("area=" + area + " with radius " + earthRadius);

    return area;
};


// Generic units conversion works on linear and aerial units alike
MARCONI.map.unitsConversion = function (valIn, unitsIn, unitsOut)
{
    try {
        var unitInRef  = (typeof(unitsIn)  == "string" ? MARCONI.map.mapUnitGivenCode(unitsIn)  : unitsIn);
        var unitOutRef = (typeof(unitsOut) == "string" ? MARCONI.map.mapUnitGivenCode(unitsOut) : unitsOut);

        if( !unitInRef ) {
            throw "Unknown input units " + unitsIn + " passed";
        }
        if( !unitOutRef ) {
            throw "Unknown output units " + unitsOut + " passed";
        }

        if( !unitOutRef ) {
            throw "Unknown output units passed";
        }

        if( (unitInRef.isLinear && !unitOutRef.isLinear) || (!unitInRef.isLinear && unitOutRef.isLinear) ||
            (unitInRef.isAreal && !unitOutRef.isAreal) || (!unitInRef.isAreal && unitOutRef.isAreal)) {

            throw "Units mismatched between linear and aerial, input is " + unitsIn + " and output is " + unitsOut;
        }

        if( !unitInRef.metersPerUnit || !unitOutRef.metersPerUnit ) {
            throw "Units in conversion lack metersPerUnit definitions";
        }

        var valOut = valIn * unitInRef.metersPerUnit / unitOutRef.metersPerUnit;

        //MARCONI.stdlib.log("Converted " + valIn + " " + unitsIn + " to " + valOut +  " " + unitsOut);

        return valOut;
    }
    catch(ex) {
        throw("MARCONI.map.unitsConversion() error: " + ex);
    }
};
MARCONI.map.toMeters = function(dist, linearUnitCD) {
    try {
        return MARCONI.map.unitsConversion(dist, linearUnitCD, MARCONI.map.UNITS_METERS);
    }
    catch(ex) {
        throw("Error converting " + dist + " " + linearUnitCD + " to meters: " + ex);
    }
};

MARCONI.map.fromMeters = function(dist, linearUnitCD) {
    try {
        return MARCONI.map.unitsConversion(dist, MARCONI.map.UNITS_METERS, linearUnitCD);
    }
    catch(ex) {
        throw("Error converting " + dist + " meters to " + linearUnitCD + ": " + ex);
    }
};
