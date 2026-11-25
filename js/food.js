// Food photos for the Style tab, and each portion's real-life size in inches (its longest side).
// alts: extra photos of the same food, picked per piece so repeated items look varied.
// Foods without a photo yet are drawn with their emoji at the same size.
var FOOD = {
 "Prosciutto": {
  "img": "img/food/prosciutto-2.webp",
  "size": 4.5,
  "alts": [
   "img/food/prosciutto-2.webp",
   "img/food/prosciutto-1.webp"
  ]
 },
 "Salami": {
  "img": "img/food/salami-1.webp",
  "size": 4,
  "alts": [
   "img/food/salami-1.webp",
   "img/food/salami-2.webp"
  ]
 },
 "Soppressata": {
  "img": "img/food/salami-2.webp",
  "size": 4
 },
 "Coppa": {
  "img": null,
  "size": 4
 },
 "Bresaola": {
  "img": null,
  "size": 4
 },
 "Pepperoni": {
  "img": "img/food/pepperoni.webp",
  "size": 3.5
 },
 "Chorizo": {
  "img": null,
  "size": 4
 },
 "Mortadella": {
  "img": null,
  "size": 4.5
 },
 "Brie": {
  "img": "img/food/brie.webp",
  "size": 4.5
 },
 "Aged Cheddar": {
  "img": "img/food/cheddar-1.webp",
  "size": 3.5,
  "alts": [
   "img/food/cheddar-1.webp",
   "img/food/cheddar-2.webp"
  ]
 },
 "Manchego": {
  "img": "img/food/manchego-2.webp",
  "size": 4,
  "alts": [
   "img/food/manchego-2.webp",
   "img/food/manchego-1.webp"
  ]
 },
 "Gouda": {
  "img": "img/food/gouda-1.webp",
  "size": 4,
  "alts": [
   "img/food/gouda-1.webp",
   "img/food/gouda-2.webp"
  ]
 },
 "Gorgonzola": {
  "img": null,
  "size": 3.5
 },
 "Goat Cheese": {
  "img": "img/food/goat-cheese.webp",
  "size": 4
 },
 "Gruyere": {
  "img": null,
  "size": 3.5
 },
 "Parmigiano": {
  "img": null,
  "size": 3.5
 },
 "Grapes": {
  "img": "img/food/red-grapes.webp",
  "size": 5.5,
  "alts": [
   "img/food/red-grapes.webp",
   "img/food/green-grapes.webp"
  ]
 },
 "Strawberries": {
  "img": "img/food/strawberries-1.webp",
  "size": 3.5,
  "alts": [
   "img/food/strawberries-1.webp",
   "img/food/strawberries-2.webp"
  ]
 },
 "Blackberries": {
  "img": "img/food/blackberries.webp",
  "size": 3
 },
 "Raspberries": {
  "img": "img/food/raspberries.webp",
  "size": 3
 },
 "Blueberries": {
  "img": "img/food/blueberries.webp",
  "size": 3
 },
 "Figs": {
  "img": "img/food/figs-2.webp",
  "size": 3,
  "alts": [
   "img/food/figs-2.webp",
   "img/food/figs-1.webp"
  ]
 },
 "Mango": {
  "img": "img/food/mango.webp",
  "size": 3.5
 },
 "Pineapple": {
  "img": "img/food/pineapple.webp",
  "size": 4
 },
 "Blood Orange": {
  "img": "img/food/orange.webp",
  "size": 3
 },
 "Clementines": {
  "img": "img/food/orange-2.webp",
  "size": 3.5
 },
 "Seasonal Melon": {
  "img": null,
  "size": 4.5
 },
 "Olives": {
  "img": "img/food/olives.webp",
  "size": 3
 },
 "Cornichons": {
  "img": "img/food/cornichons.webp",
  "size": 3
 },
 "Cherry tomatoes": {
  "img": "img/food/cherry-tomatoes.webp",
  "size": 3
 },
 "Apple slices": {
  "img": "img/food/apple.webp",
  "size": 3.5
 },
 "Pear": {
  "img": "img/food/pear.webp",
  "size": 3.5
 },
 "Water crackers": {
  "img": "img/food/crackers.webp",
  "size": 4
 },
 "Sourdough crisps": {
  "img": "img/food/crackers-2.webp",
  "size": 4
 },
 "Rye crisps": {
  "img": null,
  "size": 4
 },
 "Crostini": {
  "img": "img/food/crackers-2.webp",
  "size": 4
 },
 "Fig crackers": {
  "img": null,
  "size": 3.5
 },
 "Pita chips": {
  "img": null,
  "size": 4
 },
 "Multigrain crackers": {
  "img": "img/food/crackers.webp",
  "size": 4
 },
 "Honeycomb": {
  "img": "img/food/honeycomb.webp",
  "size": 3
 },
 "Marcona almonds": {
  "img": "img/food/almonds.webp",
  "size": 2.5
 },
 "Walnuts": {
  "img": null,
  "size": 2.5
 },
 "Dark chocolate": {
  "img": "img/food/dark-chocolate.webp",
  "size": 2.5
 },
 "Dried apricots": {
  "img": "img/food/dried-apricots.webp",
  "size": 2.5
 },
 "Candied pecans": {
  "img": "img/food/pecans.webp",
  "size": 2.5
 },
 "Pistachios": {
  "img": "img/food/pistachios.webp",
  "size": 2.5
 },
 "Dijon mustard": {
  "img": null,
  "size": 2.5
 },
 "Fig jam": {
  "img": "img/food/jam-1.webp",
  "size": 2.5
 },
 "Strawberry jam": {
  "img": "img/food/jam-1.webp",
  "size": 2.5
 },
 "Apricot jam": {
  "img": "img/food/jam2.webp",
  "size": 2.5
 },
 "Hot honey": {
  "img": "img/food/honey.webp",
  "size": 2.5
 },
 "Hummus": {
  "img": "img/food/hummus.webp",
  "size": 3
 },
 "Pesto": {
  "img": null,
  "size": 2.5
 },
 "Berry preserve": {
  "img": "img/food/jam-1.webp",
  "size": 2.5
 },
 "Grainy mustard": {
  "img": "img/food/grainy-mustard.webp",
  "size": 2.5
 },
 "Truffle honey": {
  "img": "img/food/honey.webp",
  "size": 2.5
 },
 "Pate": {
  "img": null,
  "size": 3
 },
 "Duck rillettes": {
  "img": null,
  "size": 3
 },
 "Caviar": {
  "img": null,
  "size": 2.5
 },
 "Smoked salmon": {
  "img": null,
  "size": 4.5
 },
 "Truffle salami": {
  "img": null,
  "size": 4
 },
 "Foie gras": {
  "img": null,
  "size": 3
 },
 "Jamon Iberico": {
  "img": null,
  "size": 4.5
 },
 "Nduja": {
  "img": null,
  "size": 3
 },
 "Beef sticks": {
  "img": "img/food/beef-sticks.webp",
  "size": 5
 }
};
// Custom ingredients use the photo of a similar item from the same group.
var CATEGORY_FALLBACK = {"meats": "Salami", "cheeses": "Gouda", "produce": "Grapes", "crackers": "Water crackers", "accents": "Marcona almonds", "spreads": "Fig jam", "specialty": "Pate"};
