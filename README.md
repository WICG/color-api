# A native Color object for the Web Platform

## Why?

Many of Web Platform APIs need a WCG, HDR Color object:

- Canvas API (see [Canvas High Dynamic Range](https://github.com/w3c/ColorWeb-CG/blob/master/hdr_html_canvas_element.md))
- CSS OM
- SVG DOM
- HTML `<input type="color">` or its successor
- Eyedropper API
- WebGPU


## Use cases

- Color space conversion (e.g. LCH → P3)
- Color manipulation (e.g. making a color darker by reducing its LCH lightness) with choice of color space
- Interpolation (e.g. mixing two colors) with choice of color space
- Difference between two colors (ΔE)
- String parsing (e.g. what color is <code>rebeccapurple</code>?)
- WCAG relative luminance (for any color space, not just sRGB)
- Prototyping new functionality for incubation, before standardization
- Compositing and blending (possibly Level 2)

## Audience

Web developers with varying levels of Color Science knowledge.
Usabe without error by those with little, powerful for those with much.

## Goals

- Usability as a priority
    - Common things should be easy, complex things should be possible
    - <strong>Learnability:</strong> don't require a ton of color science knowledge to use
        - Handle linearization, chromatic adaptation automatically when needed
    - <strong>Efficiency:</strong> Avoid verbosity, have sensible defaults
    - <strong>Safety:</strong> Avoid error conditions if possible
    - Liberal in what is accepted (for arguments)
- Color-space agnostic
    - API should make no assumptions about number, names, or ranges of components
        - Ok to only support color spaces with numeric components
    - Should not privilege certain color spaces over others, whenever possible
    - Authors should be able to register new color spaces, either via a JS version of `@color-profile` or by directly providing conversion code to and from a supported color space.
    - Should be able to support HDR color spaces, and SDR → HDR conversion
    - No hidden gamut mapping or clipping
- D65 relative CIE XYZ connection space for SDR
    - (extended rec2020-linear will give same result)
    - Configurable media white level for HDR (203cd/m² default for absolute)
- Extensibility and introspection would be good

## Predefined color spaces

### SDR

All RGB spaces defined over extended range

- sRGB *(Web legacy compat)*
- sRGB-linear *(as used in Canvas HDR, some GPU)*
- display-p3 *(new Web)*
- a98-rgb *(?? needed, nowadays?)*
- prophoto-rgb *(from raw digital photos)*
- rec2020 *(streaming and broadcast)*
- rec2020-linear *(canvas uses as connection space)*
- xyz (relative, D65) *(for linear-light calculations)*
- lab (D50) *(perceptual calculations)*
- lch (D50) *(perceptual, chroma-preserving)*

### HDR

- rec2100-pq *(Netflix, Canvas HDR)*
- rec2100-hlg *(BBC, Canvas HDR)*


## API sketch

```webidl
[Exposed=(Window, Worker, PaintWorklet, LayoutWorklet)]
interface Color {
    constructor(
        (USVString or ColorSpace) colorspace,
        sequence<double> coords,
        optional double alpha = 1
    );
    constructor(USVString cssText);
    constructor(<Color or CSSColorValue> color);

    attribute USVString colorspace;
    attribute sequence<double> coords;
    attribute double alpha;

    // Get/set coordinates (in this or other color spaces)
    double get(USVString coord);
    undefined set(USVString coord, double value);

    // Convert to another color space
    Color to(USVString colorspace);

    // Check whether a color is in gamut of a given color space
    boolean inGamut(optional USVString colorspace);

    // Bring a color into gamut of a given colorspace
    Color toGamut(optional USVString colorspace, optional ToGamutOptions);

    USVString toString();
    object toJSON();

    static Color parse(USVString cssText);

    // Color difference
    double deltaE(<Color>, optional DeltaEMethod method);
};

[Exposed=(Window, Worker, PaintWorklet, LayoutWorklet)]
interface ColorSpace {
    readonly attribute USVString name;
    readonly attribute USVString? iccProfile;
    readonly attribute sequence<double> white;
    readonly attribute USVString? base;
    readonly attribute sequence<USVString> coords;

    constructor(name, ColorSpaceOptions options);

    // Creates a new ColorSpace object and registers it
    static ColorSpace create(name, ColorSpaceOptions options);
    static undefined register(ColorSpace colorspace);

    // Array of names for all registered color spaces
    static FrozenArray<USVString> names;

    // Get ColorSpace object by name
    static get(USVString name);

    const sequence<double> D65_WHITE = [0.3127, 0.3290];
    const sequence<double> D50_WHITE = [0.3457, 0.3585];
}

dictionary ColorSpaceOptions {
    USVString? iccProfile;
    sequence<double> white = ColorSpace.D65_WHITE;

    // Base color space, if this is a transformation
    USVString? base;

    sequence<USVString> coords; // coord names
};

dictionary ToGamutOptions {
    USVString? method = "lch.c";
}

// TODO: we want authors to be able to extend this
// If we keep it an enum, the only way to add custom deltaE methods
// is a separate method.
enum DeltaEMethod {
    "76";    // fast, but limited accuracy
    "2000";  // slower, but accurate
}
```

Issue: utility methods to alpha premultiply and un-premultiply?
Or just have this happen automatically during interpolation?
Lea: It should happen automatically

### Constructor

The `new Color(colorspace, coords, alpha)` constructor steps are:

1. [Look up](#colorspace-lookup) the `ColorSpace` object in the registry using the `colorspace` parameter.
    1. If the result is `null`, throw a `TypeError`
    2. Otherwise, set the color’s color space to it
2. If `coords` is not provided, create an array of zeroes with length equal to the number of coordinates in `colorspace`.
3. If `coords` is provided:
    1. If it's not an array, throw a `TypeError`.
    2. Create a clone of the array.
    3. If its length is greater than the number of coordinates in the color space, trim the excess numbers from the end.
    4. If its length is smaller than the number of coordinates in the color space, pad it with zeroes
    5. Set the color's `coords` to the cloned array.
6. If `alpha` is not a number, coerce it to a number, then set the color's `alpha` to this number.

TODO Describe the other constructor signatures

### Getting and setting coordinates

The `color.get()` and `color.set()` methods allow authors to read/write coordinates in the current color space or even other color spaces.
The string argument is a [coordinate reference](#coordinate-references).

`color.set(coord, value)` also accepts a value. If the value is a function, it is invoked immediately, with the result of `color.get(coord)` being passed as the first argument. If the result is a number, the corresponding coordinate is set to it.

Issue: Should we do something cool if the coord is set to a promise? What happens until the promise resolves? What if it's set to another value in the meantime?

### Color space lookup

Color spaces can be looked up either by `ColorSpace` object, or by `name`.
Implementations are expected to maintain an internal `Map` registry of color space names to objects, for fast lookups.

To look up a color space, follow the following steps:

1. If `needle` is a `ColorSpace` object, let `needle = needle.name`
2. If `needle` is a `USVString`, look up if there is an entry with that key in the internal Map of color names to `ColorSpace` objects.
4. Return the `ColorSpace` object, or `null`, if none is found

### Coordinate references

Many methods in this API accept a string that is a reference to a particular color space coordinate. These are the steps to resolve an arbitrary string into a color space and corresponding coordinate:

1. If string does not conform to `"[a-z-]+\.([a-z]+|\*)"` throw a `TypeError`
2. Let `colorspace` be the part of the string before `"."` and `coord` the part after.
3. [Look up the color space name](#colorspace-lookup) and set `colorspace` to the result
4. If `colorspace` is `null`, the coordinate is also `null` and the algorithm stops here.
5. Otherwise, look up `coord` in the color space's coordinate names. The coordinate index can be used to extract that coordinate from a list of coordinates.

## Example usage

### Parsing color and converting to a specific color space

Converting in place:

```js
let color = new Color("rebeccapurple");
color.colorspace; // "srgb";
color.coords; // [0.4, 0.2, 0.6]
color.colorspace = "lch";
color.coords; // [32.4, 61.2, 309]
```

By creating a new object:

```js
let color = new Color("rebeccapurple");
color.colorspace; // "srgb";
color.coords; // [0.4, 0.2, 0.6]
let lchColor = color.to("lch");
lchColor.coords; // [32.4, 61.2, 309]
```

### Lightening a color without changing its color space

```js
color.set("lch.l", color.get("lch.l") * 1.2);
```

Another possibility for relative manipulations:

```js
color.set("lch.l", a => a * 1.2);
```

Issue: Should we support multiple manipulations via an object?
Does order matter?

### Adding `--hsv` as a transformation of sRGB

```js
ColorSpace.register(new ColorSpace("--hsv", {
    base: "srgb",
    coords: ["h", "s", "v"],
    toBase: srgb => {
        ...
        return [h, s, v];
    },
    fromBase: hsv => {
        ...
        return [r, g, b]
    },
    serialize(c) {
        return "hsv("
            + c.coords.join(" ")
            + (c.alpha < 1? "/"
            + c.alpha : "")
            + ")";
    }
}));
```

### Getting D65 relative luminance, calculating WCAG 2.1 contrast

This is straightforward, but could also be built-in as a contrast method.

```js
let contrast;
let fg = new Color("display-p3" [1, 1, 0]); // P3 yellow
let bg = new Color("sienna"); // sRGB named color
let l1 = fg.get("xyz.y");
let l2 = bg.get("xyz.y");
if (l1 > l2) {
    contrast = (l1 + 0.05)/(l2 + 0.05)
}
else {
    contrast = (l2 + 0.05)/(l1 + 0.05)
}
```

## Decisions

### Can a color space be unregistered?

No, and this is by design.
It complicates implementation if color spaces can "stop" being supported. What happens with all existing colors created?
