# A native Color object for the Web Platform ([Slides](https://docs.google.com/presentation/d/1Pkcxwdej2nWqYr0F6dYHpxcMaUMb11w_YmbZmcUV6Gc/edit?usp=sharing))

## Use cases and motivation

- A format for APIs to expose colors to the developer. Some of the APIs in need for this are:
    - Canvas API (see [Canvas High Dynamic Range](https://github.com/w3c/ColorWeb-CG/blob/master/hdr_html_canvas_element.md))
    - CSS OM
    - SVG DOM
    - HTML [`<input type="color">`](https://github.com/whatwg/html/issues/3400) or its successor (see [Open UI](https://github.com/openui/open-ui/issues/334))
    - [Eyedropper API](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/EyeDropper/explainer.md) (see [TAG review](https://github.com/w3ctag/design-reviews/issues/587))
    - WebGPU
- A toolkit for authors to perform basic commonly needed color operations 
- Prototyping new functionality for incubation, before standardization

### MVP (Level 1)

[Issue](https://github.com/WICG/color-api/issues/37) | [TS](https://github.com/WICG/color-api/blob/main/color-api-v1.d.ts)

- Representing a color in predefined color spaces (any of the color spaces natively supported by CSS)
- Getting and setting color coordinates in the color’s color space
- Parsing an absolute CSS color and returning a `Color` object
- Serialization
- Color space conversion between the predefined color spaces (lossless, i.e. no gamut mapping)

### Features postponed to L2

- Overloads to `set()` to set multiple coords at once, or set using a function
- Overloads to `set()` and `get()` to get/set coords in other color spaces 
- Custom color spaces
- Difference between two colors (ΔE)
- WCAG 2.1 (or it's successor) color contrast (for any color space, not just sRGB)
- Gamut mapping

### Features postponed to L3

- Interpolation (e.g. mixing two colors, compositing, generating color scales) with choice of interpolation color space
- Compositing and blending
- Parsing and serialization of custom formats

## Audience

Web developers with varying levels of Color Science knowledge.
Usable without error by those with little, powerful for those with much.

## Goals

- Usability as a priority
    - Common things should be easy, complex things should be possible
    - **Learnability:** don't require a ton of color science knowledge to use
        - Handle linearization, chromatic adaptation automatically when needed
        - Consistent API shape independent of input syntax
    - **Efficiency:** Avoid verbosity, have sensible defaults
    - **Safety:** Avoid error conditions if possible
    - Liberal in what is accepted (for arguments)
- Color-space agnostic
    - API should make no assumptions about number, names, or ranges of components
        - Ok to only support color spaces with numeric components
    - Should not privilege certain color spaces over others, whenever possible
    - Authors should be able to register new color spaces,
    either via a JS version of `@color-profile`
    or by directly providing conversion code to and from a supported color space.
    - Should be able to support HDR color spaces, and SDR → HDR conversion
    - No hidden gamut mapping or clipping
- D65 relative CIE XYZ connection space for SDR
    - (extended rec2020-linear, as [used in Canvas HDR](https://github.com/w3c/ColorWeb-CG/blob/master/hdr_html_canvas_element.md#conversion-between-color-spaces) will give same result)
    - Configurable media white level for HDR (203cd/m² default for absolute)
- Extensibility
    - sufficient power to allow polyfilling and experimentation
    - introspection would be good

## Predefined color spaces

This set covers the union of spaces from [CSS Color 4](https://drafts.csswg.org/css-color-4/), [CSS Color HDR](https://drafts.csswg.org/css-color-hdr/) and [Canvas HDR](https://github.com/w3c/ColorWeb-CG/blob/master/hdr_html_canvas_element.md).
All RGB spaces are defined over the extended range.

### SDR

- `srgb` *(Web legacy compatibility)*
- `srgb-linear` *(as used in Canvas HDR, some GPU operations, native APIs)*
- `display-p3` *(new Web)*
- `a98-rgb` *(?? needed, nowadays?)*
- `prophoto-rgb` *(from raw digital photos)*
- `rec2020` *(streaming and broadcast)*
- `rec2020-linear` *(canvas uses as connection space)*
  `xyz-d50` (relative, D50) *(for linear-light calculations)*
- `xyz-d65` (relative, D65) *(for linear-light calculations)*
- `lab` (D50) *(perceptual calculations)*
- `lch` (D50) *(perceptual, chroma-preserving)*
- `oklab` (D65) *(perceptual calculations)*
- `oklch` (D65) *(perceptual, chroma-preserving)*

### HDR

- `rec2100-pq` *(Netflix, Canvas HDR, CSS Color HDR)*
- `rec2100-hlg` *(BBC, Canvas HDR, , CSS Color HDR)*
- `rec2100-linear` *(Canvas HDR, , CSS Color HDR)*

## API sketch

Sample WebIDL and algorithms moved to [the draft spec](https://wicg.github.io/color-api/).

[TypeScript definitions for Level 1](https://github.com/WICG/color-api/blob/main/color-api-v1.d.ts)

## Example usage

### Reading coordinates

For ease of use and widest applicability, coordinates are plain JavaScript number (for a single coordinate), or an array of numbers (for all coordinates in a given colorspace).

```js
let color = new Color("rebeccapurple");

// Get individual coord in other color space
color.get("lch", "l"); // 32.4

// Get individual coord in current color space
color.get("r"); // 0.4

// Get all coords in another color space
color.to("lch").coords; // [32.4, 61.2, 309]
```

### Parsing color and converting to a specific color space

Converting in place:

```js
let color = new Color("rebeccapurple");
color.colorSpace; // "srgb";
color.coords; // [0.4, 0.2, 0.6]
color = color.to("lch");
color.coords; // [32.4, 61.2, 309]
```

### Lightening a color without changing its color space

In Level 1:

```js
color.set("lch", "l", color.get("lch", "l") * 1.2);
```

In Level 2, we could support more sugar, such as relative manipulations via functions:

```js
color.set("lch", "l", l => l * 1.2);
```

### Calculating WCAG 2.1 contrast (L2+)

This is straightforward, but could also be built-in as a contrast method.

```js
let contrast;
let fg = new Color("display-p3" [1, 1, 0]); // P3 yellow
let bg = new Color("sienna"); // sRGB named color

let l1 = fg.get("xyz", "y");
let l2 = bg.get("xyz", "y");

if (l1 > l2) {
    [l1, l2] = [l2, l1];
}

contrast = (l2 + 0.05) / (l1 + 0.05);

```

### Color spaces from ICC profiles (L3+)

```js
let cmyk = ColorSpace.fromICCProfile("./cmyk-profile.icc", {
	name: "fogra-coated",
	coords: {
		c: { min: 0, max: 100 },
		m: { min: 0, max: 100 },
		y: { min: 0, max: 100 },
		k: { min: 0, max: 100 },
	}
});
let magenta = new Color(cmyk, [0, 100, 0, 0]);
let lightMagenta = magenta.set("oklch", "l", l => l * 1.2);
```

## Decisions

### Can a color space become unregistered?

No, and this is by design.
It complicates implementation if color spaces can "stop" being supported. What happens with all existing colors created?

### Define colors over an extended range

Ths simplifies use of HDR, especially on platforms like WebGPU or WebGL which are not inherently color managed (all operatons happen in a single color space)

### ICC Profiles

An earlier version of this draft had `iccProfile` as a property of `ColorSpace` objects.
However, that would require the entire API to be async, which significantly complicates use cases.
Therefore, it was deemed better to have an async `ColorSpace.fromICCProfile()` method that returns a regular `ColorSpace` object.
