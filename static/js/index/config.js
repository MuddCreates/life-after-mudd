// Fraction of the screen width taken up by the sidebar when we are
// in landscape mode.
export const sidebarWidthFraction = 0.3;

// Fraction of the screen height taken up by the sidebar when we are
// in portrait mode.
export const sidebarHeightFraction = 0.45;

// Visible height of the search bar in pixels. Calculated manually by
// inspecting the highest-level search bar wrapper element and
// checking offsetHeight.
export const searchBarHeight = 36;

// Number of pixels between the search bar and the side of the screen.
// Calculated manually by inspecting the highest-level search bar
// wrapper element and checking offsetTop.
export const searchBarPadding = 20;

// Number of pixels from the top of the screen that are considered
// occluded by the search bar.
export const searchBarOcclusion = searchBarPadding + searchBarHeight;

// Desired width of the search bar in pixels. It will be smaller than
// this if the screen is not big enough.
export const searchBarWidth = 333;

// Minimum number of pixels allowed for the map view before we
// force portait mode regardless of height. This was calculated by
// adding the search bar desired width to twice its padding. Again,
// change this if the CSS hacks in SearchBar.js are modified.
export const minLandscapeWidth = searchBarWidth + 40;
