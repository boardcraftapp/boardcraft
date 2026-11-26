// Simple line icons used in the tab bar and on the Home tiles. Each one is drawn with the current text color.
var ICONS = {
  home: '<path d="M4 11l8-6.5 8 6.5V20h-5.5v-5h-5v5H4z"/>',
  qty: '<path d="M12 4v16M6 8h12M6 8l-3 6a3 3 0 0 0 6 0zM18 8l-3 6a3 3 0 0 0 6 0zM8 20h8"/>',
  board:
    '<ellipse cx="11" cy="13" rx="8.5" ry="6"/><path d="M19 11.5l3-2"/><circle cx="8" cy="12" r="1.2" fill="currentColor"/><circle cx="12.5" cy="14.5" r="1.2" fill="currentColor"/><circle cx="13" cy="10.5" r="0.9" fill="currentColor"/>',
  style:
    '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-1 1.5-2.2-.6-1.4.2-2.8 1.8-2.8H18a3 3 0 0 0 2.5-3A8.6 8.6 0 0 0 12 3.5z"/><circle cx="7.5" cy="11" r="1.2" fill="currentColor"/><circle cx="10.5" cy="7.5" r="1.2" fill="currentColor"/><circle cx="15" cy="8" r="1.2" fill="currentColor"/>',
  recipes: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M9 9h6M9 12.5h6"/>',
  shop: '<path d="M3 5h2.5l2 10h10l2-7H7"/><circle cx="9" cy="19" r="1.3" fill="currentColor"/><circle cx="16" cy="19" r="1.3" fill="currentColor"/>',
  cost: '<circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.2c-.5-1-1.6-1.6-2.8-1.6-1.6 0-2.8.9-2.8 2.2 0 3 5.8 1.5 5.8 4.4 0 1.3-1.3 2.2-3 2.2-1.3 0-2.5-.6-3-1.7M12 6v1.6M12 16.4V18"/>',
  flavor: '<path d="M12 3.5c3 4 6 7.4 6 10.5a6 6 0 0 1-12 0c0-3.1 3-6.5 6-10.5z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
  community: '<path d="M12 19.5s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10z"/>',
  tools: '<path d="M4 20l9-9M14.5 4.5l5 5-4 4-5-5z"/><path d="M6.5 13.5l4 4"/>',
  export: '<path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 13v6h14v-6"/>',
  tips: '<path d="M9 17h6M10 20.5h4M12 3.5a6 6 0 0 0-3.5 10.9V17h7v-2.6A6 6 0 0 0 12 3.5z"/>',
  guests:
    '<circle cx="9" cy="9" r="3.2"/><circle cx="16.5" cy="10" r="2.5"/><path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5M14.5 15.2c2.6-.6 4.9.7 5.8 3.8"/>',
  inspo: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M4 17l5-5 4 4 2.5-2.5L20 18"/><circle cx="15.5" cy="9" r="1.4" fill="currentColor"/>',
  notes: '<path d="M6 3.5h9l4 4v13H6z"/><path d="M9 11h7M9 14.5h7M9 18h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  trash: '<path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/>',
  cal: '<rect x="4" y="5.5" width="16" height="15" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
};
function icon(name, size) {
  var s = size || 22;
  return (
    '<svg class="ico" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (ICONS[name] || "") +
    "</svg>"
  );
}
// The BoardCraft sunrise: an orange sun with one ray in each confetti color.
var SUN_SVG =
  '<svg class="sun" viewBox="0 0 32 20" aria-hidden="true"><path d="M9 19a7 7 0 0 1 14 0z" fill="#ff8a3d"/><g stroke-width="2.6" stroke-linecap="round"><path d="M16 1.8v5" stroke="#ffd23f"/><path d="M6.2 5.6l3 3" stroke="#d63c74"/><path d="M25.8 5.6l-3 3" stroke="#3fc1a5"/><path d="M1.8 14.5h3.6" stroke="#9b8cf2"/><path d="M26.6 14.5h3.6" stroke="#d63c74"/></g></svg>';
