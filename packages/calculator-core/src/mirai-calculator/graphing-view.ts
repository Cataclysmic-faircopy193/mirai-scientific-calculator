/** Bounds of a Cartesian graph viewport. */
export interface GraphView {
  xmin: number
  xmax: number
  ymin: number
  ymax: number
}

/** A point in Cartesian graph coordinates. */
export interface GraphPoint {
  x: number
  y: number
}

/** A line segment in Cartesian graph coordinates. */
export interface GraphSegment {
  from: GraphPoint
  to: GraphPoint
}

/** The closest point on a graph segment and its distance in viewport pixels. */
export interface GraphProjection {
  point: GraphPoint
  distance: number
}

/** Returns whether a graph viewport contains finite, increasing bounds. */
export function isValidGraphView(view: GraphView): boolean {
  return (
    Number.isFinite(view.xmin) &&
    Number.isFinite(view.xmax) &&
    Number.isFinite(view.ymin) &&
    Number.isFinite(view.ymax) &&
    view.xmin < view.xmax &&
    view.ymin < view.ymax
  )
}

/** Expands a graph view to match a viewport aspect ratio without cropping its requested bounds. */
export function fitGraphViewToAspect(view: GraphView, width: number, height: number): GraphView {
  if (!isValidGraphView(view) || !Number.isFinite(width) || !Number.isFinite(height)) {
    return view
  }
  if (width <= 0 || height <= 0) {
    return view
  }

  const centerX = (view.xmin + view.xmax) / 2
  const centerY = (view.ymin + view.ymax) / 2
  const xSpan = view.xmax - view.xmin
  const ySpan = view.ymax - view.ymin
  const viewportAspect = width / height
  const viewAspect = xSpan / ySpan

  if (viewAspect < viewportAspect) {
    const halfWidth = (ySpan * viewportAspect) / 2
    return {
      xmin: centerX - halfWidth,
      xmax: centerX + halfWidth,
      ymin: view.ymin,
      ymax: view.ymax,
    }
  }

  if (viewAspect > viewportAspect) {
    const halfHeight = xSpan / viewportAspect / 2
    return {
      xmin: view.xmin,
      xmax: view.xmax,
      ymin: centerY - halfHeight,
      ymax: centerY + halfHeight,
    }
  }

  return view
}

/** Converts a Cartesian graph point into viewport pixel coordinates. */
export function graphPointToViewport(
  point: GraphPoint,
  view: GraphView,
  width: number,
  height: number
): GraphPoint | null {
  if (
    !isValidGraphView(view) ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null
  }

  return {
    x: ((point.x - view.xmin) / (view.xmax - view.xmin)) * width,
    y: height - ((point.y - view.ymin) / (view.ymax - view.ymin)) * height,
  }
}

/** Converts viewport pixel coordinates into a Cartesian graph point. */
export function viewportPointToGraph(
  point: GraphPoint,
  view: GraphView,
  width: number,
  height: number
): GraphPoint | null {
  if (
    !isValidGraphView(view) ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null
  }

  return {
    x: view.xmin + (point.x / width) * (view.xmax - view.xmin),
    y: view.ymax - (point.y / height) * (view.ymax - view.ymin),
  }
}

/** Scales a graph viewport around its center by a positive factor. */
export function zoomGraphView(view: GraphView, factor: number): GraphView {
  if (!isValidGraphView(view) || !Number.isFinite(factor) || factor <= 0) {
    return view
  }
  const centerX = (view.xmin + view.xmax) / 2
  const centerY = (view.ymin + view.ymax) / 2
  const halfWidth = ((view.xmax - view.xmin) * factor) / 2
  const halfHeight = ((view.ymax - view.ymin) * factor) / 2
  return {
    xmin: centerX - halfWidth,
    xmax: centerX + halfWidth,
    ymin: centerY - halfHeight,
    ymax: centerY + halfHeight,
  }
}

/** Translates a graph viewport by a pointer displacement measured in viewport pixels. */
export function panGraphView(
  view: GraphView,
  renderedView: GraphView,
  deltaX: number,
  deltaY: number,
  width: number,
  height: number
): GraphView {
  if (
    !isValidGraphView(view) ||
    !isValidGraphView(renderedView) ||
    ![deltaX, deltaY, width, height].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0
  ) {
    return view
  }

  const xShift = (deltaX / width) * (renderedView.xmax - renderedView.xmin)
  const yShift = (deltaY / height) * (renderedView.ymax - renderedView.ymin)
  return {
    xmin: view.xmin - xShift,
    xmax: view.xmax - xShift,
    ymin: view.ymin + yShift,
    ymax: view.ymax + yShift,
  }
}

/** Projects a graph-space pointer onto the nearest rendered curve segment in viewport pixels. */
export function projectPointToGraphSegments(
  segments: ReadonlyArray<GraphSegment>,
  pointer: GraphPoint,
  view: GraphView,
  width: number,
  height: number
): GraphProjection | null {
  const viewportPointer = graphPointToViewport(pointer, view, width, height)
  if (!viewportPointer) {
    return null
  }

  let closest: GraphProjection | null = null

  for (const segment of segments) {
    const from = graphPointToViewport(segment.from, view, width, height)
    const to = graphPointToViewport(segment.to, view, width, height)
    if (!from || !to) {
      continue
    }

    const deltaX = to.x - from.x
    const deltaY = to.y - from.y
    const squaredLength = deltaX * deltaX + deltaY * deltaY
    const interpolation =
      squaredLength === 0
        ? 0
        : Math.max(
            0,
            Math.min(
              1,
              ((viewportPointer.x - from.x) * deltaX + (viewportPointer.y - from.y) * deltaY) /
                squaredLength
            )
          )
    const projectedX = from.x + deltaX * interpolation
    const projectedY = from.y + deltaY * interpolation
    const distance = Math.hypot(projectedX - viewportPointer.x, projectedY - viewportPointer.y)

    if (closest !== null && distance >= closest.distance) {
      continue
    }
    closest = {
      point: {
        x: segment.from.x + (segment.to.x - segment.from.x) * interpolation,
        y: segment.from.y + (segment.to.y - segment.from.y) * interpolation,
      },
      distance,
    }
  }

  return closest
}
