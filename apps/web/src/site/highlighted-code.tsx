import { Highlight } from "prism-react-renderer"

import { cn } from "@/lib/utils"
import { CODE_THEME, PRISM_LANGUAGES, type CodeLanguage } from "@/site/constants/code"

/** Tokenizes TypeScript source into an accessible syntax-highlighted code block. */
export function HighlightedCode({
  ariaLabel,
  className,
  code,
  language,
}: {
  ariaLabel: string
  className?: string
  code: string
  language: CodeLanguage
}) {
  return (
    <Highlight code={code} language={PRISM_LANGUAGES[language]} theme={CODE_THEME}>
      {({ className: prismClassName, getLineProps, getTokenProps, style, tokens }) => (
        <pre
          role="region"
          aria-label={ariaLabel}
          className={cn(
            prismClassName,
            "overflow-auto bg-[#011627] p-5 font-mono text-[13px] leading-6",
            className
          )}
          style={{ ...style, background: undefined }}
        >
          <code>
            {tokens.map((line, lineIndex) => (
              <span key={lineIndex} {...getLineProps({ line })} className="block min-h-6">
                {line.map((token, tokenIndex) => (
                  <span key={tokenIndex} {...getTokenProps({ token })} />
                ))}
                {lineIndex < tokens.length - 1 ? "\n" : null}
              </span>
            ))}
          </code>
        </pre>
      )}
    </Highlight>
  )
}
