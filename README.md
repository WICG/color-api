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

- Lossless color space conversion (e.g. LCH → P3) by default, optional gamut mapping.
- Color manipulation (e.g. making a color darker by reducing its LCH lightness) with choice of color space
- Interpolation (e.g. mixing two colors) with choice of color space
- Difference between two colors (ΔE)
- String parsing (e.g. what color is <code>rebeccapurple</code>?)
- WCAG relative luminance (for any color space, not just sRGB)
- Prototyping new functionality for incubation, before standardization
- Compositing and blending (possibly Level 2)

## Audience

Web developers with varying levels of Color Science knowledge.
Usable without error by those with little, powerful for those with much.

## Goals

- Usability as a priority
    - Common things should be easy, complex things should be possible
    - **Learnability:** don't require a ton of color science knowledge to use
        - Handle linearization, chromatic adaptation automatically when needed
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
    - (extended rec2020-linear will give same result)
    - Configurable media white level for HDR (203cd/m² default for absolute)
- Extensibility and introspection would be good

## Predefined color spaces

### SDR

All RGB spaces defined over extended range

- `srgb` *(Web legacy compat)*
- `srgb-linear` *(as used in Canvas HDR, some GPU)*
- `display-p3` *(new Web)*
- `a98-rgb` *(?? needed, nowadays?)*
- `prophoto-rgb` *(from raw digital photos)*
- `rec2020` *(streaming and broadcast)*
- `rec2020-linear` *(canvas uses as connection space)*
- `xyz` (relative, D65) *(for linear-light calculations)*
- `lab` (D50) *(perceptual calculations)*
- `lch` (D50) *(perceptual, chroma-preserving)*

### HDR

- `rec2100-pq` *(Netflix, Canvas HDR)*
- `rec2100-hlg` *(BBC, Canvas HDR)*


## API sketch

Sample WebIDL and algorithms moved to [the draft spec](https://projects.verou.me/color-api/).

## Example usage

### Reading coordinates

```js
let color = new Color("rebeccapurple");

// Get individual coord in other color space
color.get("lch.l"); // 32.4

// Get individual coord in current color space
color.get("r"); // 0.4

// Get all coords in another color space
color.getAll("lch"); // [32.4, 61.2, 309]
```

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
color.set("lch.l", l => l * 1.2);
```

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
    [l1, l2] = [l2, l1];
}

contrast = (l2 + 0.05)/(l1 + 0.05);

```

## Decisions

### Can a color space become unregistered?

No, and this is by design.
It complicates implementation if color spaces can "stop" being supported. What happens with all existing colors created?
