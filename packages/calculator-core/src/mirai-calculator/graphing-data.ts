/** Initial slider state for a graphing expression. */
export interface GraphingSliderInitialValue {
  min: number
  max: number
  step: number
  value: number
  playing?: boolean
}

/** Initial editable graphing expression supplied by a consumer. */
export interface GraphingExpressionInitialValue {
  value: string
  color?: string
  visible?: boolean
  slider?: GraphingSliderInitialValue
}

/** Initial dependent-variable series for the graphing table. */
export interface GraphingTableSeriesInitialValue {
  label?: string
  color?: string
  values: ReadonlyArray<number | string>
}

/** Initial multi-variable graphing table supplied by a consumer. */
export interface GraphingTableInitialValue {
  xLabel?: string
  xValues?: ReadonlyArray<number | string>
  series?: ReadonlyArray<GraphingTableSeriesInitialValue>
}

/** Initial values supplied by a consumer to the graphing workspace. */
export interface GraphingInitialData {
  expressions?: ReadonlyArray<GraphingExpressionInitialValue>
  table?: GraphingTableInitialValue
}
