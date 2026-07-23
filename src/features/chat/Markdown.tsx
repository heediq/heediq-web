import { memo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'

// Element overrides so markdown is styled with kit tokens (03-ui-kit §1/§2 — no bespoke inline
// styling), not a global stylesheet. Code blocks keep their `hljs language-*` classes so the
// imported highlight.js theme colors the tokens.
const components: Components = {
  p: ({ children }) => <p className="whitespace-pre-wrap leading-relaxed">{children}</p>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer noopener" className="text-accent underline">
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="ml-5 list-disc space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="ml-5 list-decimal space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => <h1 className="text-h2 font-semibold text-text-primary">{children}</h1>,
  h2: ({ children }) => <h2 className="text-h2 font-semibold text-text-primary">{children}</h2>,
  h3: ({ children }) => <h3 className="text-body font-semibold text-text-primary">{children}</h3>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-border pl-3 italic text-text-secondary">{children}</blockquote>
  ),
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-md border border-border bg-surface-2 p-3 text-mono-transcript">
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = /language-/.test(className ?? '')
    if (isBlock) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      )
    }
    return (
      <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.85em] text-text-primary" {...props}>
        {children}
      </code>
    )
  },
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-caption">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-border px-2 py-1 text-left font-medium">{children}</th>,
  td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
}

/**
 * Renders assistant markdown incrementally (04-loading-and-feedback §6). react-markdown re-parses on
 * each new chunk; GFM adds tables/task-lists, rehype-highlight colors code. Raw HTML is NOT enabled
 * (react-markdown's safe default), so no sanitizer is needed. Memoized on `content` so unrelated
 * re-renders don't re-parse.
 */
export const Markdown = memo(function Markdown({ content }: { content: string }) {
  return (
    <div className="flex flex-col gap-3 text-body text-text-primary">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
})
