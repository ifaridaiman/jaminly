// Renders Jaminly app icons from the mark geometry in assets/logo/jaminly-mark.svg.
// Run from apps/warranty-ui: swift scripts/render-icons.swift
import AppKit

let blue = CGColor(srgbRed: 0x09 / 255, green: 0x69 / 255, blue: 0xDA / 255, alpha: 1)
let tint = CGColor(srgbRed: 0xB6 / 255, green: 0xD4 / 255, blue: 0xF5 / 255, alpha: 1)
let white = CGColor(srgbRed: 1, green: 1, blue: 1, alpha: 1)

// Mark geometry, 100×100 units, y down. Keep in sync with jaminly-mark.svg.
func shield() -> CGPath {
  let p = CGMutablePath()
  p.move(to: CGPoint(x: 50, y: 4)); p.addLine(to: CGPoint(x: 88, y: 16)); p.addLine(to: CGPoint(x: 88, y: 46))
  p.addCurve(to: CGPoint(x: 50, y: 96), control1: CGPoint(x: 88, y: 72), control2: CGPoint(x: 72, y: 88))
  p.addCurve(to: CGPoint(x: 12, y: 46), control1: CGPoint(x: 28, y: 88), control2: CGPoint(x: 12, y: 72))
  p.addLine(to: CGPoint(x: 12, y: 16)); p.closeSubpath()
  return p
}
func line(_ a: CGPoint, _ b: CGPoint) -> CGPath {
  let p = CGMutablePath(); p.move(to: a); p.addLine(to: b)
  return p.copy(strokingWithWidth: 12, lineCap: .butt, lineJoin: .miter, miterLimit: 10)
}
let backLeg = line(CGPoint(x: 26, y: 47), CGPoint(x: 47, y: 68))
let frontLeg = line(CGPoint(x: 41.4, y: 68.1), CGPoint(x: 66, y: 38.8))
let tornEnd: CGPath = {
  let p = CGMutablePath()
  // Base sits 2 units inside the strip so the join has no anti-aliasing seam.
  p.addLines(between: [CGPoint(x: 60.1, y: 36.5), CGPoint(x: 61.4, y: 35), CGPoint(x: 66.9, y: 33.05), CGPoint(x: 66, y: 38.8),
                       CGPoint(x: 71.5, y: 36.85), CGPoint(x: 70.6, y: 42.6), CGPoint(x: 69.3, y: 44.1)])
  p.closeSubpath(); return p
}()

enum Style { case color, knockout }

/// Draws the mark centred in a size×size canvas, `markHeight` px tall.
func render(_ file: String, size: Int, markHeight: Double, style: Style, background: CGColor? = nil) {
  let ctx = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0,
                      space: CGColorSpace(name: CGColorSpace.sRGB)!,
                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  ctx.translateBy(x: 0, y: CGFloat(size)); ctx.scaleBy(x: 1, y: -1) // y down, like SVG
  if let background { ctx.setFillColor(background); ctx.fill(CGRect(x: 0, y: 0, width: size, height: size)) }

  let s = markHeight / 92 // shield spans y 4…96
  ctx.translateBy(x: CGFloat(size) / 2, y: CGFloat(size) / 2); ctx.scaleBy(x: s, y: s); ctx.translateBy(x: -50, y: -50)

  ctx.beginTransparencyLayer(auxiliaryInfo: nil)
  switch style {
  case .color:
    for (path, color) in [(shield(), blue), (backLeg, tint), (frontLeg, white), (tornEnd, white)] {
      ctx.addPath(path); ctx.setFillColor(color); ctx.fillPath()
    }
  case .knockout: // white shield, check cut out so the background shows through
    ctx.addPath(shield()); ctx.setFillColor(white); ctx.fillPath()
    ctx.setBlendMode(.destinationOut)
    ctx.addPath(backLeg); ctx.setFillColor(CGColor(gray: 0, alpha: 0.65)); ctx.fillPath()
    for path in [frontLeg, tornEnd] { ctx.addPath(path); ctx.setFillColor(white); ctx.fillPath() }
  }
  ctx.endTransparencyLayer()

  let png = NSBitmapImageRep(cgImage: ctx.makeImage()!).representation(using: .png, properties: [:])!
  try! png.write(to: URL(fileURLWithPath: file))
  print("wrote \(file) (\(size)×\(size))")
}

render("assets/images/icon.png", size: 1024, markHeight: 600, style: .knockout, background: blue)
render("assets/images/android-icon-foreground.png", size: 512, markHeight: 270, style: .knockout)
render("assets/images/android-icon-monochrome.png", size: 432, markHeight: 228, style: .knockout)
render("assets/images/splash-icon.png", size: 512, markHeight: 480, style: .knockout)
render("assets/images/favicon.png", size: 48, markHeight: 44, style: .color)
render("assets/logo/jaminly-mark.png", size: 512, markHeight: 480, style: .color)
