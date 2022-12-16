export const trash =
				// openiconic icons or sprites in hyperlinks are only supported since the end of 2017
		//'<&trash>';	// openiconic
		//'&#128465;';	// Unicode WASTEBASKET	-> does not seem to work with the default font
		'&#9003;';	// Unicode ERASE TO THE LEFT

export function linkStyle(hideLinks) {
	return hideLinks ? `
		skinparam hyperlinkColor black
		skinparam hyperlinkUnderline false
	` : "";
}
