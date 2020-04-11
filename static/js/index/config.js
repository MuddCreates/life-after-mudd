// Fraction of the screen width taken up by the sidebar when we are
// in landscape mode.
export const sidebarWidthFraction = 0.3;

// Fraction of the screen height taken up by the sidebar when we are
// in portrait mode.
export const sidebarHeightFraction = 0.4;

// Number of pixels from the top of the screen that are considered
// occluded by the search bar. Calculated manually by inspecting the
// highest-level search bar wrapper element and doing offsetTop +
// offsetHeight. This should be changed if the CSS hacks in
// SearchBar.js are changed.
export const searchBarOcclusion = 36 + 20;

// Width of the search bar in pixels.
export const searchBarWidth = 333;

// Minimum number of pixels allowed for the map view before we
// force portait mode regardless of height. This was calculated by
// adding the search bar desired width to twice its padding. Again,
// change this if the CSS hacks in SearchBar.js are modified.
export const minLandscapeWidth = searchBarWidth + 40;
