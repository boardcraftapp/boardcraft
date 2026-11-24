// Food photos for the Style tab, and each portion's real-life size in inches (its longest side).
// Foods without a photo yet are drawn with their emoji at the same size.
var FOOD = {
 "Prosciutto": {
  "img": null,
  "size": 4.5
 },
 "Salami": {
  "img": null,
  "size": 4
 },
 "Soppressata": {
  "img": null,
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
  "img": null,
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
  "img": null,
  "size": 4.5
 },
 "Aged Cheddar": {
  "img": null,
  "size": 3.5
 },
 "Manchego": {
  "img": null,
  "size": 4
 },
 "Gouda": {
  "img": null,
  "size": 4
 },
 "Gorgonzola": {
  "img": null,
  "size": 3.5
 },
 "Goat Cheese": {
  "img": null,
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
  "img": null,
  "size": 5.5
 },
 "Strawberries": {
  "img": null,
  "size": 3.5
 },
 "Blackberries": {
  "img": null,
  "size": 3
 },
 "Raspberries": {
  "img": null,
  "size": 3
 },
 "Blueberries": {
  "img": null,
  "size": 3
 },
 "Figs": {
  "img": null,
  "size": 3
 },
 "Mango": {
  "img": null,
  "size": 3.5
 },
 "Pineapple": {
  "img": null,
  "size": 4
 },
 "Blood Orange": {
  "img": null,
  "size": 3
 },
 "Clementines": {
  "img": null,
  "size": 3.5
 },
 "Seasonal Melon": {
  "img": null,
  "size": 4.5
 },
 "Olives": {
  "img": null,
  "size": 3
 },
 "Cornichons": {
  "img": null,
  "size": 3
 },
 "Cherry tomatoes": {
  "img": null,
  "size": 3
 },
 "Apple slices": {
  "img": null,
  "size": 3.5
 },
 "Pear": {
  "img": null,
  "size": 3.5
 },
 "Water crackers": {
  "img": null,
  "size": 4
 },
 "Sourdough crisps": {
  "img": null,
  "size": 4
 },
 "Rye crisps": {
  "img": null,
  "size": 4
 },
 "Crostini": {
  "img": null,
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
  "img": null,
  "size": 4
 },
 "Honeycomb": {
  "img": null,
  "size": 3
 },
 "Marcona almonds": {
  "img": null,
  "size": 2.5
 },
 "Walnuts": {
  "img": null,
  "size": 2.5
 },
 "Dark chocolate": {
  "img": null,
  "size": 2.5
 },
 "Dried apricots": {
  "img": null,
  "size": 2.5
 },
 "Candied pecans": {
  "img": null,
  "size": 2.5
 },
 "Pistachios": {
  "img": null,
  "size": 2.5
 },
 "Dijon mustard": {
  "img": null,
  "size": 2.5
 },
 "Fig jam": {
  "img": null,
  "size": 2.5
 },
 "Strawberry jam": {
  "img": null,
  "size": 2.5
 },
 "Apricot jam": {
  "img": null,
  "size": 2.5
 },
 "Hot honey": {
  "img": null,
  "size": 2.5
 },
 "Hummus": {
  "img": null,
  "size": 3
 },
 "Pesto": {
  "img": null,
  "size": 2.5
 },
 "Berry preserve": {
  "img": null,
  "size": 2.5
 },
 "Grainy mustard": {
  "img": null,
  "size": 2.5
 },
 "Truffle honey": {
  "img": null,
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
 }
};
// Custom ingredients use the photo of a similar item from the same group.
var CATEGORY_FALLBACK = {"meats": "Salami", "cheeses": "Gouda", "produce": "Grapes", "crackers": "Water crackers", "accents": "Walnuts", "spreads": "Fig jam", "specialty": "Pate"};
