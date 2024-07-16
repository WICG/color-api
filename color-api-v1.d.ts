// Single component of a color
// `none` values are represented as `null`
type Component = number | null;

// Name of a single component.
// Same as the name used in Relative Colors.
type ComponentName = string;

// Any valid CSS color the browser supports
type CSSColorString = string;

export class Color {
	get colorSpace (): string // or object?
	get coords (): Component[]
	get alpha (): Component
	
	// Base constructor
	// colorSpace:
	// v1: Any of the color space ids the browser supports for CSS colors
	//    Their ids are defined in their respective specifications.
	// v2: will add ColorSpace objects and thus corresponding overloads
	constructor(colorSpace: ColorSpace | string, coords: Component[], alpha?: Component);

	// Parse a CSS color string
	constructor(colorString: CSSColorString);

	// Clones the color
	constructor(color: Color);

	// Get a coord in the color’s color space
	// v2+ will add overloads for getting a coord in a different color space (sugar for `color.to().get()`)
	get (coord: ComponentName): Component

	// Set a coord in the color’s color space
	// v2+ will add overloads for:
	// - object literal to set multiple coords
	// - `value: function(Coord): Coord`,
	// - Setting coords in a different color space
	set (coord: ComponentName, value: Component): void

	// Get all coords in the color’s color space
	// Clones and returns the coords array
	getAll (): Component[]

	// Set all coords in the color’s color space
	setAll (coords: Component[], alpha?: Component): void

	// Convert the color to a different color space
	// If the color space is the same, returns new Color(this)
	to (colorSpace: ColorSpace): Color

	// Get a CSS color string
	// v2+ will add options to customize the output
	toString (): CSSColorString

	// Parse a CSS color string
	static parse (colorString: CSSColorString): Color
}

// Stub. v2 will make this constructible
export class ColorSpace {
	get id (): string
}
