# MGRS Mapper
Drag and drop custom generated NATO military symbols onto Google Maps with an MGRS overlay.
![MGRS Mapper Screenshot](https://i.imgur.com/zwBViaX.jpg "MGRS Mapper Screenshot")

## Live Demo
[Click Here See it in Action](https://pistell.github.io/MGRS-Mapper/index.html)

## About
Special thanks for this project goes out to Måns Beckman's of [Spatial Illusions MilSymbol Generator](https://github.com/spatialillusions/milsymbol-generator) and Mike D's [USNG-Gmap-V3](https://github.com/mmdolbow/usng-gmap-v3). Without their open source contributions this project would have taken much longer.

MGRS Mapper is a replacement for the popular website Hawg View, but with added functionality. Users can search and select from hundreds of military map symbols for the MIL-STD 2525C standard. Once your unit is selected you can add more information to it, such as unit size, affiliation (friendly, enemy, templated/suspected, etc). When you have all the data you need for your unit you can drag and drop it onto Google Maps for operations planning. Click on the unit to display more information about it or delete it if you choose. Toggle the MGRS overlay at the top of the sidebar to create a highly detailed concept of operations.

## Installing
```
git clone https://github.com/pistell/MGRS-Mapper.git
```
Open index.html in your text editor and replace Google Map's API key with your own


## Libraries, Plugins and Repositories Used

+ [jQuery 3.3.1](http://jquery.com)
+ [jQuery UI 1.11.1](http://jqueryui.com/)
+ [Bootstrap 4.0.0](http://getbootstrap.com)
+ [USNG GMAP V3](https://github.com/mmdolbow/usng-gmap-v3)
+ [milsymbol.js](https://github.com/spatialillusions/milsymbol)
+ [Google Maps API V3](https://cloud.google.com/maps-platform/)

## TODO
- [ ] Symbol resize when unit designator information is input. Need to keep base symbol size the same
- [ ] Download buttons are in a terrible position. Using position: absolute and hiding them in CSS when screen gets too small. This needs to be fixed
- [ ] Mobile view for this sucks. Although it is not supposed to be used in mobile, there has to be some type of solution to enable jQuery UI to interact with onscreen touch
- [ ] Add sidebar with popular choice icons (OP, Infantry, Cavalry, Enemy Infantry)
- [ ] Would be nice to have FabricJS integration. Need to find another way to be able to rotate and resize the symbols once they are on the map
- [x] No-fill icon toggle
- [ ] Remove Bootstrap if it is not necessary
- [ ] Unit search does not work unless user hits the magnifying glass, need to figure out why the input box event listener does not work
- [ ] Tidy up the icon presets, do we really need 15 Affiliation types? The entire Status drop down can be deleted.
- [ ] Icon preview window should be a fixed div to enable viewing when the user scrolls down
- [ ] Icon generator sidebar should be able to be hidden on command to enable more screen for the map
- [ ] MGRS grid lines might be too thin to notice, consider making them stand out more
- [ ] Minify JS


## Built With
* [Atom](https://atom.io/)
* [Tears](http://i.imgur.com/pM1bLLX.jpg)

---
## Creators and Contributors

+ ##### James Pistell
  * ![James Pistell's GitHub Account](http://i.imgur.com/Myo5q9q.png "James Pistells GitHub Account") [GitHub](https://github.com/pistell)  
  * ![James Pistell's LinkedIn Account](http://i.imgur.com/Oq9lKwx.png "James Pistells LinkedIn Account") [LinkedIn](https://www.linkedin.com/in/jamespistell)

+ ##### Joseph Fusco
  * ![Joseph Fusco's GitHub Account](http://i.imgur.com/Myo5q9q.png "Joseph Fucsos GitHub Account") [GitHub](https://github.com/josephfusco)
  * ![Joseph Fusco's Website](http://i.imgur.com/HBak7o7.png "Joseph Fucsos Website") [Website](http://josephfus.co/)
