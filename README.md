# MGRS Mapper

Drag and drop custom generated NATO military symbols onto Google Maps with an MGRS overlay.
![MGRS Mapper Screenshot](http://i.imgur.com/lozzh2W.jpg "MGRS Mapper Screenshot")

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
+ [jQuery UI Touch Punch 0.2.3](http://touchpunch.furf.com/)
+ [milsymbol.js](https://github.com/spatialillusions/milsymbol)
+ [USNG GMAP V3](https://github.com/mmdolbow/usng-gmap-v3)
+ [Google Maps API V3](https://cloud.google.com/maps-platform/)

## TODO

- [ ] Symbols resize differently when there is unit information input from user. Need to find a way to keep symbol shapes uniform
- [x] Download buttons are in a terrible position. Using position: absolute and hiding them in CSS when screen gets too small. This needs to be fixed
- [x] Mobile view for this sucks. Although it is not supposed to be used in mobile, there has to be some type of solution to enable jQuery UI to interact with onscreen touch
- [ ] Add sidebar with popular choice icons (OP, Infantry, Cavalry, Enemy Infantry)
- [ ] Would be nice to have FabricJS integration. Need to find another way to be able to rotate and resize the symbols once they are on the map. As of now, only SVG markers can be rotated.
- [x] No-fill icon toggle
- [x] Remove Bootstrap if it is not necessary
- [x] Unit search does not work unless user hits the magnifying glass, need to figure out why the input box event listener does not work
- [ ] Tidy up the icon presets, do we really need 15 Affiliation types? The entire Status drop down can be deleted.
- [x] Icon preview window should be a fixed div to enable viewing when the user scrolls down
- [ ] Icon generator sidebar should be able to be hidden on command to enable more screen for the map
- [ ] MGRS grid lines might be too thin to notice, consider making them stand out more
- [x] Minify JS
- [x] Beautify HTML
- [ ] Add sreeenshot functionality to the Google Maps canvas
- [ ] Change Suspect on Affiliation to “Suspect/templated”
- [x] Change Function ID to “Unit Type” and back to Function ID when Ground Installation is selected
- [ ] Remove Status from drop down
- [ ] Add project license.txt file
- [ ] Create a function to clone a map marker via the info window

## Built With

* [Atom](https://atom.io/)
* [Tears](http://i.imgur.com/pM1bLLX.jpg)

## Contributing

After cloning down the repository, run the following command within the root of the project:
```sh
npm install
```

This will install the project's development dependencies. To begin watching the files run:

```sh
npm start
```

Anytime changes are made to the js, scss, or main html file, [browsersync](https://browsersync.io/) will automatically reload the page.

If editing `js/milsymbol-unit-generator.js`, please be patient when saving as it will take a while for the file to compile because of it's size.

Note: Do no edit anything within the `dist/` directory as it will be overwritten when building. All edits should be from within `src/`.

---
## Creators and Contributors

+ [James Pistell](http://jamespistell.com)
+ [Joseph Fusco](https://josephfus.co)
