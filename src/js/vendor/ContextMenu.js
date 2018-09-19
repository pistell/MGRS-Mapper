/*
	ContextMenu v1.1
	
	A context menu for Google Maps API v3
	
	Original (1.0) by Martin Pearman
	http://code.martinpearman.co.uk/googlemapsapi/contextmenu/
	Last updated 21st November 2011
	developer@martinpearman.co.uk
	
	Fork (1.1) by Milos Milutinovic
	https://github.com/knezmilos13/google-maps-api-contextmenu
	
	This program is free software: you can redistribute it and/or modify it under the terms of the
	GNU General Public License as published by the Free Software Foundation, either version 3 of 
	the License, or (at your option) any later version.

	This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; 
	without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  
	See the GNU General Public License for more details.

	You should have received a copy of the GNU General Public License along with this program.  
	If not, see <http://www.gnu.org/licenses/>.
*/

/**
 * Creates a new ContextMenu
 * @constructor
 * @augments google.maps.OverlayView
 * @param {google.maps.Map} map
 *     The map in which the context menu will be shown
 * @param {object} options
 *     Additional options for customizing context menu. Possible values:
 *     - id (string) - optional ID for entire menu
 *     - classNames (object) - class names to be added to certain menu elements
 *         - menu (string) - class name to be added to the entire context menu
 *         - menuSeparator (string) - class name to be added to menu separators
 *         - menuItem (string) - class name to be added to menu items (can be overriden for each item)
 *     - menuItems (array) - array of objects that will be added to menu. If the object doesn't
 *       contain either label or eventName, it will be displayed as a separator, otherwise as
 *       menu item. Objects can include following attributes:
 *         - className (string) - optional class name that will be added to the menu item
 *         - eventName (string) - parameter used for detecting which menu item was selected
 *         - id (string) - optional id that will be added to the menu item
 *         - label (string) - text displayed on menu item.
 *     - pixelOffset (oogle.maps.Point) - how many pixels will the menu be offset from the mouse.
 *       Default offset value is (10, -5).
 *     - zIndex (int) - sets zIndex on the entire menu. Useful for making sure your menu doesn't
 *       get hidden under some other elements shown on map (markers, info windows...)
 */
function ContextMenu(map, options){
	options=options || {};
	
	this.setMap(map);
	this.map_=map;
	this.mapDiv_=map.getDiv();
	
	this.id = options.id;
	this.classNames_=options.classNames || {};
	this.menuItems_=options.menuItems || [];
	this.pixelOffset=options.pixelOffset || new google.maps.Point(10, -5);
	this.zIndex = options.zIndex || null;
}

ContextMenu.prototype=new google.maps.OverlayView();

ContextMenu.prototype.draw=function(){
	if(this.isVisible_){
		var mapSize=new google.maps.Size(this.mapDiv_.offsetWidth, this.mapDiv_.offsetHeight);
		var menuSize=new google.maps.Size(this.menu_.offsetWidth, this.menu_.offsetHeight);
		var mousePosition=this.getProjection().fromLatLngToDivPixel(this.position_);
		
		var left=mousePosition.x;
		var top=mousePosition.y;
		
		if(mousePosition.x>mapSize.width-menuSize.width-this.pixelOffset.x){
			left=left-menuSize.width-this.pixelOffset.x;
		} else {
			left+=this.pixelOffset.x;
		}
		
		if(mousePosition.y>mapSize.height-menuSize.height-this.pixelOffset.y){
			top=top-menuSize.height-this.pixelOffset.y;
		} else {
			top+=this.pixelOffset.y;
		}
		
		this.menu_.style.left=left+'px';
		this.menu_.style.top=top+'px';
	}
};

ContextMenu.prototype.getVisible=function(){
	return this.isVisible_;
};

ContextMenu.prototype.hide=function(){
	if(this.isVisible_){
		this.menu_.style.display='none';
		this.isVisible_=false;
	}
};

ContextMenu.prototype.onAdd=function(){
	function createMenuItem(values){
		var menuItem=document.createElement('div');
		menuItem.innerHTML=values.label;
		if (this.id) {
			menu.id = this.id;
		}
		if(values.className){
			menuItem.className = values.className || self.classNames_.menuItem;
		}
		if(values.id){
			menuItem.id=values.id;
		}
		menuItem.style.cssText='cursor:pointer; white-space:nowrap';
		menuItem.onclick=function(){
			google.maps.event.trigger($this, 'menu_item_selected', $this.position_, 
				values.eventName, $this.source);
			
			// Manually hide the menu because events are not allowed to propagate to map
			$this.hide();
		};
		return menuItem;
	}
	function createMenuSeparator(){
		var menuSeparator=document.createElement('div');
		if($this.classNames_.menuSeparator){
			menuSeparator.className=$this.classNames_.menuSeparator;
		}
		return menuSeparator;
	}
	var $this=this;	//	used for closures
	
	var menu=document.createElement('div');
	if(this.classNames_.menu){
		menu.className=this.classNames_.menu;
	}
	menu.style.cssText='display:none; position:absolute';
	if(this.zIndex != null) menu.style.zIndex = this.zIndex;
	
	
	// Turning off propagation of events down to the map
	var depropagator = function(e) {
		var evt = e ? e:window.event;
			if (evt.stopPropagation)    evt.stopPropagation();
			if (evt.cancelBubble!=null) evt.cancelBubble = true;
	};
	menu.onclick = depropagator;
	menu.onmouseover = depropagator;
	menu.onmousemove = depropagator;
	menu.onmouseenter = depropagator;
	menu.onmouseleave = depropagator;
	menu.onmouseout = depropagator;
	
	
	for(var i=0, j=this.menuItems_.length; i<j; i++){
		if(this.menuItems_[i].label && this.menuItems_[i].eventName){
			menu.appendChild(createMenuItem(this.menuItems_[i]));
		} else {
			menu.appendChild(createMenuSeparator());
		}
	}
	
	delete this.classNames_;
	delete this.menuItems_;
	
	this.isVisible_=false;
	this.menu_=menu;
	this.position_=new google.maps.LatLng(0, 0);
	
	google.maps.event.addListener(this.map_, 'click', function(mouseEvent){
		$this.hide();
	});
	
	this.getPanes().floatPane.appendChild(menu);
};

ContextMenu.prototype.onRemove=function(){
	this.menu_.parentNode.removeChild(this.menu_);
	delete this.mapDiv_;
	delete this.menu_;
	delete this.position_;
};

/**
 * Displays context menu.
 * @param {google.maps.LatLng} latLng
 *     Coordinates where to display menu (offset by options.pixelOffset)
 * @param {object} source
 *     Which map element was the source for displaying the context menu (e.g. user right-clicked
 *     a map marker). Will be passed to listeners listening for "menu_item_selected" event.
 */
ContextMenu.prototype.show=function(latLng, source){
	this.source = source;
	if(!this.isVisible_){
		this.menu_.style.display='block';
		this.isVisible_=true;
	}
	this.position_=latLng;
	this.draw();
};
